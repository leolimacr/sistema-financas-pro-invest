import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ref, push, remove, update, set, query as rtdbQuery, orderByChild, limitToLast, get, endBefore, startAt, endAt } from 'firebase/database';
import { doc, getDoc as fsGetDoc, setDoc } from 'firebase/firestore';
import { db, firestore } from '../firebase';
import { queryKeys } from '../core/query/queryKeys';
import type { Transaction, Category, CreditCard } from '../types';
import { useTransactionsContext } from '../contexts/TransactionsContext';
import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useDebts } from './useDebts';
import { useCards } from './useCards';
import { validateTransaction } from '../utils/transactionValidation';
import { updateDebt } from '../services/debt/debtService';
import { updateCard } from '../services/cardService';
import { useEntitlement } from './useEntitlement';
import { isMonthFetchAllowed } from '../utils/historyTimeGate';
import { eventBus } from '../core/orchestration/event-bus';
import { getLocalDateString } from '../utils/dateHelpers';
import { 
  createDomainEvent, 
  EVENT_TYPES,
  type TransactionCreatedEvent,
  type TransactionUpdatedEvent,
  type TransactionDeletedEvent,
  type CardUsageUpdatedEvent,
  type DebtUpdatedEvent,
  type DebtAmortizedEvent,
} from '../core/orchestration/domainEvents';

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  ) as T;
}

