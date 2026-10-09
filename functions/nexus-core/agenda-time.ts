/**
 * AGENDA TIME - Motor puro de datas, recorrências e IDs determinísticos.
 *
 * Não importa Firebase/Firestore: roda em qualquer runtime Node e é usado pelas
 * Cloud Functions de interpretação (nexusAgendaInterpret) e gravação
 * (nexusAgendaCommit, fase seguinte) com a MESMA lógica — o backend é a fonte
 * de verdade para datas, nunca o LLM.
 *
 * Fuso oficial do produto: America/Sao_Paulo (UTC-3 fixo; o Brasil aboliu o DST
 * em 2019, então o offset é durável e "17:00 em SP" nunca oscila por estação).
 */

import { createHash } from 'node:crypto';

// ───────────────────────────── Constantes ─────────────────────────────

export const PRODUCT_TIMEZONE = 'America/Sao_Paulo';
/** Deslocamento fixo de São Paulo: UTC-3. */
export const STABLE_SP_OFFSET_HOURS = 3;
export const STABLE_SP_OFFSET_MS = STABLE_SP_OFFSET_HOURS * 60 * 60 * 1000;

/** Teto de ocorrências que qualquer recorrência pode gerar (≈ 1 ano). */
export const MAX_OCCURRENCES = 366;
/** Horizonte padrão quando o usuário não informa data fim de recorrência. */
export const DEFAULT_RECURRENCE_HORIZON_DAYS = 180;

// ───────────────────────────── Tipos ─────────────────────────────

/** Data civil YYYY-MM-DD. */
export interface YMD {
  y: number;
  m0: number; // 0 = janeiro
  d: number;
}

/** Dia da semana no padrão de produto: 1 = segunda … 7 = domingo. */
export type WeekdayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly';

export interface DateResolution {
  iso: string;
  confidence: 'high' | 'low';
}

export interface RecurrenceExpansion {
  occurrences: string[];
  truncated: boolean;
  first?: string;
  last?: string;
}

// ───────────────────────────── Utilitários de calendário ─────────────────────────────

const WEEKDAY_NAMES: Record<string, WeekdayNumber> = {
  'segunda-feira': 1,
  'segundas-feiras': 1,
  'segunda': 1,
  'segundas': 1,
  'seg': 1,
  'terca-feira': 2,
  'tercas-feiras': 2,
  'terca': 2,
  'tercas': 2,
  'ter': 2,
  'quarta-feira': 3,
  'quartas-feiras': 3,
  'quarta': 3,
  'quartas': 3,
  'qua': 3,
  'quinta-feira': 4,
  'quintas-feiras': 4,
  'quinta': 4,
  'quintas': 4,
  'qui': 4,
  'sexta-feira': 5,
  'sextas-feiras': 5,
  'sexta': 5,
  'sextas': 5,
  'sex': 5,
  'sabado': 6,
  'sabados': 6,
  'sab': 6,
  'domingo': 7,
  'domingos': 7,
  'dom': 7,
};

const MONTH_NAMES: Record<string, number> = {
  'janeiro': 1, 'jan': 1,
  'fevereiro': 2, 'fev': 2,
  'marco': 3, 'mar': 3,
  'abril': 4, 'abr': 4,
  'maio': 5, 'mai': 5,
  'junho': 6, 'jun': 6,
  'julho': 7, 'jul': 7,
  'agosto': 8, 'ago': 8,
  'setembro': 9, 'set': 9,
  'outubro': 10, 'out': 10,
  'novembro': 11, 'nov': 11,
  'dezembro': 12, 'dez': 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function ymdToIso(ymd: YMD): string {
  return `${ymd.y}-${pad2(ymd.m0 + 1)}-${pad2(ymd.d)}`;
}

export function isoToYmd(iso: string): YMD {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m0: m - 1, d };
}

/**
 * Dia civil em America/Sao_Paulo (YYYY-MM-DD) a partir de epoch ms.
 * Compromissos são gravados com `date` = meia-noite SP + minutos*60k, então
 * somar o offset fixo de SP devolve o dia civil correto em UTC puro.
 */
