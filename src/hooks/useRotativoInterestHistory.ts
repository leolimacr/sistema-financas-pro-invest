import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../core/query/queryKeys';
import {
  getInterestHistory,
  getAggregateByPeriod,
  getTotalInterestForDebt,
} from '../services/rotativoInterestHistory';

export function useRotativoInterestHistory(
  userId: string | undefined,
  options?: {
    debtId?: string;
    startCompetence?: string;
    endCompetence?: string;
    includeReverted?: boolean;
  },
) {
  return useQuery({
    queryKey: options?.debtId
      ? [...queryKeys.jurosRotativos.byDebt(userId ?? '', options.debtId), options]
      : [...queryKeys.jurosRotativos.byUser(userId ?? ''), options],
    queryFn: () => getInterestHistory(userId!, options),
    enabled: !!userId,
  });
}

export function useRotativoInterestAggregate(
  userId: string | undefined,
  startCompetence: string,
  endCompetence: string,
) {
  return useQuery({
    queryKey: [...queryKeys.jurosRotativos.byUser(userId ?? ''), 'aggregate', startCompetence, endCompetence],
    queryFn: () => getAggregateByPeriod(userId!, startCompetence, endCompetence),
    enabled: !!userId,
  });
}

export function useRotativoInterestTotalForDebt(
  userId: string | undefined,
  debtId: string | undefined,
) {
  return useQuery({
    queryKey: [...queryKeys.jurosRotativos.byDebt(userId ?? '', debtId ?? ''), 'total'],
    queryFn: () => getTotalInterestForDebt(userId!, debtId!),
    enabled: !!userId && !!debtId,
  });
}
