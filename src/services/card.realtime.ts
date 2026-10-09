import type { QuerySnapshot, DocumentSnapshot, DocumentData} from 'firebase/firestore';
import { collection, query, limit } from 'firebase/firestore';
import { firestore } from '../firebase';
import type { CreditCard } from '../types';
import { createRealtimeBridge } from '../core/realtime/realtimeBridge';
import { queryKeys } from '../core/query/queryKeys';

export const createCardsRealtimeBridge = (userId: string) => {
  return createRealtimeBridge<CreditCard[]>({
    queryKey: queryKeys.cards.byUser(userId),
    query: query(collection(firestore, `users/${userId}/cartoes`), limit(100)),
    type: 'firestore',
    mapSnapshot: (snapshot: QuerySnapshot<DocumentData> | DocumentSnapshot<DocumentData>) => {
      if ('docs' in snapshot) {
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as CreditCard));
      } else if (snapshot.exists()) {
        return [{ id: snapshot.id, ...snapshot.data() } as CreditCard];
      }
      return [];
    },
  });
};
