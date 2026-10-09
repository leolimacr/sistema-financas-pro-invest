import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore } from 'firebase-admin/firestore';
import { getStripe } from './src/lib/getStripe';
import { STRIPE_SECRET_KEY } from './secrets';

const db = getFirestore();

export const createPortalSession = onCall(
  {
    secrets: [STRIPE_SECRET_KEY],
  },
  async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  const uid = auth.uid;

  const billingRef = db.collection('users').doc(uid).collection('billing').doc('main');
  const billingSnap = await billingRef.get();
  let customerId: string | null = billingSnap.exists
    ? (billingSnap.data()?.providerCustomerId ?? null)
    : null;

  if (!customerId) {
    const snap = await db.collection('stripeCustomers')
      .where('uid', '==', uid)
      .limit(1)
      .get();
    if (!snap.empty) {
      customerId = snap.docs[0].id as string;
    }
  }

  if (!customerId) {
    throw new HttpsError('failed-precondition', 'No subscription found. User has no Stripe customer.');
  }

  const { returnUrl } = request.data as { returnUrl?: string };
  const finalReturnUrl = returnUrl ?? 'https://app.financasproinvest.com.br/app/mais/pricing';

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: finalReturnUrl,
    });

    logger.info(`Portal session created for user ${uid}: ${session.id}`);
    return { url: session.url };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create portal session';
    logger.error(`Error creating portal for user ${uid}: ${message}`);
    throw new HttpsError('internal', message);
  }
});
