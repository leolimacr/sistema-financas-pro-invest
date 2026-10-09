export { useDebts } from '../../hooks/useDebts';

import { saveDebt, updateDebt, deleteDebt, amortizeSingleDebt, type AmortizeSingleDebtOptions } from './debtService';
import type { DebtItem } from './debt.types';
import { createMutationHook } from '../../core/query/patterns/createMutationHook';

export const useCreateDebt = (userId: string) => {
  return createMutationHook('debt', (debt: DebtItem) => saveDebt(userId, debt))();
};

export const useUpdateDebt = (userId: string) => {
  return createMutationHook('debt', ({ id, data }: { id: string, data: Partial<DebtItem> }) => updateDebt(userId, id, data))();
};

export const useDeleteDebt = (userId: string) => {
  return createMutationHook('debt', (id: string) => deleteDebt(userId, id))();
};

export const useAmortizeDebt = (userId: string) => {
  return createMutationHook(
    'debt',
    ({ debtId, options }: { debtId: string; options: AmortizeSingleDebtOptions }) => amortizeSingleDebt(userId, debtId, options)
  )();
};
