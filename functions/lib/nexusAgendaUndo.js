"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nexusAgendaUndo = exports.UNDO_BATCH_SIZE = exports.UNDO_TTL_MS = void 0;
exports.requireUndoAuth = requireUndoAuth;
exports.executeAgendaUndo = executeAgendaUndo;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const node_crypto_1 = require("node:crypto");
const nexusAgendaCommit_1 = require("./nexusAgendaCommit");
exports.UNDO_TTL_MS = 60 * 1000;
exports.UNDO_BATCH_SIZE = 400;
function requireUndoAuth(request) {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Login necessário para desfazer a operação.');
    return uid;
}
function millis(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (value && typeof value.toMillis === 'function') {
        return value.toMillis();
    }
    return undefined;
}
function auditIds(audit) {
    if (!Array.isArray(audit.idsCreated))
        return [];
    return audit.idsCreated.filter((id) => typeof id === 'string' && id.length > 0);
}
async function executeAgendaUndo(uid, request, dependencies, now = Date.now()) {
    if (!request.actionId || typeof request.actionId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'actionId é obrigatório.');
    }
    const undoId = `undo_${(0, node_crypto_1.randomUUID)()}`;
    const claimed = await dependencies.claimAudit(uid, request.actionId, now, undoId);
    if (claimed.kind === 'idempotent')
        return claimed.result;
    if (claimed.kind === 'rejected')
        throw new https_1.HttpsError('failed-precondition', claimed.reason);
    const audit = claimed.audit;
    const token = typeof audit.token === 'string' ? audit.token : '';
    const ids = auditIds(audit);
    if (audit.uid !== uid)
        throw new https_1.HttpsError('permission-denied', 'A auditoria não pertence ao usuário autenticado.');
    if (audit.actionId !== request.actionId)
        throw new https_1.HttpsError('failed-precondition', 'A auditoria não corresponde à ação solicitada.');
    if (audit.status !== 'undo_processing')
        throw new https_1.HttpsError('failed-precondition', 'A ação não está disponível para undo.');
    if (audit.before !== null && audit.before !== undefined) {
        throw new https_1.HttpsError('failed-precondition', 'Esta operação de edição ainda não possui restauração implementada.');
    }
    const createdAtMs = millis(audit.createdAtMs) ?? millis(audit.createdAt);
    if (!createdAtMs || now - createdAtMs > exports.UNDO_TTL_MS)
        throw new https_1.HttpsError('deadline-exceeded', 'O prazo para desfazer expirou.');
    let removed = [];
    try {
        const owned = await dependencies.readOwnedDocuments(uid, ids, request.actionId, token);
        for (let index = 0; index < owned.length; index += exports.UNDO_BATCH_SIZE) {
            const batch = owned.slice(index, index + exports.UNDO_BATCH_SIZE);
            await dependencies.deleteBatch(uid, batch);
            removed = removed.concat(batch);
        }
        const result = {
            success: true,
            actionId: request.actionId,
            status: 'undone',
            idsRemoved: owned.map((document) => document.id),
        };
        await dependencies.finalizeAudit(uid, request.actionId, {
            status: 'undone',
            undoneAt: firestore_1.Timestamp.fromMillis(Date.now()),
            undoId,
            idsRemoved: result.idsRemoved,
        });
        return result;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Falha desconhecida durante o undo.';
        await dependencies.finalizeAudit(uid, request.actionId, {
            status: removed.length > 0 ? 'partial' : 'failed',
            undoId,
            undoError: message,
            idsRemoved: removed.map((document) => document.id),
        });
        if (removed.length > 0) {
            const partialResult = {
                success: false,
                actionId: request.actionId,
                status: 'partial',
                idsRemoved: removed.map((document) => document.id),
                error: message,
            };
            return partialResult;
        }
        throw new https_1.HttpsError('internal', `Não foi possível desfazer a operação. (${message})`);
    }
}
function buildFirestoreDependencies(db) {
    const auditPath = (uid, actionId) => `users/${uid}/agenda/_nexus/audit/${actionId}`;
    const commitmentPath = (uid, id) => `users/${uid}/agenda/${id}`;
    return {
        async claimAudit(uid, actionId, nowMs, undoId) {
            return db.runTransaction(async (transaction) => {
                const ref = db.doc(auditPath(uid, actionId));
                const snapshot = await transaction.get(ref);
                if (!snapshot.exists)
                    return { kind: 'rejected', reason: 'Auditoria inexistente.' };
                const audit = snapshot.data();
                if (audit.uid !== uid)
                    return { kind: 'rejected', reason: 'A auditoria não pertence ao usuário autenticado.' };
                if (audit.status === 'undone')
                    return { kind: 'rejected', reason: 'A ação já foi desfeita.' };
                if (audit.status !== 'committed')
                    return { kind: 'rejected', reason: 'A ação não está disponível para undo.' };
                const createdAtMs = millis(audit.createdAtMs) ?? millis(audit.createdAt);
                if (!createdAtMs || nowMs - createdAtMs > exports.UNDO_TTL_MS)
                    return { kind: 'rejected', reason: 'O prazo para desfazer expirou.' };
                transaction.update(ref, (0, nexusAgendaCommit_1.sanitizeForFirestore)({ status: 'undo_processing', undoId, undoStartedAt: firestore_1.Timestamp.fromMillis(nowMs) }));
                return { kind: 'claimed', audit: { ...audit, status: 'undo_processing', undoId } };
            });
        },
        async readOwnedDocuments(uid, ids, actionId, token) {
            const snapshots = await (0, nexusAgendaCommit_1.getAllInBatches)(db, (ownerId, id) => db.doc(commitmentPath(ownerId, id)), uid, ids);
            const result = [];
            for (const snapshot of snapshots) {
                if (!snapshot.exists)
                    continue;
                const data = (snapshot.data() ?? {});
                if (data.createdBy === 'nexus' && data.createdByActionId === actionId && data.createdByToken === token) {
                    result.push({ id: snapshot.id, data });
                }
            }
            return result;
        },
        async deleteBatch(uid, documents) {
            const batch = db.batch();
            documents.forEach((document) => batch.delete(db.doc(commitmentPath(uid, document.id))));
            await batch.commit();
        },
        async finalizeAudit(uid, actionId, patch) {
            await db.doc(auditPath(uid, actionId)).update((0, nexusAgendaCommit_1.sanitizeForFirestore)({ ...patch, updatedAt: firestore_1.Timestamp.now() }));
        },
    };
}
exports.nexusAgendaUndo = (0, https_1.onCall)({ memory: '1GiB', timeoutSeconds: 60, region: 'us-central1' }, async (request) => {
    const uid = requireUndoAuth(request);
    const data = request.data;
    if (!data || typeof data.actionId !== 'string' || !data.actionId.trim()) {
        throw new https_1.HttpsError('invalid-argument', 'actionId é obrigatório.');
    }
    return executeAgendaUndo(uid, { actionId: data.actionId }, buildFirestoreDependencies((0, firestore_1.getFirestore)()));
});
//# sourceMappingURL=nexusAgendaUndo.js.map