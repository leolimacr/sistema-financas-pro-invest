export declare const UNDO_TTL_MS: number;
export declare const UNDO_BATCH_SIZE = 400;
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
export interface PartialUndoResult {
    success: false;
    actionId: string;
    status: 'partial';
    idsRemoved: string[];
    error: string;
}
export interface UndoDependencies {
    claimAudit(uid: string, actionId: string, nowMs: number, undoId: string): Promise<{
        kind: 'claimed';
        audit: AuditDocument;
    } | {
        kind: 'rejected';
        reason: string;
    } | {
        kind: 'idempotent';
        result: UndoResult;
    }>;
    readOwnedDocuments(uid: string, ids: string[], actionId: string, token: string): Promise<OwnedDocument[]>;
    deleteBatch(uid: string, documents: OwnedDocument[]): Promise<void>;
    finalizeAudit(uid: string, actionId: string, patch: Record<string, unknown>): Promise<void>;
}
export interface UndoRequest {
    actionId: string;
}
export declare function requireUndoAuth(request: {
    auth?: {
        uid?: string;
    } | null;
}): string;
export declare function executeAgendaUndo(uid: string, request: UndoRequest, dependencies: UndoDependencies, now?: number): Promise<UndoResult | PartialUndoResult>;
export declare const nexusAgendaUndo: import("firebase-functions/v2/https").CallableFunction<any, Promise<UndoResult | PartialUndoResult>, unknown>;
export {};
