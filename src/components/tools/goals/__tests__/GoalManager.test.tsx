import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContext } from '../../../../contexts/ToastContext';
import GoalManager from '../GoalManager';

// Mock do Timestamp de Firestore
vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Timestamp: {
      now: () => ({ toMillis: () => Date.now(), toDate: () => new Date() }),
      fromDate: (d: Date) => ({ toMillis: () => d.getTime(), toDate: () => d }),
    },
  };
});

// Mock do hook useGoals
vi.mock('../../../../hooks/useGoals', () => ({
  useGoals: () => ({
    goals: [],
    loading: false,
    addGoal: vi.fn(),
    editGoal: vi.fn(),
    removeGoal: vi.fn(),
  }),
}));

describe('GoalManager — Integração de Metas a partir da Calculadora FIRE', () => {
  let queryClient: QueryClient;
  const mockAddToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it('pré-popula o formulário de metas quando query params action=new, nome e valor estão presentes', () => {
    // Simula URL com parâmetros enviados pela Calculadora FIRE
    delete (window as any).location;
    (window as any).location = new URL(
      'https://financasproinvest.com.br/app/metas?action=new&nome=Independ%C3%AAncia%20Financeira%20(FIRE)&valor=1000'
    );

    render(
      <QueryClientProvider client={queryClient}>
        <ToastContext.Provider value={{ addToast: mockAddToast }}>
          <GoalManager userId="test-user-123" userMeta={{ uid: 'test-user-123' }} />
        </ToastContext.Provider>
      </QueryClientProvider>
    );

    // Verifica se os campos foram pré-preenchidos
    const inputNome = screen.getByPlaceholderText(/Dê um nome para sua meta/i) as HTMLInputElement;
    expect(inputNome.value).toBe('Independência Financeira (FIRE)');

    const inputValor = screen.getByPlaceholderText('0,00') as HTMLInputElement;
    expect(inputValor.value).toBe('1.000,00');

    // Verifica se o toast de confirmação foi emitido
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.stringContaining('Meta pré-preenchida a partir da Calculadora FIRE'),
      'info'
    );
  });
});
