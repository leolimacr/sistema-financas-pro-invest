import type { QuerySnapshot, DocumentSnapshot, DocumentData} from 'firebase/firestore';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { firestore } from '../firebase';
import type { ActiveAsset } from '../components/tools/wealth/ActiveWealthManager';
import type { PassiveAsset } from '../components/tools/wealth/PassiveWealthManager';
import { createRealtimeBridge } from '../core/realtime/realtimeBridge';
import { queryKeys } from '../core/query/queryKeys';

export const createAssetsRealtimeBridge = (userId: string) => {
  return createRealtimeBridge<ActiveAsset[]>({
    queryKey: queryKeys.wealth.assetsByUser(userId),
    query: query(collection(firestore, `users/${userId}/ativos`), orderBy('currentValue', 'desc'), limit(100)),
    type: 'firestore',
    mapSnapshot: (snapshot: QuerySnapshot<DocumentData> | DocumentSnapshot<DocumentData>) => {
      if ('docs' in snapshot) {
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ActiveAsset));
      } else if (snapshot.exists()) {
        return [{ id: snapshot.id, ...snapshot.data() } as ActiveAsset];
      }
      return [];
    },
  });
};

export const createPassivesRealtimeBridge = (userId: string) => {
  return createRealtimeBridge<PassiveAsset[]>({
    queryKey: queryKeys.wealth.passivesByUser(userId),
    query: query(collection(firestore, `users/${userId}/passivos`), orderBy('currentValue', 'desc'), limit(100)),
    type: 'firestore',
    mapSnapshot: (snapshot: QuerySnapshot<DocumentData> | DocumentSnapshot<DocumentData>) => {
      if ('docs' in snapshot) {
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as PassiveAsset));
      } else if (snapshot.exists()) {
        return [{ id: snapshot.id, ...snapshot.data() } as PassiveAsset];
      }
      return [];
    },
  });
};
