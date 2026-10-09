import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { createHash } from 'node:crypto';
import {
  parseAndValidateAgendaEnvelope,
  type AgendaEditSnapshot,
  type AgendaEnvelope,
} from './nexus-core/agenda-intent-schema';
import {
  expandRecurrence,
  generateCommitmentId,
  generateSeriesId,
  isoFromDateMs,
  isoToYmd,
  saoPauloDayRangeMillis,
  type RecurrenceFreq,
} from './nexus-core/agenda-time';

export const MAX_COMMIT_BATCH_WRITES = 400;
export const MAX_COMMIT_OCCURRENCES = 800;
/** Teto de refs por chamada `getAll` — mesma ordem dos lotes de escrita. */
export const MAX_READ_BATCH_SIZE = 400;

interface DocumentSnapshotLike {
  readonly exists: boolean;
  readonly id: string;
  data(): Record<string, unknown> | undefined;
}

interface GetAllCapable {
  getAll(...refs: unknown[]): Promise<DocumentSnapshotLike[]>;
}

/**
 * Leitura em lote via `getAll` (1 round-trip por chunk em vez de N `get()`
 * sequenciais). Usado por `existingIds` (commit) e `readOwnedDocuments`
 * (undo): uma série de 366 ocorrências cai de 366 leituras sequenciais para
 * 1 chamada.
 */
export async function getAllInBatches(
  db: GetAllCapable,
  docRefs: (uid: string, id: string) => unknown,
  uid: string,
  ids: string[],
): Promise<DocumentSnapshotLike[]> {
  const out: DocumentSnapshotLike[] = [];
  for (let index = 0; index < ids.length; index += MAX_READ_BATCH_SIZE) {
    const chunk = ids.slice(index, index + MAX_READ_BATCH_SIZE);
    if (chunk.length === 0) continue;
    const snapshots = await db.getAll(...chunk.map((id) => docRefs(uid, id)));
    out.push(...snapshots);
  }
  return out;
}

/**
 * Sanitizador recursivo para dados antes de gravação no Firestore.
 * O Firestore rejeita documentos com valores `undefined` ou `Date` inválido;
 * esta função normaliza (undefined → null) e converte Date inválido para null,
 * percorrendo objetos, arrays e valores aninhados. Objetos nativos do
 * Firestore (Timestamp) são preservados intactos.
 */
export function sanitizeForFirestore(value: unknown): unknown {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (Array.isArray(value)) return value.map(sanitizeForFirestore);
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output[key] = sanitizeForFirestore(item);
    }
    return output;
  }
  return value;
}

/** uid mascarado para correlação em logs sem expor o identificador completo. */
function safeUid(uid: string): string {
  return uid.length > 12 ? `${uid.slice(0, 8)}…${uid.slice(-4)}` : 'short';
}

function safeToken(token: string): string {
  return token.length > 8 ? `${token.slice(0, 4)}…${token.slice(-4)}` : 'mascarado';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'erro desconhecido';
}

/** Payload de log de falha de lote — IDs e contagem, nunca o documento inteiro. */
export function batchWriteErrorLog(uid: string, documents: Array<{ id: string }>, error: unknown): Record<string, unknown> {
  return {
    uid: safeUid(uid),
    documentCount: documents.length,
    documentIds: documents.map((document) => document.id),
    errorMessage: errorMessage(error),
  };
}

/** Payload de log de falha de auditoria — actionId, nunca a auditoria completa. */
export function auditErrorLog(uid: string, actionId: string, error: unknown): Record<string, unknown> {
  return {
    uid: safeUid(uid),
    actionId,
    errorMessage: errorMessage(error),
  };
}

interface PendingDocument {
  uid?: unknown;
  nonce?: unknown;
  confirmationToken?: unknown;
  status?: unknown;
  createdAt?: unknown;
  expiresAt?: unknown;
  createdAtMs?: unknown;
  expiresAtMs?: unknown;
  envelope?: unknown;
  recap?: unknown;
  warnings?: unknown;
  executionId?: unknown;
  result?: unknown;
  /** Alvos de uma operação em massa (delete) gravados na fase de plano. */
  targets?: unknown;
  /** Alvo de uma edição (compromisso único) gravado na fase de plano. */
  target?: unknown;
  /** Estado atual do compromisso em uma edição. */
  before?: unknown;
  /** Estado alvo do compromisso em uma edição. */
  after?: unknown;
}

