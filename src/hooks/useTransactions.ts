import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ref, query as rtdbQuery, orderByChild, limitToLast, get, endBefore, startAt, endAt } from 'firebase/database';
import { db } from '../firebase';
import { queryKeys } from '../core/query/queryKeys';
import type { Transaction } from '../types';
import { useTransactionsContext } from '../contexts/TransactionsContext';
import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useDebts } from './useDebts';
import { useCards } from './useCards';
import { useEntitlement } from './useEntitlement';
import { isMonthFetchAllowed } from '../utils/historyTimeGate';
import { useTransactionMutations } from './useTransactionMutations';

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
    // all e extra primeiro, base (realtime e updates otimistas) por último
    const merged = [...all, ...extra, ...base];
    
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
        const r = result[i];
        const p = prev[i];
        if (
          r.id !== p.id ||
          r.date !== p.date ||
          r.amount !== p.amount ||
          r.linkedRecurringBillId !== p.linkedRecurringBillId ||
          r.isBillPayment !== p.isBillPayment ||
          r.description !== p.description ||
          r.category !== p.category ||
          r.paymentMethod !== p.paymentMethod
        ) {
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

  const { saveLancamento, deleteLancamento } = useTransactionMutations({
    userId,
    queryClient,
    queryKey: key,
    transactionsRef,
    debtsRef,
    cardsRef,
  });

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
