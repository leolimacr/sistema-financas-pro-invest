import type { DataSnapshot } from 'firebase/database';
import { ref, query as rtdbQuery, limitToLast } from 'firebase/database';
import { db } from '../firebase';
import type { Transaction } from '../types';
import { createRealtimeBridge } from '../core/realtime/realtimeBridge';
import { queryKeys } from '../core/query/queryKeys';

/** Bridge RTDB para transações do mês corrente.
 *  limitToLast(100) — cap por sessão. Transações antigos são carregados
 *  via fetchMonth (get) sob demanda no useTransactions. Se o usuário tiver
 *  >100 transações no mês corrente, a cauda não aparece neste snapshot. */
export const createTransactionsRealtimeBridge = (userId: string) => {
  return createRealtimeBridge<Transaction[]>({
    queryKey: queryKeys.transactions.byUser(userId),
    query: rtdbQuery(ref(db, `transactions/${userId}`), limitToLast(100)),
    type: 'rtdb',
    mapSnapshot: (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const transactions: Transaction[] = [];
      if (data) {
        Object.entries(data).forEach(([id, value]: [string, any]) => {
          transactions.push({ id, ...value });
        });
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      return transactions;
    },
  });
};
