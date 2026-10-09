import type { QuerySnapshot, DocumentSnapshot, DocumentData} from 'firebase/firestore';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../firebase';
import type { Goal } from './goalService';
import { createRealtimeBridge } from '../core/realtime/realtimeBridge';
import { queryKeys } from '../core/query/queryKeys';

export const createGoalRealtimeBridge = (userId: string) => {
  return createRealtimeBridge<Goal[]>({
    queryKey: queryKeys.goals.byUser(userId),
    query: query(collection(firestore, `users/${userId}/metas`), orderBy('createdAt', 'desc'), limit(100)),
    type: 'firestore',
    mapSnapshot: (snapshot: QuerySnapshot<DocumentData> | DocumentSnapshot<DocumentData>) => {
      if ('docs' in snapshot) {
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Goal));
      } else if (snapshot.exists()) {
        return [{ id: snapshot.id, ...snapshot.data() } as Goal];
      }
      return [];
    },
  });
};

