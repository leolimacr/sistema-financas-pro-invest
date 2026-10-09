/**
 * AGENDA INTENT SCHEMA - Contrato estrito do envelope JSON que o Nexus produz
 * ao interpretar a intenção do usuário sobre a Agenda.
 *
 * O LLM só PROPÕE o envelope; este módulo garante que ele seja estruturalmente
 * válido antes de qualquer gravação. Regras de negócio por intenção ficam em
 * validateAgendaEnvelope; a evocação do LLM acontece apenas em Fase 3.
 */

import { z } from 'zod';

// ─────────────────────────── Enums e constantes ───────────────────────────

export const AGENDA_INTENTS = ['create', 'edit', 'delete', 'query', 'clarify'] as const;
export type AgendaIntent = (typeof AGENDA_INTENTS)[number];

export const AGENDA_ACTIONS = [
  'create_commitment',
  'edit_commitment',
  'delete_commitment',
  'query_commitments',
  'query_clarification',
] as const;
export type AgendaAction = (typeof AGENDA_ACTIONS)[number];

export const RECURRENCE_FREQS = ['daily', 'weekly', 'monthly'] as const;
export type RecurrenceFreq = (typeof RECURRENCE_FREQS)[number];

export const CONFIDENCE_VALUES = ['high', 'low'] as const;
export type ConfidenceValue = (typeof CONFIDENCE_VALUES)[number];

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

/** Intenções que exigem escrita efetiva no Firestore (contraparte de "query"). */
export const WRITE_INTENTS: ReadonlySet<AgendaIntent> = new Set(['create', 'edit', 'delete']);

// ───────────────────────────── Schemas aninhados ──────────────────────────

export const dateResolutionSchema = z.object({
  /** Expressão original do usuário ("próxima terça-feira"). */
  expression: z.string().min(1),
  /** Data resolvida no fuso America/Sao_Paulo, no formato YYYY-MM-DD. */
  resolved: z.string().regex(ISO_DATE_REGEX, 'resolved deve ser uma data ISO no formato YYYY-MM-DD'),
  confidence: z.enum(CONFIDENCE_VALUES),
});
export type DateResolution = z.infer<typeof dateResolutionSchema>;

/**
 * Dia da semana da recorrência: 1=segunda até 7=domingo. Aceita um número
 * ÚNICO (canônico, o que todo o pipeline downstream usa) OU um array de
 * números (ex.: [1] para segundas) — o interpret normaliza o array para o
 * primeiro elemento em normalizeEnvelopeDates antes da validação. Obrigatório
 * quando freq === 'weekly' (validado em validateAgendaEnvelope).
 */
export const recurrenceSchema = z.object({
  freq: z.enum(RECURRENCE_FREQS),
  byDay: z
    .union([
      z.number().int().min(1).max(7),
      z.array(z.number().int().min(1).max(7)).min(1).max(7),
    ])
    .optional(),
  until: dateResolutionSchema.optional(),
});
export type RecurrenceSpec = z.infer<typeof recurrenceSchema>;

/**
 * Filtro explícito para operações em massa (ex.: delete por título em toda a
 * agenda). `field: 'title'` compara o título normalizado; `field: 'date'`
 * compara o dia civil em America/Sao_Paulo.
 */
export const agendaFilterSchema = z
  .object({
    field: z.enum(['title', 'date'], { message: 'filter.field deve ser "title" ou "date"' }),
    value: z.string().min(1).max(200),
  })
  .strict();
export type AgendaFilter = z.infer<typeof agendaFilterSchema>;

