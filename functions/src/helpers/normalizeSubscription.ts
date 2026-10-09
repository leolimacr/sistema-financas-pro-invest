import { Timestamp } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
import { resolvePriceMapping, type PriceMapping } from '../config/prices';

const STRIPE_STATUS_MAP: Record<string, 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'incomplete'> = {
  incomplete: 'incomplete',
  incomplete_expired: 'expired',
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'expired',
  paused: 'canceled',
};

export interface NormalizedBillingData {
  tier: 'free' | 'pro' | 'premium';
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'incomplete' | null;
  billingCycle: 'monthly' | 'annual' | null;
  currentPeriodStart: Timestamp | null;
  currentPeriodEnd: Timestamp | null;
  trialEnd: Timestamp | null;
  canceledAt: Timestamp | null;
  provider: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerPriceId: string | null;
  providerStatusRaw: string | null;
  updatedAt: Timestamp;
}

export function normalizeSubscription(
  subscription: Stripe.Subscription,
  _userId: string,
): NormalizedBillingData {
  const now = Timestamp.now();
  const rawStatus = subscription.status ?? null;
  const normalizedStatus = rawStatus ? (STRIPE_STATUS_MAP[rawStatus] ?? null) : null;

  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const priceMapping: PriceMapping | null = priceId ? resolvePriceMapping(priceId) : null;

  const itemsData = subscription.items?.data?.[0];

  let currentPeriodStart: Timestamp | null = null;
  let currentPeriodEnd: Timestamp | null = null;
  if (itemsData?.current_period_start) {
    currentPeriodStart = Timestamp.fromMillis(itemsData.current_period_start * 1000);
  }
  if (itemsData?.current_period_end) {
    currentPeriodEnd = Timestamp.fromMillis(itemsData.current_period_end * 1000);
  }

  let trialEnd: Timestamp | null = null;
  if (subscription.trial_end) {
    trialEnd = Timestamp.fromMillis(subscription.trial_end * 1000);
  }

  let canceledAt: Timestamp | null = null;
  if (subscription.canceled_at) {
    canceledAt = Timestamp.fromMillis(subscription.canceled_at * 1000);
  } else if (subscription.cancel_at_period_end && currentPeriodEnd) {
    canceledAt = currentPeriodEnd;
  }

  const metadataTier = subscription.metadata?.tier;
  const metadataCycle = subscription.metadata?.billingCycle;

  const tier: 'free' | 'pro' | 'premium' =
    (metadataTier as 'pro' | 'premium' | undefined) ?? priceMapping?.tier ?? 'free';

  const billingCycle: 'monthly' | 'annual' | null =
    (metadataCycle as 'monthly' | 'annual' | undefined) ?? priceMapping?.billingCycle ?? null;

  return {
    tier,
    status: normalizedStatus,
    billingCycle,
    currentPeriodStart,
    currentPeriodEnd,
    trialEnd,
    canceledAt,
    provider: 'stripe',
    providerCustomerId: (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id) ?? null,
    providerSubscriptionId: subscription.id,
    providerPriceId: priceId,
    providerStatusRaw: rawStatus,
    updatedAt: now,
  };
}

export function normalizeDeletedSubscription(
  subscription: Stripe.Subscription,
): NormalizedBillingData {
  const now = Timestamp.now();
  const rawStatus = subscription.status ?? null;

  const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
  const priceMapping: PriceMapping | null = priceId ? resolvePriceMapping(priceId) : null;
  const itemsData = subscription.items?.data?.[0];

  let currentPeriodEnd: Timestamp | null = null;
  if (itemsData?.current_period_end) {
    currentPeriodEnd = Timestamp.fromMillis(itemsData.current_period_end * 1000);
  }

  const metadataTier = subscription.metadata?.tier;
  const metadataCycle = subscription.metadata?.billingCycle;

  const tier: 'free' | 'pro' | 'premium' =
    (metadataTier as 'pro' | 'premium' | undefined) ?? priceMapping?.tier ?? 'free';

  const billingCycle: 'monthly' | 'annual' | null =
    (metadataCycle as 'monthly' | 'annual' | undefined) ?? priceMapping?.billingCycle ?? null;

  return {
    tier,
    status: 'canceled',
    billingCycle,
    currentPeriodStart: null,
    currentPeriodEnd,
    trialEnd: null,
    canceledAt: now,
    provider: 'stripe',
    providerCustomerId: (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id) ?? null,
    providerSubscriptionId: subscription.id,
    providerPriceId: priceId,
    providerStatusRaw: rawStatus,
    updatedAt: now,
  };
}