interface CommitDocument {
  id: string;
  data: Record<string, unknown>;
}

interface CommitAudit {
  actionId: string;
  uid: string;
  token: string;
  status: 'committed' | 'failed' | 'partial';
  intent: 'create' | 'delete' | 'edit';
  idsCreated: string[];
  idsDeleted: string[];
  idsEdited: string[];
  seriesId?: string;
  before: unknown;
  after: unknown;
  requestHash: string;
  createdAtMs: number;
  completedAtMs: number;
  error?: string;
}

export interface CommitResult {
  success: true;
  actionId: string;
  status: 'committed';
  intent: 'create' | 'delete' | 'edit';
  idsCreated: string[];
  idsDeleted: string[];
  idsEdited: string[];
  seriesId?: string;
  occurrenceCount: number;
}

/**
 * Resultado parcial estruturado (máquina-legível): parte dos documentos foi
 * gravada antes da falha. O chamador (hook) consome `status === 'partial'`
 * para guiar reconciliação — sem depender de regex sobre mensagem de erro.
 */
export interface PartialCommitResult {
  success: false;
  actionId: string;
  status: 'partial';
  intent: 'create' | 'delete' | 'edit';
  idsCreated: string[];
  idsDeleted: string[];
  idsEdited: string[];
  seriesId?: string;
  occurrenceCount: number;
  error: string;
}

export interface CommitDependencies {
  claimPending(uid: string, token: string, nowMs: number, executionId: string): Promise<
    | { kind: 'claimed'; pending: PendingDocument }
    | { kind: 'idempotent'; result: CommitResult | PartialCommitResult }
    | { kind: 'rejected'; reason: string }
  >;
  existingIds(uid: string, ids: string[]): Promise<string[]>;
  writeBatch(uid: string, documents: CommitDocument[]): Promise<void>;
  deleteBatch(uid: string, ids: string[]): Promise<void>;
  /** Lê o documento atual de um compromisso (para revalidar edições). */
  readCommitment(uid: string, id: string): Promise<Record<string, unknown> | null>;
  /** Grava o documento atualizado de um compromisso (edição). */
  updateCommitment(uid: string, id: string, data: Record<string, unknown>): Promise<void>;
  finalizePending(uid: string, token: string, patch: Record<string, unknown>): Promise<void>;
  writeAudit(uid: string, actionId: string, audit: CommitAudit): Promise<void>;
}

export interface CommitRequest {
  confirmationToken: string;
  confirmed: boolean;
  /**
   * Modo de aviso explícito (Opção 2): 'notification' (apenas notificação
   * visual) ou 'notification_alarm' (notificação + som/vibração quando o
   * dispositivo permitir). Compatível com o campo legado `alarm`.
   */
  reminderMode?: 'notification' | 'notification_alarm';
  /** Modo legado: TRUE = ativar notificação; omitido/undefined = apenas anotar. */
  alarm?: boolean;
}

/** Modo de aviso resolvido para gravação nas ocorrências. */
export type ResolvedReminderMode = 'notification' | 'notification_alarm' | 'none';

/**
 * Resolve o modo de aviso final a partir da requisição. `reminderMode` explícito
 * tem prioridade; o booleano legado `alarm === true` vira 'notification'
 * (mesma semântica da UI anterior "Ativar alarme").
 */
export function resolveReminderMode(request: CommitRequest): ResolvedReminderMode {
  if (request.reminderMode === 'notification' || request.reminderMode === 'notification_alarm') {
    return request.reminderMode;
  }
  return request.alarm === true ? 'notification' : 'none';
}

export function requireCommitAuth(request: { auth?: { uid?: string } | null }): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Login necessário para confirmar a Agenda.');
  return uid;
}

function timestampMs(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return undefined;
}

