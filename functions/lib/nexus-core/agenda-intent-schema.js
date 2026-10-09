"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agendaEnvelopeSchema = exports.assumptionSchema = exports.entitiesSchema = exports.agendaFilterSchema = exports.recurrenceSchema = exports.dateResolutionSchema = exports.WRITE_INTENTS = exports.CONFIDENCE_VALUES = exports.RECURRENCE_FREQS = exports.AGENDA_ACTIONS = exports.AGENDA_INTENTS = void 0;
exports.actionMatchesIntent = actionMatchesIntent;
exports.parseAgendaEnvelope = parseAgendaEnvelope;
exports.validateAgendaEnvelope = validateAgendaEnvelope;
exports.parseAndValidateAgendaEnvelope = parseAndValidateAgendaEnvelope;
const zod_1 = require("zod");
exports.AGENDA_INTENTS = ['create', 'edit', 'delete', 'query', 'clarify'];
exports.AGENDA_ACTIONS = [
    'create_commitment',
    'edit_commitment',
    'delete_commitment',
    'query_commitments',
    'query_clarification',
];
exports.RECURRENCE_FREQS = ['daily', 'weekly', 'monthly'];
exports.CONFIDENCE_VALUES = ['high', 'low'];
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
exports.WRITE_INTENTS = new Set(['create', 'edit', 'delete']);
exports.dateResolutionSchema = zod_1.z.object({
    expression: zod_1.z.string().min(1),
    resolved: zod_1.z.string().regex(ISO_DATE_REGEX, 'resolved deve ser uma data ISO no formato YYYY-MM-DD'),
    confidence: zod_1.z.enum(exports.CONFIDENCE_VALUES),
});
exports.recurrenceSchema = zod_1.z.object({
    freq: zod_1.z.enum(exports.RECURRENCE_FREQS),
    byDay: zod_1.z
        .union([
        zod_1.z.number().int().min(1).max(7),
        zod_1.z.array(zod_1.z.number().int().min(1).max(7)).min(1).max(7),
    ])
        .optional(),
    until: exports.dateResolutionSchema.optional(),
});
exports.agendaFilterSchema = zod_1.z
    .object({
    field: zod_1.z.enum(['title', 'date'], { message: 'filter.field deve ser "title" ou "date"' }),
    value: zod_1.z.string().min(1).max(200),
})
    .strict();
exports.entitiesSchema = zod_1.z
    .object({
    title: zod_1.z.string().min(1).max(200).optional(),
    date: exports.dateResolutionSchema.optional(),
    startTime: zod_1.z
        .string()
        .regex(ISO_TIME_REGEX, 'startTime deve estar no formato HH:mm')
        .nullable()
        .optional(),
    endTime: zod_1.z
        .string()
        .regex(ISO_TIME_REGEX, 'endTime deve estar no formato HH:mm')
        .nullable()
        .optional(),
    recurrence: exports.recurrenceSchema.optional(),
    location: zod_1.z
        .string()
        .max(200)
        .nullable()
        .optional(),
    participants: zod_1.z
        .array(zod_1.z.string().min(1).max(80))
        .max(20)
        .nullable()
        .optional(),
    notes: zod_1.z.string().max(2000).nullable().optional(),
    timeZone: zod_1.z.string().max(60).optional(),
    filter: exports.agendaFilterSchema.optional(),
    limitDate: exports.dateResolutionSchema.optional(),
    maxSlots: zod_1.z.boolean().optional(),
})
    .strict();
exports.assumptionSchema = zod_1.z
    .object({
    field: zod_1.z.string().min(1),
    note: zod_1.z.string().min(1),
})
    .strict();
exports.agendaEnvelopeSchema = zod_1.z
    .object({
    intent: zod_1.z.enum(exports.AGENDA_INTENTS),
    action: zod_1.z.enum(exports.AGENDA_ACTIONS),
    entities: exports.entitiesSchema,
    missing: zod_1.z.array(zod_1.z.string().min(1)).max(20).default([]),
    ambiguous: zod_1.z.array(zod_1.z.string().min(1)).max(20).default([]),
    assumptions: zod_1.z.array(exports.assumptionSchema).max(20).default([]),
})
    .strict();
const INTENT_ACTION_MAP = {
    create: 'create_commitment',
    edit: 'edit_commitment',
    delete: 'delete_commitment',
    query: 'query_commitments',
    clarify: 'query_clarification',
};
function actionMatchesIntent(intent, action) {
    return INTENT_ACTION_MAP[intent] === action;
}
function parseAgendaEnvelope(raw) {
    if (typeof raw !== 'string') {
        return { ok: false, errors: ['Envelope deve ser uma string JSON.'] };
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        return { ok: false, errors: ['Envelope não é um JSON válido.'] };
    }
    const result = exports.agendaEnvelopeSchema.safeParse(parsed);
    if (result.success) {
        return { ok: true, data: result.data };
    }
    return {
        ok: false,
        errors: result.error.issues.map((issue) => {
            const path = issue.path.join('.');
            return path ? `${path}: ${issue.message}` : issue.message;
        }),
    };
}
function validateAgendaEnvelope(env) {
    const errors = [];
    if (!actionMatchesIntent(env.intent, env.action)) {
        errors.push(`A ação "${env.action}" não corresponde à intenção "${env.intent}".`);
    }
    if (env.intent === 'create' || env.intent === 'edit') {
        if (!env.entities.title) {
            errors.push('entities.title é obrigatório para create/edit.');
        }
        if (env.intent === 'create' && !env.entities.date) {
            errors.push('entities.date é obrigatório para create.');
        }
        if (env.entities.date && env.entities.date.confidence === 'low') {
            errors.push('entities.date tem confiança baixa — solicite confirmação da data antes de gravar.');
        }
        if (env.intent === 'edit' && env.entities.recurrence) {
            errors.push('entities.recurrence não é suportado em edição de compromissos.');
        }
        if (env.entities.location !== undefined && env.entities.location === '') {
            errors.push('entities.location não pode ser uma string vazia; use null para ausência.');
        }
    }
    if (env.intent === 'delete') {
        if (!env.entities.date && !env.entities.title && !env.entities.filter) {
            errors.push('delete exige ao menos entities.title, entities.date ou entities.filter para identificar os compromissos.');
        }
        if (env.entities.date && env.entities.date.confidence === 'low') {
            errors.push('entities.date tem confiança baixa — solicite confirmação da data antes de excluir.');
        }
    }
    if (env.entities.recurrence && env.entities.recurrence.freq === 'weekly' && env.entities.recurrence.byDay === undefined) {
        errors.push('entities.recurrence.byDay é obrigatório para recorrência weekly.');
    }
    if (env.entities.maxSlots === true && !env.entities.recurrence) {
        errors.push('entities.maxSlots exige entities.recurrence para limitar o número de ocorrências.');
    }
    if (env.entities.endTime && env.entities.startTime && env.entities.endTime <= env.entities.startTime) {
        errors.push('entities.endTime deve ser posterior a entities.startTime.');
    }
    return { valid: errors.length === 0, errors };
}
function parseAndValidateAgendaEnvelope(raw) {
    const parsed = parseAgendaEnvelope(raw);
    if (!parsed.ok)
        return parsed;
    const validation = validateAgendaEnvelope(parsed.data);
    if (!validation.valid)
        return { ok: false, errors: validation.errors };
    return { ok: true, data: parsed.data };
}
//# sourceMappingURL=agenda-intent-schema.js.map