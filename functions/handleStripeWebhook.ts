import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import Stripe from 'stripe';

import { normalizeSubscription, normalizeDeletedSubscription, type NormalizedBillingData } from './src/helpers/normalizeSubscription';
import { computeEntitlements } from './src/helpers/computeEntitlements';
import { getStripe } from './src/lib/getStripe';
import { STRIPE_WEBHOOK_SECRET as STRIPE_WEBHOOK_SECRET_SECRET, STRIPE_SECRET_KEY } from './secrets';

const db = getFirestore();

/* ───────── Idempotency ───────── */

async function isEventProcessed(eventId: string): Promise<boolean> {
  const doc = await db.collection('_stripeEvents').doc(eventId).get();
  return doc.exists;
}

async function markEventProcessed(eventId: string, eventType: string, userId: string): Promise<void> {
  await db.collection('_stripeEvents').doc(eventId).set({
    processedAt: Timestamp.now(),
    type: eventType,
    userId,
  });
}

/* ───────── User resolution ───────── */

async function resolveUserIdFromCustomer(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): Promise<string | null> {
  if (!customer) return null;
  const customerId = typeof customer === 'string' ? customer : customer.id;
  try {
    const c = await getStripe().customers.retrieve(customerId);
    return c.deleted ? null : (c as Stripe.Customer).metadata?.userId ?? null;
  } catch {
    return null;
  }
}

/* ───────── Write helpers ───────── */

function getLegacyPlanId(tier: string, billingCycle: string | null): string {
  if (tier === 'free') return 'free';
  if (tier === 'pro') return 'pro_monthly';
  if (billingCycle === 'annual') return 'premium_annual';
  return 'premium_monthly';
}

async function writeBillingAndLegacy(
  userId: string,
  billingData: NormalizedBillingData,
  legacyPlanId: string,
): Promise<void> {
  const userRef = db.collection('users').doc(userId);
  const batch = db.batch();

  const entitlements = computeEntitlements(billingData.tier, billingData.status);

  batch.set(userRef.collection('billing').doc('main'), {
    ...billingData,
    entitlements,
  }, { merge: true });

  const legacyStatus: 'active' | 'canceled' | 'past_due' | 'trialing' =
    billingData.status === 'trialing' ? 'trialing' :
    billingData.status === 'past_due' ? 'past_due' :
    billingData.status === 'canceled' ? 'canceled' : 'active';

  batch.set(userRef, {
    plan: billingData.tier,
    subscription: {
      status: legacyStatus,
      planId: legacyPlanId,
      currentPeriodEnd: billingData.currentPeriodEnd,
    },
  }, { merge: true });

  await batch.commit();
}

/* ───────── Event handlers ───────── */

async function handleSubscriptionLifecycle(
  subscription: Stripe.Subscription,
  eventId: string,
  eventType: string,
): Promise<void> {
  let userId: string | null = subscription.metadata?.userId ?? null;
  if (!userId) {
    userId = await resolveUserIdFromCustomer(subscription.customer);
  }
  if (!userId) return;

  const billingData = normalizeSubscription(subscription, userId);
  const legacyPlanId = getLegacyPlanId(billingData.tier, billingData.billingCycle);
  await writeBillingAndLegacy(userId, billingData, legacyPlanId);
  await markEventProcessed(eventId, eventType, userId);
}

async function handleDeleted(
  subscription: Stripe.Subscription,
  eventId: string,
): Promise<void> {
  let userId: string | null = subscription.metadata?.userId ?? null;
  if (!userId) {
    userId = await resolveUserIdFromCustomer(subscription.customer);
  }
  if (!userId) return;

  const billingData = normalizeDeletedSubscription(subscription);
  const userRef = db.collection('users').doc(userId);
  const batch = db.batch();

  batch.set(userRef.collection('billing').doc('main'), {
    ...billingData,
    entitlements: computeEntitlements(billingData.tier, billingData.status),
  }, { merge: true });

  const legacyPlanId = getLegacyPlanId(billingData.tier, billingData.billingCycle);

  batch.set(userRef, {
    subscription: {
      status: 'canceled',
      planId: legacyPlanId,
      currentPeriodEnd: billingData.currentPeriodEnd,
    },
  }, { merge: true });

  await batch.commit();
  await markEventProcessed(eventId, 'customer.subscription.deleted', userId);
}

async function handleInvoiceEvent(
  invoice: Stripe.Invoice,
  eventType: string,
  eventId: string,
): Promise<void> {
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return;

  const subscriptionId = typeof sub === 'string' ? sub : sub.id;

  let userId = typeof sub !== 'string' ? sub.metadata?.userId ?? null : null;
  if (!userId) {
    try {
      const fullSub = await getStripe().subscriptions.retrieve(subscriptionId);
      userId = fullSub.metadata?.userId ?? await resolveUserIdFromCustomer(fullSub.customer);
    } catch {
      return;
    }
  }
  if (!userId) return;

  const userRef = db.collection('users').doc(userId);
  const billingRef = userRef.collection('billing').doc('main');

  const status = eventType === 'invoice.paid' ? 'active' : 'past_due';

  await billingRef.set({
    status,
    providerStatusRaw: status,
    updatedAt: Timestamp.now(),
  }, { merge: true });

  await markEventProcessed(eventId, eventType, userId);
}

/* ───────── Exported endpoint ───────── */

export const handleStripeWebhook = onRequest(
  { secrets: [STRIPE_WEBHOOK_SECRET_SECRET, STRIPE_SECRET_KEY] },
  async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  if (!sig) {
    res.status(400).send('Missing stripe-signature header');
    return;
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature';
    logger.error(`Stripe webhook signature verification failed: ${message}`);
    res.status(401).send({ error: message });
    return;
  }

  if (await isEventProcessed(event.id)) {
    res.status(200).json({ received: true, idempotent: true });
    return;
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionLifecycle(
          event.data.object as Stripe.Subscription,
          event.id,
          event.type,
        );
        break;

      case 'customer.subscription.deleted':
        await handleDeleted(
          event.data.object as Stripe.Subscription,
          event.id,
        );
        break;

      case 'invoice.paid':
      case 'invoice.payment_failed':
        await handleInvoiceEvent(
          event.data.object as Stripe.Invoice,
          event.type,
          event.id,
        );
        break;

      default:
        logger.info(`Unhandled Stripe event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error(`Error processing webhook event ${event.id}: ${message}`);
    res.status(500).json({ error: message });
  }
});