function minutes(value?: string): number {
  if (!value) return 0;
  const [hour, minute] = value.split(':').map(Number);
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function timestampForOccurrence(isoDate: string, time?: string): Timestamp {
  const range = saoPauloDayRangeMillis(isoToYmd(isoDate));
  return Timestamp.fromMillis(range.startMs + minutes(time) * 60000);
}

function requestHash(uid: string, token: string, confirmed: boolean): string {
  return createHash('sha1').update(`${uid}|${token}|${String(confirmed)}`).digest('hex');
}

function validatePendingEnvelope(pending: PendingDocument): AgendaEnvelope {
  const result = parseAndValidateAgendaEnvelope(JSON.stringify(pending.envelope));
  if (!result.ok) throw new Error(`Proposta inválida: ${result.errors.join('; ')}`);
  return result.data;
}

function buildCreateDocuments(
  uid: string,
  envelope: AgendaEnvelope,
  actionId: string,
  token: string,
  reminderMode: ResolvedReminderMode,
): { documents: CommitDocument[]; seriesId?: string; occurrenceCount: number } {
  if (envelope.intent !== 'create' || envelope.action !== 'create_commitment') {
    throw new Error('Somente propostas create_commitment podem ser executadas nesta fase.');
  }

  const title = envelope.entities.title;
  const date = envelope.entities.date?.resolved;
  if (!title || !date) throw new Error('A proposta não possui título e data resolvida.');

  const recurrence = envelope.entities.recurrence;
  const until = recurrence?.until?.resolved;
  const expansion = recurrence
    ? expandRecurrence({
        freq: recurrence.freq as RecurrenceFreq,
        startIso: date,
        untilIso: until,
      }, MAX_COMMIT_OCCURRENCES)
    : { occurrences: [date], truncated: false };

  if (expansion.truncated || expansion.occurrences.length > MAX_COMMIT_OCCURRENCES) {
    throw new Error(`A proposta excede o limite de ${MAX_COMMIT_OCCURRENCES} ocorrências.`);
  }

  const seriesId = recurrence ? generateSeriesId(title, date) : undefined;
  const now = Timestamp.now();
  const documents = expansion.occurrences.map((occurrence) => {
    const id = generateCommitmentId(seriesId ?? null, occurrence, envelope.entities.startTime ?? '');
    const data: Record<string, unknown> = {
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

    if (seriesId) data.seriesId = seriesId;
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
    if (envelope.entities.location !== undefined) data.location = envelope.entities.location;
    if (envelope.entities.participants !== undefined) data.participants = envelope.entities.participants;
    if (envelope.entities.notes !== undefined) data.notes = envelope.entities.notes;

    return { id, data };
  });

  void uid;
  return { documents, seriesId, occurrenceCount: documents.length };
}

/** Alvos de exclusão gravados na fase de plano (só os IDs importam). */
function parseDeleteTargets(value: unknown): Array<{ id: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { id: string } => Boolean(item) && typeof (item as { id?: unknown }).id === 'string' && (item as { id: string }).id.length > 0)
    .map((item) => ({ id: item.id }));
}

/** Alvo da edição gravado na fase de plano. */
function parseEditTarget(value: unknown): { id: string } | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== 'string' || item.id.length === 0) return null;
  return { id: item.id };
}

function optionalString(value: unknown): string | null | undefined {
  if (typeof value === 'string') return value;
  if (value === null) return null;
  return undefined;
}

