import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NexusActionButton from '../NexusActionButton';
import type { NexusInsight } from '../../../services/nexusInsightEngine';

const entitlementMocks = vi.hoisted(() => ({
  effectiveTier: 'free' as string,
}));

const actionsMocks = vi.hoisted(() => ({
  executeAction: vi.fn(),
}));

vi.mock('../../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({ effectiveTier: entitlementMocks.effectiveTier }),
}));

vi.mock('../../../hooks/useNexusActions', () => ({
  useNexusActions: () => ({
    executeAction: actionsMocks.executeAction,
    isExecuting: false,
  }),
}));

vi.mock('../../PaywallModal', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="paywall-stub">PAYWALL</div> : null,
}));

vi.mock('../../../services/nexusAnalyticsService', () => ({
  trackActionStarted: vi.fn(),
}));

const insight = {
  id: 'ins-1',
  action: { label: 'Reservar valor', type: 'reserve', requiresPlan: 'pro' },
} as unknown as NexusInsight;

beforeEach(() => {
  vi.clearAllMocks();
  entitlementMocks.effectiveTier = 'free';
  actionsMocks.executeAction.mockResolvedValue({ success: true });
});

describe('NexusActionButton (Etapa 7 — E7-10 fonte única)', () => {
  it('free diante de ação pro: abre paywall, não executa', () => {
    render(<NexusActionButton insight={insight} userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /reservar valor/i }));
    expect(screen.getByTestId('paywall-stub')).toBeInTheDocument();
    expect(actionsMocks.executeAction).not.toHaveBeenCalled();
  });

  it('pro diante de ação pro: executa sem paywall', () => {
    entitlementMocks.effectiveTier = 'pro';
    render(<NexusActionButton insight={insight} userId="u1" />);
    fireEvent.click(screen.getByRole('button', { name: /reservar valor/i }));
    expect(actionsMocks.executeAction).toHaveBeenCalledWith('u1', 'ins-1', insight.action);
    expect(screen.queryByTestId('paywall-stub')).not.toBeInTheDocument();
  });

  it('orientação abre a área correta sem sinalizar uma operação como concluída', () => {
    const onNavigate = vi.fn();
    const navigationInsight = {
      id: 'ins-navigation',
      deepLink: 'minhas-dividas',
      priority: 'alta',
      action: { label: 'Atacar agora', type: 'attack_debt' },
    } as unknown as NexusInsight;

    render(<NexusActionButton insight={navigationInsight} userId="u1" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByRole('button', { name: /atacar agora/i }));

    expect(onNavigate).toHaveBeenCalledWith('minhas-dividas');
    expect(actionsMocks.executeAction).not.toHaveBeenCalled();
    expect(screen.queryByText(/operação concluída/i)).not.toBeInTheDocument();
  });
});
