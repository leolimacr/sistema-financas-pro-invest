import { describe, it, expect } from 'vitest';
import {
  resolveLegacyPlanId,
  getEffectiveTier,
  hasFeature,
  FEATURE_DEFINITIONS,
} from '../featureAccessMatrix';

/** Etapa 7 — E7-06: legado plan/subscription tipado e mapeado. */
describe('resolveLegacyPlanId (E7-06)', () => {
  it('mapeia ids conhecidos', () => {
    expect(resolveLegacyPlanId('free')).toEqual({ tier: 'free', billingCycle: null });
    expect(resolveLegacyPlanId('pro')).toEqual({ tier: 'pro', billingCycle: 'monthly' });
    expect(resolveLegacyPlanId('pro_monthly')).toEqual({ tier: 'pro', billingCycle: 'monthly' });
    expect(resolveLegacyPlanId('premium')).toEqual({ tier: 'premium', billingCycle: 'monthly' });
    expect(resolveLegacyPlanId('premium_monthly')).toEqual({ tier: 'premium', billingCycle: 'monthly' });
    expect(resolveLegacyPlanId('premium_annual')).toEqual({ tier: 'premium', billingCycle: 'annual' });
    expect(resolveLegacyPlanId('premium_anual')).toEqual({ tier: 'premium', billingCycle: 'annual' });
  });

  it('cai para prefixo pro|premium, senão null', () => {
    expect(resolveLegacyPlanId('pro_custom')).toEqual({ tier: 'pro', billingCycle: 'monthly' });
    expect(resolveLegacyPlanId('premium_x')).toEqual({ tier: 'premium', billingCycle: 'monthly' });
    expect(resolveLegacyPlanId('enterprise')).toBeNull();
    expect(resolveLegacyPlanId('')).toBeNull();
  });
});

describe('getEffectiveTier / hasFeature (E7-06)', () => {
  it('expired/incomplete/null degradam para free', () => {
    expect(getEffectiveTier('premium', 'expired')).toBe('free');
    expect(getEffectiveTier('premium', 'incomplete')).toBe('free');
    expect(getEffectiveTier('premium', null)).toBe('free');
  });

  it('cancelado mantém acesso até o scheduler expirar (currentPeriodEnd)', () => {
    expect(getEffectiveTier('premium', 'canceled')).toBe('premium');
    expect(getEffectiveTier('pro', 'past_due')).toBe('pro');
  });

  it('hierarquia free < pro < premium', () => {
    expect(hasFeature('free', 'active', 'controla')).toBe(true);
    expect(hasFeature('free', 'active', 'debts')).toBe(false);
    expect(hasFeature('pro', 'active', 'transaction_history')).toBe(true);
    expect(hasFeature('pro', 'active', 'debts')).toBe(false);
    expect(hasFeature('premium', 'active', 'debts')).toBe(true);
    expect(hasFeature('premium', 'expired', 'debts')).toBe(false);
  });

  it('historical_evolution é pro (E7-04/E7-05)', () => {
    expect(FEATURE_DEFINITIONS.historical_evolution.tier).toBe('pro');
    expect(hasFeature('pro', 'active', 'historical_evolution')).toBe(true);
    expect(hasFeature('free', 'active', 'historical_evolution')).toBe(false);
  });
});
