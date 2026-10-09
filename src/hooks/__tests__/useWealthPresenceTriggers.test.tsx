import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const createMock = vi.fn();

vi.mock('../../services/PresenceEventService', () => ({
  PresenceEventService: { create: (...args: unknown[]) => createMock(...args) },
}));

import { useWealthPresenceTriggers } from '../useWealthPresenceTriggers';
import type { Goal } from '../../services/goalService';

const goal = (over: Partial<Goal> = {}): Goal => {
  const target = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  return {
    id: 'g1',
    title: 'Reserva',
    targetAmount: 10000,
    currentAmount: 0,
    targetDate: target.toISOString(),
    ...over,
  } as unknown as Goal;
};

describe('useWealthPresenceTriggers - assinatura estável', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue(true);
  });

  it('re-render idêntico não re-dispara', async () => {
    const { rerender } = renderHook(
      ({ goals }) => useWealthPresenceTriggers({
        userId: 'u1', goals, assets: [], goalsLoading: false, assetsLoading: false,
      }),
      { initialProps: { goals: [goal()] } }
    );

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));

    rerender({ goals: [goal()] });
    await new Promise(r => setTimeout(r, 50));
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('dados tardios disparam 1× (sem stale closure)', async () => {
    const { rerender } = renderHook(
      ({ goals, goalsLoading }) => useWealthPresenceTriggers({
        userId: 'u1', goals, assets: [], goalsLoading, assetsLoading: false,
      }),
      { initialProps: { goals: [] as Goal[], goalsLoading: true } }
    );

    await new Promise(r => setTimeout(r, 30));
    expect(createMock).not.toHaveBeenCalled();

    rerender({ goals: [goal()], goalsLoading: false });
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
  });
});
