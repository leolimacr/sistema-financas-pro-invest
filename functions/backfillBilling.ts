import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

const BATCH_SIZE = 500;

const LEGACY_PLAN_TABLE: Record<string, { tier: 'free' | 'pro' | 'premium'; billingCycle: 'monthly' | 'annual' | null }> = {
  free:             { tier: 'free',    billingCycle: null },
  pro:              { tier: 'pro',     billingCycle: 'monthly' },
  pro_monthly:      { tier: 'pro',     billingCycle: 'monthly' },
  premium:          { tier: 'premium', billingCycle: 'monthly' },
  premium_monthly:  { tier: 'premium', billingCycle: 'monthly' },
  premium_annual:   { tier: 'premium', billingCycle: 'annual' },
  premium_anual:    { tier: 'premium', billingCycle: 'annual' },
};

interface BlockedUser {
  uid: string;
  planId: string | undefined;
  legacyPlan: string | undefined;
  subActive: boolean;
}

function resolveLegacyPlan(
  planId: string | undefined,
  subActive: boolean,
): { tier: 'free' | 'pro' | 'premium'; billingCycle: 'monthly' | 'annual' | null } | 'block' {
  if (!planId || planId === 'free' || !subActive) {
    return { tier: 'free', billingCycle: null };
  }

  const mapped = LEGACY_PLAN_TABLE[planId];
  if (mapped) return mapped;

  const match = planId.match(/^(pro|premium)/);
  if (match) {
    const tier = match[1] as 'pro' | 'premium';
    return { tier, billingCycle: 'monthly' };
  }

  return 'block';
}

function resolveBillingStatus(
  subStatus: string | undefined,
  subActive: boolean,
): string {
  if (subStatus === 'trialing') return 'trialing';
  if (subStatus === 'canceled') return 'canceled';
  if (subStatus === 'past_due') return 'past_due';
  return subActive ? 'active' : 'expired';
}

async function backfill(): Promise<void> {
  console.log('Starting backfill of billing.* from legacy subscription.*');
  console.log(`Batch size: ${BATCH_SIZE}`);

  let scanned = 0;
  let withSubscription = 0;
  let written = 0;
  let skippedWebhook = 0;
  let blocked = 0;
  let errors = 0;
  const blockedUsers: BlockedUser[] = [];

  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    let query = db.collection('users')
      .orderBy('__name__')
      .limit(BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const usersSnapshot = await query.get();

    if (usersSnapshot.empty) {
      hasMore = false;
      break;
    }

    for (const userDoc of usersSnapshot.docs) {
      scanned++;
      const userId = userDoc.id;
      const data = userDoc.data();
      const sub = data.subscription;

      if (!sub) {
        continue;
      }

      withSubscription++;

      const planId: string | undefined = sub.planId;
      const legacyPlan: string | undefined = data.plan as string | undefined;
      const subStatus: string | undefined = sub.status;
      const currentPeriodEnd = sub.currentPeriodEnd ?? null;
      const subActive = subStatus === 'active' || subStatus === 'trialing';

      // Fallback: subscription.planId nunca era escrito pelo webhook antigo
      // (handleCheckoutCompleted em functions/lib/index.js), que escrevia
      // apenas plan (top-level) e subscription.status.
      const resolved = resolveLegacyPlan(planId ?? legacyPlan, subActive);
      if (resolved === 'block') {
        blockedUsers.push({ uid: userId, planId, legacyPlan, subActive });
        blocked++;
        continue;
      }

      const billingMainRef = db.collection('users').doc(userId).collection('billing').doc('main');
      const billingMainSnap = await billingMainRef.get();

      if (billingMainSnap.exists) {
        const existingProvider = billingMainSnap.data()?.provider;
        if (existingProvider != null) {
          skippedWebhook++;
          continue;
        }
      }

      const { tier, billingCycle } = resolved;
      const billingStatus = resolveBillingStatus(subStatus, subActive);

      try {
        const now = Timestamp.now();
        await billingMainRef.set({
          tier,
          status: billingStatus,
          billingCycle,
          currentPeriodEnd: currentPeriodEnd ?? null,
          trialEnd: null,
          canceledAt: null,
          provider: null,
          providerCustomerId: null,
          providerSubscriptionId: null,
          providerPriceId: null,
          providerStatusRaw: null,
          updatedAt: now,
        });

        written++;
      } catch (err) {
        console.error(`Error updating user ${userId}:`, err);
        errors++;
      }
    }

    lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];
    console.log(
      `Progress: scanned=${scanned} withSub=${withSubscription} written=${written} skipped_webhook=${skippedWebhook} blocked=${blocked} errors=${errors}`,
    );
  }

  console.log('');
  console.log('=== BACKFILL REPORT ===');
  console.log(`Total scanned:         ${scanned}`);
  console.log(`With subscription:     ${withSubscription}`);
  console.log(`Written:               ${written}`);
  console.log(`Skipped (webhook):     ${skippedWebhook}`);
  console.log(`Blocked:               ${blocked}`);
  console.log(`Errors:                ${errors}`);

  if (blockedUsers.length > 0) {
    console.log('');
    console.log('BLOCKED USERS:');
    for (const bu of blockedUsers) {
      console.log(`  UID: ${bu.uid}  —  planId="${bu.planId ?? '(none)'}"  —  legacyPlan="${bu.legacyPlan ?? '(none)'}"  —  active=${bu.subActive}`);
    }
  }

  console.log('');
  if (errors > 0) {
    console.warn('WARNING: Backfill completed with errors. Review logs above.');
  } else if (blocked > 0) {
    console.log('INFO: Backfill completed with blocked users. See BLOCKED USERS above.');
  } else {
    console.log('SUCCESS: Backfill completed with no errors and no blocked users.');
  }
}

backfill().then(() => process.exit(0)).catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
