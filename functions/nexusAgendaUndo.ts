import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { randomUUID } from 'node:crypto';
import { sanitizeForFirestore, getAllInBatches } from './nexusAgendaCommit';

export const UNDO_TTL_MS = 60 * 1000;
export const UNDO_BATCH_SIZE = 400;

interface AuditDocument {
  actionId?: unknown;
  uid?: unknown;
  token?: unknown;
  status?: unknown;
  idsCreated?: unknown;
  seriesId?: unknown;
  before?: unknown;
  after?: unknown;
  createdAt?: unknown;
  createdAtMs?: unknown;
  undoneAt?: unknown;
  undoId?: unknown;
}

interface OwnedDocument {
  id: string;
  data: Record<string, unknown>;
}

export interface UndoResult {
  success: true;
  actionId: string;
  status: 'undone';
  idsRemoved: string[];
}

/** Undo parcial estruturado: parte dos documentos foi removida antes da falha. */
export interface PartialUndoResult {
  success: false;
  actionId: string;
  status: 'partial';
  idsRemoved: string[];
  error: string;
}

export interface UndoDependencies {
  claimAudit(uid: string, actionId: string, nowMs: number, undoId: string): Promise<
    | { kind: 'claimed'; audit: AuditDocument }
    | { kind: 'rejected'; reason: string }
    | { kind: 'idempotent'; result: UndoResult }
  >;
  readOwnedDocuments(uid: string, ids: string[], actionId: string, token: string): Promise<OwnedDocument[]>;
  deleteBatch(uid: string, documents: OwnedDocument[]): Promise<void>;
  finalizeAudit(uid: string, actionId: string, patch: Record<string, unknown>): Promise<void>;
}

export interface UndoRequest {
  actionId: string;
}

export function requireUndoAuth(request: { auth?: { uid?: string } | null }): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Login necessário para desfazer a operação.');
  return uid;
}

function millis(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return undefined;
}

