import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import CockpitAnalytics from '../CockpitAnalytics';
import type { EntitlementKey } from '../../../../config/featureAccessMatrix';

const entitlementMocks = vi.hoisted(() => ({
  loading: false,
  allowedKeys: new Set<string>(),
}));

vi.mock('../../../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({
    loading: entitlementMocks.loading,
    effectiveTier: 'free',
    hasFeature: (key: EntitlementKey) => entitlementMocks.allowedKeys.has(key),
  }),
}));

const evolutionData = [
  { name: '01/01', fullDate: '01/01/26', value: 1000, investments: 600, debts: 200 },
  { name: '01/02', fullDate: '01/02/26', value: 1200, investments: 700, debts: 150 },
];

const baseProps = {
  evolutionData,
  investmentComposition: [],
  propertyComposition: [],
  debtComposition: [],
  isPrivacyMode: false,
  validatedModules: {},
  totalInvestments: 0,
  totalProperty: 0,
  totalDebts: 0,
  onNavigate: vi.fn(),
  formatCurrency: (v: number) => `R$ ${v}`,
};

beforeEach(() => {
  entitlementMocks.loading = false;
  entitlementMocks.allowedKeys = new Set<string>();
});

describe('CockpitAnalytics — gate do gráfico de evolução (E7-04)', () => {
  // O gráfico de evolução é o <svg viewBox="0 0 1000 500"> (recharts abaixo
  // renderiza seus próprios svgs — fora do gate e fora deste teste).
  const evolutionChart = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('svg')).find(
      (s) => s.getAttribute('viewBox') === '0 0 1000 500'
    ) ?? null;

  it('free vê o upsell e NÃO vê o gráfico', () => {
    const { container } = render(<CockpitAnalytics {...baseProps} />);
    expect(screen.getByText('A evolução histórica é exclusiva Pro.')).toBeInTheDocument();
    expect(evolutionChart(container)).not.toBeInTheDocument();
  });

  it('pro vê o gráfico e NÃO vê o upsell', () => {
    entitlementMocks.allowedKeys = new Set(['historical_evolution']);
    const { container } = render(<CockpitAnalytics {...baseProps} />);
    expect(evolutionChart(container)).toBeInTheDocument();
    expect(screen.queryByText('A evolução histórica é exclusiva Pro.')).not.toBeInTheDocument();
  });
});