export function isoFromDateMs(dateMs: number): string {
  return new Date(dateMs + STABLE_SP_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(ymd: YMD, days: number): YMD {
  const ms = Date.UTC(ymd.y, ymd.m0, ymd.d) + days * 86400000;
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m0: dt.getUTCMonth(), d: dt.getUTCDate() };
}

function addMonthsClamped(ymd: YMD, months: number): YMD {
  const total = ymd.y * 12 + ymd.m0 + months;
  const y = Math.floor(total / 12);
  const m0 = total % 12;
  const lastDay = daysInMonth(y, m0);
  return { y, m0, d: Math.min(ymd.d, lastDay) };
}

function daysInMonth(year: number, m0: number): number {
  return new Date(Date.UTC(year, m0 + 1, 0)).getUTCDate();
}

/**
 * Dia da semana de YMD no padrão 1..7 (seg=1). Usa UTC puro e, como cada dia
 * civil tem exatamente 24h, é determinístico independente do fuso do servidor.
 */
export function weekdayOf(ymd: YMD): WeekdayNumber {
  const w0 = new Date(Date.UTC(ymd.y, ymd.m0, ymd.d)).getUTCDay(); // 0=dom
  return (w0 === 0 ? 7 : w0) as WeekdayNumber;
}

/**
 * Data civil de hoje (e dia da semana) na perspectiva do fuso de produto.
 * A leitura sempre é feita em America/Sao_Paulo, então o servidor pode rodar
 * em qualquer fuso sem desviar "o que é hoje" para o usuário.
 */
export function todayYmdInProductTimezone(now: Date = new Date()): YMD {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: PRODUCT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? '';
  return { y: Number(get('year')), m0: Number(get('month')) - 1, d: Number(get('day')) };
}

/** Próxima ocorrência do dia da semana `weekday`, estritamente após `anchor`. */
export function nextWeekday(anchor: YMD, weekday: WeekdayNumber, opts?: { allowToday?: boolean }): YMD {
  const current = weekdayOf(anchor);
  let diff = weekday - current;
  if (diff < 0) diff += 7;
  if (diff === 0 && !opts?.allowToday) diff = 7;
  return addDays(anchor, diff);
}

/** Último dia da semana `weekday` no mês (m0 0-based) do ano `year`. */
export function lastWeekdayOfMonth(year: number, m0: number, weekday: WeekdayNumber): YMD {
  const lastDay = daysInMonth(year, m0);
  for (let d = lastDay; d >= 1; d -= 1) {
    const ymd: YMD = { y: year, m0, d };
    if (weekdayOf(ymd) === weekday) return ymd;
  }
  return { y: year, m0, d: 1 };
}

/** Primeiro dia da semana `weekday` no mês (m0 0-based). */
export function firstWeekdayOfMonth(year: number, m0: number, weekday: WeekdayNumber): YMD {
  const lastDay = daysInMonth(year, m0);
  for (let d = 1; d <= lastDay; d += 1) {
    const ymd: YMD = { y: year, m0, d };
    if (weekdayOf(ymd) === weekday) return ymd;
  }
  return { y: year, m0, d: 1 };
}

/** Último dia civil do mês (m0 0-based). */
function lastDayOfMonthYmd(year: number, m0: number): YMD {
  return { y: year, m0, d: daysInMonth(year, m0) };
}

/**
 * Interpreta o sufixo de uma expressão de fim de período como mês-alvo:
 * "mês" / "mês que vem" → último dia do mês atual/próximo; "<mês> [de <ano>]"
 * → último dia do mês citado. Retorna null se não reconhecer.
 */
function monthEndToYmd(tail: string, today: YMD): YMD | null {
  if (/^mes(?:\s+que\s+vem)?$/.test(tail)) {
    const base = tail.includes('que vem') ? addMonthsClamped(today, 1) : today;
    return lastDayOfMonthYmd(base.y, base.m0);
  }
  const m = /^([a-z]+)(?:\s+de\s+(\d{4}))?$/.exec(tail);
  if (m) {
    const month = monthNameToNumber(m[1]);
    if (month) {
      const year = m[2] ? Number(m[2]) : today.y;
      return lastDayOfMonthYmd(year, month - 1);
    }
  }
  return null;
}

// ───────────────────────────── Nomes em português ─────────────────────────────

export function weekdayNameToNumber(raw: string): WeekdayNumber | null {
  const text = normalizeText(raw);
  const candidates = Object.keys(WEEKDAY_NAMES).sort((a, b) => b.length - a.length);
  for (const key of candidates) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(text)) return WEEKDAY_NAMES[key];
  }
  return null;
}

