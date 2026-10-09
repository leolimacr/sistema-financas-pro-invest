import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Budget, CategoryBudget } from '../types';
import * as budgetService from '../services/budgetService';
import { getCurrentBudgetId } from '../utils/budgetUtils';
import { DEMO_USER_ID, getDemoBudget } from '../constants/demoDataset';

export function useBudget(userId?: string, targetMonthKey?: string) {
  const queryClient = useQueryClient();
  const budgetId = targetMonthKey || getCurrentBudgetId();
  const key = ['budget', userId, budgetId] as const;
  const isDemo = userId === DEMO_USER_ID;

  const storageKey = isDemo
    ? `fpi_demo_budget_${budgetId}`
    : `fpi_budget_${userId || 'anon'}_${budgetId}`;

  const readLocalBudget = (): Budget | null => {
    try {
      if (isDemo) {
        const raw = sessionStorage.getItem(storageKey);
        if (raw) return JSON.parse(raw) as Budget;
        // Se for demo e ainda não tiver salvo, retorna o dataset demo padrão
        const defaultDemo = getDemoBudget(budgetId);
        sessionStorage.setItem(storageKey, JSON.stringify(defaultDemo));
        return defaultDemo;
      }
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as Budget;
    } catch {
      return null;
    }
  };

  const { data: budget, isLoading, isFetching } = useQuery<Budget | null>({
    queryKey: key,
    queryFn: async () => {
      if (isDemo) {
        return readLocalBudget() ?? null;
      }
      if (!userId) return null;
      try {
        const remote = await budgetService.getBudget(userId, budgetId);
        if (remote) {
          localStorage.setItem(storageKey, JSON.stringify(remote));
        } else {
          localStorage.removeItem(storageKey);
        }
        return remote ?? null;
      } catch (err) {
        console.warn('[useBudget] Falha ao buscar orçamento remoto, usando cache local:', err);
        return readLocalBudget() ?? null;
      }
    },
    initialData: () => readLocalBudget() ?? undefined,
    initialDataUpdatedAt: () => (readLocalBudget() ? 0 : undefined),
    enabled: !!userId,
    staleTime: 60_000,
  });

  const setBudgetMutation = useMutation({
    mutationFn: async (data: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const fullBudget: Budget = {
        ...data,
        id: budgetId,
        userId: userId || '',
        month: budgetId,
        createdAt: budget?.createdAt || now,
        updatedAt: now,
      };

      if (isDemo) {
        sessionStorage.setItem(storageKey, JSON.stringify(fullBudget));
        return fullBudget;
      }

      await budgetService.setBudget(userId!, data);
      localStorage.setItem(storageKey, JSON.stringify(fullBudget));
      return fullBudget;
    },
    onSuccess: (savedBudget) => {
      queryClient.setQueryData(key, savedBudget);
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async () => {
      if (isDemo) {
        sessionStorage.removeItem(storageKey);
        return;
      }
      if (!userId) return;
      await budgetService.deleteBudget(userId, budgetId);
      localStorage.removeItem(storageKey);
    },
    onSuccess: () => {
      queryClient.setQueryData(key, null);
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const updateCategoriesMutation = useMutation({
    mutationFn: async ({ categories }: { categories: CategoryBudget[] }) => {
      if (isDemo) {
        const current = readLocalBudget();
        if (current) {
          const updated: Budget = {
            ...current,
            categories,
            totalBudget: categories.reduce((sum, c) => sum + c.limit, 0),
            updatedAt: new Date().toISOString(),
          };
          sessionStorage.setItem(storageKey, JSON.stringify(updated));
          return updated;
        }
        return null;
      }

      if (!userId) return null;
      await budgetService.updateBudgetCategories(userId, budgetId, categories);
      const current = budget || readLocalBudget();
      if (current) {
        const updated: Budget = {
          ...current,
          categories,
          totalBudget: categories.reduce((sum, c) => sum + c.limit, 0),
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      }
      return null;
    },
    onSuccess: (updated) => {
      if (updated) {
        queryClient.setQueryData(key, updated);
      }
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return {
    budget,
    budgetId,
    isLoading: isLoading && !budget,
    isSyncing: isFetching && !isLoading,
    setBudget: setBudgetMutation.mutateAsync,
    isSettingBudget: setBudgetMutation.isPending,
    deleteBudget: deleteBudgetMutation.mutateAsync,
    isDeletingBudget: deleteBudgetMutation.isPending,
    updateCategories: updateCategoriesMutation.mutateAsync,
    isUpdatingCategories: updateCategoriesMutation.isPending,
  };
}
