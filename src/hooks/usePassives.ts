import { useQuery } from '@tanstack/react-query';
import { collection, query, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase';
import { queryKeys } from '../core/query/queryKeys';
import type { PassiveAsset } from '../types';

const fetchPassives = async (userId: string): Promise<PassiveAsset[]> => {
  const snapshot = await getDocs(query(collection(firestore, `users/${userId}/passivos`)));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PassiveAsset));
};

export const usePassives = (userId: string | undefined) => {
  const key = queryKeys.wealth.passivesByUser(userId || 'anonymous');

  const { data: passives = [], isLoading: loading, error, isFetching } = useQuery<PassiveAsset[], Error>({
    queryKey: key,
    queryFn: () => userId ? fetchPassives(userId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  return { 
    passives, 
    loading, 
    isSyncing: isFetching && !loading,
    error: error?.message || null 
  };
};