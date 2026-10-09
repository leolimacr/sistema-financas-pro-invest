export type PlanId = 'pro_monthly' | 'premium_monthly' | 'premium_annual';

export const PLAN_IDS: PlanId[] = ['pro_monthly', 'premium_monthly', 'premium_annual'];

export interface PriceMapping {
  tier: 'free' | 'pro' | 'premium';
  billingCycle: 'monthly' | 'annual';
}

const PRICE_IDS: Record<PlanId, { test: string; prod: string }> = {
  pro_monthly:      { test: 'price_pro_test',            prod: 'price_pro_prod' },
  premium_monthly:  { test: 'price_premium_test',        prod: 'price_premium_prod' },
  premium_annual:   { test: 'price_premium_annual_test', prod: 'price_premium_annual_prod' },
};

const PRICE_MAP_TEST: Record<string, PriceMapping> = {
  price_pro_test:            { tier: 'pro',     billingCycle: 'monthly' },
  price_premium_test:        { tier: 'premium', billingCycle: 'monthly' },
  price_premium_annual_test: { tier: 'premium', billingCycle: 'annual' },
};

const PRICE_MAP_PROD: Record<string, PriceMapping> = {
  price_pro_prod:            { tier: 'pro',     billingCycle: 'monthly' },
  price_premium_prod:        { tier: 'premium', billingCycle: 'monthly' },
  price_premium_annual_prod: { tier: 'premium', billingCycle: 'annual' },
};

export function resolvePriceId(planId: PlanId, isProd: boolean): string {
  return isProd ? PRICE_IDS[planId].prod : PRICE_IDS[planId].test;
}

export function resolvePlanId(priceId: string): PlanId | null {
  for (const [planId, ids] of Object.entries(PRICE_IDS)) {
    if (priceId === ids.test || priceId === ids.prod) return planId as PlanId;
  }
  return null;
}

export function resolvePriceMapping(priceId: string): PriceMapping | null {
  return PRICE_MAP_TEST[priceId] ?? PRICE_MAP_PROD[priceId] ?? null;
}

export function determineBillingCycle(priceId: string): 'monthly' | 'annual' {
  const mapping = resolvePriceMapping(priceId);
  return mapping?.billingCycle ?? 'monthly';
}