function auditIds(audit: AuditDocument): string[] {
  if (!Array.isArray(audit.idsCreated)) return [];
  return audit.idsCreated.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

export async function executeAgendaUndo(
  uid: string,
  request: UndoRequest,
  dependencies: UndoDependencies,
  now = Date.now(),
): Promise<UndoResult | PartialUndoResult> {
  if (!request.actionId || typeof request.actionId !== 'string') {
    throw new HttpsError('invalid-argument', 'actionId é obrigatório.');
  }

  const undoId = `undo_${randomUUID()}`;
  const claimed = await dependencies.claimAudit(uid, request.actionId, now, undoId);
  if (claimed.kind === 'idempotent') return claimed.result;
  if (claimed.kind === 'rejected') throw new HttpsError('failed-precondition', claimed.reason);

  const audit = claimed.audit;
  const token = typeof audit.token === 'string' ? audit.token : '';
  const ids = auditIds(audit);
  if (audit.uid !== uid) throw new HttpsError('permission-denied', 'A auditoria não pertence ao usuário autenticado.');
  if (audit.actionId !== request.actionId) throw new HttpsError('failed-precondition', 'A auditoria não corresponde à ação solicitada.');
  if (audit.status !== 'undo_processing') throw new HttpsError('failed-precondition', 'A ação não está disponível para undo.');
  if (audit.before !== null && audit.before !== undefined) {
    throw new HttpsError('failed-precondition', 'Esta operação de edição ainda não possui restauração implementada.');
  }
  const createdAtMs = millis(audit.createdAtMs) ?? millis(audit.createdAt);
  if (!createdAtMs || now - createdAtMs > UNDO_TTL_MS) throw new HttpsError('deadline-exceeded', 'O prazo para desfazer expirou.');

  let removed: OwnedDocument[] = [];
  try {
    const owned = await dependencies.readOwnedDocuments(uid, ids, request.actionId, token);
    for (let index = 0; index < owned.length; index += UNDO_BATCH_SIZE) {
      const batch = owned.slice(index, index + UNDO_BATCH_SIZE);
      await dependencies.deleteBatch(uid, batch);
      removed = removed.concat(batch);
    }
    const result: UndoResult = {
      success: true,
      actionId: request.actionId,
      status: 'undone',
      idsRemoved: owned.map((document) => document.id),
    };
    await dependencies.finalizeAudit(uid, request.actionId, {
      status: 'undone',
      undoneAt: Timestamp.fromMillis(Date.now()),
      undoId,
      idsRemoved: result.idsRemoved,
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida durante o undo.';
    await dependencies.finalizeAudit(uid, request.actionId, {
      status: removed.length > 0 ? 'partial' : 'failed',
      undoId,
      undoError: message,
      idsRemoved: removed.map((document) => document.id),
    });
    if (removed.length > 0) {
      // Parcial é resposta estruturada (não exceção), espelhando o commit.
      const partialResult: PartialUndoResult = {
        success: false,
        actionId: request.actionId,
        status: 'partial',
        idsRemoved: removed.map((document) => document.id),
        error: message,
      };
      return partialResult;
    }
    throw new HttpsError('internal', `Não foi possível desfazer a operação. (${message})`);
  }
}

function buildFirestoreDependencies(db: ReturnType<typeof getFirestore>): UndoDependencies {
  const auditPath = (uid: string, actionId: string) => `users/${uid}/agenda/_nexus/audit/${actionId}`;
  const commitmentPath = (uid: string, id: string) => `users/${uid}/agenda/${id}`;

  return {
    async claimAudit(uid, actionId, nowMs, undoId) {
      return db.runTransaction(async (transaction) => {
        const ref = db.doc(auditPath(uid, actionId));
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists) return { kind: 'rejected' as const, reason: 'Auditoria inexistente.' };
        const audit = snapshot.data() as AuditDocument;
        if (audit.uid !== uid) return { kind: 'rejected' as const, reason: 'A auditoria não pertence ao usuário autenticado.' };
        if (audit.status === 'undone') return { kind: 'rejected' as const, reason: 'A ação já foi desfeita.' };
        if (audit.status !== 'committed') return { kind: 'rejected' as const, reason: 'A ação não está disponível para undo.' };
        const createdAtMs = millis(audit.createdAtMs) ?? millis(audit.createdAt);
        if (!createdAtMs || nowMs - createdAtMs > UNDO_TTL_MS) return { kind: 'rejected' as const, reason: 'O prazo para desfazer expirou.' };
        transaction.update(ref, sanitizeForFirestore({ status: 'undo_processing', undoId, undoStartedAt: Timestamp.fromMillis(nowMs) }) as Record<string, unknown>);
        return { kind: 'claimed' as const, audit: { ...audit, status: 'undo_processing', undoId } };
      });
    },
    async readOwnedDocuments(uid, ids, actionId, token) {
      const snapshots = await getAllInBatches(
        db as unknown as Parameters<typeof getAllInBatches>[0],
        (ownerId, id) => db.doc(commitmentPath(ownerId, id)),
        uid,
        ids,
      );
      const result: OwnedDocument[] = [];
      for (const snapshot of snapshots) {
        if (!snapshot.exists) continue;
        const data = (snapshot.data() ?? {}) as Record<string, unknown>;
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
      await db.doc(auditPath(uid, actionId)).update(sanitizeForFirestore({ ...patch, updatedAt: Timestamp.now() }) as Record<string, unknown>);
    },
  };
}

export const nexusAgendaUndo = onCall(
  { memory: '1GiB', timeoutSeconds: 60, region: 'us-central1' },
  async (request) => {
    const uid = requireUndoAuth(request);
    const data = request.data as Partial<UndoRequest> | undefined;
    if (!data || typeof data.actionId !== 'string' || !data.actionId.trim()) {
      throw new HttpsError('invalid-argument', 'actionId é obrigatório.');
    }
    return executeAgendaUndo(uid, { actionId: data.actionId }, buildFirestoreDependencies(getFirestore()));
  },
);
