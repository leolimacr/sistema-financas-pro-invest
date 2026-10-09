import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const MAX_BATCH_SIZE = 500;

export const expireCanceledSubscriptions = onSchedule('every 6 hours', async () => {
  const db = getFirestore();
  const now = Timestamp.now();
  let totalExpired = 0;

  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    let query = db.collectionGroup('billing')
      .where('status', '==', 'canceled')
      .where('currentPeriodEnd', '<', now)
      .orderBy('currentPeriodEnd')
      .limit(MAX_BATCH_SIZE);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) break;

    const batch = db.batch();
    let batchCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.tier === 'free') return;
      if (!data.currentPeriodEnd) return;

      batch.update(doc.ref, {
        status: 'expired',
        updatedAt: now,
      });
      batchCount++;
      totalExpired++;
    });

    if (batchCount > 0) {
      await batch.commit();
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    hasMore = snapshot.docs.length >= MAX_BATCH_SIZE;
  }

  if (totalExpired > 0) {
    logger.info(`Scheduler: expired ${totalExpired} canceled subscriptions`);
  }
});
