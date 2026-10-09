import type { QuerySnapshot, DocumentSnapshot, DocumentData} from 'firebase/firestore';
import { collection, query, limit } from 'firebase/firestore';
import { firestore } from '../firebase';
import type { RecurringBill } from '../types';
import { createRealtimeBridge } from '../core/realtime/realtimeBridge';
import { queryKeys } from '../core/query/queryKeys';

export const createBillsRealtimeBridge = (userId: string) => {
  return createRealtimeBridge<RecurringBill[]>({
    queryKey: queryKeys.bills.byUser(userId),
    query: query(collection(firestore, `users/${userId}/contas_fixas`), limit(100)),
    type: 'firestore',
    mapSnapshot: (snapshot: QuerySnapshot<DocumentData> | DocumentSnapshot<DocumentData>) => {
      if ('docs' in snapshot) {
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RecurringBill));
      } else if (snapshot.exists()) {
        return [{ id: snapshot.id, ...snapshot.data() } as RecurringBill];
      }
      return [];
    },
  });
};
