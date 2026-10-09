import { useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../core/query/queryKeys';

export function useRefresh(userId: string | undefined) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId || refreshingRef.current) return;

    refreshingRef.current = true;
    setIsRefreshing(true);

    try {
      // Invalida + refetch imediato (refetchType: 'all')
      // Segue o padrão do codebase (invalidateQueries)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.cards.byUser(userId), refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bills.byUser(userId), refetchType: 'all' }),
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices.byUser(userId), refetchType: 'all' }),
      ]);
    } catch {
      // Silencioso — refetch é otimização
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
    }
  }, [userId, queryClient]);

  return { refresh, isRefreshing };
}
