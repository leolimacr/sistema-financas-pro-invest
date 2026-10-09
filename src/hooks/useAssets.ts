import { useQuery } from '@tanstack/react-query';
import { collection, query, getDocs } from 'firebase/firestore';
import { firestore } from '../firebase';
import { queryKeys } from '../core/query/queryKeys';
import type { ActiveAsset } from '../types';

const fetchAssets = async (userId: string): Promise<ActiveAsset[]> => {
  const snapshot = await getDocs(query(collection(firestore, `users/${userId}/ativos`)));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActiveAsset));
};

export const useAssets = (userId: string | undefined) => {
  const key = queryKeys.wealth.assetsByUser(userId || 'anonymous');

  const { data: assets = [], isLoading: loading, error, isFetching } = useQuery<ActiveAsset[], Error>({
    queryKey: key,
    queryFn: async () => {
      if (!userId) return [];
      if (userId === 'demo-sandbox-soberano') {
        return [
          { id: 'demo-asset-1', name: 'Reserva em Tesouro Selic', category: 'Renda Fixa', currentValue: 25000, proposito: 'Segurança & Liquidez Diária' },
          { id: 'demo-asset-2', name: 'Tesouro IPCA+ 2035', category: 'Renda Fixa', currentValue: 15000, proposito: 'Aposentadoria & Blindagem' },
        ];
      }
      return fetchAssets(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  return { 
    assets, 
    loading, 
    isSyncing: isFetching && !loading,
    error: error?.message || null 
  };
};