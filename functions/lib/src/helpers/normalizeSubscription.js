"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeSubscription = normalizeSubscription;
exports.normalizeDeletedSubscription = normalizeDeletedSubscription;
const firestore_1 = require("firebase-admin/firestore");
const prices_1 = require("../config/prices");
const STRIPE_STATUS_MAP = {
    incomplete: 'incomplete',
    incomplete_expired: 'expired',
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'expired',
    paused: 'canceled',
};
function normalizeSubscription(subscription, _userId) {
    const now = firestore_1.Timestamp.now();
    const rawStatus = subscription.status ?? null;
    const normalizedStatus = rawStatus ? (STRIPE_STATUS_MAP[rawStatus] ?? null) : null;
    const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
    const priceMapping = priceId ? (0, prices_1.resolvePriceMapping)(priceId) : null;
    const itemsData = subscription.items?.data?.[0];
    let currentPeriodStart = null;
    let currentPeriodEnd = null;
    if (itemsData?.current_period_start) {
        currentPeriodStart = firestore_1.Timestamp.fromMillis(itemsData.current_period_start * 1000);
    }
    if (itemsData?.current_period_end) {
        currentPeriodEnd = firestore_1.Timestamp.fromMillis(itemsData.current_period_end * 1000);
    }
    let trialEnd = null;
    if (subscription.trial_end) {
        trialEnd = firestore_1.Timestamp.fromMillis(subscription.trial_end * 1000);
    }
    let canceledAt = null;
    if (subscription.canceled_at) {
        canceledAt = firestore_1.Timestamp.fromMillis(subscription.canceled_at * 1000);
    }
    else if (subscription.cancel_at_period_end && currentPeriodEnd) {
        canceledAt = currentPeriodEnd;
    }
    const metadataTier = subscription.metadata?.tier;
    const metadataCycle = subscription.metadata?.billingCycle;
    const tier = metadataTier ?? priceMapping?.tier ?? 'free';
    const billingCycle = metadataCycle ?? priceMapping?.billingCycle ?? null;
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
function normalizeDeletedSubscription(subscription) {
    const now = firestore_1.Timestamp.now();
    const rawStatus = subscription.status ?? null;
    const priceId = subscription.items?.data?.[0]?.price?.id ?? null;
    const priceMapping = priceId ? (0, prices_1.resolvePriceMapping)(priceId) : null;
    const itemsData = subscription.items?.data?.[0];
    let currentPeriodEnd = null;
    if (itemsData?.current_period_end) {
        currentPeriodEnd = firestore_1.Timestamp.fromMillis(itemsData.current_period_end * 1000);
    }
    const metadataTier = subscription.metadata?.tier;
    const metadataCycle = subscription.metadata?.billingCycle;
    const tier = metadataTier ?? priceMapping?.tier ?? 'free';
    const billingCycle = metadataCycle ?? priceMapping?.billingCycle ?? null;
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
//# sourceMappingURL=normalizeSubscription.js.map