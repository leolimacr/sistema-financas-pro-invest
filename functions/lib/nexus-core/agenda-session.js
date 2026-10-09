"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SESSION_TTL_MS = void 0;
exports.readSessionContext = readSessionContext;
exports.writeSessionContext = writeSessionContext;
const nexusAgendaCommit_1 = require("../nexusAgendaCommit");
exports.SESSION_TTL_MS = 10 * 60 * 1000;
async function readSessionContext(db, uid, sessionId) {
    const ref = db.collection(`users/${uid}/agenda/_nexus/sessions`).doc(sessionId);
    const snapshot = await ref.get();
    if (!snapshot.exists)
        return null;
    const data = snapshot.data();
    if (!data)
        return null;
    const createdAtMs = Number(data.createdAtMs ?? 0);
    const expiresAtMs = Number(data.expiresAtMs ?? (createdAtMs ? createdAtMs + exports.SESSION_TTL_MS : 0));
    if (!createdAtMs || !expiresAtMs || Date.now() > expiresAtMs) {
        await ref.delete().catch(() => undefined);
        return null;
    }
    return data;
}
async function writeSessionContext(db, context) {
    const payload = {
        ...context,
        expiresAtMs: Date.now() + exports.SESSION_TTL_MS,
    };
    await db.collection(`users/${context.uid}/agenda/_nexus/sessions`).doc(context.sessionId).set((0, nexusAgendaCommit_1.sanitizeForFirestore)(payload));
}
//# sourceMappingURL=agenda-session.js.map