import { Timestamp } from 'firebase-admin/firestore';
import type Stripe from 'stripe';
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
export declare function normalizeSubscription(subscription: Stripe.Subscription, _userId: string): NormalizedBillingData;
export declare function normalizeDeletedSubscription(subscription: Stripe.Subscription): NormalizedBillingData;
