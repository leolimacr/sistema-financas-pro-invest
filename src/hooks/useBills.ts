import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../core/query/queryKeys';
import { getRecurringBills } from '../services/billService';
import type { RecurringBill } from '../types';

export const useBills = (userId?: string) => {
  const key = queryKeys.bills.byUser(userId || 'anonymous');

  const { data: bills = [], isLoading, error, isFetching } = useQuery<RecurringBill[], Error>({
    queryKey: key,
    queryFn: async () => {
      if (!userId) return [];
      if (userId === 'demo-sandbox-soberano') {
        const { DEMO_BILLS } = await import('../constants/demoDataset');
        return DEMO_BILLS;
      }
      return getRecurringBills(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    bills,
    isLoading,
    isSyncing: isFetching && !isLoading,
    error,
  };
};
