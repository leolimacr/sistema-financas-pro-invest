import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { createNexusReserve } from '../goalService';
import { useNexusActions } from '../../hooks/useNexusActions';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock do Firestore
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn().mockResolvedValue({ id: 'mock-goal-id' }),
  getFirestore: vi.fn(),
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
  },
}));

// Mock do NotificationService
vi.mock('../NotificationService', () => ({
  NotificationService: {
    dispatch: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Nexus Goals Integration', () => {
  it('createNexusReserve deve formatar os dados corretamente para o Firestore', async () => {
    const goal = await createNexusReserve('user-123', 'Fatura Jan', 1500, '2026-01-30');
    
    expect(goal.title).toBe('Reserva: Fatura Jan');
    expect(goal.targetAmount).toBe(1500);
    expect(goal.type).toBe('nexus_reserve');
    expect(goal.ativa).toBe(true);
  });

  it('useNexusActions deve executar a reserva e retornar sucesso com valor', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
    const { result } = renderHook(() => useNexusActions(), { wrapper });
    
    const action = {
      label: 'Reservar',
      type: 'reserve' as const,
      payload: {
        value: 1200.50,
        title: 'Fatura Teste',
        targetDate: '2026-02-05'
      }
    };

    const response = await result.current.executeAction('user-123', 'insight-1', action);
    
    expect(response.success).toBe(true);
    expect(response.amount).toBe(1200.50);
  });
});
