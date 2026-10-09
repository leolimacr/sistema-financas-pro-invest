import type { BillingStatus } from '../types/billing';

export interface NormalizedStripeStatus {
  status: BillingStatus;
  providerStatusRaw: string;
}

const STRIPE_STATUS_MAP: Record<string, BillingStatus> = {
  incomplete: 'incomplete',
  incomplete_expired: 'expired',
  trialing: 'trialing',
  active: 'active',
  past_due: 'past_due',
  canceled: 'canceled',
  unpaid: 'expired',
  paused: 'canceled',
};

export function normalizeStripeStatus(stripeStatus: string): NormalizedStripeStatus {
  const status = STRIPE_STATUS_MAP[stripeStatus] ?? 'expired';
  return { status, providerStatusRaw: stripeStatus };
}
