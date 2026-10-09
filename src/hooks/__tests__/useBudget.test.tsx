import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBudget } from '../useBudget';
import * as budgetService from '../../services/budgetService';
import { DEMO_USER_ID } from '../../constants/demoDataset';
import type { Budget } from '../../types';

vi.mock('../../services/budgetService', () => ({
  getBudget: vi.fn(),
  setBudget: vi.fn(),
  deleteBudget: vi.fn(),
  updateBudgetCategories: vi.fn(),
}));

describe('useBudget Hook — Hidratação, Cache Local, Sandbox e Exclusão', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const mockBudget: Budget = {
    id: '2026-09',
    userId: 'user-real',
    month: '2026-09',
    totalIncome: 6000,
    totalBudget: 2500,
    savingsGoal: 1000,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    categories: [
      { categoryName: 'Supermercado', categoryKey: 'supermercado', limit: 1500, alertThreshold: 0.8, rollover: false },
    ],
  };

  it('hidrata instantaneamente (0ms) a partir do localStorage', () => {
    localStorage.setItem('fpi_budget_user-real_2026-09', JSON.stringify(mockBudget));

    const { result } = renderHook(() => useBudget('user-real', '2026-09'), { wrapper });

    // Já nasce hidratado com os dados do cache
    expect(result.current.budget).toEqual(mockBudget);
    expect(result.current.isLoading).toBe(false);
  });

  it('busca do budgetService para usuário real e atualiza o localStorage', async () => {
    vi.mocked(budgetService.getBudget).mockResolvedValueOnce(mockBudget);

    renderHook(() => useBudget('user-real', '2026-09'), { wrapper });

    await waitFor(() => {
      expect(budgetService.getBudget).toHaveBeenCalledWith('user-real', '2026-09');
    });
    expect(localStorage.getItem('fpi_budget_user-real_2026-09')).toBe(JSON.stringify(mockBudget));
  });

  it('isola o DEMO_USER_ID no sessionStorage sem chamar budgetService (Sandbox blindado)', async () => {
    const { result } = renderHook(() => useBudget(DEMO_USER_ID, '2026-09'), { wrapper });

    // Não deve consultar Firestore remoto
    expect(budgetService.getBudget).not.toHaveBeenCalled();

    // Deve entregar o dataset demo nativo
    expect(result.current.budget).not.toBeNull();
    expect(result.current.budget?.userId).toBe(DEMO_USER_ID);
    expect(sessionStorage.getItem('fpi_demo_budget_2026-09')).toBeTruthy();
  });

  it('executa deleteBudget, limpa o cache local e atualiza o estado para null', async () => {
    localStorage.setItem('fpi_budget_user-real_2026-09', JSON.stringify(mockBudget));
    vi.mocked(budgetService.deleteBudget).mockResolvedValueOnce(undefined);
    vi.mocked(budgetService.getBudget).mockResolvedValue(null);

    const { result } = renderHook(() => useBudget('user-real', '2026-09'), { wrapper });

    expect(result.current.budget).not.toBeNull();

    await act(async () => {
      await result.current.deleteBudget();
    });

    expect(budgetService.deleteBudget).toHaveBeenCalledWith('user-real', '2026-09');
    expect(localStorage.getItem('fpi_budget_user-real_2026-09')).toBeNull();
    await waitFor(() => {
      expect(result.current.budget).toBeNull();
    });
  });
});