/** Estado editável antes/depois gravado na fase de plano. */
function parseEditSnapshot(value: unknown): AgendaEditSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.title !== 'string' || item.title.length === 0) return null;
  if (typeof item.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return null;
  const participants = Array.isArray(item.participants) && item.participants.every((participant) => typeof participant === 'string')
    ? (item.participants as string[])
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

/** Estado editável atual de um documento Firestore. */
function editSnapshotFromDoc(data: Record<string, unknown>): AgendaEditSnapshot {
  const dateField = data.date as { toMillis?: () => number } | undefined;
  const dateMs = dateField?.toMillis?.();
  const participants = Array.isArray(data.participants) && data.participants.every((participant) => typeof participant === 'string')
    ? (data.participants as string[])
    : null;
  return {
    title: typeof data.title === 'string' ? data.title : '',
    date: typeof dateMs === 'number' && Number.isFinite(dateMs) ? isoFromDateMs(dateMs) : '',
    startTime: typeof data.time === 'string' ? data.time : null,
    endTime: typeof data.endTime === 'string' ? data.endTime : null,
    location: typeof data.location === 'string' ? data.location : null,
    participants,
    notes: typeof data.notes === 'string' ? data.notes : null,
  };
}

function snapshotsEqual(a: AgendaEditSnapshot, b: AgendaEditSnapshot): boolean {
  return a.title === b.title
    && a.date === b.date
    && (a.startTime ?? null) === (b.startTime ?? null)
    && (a.endTime ?? null) === (b.endTime ?? null)
    && (a.location ?? null) === (b.location ?? null)
    && JSON.stringify(a.participants ?? null) === JSON.stringify(b.participants ?? null)
    && (a.notes ?? null) === (b.notes ?? null);
}

/** Aplica o estado alvo preservando os campos protegidos (createdBy, seriesId, completed, alarmAt…). */
function applyEditData(
  current: Record<string, unknown>,
  after: AgendaEditSnapshot,
  actionId: string,
): Record<string, unknown> {
  const now = Timestamp.now();
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

type ExecutionPlan =
  | { kind: 'create'; documents: CommitDocument[]; seriesId?: string; occurrenceCount: number }
  | { kind: 'delete'; targetIds: string[]; occurrenceCount: number }
  | { kind: 'edit'; targetId: string; before: AgendaEditSnapshot; after: AgendaEditSnapshot };

function buildExecutionPlan(
  envelope: AgendaEnvelope,
  pending: PendingDocument,
  actionId: string,
  token: string,
  reminderMode: ResolvedReminderMode,
): ExecutionPlan {
  if (envelope.intent === 'create' && envelope.action === 'create_commitment') {
    const { documents, seriesId, occurrenceCount } = buildCreateDocuments('', envelope, actionId, token, reminderMode);
    return { kind: 'create', documents, seriesId, occurrenceCount };
  }
  if (envelope.intent === 'delete' && envelope.action === 'delete_commitment') {
    const targets = parseDeleteTargets(pending.targets);
    if (targets.length === 0) throw new Error('A proposta de exclusão não possui alvos gravados.');
    return { kind: 'delete', targetIds: targets.map((target) => target.id), occurrenceCount: targets.length };
  }
  if (envelope.intent === 'edit' && envelope.action === 'edit_commitment') {
    const target = parseEditTarget(pending.target);
    const before = parseEditSnapshot(pending.before);
    const after = parseEditSnapshot(pending.after);
    if (!target) throw new Error('A proposta de edição não possui alvo gravado.');
    if (!before || !after) throw new Error('A proposta de edição não possui estado antes/depois gravado.');
    return { kind: 'edit', targetId: target.id, before, after };
  }
  throw new Error('Somente propostas create_commitment, delete_commitment ou edit_commitment podem ser executadas nesta fase.');
}

export async function executeAgendaCommit(
  uid: string,
  request: CommitRequest,
  dependencies: CommitDependencies,
  now = Date.now(),
): Promise<CommitResult | PartialCommitResult> {
  if (!request.confirmed) throw new HttpsError('failed-precondition', 'A confirmação explícita é obrigatória.');
  if (!request.confirmationToken || typeof request.confirmationToken !== 'string') {
    throw new HttpsError('invalid-argument', 'confirmationToken é obrigatório.');
  }
  if (request.alarm !== undefined && typeof request.alarm !== 'boolean') {
    throw new HttpsError('invalid-argument', 'alarm deve ser booleano quando informado.');
  }
  if (
    request.reminderMode !== undefined
    && request.reminderMode !== 'notification'
    && request.reminderMode !== 'notification_alarm'
  ) {
    throw new HttpsError('invalid-argument', 'reminderMode deve ser "notification" ou "notification_alarm" quando informado.');
  }

  const executionId = `exec_${createHash('sha1').update(`${uid}|${request.confirmationToken}|${now}`).digest('hex').slice(0, 20)}`;
  const claimed = await dependencies.claimPending(uid, request.confirmationToken, now, executionId);
  if (claimed.kind === 'idempotent') return claimed.result;
  if (claimed.kind === 'rejected') throw new HttpsError('failed-precondition', claimed.reason);

  const actionId = `act_${executionId.slice(5)}`;
  const pending = claimed.pending;
  const createdAtMs = timestampMs(pending.createdAtMs) ?? timestampMs(pending.createdAt) ?? now;
  const expiresAtMs = timestampMs(pending.expiresAtMs) ?? timestampMs(pending.expiresAt);
  if (pending.uid !== uid) throw new HttpsError('permission-denied', 'A proposta não pertence ao usuário autenticado.');
  if (pending.status !== 'processing') throw new HttpsError('failed-precondition', 'A proposta não está em processamento.');
  if (!expiresAtMs || expiresAtMs <= now) throw new HttpsError('deadline-exceeded', 'A proposta de agenda expirou.');
  if (pending.nonce !== request.confirmationToken || pending.confirmationToken !== request.confirmationToken) {
    throw new HttpsError('failed-precondition', 'O token da proposta é inválido.');
  }
  if (now < createdAtMs) throw new HttpsError('failed-precondition', 'A data da proposta é inválida.');

  let documents: CommitDocument[] = [];
  let committedIds: string[] = [];
  let deletedIds: string[] = [];
  let editedIds: string[] = [];
  let seriesId: string | undefined;
  let intent: 'create' | 'delete' | 'edit' = 'create';
  let targetRecords: Record<string, unknown>[] = [];
  let editBeforeRecord: Record<string, unknown> | null = null;
  let editAfterRecord: Record<string, unknown> | null = null;
  try {
    const envelope = validatePendingEnvelope(pending);
    const plan = buildExecutionPlan(envelope, pending, actionId, request.confirmationToken, resolveReminderMode(request));
    intent = plan.kind;
    if (plan.kind === 'create') {
      documents = plan.documents;
      seriesId = plan.seriesId;
      const alreadyExisting = await dependencies.existingIds(uid, documents.map((document) => document.id));
      if (alreadyExisting.length > 0) throw new Error(`Compromissos já existentes: ${alreadyExisting.join(', ')}`);
      for (let index = 0; index < documents.length; index += MAX_COMMIT_BATCH_WRITES) {
        const batchDocuments = documents.slice(index, index + MAX_COMMIT_BATCH_WRITES);
        await dependencies.writeBatch(uid, batchDocuments);
        committedIds = committedIds.concat(batchDocuments.map((document) => document.id));
      }
    } else if (plan.kind === 'delete') {
      const existing = await dependencies.existingIds(uid, plan.targetIds);
      if (existing.length === 0) throw new Error('Nenhum dos compromissos alvo ainda existe.');
      for (let index = 0; index < existing.length; index += MAX_COMMIT_BATCH_WRITES) {
        const batch = existing.slice(index, index + MAX_COMMIT_BATCH_WRITES);
        await dependencies.deleteBatch(uid, batch);
        deletedIds = deletedIds.concat(batch);
      }
      targetRecords = plan.targetIds.map((id) => ({ id }));
    } else {
      const current = await dependencies.readCommitment(uid, plan.targetId);
      if (!current) throw new Error('O compromisso alvo da edição não existe mais.');
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
    const result: CommitResult = {
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
  } catch (error) {
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
      // Parcial é resposta estruturada (não exceção): o hook diferencia
      // 'partial' de 'failed' pelo contrato, sem regex sobre texto.
      const partialResult: PartialCommitResult = {
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
    throw new HttpsError(
      'internal',
      `Não foi possível executar a proposta de agenda. (${message})`,
    );
  }
}

function buildFirestoreDependencies(db: ReturnType<typeof getFirestore>): CommitDependencies {
  const pendingPath = (uid: string, token: string) => `users/${uid}/agenda/_nexus/pending/${token}`;
  const agendaPath = (uid: string, id: string) => `users/${uid}/agenda/${id}`;
  const auditPath = (uid: string, actionId: string) => `users/${uid}/agenda/_nexus/audit/${actionId}`;

  return {
    async claimPending(uid, token, nowMs, executionId) {
      try {
        return await db.runTransaction(async (transaction) => {
          const ref = db.doc(pendingPath(uid, token));
          const snapshot = await transaction.get(ref);
          if (!snapshot.exists) return { kind: 'rejected' as const, reason: 'Proposta inexistente.' };
          const pending = snapshot.data() as PendingDocument;
          if (pending.uid !== uid) return { kind: 'rejected' as const, reason: 'A proposta não pertence ao usuário autenticado.' };
          if (pending.status === 'committed' && pending.result) return { kind: 'idempotent' as const, result: pending.result as CommitResult };
          if (pending.status !== 'awaiting_confirmation') return { kind: 'rejected' as const, reason: 'A proposta já foi consumida ou não está disponível.' };
          const expiresAt = timestampMs(pending.expiresAtMs) ?? timestampMs(pending.expiresAt);
          if (!expiresAt || expiresAt <= nowMs) return { kind: 'rejected' as const, reason: 'A proposta de agenda expirou.' };
          transaction.update(ref, sanitizeForFirestore({ status: 'processing', executionId, processingAt: Timestamp.fromMillis(nowMs) }) as Record<string, unknown>);
          return { kind: 'claimed' as const, pending: { ...pending, status: 'processing', executionId } };
        });
      } catch (error) {
        logger.error('nexusAgendaCommit: falha ao reivindicar proposta no Firestore.', { uid: safeUid(uid), token: safeToken(token), executionId, errorMessage: errorMessage(error) });
        throw error;
      }
    },
    async existingIds(uid, ids) {
      const snapshots = await getAllInBatches(
        db as unknown as GetAllCapable,
        (ownerId, id) => db.doc(agendaPath(ownerId, id)),
        uid,
        ids,
      );
      return snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.id);
    },
    async writeBatch(uid, documents) {
      try {
        const batch = db.batch();
        for (const document of documents) {
          batch.set(db.doc(agendaPath(uid, document.id)), sanitizeForFirestore(document.data) as Record<string, unknown>, { merge: false });
        }
        await batch.commit();
      } catch (error) {
        logger.error('nexusAgendaCommit: falha ao gravar lote de compromissos.', batchWriteErrorLog(uid, documents, error));
        throw error;
      }
    },
    async deleteBatch(uid, ids) {
      try {
        const batch = db.batch();
        for (const id of ids) batch.delete(db.doc(agendaPath(uid, id)));
        await batch.commit();
      } catch (error) {
        logger.error('nexusAgendaCommit: falha ao excluir lote de compromissos.', { uid: safeUid(uid), idCount: ids.length, errorMessage: errorMessage(error) });
        throw error;
      }
    },
    async readCommitment(uid, id) {
      try {
        const snapshot = await db.doc(agendaPath(uid, id)).get();
        return snapshot.exists ? snapshot.data() as Record<string, unknown> : null;
      } catch (error) {
        logger.error('nexusAgendaCommit: falha ao ler compromisso alvo da edição.', { uid: safeUid(uid), id, errorMessage: errorMessage(error) });
        throw error;
      }
    },
    async updateCommitment(uid, id, data) {
      try {
        await db.doc(agendaPath(uid, id)).set(sanitizeForFirestore(data) as Record<string, unknown>, { merge: false });
      } catch (error) {
        logger.error('nexusAgendaCommit: falha ao atualizar compromisso.', { uid: safeUid(uid), id, errorMessage: errorMessage(error) });
        throw error;
      }
    },
    async finalizePending(uid, token, patch) {
      try {
        await db.doc(pendingPath(uid, token)).update(sanitizeForFirestore({ ...patch, updatedAt: Timestamp.now() }) as Record<string, unknown>);
      } catch (error) {
        logger.error('nexusAgendaCommit: falha ao finalizar proposta no Firestore.', { uid: safeUid(uid), token: safeToken(token), errorMessage: errorMessage(error) });
        throw error;
      }
    },
    async writeAudit(uid, actionId, audit) {
      try {
        await db.doc(auditPath(uid, actionId)).set(sanitizeForFirestore({
          ...audit,
          createdAt: Timestamp.fromMillis(audit.createdAtMs),
          completedAt: Timestamp.fromMillis(audit.completedAtMs),
        }) as Record<string, unknown>);
      } catch (error) {
        logger.error('nexusAgendaCommit: falha ao gravar auditoria no Firestore.', auditErrorLog(uid, actionId, error));
        throw error;
      }
    },
  };
}

export const nexusAgendaCommit = onCall(
  { memory: '1GiB', timeoutSeconds: 120, region: 'us-central1' },
  async (request) => {
    const uid = requireCommitAuth(request);
    const data = request.data as Partial<CommitRequest> | undefined;
    if (!data || typeof data.confirmationToken !== 'string' || typeof data.confirmed !== 'boolean') {
      throw new HttpsError('invalid-argument', 'confirmationToken e confirmed são obrigatórios.');
    }
    try {
      return await executeAgendaCommit(
        uid,
        {
          confirmationToken: data.confirmationToken,
          confirmed: data.confirmed,
          alarm: typeof data.alarm === 'boolean' ? data.alarm : undefined,
          reminderMode: data.reminderMode === 'notification' || data.reminderMode === 'notification_alarm'
            ? data.reminderMode
            : undefined,
        },
        buildFirestoreDependencies(getFirestore()),
      );
    } catch (error) {
      if (error instanceof HttpsError && error.code !== 'internal') throw error;
      logger.error('nexusAgendaCommit: falha interna ao registrar a operação.', { errorMessage: errorMessage(error) });
      return {
        success: false,
        error: 'Não foi possível registrar a operação. Verifique os logs.',
      };
    }
  },
);
