import type { DocumentSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { doc } from 'firebase/firestore';
import { firestore } from '../firebase';
import type { Category } from '../types';
import { createRealtimeBridge } from '../core/realtime';
import { queryKeys } from '../core/query/queryKeys';

export const createCategoriesRealtimeBridge = (userId: string) => {
  return createRealtimeBridge<Category[]>({
    queryKey: queryKeys.categories.byUser(userId),
    query: doc(firestore, 'categories', userId),
    type: 'firestore',
    mapSnapshot: (snapshot: QuerySnapshot<DocumentData> | DocumentSnapshot<DocumentData>) => {
      if ('docs' in snapshot) {
        // This branch would be hit if the query was a collection (e.g., collection(firestore, 'categories'))
        // For now, if it's a QuerySnapshot, we'll map its docs
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Category[];
      } else if (snapshot.exists()) {
        // Original logic for DocumentSnapshot (assuming categories are in a 'list' field)
        const data = snapshot.data();
        return (data as any).list ? ((data as any).list as Category[]) : [];
      }
      return [];
    },
  });
};
