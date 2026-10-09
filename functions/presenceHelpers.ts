import { getFirestore } from 'firebase-admin/firestore';

export const URGENCY_SCORE: Record<string, number> = { high: 3, medium: 2, low: 1 };

export async function cooldownOk(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  eventType: string,
  resourceId: string | null,
  cooldownHours: number,
  nowMs: number,
): Promise<boolean> {
  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  const histRef = db.collection('users').doc(uid).collection('notificationHistory');
  const q = resourceId
    ? histRef.where('eventType', '==', eventType).where('resourceId', '==', resourceId).orderBy('sentAt', 'desc').limit(1)
    : histRef.where('eventType', '==', eventType).orderBy('sentAt', 'desc').limit(1);
  const snap = await q.get();
  if (snap.empty) return true;
  const lastSent = snap.docs[0].data().sentAt?.toMillis?.() ?? 0;
  return nowMs - lastSent >= cooldownMs;
}

export async function pendingExists(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  eventType: string,
  resourceId: string | null,
): Promise<boolean> {
  let q = db.collection('users').doc(uid).collection('presenceEvents')
    .where('eventType', '==', eventType)
    .where('status', '==', 'pending') as FirebaseFirestore.Query;
  if (resourceId) q = q.where('resourceId', '==', resourceId);
  const snap = await q.limit(1).get();
  return !snap.empty;
}

export interface CreateEventParams {
  eventType: string;
  persona: 'debts' | 'wealth' | 'cashflow';
  urgency: 'high' | 'medium' | 'low';
  message: { title: string; body: string; ctaLabel: string };
  deepLink: string;
  channel: 'push' | 'in_app' | 'email';
  cooldownHours: number;
  expiresInHours: number;
  resourceId?: string;
  payload?: Record<string, unknown>;
}

export async function createEvent(
  db: ReturnType<typeof getFirestore>,
  uid: string,
  nowMs: number,
  params: CreateEventParams,
): Promise<void> {
  const { eventType, persona, urgency, message, deepLink, channel,
    cooldownHours, expiresInHours, resourceId, payload } = params;
  const resourceIdResolved = resourceId ?? null;

  if (await pendingExists(db, uid, eventType, resourceIdResolved)) return;
  if (!(await cooldownOk(db, uid, eventType, resourceIdResolved, cooldownHours, nowMs))) return;

  const expiresAt = new Date(nowMs + expiresInHours * 60 * 60 * 1000);
  const batch = db.batch();

  const eventRef = db.collection('users').doc(uid).collection('presenceEvents').doc();
  batch.set(eventRef, {
    eventType, persona, urgency,
    urgencyScore: URGENCY_SCORE[urgency],
    status: 'pending', channel, message, deepLink,
    payload: payload ?? {}, resourceId: resourceIdResolved,
    createdAt: new Date(), expiresAt, seenAt: null, actionedAt: null,
  });

  const histRef = db.collection('users').doc(uid).collection('notificationHistory').doc();
  batch.set(histRef, {
    eventType, channel, sentAt: new Date(),
    resourceId: resourceIdResolved, opened: false, actioned: false,
  });

  await batch.commit();
}