export const entitiesSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    date: dateResolutionSchema.optional(),
    /**
     * Horário de início, formato HH:mm. Aceita null (ausência) — o LLM real
     * emite "startTime": null quando não há horário; o interpret normaliza
     * null → undefined antes das regras de negócio.
     */
    startTime: z
      .string()
      .regex(ISO_TIME_REGEX, 'startTime deve estar no formato HH:mm')
      .nullable()
      .optional(),
    /**
     * Horário de término (duração), formato HH:mm. Aceita null (ausência) — o
     * LLM real emite "endTime": null quando não há duração; o interpret
     * normaliza null → undefined antes das regras de negócio.
     */
    endTime: z
      .string()
      .regex(ISO_TIME_REGEX, 'endTime deve estar no formato HH:mm')
      .nullable()
      .optional(),
    recurrence: recurrenceSchema.optional(),
    location: z
      .string()
      .max(200)
      .nullable()
      .optional(),
    participants: z
      .array(z.string().min(1).max(80))
      .max(20)
      .nullable()
      .optional(),
    notes: z.string().max(2000).nullable().optional(),
    timeZone: z.string().max(60).optional(),
    /** Filtro explícito para operações em massa (delete por título/date). */
    filter: agendaFilterSchema.optional(),
    /**
     * Janela relativa ("nos próximos 5 dias") que limita o horizonte da
     * recorrência. Expression preservada; o backend resolve a data final.
     */
    limitDate: dateResolutionSchema.optional(),
    /**
     * TRUE = "no limite da agenda" / "o quanto couber": a recorrência expande
     * até o teto máximo de compromissos suportado, sem data final fixa.
     */
    maxSlots: z.boolean().optional(),
  })
  .strict();
export type AgendaEntities = z.infer<typeof entitiesSchema>;

export const assumptionSchema = z
  .object({
    field: z.string().min(1),
    note: z.string().min(1),
  })
  .strict();
export type AgendaAssumption = z.infer<typeof assumptionSchema>;

export const agendaEnvelopeSchema = z
  .object({
    intent: z.enum(AGENDA_INTENTS),
    action: z.enum(AGENDA_ACTIONS),
    entities: entitiesSchema,
    missing: z.array(z.string().min(1)).max(20).default([]),
    ambiguous: z.array(z.string().min(1)).max(20).default([]),
    assumptions: z.array(assumptionSchema).max(20).default([]),
  })
  .strict();
export type AgendaEnvelope = z.infer<typeof agendaEnvelopeSchema>;

/**
 * Estado editável de um compromisso na fase de edição (v1: compromisso único).
 * `date` é o dia civil em America/Sao_Paulo (YYYY-MM-DD). `null` representa a
 * ausência intencional de um campo opcional ("sem local", "sem participantes").
 */
export interface AgendaEditSnapshot {
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  participants?: string[] | null;
  notes?: string | null;
}

// ─────────────────────────── Bom pareamento intenção/ação ─────────────────

const INTENT_ACTION_MAP: Record<AgendaIntent, AgendaAction> = {
  create: 'create_commitment',
  edit: 'edit_commitment',
  delete: 'delete_commitment',
  query: 'query_commitments',
  clarify: 'query_clarification',
};

export function actionMatchesIntent(intent: AgendaIntent, action: AgendaAction): boolean {
  return INTENT_ACTION_MAP[intent] === action;
}

// ─────────────────────────── Parsing com mensagens amigáveis ──────────────

export type AgendaEnvelopeParseResult =
  | { ok: true; data: AgendaEnvelope }
  | { ok: false; errors: string[] };

/**
 * Faz JSON.parse + validação estrutural estrita. Campos extras desconhecidos
 * são rejeitados (.strict()) para impedir que o LLM invente campos.
 */
export function parseAgendaEnvelope(raw: unknown): AgendaEnvelopeParseResult {
  if (typeof raw !== 'string') {
    return { ok: false, errors: ['Envelope deve ser uma string JSON.'] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ['Envelope não é um JSON válido.'] };
  }

  const result = agendaEnvelopeSchema.safeParse(parsed);
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

// ─────────────────────── Regras de negócio por intenção ───────────────────

export interface EnvelopeValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validações de negócio que o schema estrutural não cobre — campos
 * obrigatórios por intenção, confiança de data e coerência da recorrência.
 */
export function validateAgendaEnvelope(env: AgendaEnvelope): EnvelopeValidation {
  const errors: string[] = [];

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

// ─────────────────────────── Helpers combinados ───────────────────────────

export type AgendaParseOutcome = { ok: true; data: AgendaEnvelope } | { ok: false; errors: string[] };

/**
 * Ponto único de entrada para as Cloud Functions: parse estrutural + regras de
 * negócio. Retorna o envelope pronto ou a lista de erros para o frontend.
 */
export function parseAndValidateAgendaEnvelope(raw: unknown): AgendaParseOutcome {
  const parsed = parseAgendaEnvelope(raw);
  if (!parsed.ok) return parsed;

  const validation = validateAgendaEnvelope(parsed.data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  return { ok: true, data: parsed.data };
}