export function monthNameToNumber(raw: string): number | null {
  const text = normalizeText(raw);
  const candidates = Object.keys(MONTH_NAMES).sort((a, b) => b.length - a.length);
  for (const key of candidates) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(text)) return MONTH_NAMES[key];
  }
  return null;
}

function normalizeText(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ───────────────────────────── Resolução de datas em linguagem natural ─────────────────────────────

/**
 * Resolve expressões de data ("próxima terça-feira", "última terça-feira de
 * novembro de 2026", "amanhã", "18/08/2026", "16 de setembro") na data civil
 * em America/Sao_Paulo. Nunca inventa data: retorna null se não entendeu.
 */
export function resolveDateExpression(raw: string, today: YMD): DateResolution | null {
  // Corta prefixos compostos ("até o dia 15/12/2026", "o dia 15/12/2026",
  // "no dia de 15/12/2026") antes do corte de prefixo único.
  const t = normalizeText(raw)
    .replace(/^(?:at[eé]|no|na|em|para|aos|as|o|a)\s+(?:o\s+)?dia\s+(?:de\s+)?/, '')
    .replace(/^(na|no|em|para|dia|aos|as|ate)\s+/, '');
  const todayIso = ymdToIso(today);

  // Absoluta YYYY-MM-DD
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (m) return { iso: `${m[1]}-${m[2]}-${m[3]}`, confidence: confidenceFor(isoTo({ ...today, d: Number(m[3]), m0: Number(m[2]) - 1, y: Number(m[1]) }), todayIso) };

  // Absoluta dd/mm[/aaaa] ou dd/mm/aa
  m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(t);
  if (m) {
    let y = m[3] ? Number(m[3]) : today.y;
    if (y < 100) y += 2000;
    const ymd: YMD = { y, m0: Number(m[2]) - 1, d: Number(m[1]) };
    return { iso: ymdToIso(ymd), confidence: confidenceFor(ymd, todayIso) };
  }

  // Absoluta "16 de setembro [de 2026]"
  m = /^(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?$/.exec(t);
  if (m) {
    const month = monthNameToNumber(m[2]);
    if (month) {
      const y = m[3] ? Number(m[3]) : today.y;
      const ymd: YMD = { y, m0: month - 1, d: Number(m[1]) };
      return { iso: ymdToIso(ymd), confidence: confidenceFor(ymd, todayIso) };
    }
  }

  // Relativas
  if (/(^|\s)depois de amanha($|\s)/.test(t)) return { iso: ymdToIso(addDays(today, 2)), confidence: 'high' };
  if (/(^|\s)amanha($|\s)/.test(t)) return { iso: ymdToIso(addDays(today, 1)), confidence: 'high' };
  if (/(^|\s)hoje($|\s)/.test(t)) return { iso: ymdToIso(today), confidence: 'high' };

  // Fim de período ("fim de setembro", "o fim de setembro", "fim do mês", "fim do mês que vem")
  {
    const fm = /^(?:o\s+|a\s+)?(?:fim|final)\s+(?:do|da)\s+(.+)$/.exec(t);
    if (fm) {
      const ymd = monthEndToYmd(fm[1], today);
      if (ymd) return { iso: ymdToIso(ymd), confidence: 'high' };
    }
  }
  {
    const fm = /^(?:o\s+|a\s+)?(?:fim|final)\s+de\s+(.+)$/.exec(t);
    if (fm) {
      const ymd = monthEndToYmd(fm[1], today);
      if (ymd) return { iso: ymdToIso(ymd), confidence: 'high' };
    }
  }

  // Mês puro: "dezembro", "setembro de 2026" → último dia do mês (horizonte "até <mês>")
  {
    const m = /^([a-z]+)(?:\s+de\s+(\d{4}))?$/.exec(t);
    if (m) {
      const month = monthNameToNumber(m[1]);
      if (month) {
        const year = m[2] ? Number(m[2]) : today.y;
        return { iso: ymdToIso(lastDayOfMonthYmd(year, month - 1)), confidence: 'high' };
      }
    }
  }

  // "todos os <wd> [do mês] de <mês> [de <ano>]" → primeiro <wd> do mês citado
  if (t.startsWith('todos') || t.startsWith('todas')) {
    const weekday = weekdayNameToNumber(t);
    if (weekday) {
      const month = monthNameToNumber(t);
      if (month) {
        const year = /\b(\d{4})\b/.exec(t);
        const ymd = firstWeekdayOfMonth(year ? Number(year[1]) : today.y, month - 1, weekday);
        return { iso: ymdToIso(ymd), confidence: confidenceFor(ymd, todayIso) };
      }
    }
  }

  const weekday = weekdayNameToNumber(t);
  if (weekday) {
    // última <wd> de <mês> [de <ano>]
    if (t.includes('ultima')) {
      const month = monthNameToNumber(t);
      if (month) {
        const year = /\b(\d{4})\b/.exec(t);
        const ymd = lastWeekdayOfMonth(year ? Number(year[1]) : today.y, month - 1, weekday);
        return { iso: ymdToIso(ymd), confidence: confidenceFor(ymd, todayIso) };
      }
      return null;
    }

    // primeira <wd> de <mês> [de <ano>]
    if (t.includes('primeira') || t.includes('primeiro')) {
      const month = monthNameToNumber(t);
      if (month) {
        const year = /\b(\d{4})\b/.exec(t);
        const ymd = firstWeekdayOfMonth(year ? Number(year[1]) : today.y, month - 1, weekday);
        return { iso: ymdToIso(ymd), confidence: confidenceFor(ymd, todayIso) };
      }
      return null;
    }

    // "<wd> da próxima semana"
    if (t.includes('proxima') && t.includes('semana')) {
      return { iso: ymdToIso(nextWeekday(addDays(today, 7), weekday)), confidence: 'high' };
    }

    // "próxima <wd>" / "<wd> que vem" / "<wd>" apenas
    return { iso: ymdToIso(nextWeekday(today, weekday)), confidence: 'high' };
  }

  return null;
}

function isoTo(ymd: YMD): YMD {
  return ymd;
}

function confidenceFor(ymd: YMD, todayIso: string): 'high' | 'low' {
  return ymdToIso(ymd) >= todayIso ? 'high' : 'low';
}

/**
 * Resolve janelas relativas ("nos próximos 5 dias", "próxima semana",
 * "2 semanas", "1 mês") no último dia da janela, na data civil em
 * America/Sao_Paulo. Retorna null se não reconhecer — nunca inventa prazo.
 */
export function resolveWindowExpression(raw: string, today: YMD): string | null {
  const t = normalizeText(raw)
    .replace(/^(na|no|em|para|nos|nas)\s+/, '')
    .replace(/^(proximos?|proximas?)\s+/, '')
    .replace(/^(ate|a)\s+/, '')
    .trim();

  const m = /^(\d+)\s+(dias?|semanas?|meses|mes)\b/.exec(t);
  if (m) {
    const count = Number(m[1]);
    if (count < 1 || count > 366) return null;
    const unit = m[2];
    if (/^dia/.test(unit)) return ymdToIso(addDays(today, count));
    if (/^semana/.test(unit)) return ymdToIso(addDays(today, count * 7));
    if (/^mes/.test(unit)) return ymdToIso(addMonthsClamped(today, count));
  }

  if (/^semana\b/.test(t)) return ymdToIso(addDays(today, 7));
  if (/^mes\b/.test(t)) return ymdToIso(addMonthsClamped(today, 1));

  return null;
}

// ───────────────────────────── Expansão de recorrência ─────────────────────────────

function stepDate(ymd: YMD, freq: RecurrenceFreq): YMD {
  switch (freq) {
    case 'daily':
      return addDays(ymd, 1);
    case 'weekly':
      return addDays(ymd, 7);
    case 'monthly':
      return addMonthsClamped(ymd, 1);
  }
}

function compareYmd(a: YMD, b: YMD): number {
  const na = a.y * 10000 + (a.m0 + 1) * 100 + a.d;
  const nb = b.y * 10000 + (b.m0 + 1) * 100 + b.d;
  return na - nb;
}

/**
 * Expande a série de datas de recorrência a partir de startIso até untilIso
 * (inclusivo), cobrindo o teto MAX_OCCURRENCES. `truncated: true` quando a
 * série real excede o teto. `untilIso` ausente = aberto (limitado pelo teto).
 */
export function expandRecurrence(
  opts: { freq: RecurrenceFreq; startIso: string; untilIso?: string },
  maxOccurrences = MAX_OCCURRENCES,
): RecurrenceExpansion {
  const { freq, startIso, untilIso } = opts;
  const start = isoToYmd(startIso);
  const until = untilIso ? isoToYmd(untilIso) : undefined;

  const occurrences: string[] = [];
  let truncated = false;
  let cursor = start;

  for (;;) {
    if (occurrences.length >= maxOccurrences) {
      truncated = true;
      break;
    }
    if (until && compareYmd(cursor, until) > 0) break;
    occurrences.push(ymdToIso(cursor));
    cursor = stepDate(cursor, freq);
  }

  return {
    occurrences,
    truncated,
    first: occurrences[0],
    last: occurrences.length > 0 ? occurrences[occurrences.length - 1] : undefined,
  };
}

// ───────────────────────────── Range civil de um dia em SP ─────────────────────────────

/**
 * Instantes (epoch ms) de [meia-noite SP, meia-noite SP + 24h) de um dia civil.
 * Meia-noite de SP = meia-noite UTC − 3h (offset fixo). Usado para consultas
 * Firestore por dia (date >= start && date < end).
 */
export function saoPauloDayRangeMillis(ymd: YMD): { startMs: number; endMs: number } {
  const startMs = Date.UTC(ymd.y, ymd.m0, ymd.d) - STABLE_SP_OFFSET_MS;
  return { startMs, endMs: startMs + 86400000 };
}

/**
 * Range civil (epoch ms) de um mês inteiro em SP — [1º dia 00:00, 1º dia do mês
 * seguinte 00:00). Reconhece mês puro: "novembro", "em novembro", "no mês que
 * vem", "novembro de 2026". Retorna null quando a expressão NÃO é um mês puro
 * (nunca inventa período — a resolução de "fim de mês" continua em
 * resolveDateExpression, que colapsa para o último dia).
 */
export function resolvePeriodRange(raw: string, today: YMD): { startMs: number; endMs: number } | null {
  const t = normalizeText(raw).trim();
  if (!t) return null;

  if (/(^|\s)m(es|e)s?\s+que\s+vem($|\s)/.test(t)) {
    const next = addMonthsClamped(today, 1);
    const first = { y: next.y, m0: next.m0, d: 1 };
    const after = addMonthsClamped(first, 1);
    return {
      startMs: saoPauloDayRangeMillis(first).startMs,
      endMs: saoPauloDayRangeMillis({ y: after.y, m0: after.m0, d: 1 }).startMs,
    };
  }

  const monthMatch = /^(?:(?:em|no|na|nesse|neste)\s+)?([a-z]+)(?:\s+de\s+(\d{4}))?$/.exec(t);
  if (monthMatch) {
    const month = monthNameToNumber(monthMatch[1]);
    if (month) {
      const year = monthMatch[2] ? Number(monthMatch[2]) : today.y;
      const first = { y: year, m0: month - 1, d: 1 };
      const after = addMonthsClamped(first, 1);
      return {
        startMs: saoPauloDayRangeMillis(first).startMs,
        endMs: saoPauloDayRangeMillis({ y: after.y, m0: after.m0, d: 1 }).startMs,
      };
    }
  }

  return null;
}

// ───────────────────────────── IDs determinísticos (nex_) ─────────────────────────────

export function sha1Hex(input: string): string {
  return createHash('sha1').update(input).digest('hex');
}

/** ID da série: igual para a mesma trinca (título, início). Permite batch idempotente. */
export function generateSeriesId(title: string, startIso: string): string {
  return `srv_${sha1Hex(`${normalizeText(title)}|${startIso}`).slice(0, 16)}`;
}

/** ID determinístico de um compromisso: mesmo (série|isolado, data, hora) sempre colide. */
export function generateCommitmentId(seriesId: string | null, dateIso: string, time: string): string {
  return `nex_${sha1Hex(`${seriesId ?? 'one'}|${dateIso}|${time}`).slice(0, 16)}`;
}

export function generateCommitmentToken(input: string): string {
  return `tok_${sha1Hex(input).slice(0, 24)}`;
}
