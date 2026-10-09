export type EffectiveTier = 'free' | 'pro' | 'premium';
export declare function getEffectiveTier(tier: EffectiveTier, status: string | null): EffectiveTier;
export declare function computeEntitlements(tier: EffectiveTier, status: string | null): string[];
export declare function getUsageLimit(tier: EffectiveTier, status: string | null, key: string): number | null;
