export declare const MAX_COMMIT_BATCH_WRITES = 400;
export declare const MAX_COMMIT_OCCURRENCES = 800;
export declare const MAX_READ_BATCH_SIZE = 400;
interface DocumentSnapshotLike {
    readonly exists: boolean;
    readonly id: string;
    data(): Record<string, unknown> | undefined;
}
interface GetAllCapable {
    getAll(...refs: unknown[]): Promise<DocumentSnapshotLike[]>;
}
export declare function getAllInBatches(db: GetAllCapable, docRefs: (uid: string, id: string) => unknown, uid: string, ids: string[]): Promise<DocumentSnapshotLike[]>;
export declare function sanitizeForFirestore(value: unknown): unknown;
export declare function batchWriteErrorLog(uid: string, documents: Array<{
    id: string;
}>, error: unknown): Record<string, unknown>;
export declare function auditErrorLog(uid: string, actionId: string, error: unknown): Record<string, unknown>;
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
    targets?: unknown;
    target?: unknown;
    before?: unknown;
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
    claimPending(uid: string, token: string, nowMs: number, executionId: string): Promise<{
        kind: 'claimed';
        pending: PendingDocument;
    } | {
        kind: 'idempotent';
        result: CommitResult | PartialCommitResult;
    } | {
        kind: 'rejected';
        reason: string;
    }>;
    existingIds(uid: string, ids: string[]): Promise<string[]>;
    writeBatch(uid: string, documents: CommitDocument[]): Promise<void>;
    deleteBatch(uid: string, ids: string[]): Promise<void>;
    readCommitment(uid: string, id: string): Promise<Record<string, unknown> | null>;
    updateCommitment(uid: string, id: string, data: Record<string, unknown>): Promise<void>;
    finalizePending(uid: string, token: string, patch: Record<string, unknown>): Promise<void>;
    writeAudit(uid: string, actionId: string, audit: CommitAudit): Promise<void>;
}
export interface CommitRequest {
    confirmationToken: string;
    confirmed: boolean;
    reminderMode?: 'notification' | 'notification_alarm';
    alarm?: boolean;
}
export type ResolvedReminderMode = 'notification' | 'notification_alarm' | 'none';
export declare function resolveReminderMode(request: CommitRequest): ResolvedReminderMode;
export declare function requireCommitAuth(request: {
    auth?: {
        uid?: string;
    } | null;
}): string;
export declare function executeAgendaCommit(uid: string, request: CommitRequest, dependencies: CommitDependencies, now?: number): Promise<CommitResult | PartialCommitResult>;
export declare const nexusAgendaCommit: import("firebase-functions/v2/https").CallableFunction<any, Promise<CommitResult | PartialCommitResult | {
    success: boolean;
    error: string;
}>, unknown>;
export {};
