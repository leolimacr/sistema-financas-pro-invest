"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.URGENCY_SCORE = void 0;
exports.cooldownOk = cooldownOk;
exports.pendingExists = pendingExists;
exports.createEvent = createEvent;
exports.URGENCY_SCORE = { high: 3, medium: 2, low: 1 };
async function cooldownOk(db, uid, eventType, resourceId, cooldownHours, nowMs) {
    const cooldownMs = cooldownHours * 60 * 60 * 1000;
    const histRef = db.collection('users').doc(uid).collection('notificationHistory');
    const q = resourceId
        ? histRef.where('eventType', '==', eventType).where('resourceId', '==', resourceId).orderBy('sentAt', 'desc').limit(1)
        : histRef.where('eventType', '==', eventType).orderBy('sentAt', 'desc').limit(1);
    const snap = await q.get();
    if (snap.empty)
        return true;
    const lastSent = snap.docs[0].data().sentAt?.toMillis?.() ?? 0;
    return nowMs - lastSent >= cooldownMs;
}
async function pendingExists(db, uid, eventType, resourceId) {
    let q = db.collection('users').doc(uid).collection('presenceEvents')
        .where('eventType', '==', eventType)
        .where('status', '==', 'pending');
    if (resourceId)
        q = q.where('resourceId', '==', resourceId);
    const snap = await q.limit(1).get();
    return !snap.empty;
}
async function createEvent(db, uid, nowMs, params) {
    const { eventType, persona, urgency, message, deepLink, channel, cooldownHours, expiresInHours, resourceId, payload } = params;
    const resourceIdResolved = resourceId ?? null;
    if (await pendingExists(db, uid, eventType, resourceIdResolved))
        return;
    if (!(await cooldownOk(db, uid, eventType, resourceIdResolved, cooldownHours, nowMs)))
        return;
    const expiresAt = new Date(nowMs + expiresInHours * 60 * 60 * 1000);
    const batch = db.batch();
    const eventRef = db.collection('users').doc(uid).collection('presenceEvents').doc();
    batch.set(eventRef, {
        eventType, persona, urgency,
        urgencyScore: exports.URGENCY_SCORE[urgency],
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
//# sourceMappingURL=presenceHelpers.js.map