export type PlanId = 'pro_monthly' | 'premium_monthly' | 'premium_annual';
export declare const PLAN_IDS: PlanId[];
export interface PriceMapping {
    tier: 'free' | 'pro' | 'premium';
    billingCycle: 'monthly' | 'annual';
}
export declare function resolvePriceId(planId: PlanId, isProd: boolean): string;
export declare function resolvePlanId(priceId: string): PlanId | null;
export declare function resolvePriceMapping(priceId: string): PriceMapping | null;
export declare function determineBillingCycle(priceId: string): 'monthly' | 'annual';
