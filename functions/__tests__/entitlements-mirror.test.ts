/**
 * Etapa 7 — E7-05: espelho frontend ↔ backend de entitlements.
 * `billing/main.entitlements` (gravado pelo webhook via computeEntitlements)
 * deve conter exatamente as mesmas keys/tiers de
 * src/config/featureAccessMatrix.ts (lido pelo app via hasFeature).
 */
import { describe, it, expect } from 'vitest';
import {
  computeEntitlements,
  getEffectiveTier as backendEffectiveTier,
} from '../src/helpers/computeEntitlements';
import {
  FEATURE_DEFINITIONS,
  getEffectiveTier as frontendEffectiveTier,
  getEntitlements as frontendEntitlements,
} from '../../src/config/featureAccessMatrix';

describe('entitlements mirror frontend↔backend (E7-05)', () => {
  it('mesmo conjunto de keys', () => {
    const backendKeys = computeEntitlements('premium', 'active').sort();
    const frontendKeys = (Object.keys(FEATURE_DEFINITIONS) as string[]).sort();
    expect(backendKeys).toEqual(frontendKeys);
  });

  it('mesmo tier por key (free/pro/premium)', () => {
    const backendFor = (key: string) => {
      if (computeEntitlements('premium', 'active').includes(key)) {
        if (!computeEntitlements('pro', 'active').includes(key)) return 'premium';
        if (!computeEntitlements('free', 'active').includes(key)) return 'pro';
        return 'free';
      }
      return 'none';
    };
    for (const [key, def] of Object.entries(FEATURE_DEFINITIONS)) {
      expect(backendFor(key), `tier de ${key}`).toBe(def.tier);
    }
  });

  it('mesmo effectiveTier por status', () => {
    const statuses = ['trialing', 'active', 'past_due', 'canceled', 'expired', 'incomplete', null] as const;
    for (const tier of ['free', 'pro', 'premium'] as const) {
      for (const status of statuses) {
        expect(backendEffectiveTier(tier, status), `${tier}/${status}`).toBe(
          frontendEffectiveTier(tier, status)
        );
      }
    }
    expect(frontendEntitlements('premium', 'active').sort()).toEqual(
      computeEntitlements('premium', 'active').sort()
    );
  });
});
