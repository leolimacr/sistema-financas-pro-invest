"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.nexusAgendaCommit = exports.MAX_READ_BATCH_SIZE = exports.MAX_COMMIT_OCCURRENCES = exports.MAX_COMMIT_BATCH_WRITES = void 0;
exports.getAllInBatches = getAllInBatches;
exports.sanitizeForFirestore = sanitizeForFirestore;
exports.batchWriteErrorLog = batchWriteErrorLog;
exports.auditErrorLog = auditErrorLog;
exports.resolveReminderMode = resolveReminderMode;
exports.requireCommitAuth = requireCommitAuth;
exports.executeAgendaCommit = executeAgendaCommit;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const node_crypto_1 = require("node:crypto");
const agenda_intent_schema_1 = require("./nexus-core/agenda-intent-schema");
const agenda_time_1 = require("./nexus-core/agenda-time");
exports.MAX_COMMIT_BATCH_WRITES = 400;
exports.MAX_COMMIT_OCCURRENCES = 800;
exports.MAX_READ_BATCH_SIZE = 400;
async function getAllInBatches(db, docRefs, uid, ids) {
    const out = [];
    for (let index = 0; index < ids.length; index += exports.MAX_READ_BATCH_SIZE) {
        const chunk = ids.slice(index, index + exports.MAX_READ_BATCH_SIZE);
        if (chunk.length === 0)
            continue;
        const snapshots = await db.getAll(...chunk.map((id) => docRefs(uid, id)));
        out.push(...snapshots);
    }
    return out;
}
function sanitizeForFirestore(value) {
    if (value === undefined)
        return null;
    if (value === null)
        return null;
    if (value instanceof firestore_1.Timestamp)
        return value;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (Array.isArray(value))
        return value.map(sanitizeForFirestore);
    if (typeof value === 'object') {
        const output = {};
        for (const [key, item] of Object.entries(value)) {
            output[key] = sanitizeForFirestore(item);
        }
        return output;
    }
    return value;
}
function safeUid(uid) {
    return uid.length > 12 ? `${uid.slice(0, 8)}…${uid.slice(-4)}` : 'short';
}
function safeToken(token) {
    return token.length > 8 ? `${token.slice(0, 4)}…${token.slice(-4)}` : 'mascarado';
}
function errorMessage(error) {
    return error instanceof Error ? error.message : 'erro desconhecido';
}
function batchWriteErrorLog(uid, documents, error) {
    return {
        uid: safeUid(uid),
        documentCount: documents.length,
        documentIds: documents.map((document) => document.id),
        errorMessage: errorMessage(error),
    };
}
function auditErrorLog(uid, actionId, error) {
    return {
        uid: safeUid(uid),
        actionId,
        errorMessage: errorMessage(error),
    };
}
function resolveReminderMode(request) {
    if (request.reminderMode === 'notification' || request.reminderMode === 'notification_alarm') {
        return request.reminderMode;
    }
    return request.alarm === true ? 'notification' : 'none';
}
function requireCommitAuth(request) {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Login necessário para confirmar a Agenda.');
    return uid;
}
function timestampMs(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return value;
    if (value && typeof value.toMillis === 'function') {
        return value.toMillis();
    }
    return undefined;
}
function minutes(value) {
    if (!value)
        return 0;
    const [hour, minute] = value.split(':').map(Number);
    return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}
