import { getFirestore } from 'firebase-admin/firestore';
import type { AgendaFilter, AgendaIntent, DateResolution, RecurrenceSpec } from './agenda-intent-schema';
export declare const SESSION_TTL_MS: number;
export interface AgendaSessionContext {
    sessionId: string;
    uid: string;
    intent: AgendaIntent;
    title?: string;
    date?: DateResolution;
    startTime?: string;
    endTime?: string;
    recurrence?: RecurrenceSpec;
    limitDate?: DateResolution;
    maxSlots?: boolean;
    filter?: AgendaFilter;
    location?: string | null;
    participants?: string[] | null;
    notes?: string | null;
    missing: string[];
    createdAtMs: number;
    expiresAtMs: number;
}
export interface SessionStore {
    read(uid: string, sessionId: string): Promise<AgendaSessionContext | null>;
    write(context: AgendaSessionContext): Promise<void>;
}
export declare function readSessionContext(db: ReturnType<typeof getFirestore>, uid: string, sessionId: string): Promise<AgendaSessionContext | null>;
export declare function writeSessionContext(db: ReturnType<typeof getFirestore>, context: AgendaSessionContext): Promise<void>;
