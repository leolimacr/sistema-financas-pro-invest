import { z } from 'zod';
export declare const AGENDA_INTENTS: readonly ["create", "edit", "delete", "query", "clarify"];
export type AgendaIntent = (typeof AGENDA_INTENTS)[number];
export declare const AGENDA_ACTIONS: readonly ["create_commitment", "edit_commitment", "delete_commitment", "query_commitments", "query_clarification"];
export type AgendaAction = (typeof AGENDA_ACTIONS)[number];
export declare const RECURRENCE_FREQS: readonly ["daily", "weekly", "monthly"];
export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number];
export declare const CONFIDENCE_VALUES: readonly ["high", "low"];
export type ConfidenceValue = (typeof CONFIDENCE_VALUES)[number];
export declare const WRITE_INTENTS: ReadonlySet<AgendaIntent>;
export declare const dateResolutionSchema: z.ZodObject<{
    expression: z.ZodString;
    resolved: z.ZodString;
    confidence: z.ZodEnum<{
        low: "low";
        high: "high";
    }>;
}, z.core.$strip>;
export type DateResolution = z.infer<typeof dateResolutionSchema>;
export declare const recurrenceSchema: z.ZodObject<{
    freq: z.ZodEnum<{
        monthly: "monthly";
        daily: "daily";
        weekly: "weekly";
    }>;
    byDay: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodArray<z.ZodNumber>]>>;
    until: z.ZodOptional<z.ZodObject<{
        expression: z.ZodString;
        resolved: z.ZodString;
        confidence: z.ZodEnum<{
            low: "low";
            high: "high";
        }>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type RecurrenceSpec = z.infer<typeof recurrenceSchema>;
export declare const agendaFilterSchema: z.ZodObject<{
    field: z.ZodEnum<{
        date: "date";
        title: "title";
    }>;
    value: z.ZodString;
}, z.core.$strict>;
export type AgendaFilter = z.infer<typeof agendaFilterSchema>;
export declare const entitiesSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    date: z.ZodOptional<z.ZodObject<{
        expression: z.ZodString;
        resolved: z.ZodString;
        confidence: z.ZodEnum<{
            low: "low";
            high: "high";
        }>;
    }, z.core.$strip>>;
    startTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    endTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    recurrence: z.ZodOptional<z.ZodObject<{
        freq: z.ZodEnum<{
            monthly: "monthly";
            daily: "daily";
            weekly: "weekly";
        }>;
        byDay: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodArray<z.ZodNumber>]>>;
        until: z.ZodOptional<z.ZodObject<{
            expression: z.ZodString;
            resolved: z.ZodString;
            confidence: z.ZodEnum<{
                low: "low";
                high: "high";
            }>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    participants: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    timeZone: z.ZodOptional<z.ZodString>;
    filter: z.ZodOptional<z.ZodObject<{
        field: z.ZodEnum<{
            date: "date";
            title: "title";
        }>;
        value: z.ZodString;
    }, z.core.$strict>>;
    limitDate: z.ZodOptional<z.ZodObject<{
        expression: z.ZodString;
        resolved: z.ZodString;
        confidence: z.ZodEnum<{
            low: "low";
            high: "high";
        }>;
    }, z.core.$strip>>;
    maxSlots: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>;
export type AgendaEntities = z.infer<typeof entitiesSchema>;
export declare const assumptionSchema: z.ZodObject<{
    field: z.ZodString;
    note: z.ZodString;
}, z.core.$strict>;
export type AgendaAssumption = z.infer<typeof assumptionSchema>;
export declare const agendaEnvelopeSchema: z.ZodObject<{
    intent: z.ZodEnum<{
        create: "create";
        edit: "edit";
        delete: "delete";
        query: "query";
        clarify: "clarify";
    }>;
    action: z.ZodEnum<{
        create_commitment: "create_commitment";
        edit_commitment: "edit_commitment";
        delete_commitment: "delete_commitment";
        query_commitments: "query_commitments";
        query_clarification: "query_clarification";
    }>;
    entities: z.ZodObject<{
        title: z.ZodOptional<z.ZodString>;
        date: z.ZodOptional<z.ZodObject<{
            expression: z.ZodString;
            resolved: z.ZodString;
            confidence: z.ZodEnum<{
                low: "low";
                high: "high";
            }>;
        }, z.core.$strip>>;
        startTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        endTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        recurrence: z.ZodOptional<z.ZodObject<{
            freq: z.ZodEnum<{
                monthly: "monthly";
                daily: "daily";
                weekly: "weekly";
            }>;
            byDay: z.ZodOptional<z.ZodUnion<readonly [z.ZodNumber, z.ZodArray<z.ZodNumber>]>>;
            until: z.ZodOptional<z.ZodObject<{
                expression: z.ZodString;
                resolved: z.ZodString;
                confidence: z.ZodEnum<{
                    low: "low";
                    high: "high";
                }>;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        location: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        participants: z.ZodOptional<z.ZodNullable<z.ZodArray<z.ZodString>>>;
        notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        timeZone: z.ZodOptional<z.ZodString>;
        filter: z.ZodOptional<z.ZodObject<{
            field: z.ZodEnum<{
                date: "date";
                title: "title";
            }>;
            value: z.ZodString;
        }, z.core.$strict>>;
        limitDate: z.ZodOptional<z.ZodObject<{
            expression: z.ZodString;
            resolved: z.ZodString;
            confidence: z.ZodEnum<{
                low: "low";
                high: "high";
            }>;
        }, z.core.$strip>>;
        maxSlots: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>;
    missing: z.ZodDefault<z.ZodArray<z.ZodString>>;
    ambiguous: z.ZodDefault<z.ZodArray<z.ZodString>>;
    assumptions: z.ZodDefault<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        note: z.ZodString;
    }, z.core.$strict>>>;
}, z.core.$strict>;
export type AgendaEnvelope = z.infer<typeof agendaEnvelopeSchema>;
export interface AgendaEditSnapshot {
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    location?: string | null;
    participants?: string[] | null;
    notes?: string | null;
}
export declare function actionMatchesIntent(intent: AgendaIntent, action: AgendaAction): boolean;
export type AgendaEnvelopeParseResult = {
    ok: true;
    data: AgendaEnvelope;
} | {
    ok: false;
    errors: string[];
};
export declare function parseAgendaEnvelope(raw: unknown): AgendaEnvelopeParseResult;
export interface EnvelopeValidation {
    valid: boolean;
    errors: string[];
}
export declare function validateAgendaEnvelope(env: AgendaEnvelope): EnvelopeValidation;
export type AgendaParseOutcome = {
    ok: true;
    data: AgendaEnvelope;
} | {
    ok: false;
    errors: string[];
};
export declare function parseAndValidateAgendaEnvelope(raw: unknown): AgendaParseOutcome;
