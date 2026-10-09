import { useMemo } from 'react';
import type { DebtItem } from '../services/debt/debt.types';
import type { SovereignSnapshotResult } from './useSovereignSnapshot';
import { analyzeDebtContext } from '../services/debt/debt.advisor';
import type { DebtCommand } from '../services/debt/advisor.types';

export const useDebtAdvisor = (
  debts: DebtItem[],
  snapshot: SovereignSnapshotResult
): DebtCommand[] => {
  return useMemo(() => {
    return analyzeDebtContext(debts, snapshot);
  }, [debts, snapshot]);
};
