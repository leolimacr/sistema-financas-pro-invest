import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../core/query/queryKeys';
import { getCards } from '../services/cardService';
import type { CreditCard } from '../types';

export const useCards = (userId?: string) => {
  const key = queryKeys.cards.byUser(userId || 'anonymous');

  const { data: cards = [], isLoading, error, isFetching } = useQuery<CreditCard[], Error>({
    queryKey: key,
    queryFn: () => userId ? getCards(userId) : Promise.resolve([]),
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });

  return {
    cards,
    isLoading,
    isSyncing: isFetching && !isLoading,
    error,
  };
};
