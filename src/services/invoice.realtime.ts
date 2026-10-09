import type { QuerySnapshot, DocumentData } from 'firebase/firestore';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../firebase';
import type { CardInvoice } from '../types';
import { createRealtimeBridge } from '../core/realtime/realtimeBridge';
import { queryKeys } from '../core/query/queryKeys';

export const createInvoicesRealtimeBridge = (userId: string) => {
  return createRealtimeBridge<CardInvoice[]>({
    queryKey: queryKeys.invoices.byUser(userId),
    query: query(
      collection(firestore, `users/${userId}/faturas`),
      orderBy('periodEnd', 'desc'),
      limit(50)
    ),
    type: 'firestore',
    mapSnapshot: (snapshot: QuerySnapshot<DocumentData>) => {
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CardInvoice));
    },
  });
};
