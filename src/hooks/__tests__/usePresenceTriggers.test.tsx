import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const createMock = vi.fn();

vi.mock('../../services/PresenceEventService', () => ({
  PresenceEventService: { create: (...args: unknown[]) => createMock(...args) },
}));

import { usePresenceTriggers } from '../usePresenceTriggers';
import type { DebtItem } from '../../services/debt/debt.types';

const debt = (over: Partial<DebtItem> = {}): DebtItem => {
  const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const iso = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  return {
    id: 'd1',
    nome: 'Cartão',
    tipo: 'cartao',
    saldoDevedor: 500,
    taxaMensal: 0,
    parcelasRestantes: 3,
    valorParcela: 100,
    dataVencimento: iso,
    totalParcelas: 3,
    parcelasPagas: 0,
    historicoPagamentos: [],
    ...over,
  };
};

describe('usePresenceTriggers - disparo único', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue(true);
  });

  it('avalia 1× por montagem mesmo com novas identidades de array', async () => {
    const { rerender } = renderHook(
      ({ debts }) => usePresenceTriggers({ userId: 'u1', debts, debtsLoading: false }),
      { initialProps: { debts: [debt()] } }
    );

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));

    rerender({ debts: [debt()] });
    rerender({ debts: [debt()] });
    await new Promise(r => setTimeout(r, 50));

    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('não avalia enquanto debtsLoading', async () => {
    renderHook(() => usePresenceTriggers({ userId: 'u1', debts: [debt()], debtsLoading: true }));
    await new Promise(r => setTimeout(r, 50));
    expect(createMock).not.toHaveBeenCalled();
  });

  it('não avalia sem userId', async () => {
    renderHook(() => usePresenceTriggers({ userId: undefined, debts: [debt()], debtsLoading: false }));
    await new Promise(r => setTimeout(r, 50));
    expect(createMock).not.toHaveBeenCalled();
  });
});
