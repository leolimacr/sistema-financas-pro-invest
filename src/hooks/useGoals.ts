import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Goal } from '../services/goalService';
import { createGoal, updateGoal, deleteGoal, fetchGoals } from '../services/goalService';
import { queryKeys } from '../core/query/queryKeys';

export const useGoals = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const key = queryKeys.goals.byUser(userId || 'anonymous');

  const { data: goals = [], isLoading: loading, error, isFetching } = useQuery<Goal[], Error>({
    queryKey: key,
    queryFn: async () => {
      if (!userId) return [];
      if (userId === 'demo-sandbox-soberano') {
        const { DEMO_GOALS } = await import('../constants/demoDataset');
        return DEMO_GOALS;
      }
      return fetchGoals(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const isSyncing = isFetching && !loading;

  const addGoal = async (goalData: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!userId) throw new Error('Usuário não autenticado');
    if (userId === 'demo-sandbox-soberano') {
      const mockGoal = {
        ...goalData,
        id: `demo-goal-${Date.now()}`,
        userId,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Goal[]>(key, (prev = []) => [...prev, mockGoal]);
      return mockGoal;
    }
    const newGoal = await createGoal(userId, goalData);
    queryClient.invalidateQueries({ queryKey: key });
    return newGoal;
  };

  const editGoal = async (goalId: string, updates: Partial<Goal>) => {
    if (!userId) throw new Error('Usuário não autenticado');
    if (userId === 'demo-sandbox-soberano') {
      queryClient.setQueryData<Goal[]>(key, (prev = []) =>
        prev.map((g) => (g.id === goalId ? { ...g, ...updates } : g))
      );
      return;
    }
    await updateGoal(userId, goalId, updates);
    queryClient.invalidateQueries({ queryKey: key });
  };

  const removeGoal = async (goalId: string) => {
    if (!userId) throw new Error('Usuário não autenticado');
    if (userId === 'demo-sandbox-soberano') {
      queryClient.setQueryData<Goal[]>(key, (prev = []) => prev.filter((g) => g.id !== goalId));
      return;
    }
    await deleteGoal(userId, goalId);
    queryClient.invalidateQueries({ queryKey: key });
  };

  return {
    goals,
    loading,
    isSyncing,
    error: error?.message || null,
    addGoal,
    editGoal,
    removeGoal,
  };
};