function timestampForOccurrence(isoDate, time) {
    const range = (0, agenda_time_1.saoPauloDayRangeMillis)((0, agenda_time_1.isoToYmd)(isoDate));
    return firestore_1.Timestamp.fromMillis(range.startMs + minutes(time) * 60000);
}
function requestHash(uid, token, confirmed) {
    return (0, node_crypto_1.createHash)('sha1').update(`${uid}|${token}|${String(confirmed)}`).digest('hex');
}
function validatePendingEnvelope(pending) {
    const result = (0, agenda_intent_schema_1.parseAndValidateAgendaEnvelope)(JSON.stringify(pending.envelope));
    if (!result.ok)
        throw new Error(`Proposta inválida: ${result.errors.join('; ')}`);
    return result.data;
}
function buildCreateDocuments(uid, envelope, actionId, token, reminderMode) {
    if (envelope.intent !== 'create' || envelope.action !== 'create_commitment') {
        throw new Error('Somente propostas create_commitment podem ser executadas nesta fase.');
    }
    const title = envelope.entities.title;
    const date = envelope.entities.date?.resolved;
    if (!title || !date)
        throw new Error('A proposta não possui título e data resolvida.');
    const recurrence = envelope.entities.recurrence;
    const until = recurrence?.until?.resolved;
    const expansion = recurrence
        ? (0, agenda_time_1.expandRecurrence)({
            freq: recurrence.freq,
            startIso: date,
            untilIso: until,
        }, exports.MAX_COMMIT_OCCURRENCES)
        : { occurrences: [date], truncated: false };
    if (expansion.truncated || expansion.occurrences.length > exports.MAX_COMMIT_OCCURRENCES) {
        throw new Error(`A proposta excede o limite de ${exports.MAX_COMMIT_OCCURRENCES} ocorrências.`);
    }
    const seriesId = recurrence ? (0, agenda_time_1.generateSeriesId)(title, date) : undefined;
    const now = firestore_1.Timestamp.now();
    const documents = expansion.occurrences.map((occurrence) => {
        const id = (0, agenda_time_1.generateCommitmentId)(seriesId ?? null, occurrence, envelope.entities.startTime ?? '');
        const data = {
            date: timestampForOccurrence(occurrence, envelope.entities.startTime ?? undefined),
            title,
            time: envelope.entities.startTime ?? null,
            endTime: envelope.entities.endTime ?? null,
            completed: false,
            createdBy: 'nexus',
            createdByActionId: actionId,
            createdByToken: token,
            createdAt: now,
            updatedAt: now,
        };
        if (seriesId)
            data.seriesId = seriesId;
        if (recurrence) {
            data.recurrence = {
                freq: recurrence.freq,
                ...(recurrence.byDay === undefined ? {} : { byDay: recurrence.byDay }),
                ...(until ? { until: timestampForOccurrence(until) } : {}),
            };
        }
        if (reminderMode !== 'none') {
            data.alarmAt = timestampForOccurrence(occurrence, envelope.entities.startTime ?? undefined);
            data.reminderMode = reminderMode;
        }
        if (envelope.entities.location !== undefined)
            data.location = envelope.entities.location;
        if (envelope.entities.participants !== undefined)
            data.participants = envelope.entities.participants;
        if (envelope.entities.notes !== undefined)
            data.notes = envelope.entities.notes;
        return { id, data };
    });
    void uid;
    return { documents, seriesId, occurrenceCount: documents.length };
}
function parseDeleteTargets(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .filter((item) => Boolean(item) && typeof item.id === 'string' && item.id.length > 0)
        .map((item) => ({ id: item.id }));
}
function parseEditTarget(value) {
    if (!value || typeof value !== 'object')
        return null;
    const item = value;
    if (typeof item.id !== 'string' || item.id.length === 0)
        return null;
    return { id: item.id };
}
function optionalString(value) {
    if (typeof value === 'string')
        return value;
    if (value === null)
        return null;
    return undefined;
}
function parseEditSnapshot(value) {
    if (!value || typeof value !== 'object')
        return null;
    const item = value;
    if (typeof item.title !== 'string' || item.title.length === 0)
        return null;
    if (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date))
        return null;
    const participants = Array.isArray(item.participants) && item.participants.every((participant) => typeof participant === 'string')
        ? item.participants
        : null;
    return {
        title: item.title,
        date: item.date,
        startTime: optionalString(item.startTime),
        endTime: optionalString(item.endTime),
        location: optionalString(item.location),
        participants,
        notes: optionalString(item.notes),
    };
}
function editSnapshotFromDoc(data) {
    const dateField = data.date;
    const dateMs = dateField?.toMillis?.();
    const participants = Array.isArray(data.participants) && data.participants.every((participant) => typeof participant === 'string')
        ? data.participants
        : null;
    return {
        title: typeof data.title === 'string' ? data.title : '',
        date: typeof dateMs === 'number' && Number.isFinite(dateMs) ? (0, agenda_time_1.isoFromDateMs)(dateMs) : '',
        startTime: typeof data.time === 'string' ? data.time : null,
        endTime: typeof data.endTime === 'string' ? data.endTime : null,
        location: typeof data.location === 'string' ? data.location : null,
        participants,
        notes: typeof data.notes === 'string' ? data.notes : null,
    };
}
function snapshotsEqual(a, b) {
    return a.title === b.title
        && a.date === b.date
        && (a.startTime ?? null) === (b.startTime ?? null)
        && (a.endTime ?? null) === (b.endTime ?? null)
        && (a.location ?? null) === (b.location ?? null)
        && JSON.stringify(a.participants ?? null) === JSON.stringify(b.participants ?? null)
        && (a.notes ?? null) === (b.notes ?? null);
}
function applyEditData(current, after, actionId) {
    const now = firestore_1.Timestamp.now();
    return {
        ...current,
        title: after.title,
        time: after.startTime ?? null,
        endTime: after.endTime ?? null,
        location: after.location ?? null,
        participants: after.participants ?? null,
        notes: after.notes ?? null,
        date: timestampForOccurrence(after.date, after.startTime ?? undefined),
        updatedAt: now,
        updatedBy: 'nexus',
        updatedByActionId: actionId,
    };
}
function buildExecutionPlan(envelope, pending, actionId, token, reminderMode) {
    if (envelope.intent === 'create' && envelope.action === 'create_commitment') {
        const { documents, seriesId, occurrenceCount } = buildCreateDocuments('', envelope, actionId, token, reminderMode);
        return { kind: 'create', documents, seriesId, occurrenceCount };
    }
    if (envelope.intent === 'delete' && envelope.action === 'delete_commitment') {
        const targets = parseDeleteTargets(pending.targets);
        if (targets.length === 0)
            throw new Error('A proposta de exclusão não possui alvos gravados.');
        return { kind: 'delete', targetIds: targets.map((target) => target.id), occurrenceCount: targets.length };
    }
    if (envelope.intent === 'edit' && envelope.action === 'edit_commitment') {
        const target = parseEditTarget(pending.target);
        const before = parseEditSnapshot(pending.before);
        const after = parseEditSnapshot(pending.after);
        if (!target)
            throw new Error('A proposta de edição não possui alvo gravado.');
        if (!before || !after)
            throw new Error('A proposta de edição não possui estado antes/depois gravado.');
        return { kind: 'edit', targetId: target.id, before, after };
    }
    throw new Error('Somente propostas create_commitment, delete_commitment ou edit_commitment podem ser executadas nesta fase.');
}
async function executeAgendaCommit(uid, request, dependencies, now = Date.now()) {
    if (!request.confirmed)
        throw new https_1.HttpsError('failed-precondition', 'A confirmação explícita é obrigatória.');
    if (!request.confirmationToken || typeof request.confirmationToken !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'confirmationToken é obrigatório.');
    }
    if (request.alarm !== undefined && typeof request.alarm !== 'boolean') {
        throw new https_1.HttpsError('invalid-argument', 'alarm deve ser booleano quando informado.');
    }
    if (request.reminderMode !== undefined
        && request.reminderMode !== 'notification'
        && request.reminderMode !== 'notification_alarm') {
        throw new https_1.HttpsError('invalid-argument', 'reminderMode deve ser "notification" ou "notification_alarm" quando informado.');
    }
    const executionId = `exec_${(0, node_crypto_1.createHash)('sha1').update(`${uid}|${request.confirmationToken}|${now}`).digest('hex').slice(0, 20)}`;
    const claimed = await dependencies.claimPending(uid, request.confirmationToken, now, executionId);
    if (claimed.kind === 'idempotent')
        return claimed.result;
    if (claimed.kind === 'rejected')
        throw new https_1.HttpsError('failed-precondition', claimed.reason);
    const actionId = `act_${executionId.slice(5)}`;
    const pending = claimed.pending;
    const createdAtMs = timestampMs(pending.createdAtMs) ?? timestampMs(pending.createdAt) ?? now;
    const expiresAtMs = timestampMs(pending.expiresAtMs) ?? timestampMs(pending.expiresAt);
    if (pending.uid !== uid)
        throw new https_1.HttpsError('permission-denied', 'A proposta não pertence ao usuário autenticado.');
    if (pending.status !== 'processing')
        throw new https_1.HttpsError('failed-precondition', 'A proposta não está em processamento.');
    if (!expiresAtMs || expiresAtMs <= now)
        throw new https_1.HttpsError('deadline-exceeded', 'A proposta de agenda expirou.');
    if (pending.nonce !== request.confirmationToken || pending.confirmationToken !== request.confirmationToken) {
        throw new https_1.HttpsError('failed-precondition', 'O token da proposta é inválido.');
    }
    if (now < createdAtMs)
        throw new https_1.HttpsError('failed-precondition', 'A data da proposta é inválida.');
    let documents = [];
    let committedIds = [];
    let deletedIds = [];
    let editedIds = [];
    let seriesId;
    let intent = 'create';
    let targetRecords = [];
    let editBeforeRecord = null;
    let editAfterRecord = null;
    try {
        const envelope = validatePendingEnvelope(pending);
        const plan = buildExecutionPlan(envelope, pending, actionId, request.confirmationToken, resolveReminderMode(request));
        intent = plan.kind;
        if (plan.kind === 'create') {
            documents = plan.documents;
            seriesId = plan.seriesId;
            const alreadyExisting = await dependencies.existingIds(uid, documents.map((document) => document.id));
            if (alreadyExisting.length > 0)
                throw new Error(`Compromissos já existentes: ${alreadyExisting.join(', ')}`);
            for (let index = 0; index < documents.length; index += exports.MAX_COMMIT_BATCH_WRITES) {
                const batchDocuments = documents.slice(index, index + exports.MAX_COMMIT_BATCH_WRITES);
                await dependencies.writeBatch(uid, batchDocuments);
                committedIds = committedIds.concat(batchDocuments.map((document) => document.id));
            }
        }
        else if (plan.kind === 'delete') {
            const existing = await dependencies.existingIds(uid, plan.targetIds);
            if (existing.length === 0)
                throw new Error('Nenhum dos compromissos alvo ainda existe.');
            for (let index = 0; index < existing.length; index += exports.MAX_COMMIT_BATCH_WRITES) {
                const batch = existing.slice(index, index + exports.MAX_COMMIT_BATCH_WRITES);
                await dependencies.deleteBatch(uid, batch);
                deletedIds = deletedIds.concat(batch);
            }
            targetRecords = plan.targetIds.map((id) => ({ id }));
        }
        else {
            const current = await dependencies.readCommitment(uid, plan.targetId);
            if (!current)
                throw new Error('O compromisso alvo da edição não existe mais.');
            if (typeof current.seriesId === 'string' || current.recurrence) {
                throw new Error('Não é possível editar um compromisso de uma série recorrente.');
            }
            if (!snapshotsEqual(editSnapshotFromDoc(current), plan.before)) {
                throw new Error('O compromisso foi alterado por outra sessão desde a proposta. Recarregue a Agenda e tente novamente.');
            }
            const data = applyEditData(current, plan.after, actionId);
            await dependencies.updateCommitment(uid, plan.targetId, data);
            editedIds = [plan.targetId];
            editBeforeRecord = { id: plan.targetId, ...current };
            editAfterRecord = { id: plan.targetId, ...data };
        }
        const completedAtMs = Date.now();
        const result = {
            success: true,
            actionId,
            status: 'committed',
            intent,
            idsCreated: committedIds,
            idsDeleted: deletedIds,
            idsEdited: editedIds,
            seriesId,
            occurrenceCount: intent === 'create' ? documents.length : intent === 'delete' ? deletedIds.length : 1,
        };
        await dependencies.writeAudit(uid, actionId, {
            actionId,
            uid,
            token: request.confirmationToken,
            status: 'committed',
            intent,
            idsCreated: result.idsCreated,
            idsDeleted: result.idsDeleted,
            idsEdited: result.idsEdited,
            seriesId,
            before: intent === 'delete' ? targetRecords : intent === 'edit' ? editBeforeRecord : null,
            after: intent === 'create'
                ? documents
                    .filter((document) => committedIds.includes(document.id))
                    .map((document) => ({ id: document.id, ...document.data }))
                : intent === 'edit'
                    ? editAfterRecord
                    : null,
            requestHash: requestHash(uid, request.confirmationToken, request.confirmed),
            createdAtMs,
            completedAtMs,
        });
        await dependencies.finalizePending(uid, request.confirmationToken, { status: 'committed', executionId, result });
        return result;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Falha desconhecida na gravação.';
        const partial = intent === 'create' ? committedIds.length > 0 : intent === 'delete' ? deletedIds.length > 0 : editedIds.length > 0;
        const status = partial ? 'partial' : 'failed';
        const completedAtMs = Date.now();
        await dependencies.writeAudit(uid, actionId, {
            actionId,
            uid,
            token: request.confirmationToken,
            status,
            intent,
            idsCreated: committedIds,
            idsDeleted: deletedIds,
            idsEdited: editedIds,
            seriesId,
            before: intent === 'delete' ? targetRecords : intent === 'edit' ? editBeforeRecord : null,
            after: intent === 'create'
                ? documents
                    .filter((document) => committedIds.includes(document.id))
                    .map((document) => ({ id: document.id, ...document.data }))
                : intent === 'edit'
                    ? editAfterRecord
                    : null,
            requestHash: requestHash(uid, request.confirmationToken, request.confirmed),
            createdAtMs,
            completedAtMs,
            error: message,
        });
        await dependencies.finalizePending(uid, request.confirmationToken, { status, executionId, error: message });
        if (partial) {
            const partialResult = {
                success: false,
                actionId,
                status: 'partial',
                intent,
                idsCreated: committedIds,
                idsDeleted: deletedIds,
                idsEdited: editedIds,
                seriesId,
                occurrenceCount: intent === 'create' ? committedIds.length : intent === 'delete' ? deletedIds.length : editedIds.length,
                error: message,
            };
            return partialResult;
        }
        throw new https_1.HttpsError('internal', `Não foi possível executar a proposta de agenda. (${message})`);
    }
}
function buildFirestoreDependencies(db) {
    const pendingPath = (uid, token) => `users/${uid}/agenda/_nexus/pending/${token}`;
    const agendaPath = (uid, id) => `users/${uid}/agenda/${id}`;
    const auditPath = (uid, actionId) => `users/${uid}/agenda/_nexus/audit/${actionId}`;
    return {
        async claimPending(uid, token, nowMs, executionId) {
            try {
                return await db.runTransaction(async (transaction) => {
                    const ref = db.doc(pendingPath(uid, token));
                    const snapshot = await transaction.get(ref);
                    if (!snapshot.exists)
                        return { kind: 'rejected', reason: 'Proposta inexistente.' };
                    const pending = snapshot.data();
                    if (pending.uid !== uid)
                        return { kind: 'rejected', reason: 'A proposta não pertence ao usuário autenticado.' };
                    if (pending.status === 'committed' && pending.result)
                        return { kind: 'idempotent', result: pending.result };
                    if (pending.status !== 'awaiting_confirmation')
                        return { kind: 'rejected', reason: 'A proposta já foi consumida ou não está disponível.' };
                    const expiresAt = timestampMs(pending.expiresAtMs) ?? timestampMs(pending.expiresAt);
                    if (!expiresAt || expiresAt <= nowMs)
                        return { kind: 'rejected', reason: 'A proposta de agenda expirou.' };
                    transaction.update(ref, sanitizeForFirestore({ status: 'processing', executionId, processingAt: firestore_1.Timestamp.fromMillis(nowMs) }));
                    return { kind: 'claimed', pending: { ...pending, status: 'processing', executionId } };
                });
            }
            catch (error) {
                logger.error('nexusAgendaCommit: falha ao reivindicar proposta no Firestore.', { uid: safeUid(uid), token: safeToken(token), executionId, errorMessage: errorMessage(error) });
                throw error;
            }
        },
        async existingIds(uid, ids) {
            const snapshots = await getAllInBatches(db, (ownerId, id) => db.doc(agendaPath(ownerId, id)), uid, ids);
            return snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.id);
        },
        async writeBatch(uid, documents) {
            try {
                const batch = db.batch();
                for (const document of documents) {
                    batch.set(db.doc(agendaPath(uid, document.id)), sanitizeForFirestore(document.data), { merge: false });
                }
                await batch.commit();
            }
            catch (error) {
                logger.error('nexusAgendaCommit: falha ao gravar lote de compromissos.', batchWriteErrorLog(uid, documents, error));
                throw error;
            }
        },
        async deleteBatch(uid, ids) {
            try {
                const batch = db.batch();
                for (const id of ids)
                    batch.delete(db.doc(agendaPath(uid, id)));
                await batch.commit();
            }
            catch (error) {
                logger.error('nexusAgendaCommit: falha ao excluir lote de compromissos.', { uid: safeUid(uid), idCount: ids.length, errorMessage: errorMessage(error) });
                throw error;
            }
        },
        async readCommitment(uid, id) {
            try {
                const snapshot = await db.doc(agendaPath(uid, id)).get();
                return snapshot.exists ? snapshot.data() : null;
            }
            catch (error) {
                logger.error('nexusAgendaCommit: falha ao ler compromisso alvo da edição.', { uid: safeUid(uid), id, errorMessage: errorMessage(error) });
                throw error;
            }
        },
        async updateCommitment(uid, id, data) {
            try {
                await db.doc(agendaPath(uid, id)).set(sanitizeForFirestore(data), { merge: false });
            }
            catch (error) {
                logger.error('nexusAgendaCommit: falha ao atualizar compromisso.', { uid: safeUid(uid), id, errorMessage: errorMessage(error) });
                throw error;
            }
        },
        async finalizePending(uid, token, patch) {
            try {
                await db.doc(pendingPath(uid, token)).update(sanitizeForFirestore({ ...patch, updatedAt: firestore_1.Timestamp.now() }));
            }
            catch (error) {
                logger.error('nexusAgendaCommit: falha ao finalizar proposta no Firestore.', { uid: safeUid(uid), token: safeToken(token), errorMessage: errorMessage(error) });
                throw error;
            }
        },
        async writeAudit(uid, actionId, audit) {
            try {
                await db.doc(auditPath(uid, actionId)).set(sanitizeForFirestore({
                    ...audit,
                    createdAt: firestore_1.Timestamp.fromMillis(audit.createdAtMs),
                    completedAt: firestore_1.Timestamp.fromMillis(audit.completedAtMs),
                }));
            }
            catch (error) {
                logger.error('nexusAgendaCommit: falha ao gravar auditoria no Firestore.', auditErrorLog(uid, actionId, error));
                throw error;
            }
        },
    };
}
exports.nexusAgendaCommit = (0, https_1.onCall)({ memory: '1GiB', timeoutSeconds: 120, region: 'us-central1' }, async (request) => {
    const uid = requireCommitAuth(request);
    const data = request.data;
    if (!data || typeof data.confirmationToken !== 'string' || typeof data.confirmed !== 'boolean') {
        throw new https_1.HttpsError('invalid-argument', 'confirmationToken e confirmed são obrigatórios.');
    }
    try {
        return await executeAgendaCommit(uid, {
            confirmationToken: data.confirmationToken,
            confirmed: data.confirmed,
            alarm: typeof data.alarm === 'boolean' ? data.alarm : undefined,
            reminderMode: data.reminderMode === 'notification' || data.reminderMode === 'notification_alarm'
                ? data.reminderMode
                : undefined,
        }, buildFirestoreDependencies((0, firestore_1.getFirestore)()));
    }
    catch (error) {
        if (error instanceof https_1.HttpsError && error.code !== 'internal')
            throw error;
        logger.error('nexusAgendaCommit: falha interna ao registrar a operação.', { errorMessage: errorMessage(error) });
        return {
            success: false,
            error: 'Não foi possível registrar a operação. Verifique os logs.',
        };
    }
});
//# sourceMappingURL=nexusAgendaCommit.js.map