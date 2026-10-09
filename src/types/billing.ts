import type { Timestamp } from 'firebase/firestore';
import type { EntitlementKey } from '../config/featureAccessMatrix';

export type BillingTier = 'free' | 'pro' | 'premium';

export type BillingStatus =
  | null
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'
  | 'incomplete'
  | 'revoked';

export type BillingCycle = 'monthly' | 'annual' | null;

export type EffectiveTier = 'free' | 'pro' | 'premium';

export interface BillingDoc {
  tier: BillingTier;
  status: BillingStatus;
  billingCycle: BillingCycle;
  currentPeriodStart?: Timestamp;
  currentPeriodEnd?: Timestamp;
  trialEnd?: Timestamp | null;
  canceledAt?: Timestamp | null;
  revokedAt?: Timestamp | null;
  revocationReason?: string | null;
  entitlements?: EntitlementKey[];
  provider?: string | null;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  providerPriceId?: string | null;
  providerStatusRaw?: string | null;
  updatedAt: Timestamp;
}

export interface BillingUsageDoc {
  count: number;
  date: string;
  updatedAt: Timestamp;
}
