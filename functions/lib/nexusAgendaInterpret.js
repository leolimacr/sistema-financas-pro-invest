"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.nexusAgendaInterpret = exports.TIME_GAP_REFINEMENT = void 0;
exports.deleteScanCutoffMs = deleteScanCutoffMs;
exports.requireAuth = requireAuth;
exports.buildSystemPrompt = buildSystemPrompt;
exports.buildMessages = buildMessages;
exports.inferStartTimeFromTitle = inferStartTimeFromTitle;
exports.rankByTitle = rankByTitle;
exports.orchestrateAgendaInterpret = orchestrateAgendaInterpret;
exports.buildFirestoreDependencies = buildFirestoreDependencies;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const node_crypto_1 = require("node:crypto");
const jsonrepair_1 = require("jsonrepair");
const MultiModelRouter_1 = require("./nexus-core/MultiModelRouter");
const agenda_intent_schema_1 = require("./nexus-core/agenda-intent-schema");
const agenda_time_1 = require("./nexus-core/agenda-time");
const agenda_session_1 = require("./nexus-core/agenda-session");
const secrets_1 = require("./secrets");
const nexusAgendaCommit_1 = require("./nexusAgendaCommit");
const PENDING_TTL_MS = 10 * 60 * 1000;
const MAX_CONFLICT_DATES_TO_READ = 366;
const MAX_DELETE_SCAN = 5000;
const MAX_DELETE_TARGETS = 500;
function deleteScanCutoffMs(nowMs = Date.now()) {
    const cutoff = new Date(nowMs);
    cutoff.setMonth(cutoff.getMonth() - 12);
    return cutoff.getTime();
}
const MAX_EDIT_SCAN = 500;
const MAX_HISTORY_MESSAGES = 50;
const MAX_HISTORY_TOKENS = 2500;
const HISTORY_CHARS_PER_TOKEN = 4;
const MIN_HISTORY_MESSAGES = 2;
const FRIENDLY_INVALID_QUESTION = 'Não consegui organizar essa solicitação. Você pode me dizer, por exemplo, o nome do compromisso, a data e o horário?';
const TIME_GAP_QUESTION = 'Você quer inserir o horário neste compromisso?';
exports.TIME_GAP_REFINEMENT = {
    question: TIME_GAP_QUESTION,
    suggestions: ['Sem horário', '09:00', '14:00', '19:00'],
};
const SCHEDULING_VERB_RE = /\b(agend(?:ar|e|ada|amos)?|marque|marcar|adicionar|incluir|anotar|reservar|criar|crie)\b/i;
const DATE_SIGNAL_RE = /(?:^|[^a-z0-9])(hoje|amanh[aã]|depois\s+de\s+amanh[aã]|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|pr[oó]xim[ao]|dia\s+\d{1,2}|\d{1,2}\/\d{1,2}|semana\s+que\s+vem|no\s+m[eê]s|de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))(?![a-z0-9])/i;
const TIME_PRESENT_RE = /(?:^|[^a-z0-9])(\d{1,2}\s*[hH](?:\d{2})?|\d{1,2}:\d{2}|[àa]s\s+\d{1,2}|de\s+manh[aã]|[àa]\s+tarde|[àa]\s+noite|meio[- ]?dia|meia[- ]?noite)(?![a-z0-9])/i;
function hasCreateWithoutTimeEvidence(prompt) {
    return SCHEDULING_VERB_RE.test(prompt)
        && DATE_SIGNAL_RE.test(prompt)
        && !TIME_PRESENT_RE.test(prompt);
}
function logStage(requestId, stage, extra) {
    logger.info('[agenda:interpret]', { requestId, stage, ...extra });
}
function safeUid(uid) {
    return uid.length > 12 ? `${uid.slice(0, 8)}…${uid.slice(-4)}` : 'short';
}
function errorMessage(error) {
    return error instanceof Error ? error.message : 'erro desconhecido';
}
function errorStack(error) {
    return error instanceof Error ? error.stack : undefined;
}
function requireAuth(request) {
    const uid = request.auth?.uid;
    if (!uid)
        throw new https_1.HttpsError('unauthenticated', 'Login necessário para usar a Agenda.');
    return uid;
}
function buildSystemPrompt(now, context) {
    const today = (0, agenda_time_1.todayYmdInProductTimezone)(now);
    const prompt = `Você é um agente de produtividade focado em ações concretas na agenda. Seu objetivo é interpretar, planejar e executar alterações na agenda.

Você conversa de forma natural, direta e objetiva. Quando o usuário fala sobre compromissos, datas ou horários, você entende o que ele quer e ajuda a transformar isso em um agendamento claro.

Se você perceber que o usuário está desviando para um bate-papo informal, perguntas pessoais ou conversa fiada, interrompa educadamente a conversa e diga: "Você está fugindo das minhas atribuições delegadas. Precisamos manter o foco na gestão da sua agenda. Por favor, feche e reabra a interface do Nexus na Agenda para iniciarmos uma nova tarefa."

Antes de executar qualquer alteração, você sempre confirma com o usuário. Você mostra, com suas palavras, o que entendeu: o nome do compromisso, a data, a hora e, quando houver recorrência, como ela funcionará. Você também pergunta se o usuário deseja ativar o alarme da agenda ou apenas deixar o compromisso anotado. Só depois da confirmação natural do usuário você realiza a alteração.

Se faltar alguma informação, pergunte de forma natural. Por exemplo:
- "Qual será o nome ou assunto do compromisso?"
- "Para qual dia e horário devo anotar?"
- "Você quer que eu ative o alarme ou apenas deixe anotado?"

Quando o usuário informar apenas o dia ou a recorrência sem horário (ex.: "todas as terças de setembro", "em todos os domingos do mês de setembro"), NÃO invente um horário. Pergunte: use intent "clarify" com missing ["startTime"] e ambiguous ["Você quer inserir o horário neste compromisso?"]. EXCEÇÃO: horário embutido no TÍTULO (ex.: "Catequese 19h") NÃO é invenção — siga a "Regra de TÍTULO com horário" abaixo e extraia o horário para entities.startTime.

Se faltarem apenas campos opcionais (local, participantes, observações), não bloqueie: monte o envelope completo sem esses campos e prossiga para a proposta.

O horário inicial é OPCIONAL: um compromisso pode ser criado sem ele. Se o usuário disser que prefere deixar sem horário (ex.: "sem horário", "deixa sem hora", "pode deixar sem horário", "sem hora definida"), monte o envelope COMPLETO sem entities.startTime e NÃO coloque "startTime" em missing — prossiga para a proposta normalmente. Só pergunte o horário quando o usuário ainda não se manifestou sobre ele.

Regra de TÍTULO com horário: SEMPRE inclua no título o horário citado pelo usuário, no mesmo formato que ele usou, e também extraia o horário para entities.startTime. Exemplos: "Agende uma reunião para mim para 18h" → entities.title "Reunião 18h" e startTime "18:00"; "Pode chamar de Ensaio da banda e marcar para as 20h" → entities.title "Ensaio da banda 20h" e startTime "20:00"; "O nome do compromisso é \"Reunião com a banda 20h\" e o horário é 20h" → entities.title "Reunião com a banda 20h" (o horário já está no nome, mantenha) e startTime "20:00". Título já carregando o horário sem menção separada: "agende Catequese 19h para todas as próximas segundas feiras" → entities.title "Catequese 19h" e startTime "19:00". Com duração ("das 17h às 18h"), inclua o intervalo no título ("Reunião 17h às 18h") e extraia startTime "17:00" e endTime "18:00".

Quando entender um pedido completo, responda de maneira confirmatória e amigável.

Data/hora do servidor em ${agenda_time_1.PRODUCT_TIMEZONE}: ${(0, agenda_time_1.ymdToIso)(today)}.

A sua saída é SEMPRE o envelope JSON estrito abaixo — o produto converte esse envelope em uma conversa amigável de confirmação, seguindo o fluxo acima. Não escreva texto fora do JSON, não use markdown e não use crases.

Responda SOMENTE com JSON válido, sem markdown e sem texto adicional, usando exatamente este contrato:
{
  "intent": "create|edit|delete|query|clarify",
  "action": "create_commitment|edit_commitment|delete_commitment|query_commitments|query_clarification",
  "entities": {
    "title": "string ou omitido",
    "filter": {"field":"title|date","value":"texto"} ou omitido (usado para exclusão em massa),
    "date": {"expression":"texto original","resolved":"YYYY-MM-DD","confidence":"high|low"},
    "startTime":"HH:mm", "endTime":"HH:mm",
    "recurrence": {"freq":"daily|weekly|monthly","byDay":[1],"until":{"expression":"texto","resolved":"YYYY-MM-DD","confidence":"high|low"}},
    "limitDate": {"expression":"texto original","resolved":"YYYY-MM-DD","confidence":"high|low"} ou omitido,
    "maxSlots": true ou omitido,
    "location":"string ou null", "participants":["string"] ou null, "notes":"string ou null", "timeZone":"string"
  },
  "missing": ["campo"], "ambiguous": ["explicação"],
  "assumptions": [{"field":"campo","note":"explicação"}]
}

Orientações de extração:
- Recorrência semanal: frases como "toda terça-feira", "toda terça", "todas as terças", "todas as próximas segundas feiras", "toda semana" → recurrence freq "weekly" com byDay como ARRAY de números ([1] para segundas, [2] para terças; 1=segunda até 7=domingo) e mantenha a expressão do dia da semana em entities.date.expression (ex.: "toda terça-feira", "todas as próximas segundas feiras"). O horário vai em entities.startTime.
- Data final da recorrência: expressões de fim de período como "até o fim de setembro", "fim de setembro", "até dezembro", "até o dia 31/12/2026" → recurrence.until.expression preservando o texto original; o backend resolve a data final.
- Recorrência SEM data limite (ex.: apenas "toda terça"): NÃO invente uma data final — omita recurrence.until, limitDate e maxSlots. O produto perguntará ao usuário como ele prefere o prazo da recorrência.
- Janela relativa: frases como "nos próximos 5 dias", "próxima semana", "2 semanas", "1 mês" → entities.limitDate com expression preservada (ex.: "nos próximos 5 dias"); o backend resolve a data final. NÃO coloque essa expressão em entities.date.
- Limite máximo da agenda: frases como "no limite da agenda", "o quanto couber", "até o limite máximo", "máximo de compromissos", "sem prazo máximo" → entities.maxSlots: true (sem recurrence.until e sem limitDate).
- Participantes: "reunião com <pessoa>" → entities.participants com o nome extraído.
- Duração: "das 17h às 18h" → startTime "17:00" e endTime "18:00"; "18h" ou "às 18h" → startTime "18:00".
- Exclusão em massa por título: frases como "excluir todos os compromissos com o nome X", "apagar todas as reuniões X", "remover os compromissos que se chamam X" → intent "delete" com entities.filter {"field":"title","value":X} (ou entities.title). NÃO exija data nem coloque "date" em missing — a ausência de data NÃO bloqueia a exclusão por título. IMPORTANTE: quando o título citado contém um horário embutido (ex.: "exclua todos os compromissos chamados 'Reunião 16h'"), use o nome COMPLETO no valor do filtro ("Reunião 16h") e NÃO separe o horário em entities.startTime — a busca no backend considera também variantes parciais (prefixo e interseção de tokens), então prefira manter o texto exato citado pelo usuário.
- Exclusão por data: "excluir os compromissos de amanhã", "apagar tudo de hoje" → intent "delete" com entities.filter {"field":"date","value":"amanhã"} (expressão natural) ou entities.date.
- missing deve conter apenas NOMES de campos incompletos (title, date, startTime, endTime, location, participants, notes, byDay, recurrence, limitDate). O produto os converte em perguntas naturais e combinadas — esses nomes NUNCA aparecem ao usuário.
- ambiguous deve conter perguntas naturais completas, exibidas ao usuário. Para assuntos fora da agenda (bate-papo informal, perguntas pessoais, conversa fiada), use intent "clarify" e coloque em ambiguous[0] EXATAMENTE esta frase: "Você está fugindo das minhas atribuições delegadas. Precisamos manter o foco na gestão da sua agenda. Por favor, feche e reabra a interface do Nexus na Agenda para iniciarmos uma nova tarefa."
- NUNCA invente título, data, horário, local, participantes, duração, recorrência ou limite de série que o usuário não informou. Se faltar algo essencial, prefira intent "clarify" em vez de montar um envelope incompleto.
- Use SEMPRE o contexto do histórico da conversa: quando o usuário responder apenas o dado que faltava (ex.: "às 16h" depois de você perguntar o horário), monte o envelope COMPLETO com os campos já estabelecidos nos turnos anteriores — não pergunte novamente o que já foi informado, nem invente os campos já definidos.
- A preferência de alarme/anotação é perguntada pelo produto na confirmação — não a inclua no envelope.
- Preserve as expressões de data no campo expression. O backend recalculará resolved; nunca invente informações ausentes. Para baixa certeza, use confidence low e preencha ambiguous.`;
    if (!context)
        return prompt;
    return `${prompt}

${buildSessionContextBlock(context)}`;
}
function buildSessionContextBlock(context) {
    const snapshot = {
        intent: context.intent,
        title: context.title ?? null,
        date: context.date ?? null,
        startTime: context.startTime ?? null,
        endTime: context.endTime ?? null,
        recurrence: context.recurrence ?? null,
        limitDate: context.limitDate ?? null,
        maxSlots: context.maxSlots ?? null,
        filter: context.filter ?? null,
        location: context.location ?? null,
        participants: context.participants ?? null,
        notes: context.notes ?? null,
        missing: context.missing,
    };
    return `CONTEXTO JÁ ESTABELECIDO NESTA CONVERSA (não pergunte de novo, não invente):
${JSON.stringify(snapshot, null, 2)}

Regras deste turno:
- Use os campos acima como base do envelope. Se o usuário não repetir a recorrência, MANTENHA a recorrência do contexto e apenas atualize os campos que ele informou agora.
- Não pergunte novamente por dados já presentes no contexto.
- Se o usuário alterar um campo já definido (ex.: novo horário), o novo valor vence.`;
}
function buildMessages(prompt, history) {
    const mapped = history.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
        role: message.role === 'assistant' || message.role === 'ai' ? 'assistant' : 'user',
        content: message.text,
    }));
    let budget = MAX_HISTORY_TOKENS * HISTORY_CHARS_PER_TOKEN;
    const kept = [];
    for (let i = mapped.length - 1; i >= 0; i -= 1) {
        const message = mapped[i];
        const canDropOlder = kept.length >= MIN_HISTORY_MESSAGES;
        if (canDropOlder && message.content.length > budget)
            break;
        budget -= message.content.length;
        kept.unshift(message);
    }
    return [...kept, { role: 'user', content: prompt }];
}
async function callModel(router, messages, systemPrompt) {
    const response = await router.routeRequest(messages, systemPrompt, {
        temperature: 0.1,
        maxTokens: 1000,
        responseFormat: 'json',
        fallbackContext: { primaryIntent: 'agenda_interpret' },
    });
    if (response.isContingency)
        throw new Error('Modelo temporariamente indisponível');
    return response.content ?? '';
}
function extractJsonEnvelope(raw) {
    const trimmed = raw.trim();
    const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
    if (fenced)
        return fenced[1].trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start)
        return trimmed.slice(start, end + 1);
    return trimmed;
}
function tryParseEnvelope(raw) {
    const cleaned = extractJsonEnvelope(raw);
    const direct = (0, agenda_intent_schema_1.parseAgendaEnvelope)(cleaned);
    if (direct.ok)
        return direct;
    try {
        const repaired = (0, jsonrepair_1.jsonrepair)(cleaned);
        if (repaired !== cleaned) {
            const result = (0, agenda_intent_schema_1.parseAgendaEnvelope)(repaired);
            if (result.ok)
                return result;
        }
    }
    catch {
    }
    return direct;
}
const TIME_IN_TITLE_RE = /\b(\d{1,2})\s*[:hH](\d{2})?/;
function inferStartTimeFromTitle(title) {
    const match = TIME_IN_TITLE_RE.exec(title);
    if (!match)
        return null;
    const hour = Number(match[1]);
    if (hour > 23)
        return null;
    const minute = match[2] !== undefined ? Number(match[2]) : 0;
    if (minute > 59)
        return null;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
function normalizeEnvelopeDates(envelope, today) {
    const entities = { ...envelope.entities };
    if (entities.startTime === null)
        entities.startTime = undefined;
    if (entities.endTime === null)
        entities.endTime = undefined;
    if (entities.date) {
        const resolved = (0, agenda_time_1.resolveDateExpression)(entities.date.expression, today);
        if (resolved) {
            entities.date = { ...entities.date, resolved: resolved.iso, confidence: resolved.confidence };
        }
        else if (envelope.intent === 'delete' && (0, agenda_time_1.resolvePeriodRange)(entities.date.expression, today)) {
            entities.date = { ...entities.date, confidence: 'high' };
        }
        else {
            entities.date = { ...entities.date, confidence: 'low' };
        }
    }
    if (entities.recurrence?.until) {
        const resolved = (0, agenda_time_1.resolveDateExpression)(entities.recurrence.until.expression, today);
        entities.recurrence = {
            ...entities.recurrence,
            until: resolved
                ? { ...entities.recurrence.until, resolved: resolved.iso, confidence: resolved.confidence }
                : { ...entities.recurrence.until, confidence: 'low' },
        };
    }
    if (entities.recurrence?.byDay !== undefined) {
        const byDay = entities.recurrence.byDay;
        entities.recurrence = {
            ...entities.recurrence,
            byDay: Array.isArray(byDay) ? byDay[0] : byDay,
        };
    }
    if (envelope.intent === 'create' && !entities.startTime && entities.title) {
        const inferred = inferStartTimeFromTitle(entities.title);
        if (inferred)
            entities.startTime = inferred;
    }
    if (entities.limitDate) {
        const windowIso = (0, agenda_time_1.resolveWindowExpression)(entities.limitDate.expression, today);
        const resolved = windowIso
            ? { iso: windowIso, confidence: 'high' }
            : (0, agenda_time_1.resolveDateExpression)(entities.limitDate.expression, today);
        entities.limitDate = resolved
            ? { ...entities.limitDate, resolved: resolved.iso, confidence: resolved.confidence }
            : { ...entities.limitDate, confidence: 'low' };
    }
    return { ...envelope, entities };
}
function addDaysForHorizon(today) {
    const next = (0, agenda_time_1.nextWeekday)(today, 1, { allowToday: true });
    const days = agenda_time_1.DEFAULT_RECURRENCE_HORIZON_DAYS - 7;
    const date = new Date(Date.UTC(next.y, next.m0, next.d) + days * 86400000);
    return (0, agenda_time_1.ymdToIso)({ y: date.getUTCFullYear(), m0: date.getUTCMonth(), d: date.getUTCDate() });
}
function formatDate(iso) {
    if (!iso)
        return 'data não definida';
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
}
const NATURAL_FIELD_QUESTIONS = {
    title: 'Qual nome você deseja dar a esse compromisso?',
    date: 'Para qual dia ou período devo agendar esse compromisso?',
    startTime: 'Você quer inserir o horário neste compromisso?',
    endTime: 'Qual é o horário de término?',
    location: 'Onde será o compromisso?',
    participants: 'Com quem será o compromisso?',
    notes: 'Alguma observação sobre o compromisso?',
    byDay: 'Em qual dia da semana ocorre essa recorrência?',
    recurrence: 'Como deve funcionar a recorrência?',
    limitDate: 'Até quando devo gerar essa recorrência?',
    filter: 'Qual é o critério para identificar os compromissos?',
};
const NATURAL_FIELD_NAMES = {
    title: 'o título',
    date: 'a data ou o período',
    startTime: 'o horário',
    endTime: 'o horário de término',
    location: 'o local',
    participants: 'os participantes',
    notes: 'as observações',
    byDay: 'o dia da semana',
    recurrence: 'a recorrência',
    limitDate: 'o prazo da recorrência',
    filter: 'o critério de identificação',
};
const FIELD_PRIORITY = [
    'title', 'date', 'startTime', 'endTime',
    'location', 'participants', 'notes',
    'byDay', 'recurrence', 'limitDate', 'filter',
];
const COMBINED_QUESTIONS = {
    'title,date,startTime': 'Qual será o título do compromisso? Para qual período devo agendá-lo e em que horário?',
    'title,startTime': 'Qual será o título do compromisso e em qual horário você deseja marcá-lo?',
    'title,date': 'Qual será o título do compromisso e para qual dia ou período devo agendá-lo?',
    'date,startTime': 'Para qual dia ou período devo agendar esse compromisso e em que horário?',
};
function buildQuestions(missing, ambiguous, refinement) {
    const questions = [];
    if (refinement)
        questions.push(refinement.question);
    const knownFields = missing
        .filter((field) => Object.prototype.hasOwnProperty.call(NATURAL_FIELD_QUESTIONS, field))
        .sort((a, b) => FIELD_PRIORITY.indexOf(a) - FIELD_PRIORITY.indexOf(b));
    const unknownFields = missing.filter((field) => !Object.prototype.hasOwnProperty.call(NATURAL_FIELD_QUESTIONS, field));
    if (knownFields.length > 0) {
        const combined = COMBINED_QUESTIONS[knownFields.join(',')];
        if (combined) {
            questions.push(combined);
        }
        else if (knownFields.length === 1) {
            questions.push(NATURAL_FIELD_QUESTIONS[knownFields[0]]);
        }
        else {
            const names = knownFields.map((field) => NATURAL_FIELD_NAMES[field] ?? 'os detalhes');
            const list = names.length === 2
                ? `${names[0]} e ${names[1]}`
                : `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
            questions.push(`Poderia me informar ${list}?`);
        }
    }
    if (unknownFields.length > 0) {
        questions.push('Poderia me informar mais detalhes sobre o compromisso?');
    }
    questions.push(...ambiguous);
    return questions;
}
const TECHNICAL_FIELD_TOKENS = [
    'title', 'startTime', 'endTime', 'byDay', 'limitDate',
    'recurrence', 'filter', 'missing', 'participants',
];
function hasTechnicalFieldName(text) {
    const normalized = text.toLowerCase();
    return TECHNICAL_FIELD_TOKENS.some((token) => new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`).test(normalized));
}
function clarification(missing, ambiguous, refinement, primaryQuestion) {
    const safeAmbiguous = ambiguous.filter((text) => !hasTechnicalFieldName(text));
    const questions = primaryQuestion
        ? [primaryQuestion]
        : buildQuestions(missing, safeAmbiguous, refinement);
    return {
        success: true,
        outcome: 'clarification',
        status: 'awaiting_clarification',
        question: questions[0] ?? null,
        clarification: {
            missing,
            ambiguous: safeAmbiguous,
            questions,
            ...(refinement ? { refinement } : {}),
        },
    };
}
const RECURRENCE_REFINEMENT_QUESTION = 'Entendi que você quer uma recorrência. Até quando gostaria de repetir esse compromisso?';
const RECURRENCE_REFINEMENT_SUGGESTIONS = ['Até o final do ano', 'Sem prazo máximo'];
function detectRecurrenceAmbiguity(envelope) {
    if (envelope.intent !== 'create' || !envelope.entities.recurrence)
        return null;
    const hasHorizon = Boolean(envelope.entities.recurrence.until
        || envelope.entities.limitDate
        || envelope.entities.maxSlots === true);
    if (hasHorizon)
        return null;
    return {
        question: RECURRENCE_REFINEMENT_QUESTION,
        suggestions: [...RECURRENCE_REFINEMENT_SUGGESTIONS],
    };
}
const WEEKDAY_LABELS_PT = {
    1: 'segundas-feiras',
    2: 'terças-feiras',
    3: 'quartas-feiras',
    4: 'quintas-feiras',
    5: 'sextas-feiras',
    6: 'sábados',
    7: 'domingos',
};
function describeRecurrence(recurrence) {
    const rawByDay = recurrence.byDay;
    const weekday = typeof rawByDay === 'number' ? rawByDay : (rawByDay?.[0] ?? 0);
    const label = weekday ? WEEKDAY_LABELS_PT[weekday] : null;
    const base = recurrence.freq === 'daily'
        ? 'todos os dias'
        : recurrence.freq === 'monthly'
            ? 'mensalmente'
            : label
                ? `todas as ${label}`
                : 'semanalmente';
    const until = recurrence.until?.resolved ? ` até ${formatDate(recurrence.until.resolved)}` : '';
    return `${base}${until}`;
}
function contextEcho(context) {
    if (!context)
        return null;
    const parts = [];
    if (context.date?.resolved)
        parts.push(`data: ${formatDate(context.date.resolved)}`);
    if (context.recurrence)
        parts.push(`recorrência: ${describeRecurrence(context.recurrence)}`);
    if (context.startTime)
        parts.push(`horário: ${context.startTime}`);
    if (context.title)
        parts.push(`título: "${context.title}"`);
    if (parts.length === 0)
        return null;
    return `Já definido: ${parts.join(' · ')}.`;
}
function contextFromEnvelope(envelope, meta) {
    const e = envelope.entities;
    return {
        sessionId: meta.sessionId,
        uid: meta.uid,
        intent: envelope.intent,
        title: e.title,
        date: e.date,
        startTime: e.startTime ?? undefined,
        endTime: e.endTime ?? undefined,
        recurrence: e.recurrence,
        limitDate: e.limitDate,
        maxSlots: e.maxSlots,
        filter: e.filter,
        location: e.location,
        participants: e.participants,
        notes: e.notes,
        missing: envelope.missing,
        createdAtMs: meta.createdAtMs,
        expiresAtMs: meta.createdAtMs + agenda_session_1.SESSION_TTL_MS,
    };
}
function mergeSessionContext(previous, current, meta) {
    return {
        sessionId: meta.sessionId,
        uid: meta.uid,
        intent: current?.intent ?? previous?.intent ?? 'clarify',
        title: current?.title ?? previous?.title,
        date: current?.date ?? previous?.date,
        startTime: current?.startTime ?? previous?.startTime,
        endTime: current?.endTime ?? previous?.endTime,
        recurrence: current?.recurrence ?? previous?.recurrence,
        limitDate: current?.limitDate ?? previous?.limitDate,
        maxSlots: current?.maxSlots ?? previous?.maxSlots,
        filter: current?.filter ?? previous?.filter,
        location: current?.location ?? previous?.location,
        participants: current?.participants ?? previous?.participants,
        notes: current?.notes ?? previous?.notes,
        missing: current && current.missing.length > 0 ? current.missing : (previous?.missing ?? []),
        createdAtMs: meta.createdAtMs,
        expiresAtMs: meta.createdAtMs + agenda_session_1.SESSION_TTL_MS,
    };
}
const RECURRENCE_CONTINUITY_SUGGESTIONS = ['Manter recorrência', 'Apenas uma ocorrência'];
function buildRecurrenceContinuityRefinement(context) {
    const description = context.recurrence ? describeRecurrence(context.recurrence) : 'recorrência';
    const when = context.date?.resolved ? ` a partir de ${formatDate(context.date.resolved)}` : '';
    return {
        question: `No turno anterior você pediu ${description}${when}. A sua nova mensagem não menciona recorrência. Devo manter a recorrência ou agendar apenas uma ocorrência?`,
        suggestions: [...RECURRENCE_CONTINUITY_SUGGESTIONS],
    };
}
function minutes(value) {
    if (!value)
        return null;
    const [hour, minute] = value.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute))
        return null;
    return hour * 60 + minute;
}
function hasTimeOverlap(existing, start, end) {
    const existingStart = minutes(existing.time);
    const proposedStart = minutes(start);
    if (existingStart === null || proposedStart === null)
        return false;
    const proposedEnd = minutes(end) ?? proposedStart + 60;
    const existingEnd = minutes(existing.endTime) ?? existingStart + 60;
    return existingStart < proposedEnd && proposedStart < existingEnd;
}
function normalizeTitle(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}
function rankByTitle(needle, candidate) {
    const n = normalizeTitle(needle);
    const c = normalizeTitle(candidate);
    if (!n || !c)
        return -1;
    if (c === n)
        return 0;
    if (c.startsWith(n))
        return 1;
    if (c.includes(n))
        return 2;
    const needleTokens = n.split(' ').filter(Boolean);
    const candidateTokens = new Set(c.split(' ').filter(Boolean));
    if (needleTokens.some((token) => candidateTokens.has(token)))
        return 3;
    return -1;
}
async function collectWarnings(uid, dates, title, startTime, endTime, agenda, excludeId) {
    const warnings = [];
    const normalized = normalizeTitle(title);
    for (const date of dates.slice(0, MAX_CONFLICT_DATES_TO_READ)) {
        const existing = await agenda.onDay(uid, date);
        for (const commitment of existing) {
            if (commitment.id === excludeId)
                continue;
            const duplicate = normalizeTitle(commitment.title) === normalized && hasTimeOverlap(commitment, startTime, endTime);
            if (duplicate) {
                warnings.push({ type: 'duplicate', date, message: `Já existe "${commitment.title}" em ${formatDate(date)} nesse horário.` });
            }
            else if (hasTimeOverlap(commitment, startTime, endTime)) {
                warnings.push({ type: 'conflict', date, message: `Há conflito de horário com "${commitment.title}" em ${formatDate(date)}.` });
            }
        }
    }
    return warnings;
}
function buildSummary(title, count, firstDate, lastDate, startTime, endTime, maxSlots = false) {
    const time = startTime ? ` às ${startTime}${endTime ? ` às ${endTime}` : ''}` : '';
    const occurrences = count === 1 ? '1 compromisso' : `${count} compromissos`;
    const range = count === 1 ? formatDate(firstDate) : `de ${formatDate(firstDate)} a ${formatDate(lastDate)}`;
    const limit = maxSlots ? ', até o limite máximo da agenda' : '';
    return `Entendi! Vou agendar "${title}" — ${occurrences}${time}, ${range}${limit}. Você prefere ativar o alarme ou apenas anotar? Confirma assim?`;
}
function buildDeleteSummary(count, title) {
    const items = count === 1 ? '1 compromisso' : `${count} compromissos`;
    const reference = title ? ` com o nome "${title}"` : '';
    return `Entendi. Encontrei ${items}${reference}. Pretendo excluí-los permanentemente. Posso prosseguir?`;
}
function snapshotFromCommitment(item) {
    return {
        title: item.title,
        date: (0, agenda_time_1.isoFromDateMs)(item.dateMs),
        startTime: item.time ?? null,
        endTime: item.endTime ?? null,
        location: item.location ?? null,
        participants: item.participants ?? null,
        notes: item.notes ?? null,
    };
}
function buildEditAfter(before, entities) {
    return {
        title: entities.title ?? before.title,
        date: entities.date?.resolved ?? before.date,
        startTime: entities.startTime ?? before.startTime,
        endTime: entities.endTime ?? before.endTime,
        location: entities.location !== undefined ? entities.location : before.location,
        participants: entities.participants !== undefined ? entities.participants : before.participants,
        notes: entities.notes !== undefined ? entities.notes : before.notes,
    };
}
function editSnapshotsEqual(a, b) {
    return a.title === b.title
        && a.date === b.date
        && (a.startTime ?? null) === (b.startTime ?? null)
        && (a.endTime ?? null) === (b.endTime ?? null)
        && (a.location ?? null) === (b.location ?? null)
        && JSON.stringify(a.participants ?? null) === JSON.stringify(b.participants ?? null)
        && (a.notes ?? null) === (b.notes ?? null);
}
function buildEditSummary(before, after) {
    const changes = [];
    if (before.title !== after.title)
        changes.push(`o nome para "${after.title}"`);
    if (before.date !== after.date)
        changes.push(`a data para ${formatDate(after.date)}`);
    if ((before.startTime ?? null) !== (after.startTime ?? null))
        changes.push(`o início para ${after.startTime ?? 'indefinido'}`);
    if ((before.endTime ?? null) !== (after.endTime ?? null))
        changes.push(`o término para ${after.endTime ?? 'indefinido'}`);
    if ((before.location ?? null) !== (after.location ?? null))
        changes.push(`o local para ${after.location ?? 'sem local'}`);
    if (JSON.stringify(before.participants ?? null) !== JSON.stringify(after.participants ?? null))
        changes.push('os participantes');
    if ((before.notes ?? null) !== (after.notes ?? null))
        changes.push('as observações');
    if (changes.length === 0)
        return `Entendi! Vou editar "${after.title}". Confirma?`;
    return `Entendi! Vou editar "${after.title}" alterando ${changes.join(' e ')}. Confirma?`;
}
async function resolveEditTarget(uid, envelope, agenda) {
    const title = envelope.entities.title ?? '';
    if (!title)
        return { kind: 'not_found', title };
    let candidates = await agenda.searchByTitle(uid, title, { maxResults: MAX_EDIT_SCAN });
    if (candidates.length === 0)
        return { kind: 'not_found', title };
    const newDate = envelope.entities.date?.resolved;
    if (newDate) {
        const onDate = candidates.filter((item) => (0, agenda_time_1.isoFromDateMs)(item.dateMs) === newDate);
        if (onDate.length > 0)
            candidates = onDate;
    }
    if (envelope.entities.startTime && candidates.length > 1) {
        const atTime = candidates.filter((item) => item.time === envelope.entities.startTime);
        if (atTime.length > 0)
            candidates = atTime;
    }
    if (candidates.length === 0)
        return { kind: 'not_found', title };
    if (candidates.length === 1) {
        const target = candidates[0];
        if (target.seriesId)
            return { kind: 'recurring', title };
        return { kind: 'ok', target };
    }
    return { kind: 'ambiguous', candidates, title };
}
async function handleEditIntent(uid, envelope, data, dependencies, now, requestId) {
    logStage(requestId, 'resolve_edit_target', { title: envelope.entities.title ?? null });
    const resolved = await resolveEditTarget(uid, envelope, dependencies.agenda);
    if (resolved.kind === 'not_found') {
        return clarification([], [`Não encontrei nenhum compromisso com o nome "${resolved.title}". Informe o nome exato do compromisso que deseja editar.`]);
    }
    if (resolved.kind === 'recurring') {
        return clarification([], [`O compromisso "${resolved.title}" faz parte de uma série recorrente. A edição de séries recorrentes ainda não está disponível no Nexus na Agenda. Por enquanto, você pode excluir as ocorrências e criar novos compromissos.`]);
    }
    if (resolved.kind === 'ambiguous') {
        const options = resolved.candidates
            .slice(0, 10)
            .map((item) => `"${item.title}" em ${formatDate((0, agenda_time_1.isoFromDateMs)(item.dateMs))}${item.time ? ` às ${item.time}` : ''}`)
            .join('; ');
        return clarification([], [`Encontrei mais de um compromisso com esse nome (${options}). Informe a data ou o horário exato para eu identificar qual editar.`]);
    }
    const before = snapshotFromCommitment(resolved.target);
    const after = buildEditAfter(before, envelope.entities);
    if (editSnapshotsEqual(before, after)) {
        return clarification([], ['Não identifiquei o que alterar no compromisso. Informe o que deve mudar (nome, data, horário, local, participantes ou observações).']);
    }
    logStage(requestId, 'collect_edit_warnings', { date: after.date });
    const warnings = await collectWarnings(uid, [after.date], after.title, after.startTime ?? undefined, after.endTime ?? undefined, dependencies.agenda, resolved.target.id);
    const token = (0, node_crypto_1.randomUUID)();
    const createdAtMs = now.getTime();
    const expiresAtMs = createdAtMs + PENDING_TTL_MS;
    const recap = {
        intent: 'edit',
        action: envelope.action,
        title: after.title,
        startTime: after.startTime ?? undefined,
        endTime: after.endTime ?? undefined,
        firstDate: after.date,
        lastDate: after.date,
        occurrenceCount: 1,
        before,
        after,
        summary: buildEditSummary(before, after),
    };
    logStage(requestId, 'write_pending', { intent: 'edit', target: resolved.target.id });
    await dependencies.pending.write(uid, token, {
        uid,
        nonce: token,
        confirmationToken: token,
        status: 'awaiting_confirmation',
        createdAtMs,
        expiresAtMs,
        intent: 'edit',
        action: envelope.action,
        prompt: data.prompt,
        envelope,
        recap,
        warnings,
        target: { id: resolved.target.id },
        before,
        after,
    });
    return {
        success: true,
        outcome: 'proposal',
        status: 'awaiting_confirmation',
        confirmationToken: token,
        expiresAtMs,
        recap,
        warnings,
    };
}
async function resolveDeleteTargets(uid, envelope, agenda, today) {
    const filter = envelope.entities.filter;
    const title = filter?.field === 'title' ? filter.value : envelope.entities.title;
    const rawDateExpr = filter?.field === 'date' ? filter.value : envelope.entities.date?.expression;
    let period = null;
    let dayIso = null;
    if (rawDateExpr) {
        period = (0, agenda_time_1.resolvePeriodRange)(rawDateExpr, today);
        if (!period) {
            const resolved = (0, agenda_time_1.resolveDateExpression)(rawDateExpr, today);
            if (!resolved)
                return null;
            dayIso = resolved.iso;
        }
    }
    let candidates;
    if (title) {
        candidates = await agenda.searchByTitle(uid, title, { maxResults: MAX_DELETE_SCAN, sinceMs: deleteScanCutoffMs() });
        if (period) {
            candidates = candidates.filter((item) => item.dateMs >= period.startMs && item.dateMs < period.endMs);
        }
        else if (dayIso) {
            const range = (0, agenda_time_1.saoPauloDayRangeMillis)((0, agenda_time_1.isoToYmd)(dayIso));
            candidates = candidates.filter((item) => item.dateMs >= range.startMs && item.dateMs < range.endMs);
        }
    }
    else if (period) {
        candidates = await agenda.onPeriod(uid, period.startMs, period.endMs);
    }
    else if (dayIso) {
        candidates = await agenda.onDay(uid, dayIso);
    }
    else {
        candidates = [];
    }
    const targets = candidates.slice(0, MAX_DELETE_TARGETS).map((item) => ({
        id: item.id,
        title: item.title,
        time: item.time ?? null,
        endTime: item.endTime ?? null,
        dateMs: item.dateMs,
    }));
    return { targets, truncated: candidates.length > MAX_DELETE_TARGETS, scannedCount: candidates.length };
}
async function orchestrateAgendaInterpret(uid, data, dependencies) {
    const requestId = dependencies.requestId;
    const startedAtMs = Date.now();
    try {
        const result = await orchestrateAgendaInterpretCore(uid, data, dependencies);
        logger.info('[agenda:interpret] done', {
            requestId,
            success: result.success,
            outcome: result.success ? result.outcome : undefined,
            durationMs: Date.now() - startedAtMs,
        });
        return result;
    }
    catch (error) {
        logger.error('[agenda:interpret] falha inesperada na orquestração', {
            requestId,
            errorMessage: errorMessage(error),
            errorStack: errorStack(error),
            durationMs: Date.now() - startedAtMs,
        });
        throw error;
    }
}
async function orchestrateAgendaInterpretCore(uid, data, dependencies) {
    const requestId = dependencies.requestId;
    const now = dependencies.now ?? new Date();
    const sessionId = data.sessionId ?? null;
    const previousContext = sessionId
        ? await dependencies.session.read(uid, sessionId)
        : null;
    const { response: rawResponse, established } = await runInterpretation(uid, data, dependencies, previousContext);
    let response = rawResponse;
    if (response.success && response.outcome === 'clarification' && sessionId) {
        const echoContext = mergeSessionContext(previousContext, established, { uid, sessionId: sessionId ?? '', createdAtMs: now.getTime() });
        const echo = contextEcho(echoContext);
        if (echo) {
            const first = response.question ?? response.clarification.questions[0] ?? null;
            const echoed = first ? `${echo} ${first}` : echo;
            response = {
                ...response,
                question: echoed,
                clarification: {
                    ...response.clarification,
                    questions: [echoed, ...response.clarification.questions.slice(1)],
                },
            };
        }
        if (sessionId) {
            try {
                await dependencies.session.write(echoContext);
            }
            catch (error) {
                logger.warn('[agenda:interpret] falha ao persistir contexto de sessão', {
                    requestId,
                    errorMessage: errorMessage(error),
                });
            }
        }
    }
    return response;
}
async function runInterpretation(uid, data, dependencies, previousContext) {
    const requestId = dependencies.requestId;
    const now = dependencies.now ?? new Date();
    const today = (0, agenda_time_1.todayYmdInProductTimezone)(now);
    const systemPrompt = previousContext ? buildSystemPrompt(now, previousContext) : buildSystemPrompt(now);
    const messages = buildMessages(data.prompt, data.history ?? []);
    logStage(requestId, 'inicio', { promptLength: data.prompt.length, historyMessages: (data.history ?? []).length });
    let raw;
    try {
        raw = await callModel(dependencies.router, messages, systemPrompt);
        logStage(requestId, 'llm_ok', { rawLength: raw.length });
    }
    catch {
        logger.warn('[agenda:interpret] modelo temporariamente indisponível (contingência/falha de roteador)', { requestId });
        return { response: { success: false, error: 'O Nexus está temporariamente indisponível. Tente novamente em instantes.' }, established: null };
    }
    let parsed = tryParseEnvelope(raw);
    if (!parsed.ok) {
        const detail = parsed.errors.slice(0, 4).join('; ');
        logger.warn('[agenda:interpret] envelope inválido — nova tentativa com erros de schema', { requestId, errors: parsed.errors.slice(0, 4) });
        try {
            raw = await callModel(dependencies.router, [
                ...messages,
                {
                    role: 'user',
                    content: `Sua resposta anterior não passou na validação do contrato JSON. Erros: ${detail}. Responda SOMENTE com o envelope JSON estrito, sem markdown e sem texto adicional.`,
                },
            ], systemPrompt);
        }
        catch {
            if (hasCreateWithoutTimeEvidence(data.prompt)) {
                logStage(requestId, 'normalize_time_gap', { reason: 'retry_indisponivel_com_evidencia' });
                return { response: clarification(['startTime'], [], exports.TIME_GAP_REFINEMENT, TIME_GAP_QUESTION), established: null };
            }
            return { response: clarification([], [FRIENDLY_INVALID_QUESTION]), established: null };
        }
        parsed = tryParseEnvelope(raw);
        if (!parsed.ok) {
            if (hasCreateWithoutTimeEvidence(data.prompt)) {
                logStage(requestId, 'normalize_time_gap', { reason: 'retry_falhou_com_evidencia', parseErrors: parsed.errors.slice(0, 3) });
                return { response: clarification(['startTime'], [], exports.TIME_GAP_REFINEMENT, TIME_GAP_QUESTION), established: null };
            }
            return { response: clarification([], [FRIENDLY_INVALID_QUESTION]), established: null };
        }
    }
    logStage(requestId, 'envelope_ok', {
        intent: parsed.data.intent,
        action: parsed.data.action,
        entitiesKeys: Object.keys(parsed.data.entities),
        missing: parsed.data.missing,
        ambiguousCount: parsed.data.ambiguous.length,
    });
    const normalized = normalizeEnvelopeDates(parsed.data, today);
    const meta = { uid, sessionId: data.sessionId ?? '', createdAtMs: now.getTime() };
    const established = contextFromEnvelope(normalized, meta);
    const lowConfidence = [];
    if (normalized.entities.date?.confidence === 'low')
        lowConfidence.push('A data principal não pôde ser determinada com segurança.');
    if (normalized.entities.recurrence?.until?.confidence === 'low')
        lowConfidence.push('A data final da recorrência não pôde ser determinada com segurança.');
    if (normalized.entities.limitDate?.confidence === 'low')
        lowConfidence.push('O limite de dias não pôde ser determinado com segurança.');
    if (lowConfidence.length > 0)
        return { response: clarification([], lowConfidence), established };
    const validated = (0, agenda_intent_schema_1.parseAndValidateAgendaEnvelope)(JSON.stringify(normalized));
    if (!validated.ok) {
        const missing = validated.errors
            .filter((error) => error.includes('obrigatório'))
            .map((error) => error.replace(/^.*?\.(title|date).*$/, '$1'));
        const ambiguous = validated.errors.filter((error) => !error.includes('obrigatório'));
        const question = missing.length === 1 && missing[0] === 'title'
            ? (normalized.entities.startTime
                ? 'Qual será o título do compromisso?'
                : 'Qual será o título do compromisso? Se quiser, você também pode informar o horário.')
            : undefined;
        if (missing.length === 0 && hasCreateWithoutTimeEvidence(data.prompt)) {
            logStage(requestId, 'normalize_time_gap', { reason: 'validacao_sem_campo_obrigatorio_com_evidencia', errors: validated.errors.slice(0, 3) });
            return { response: clarification(['startTime'], [], exports.TIME_GAP_REFINEMENT, TIME_GAP_QUESTION), established };
        }
        return { response: clarification(missing, ambiguous, undefined, question), established };
    }
    const envelope = validated.data;
    logStage(requestId, 'validado', { intent: envelope.intent, action: envelope.action, dateResolved: envelope.entities.date?.resolved ?? null });
    if (envelope.intent === 'create' && previousContext?.recurrence && !envelope.entities.recurrence) {
        const refinement = buildRecurrenceContinuityRefinement(previousContext);
        logStage(requestId, 'recurrence_continuity', { hasSession: Boolean(previousContext) });
        return { response: clarification([], [], refinement), established };
    }
    if (envelope.intent === 'edit') {
        return { response: await handleEditIntent(uid, envelope, data, dependencies, now, requestId), established };
    }
    if (envelope.intent === 'clarify') {
        logStage(requestId, 'clarify', { missing: envelope.missing, ambiguousCount: envelope.ambiguous.length });
        const isOutOfScope = envelope.ambiguous.some((text) => /fugindo das minhas atribui/i.test(text));
        if (!isOutOfScope && hasCreateWithoutTimeEvidence(data.prompt)) {
            const onlyStartTimeGap = envelope.missing.length === 1 && envelope.missing[0] === 'startTime';
            if (envelope.missing.length === 0 || onlyStartTimeGap) {
                logStage(requestId, 'normalize_time_gap', { reason: onlyStartTimeGap ? 'clarify_startTime_com_evidencia' : 'clarify_vazio_com_evidencia', missing: envelope.missing });
                return { response: clarification(['startTime'], [], exports.TIME_GAP_REFINEMENT, TIME_GAP_QUESTION), established };
            }
        }
        return { response: clarification(envelope.missing, envelope.ambiguous), established };
    }
    if (envelope.intent === 'query') {
        logStage(requestId, 'query_agenda', { max: 10 });
        const commitments = await dependencies.agenda.upcoming(uid, 10);
        return {
            response: {
                success: true,
                outcome: 'query_result',
                status: 'ok',
                commitments: commitments.map(({ id, title, time, dateMs }) => ({ id, title, time, dateMs })),
            },
            established,
        };
    }
    if (envelope.intent === 'delete') {
        logStage(requestId, 'resolve_delete_targets', { hasTitle: Boolean(envelope.entities.title), hasFilter: Boolean(envelope.entities.filter) });
        const resolved = await resolveDeleteTargets(uid, envelope, dependencies.agenda, today);
        if (!resolved) {
            return { response: clarification([], ['Não consegui determinar a data do filtro de exclusão. Descreva-a de forma clara.']), established };
        }
        const filterReference = envelope.entities.filter?.field === 'title'
            ? `"${envelope.entities.filter.value}"`
            : envelope.entities.title
                ? `"${envelope.entities.title}"`
                : 'o critério informado';
        if (resolved.targets.length === 0) {
            return { response: clarification([], [`Não encontrei nenhum compromisso que atenda a ${filterReference}.`]), established };
        }
        const deleteTitle = envelope.entities.filter?.field === 'title'
            ? envelope.entities.filter.value
            : (envelope.entities.title ?? undefined);
        const warnings = [];
        if (resolved.truncated) {
            warnings.push({ type: 'truncated', message: `Encontrei mais compromissos do que o limite suportado. A exclusão será aplicada aos ${resolved.targets.length} mais recentes.` });
        }
        const recap = {
            intent: 'delete',
            action: envelope.action,
            title: deleteTitle,
            occurrenceCount: resolved.targets.length,
            matchCount: resolved.targets.length,
            scannedCount: resolved.scannedCount,
            affectedItems: resolved.targets,
            truncated: resolved.truncated,
            summary: buildDeleteSummary(resolved.targets.length, deleteTitle),
        };
        const token = (0, node_crypto_1.randomUUID)();
        const createdAtMs = now.getTime();
        const expiresAtMs = createdAtMs + PENDING_TTL_MS;
        logStage(requestId, 'write_pending', { intent: 'delete', targets: resolved.targets.length });
        await dependencies.pending.write(uid, token, {
            uid,
            nonce: token,
            confirmationToken: token,
            status: 'awaiting_confirmation',
            createdAtMs,
            expiresAtMs,
            intent: 'delete',
            action: envelope.action,
            prompt: data.prompt,
            envelope,
            recap,
            warnings,
            targets: resolved.targets,
        });
        return {
            response: {
                success: true,
                outcome: 'proposal',
                status: 'awaiting_confirmation',
                confirmationToken: token,
                expiresAtMs,
                recap,
                warnings,
            },
            established,
        };
    }
    if (envelope.intent === 'create') {
        const refinement = detectRecurrenceAmbiguity(envelope);
        if (refinement)
            return { response: clarification([], [], refinement), established };
    }
    if (!envelope.entities.date)
        return { response: clarification(['date'], []), established };
    const firstDate = envelope.entities.date.resolved;
    let lastDate = firstDate;
    let occurrenceCount = 1;
    const warnings = [];
    let recurrence;
    let maxSlotsUsed = false;
    if (envelope.entities.recurrence) {
        const limitDate = envelope.entities.limitDate?.resolved;
        maxSlotsUsed = envelope.entities.maxSlots === true;
        const until = envelope.entities.recurrence.until?.resolved
            ?? limitDate
            ?? (maxSlotsUsed ? undefined : addDaysForHorizon(today));
        const expanded = (0, agenda_time_1.expandRecurrence)({
            freq: envelope.entities.recurrence.freq,
            startIso: firstDate,
            untilIso: until,
        });
        occurrenceCount = expanded.occurrences.length;
        lastDate = expanded.last ?? firstDate;
        recurrence = {
            freq: envelope.entities.recurrence.freq,
            byDay: typeof envelope.entities.recurrence.byDay === 'number'
                ? envelope.entities.recurrence.byDay
                : (envelope.entities.recurrence.byDay?.[0] ?? undefined),
            until: lastDate,
        };
        if (expanded.truncated) {
            warnings.push({
                type: 'truncated',
                message: maxSlotsUsed
                    ? `A agenda foi preenchida até o limite de ${expanded.occurrences.length} compromissos.`
                    : `A recorrência foi limitada a ${expanded.occurrences.length} ocorrências.`,
            });
        }
        if (occurrenceCount === 0) {
            return { response: clarification([], ['A data inicial informada cai depois do limite da recorrência. Informe um período maior ou uma data inicial anterior.']), established };
        }
    }
    const title = envelope.entities.title ?? '';
    if (!title) {
        const question = envelope.entities.startTime
            ? 'Qual será o título do compromisso?'
            : 'Qual será o título do compromisso? Se quiser, você também pode informar o horário.';
        return { response: clarification(['title'], [], undefined, question), established };
    }
    const dates = recurrence
        ? (0, agenda_time_1.expandRecurrence)({ freq: recurrence.freq, startIso: firstDate, untilIso: recurrence.until }).occurrences
        : [firstDate];
    logStage(requestId, 'collect_warnings', { dates: dates.length });
    warnings.push(...await collectWarnings(uid, dates, title, envelope.entities.startTime ?? undefined, envelope.entities.endTime ?? undefined, dependencies.agenda));
    const token = (0, node_crypto_1.randomUUID)();
    const createdAtMs = now.getTime();
    const expiresAtMs = createdAtMs + PENDING_TTL_MS;
    const recap = {
        intent: envelope.intent,
        action: envelope.action,
        title,
        startTime: envelope.entities.startTime ?? undefined,
        endTime: envelope.entities.endTime ?? undefined,
        firstDate,
        lastDate,
        occurrenceCount,
        recurrence,
        summary: buildSummary(title, occurrenceCount, firstDate, lastDate, envelope.entities.startTime ?? undefined, envelope.entities.endTime ?? undefined, maxSlotsUsed),
    };
    let storedEnvelope = envelope;
    if (recurrence && (envelope.entities.limitDate || envelope.entities.maxSlots === true) && !envelope.entities.recurrence?.until) {
        storedEnvelope = {
            ...envelope,
            entities: {
                ...envelope.entities,
                recurrence: {
                    ...envelope.entities.recurrence,
                    until: {
                        expression: envelope.entities.limitDate?.expression ?? 'limite máximo da agenda',
                        resolved: lastDate,
                        confidence: 'high',
                    },
                },
            },
        };
    }
    logStage(requestId, 'write_pending', { intent: envelope.intent, occurrenceCount });
    await dependencies.pending.write(uid, token, {
        uid,
        nonce: token,
        confirmationToken: token,
        status: 'awaiting_confirmation',
        createdAtMs,
        expiresAtMs,
        intent: envelope.intent,
        action: envelope.action,
        prompt: data.prompt,
        envelope: storedEnvelope,
        recap,
        warnings,
    });
    return {
        response: {
            success: true,
            outcome: 'proposal',
            status: 'awaiting_confirmation',
            confirmationToken: token,
            expiresAtMs,
            recap,
            warnings,
        },
        established,
    };
}
function buildFirestoreDependencies(db) {
    const collectionPath = (uid) => `users/${uid}/agenda`;
    const mapDoc = (doc) => {
        const data = doc.data();
        const date = data.date;
        const participants = Array.isArray(data.participants)
            ? data.participants.filter((item) => typeof item === 'string')
            : null;
        return {
            id: doc.id,
            title: String(data.title ?? ''),
            time: typeof data.time === 'string' ? data.time : null,
            endTime: typeof data.endTime === 'string' ? data.endTime : null,
            dateMs: date?.toMillis?.() ?? 0,
            seriesId: typeof data.seriesId === 'string' ? data.seriesId : null,
            location: typeof data.location === 'string' ? data.location : null,
            participants: participants && participants.length > 0 ? participants : null,
            notes: typeof data.notes === 'string' ? data.notes : null,
        };
    };
    return {
        agenda: {
            async onDay(uid, isoDate) {
                const range = (0, agenda_time_1.saoPauloDayRangeMillis)((0, agenda_time_1.isoToYmd)(isoDate));
                const snapshot = await db.collection(collectionPath(uid))
                    .where('date', '>=', firestore_1.Timestamp.fromMillis(range.startMs))
                    .where('date', '<', firestore_1.Timestamp.fromMillis(range.endMs))
                    .get();
                return snapshot.docs.map(mapDoc);
            },
            async onPeriod(uid, startMs, endMs) {
                const snapshot = await db.collection(collectionPath(uid))
                    .where('date', '>=', firestore_1.Timestamp.fromMillis(startMs))
                    .where('date', '<', firestore_1.Timestamp.fromMillis(endMs))
                    .orderBy('date', 'asc')
                    .get();
                return snapshot.docs.map(mapDoc);
            },
            async upcoming(uid, max) {
                const snapshot = await db.collection(collectionPath(uid))
                    .where('date', '>=', firestore_1.Timestamp.fromDate(new Date()))
                    .orderBy('date', 'asc')
                    .limit(max)
                    .get();
                return snapshot.docs.map(mapDoc);
            },
            async searchByTitle(uid, title, opts) {
                const maxResults = opts?.maxResults ?? MAX_DELETE_SCAN;
                let base = db.collection(collectionPath(uid));
                if (typeof opts?.sinceMs === 'number') {
                    base = base.where('date', '>=', firestore_1.Timestamp.fromMillis(opts.sinceMs));
                }
                const snapshot = await base
                    .orderBy('date', 'desc')
                    .limit(maxResults)
                    .get();
                return snapshot.docs
                    .map(mapDoc)
                    .map((item) => ({ item, rank: rankByTitle(title, item.title) }))
                    .filter((entry) => entry.rank >= 0)
                    .sort((a, b) => a.rank - b.rank)
                    .map((entry) => entry.item)
                    .slice(0, MAX_DELETE_TARGETS);
            },
        },
        pending: {
            async write(uid, token, document) {
                await db.collection(`${collectionPath(uid)}/_nexus/pending`).doc(token).set((0, nexusAgendaCommit_1.sanitizeForFirestore)({
                    ...document,
                    createdAt: firestore_1.Timestamp.fromMillis(Number(document.createdAtMs)),
                    expiresAt: firestore_1.Timestamp.fromMillis(Number(document.expiresAtMs)),
                }));
            },
        },
        session: {
            async read(uid, sessionId) {
                return (0, agenda_session_1.readSessionContext)(db, uid, sessionId);
            },
            async write(context) {
                await (0, agenda_session_1.writeSessionContext)(db, context);
            },
        },
    };
}
exports.nexusAgendaInterpret = (0, https_1.onCall)({
    memory: '1GiB',
    timeoutSeconds: 60,
    region: 'us-central1',
    secrets: [secrets_1.GROQ_API_KEY, secrets_1.OPENROUTER_API_KEY],
}, async (request) => {
    const requestId = (0, node_crypto_1.randomUUID)();
    const startedAtMs = Date.now();
    try {
        const uid = requireAuth(request);
        logger.info('[agenda:interpret] start', {
            requestId,
            uid: safeUid(uid),
            source: request.data?.source ?? undefined,
        });
        const data = request.data;
        if (!data || typeof data.prompt !== 'string' || !data.prompt.trim()) {
            throw new https_1.HttpsError('invalid-argument', 'O comando de agenda é obrigatório.');
        }
        if (data.history !== undefined && !Array.isArray(data.history)) {
            throw new https_1.HttpsError('invalid-argument', 'O histórico de conversa é inválido.');
        }
        const history = data.history?.slice(0, MAX_HISTORY_MESSAGES);
        if (history && history.some((m) => typeof m !== 'object' || m === null || typeof m.text !== 'string')) {
            throw new https_1.HttpsError('invalid-argument', 'O histórico de conversa contém mensagens inválidas.');
        }
        if (data.sessionId !== undefined && (typeof data.sessionId !== 'string' || !data.sessionId.trim() || data.sessionId.length > 128)) {
            throw new https_1.HttpsError('invalid-argument', 'O identificador de sessão é inválido.');
        }
        const sessionId = typeof data.sessionId === 'string' && data.sessionId.trim() ? data.sessionId.trim() : undefined;
        logger.info('[agenda:interpret] payload_ok', { requestId, promptLength: data.prompt.length, historyMessages: history?.length ?? 0, hasSession: Boolean(sessionId) });
        const groqApiKey = process.env.GROQ_API_KEY;
        const openrouterApiKey = process.env.OPENROUTER_API_KEY;
        if (!groqApiKey && !openrouterApiKey) {
            logger.warn('[agenda:interpret] nenhuma API key de IA disponível no ambiente', { requestId });
        }
        const router = MultiModelRouter_1.MultiModelRouter.getInstance();
        router.updateApiKeys({ groq: groqApiKey, openrouter: openrouterApiKey });
        const result = await orchestrateAgendaInterpret(uid, { prompt: data.prompt, history: (history ?? []), sessionId }, { router, requestId, ...buildFirestoreDependencies((0, firestore_1.getFirestore)()) });
        logger.info('[agenda:interpret] ok', {
            requestId,
            success: result.success,
            outcome: result.success ? result.outcome : undefined,
            durationMs: Date.now() - startedAtMs,
        });
        return result;
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            logger.warn('[agenda:interpret] erro controlado devolvido ao cliente', {
                requestId,
                code: error.code,
                message: error.message,
                durationMs: Date.now() - startedAtMs,
            });
            throw error;
        }
        logger.error('[agenda:interpret] erro interno não tratado', {
            requestId,
            errorMessage: errorMessage(error),
            errorStack: errorStack(error),
            durationMs: Date.now() - startedAtMs,
        });
        throw new https_1.HttpsError('internal', 'Não foi possível processar seu comando de agenda. Tente novamente.', { requestId });
    }
});
//# sourceMappingURL=nexusAgendaInterpret.js.map