import { push, ref, set, update } from 'firebase/database';
import { db } from '../firebase';
import type { RecurringBill, Transaction } from '../types';
import { updateRecurringBill } from './billService';
import { getLocalDateString } from '../utils/dateHelpers';
import { queryClient } from '../core/query/queryClient';
import { queryKeys } from '../core/query/queryKeys';

/**
 * Adiciona uma nova transação ao Realtime Database.
 */
export const addTransaction = async (userId: string, transaction: Omit<Transaction, 'id'>): Promise<string> => {
  const transactionRef = push(ref(db, `transactions/${userId}`));
  const now = Date.now();
  const dateClean = transaction.date.replace(/-/g, '');
  await set(transactionRef, {
    ...transaction,
    userId,
    createdAtMs: now,
    sortKey: `${dateClean}_${now}_${transactionRef.key}`,
  });
  return transactionRef.key!;
};

/**
 * Cria uma transação para o pagamento de uma conta recorrente e opcionalmente atualiza a bill.
 */
export const addPaidRecurringBillTransaction = async (userId: string, bill: RecurringBill): Promise<string> => {
  const newTransaction: Omit<Transaction, 'id'> = {
    userId,
    description: `Pagamento de ${bill.name}`,
    amount: bill.amount,
    type: 'expense',
    category: bill.category,
    date: getLocalDateString(),
    paymentMethod: 'money', // Assumindo pagamento em dinheiro
    isBillPayment: false,
    linkedRecurringBillId: bill.id, // Linkar à conta recorrente
  };

  const transactionId = await addTransaction(userId, newTransaction);

  // Opcional: Atualizar a RecurringBill para registrar a data do último pagamento
  // Isso será útil para evitar notificações duplicadas e para controle visual.
  await updateRecurringBill(userId, bill.id, { lastPaidDate: new Date().toISOString() });

  return transactionId;
};

/**
 * Vincula uma transação avulsa existente a uma conta fixa,
 * marcando a conta como paga e evitando qualquer duplicidade de débito no saldo.
 */
export const reconcileTransactionWithBill = async (
  userId: string,
  transactionId: string,
  bill: RecurringBill,
  txDate?: string
): Promise<void> => {
  const uid = userId || 'anonymous';
  const paidDate = txDate || getLocalDateString();

  if (userId && userId !== 'anonymous') {
    try {
      const transactionRef = ref(db, `transactions/${userId}/${transactionId}`);
      await update(transactionRef, {
        linkedRecurringBillId: bill.id,
        isBillPayment: false,
      });

      await updateRecurringBill(userId, bill.id, { lastPaidDate: paidDate });
    } catch (err) {
      console.error('[reconcileTransactionWithBill] Erro ao sincronizar com backend:', err);
    }
  }

  // Atualização otimista imediata no cache local do React Query
  queryClient.setQueryData<Transaction[]>(queryKeys.transactions.byUser(uid), (old) => {
    if (!old) return old;
    return old.map(t => t.id === transactionId ? { ...t, linkedRecurringBillId: bill.id, isBillPayment: false } : t);
  });
  queryClient.setQueryData<Transaction[]>(['transactions_all', uid], (old) => {
    if (!old) return old;
    return old.map(t => t.id === transactionId ? { ...t, linkedRecurringBillId: bill.id, isBillPayment: false } : t);
  });
  queryClient.setQueryData<Transaction[]>(['transactions_extra', uid], (old) => {
    if (!old) return old;
    return old.map(t => t.id === transactionId ? { ...t, linkedRecurringBillId: bill.id, isBillPayment: false } : t);
  });
  queryClient.setQueryData<RecurringBill[]>(queryKeys.bills.byUser(uid), (old) => {
    if (!old) return old;
    return old.map(b => b.id === bill.id ? { ...b, lastPaidDate: paidDate } : b);
  });

  // Atualiza cache em localStorage para consistência imediata
  try {
    const storageKey = `financas-pro-invest_tx_${uid}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.data)) {
        parsed.data = parsed.data.map((t: Transaction) => t.id === transactionId ? { ...t, linkedRecurringBillId: bill.id, isBillPayment: false } : t);
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      }
    }
  } catch {}

  queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byUser(uid) });
  queryClient.invalidateQueries({ queryKey: ['transactions_all', uid] });
  queryClient.invalidateQueries({ queryKey: queryKeys.bills.byUser(uid) });
};

/**
 * Marca uma conta fixa diretamente como quitada no mês corrente,
 * sem criar nem alterar lançamentos de extrato (ideal para pagamentos em espécie ou fora do app).
 */
export const markBillPaidDirectly = async (
  userId: string,
  billId: string,
  paidDate?: string
): Promise<void> => {
  const uid = userId || 'anonymous';
  const date = paidDate || getLocalDateString();

  if (userId && userId !== 'anonymous') {
    try {
      await updateRecurringBill(userId, billId, { lastPaidDate: date });
    } catch (err) {
      console.error('[markBillPaidDirectly] Erro ao sincronizar com backend:', err);
    }
  }

  // Atualização otimista imediata no cache local do React Query
  queryClient.setQueryData<RecurringBill[]>(queryKeys.bills.byUser(uid), (old) => {
    if (!old) return old;
    return old.map(b => b.id === billId ? { ...b, lastPaidDate: date } : b);
  });

  queryClient.invalidateQueries({ queryKey: queryKeys.bills.byUser(uid) });
};

