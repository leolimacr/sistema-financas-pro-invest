import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureGate } from '../FeatureGate';
import type { EntitlementKey } from '../../config/featureAccessMatrix';

const entitlementMocks = vi.hoisted(() => ({
  loading: true,
  allowedKeys: new Set<string>(),
}));

vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({
    loading: entitlementMocks.loading,
    effectiveTier: 'free',
    hasFeature: (key: EntitlementKey) => entitlementMocks.allowedKeys.has(key),
  }),
}));

beforeEach(() => {
  entitlementMocks.loading = true;
  entitlementMocks.allowedKeys = new Set<string>();
});

describe('FeatureGate (Etapa 7 — E7-03)', () => {
  it('durante loading renderiza null (nunca o fallback comercial)', () => {
    entitlementMocks.loading = true;
    const { container } = render(
      <FeatureGate featureKey="debts" fallback={<span>COMPRE</span>}>
        <span>CONTEUDO</span>
      </FeatureGate>
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('COMPRE')).not.toBeInTheDocument();
  });

  it('sem acesso renderiza o fallback', () => {
    entitlementMocks.loading = false;
    render(
      <FeatureGate featureKey="debts" fallback={<span>COMPRE</span>}>
        <span>CONTEUDO</span>
      </FeatureGate>
    );
    expect(screen.getByText('COMPRE')).toBeInTheDocument();
    expect(screen.queryByText('CONTEUDO')).not.toBeInTheDocument();
  });

  it('com acesso renderiza os filhos', () => {
    entitlementMocks.loading = false;
    entitlementMocks.allowedKeys = new Set(['debts']);
    render(
      <FeatureGate featureKey="debts" fallback={<span>COMPRE</span>}>
        <span>CONTEUDO</span>
      </FeatureGate>
    );
    expect(screen.getByText('CONTEUDO')).toBeInTheDocument();
  });
});
