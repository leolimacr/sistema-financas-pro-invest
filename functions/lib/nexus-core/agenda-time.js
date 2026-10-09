"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_RECURRENCE_HORIZON_DAYS = exports.MAX_OCCURRENCES = exports.STABLE_SP_OFFSET_MS = exports.STABLE_SP_OFFSET_HOURS = exports.PRODUCT_TIMEZONE = void 0;
exports.ymdToIso = ymdToIso;
exports.isoToYmd = isoToYmd;
exports.isoFromDateMs = isoFromDateMs;
exports.weekdayOf = weekdayOf;
exports.todayYmdInProductTimezone = todayYmdInProductTimezone;
exports.nextWeekday = nextWeekday;
exports.lastWeekdayOfMonth = lastWeekdayOfMonth;
exports.firstWeekdayOfMonth = firstWeekdayOfMonth;
exports.weekdayNameToNumber = weekdayNameToNumber;
exports.monthNameToNumber = monthNameToNumber;
exports.resolveDateExpression = resolveDateExpression;
exports.resolveWindowExpression = resolveWindowExpression;
exports.expandRecurrence = expandRecurrence;
exports.saoPauloDayRangeMillis = saoPauloDayRangeMillis;
exports.resolvePeriodRange = resolvePeriodRange;
exports.sha1Hex = sha1Hex;
exports.generateSeriesId = generateSeriesId;
exports.generateCommitmentId = generateCommitmentId;
exports.generateCommitmentToken = generateCommitmentToken;
const node_crypto_1 = require("node:crypto");
exports.PRODUCT_TIMEZONE = 'America/Sao_Paulo';
exports.STABLE_SP_OFFSET_HOURS = 3;
exports.STABLE_SP_OFFSET_MS = exports.STABLE_SP_OFFSET_HOURS * 60 * 60 * 1000;
exports.MAX_OCCURRENCES = 366;
exports.DEFAULT_RECURRENCE_HORIZON_DAYS = 180;
const WEEKDAY_NAMES = {
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
const MONTH_NAMES = {
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
function pad2(n) {
    return String(n).padStart(2, '0');
}
function ymdToIso(ymd) {
    return `${ymd.y}-${pad2(ymd.m0 + 1)}-${pad2(ymd.d)}`;
}
function isoToYmd(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m0: m - 1, d };
}
function isoFromDateMs(dateMs) {
    return new Date(dateMs + exports.STABLE_SP_OFFSET_MS).toISOString().slice(0, 10);
}
function addDays(ymd, days) {
    const ms = Date.UTC(ymd.y, ymd.m0, ymd.d) + days * 86400000;
    const dt = new Date(ms);
    return { y: dt.getUTCFullYear(), m0: dt.getUTCMonth(), d: dt.getUTCDate() };
}
function addMonthsClamped(ymd, months) {
    const total = ymd.y * 12 + ymd.m0 + months;
    const y = Math.floor(total / 12);
    const m0 = total % 12;
    const lastDay = daysInMonth(y, m0);
    return { y, m0, d: Math.min(ymd.d, lastDay) };
}
function daysInMonth(year, m0) {
    return new Date(Date.UTC(year, m0 + 1, 0)).getUTCDate();
}
function weekdayOf(ymd) {
    const w0 = new Date(Date.UTC(ymd.y, ymd.m0, ymd.d)).getUTCDay();
    return (w0 === 0 ? 7 : w0);
}
function todayYmdInProductTimezone(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: exports.PRODUCT_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(now);
    const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
    return { y: Number(get('year')), m0: Number(get('month')) - 1, d: Number(get('day')) };
}
function nextWeekday(anchor, weekday, opts) {
    const current = weekdayOf(anchor);
    let diff = weekday - current;
    if (diff < 0)
        diff += 7;
    if (diff === 0 && !opts?.allowToday)
        diff = 7;
    return addDays(anchor, diff);
}
function lastWeekdayOfMonth(year, m0, weekday) {
    const lastDay = daysInMonth(year, m0);
    for (let d = lastDay; d >= 1; d -= 1) {
        const ymd = { y: year, m0, d };
        if (weekdayOf(ymd) === weekday)
            return ymd;
    }
    return { y: year, m0, d: 1 };
}
function firstWeekdayOfMonth(year, m0, weekday) {
    const lastDay = daysInMonth(year, m0);
    for (let d = 1; d <= lastDay; d += 1) {
        const ymd = { y: year, m0, d };
        if (weekdayOf(ymd) === weekday)
            return ymd;
    }
    return { y: year, m0, d: 1 };
}
function lastDayOfMonthYmd(year, m0) {
    return { y: year, m0, d: daysInMonth(year, m0) };
}
function monthEndToYmd(tail, today) {
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
function weekdayNameToNumber(raw) {
    const text = normalizeText(raw);
    const candidates = Object.keys(WEEKDAY_NAMES).sort((a, b) => b.length - a.length);
    for (const key of candidates) {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(text))
            return WEEKDAY_NAMES[key];
    }
    return null;
}
function monthNameToNumber(raw) {
    const text = normalizeText(raw);
    const candidates = Object.keys(MONTH_NAMES).sort((a, b) => b.length - a.length);
    for (const key of candidates) {
        const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`).test(text))
            return MONTH_NAMES[key];
    }
    return null;
}
function normalizeText(raw) {
    return raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
function resolveDateExpression(raw, today) {
    const t = normalizeText(raw)
        .replace(/^(?:at[eé]|no|na|em|para|aos|as|o|a)\s+(?:o\s+)?dia\s+(?:de\s+)?/, '')
        .replace(/^(na|no|em|para|dia|aos|as|ate)\s+/, '');
    const todayIso = ymdToIso(today);
    let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
    if (m)
        return { iso: `${m[1]}-${m[2]}-${m[3]}`, confidence: confidenceFor(isoTo({ ...today, d: Number(m[3]), m0: Number(m[2]) - 1, y: Number(m[1]) }), todayIso) };
    m = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(t);
    if (m) {
        let y = m[3] ? Number(m[3]) : today.y;
        if (y < 100)
            y += 2000;
        const ymd = { y, m0: Number(m[2]) - 1, d: Number(m[1]) };
        return { iso: ymdToIso(ymd), confidence: confidenceFor(ymd, todayIso) };
    }
    m = /^(\d{1,2})\s+de\s+([a-z]+)(?:\s+de\s+(\d{4}))?$/.exec(t);
    if (m) {
        const month = monthNameToNumber(m[2]);
        if (month) {
            const y = m[3] ? Number(m[3]) : today.y;
            const ymd = { y, m0: month - 1, d: Number(m[1]) };
            return { iso: ymdToIso(ymd), confidence: confidenceFor(ymd, todayIso) };
        }
    }
    if (/(^|\s)depois de amanha($|\s)/.test(t))
        return { iso: ymdToIso(addDays(today, 2)), confidence: 'high' };
    if (/(^|\s)amanha($|\s)/.test(t))
        return { iso: ymdToIso(addDays(today, 1)), confidence: 'high' };
    if (/(^|\s)hoje($|\s)/.test(t))
        return { iso: ymdToIso(today), confidence: 'high' };
    {
        const fm = /^(?:o\s+|a\s+)?(?:fim|final)\s+(?:do|da)\s+(.+)$/.exec(t);
        if (fm) {
            const ymd = monthEndToYmd(fm[1], today);
            if (ymd)
                return { iso: ymdToIso(ymd), confidence: 'high' };
        }
    }
    {
        const fm = /^(?:o\s+|a\s+)?(?:fim|final)\s+de\s+(.+)$/.exec(t);
        if (fm) {
            const ymd = monthEndToYmd(fm[1], today);
            if (ymd)
                return { iso: ymdToIso(ymd), confidence: 'high' };
        }
    }
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
        if (t.includes('ultima')) {
            const month = monthNameToNumber(t);
            if (month) {
                const year = /\b(\d{4})\b/.exec(t);
                const ymd = lastWeekdayOfMonth(year ? Number(year[1]) : today.y, month - 1, weekday);
                return { iso: ymdToIso(ymd), confidence: confidenceFor(ymd, todayIso) };
            }
            return null;
        }
        if (t.includes('primeira') || t.includes('primeiro')) {
            const month = monthNameToNumber(t);
            if (month) {
                const year = /\b(\d{4})\b/.exec(t);
                const ymd = firstWeekdayOfMonth(year ? Number(year[1]) : today.y, month - 1, weekday);
                return { iso: ymdToIso(ymd), confidence: confidenceFor(ymd, todayIso) };
            }
            return null;
        }
        if (t.includes('proxima') && t.includes('semana')) {
            return { iso: ymdToIso(nextWeekday(addDays(today, 7), weekday)), confidence: 'high' };
        }
        return { iso: ymdToIso(nextWeekday(today, weekday)), confidence: 'high' };
    }
    return null;
}
function isoTo(ymd) {
    return ymd;
}
function confidenceFor(ymd, todayIso) {
    return ymdToIso(ymd) >= todayIso ? 'high' : 'low';
}
function resolveWindowExpression(raw, today) {
    const t = normalizeText(raw)
        .replace(/^(na|no|em|para|nos|nas)\s+/, '')
        .replace(/^(proximos?|proximas?)\s+/, '')
        .replace(/^(ate|a)\s+/, '')
        .trim();
    const m = /^(\d+)\s+(dias?|semanas?|meses|mes)\b/.exec(t);
    if (m) {
        const count = Number(m[1]);
        if (count < 1 || count > 366)
            return null;
        const unit = m[2];
        if (/^dia/.test(unit))
            return ymdToIso(addDays(today, count));
        if (/^semana/.test(unit))
            return ymdToIso(addDays(today, count * 7));
        if (/^mes/.test(unit))
            return ymdToIso(addMonthsClamped(today, count));
    }
    if (/^semana\b/.test(t))
        return ymdToIso(addDays(today, 7));
    if (/^mes\b/.test(t))
        return ymdToIso(addMonthsClamped(today, 1));
    return null;
}
function stepDate(ymd, freq) {
    switch (freq) {
        case 'daily':
            return addDays(ymd, 1);
        case 'weekly':
            return addDays(ymd, 7);
        case 'monthly':
            return addMonthsClamped(ymd, 1);
    }
}
function compareYmd(a, b) {
    const na = a.y * 10000 + (a.m0 + 1) * 100 + a.d;
    const nb = b.y * 10000 + (b.m0 + 1) * 100 + b.d;
    return na - nb;
}
function expandRecurrence(opts, maxOccurrences = exports.MAX_OCCURRENCES) {
    const { freq, startIso, untilIso } = opts;
    const start = isoToYmd(startIso);
    const until = untilIso ? isoToYmd(untilIso) : undefined;
    const occurrences = [];
    let truncated = false;
    let cursor = start;
    for (;;) {
        if (occurrences.length >= maxOccurrences) {
            truncated = true;
            break;
        }
        if (until && compareYmd(cursor, until) > 0)
            break;
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
function saoPauloDayRangeMillis(ymd) {
    const startMs = Date.UTC(ymd.y, ymd.m0, ymd.d) - exports.STABLE_SP_OFFSET_MS;
    return { startMs, endMs: startMs + 86400000 };
}
function resolvePeriodRange(raw, today) {
    const t = normalizeText(raw).trim();
    if (!t)
        return null;
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
function sha1Hex(input) {
    return (0, node_crypto_1.createHash)('sha1').update(input).digest('hex');
}
function generateSeriesId(title, startIso) {
    return `srv_${sha1Hex(`${normalizeText(title)}|${startIso}`).slice(0, 16)}`;
}
function generateCommitmentId(seriesId, dateIso, time) {
    return `nex_${sha1Hex(`${seriesId ?? 'one'}|${dateIso}|${time}`).slice(0, 16)}`;
}
function generateCommitmentToken(input) {
    return `tok_${sha1Hex(input).slice(0, 24)}`;
}
//# sourceMappingURL=agenda-time.js.map