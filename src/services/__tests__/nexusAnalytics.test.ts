import { describe, expect, it, vi, beforeEach } from 'vitest';

const trackEventMock = vi.fn();

vi.mock('../analyticsService', () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

import {
  trackActionCompleted,
  trackActionFailed,
  trackInsightShown,
} from '../nexusAnalyticsService';

describe('nexusAnalyticsService - surface padronizada (N13)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('completed/failed carregam surface (default store)', () => {
    trackActionCompleted('id-1', 'alta', 'reserve');
    expect(trackEventMock).toHaveBeenCalledWith(
      'nexus_acao_concluida',
      expect.objectContaining({ surface: 'store', actionType: 'reserve' }),
    );

    trackActionFailed('id-2', 'media', 'pay_invoice', 'x');
    expect(trackEventMock).toHaveBeenCalledWith(
      'nexus_acao_falhou',
      expect.objectContaining({ surface: 'store', error: 'x' }),
    );
  });

  it('surface explícita é respeitada', () => {
    trackActionCompleted('id-3', 'baixa', 'adjust', 'feed');
    expect(trackEventMock).toHaveBeenCalledWith(
      'nexus_acao_concluida',
      expect.objectContaining({ surface: 'feed' }),
    );
  });

  it('shown mantém dedup por id', () => {
    trackInsightShown('same-id', 'alta', 'transaction.created', 'c1');
    trackInsightShown('same-id', 'alta', 'transaction.created', 'c1');
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });
});