export const useTransactions = (userId?: string) => {
  const queryClient = useQueryClient();
  const { effectiveTier } = useEntitlement();
  const currentPlan = effectiveTier;
  const { bridgeReady } = useTransactionsContext();
  const key = queryKeys.transactions.byUser(userId || 'anonymous');
  const extraKey = useMemo(
    () => ['transactions_extra', userId || 'anonymous'],
    [userId]
  );
  const registryKey = useMemo(
    () => ['transactions_fetched_months', userId || 'anonymous'],
    [userId]
  );

  const cachedRaw = typeof window !== 'undefined' 
    ? (() => {
        const newKey = `financas-pro-invest_tx_${userId}`;
        const legacyKey = `fpi_tx_${userId}`;
        const fromNew = localStorage.getItem(newKey);
        if (fromNew) return fromNew;
        const fromLegacy = localStorage.getItem(legacyKey);
        if (fromLegacy) {
          try { localStorage.setItem(newKey, fromLegacy); localStorage.removeItem(legacyKey); } catch {}
          return fromLegacy;
        }
        return null;
      })()
    : null;
  const cachedData = cachedRaw 
    ? (() => { try { const p = JSON.parse(cachedRaw); return Date.now() - p.ts < 600_000 ? p.data : undefined; } catch { return undefined; } })()
    : undefined;

  // 1. Lançamentos em Realtime (limitados aos últimos 100)
  const { data: realtimeData, isLoading: loading, error, isFetching } = useQuery<Transaction[], Error>({
    queryKey: key,
    queryFn: () => {
      const currentData = queryClient.getQueryData<Transaction[]>(key);
      return Promise.resolve(currentData ?? cachedData ?? []);
    },
    placeholderData: cachedData,
    enabled: !!userId,
    staleTime: Infinity,
  });

  // 2. Lançamentos Históricos (carregados sob demanda)
  const { data: extraData } = useQuery<Transaction[]>({
    queryKey: extraKey,
    queryFn: () => queryClient.getQueryData<Transaction[]>(extraKey) ?? [],
    initialData: [],
    staleTime: Infinity,
  });

  // 2b. Busca completa de todas as transações (1 query RTDB sem limitToLast).
  //     O bridge (limitToLast(100)) só traz as 100 mais recentes — para o Saldo Atual
  //     (que precisa de TODAS as transações para calcular receitas − despesas à vista
  //     de todo o histórico), fazemos 1 get() sem limite no mount. Uma única query.
  const allDataKey = useMemo(
    () => ['transactions_all', userId || 'anonymous'] as const,
    [userId]
  );
  const allDataFetchedRef = useRef(false);
  const { data: allData } = useQuery<Transaction[]>({
    queryKey: allDataKey,
    queryFn: async () => {
      if (!userId) return [];
      const snap = await get(ref(db, `transactions/${userId}`));
      if (!snap.exists()) return [];
      const all: Transaction[] = [];
      snap.forEach((child) => {
        const val = child.val();
        if (val) all.push({ id: child.key!, ...val } as Transaction);
      });
      return all.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  // Marca como concluído para não re-buscar
  useEffect(() => {
    if (allData && allData.length > 0 && !allDataFetchedRef.current) {
      allDataFetchedRef.current = true;
    }
  }, [allData]);

  // 3. Mesclagem Inteligente (Realtime + Histórico + Deduplicação)
  const transactionsRef = useRef<Transaction[]>([]);
  const transactions = useMemo(() => {
    const base = realtimeData || [];
    const extra = extraData || [];
    const all = allData || [];
    const merged = [...base, ...all, ...extra];
    
    // Deduplica por ID para evitar problemas se um item do realtime já existir no extra
    const uniqueMap = new Map();
    merged.forEach(t => {
      if (t?.id) uniqueMap.set(t.id, t);
    });
    
    const result = Array.from(uniqueMap.values()).sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });

    // Estabiliza referência: retorna o mesmo array se IDs e datas forem idênticos
    const prev = transactionsRef.current;
    if (result.length === prev.length) {
      let identical = true;
      for (let i = 0; i < result.length; i++) {
        if (result[i].id !== prev[i].id || result[i].date !== prev[i].date || result[i].amount !== prev[i].amount) {
          identical = false;
          break;
        }
      }
      if (identical) return prev;
    }
    transactionsRef.current = result;
    return result;
  }, [realtimeData, extraData, allData]);

  // Cache local para fetchMonth (localStorage)
  const MONTH_CACHE_PREFIX = 'fpi_month_cache_';
  const MONTH_CACHE_TTL_MS = 3600_000; // 1 hora para meses passados

  function getMonthCacheKey(userId: string, monthKey: string): string {
    return `${MONTH_CACHE_PREFIX}${userId}_${monthKey}`;
  }

  function readMonthFromCache(userId: string, monthKey: string): Transaction[] | null {
    try {
      const raw = localStorage.getItem(getMonthCacheKey(userId, monthKey));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.ts < MONTH_CACHE_TTL_MS) {
        return parsed.data as Transaction[];
      }
      // Cache expirado — remove para liberar espaço
      localStorage.removeItem(getMonthCacheKey(userId, monthKey));
      return null;
    } catch {
      return null;
    }
  }

  function writeMonthToCache(userId: string, monthKey: string, data: Transaction[]): void {
    try {
      localStorage.setItem(
        getMonthCacheKey(userId, monthKey),
        JSON.stringify({ data, ts: Date.now() })
      );
    } catch {
      // localStorage cheio ou indisponível — ignora silenciosamente
    }
  }

  // Busca mês específico sob demanda (Cirúrgico para custo baixo)
  const pendingFetchRef = useRef(new Set<string>());
  const fetchMonthCallCount = useRef(0);
  const saveLancamentoRef = useRef<(transaction: Omit<Transaction, 'id' | 'userId'> & { id?: string }) => Promise<void>>(async () => {});
  const deleteLancamentoRef = useRef<(id: string) => Promise<void>>(async () => {});
  const fetchMonthRef = useRef<(year: number, month: number) => Promise<void>>(async () => {});
  const fetchHistoryRef = useRef<(lastSortKey: string | null, limitCount?: number) => Promise<Transaction[]>>(async () => []);
  fetchMonthRef.current = async (year: number, month: number) => {
    if (!userId) return;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    fetchMonthCallCount.current++;

    // Synchronous dedup — previne chamadas concorrentes para o mesmo mês
    if (pendingFetchRef.current.has(monthKey)) {
      return;
    }

    const fetchedSet = queryClient.getQueryData<Set<string>>(registryKey) || new Set<string>();
    if (fetchedSet.has(monthKey)) return;

    if (!isMonthFetchAllowed(year, month, currentPlan)) {
      const blockedSet = new Set(fetchedSet);
      blockedSet.add(monthKey);
      queryClient.setQueryData(registryKey, blockedSet);
      return;
    }

    // Cache-first para meses anteriores ao corrente
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === (now.getMonth() + 1);
    const isPastMonth = !isCurrentMonth;

    if (!isCurrentMonth) {
      const cached = readMonthFromCache(userId, monthKey);
      if (cached) {
        const currentExtra = queryClient.getQueryData<Transaction[]>(extraKey) || [];
        const merged = Array.from(new Map([...currentExtra, ...cached].map(t => [t.id, t])).values());
        queryClient.setQueryData(extraKey, merged);
        const updatedSet = new Set(fetchedSet);
        updatedSet.add(monthKey);
        queryClient.setQueryData(registryKey, updatedSet);
        return;
      }
    }

    pendingFetchRef.current.add(monthKey);
    try {
      const transactionsRef = ref(db, `transactions/${userId}`);
      
      const q = rtdbQuery(
        transactionsRef, 
        orderByChild('date'), 
        startAt(`${monthKey}-01`), 
        endAt(`${monthKey}-31`)
      );
      
      const snapshot = await get(q);
      if (snapshot.exists()) {
        const newTx: Transaction[] = [];
        snapshot.forEach((child) => {
          const val = child.val();
          if (val?.date?.startsWith(monthKey)) {
            newTx.push({ id: child.key, ...val } as Transaction);
          }
        });

        const currentExtra = queryClient.getQueryData<Transaction[]>(extraKey) || [];
        const updatedExtra = [...currentExtra, ...newTx];
        
        const uniqueExtra = Array.from(new Map(updatedExtra.map(t => [t.id, t])).values());
        queryClient.setQueryData(extraKey, uniqueExtra);

        // Atualiza cache local para meses anteriores
        if (isPastMonth) {
          writeMonthToCache(userId, monthKey, newTx);
        }
      }

      const updatedSet = new Set(fetchedSet);
      updatedSet.add(monthKey);
      queryClient.setQueryData(registryKey, updatedSet);
    } catch (err) {
      console.error(`[FinOps] Erro ao carregar mês ${monthKey}:`, err);
    } finally {
      pendingFetchRef.current.delete(monthKey);
    }
  };

  // NOVO: Busca histórico antigo (paginação robusta via sortKey)
  fetchHistoryRef.current = async (lastSortKey: string | null, limitCount = 50): Promise<Transaction[]> => {
    if (!userId) return [];
    try {
      const transactionsRef = ref(db, `transactions/${userId}`);
      
      let q;
      if (lastSortKey) {
        // endBefore evita baixar o último item novamente
        q = rtdbQuery(
          transactionsRef, 
          orderByChild('sortKey'), 
          endBefore(lastSortKey), 
          limitToLast(limitCount)
        );
      } else {
        q = rtdbQuery(transactionsRef, orderByChild('sortKey'), limitToLast(limitCount));
      }
      
      const snapshot = await get(q);
      if (!snapshot.exists()) return [];
      
      const results: Transaction[] = [];
      snapshot.forEach((child) => {
        const val = child.val();
        const id = child.key as string;
        const dateClean = val.date.replace(/-/g, '');
        
        // Fallback robusto: YYYYMMDD_0000000000000_ID
        const sortKey = val.sortKey || `${dateClean}_0000000000000_${id}`;
        
        results.push({ 
          id, 
          ...val, 
          sortKey 
        } as Transaction);
      });
      
      // RTDB retorna ASC, invertemos para DESC no UI
      return results.sort((a, b) => b.sortKey!.localeCompare(a.sortKey!));
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
      return [];
    }
    };

  const { debts } = useDebts(userId);
  const { cards } = useCards(userId);

  // Refs para dados mutáveis — estabilizam referência das funções
  const debtsRef = useRef(debts);
  debtsRef.current = debts;
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  // transactionsRef já declarado na linha 81 para dedup — ref.current já atualizado no useMemo

  // Cache local de categorias conhecidas no Firestore (evita leituras repetidas)
  const knownCategoriesRef = useRef(new Set<string>());

  const syncCategoryToFirestore = useCallback(async (categoryName: string | undefined, transactionType: string | undefined) => {
    if (!categoryName || !transactionType || !userId) return;
    const normalized = categoryName.trim().toLowerCase();
    if (knownCategoriesRef.current.has(normalized)) return;

    try {
      const catDocRef = doc(firestore, 'categories', userId);
      const catSnap = await fsGetDoc(catDocRef);
      const list: Category[] = catSnap.exists()
        ? ((catSnap.data() as Record<string, unknown>)?.list as Category[] | undefined) ?? []
        : [];

      const exists = list.some((c) => c.name.trim().toLowerCase() === normalized);
      if (exists) {
        knownCategoriesRef.current.add(normalized);
        return;
      }

      const newCat: Category = {
        id: crypto.randomUUID(),
        name: categoryName.trim(),
        type: transactionType as 'income' | 'expense',
        userId,
      };

      await setDoc(catDocRef, { list: [...list, newCat] }, { merge: true });
      knownCategoriesRef.current.add(normalized);
    } catch (e) {
      console.warn('[AutoSync] Erro ao sincronizar categoria (não bloqueante):', e);
    }
  }, [userId]);

  saveLancamentoRef.current = async (transaction: Omit<Transaction, 'id' | 'userId'> & { id?: string }) => {
    if (!userId) return;

    // Validação centralizada — rejeita antes de qualquer write
    const validationErrors = validateTransaction(transaction);
    if (validationErrors.length > 0) {
      const msg = validationErrors.map(e => e.message).join('; ');
      console.error('[useTransactions] Validação falhou:', msg);
      throw new Error(`Dados inválidos: ${msg}`);
    }
    
    const now = Date.now();
    const dateClean = transaction.date.replace(/-/g, '');
    const latestTransactions = transactionsRef.current;

    if (transaction.id) {
        // [Reactive Core] Reação Reversa: Edição
        const oldTx = latestTransactions.find(t => t.id === transaction.id);
        if (oldTx && userId) {
            const oldDebtId = oldTx.linkedDebtId;
            const newDebtId = transaction.linkedDebtId;

            // Se houve mudança no vínculo ou no valor
            if (oldDebtId !== newDebtId || oldTx.amount !== Number(transaction.amount)) {
                // 1. Estorno do vínculo antigo (se existia)
                if (oldDebtId) {
                    const oldDebt = debtsRef.current.find(d => d.id === oldDebtId);
                    if (oldDebt) {
                        let finalSaldo = oldDebt.saldoDevedor + oldTx.amount;
                        let finalParcelas = oldDebt.parcelasRestantes + 1;

                        // Se a dívida nova for a mesma, já aplicamos o novo abatimento aqui
                        if (oldDebtId === newDebtId) {
                            finalSaldo -= Number(transaction.amount);
                            finalParcelas -= 1;
                        }

                        try {
                            await updateDebt(userId, oldDebtId, {
                                saldoDevedor: Math.max(0, finalSaldo),
                                parcelasRestantes: Math.max(0, finalParcelas)
                            });
                            console.log(`[Reactive Core] Ajuste de dívida ${oldDebt.nome} por edição.`);
                            await eventBus.publish(createDomainEvent<DebtUpdatedEvent['payload']>(
                              'debt',
                              EVENT_TYPES.debt.updated,
                              {
                                debtId: oldDebtId,
                                userId,
                                previousDebt: oldDebt,
                                changes: { saldoDevedor: Math.max(0, finalSaldo), parcelasRestantes: Math.max(0, finalParcelas) },
                              },
                              'useTransactions.saveLancamento'
                            ));
                        } catch (error) {
                            console.error("[Reactive Core] Erro no ajuste (edição - old):", error);
                        }
                    }
                }

                // 2. Aplicação do novo vínculo (se for uma dívida diferente e nova)
                if (newDebtId && newDebtId !== oldDebtId) {
                    const newDebt = debtsRef.current.find(d => d.id === newDebtId);
                    if (newDebt) {
                        try {
                            await updateDebt(userId, newDebtId, {
                                saldoDevedor: Math.max(0, newDebt.saldoDevedor - Number(transaction.amount)),
                                parcelasRestantes: Math.max(0, newDebt.parcelasRestantes - 1)
                            });
                            console.log(`[Reactive Core] Novo vínculo com dívida ${newDebt.nome} por edição.`);
                            await eventBus.publish(createDomainEvent<DebtUpdatedEvent['payload']>(
                              'debt',
                              EVENT_TYPES.debt.updated,
                              {
                                debtId: newDebtId,
                                userId,
                                previousDebt: newDebt,
                                changes: { saldoDevedor: Math.max(0, newDebt.saldoDevedor - Number(transaction.amount)), parcelasRestantes: Math.max(0, newDebt.parcelasRestantes - 1) },
                              },
                              'useTransactions.saveLancamento'
                            ));
                        } catch (error) {
                            console.error("[Reactive Core] Erro no ajuste (edição - new):", error);
                        }
                    }
                }
            }
        }

        // [Reactive Core] Reação Reversa: Edição de Cartão
        if (oldTx && userId) {
            const oldCardId = oldTx.cardId || oldTx.linkedCardId;
            const newCardId = transaction.cardId || transaction.linkedCardId;
            const wasBill = oldTx.isBillPayment;
            const isBill = transaction.isBillPayment;

            // 1. Mudança de valor ou de cartão (Crédito ou Pagamento)
            if (oldCardId !== newCardId || oldTx.amount !== Number(transaction.amount) || wasBill !== isBill) {
                // Estorna o efeito do lançamento antigo
                if (oldCardId) {
                    const card = cardsRef.current.find(c => c.id === oldCardId);
                    if (card) {
                        try {
                            if (card.type === 'voucher') {
                                // Voucher reversal: income (recharge) added, expense deducted
                                let newBal = (card.voucherBalance || 0);
                                if (oldTx.type === 'income') {
                                    newBal -= oldTx.amount; // Reverse recharge
                                } else {
                                    newBal += oldTx.amount; // Reverse expense
                                }
                                if (oldCardId === newCardId) {
                                    if (transaction.type === 'income') {
                                        newBal += Number(transaction.amount);
                                    } else {
                                        newBal -= Number(transaction.amount);
                                    }
                                }
                                await updateCard(userId, oldCardId, { voucherBalance: Math.max(0, newBal) });
                                console.log(`[Reactive Core] Ajuste de saldo voucher ${card.name} por edição.`);
                                await eventBus.publish(createDomainEvent<CardUsageUpdatedEvent['payload']>(
                                  'card',
                                  EVENT_TYPES.card.usageUpdated,
                                  {
                                    cardId: oldCardId,
                                    userId,
                                    previousSaldoUtilizado: card.saldoUtilizadoTotal || 0,
                                    newSaldoUtilizado: 0,
                                    reason: 'edit_voucher',
                                    transactionId: transaction.id,
                                  },
                                  'useTransactions.saveLancamento'
                                ));
                            } else {
                                // Se era pagamento, estornar = voltar a consumir. Se era compra, estornar = liberar.
                                const factor = wasBill ? 1 : -1;
                                let newUsed = (card.saldoUtilizadoTotal || 0) + (oldTx.amount * factor);
                                
                                // Se o cartão novo for o mesmo, já aplicamos o novo efeito aqui para evitar duas escritas
                                if (oldCardId === newCardId) {
                                    const newFactor = isBill ? -1 : 1;
                                    newUsed += (Number(transaction.amount) * newFactor);
                                }

                                await updateCard(userId, oldCardId, { saldoUtilizadoTotal: Math.max(0, newUsed) });
                                console.log(`[Reactive Core] Ajuste de limite do cartão ${card.name} por edição.`);
                                await eventBus.publish(createDomainEvent<CardUsageUpdatedEvent['payload']>(
                                  'card',
                                  EVENT_TYPES.card.usageUpdated,
                                  {
                                    cardId: oldCardId,
                                    userId,
                                    previousSaldoUtilizado: card.saldoUtilizadoTotal || 0,
                                    newSaldoUtilizado: Math.max(0, newUsed),
                                    reason: 'edit',
                                    transactionId: transaction.id,
                                  },
                                  'useTransactions.saveLancamento'
                                ));
                            }
                        } catch (error) {
                            console.error("[Reactive Core] Erro no ajuste de limite (edição - old):", error);
                        }
                    }
                }

                // Aplica o efeito no novo cartão (se for diferente)
                if (newCardId && newCardId !== oldCardId) {
                    const card = cardsRef.current.find(c => c.id === newCardId);
                    if (card) {
                        try {
                            if (card.type === 'voucher') {
                                const newBal = transaction.type === 'income'
                                    ? (card.voucherBalance || 0) + Number(transaction.amount)
                                    : Math.max(0, (card.voucherBalance || 0) - Number(transaction.amount));
                                await updateCard(userId, newCardId, { voucherBalance: newBal });
                                console.log(`[Reactive Core] Novo vínculo de saldo voucher ${card.name} por edição.`);
                                await eventBus.publish(createDomainEvent<CardUsageUpdatedEvent['payload']>(
                                  'card',
                                  EVENT_TYPES.card.usageUpdated,
                                  {
                                    cardId: newCardId,
                                    userId,
                                    previousSaldoUtilizado: card.saldoUtilizadoTotal || 0,
                                    newSaldoUtilizado: newBal,
                                    reason: 'edit_voucher',
                                    transactionId: transaction.id,
                                  },
                                  'useTransactions.saveLancamento'
                                ));
                            } else {
                                const factor = isBill ? -1 : 1;
                                const newUsed = (card.saldoUtilizadoTotal || 0) + (Number(transaction.amount) * factor);
                                await updateCard(userId, newCardId, { saldoUtilizadoTotal: Math.max(0, newUsed) });
                                console.log(`[Reactive Core] Novo vínculo de limite com cartão ${card.name} por edição.`);
                                await eventBus.publish(createDomainEvent<CardUsageUpdatedEvent['payload']>(
                                  'card',
                                  EVENT_TYPES.card.usageUpdated,
                                  {
                                    cardId: newCardId,
                                    userId,
                                    previousSaldoUtilizado: card.saldoUtilizadoTotal || 0,
                                    newSaldoUtilizado: newUsed,
                                    reason: 'edit',
                                    transactionId: transaction.id,
                                  },
                                  'useTransactions.saveLancamento'
                                ));
                            }
                        } catch (error) {
                            console.error("[Reactive Core] Erro no ajuste de limite (edição - new):", error);
                        }
                    }
                }
            }
        }

        const transactionRef = ref(db, `transactions/${userId}/${transaction.id}`);
        const { id, ...dataToUpdate } = transaction;

        // If the old transaction had isBillPayment but the edit doesn't provide it,
        // explicitly clear it (the edit form builds a fresh object without these fields)
        if (oldTx?.isBillPayment && transaction.isBillPayment === undefined) {
          dataToUpdate.isBillPayment = false;
        }

        await update(transactionRef, stripUndefined(dataToUpdate));

        // Auto-sync de categoria (fire-and-forget)
        syncCategoryToFirestore(transaction.category, transaction.type);

        // Cache local imediato para edição
        queryClient.setQueryData<Transaction[]>(key, (old) => {
          if (!old) return old;
          return old.map(t => t.id === transaction.id ? { ...t, ...dataToUpdate, id: transaction.id } as Transaction : t);
        });
        
        if (oldTx) {
          const changedFields = Object.keys(dataToUpdate).filter(k => 
            JSON.stringify(oldTx[k as keyof Transaction]) !== JSON.stringify(dataToUpdate[k as keyof typeof dataToUpdate])
          );
          await eventBus.publish(createDomainEvent<TransactionUpdatedEvent['payload']>(
            'transaction',
            EVENT_TYPES.transaction.updated,
            {
              transaction: { ...oldTx, ...dataToUpdate, id: transaction.id } as Transaction,
              previousTransaction: oldTx,
              userId,
              changedFields,
            },
            'useTransactions.saveLancamento'
          ));
        }
        
        return;
    }

    // === Cache local imediato (antes de qualquer await) ===
    const dbTransactionsRef = ref(db, `transactions/${userId}`);

    if (transaction.paymentMethod === 'credit' && transaction.installments && transaction.installments > 1) {
      // --- Parcelas: gera todas as keys e atualiza cache antes de escrever ---
      const installmentId = `inst_${now}_${Math.random().toString(36).substr(2, 5)}`;
      const totalAmount = transaction.amount;
      const installmentAmount = totalAmount / transaction.installments;
      const baseDate = new Date(transaction.date.replace(/-/g, '/'));

      type InstallmentItem = { ref: ReturnType<typeof push>; data: Record<string, unknown>; id: string };
      const items: InstallmentItem[] = [];

      for (let i = 1; i <= transaction.installments; i++) {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + (i - 1));
        if (installmentDate.getDate() !== baseDate.getDate() && i > 1) {
            const lastDayOfIntendedMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 0);
            installmentDate.setDate(lastDayOfIntendedMonth.getDate());
            installmentDate.setMonth(lastDayOfIntendedMonth.getMonth());
            installmentDate.setFullYear(lastDayOfIntendedMonth.getFullYear());
        }
        const newRef = push(dbTransactionsRef);
        const instDateStr = getLocalDateString(installmentDate);
        const instDateClean = instDateStr.replace(/-/g, '');
        const data = {
          ...transaction,
          userId,
          amount: installmentAmount,
          currentInstallment: i,
          installmentId,
          date: instDateStr,
          description: `${transaction.description} (${i}/${transaction.installments})`,
          createdAtMs: now + i,
          sortKey: `${instDateClean}_${now + i}_${newRef.key}`
        };
        items.push({ ref: newRef, data, id: newRef.key! });
      }

      // Cache imediato — todas as parcelas aparecem instantaneamente
      const createdInstallments = items.map(item => ({ id: item.id, ...item.data } as Transaction));
      queryClient.setQueryData<Transaction[]>(key, (old) => {
        if (!old) return createdInstallments;
        return [...createdInstallments, ...old];
      });

      // [Background] Card reactions + debt amortization + writes
      const backgroundOp = (async () => {
        if (userId) {
          if (transaction.isBillPayment && transaction.linkedCardId) {
            const card = cardsRef.current.find(c => c.id === transaction.linkedCardId);
            if (card) {
              try {
                const previousSaldo = card.saldoUtilizadoTotal || 0;
                const newUsed = Math.max(0, previousSaldo - Number(transaction.amount));
                await updateCard(userId, card.id, { saldoUtilizadoTotal: newUsed });
                await eventBus.publish(createDomainEvent<CardUsageUpdatedEvent['payload']>('card', EVENT_TYPES.card.usageUpdated, { cardId: card.id, userId, previousSaldoUtilizado: previousSaldo, newSaldoUtilizado: newUsed, reason: 'bill_payment' }, 'useTransactions.saveLancamento'));
              } catch (e) { console.error("[Reactive Core] Erro ao liberar limite do cartão:", e); }
            }
          } else if (transaction.paymentMethod === 'voucher' && transaction.cardId) {
            let card = cardsRef.current.find(c => c.id === transaction.cardId);
            if (!card) {
              try {
                const cardSnap = await fsGetDoc(doc(firestore, 'users', userId, 'cartoes', transaction.cardId));
                if (cardSnap.exists()) {
                  card = { id: cardSnap.id, ...cardSnap.data() } as CreditCard;
                }
              } catch (e) { console.warn("[Reactive Core] Erro ao buscar cartão no fallback:", e); }
            }
            if (card) {
              try {
                const newBal = Math.max(0, (card.voucherBalance || 0) - Number(transaction.amount));
                await updateCard(userId, card.id, { voucherBalance: newBal });
                queryClient.setQueryData<CreditCard[]>(queryKeys.cards.byUser(userId), (old) => {
                  if (!old) return old;
                  return old.map(c => c.id === card.id ? { ...c, voucherBalance: newBal } : c);
                });
              } catch (e) { console.error("[Reactive Core] Erro ao debitar voucher:", e); }
            }
          } else if (transaction.paymentMethod === 'credit' && transaction.cardId) {
            const card = cardsRef.current.find(c => c.id === transaction.cardId);
            if (card) {
              try {
                const previousSaldo = card.saldoUtilizadoTotal || 0;
                const newUsed = previousSaldo + Number(transaction.amount);
                await updateCard(userId, card.id, { saldoUtilizadoTotal: newUsed });
                await eventBus.publish(createDomainEvent<CardUsageUpdatedEvent['payload']>('card', EVENT_TYPES.card.usageUpdated, { cardId: card.id, userId, previousSaldoUtilizado: previousSaldo, newSaldoUtilizado: newUsed, reason: 'purchase' }, 'useTransactions.saveLancamento'));
              } catch (e) { console.error("[Reactive Core] Erro ao consumir limite do cartão:", e); }
            }
          }
        }

        const linkedDebtId = transaction.linkedDebtId;
        if (linkedDebtId && userId) {
          const debt = debtsRef.current.find(d => d.id === linkedDebtId);
          if (debt) {
            try {
              await updateDebt(userId, linkedDebtId, { saldoDevedor: Math.max(0, (debt.saldoDevedor || 0) - Number(transaction.amount)), parcelasRestantes: Math.max(0, (debt.parcelasRestantes || 0) - 1) });
              await eventBus.publish(createDomainEvent<DebtAmortizedEvent['payload']>('debt', EVENT_TYPES.debt.amortized, { debtId: linkedDebtId, userId, amount: Number(transaction.amount), previousSaldo: debt.saldoDevedor || 0, newSaldo: Math.max(0, (debt.saldoDevedor || 0) - Number(transaction.amount)), previousParcelas: debt.parcelasRestantes || 0, newParcelas: Math.max(0, (debt.parcelasRestantes || 0) - 1) }, 'useTransactions.saveLancamento'));
            } catch (e) { console.error("[Reactive Core] Erro na amortização:", e); }
          }
        }

        await Promise.all(items.map(item => set(item.ref, stripUndefined(item.data))));
        // Auto-sync de categoria (fire-and-forget) — apenas uma vez, não por parcela
        syncCategoryToFirestore(transaction.category, transaction.type);
      })();

      await backgroundOp;

      await eventBus.publish(createDomainEvent<TransactionCreatedEvent['payload']>(
        'transaction',
        EVENT_TYPES.transaction.created,
        {
          transaction: { ...transaction, userId, id: installmentId, createdAtMs: now } as Transaction,
          isNew: true,
          userId,
        },
        'useTransactions.saveLancamento'
      ));
    } else {
      const newRef = push(dbTransactionsRef);
      const data = { 
        ...transaction, 
        userId,
        createdAtMs: now,
        sortKey: `${dateClean}_${now}_${newRef.key}`
      };
      const newTx: Transaction = { id: newRef.key!, ...data } as Transaction;

      // Cache imediato — item aparece instantaneamente na lista
      queryClient.setQueryData<Transaction[]>(key, (old) => {
        if (!old) return [newTx];
        return [newTx, ...old];
      });

      // [Background] Card reactions + debt amortization + write
      const backgroundOp = (async () => {
        if (userId) {
          if (transaction.isBillPayment && transaction.linkedCardId) {
            const card = cardsRef.current.find(c => c.id === transaction.linkedCardId);
            if (card) {
              try {
                const previousSaldo = card.saldoUtilizadoTotal || 0;
                const newUsed = Math.max(0, previousSaldo - Number(transaction.amount));
                await updateCard(userId, card.id, { saldoUtilizadoTotal: newUsed });
                await eventBus.publish(createDomainEvent<CardUsageUpdatedEvent['payload']>('card', EVENT_TYPES.card.usageUpdated, { cardId: card.id, userId, previousSaldoUtilizado: previousSaldo, newSaldoUtilizado: newUsed, reason: 'bill_payment' }, 'useTransactions.saveLancamento'));
              } catch (e) { console.error("[Reactive Core] Erro ao liberar limite do cartão:", e); }
            }
          } else if (transaction.paymentMethod === 'credit' && transaction.cardId) {
            const card = cardsRef.current.find(c => c.id === transaction.cardId);
            if (card) {
              try {
                const previousSaldo = card.saldoUtilizadoTotal || 0;
                const newUsed = previousSaldo + Number(transaction.amount);
                await updateCard(userId, card.id, { saldoUtilizadoTotal: newUsed });
                await eventBus.publish(createDomainEvent<CardUsageUpdatedEvent['payload']>('card', EVENT_TYPES.card.usageUpdated, { cardId: card.id, userId, previousSaldoUtilizado: previousSaldo, newSaldoUtilizado: newUsed, reason: 'purchase' }, 'useTransactions.saveLancamento'));
              } catch (e) { console.error("[Reactive Core] Erro ao consumir limite do cartão:", e); }
            }
          } else if (transaction.type === 'income' && transaction.cardId) {
            let card = cardsRef.current.find(c => c.id === transaction.cardId && c.type === 'voucher');
            if (!card) {
              try {
                const cardSnap = await fsGetDoc(doc(firestore, 'users', userId, 'cartoes', transaction.cardId));
                if (cardSnap.exists()) {
                  card = { id: cardSnap.id, ...cardSnap.data() } as CreditCard;
                }
              } catch (e) { console.warn("[Reactive Core] Erro ao buscar cartão no fallback:", e); }
            }
            if (card) {
              try {
                const newBal = (card.voucherBalance || 0) + Number(transaction.amount);
                await updateCard(userId, card.id, { voucherBalance: newBal });
                queryClient.setQueryData<CreditCard[]>(queryKeys.cards.byUser(userId), (old) => {
                  if (!old) return old;
                  return old.map(c => c.id === card.id ? { ...c, voucherBalance: newBal } : c);
                });
              } catch (e) { console.error("[Reactive Core] Erro ao recarregar voucher:", e); }
            }
          } else if (transaction.paymentMethod === 'voucher' && transaction.cardId) {
            let card = cardsRef.current.find(c => c.id === transaction.cardId);
            if (!card) {
              try {
                const cardSnap = await fsGetDoc(doc(firestore, 'users', userId, 'cartoes', transaction.cardId));
                if (cardSnap.exists()) {
                  card = { id: cardSnap.id, ...cardSnap.data() } as CreditCard;
                }
              } catch (e) { console.warn("[Reactive Core] Erro ao buscar cartão no fallback:", e); }
            }
            if (card) {
              try {
                const newBal = Math.max(0, (card.voucherBalance || 0) - Number(transaction.amount));
                await updateCard(userId, card.id, { voucherBalance: newBal });
                queryClient.setQueryData<CreditCard[]>(queryKeys.cards.byUser(userId), (old) => {
                  if (!old) return old;
                  return old.map(c => c.id === card.id ? { ...c, voucherBalance: newBal } : c);
                });
              } catch (e) { console.error("[Reactive Core] Erro ao debitar voucher:", e); }
            }
          }
        }

        const linkedDebtId = transaction.linkedDebtId;
        if (linkedDebtId && userId) {
          const debt = debtsRef.current.find(d => d.id === linkedDebtId);
          if (debt) {
            try {
              await updateDebt(userId, linkedDebtId, { saldoDevedor: Math.max(0, (debt.saldoDevedor || 0) - Number(transaction.amount)), parcelasRestantes: Math.max(0, (debt.parcelasRestantes || 0) - 1) });
              await eventBus.publish(createDomainEvent<DebtAmortizedEvent['payload']>('debt', EVENT_TYPES.debt.amortized, { debtId: linkedDebtId, userId, amount: Number(transaction.amount), previousSaldo: debt.saldoDevedor || 0, newSaldo: Math.max(0, (debt.saldoDevedor || 0) - Number(transaction.amount)), previousParcelas: debt.parcelasRestantes || 0, newParcelas: Math.max(0, (debt.parcelasRestantes || 0) - 1) }, 'useTransactions.saveLancamento'));
            } catch (e) { console.error("[Reactive Core] Erro na amortização:", e); }
          }
        }

        await set(newRef, stripUndefined(data));
        // Auto-sync de categoria (fire-and-forget)
        syncCategoryToFirestore(transaction.category, transaction.type);
      })();

      await backgroundOp;

      await eventBus.publish(createDomainEvent<TransactionCreatedEvent['payload']>(
        'transaction',
        EVENT_TYPES.transaction.created,
        {
          transaction: { ...transaction, userId, id: newRef.key!, createdAtMs: now } as Transaction,
          isNew: true,
          userId,
        },
        'useTransactions.saveLancamento'
      ));
    }
  };

  deleteLancamentoRef.current = async (id: string) => {
    if (!userId) return;

    const latestTransactions = transactionsRef.current;
    const txToDelete = latestTransactions.find(t => t.id === id);

    // Cache imediato — item some da lista antes de qualquer await
    queryClient.setQueryData<Transaction[]>(key, (old) => {
      if (!old) return old;
      return old.filter(t => t.id !== id);
    });

    // [Background] Reversões (card + debt) + remove
    const backgroundOp = (async () => {
      if (txToDelete && userId) {
        if (txToDelete.linkedDebtId) {
          const debt = debtsRef.current.find(d => d.id === txToDelete.linkedDebtId);
          if (debt) {
            try {
              const newSaldo = debt.saldoDevedor + txToDelete.amount;
              const newParcelas = debt.parcelasRestantes + 1;
              await updateDebt(userId, txToDelete.linkedDebtId, { saldoDevedor: newSaldo, parcelasRestantes: newParcelas });
              await eventBus.publish(createDomainEvent<DebtUpdatedEvent['payload']>('debt', EVENT_TYPES.debt.updated, { debtId: txToDelete.linkedDebtId, userId, previousDebt: debt, changes: { saldoDevedor: newSaldo, parcelasRestantes: newParcelas } }, 'useTransactions.deleteLancamento'));
            } catch (e) { console.error("[Reactive Core] Erro no estorno (dívida):", e); }
          }
        }

        if (txToDelete.isBillPayment && txToDelete.linkedCardId) {
          const card = cardsRef.current.find(c => c.id === txToDelete.linkedCardId);
          if (card) {
            try {
              const previousSaldo = card.saldoUtilizadoTotal || 0;
              const newUsed = previousSaldo + txToDelete.amount;
              await updateCard(userId, card.id, { saldoUtilizadoTotal: newUsed });
              await eventBus.publish(createDomainEvent<CardUsageUpdatedEvent['payload']>('card', EVENT_TYPES.card.usageUpdated, { cardId: card.id, userId, previousSaldoUtilizado: previousSaldo, newSaldoUtilizado: newUsed, reason: 'rollback', transactionId: id }, 'useTransactions.deleteLancamento'));
            } catch (e) { console.error("[Reactive Core] Erro no estorno (pagamento fatura):", e); }
          }
          if (txToDelete.linkedInvoiceId || txToDelete.linkedInvoicePeriodEnd) {
            try {
              const { getInvoice, updateInvoiceAfterPayment, buildInvoiceId } = await import('../services/invoiceService');
              const targetInvoiceId = txToDelete.linkedInvoiceId || (txToDelete.linkedInvoicePeriodEnd ? buildInvoiceId(txToDelete.linkedCardId, txToDelete.linkedInvoicePeriodEnd) : null);
              if (targetInvoiceId) {
                const invoice = await getInvoice(userId, targetInvoiceId).catch(() => null);
                if (invoice) {
                  const newPaidAmount = Math.max(0, Math.round(((invoice.paidAmount || 0) - txToDelete.amount) * 100) / 100);
                  const total = Math.round((invoice.total || 0) * 100) / 100;
                  const newRemaining = Math.max(0, Math.round((total - newPaidAmount) * 100) / 100);
                  const newStatus = newPaidAmount <= 0 ? 'closed' : newPaidAmount >= total ? 'paid' : 'partial';
                  await updateInvoiceAfterPayment(userId, invoice.cardId || txToDelete.linkedCardId, invoice.periodEnd, {
                    paidAmount: newPaidAmount,
                    status: newStatus,
                    remainingAmount: newRemaining,
                    total,
                    updatedAt: new Date().toISOString(),
                  });
                  queryClient.invalidateQueries({ queryKey: queryKeys.invoices.byUser(userId) });
                }
              }
            } catch (e) { console.error("[Reactive Core] Erro no estorno (fatura):", e); }
          }
        } else if (txToDelete.paymentMethod === 'credit' && txToDelete.cardId) {
          const card = cardsRef.current.find(c => c.id === txToDelete.cardId);
          if (card) {
            try {
              const previousSaldo = card.saldoUtilizadoTotal || 0;
              const newUsed = Math.max(0, previousSaldo - txToDelete.amount);
              await updateCard(userId, card.id, { saldoUtilizadoTotal: newUsed });
              await eventBus.publish(createDomainEvent<CardUsageUpdatedEvent['payload']>('card', EVENT_TYPES.card.usageUpdated, { cardId: card.id, userId, previousSaldoUtilizado: previousSaldo, newSaldoUtilizado: newUsed, reason: 'rollback', transactionId: id }, 'useTransactions.deleteLancamento'));
            } catch (e) { console.error("[Reactive Core] Erro no estorno (compra crédito):", e); }
          }
        } else if (txToDelete.paymentMethod === 'voucher' && txToDelete.cardId) {
          const card = cardsRef.current.find(c => c.id === txToDelete.cardId);
          if (card) {
            try {
              const newBal = (card.voucherBalance || 0) + txToDelete.amount;
              await updateCard(userId, card.id, { voucherBalance: newBal });
              queryClient.setQueryData<CreditCard[]>(queryKeys.cards.byUser(userId), (old) => {
                if (!old) return old;
                return old.map(c => c.id === card.id ? { ...c, voucherBalance: newBal } : c);
              });
            } catch (e) { console.error("[Reactive Core] Erro no estorno (gasto voucher):", e); }
          }
        } else if (txToDelete.type === 'income' && txToDelete.cardId) {
          const card = cardsRef.current.find(c => c.id === txToDelete.cardId && c.type === 'voucher');
          if (card) {
            try {
              const newBal = Math.max(0, (card.voucherBalance || 0) - txToDelete.amount);
              await updateCard(userId, card.id, { voucherBalance: newBal });
              queryClient.setQueryData<CreditCard[]>(queryKeys.cards.byUser(userId), (old) => {
                if (!old) return old;
                return old.map(c => c.id === card.id ? { ...c, voucherBalance: newBal } : c);
              });
            } catch (e) { console.error("[Reactive Core] Erro no estorno (recarga voucher):", e); }
          }
        }
      }

      const transactionRef = ref(db, `transactions/${userId}/${id}`);
      await remove(transactionRef);
    })();

    await backgroundOp;

    await eventBus.publish(createDomainEvent<TransactionDeletedEvent['payload']>(
      'transaction',
      EVENT_TYPES.transaction.deleted,
      {
        transactionId: id,
        userId,
        previousTransaction: txToDelete!,
      },
      'useTransactions.deleteLancamento'
    ));
    };

  const saveLancamento = useCallback(
    async (transaction: Omit<Transaction, 'id' | 'userId'> & { id?: string }) =>
      saveLancamentoRef.current(transaction),
    []
  );
  const deleteLancamento = useCallback(
    async (id: string) => deleteLancamentoRef.current(id),
    []
  );
  const fetchMonth = useCallback(
    async (year: number, month: number) => fetchMonthRef.current(year, month),
    []
  );
  const fetchHistory = useCallback(
    async (lastSortKey: string | null, limitCount?: number) =>
      fetchHistoryRef.current(lastSortKey, limitCount),
    []
  );

  const isSyncing = isFetching && !loading;

  return {
    transactions,
    loading: loading && !cachedData && !bridgeReady,
    isSyncing,
    isFetching,
    error: error?.message || null,
    saveLancamento,
    deleteLancamento,
    fetchHistory,
    fetchMonth,
  };
};
