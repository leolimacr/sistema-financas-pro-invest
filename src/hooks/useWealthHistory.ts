import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../core/query/queryKeys';
import type { WealthSnapshot } from '../services/wealthHistoryService';
import { getWealthHistory, getLastSnapshot, saveWealthSnapshot } from '../services/wealthHistoryService';

export const useWealthHistory = (userId?: string) => {
  const queryClient = useQueryClient();
  const key = queryKeys.wealth.historyByUser(userId || 'anonymous');

  const { data: history = [], isLoading, isFetching } = useQuery<WealthSnapshot[], Error>({
    queryKey: key,
    queryFn: () => userId ? getWealthHistory(userId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 1000 * 60 * 60, // 1 hora
  });

  const lastSnapshot = history.length > 0 ? history[history.length - 1] : null;

  const mutation = useMutation({
    mutationFn: (data: { 
      totalNetWorth: number; 
      totalAssets: number; 
      totalInvestments: number; 
      totalProperty: number; 
      totalDebts: number; 
      module?: 'investments' | 'property' | 'debts' 
    }) => {
      if (!userId) throw new Error('Usuário não autenticado');
      return saveWealthSnapshot(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const daysSinceLastSnapshot = lastSnapshot 
    ? Math.floor((Date.now() - new Date(lastSnapshot.date).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  const dataHealth = daysSinceLastSnapshot <= 15 ? 'green' : daysSinceLastSnapshot <= 30 ? 'yellow' : 'red';

  return {
    history,
    lastSnapshot,
    isLoading,
    isSyncing: isFetching && !isLoading,
    saveSnapshot: mutation.mutateAsync,
    isSaving: mutation.isPending,
    daysSinceLastSnapshot,
    dataHealth
  };
};
