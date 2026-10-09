import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { resolvePriceId, resolvePriceMapping, PLAN_IDS, type PlanId } from './src/config/prices';
import { getStripe } from './src/lib/getStripe';
import { STRIPE_SECRET_KEY } from './secrets';

const db = getFirestore();

async function getOrCreateCustomer(uid: string, email: string | null): Promise<string> {
  const snapshot = await db.collection('stripeCustomers')
    .where('uid', '==', uid)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  const customer = await getStripe().customers.create({
    email: email ?? undefined,
    metadata: { userId: uid },
  });

  await db.collection('stripeCustomers').doc(customer.id).set({
    uid,
    email: email ?? null,
    createdAt: new Date().toISOString(),
  });

  return customer.id;
}

export const createCheckoutSession = onCall(
  {
    secrets: [STRIPE_SECRET_KEY],
  },
  async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  const uid = auth.uid;

  const { planId, successUrl, cancelUrl } = request.data as {
    planId?: string;
    successUrl?: string;
    cancelUrl?: string;
  };

  if (!planId || !(PLAN_IDS as readonly string[]).includes(planId)) {
    throw new HttpsError('invalid-argument', `Invalid planId. Must be one of: ${PLAN_IDS.join(', ')}`);
  }

  if (!successUrl || !cancelUrl) {
    throw new HttpsError('invalid-argument', 'successUrl and cancelUrl are required');
  }

  const email = auth.token?.email ?? null;
  const customerId = await getOrCreateCustomer(uid, email);

  const isProd = process.env.NODE_ENV === 'production'
    || process.env.FUNCTIONS_EMULATOR === undefined;
  const priceId = resolvePriceId(planId as PlanId, isProd);
  const mapping = resolvePriceMapping(priceId);

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      client_reference_id: uid,
      subscription_data: {
        metadata: {
          userId: uid,
          tier: mapping?.tier ?? 'pro',
          billingCycle: mapping?.billingCycle ?? 'monthly',
        },
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    logger.info(`Checkout session created for user ${uid}: ${session.id}`);

    return { sessionUrl: session.url, sessionId: session.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create checkout session';
    logger.error(`Error creating checkout for user ${uid}: ${message}`);
    throw new HttpsError('internal', message);
  }
});
