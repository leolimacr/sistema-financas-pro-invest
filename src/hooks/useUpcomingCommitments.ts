import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../core/query/queryKeys';
import { fetchUpcomingCommitments, type AgendaCommitment } from '../services/agendaService';

export const useUpcomingCommitments = (userId?: string, max = 10) => {
  const key = queryKeys.agenda.upcoming(userId || 'anonymous', max);

  const { data: commitments = [], isLoading, error } = useQuery<AgendaCommitment[], Error>({
    queryKey: key,
    queryFn: () => (userId ? fetchUpcomingCommitments(userId, max) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 1000 * 60 * 3, // 3 minutos
  });

  return {
    commitments,
    isLoading,
    error,
  };
};

export default useUpcomingCommitments;
