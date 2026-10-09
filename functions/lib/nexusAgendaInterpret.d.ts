import { getFirestore } from 'firebase-admin/firestore';
import { type AgendaEditSnapshot, type AgendaEnvelope } from './nexus-core/agenda-intent-schema';
import { type AgendaSessionContext, type SessionStore } from './nexus-core/agenda-session';
export declare function deleteScanCutoffMs(nowMs?: number): number;
export declare const TIME_GAP_REFINEMENT: AgendaRefinement;
export interface InterpretRequestData {
    prompt: string;
    history?: Array<{
        role: string;
        text: string;
    }>;
    sessionId?: string;
}
export interface StoredAgendaCommitment {
    id: string;
    title: string;
    time?: string | null;
    endTime?: string | null;
    dateMs: number;
    seriesId?: string | null;
    location?: string | null;
    participants?: string[] | null;
    notes?: string | null;
}
export interface AgendaReader {
    onDay(uid: string, isoDate: string): Promise<StoredAgendaCommitment[]>;
    onPeriod(uid: string, startMs: number, endMs: number): Promise<StoredAgendaCommitment[]>;
    upcoming(uid: string, max: number): Promise<StoredAgendaCommitment[]>;
    searchByTitle(uid: string, title: string, opts?: {
        maxResults?: number;
        sinceMs?: number;
    }): Promise<StoredAgendaCommitment[]>;
}
export interface PendingWriter {
    write(uid: string, token: string, document: Record<string, unknown>): Promise<void>;
}
export interface AgendaRouter {
    routeRequest(messages: unknown[], systemPrompt?: string, options?: Record<string, unknown>): Promise<{
        content: string;
        success?: boolean;
        isContingency?: boolean;
    }>;
}
export interface InterpretDependencies {
    router: AgendaRouter;
    agenda: AgendaReader;
    pending: PendingWriter;
    session: SessionStore;
    now?: Date;
    requestId?: string;
}
export interface AgendaWarning {
    type: 'conflict' | 'duplicate' | 'truncated';
    date?: string;
    message: string;
}
export interface AgendaAffectedItem {
    id: string;
    title: string;
    time?: string | null;
    endTime?: string | null;
    dateMs: number;
}
export interface AgendaRecap {
    intent: AgendaEnvelope['intent'];
    action: AgendaEnvelope['action'];
    title?: string;
    startTime?: string;
    endTime?: string;
    firstDate?: string;
    lastDate?: string;
    occurrenceCount: number;
    recurrence?: {
        freq: string;
        byDay?: number;
        until?: string;
    };
    matchCount?: number;
    scannedCount?: number;
    affectedItems?: AgendaAffectedItem[];
    truncated?: boolean;
    before?: AgendaEditSnapshot;
    after?: AgendaEditSnapshot;
    summary: string;
}
export interface AgendaRefinement {
    question: string;
    suggestions: string[];
}
export type InterpretResponse = {
    success: true;
    outcome: 'proposal';
    status: 'awaiting_confirmation';
    confirmationToken: string;
    expiresAtMs: number;
    recap: AgendaRecap;
    warnings: AgendaWarning[];
} | {
    success: true;
    outcome: 'clarification';
    status: 'awaiting_clarification';
    question: string | null;
    clarification: {
        missing: string[];
        ambiguous: string[];
        questions: string[];
        refinement?: AgendaRefinement;
    };
} | {
    success: true;
    outcome: 'query_result';
    status: 'ok';
    commitments: Array<{
        id: string;
        title: string;
        time?: string | null;
        dateMs: number;
    }>;
} | {
    success: false;
    error: string;
};
export declare function requireAuth(request: {
    auth?: {
        uid?: string;
    } | null;
}): string;
export declare function buildSystemPrompt(now: Date, context?: AgendaSessionContext): string;
export declare function buildMessages(prompt: string, history: Array<{
    role: string;
    text: string;
}>): unknown[];
export declare function inferStartTimeFromTitle(title: string): string | null;
export declare function rankByTitle(needle: string, candidate: string): number;
export declare function orchestrateAgendaInterpret(uid: string, data: InterpretRequestData, dependencies: InterpretDependencies): Promise<InterpretResponse>;
export declare function buildFirestoreDependencies(db: ReturnType<typeof getFirestore>): Omit<InterpretDependencies, 'router' | 'now'>;
export declare const nexusAgendaInterpret: import("firebase-functions/v2/https").CallableFunction<any, Promise<InterpretResponse>, unknown>;
