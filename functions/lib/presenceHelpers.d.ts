import { getFirestore } from 'firebase-admin/firestore';
export declare const URGENCY_SCORE: Record<string, number>;
export declare function cooldownOk(db: ReturnType<typeof getFirestore>, uid: string, eventType: string, resourceId: string | null, cooldownHours: number, nowMs: number): Promise<boolean>;
export declare function pendingExists(db: ReturnType<typeof getFirestore>, uid: string, eventType: string, resourceId: string | null): Promise<boolean>;
export interface CreateEventParams {
    eventType: string;
    persona: 'debts' | 'wealth' | 'cashflow';
    urgency: 'high' | 'medium' | 'low';
    message: {
        title: string;
        body: string;
        ctaLabel: string;
    };
    deepLink: string;
    channel: 'push' | 'in_app' | 'email';
    cooldownHours: number;
    expiresInHours: number;
    resourceId?: string;
    payload?: Record<string, unknown>;
}
export declare function createEvent(db: ReturnType<typeof getFirestore>, uid: string, nowMs: number, params: CreateEventParams): Promise<void>;
