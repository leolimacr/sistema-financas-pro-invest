import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { randomUUID } from 'node:crypto';
import { jsonrepair } from 'jsonrepair';
import { MultiModelRouter } from './nexus-core/MultiModelRouter';
import {
  parseAgendaEnvelope,
  parseAndValidateAgendaEnvelope,
  type AgendaEditSnapshot,
  type AgendaEnvelope,
  type AgendaEnvelopeParseResult,
  type AgendaEntities,
} from './nexus-core/agenda-intent-schema';
import {
  DEFAULT_RECURRENCE_HORIZON_DAYS,
  expandRecurrence,
  isoFromDateMs,
  isoToYmd,
  nextWeekday,
  PRODUCT_TIMEZONE,
  resolveDateExpression,
  resolvePeriodRange,
  resolveWindowExpression,
  saoPauloDayRangeMillis,
  todayYmdInProductTimezone,
  ymdToIso,
  type YMD,
} from './nexus-core/agenda-time';
import {
  SESSION_TTL_MS,
  readSessionContext,
  writeSessionContext,
  type AgendaSessionContext,
  type SessionStore,
} from './nexus-core/agenda-session';
import {
  GROQ_API_KEY as GROQ_API_KEY_SECRET,
  OPENROUTER_API_KEY as OPENROUTER_API_KEY_SECRET,
} from './secrets';
import { sanitizeForFirestore } from './nexusAgendaCommit';

const PENDING_TTL_MS = 10 * 60 * 1000;
const MAX_CONFLICT_DATES_TO_READ = 366;
const MAX_DELETE_SCAN = 5000;
const MAX_DELETE_TARGETS = 500;
/**
 * Janela temporal do scan de exclusão em massa: 12 meses para trás, sem teto
 * para o futuro (recorrências futuras são o caso principal do delete em
 * massa). Corta a cauda histórica infinita — onde o custo do scan explode —
 * sem afetar o caso de uso. Só o caminho de delete envia `sinceMs`; o edit
 * mantém o comportamento anterior.
 */
export function deleteScanCutoffMs(nowMs: number = Date.now()): number {
  const cutoff = new Date(nowMs);
  cutoff.setMonth(cutoff.getMonth() - 12);
  return cutoff.getTime();
}
const MAX_EDIT_SCAN = 500;
/** Teto de mensagens de histórico aceitas por chamada (defesa contra abuso). */
const MAX_HISTORY_MESSAGES = 50;
/** Orçamento de tokens reservado ao histórico dentro do contexto do LLM. */
const MAX_HISTORY_TOKENS = 2500;
/** Heurística pt-BR sem tokenizador: ~4 caracteres por token. */
const HISTORY_CHARS_PER_TOKEN = 4;
/** Mínimo de mensagens de histórico SEMPRE preservado (a troca mais recente). */
const MIN_HISTORY_MESSAGES = 2;
/** Pergunta amigável quando o LLM não consegue estruturar o envelope. */
const FRIENDLY_INVALID_QUESTION =
  'Não consegui organizar essa solicitação. Você pode me dizer, por exemplo, o nome do compromisso, a data e o horário?';

/**
 * Pergunta natural quando o pedido de criação tem data, mas falta apenas
 * decidir o horário. NUNCA se refere a nomes técnicos de campos.
 */
const TIME_GAP_QUESTION = 'Você quer inserir o horário neste compromisso?';
export const TIME_GAP_REFINEMENT: AgendaRefinement = {
  question: TIME_GAP_QUESTION,
  suggestions: ['Sem horário', '09:00', '14:00', '19:00'],
};

/** Verbos que indicam intenção de criar um compromisso. */
const SCHEDULING_VERB_RE = /\b(agend(?:ar|e|ada|amos)?|marque|marcar|adicionar|incluir|anotar|reservar|criar|crie)\b/i;

/** Sinais de data no texto do usuário (relativos, dias da semana, datas). */
const DATE_SIGNAL_RE = /(?:^|[^a-z0-9])(hoje|amanh[aã]|depois\s+de\s+amanh[aã]|segunda|ter[cç]a|quarta|quinta|sexta|s[aá]bado|domingo|pr[oó]xim[ao]|dia\s+\d{1,2}|\d{1,2}\/\d{1,2}|semana\s+que\s+vem|no\s+m[eê]s|de\s+(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))(?![a-z0-9])/i;

/** Sinais de horário JÁ informado pelo usuário (impede a pergunta de horário). */
const TIME_PRESENT_RE = /(?:^|[^a-z0-9])(\d{1,2}\s*[hH](?:\d{2})?|\d{1,2}:\d{2}|[àa]s\s+\d{1,2}|de\s+manh[aã]|[àa]\s+tarde|[àa]\s+noite|meio[- ]?dia|meia[- ]?noite)(?![a-z0-9])/i;

/**
 * Evidência mínima de um pedido de CRIAÇÃO com data e SEM horário no TEXTO
 * ATUAL do usuário: um verbo de agendamento + um sinal de data, e nenhum
 * horário já manifestado. Só isso habilita a pergunta natural de horário —
 * pedidos ambíguos, fora de escopo ou sem data NÃO passam por aqui.
 */
function hasCreateWithoutTimeEvidence(prompt: string): boolean {
  return SCHEDULING_VERB_RE.test(prompt)
    && DATE_SIGNAL_RE.test(prompt)
    && !TIME_PRESENT_RE.test(prompt);
}

/** Registra uma etapa do fluxo com requestId, sem dados sensíveis. */
function logStage(requestId: string | undefined, stage: string, extra?: Record<string, unknown>): void {
  logger.info('[agenda:interpret]', { requestId, stage, ...extra });
}

/** uid mascarado para correlação em logs sem expor o identificador completo. */
function safeUid(uid: string): string {
  return uid.length > 12 ? `${uid.slice(0, 8)}…${uid.slice(-4)}` : 'short';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'erro desconhecido';
}

function errorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

export interface InterpretRequestData {
  prompt: string;
  history?: Array<{ role: string; text: string }>;
  /** Sessão de diálogo ativa (ciclo de clarificação). Persistida no backend. */
  sessionId?: string;
}

export interface StoredAgendaCommitment {
  id: string;
  title: string;
  time?: string | null;
  endTime?: string | null;
  dateMs: number;
  /** ID da série quando o compromisso pertence a uma recorrência (bloqueia edição). */
  seriesId?: string | null;
  location?: string | null;
  participants?: string[] | null;
  notes?: string | null;
}

export interface AgendaReader {
  onDay(uid: string, isoDate: string): Promise<StoredAgendaCommitment[]>;
  /** Busca em um intervalo contíguo de dias civis (ex.: mês inteiro). [startMs, endMs). */
  onPeriod(uid: string, startMs: number, endMs: number): Promise<StoredAgendaCommitment[]>;
  upcoming(uid: string, max: number): Promise<StoredAgendaCommitment[]>;
  /** Busca por título em toda a agenda (normalizado, case/acento-insensível). */
  searchByTitle(uid: string, title: string, opts?: { maxResults?: number; sinceMs?: number }): Promise<StoredAgendaCommitment[]>;
}

export interface PendingWriter {
  write(uid: string, token: string, document: Record<string, unknown>): Promise<void>;
}

export interface AgendaRouter {
  routeRequest(
    messages: unknown[],
    systemPrompt?: string,
    options?: Record<string, unknown>,
  ): Promise<{ content: string; success?: boolean; isContingency?: boolean }>;
}

export interface InterpretDependencies {
  router: AgendaRouter;
  agenda: AgendaReader;
  pending: PendingWriter;
  /** Persistência do estado estruturado de diálogo (continuidade entre turnos). */
  session: SessionStore;
  now?: Date;
  /** Correlação de logs entre etapas (opcional; gerado pelo handler onCall). */
  requestId?: string;
}

export interface AgendaWarning {
  type: 'conflict' | 'duplicate' | 'truncated';
  date?: string;
  message: string;
}

/** Item afetado por uma operação em massa (ex.: exclusão por título). */
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
  /** Quantidade de itens que uma operação em massa (delete) vai afetar. */
  matchCount?: number;
  /**
   * Documentos avaliados pelo scan de título antes do corte de
   * MAX_DELETE_TARGETS (observabilidade de custo do delete em massa).
   */
  scannedCount?: number;
  /** Esboço dos itens afetados (para dar segurança antes da aprovação). */
  affectedItems?: AgendaAffectedItem[];
  /** TRUE quando a operação em massa foi truncada no teto de itens. */
  truncated?: boolean;
  /** Estado atual do compromisso em uma edição (para exibir o diff antes/depois). */
  before?: AgendaEditSnapshot;
  /** Estado alvo do compromisso em uma edição (após aplicar os novos valores). */
  after?: AgendaEditSnapshot;
  summary: string;
}

export interface AgendaRefinement {
  /** Pergunta de refinamento exibida ao usuário (diálogo ativo). */
  question: string;
  /** Chips de resposta rápida sugeridos na interface. */
  suggestions: string[];
}

export type InterpretResponse =
  | {
      success: true;
      outcome: 'proposal';
      status: 'awaiting_confirmation';
      confirmationToken: string;
      expiresAtMs: number;
      recap: AgendaRecap;
      warnings: AgendaWarning[];
    }
  | {
      success: true;
      outcome: 'clarification';
      status: 'awaiting_clarification';
      /**
       * Pergunta natural primária (fonte única das perguntas geradas no
       * backend). Nunca contém nomes técnicos de campos.
       */
      question: string | null;
      clarification: {
        missing: string[];
        ambiguous: string[];
        questions: string[];
        refinement?: AgendaRefinement;
      };
    }
  | {
      success: true;
      outcome: 'query_result';
      status: 'ok';
      commitments: Array<{ id: string; title: string; time?: string | null; dateMs: number }>;
    }
  | { success: false; error: string };

export function requireAuth(request: { auth?: { uid?: string } | null }): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Login necessário para usar a Agenda.');
  return uid;
}

export function buildSystemPrompt(now: Date, context?: AgendaSessionContext): string {
  const today = todayYmdInProductTimezone(now);
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

Data/hora do servidor em ${PRODUCT_TIMEZONE}: ${ymdToIso(today)}.

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
  if (!context) return prompt;

  return `${prompt}

${buildSessionContextBlock(context)}`;
}

/**
 * Bloco explícito de contexto injetado no prompt do sistema quando a chamada
 * chega com uma sessão de diálogo ativa (turno >= 2). Orientação de
 * continuidade: MANTENHA a recorrência/estado já estabelecido se o usuário não
 * o repetir — nunca regrave do zero.
 */
function buildSessionContextBlock(context: AgendaSessionContext): string {
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

/**
 * Monta as mensagens enviadas ao LLM a partir do histórico da sessão.
 *
 * Contrato de não-duplicação: `prompt` (a mensagem atual) entra SEMPRE como a
 * última mensagem; `history` contém apenas as mensagens ANTERIORES. O histórico
 * é truncado por orçamento de caracteres (heurística de tokens) caminhando do
 * fim para o início, garantindo que a troca mais recente nunca seja perdida.
 */
export function buildMessages(prompt: string, history: Array<{ role: string; text: string }>): unknown[] {
  const mapped = history.slice(-MAX_HISTORY_MESSAGES).map((message) => ({
    role: message.role === 'assistant' || message.role === 'ai' ? 'assistant' : 'user',
    content: message.text,
  }));

  let budget = MAX_HISTORY_TOKENS * HISTORY_CHARS_PER_TOKEN;
  const kept: Array<{ role: string; content: string }> = [];
  for (let i = mapped.length - 1; i >= 0; i -= 1) {
    const message = mapped[i];
    const canDropOlder = kept.length >= MIN_HISTORY_MESSAGES;
    if (canDropOlder && message.content.length > budget) break;
    budget -= message.content.length;
    kept.unshift(message);
  }

  return [...kept, { role: 'user', content: prompt }];
}

async function callModel(
  router: AgendaRouter,
  messages: unknown[],
  systemPrompt: string,
): Promise<string> {
  const response = await router.routeRequest(messages, systemPrompt, {
    temperature: 0.1,
    maxTokens: 1000,
    responseFormat: 'json',
    fallbackContext: { primaryIntent: 'agenda_interpret' },
  });
  if (response.isContingency) throw new Error('Modelo temporariamente indisponível');
  return response.content ?? '';
}

/**
 * Extrai o envelope JSON da resposta do modelo, tolerando cercas de markdown
 * (```json) e texto ao redor. Fallback: tenta reparar o JSON com jsonrepair.
 */
function extractJsonEnvelope(raw: string): string {
  const trimmed = raw.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fenced) return fenced[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function tryParseEnvelope(raw: string): AgendaEnvelopeParseResult {
  const cleaned = extractJsonEnvelope(raw);
  const direct = parseAgendaEnvelope(cleaned);
  if (direct.ok) return direct;
  try {
    const repaired = jsonrepair(cleaned);
    if (repaired !== cleaned) {
      const result = parseAgendaEnvelope(repaired);
      if (result.ok) return result;
    }
  } catch {
    // Falha de reparo — mantém o erro estrutural original
  }
  return direct;
}

/** Horário embutido no título (ex.: "Catequese 19h", "Reunião 17h30", "Reunião 19:00"). */
const TIME_IN_TITLE_RE = /\b(\d{1,2})\s*[:hH](\d{2})?/;

/**
 * Inferência determinística de startTime a partir do TÍTULO do compromisso.
 * Usada quando o usuário declarou o horário apenas no nome (ex.: "Catequese
 * 19h") e o modelo não o extraiu para entities.startTime. Nunca inventa um
 * horário que não esteja escrito no título — retorna null sem marcador de hora.
 */
export function inferStartTimeFromTitle(title: string): string | null {
  const match = TIME_IN_TITLE_RE.exec(title);
  if (!match) return null;
  const hour = Number(match[1]);
  if (hour > 23) return null;
  const minute = match[2] !== undefined ? Number(match[2]) : 0;
  if (minute > 59) return null;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function normalizeEnvelopeDates(envelope: AgendaEnvelope, today: YMD): AgendaEnvelope {
  const entities = { ...envelope.entities };
  // Payload real do LLM emite "startTime": null / "endTime": null como ausência
  // (padrão copiado de location/participants/notes). Normaliza null → undefined
  // ANTES das regras de negócio e da inferência de horário do título, para todo
  // o downstream (validação, recap, sessão, collectWarnings, commit) continuar
  // vendo apenas `string | undefined`.
  if (entities.startTime === null) entities.startTime = undefined;
  if (entities.endTime === null) entities.endTime = undefined;
  if (entities.date) {
    const resolved = resolveDateExpression(entities.date.expression, today);
    if (resolved) {
      entities.date = { ...entities.date, resolved: resolved.iso, confidence: resolved.confidence };
    } else if (envelope.intent === 'delete' && resolvePeriodRange(entities.date.expression, today)) {
      // Exclusão por mês/período: a expressão ("novembro", "mês que vem") é um
      // intervalo válido, não um dia único. Mantém confidence alta — o dia
      // "resolved" é irrelevante; o backend consulta o período inteiro.
      entities.date = { ...entities.date, confidence: 'high' };
    } else {
      entities.date = { ...entities.date, confidence: 'low' };
    }
  }
  if (entities.recurrence?.until) {
    const resolved = resolveDateExpression(entities.recurrence.until.expression, today);
    entities.recurrence = {
      ...entities.recurrence,
      until: resolved
        ? { ...entities.recurrence.until, resolved: resolved.iso, confidence: resolved.confidence }
        : { ...entities.recurrence.until, confidence: 'low' },
    };
  }
  // byDay aceita array na entrada (ex.: [1]); normaliza para o número único
  // canônico que todo o pipeline downstream (validação, recap, sessão,
  // describeRecurrence) espera.
  if (entities.recurrence?.byDay !== undefined) {
    const byDay = entities.recurrence.byDay;
    entities.recurrence = {
      ...entities.recurrence,
      byDay: Array.isArray(byDay) ? byDay[0] : byDay,
    };
  }
  // Horário declarado apenas no TÍTULO ("Catequese 19h"): preenche startTime
  // antes da validação — o compromisso recorrente sai com horário definido sem
  // clarificação nem falha de validação.
  if (envelope.intent === 'create' && !entities.startTime && entities.title) {
    const inferred = inferStartTimeFromTitle(entities.title);
    if (inferred) entities.startTime = inferred;
  }
  if (entities.limitDate) {
    const windowIso = resolveWindowExpression(entities.limitDate.expression, today);
    const resolved = windowIso
      ? { iso: windowIso, confidence: 'high' as const }
      : resolveDateExpression(entities.limitDate.expression, today);
    entities.limitDate = resolved
      ? { ...entities.limitDate, resolved: resolved.iso, confidence: resolved.confidence }
      : { ...entities.limitDate, confidence: 'low' };
  }
  return { ...envelope, entities };
}

function addDaysForHorizon(today: YMD): string {
  const next = nextWeekday(today, 1, { allowToday: true });
  const days = DEFAULT_RECURRENCE_HORIZON_DAYS - 7;
  const date = new Date(Date.UTC(next.y, next.m0, next.d) + days * 86400000);
  return ymdToIso({ y: date.getUTCFullYear(), m0: date.getUTCMonth(), d: date.getUTCDate() });
}

function formatDate(iso?: string): string {
  if (!iso) return 'data não definida';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Perguntas naturais exibidas ao usuário quando um campo obrigatório está
 * ausente. Nunca expõem o nome técnico interno do campo (`title`, `startTime`,
 * `byDay` etc.) — apenas a pergunta conversacional.
 */
const NATURAL_FIELD_QUESTIONS: Record<string, string> = {
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

/** Forma gramatical dos campos para listas naturais combinadas. */
const NATURAL_FIELD_NAMES: Record<string, string> = {
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

/** Ordem de prioridade para perguntas combinadas (título → data → horário → resto). */
const FIELD_PRIORITY: string[] = [
  'title', 'date', 'startTime', 'endTime',
  'location', 'participants', 'notes',
  'byDay', 'recurrence', 'limitDate', 'filter',
];

/** Combinações comuns com uma pergunta única e natural. */
const COMBINED_QUESTIONS: Record<string, string> = {
  'title,date,startTime': 'Qual será o título do compromisso? Para qual período devo agendá-lo e em que horário?',
  'title,startTime': 'Qual será o título do compromisso e em qual horário você deseja marcá-lo?',
  'title,date': 'Qual será o título do compromisso e para qual dia ou período devo agendá-lo?',
  'date,startTime': 'Para qual dia ou período devo agendar esse compromisso e em que horário?',
};

/**
 * Converte campos ausentes em perguntas naturais e conversacionais.
 * - Um campo → a pergunta específica daquele campo.
 * - Combinações conhecidas → uma única pergunta combinada.
 * - Mais campos → uma frase natural com conectivos, nunca nomes técnicos.
 * - `ambiguous` (já redigido como pergunta natural pelo modelo) é reaproveitado
 *   como está, sem prefixo técnico.
 */
function buildQuestions(missing: string[], ambiguous: string[], refinement?: AgendaRefinement): string[] {
  const questions: string[] = [];
  if (refinement) questions.push(refinement.question);

  const knownFields = missing
    .filter((field) => Object.prototype.hasOwnProperty.call(NATURAL_FIELD_QUESTIONS, field))
    .sort((a, b) => FIELD_PRIORITY.indexOf(a) - FIELD_PRIORITY.indexOf(b));
  const unknownFields = missing.filter((field) => !Object.prototype.hasOwnProperty.call(NATURAL_FIELD_QUESTIONS, field));

  if (knownFields.length > 0) {
    const combined = COMBINED_QUESTIONS[knownFields.join(',')];
    if (combined) {
      questions.push(combined);
    } else if (knownFields.length === 1) {
      questions.push(NATURAL_FIELD_QUESTIONS[knownFields[0]]);
    } else {
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

/** Nomes técnicos de campos que NUNCA podem aparecer nas perguntas exibidas. */
const TECHNICAL_FIELD_TOKENS = [
  'title', 'startTime', 'endTime', 'byDay', 'limitDate',
  'recurrence', 'filter', 'missing', 'participants',
];

/** TRUE quando o texto contém um nome técnico de campo (ex.: "Informe title."). */
function hasTechnicalFieldName(text: string): boolean {
  const normalized = text.toLowerCase();
  return TECHNICAL_FIELD_TOKENS.some((token) =>
    new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`).test(normalized),
  );
}

/**
 * Monta a resposta de esclarecimento. As perguntas naturais são geradas em um
 * ÚNICO lugar (backend) a partir dos campos ausentes; textos de `ambiguous`
 * vindos do modelo são reaproveitados apenas quando não contêm nomes técnicos.
 */
function clarification(
  missing: string[],
  ambiguous: string[],
  refinement?: AgendaRefinement,
  primaryQuestion?: string,
): InterpretResponse {
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

const RECURRENCE_REFINEMENT_QUESTION =
  'Entendi que você quer uma recorrência. Até quando gostaria de repetir esse compromisso?';
const RECURRENCE_REFINEMENT_SUGGESTIONS = ['Até o final do ano', 'Sem prazo máximo'] as const;

/**
 * Detecta recorrência SEM horizonte definido (sem recurrence.until, sem
 * limitDate e sem maxSlots). Nesses casos o fluxo NÃO assume o default
 * silencioso — entra em refinamento ativo perguntando como o usuário quer o
 * prazo (até uma data limite vs. preencher até o limite da agenda).
 */
function detectRecurrenceAmbiguity(envelope: AgendaEnvelope): AgendaRefinement | null {
  if (envelope.intent !== 'create' || !envelope.entities.recurrence) return null;
  const hasHorizon = Boolean(
    envelope.entities.recurrence.until
    || envelope.entities.limitDate
    || envelope.entities.maxSlots === true,
  );
  if (hasHorizon) return null;
  return {
    question: RECURRENCE_REFINEMENT_QUESTION,
    suggestions: [...RECURRENCE_REFINEMENT_SUGGESTIONS],
  };
}

// ───────────────────────────── Estado de sessão (continuidade) ─────────────────────────────

const WEEKDAY_LABELS_PT: Record<number, string> = {
  1: 'segundas-feiras',
  2: 'terças-feiras',
  3: 'quartas-feiras',
  4: 'quintas-feiras',
  5: 'sextas-feiras',
  6: 'sábados',
  7: 'domingos',
};

/** Descrição humana de uma recorrência já resolvida ("todas as terças-feiras até 31/10/2026"). */
function describeRecurrence(recurrence: { freq: string; byDay?: number | number[]; until?: { resolved?: string } | null }): string {
  const rawByDay = recurrence.byDay;
  const weekday = typeof rawByDay === 'number' ? rawByDay : (rawByDay?.[0] ?? 0);
  const label = weekday ? WEEKDAY_LABELS_PT[weekday] : null;
  const base =
    recurrence.freq === 'daily'
      ? 'todos os dias'
      : recurrence.freq === 'monthly'
        ? 'mensalmente'
        : label
          ? `todas as ${label}`
          : 'semanalmente';
  const until = recurrence.until?.resolved ? ` até ${formatDate(recurrence.until.resolved)}` : '';
  return `${base}${until}`;
}

/**
 * Eco do contexto já estabelecido para pré-fixar nas perguntas de clarificação
 * (ex.: "Já definido: data: 06/10/2026 · recorrência: todas as terças-feiras
 * até 31/10/2026."). Nunca expõe nomes técnicos de campos.
 */
function contextEcho(context: AgendaSessionContext | null): string | null {
  if (!context) return null;
  const parts: string[] = [];
  if (context.date?.resolved) parts.push(`data: ${formatDate(context.date.resolved)}`);
  if (context.recurrence) parts.push(`recorrência: ${describeRecurrence(context.recurrence)}`);
  if (context.startTime) parts.push(`horário: ${context.startTime}`);
  if (context.title) parts.push(`título: "${context.title}"`);
  if (parts.length === 0) return null;
  return `Já definido: ${parts.join(' · ')}.`;
}

/** Converte um envelope já normalizado (datas resolvidas) em contexto de sessão. */
function contextFromEnvelope(
  envelope: AgendaEnvelope,
  meta: { uid: string; sessionId: string; createdAtMs: number },
): AgendaSessionContext {
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
    expiresAtMs: meta.createdAtMs + SESSION_TTL_MS,
  };
}

/**
 * Mescla o contexto anterior com o estado do turno atual. O que já estava
 * estabelecido prevalece quando o turno atual não traz o campo; campos novos
 * do turno atual vencem os anteriores.
 */
function mergeSessionContext(
  previous: AgendaSessionContext | null,
  current: AgendaSessionContext | null,
  meta: { uid: string; sessionId: string; createdAtMs: number },
): AgendaSessionContext {
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
    expiresAtMs: meta.createdAtMs + SESSION_TTL_MS,
  };
}

const RECURRENCE_CONTINUITY_SUGGESTIONS = ['Manter recorrência', 'Apenas uma ocorrência'] as const;

/**
 * Pedido de confirmação quando o turno anterior estabeleceu uma recorrência e o
 * novo envelope de criação não a repete. Nunca grava o pending antes de o
 * usuário decidir — a recorrência só é mantida após confirmação explícita.
 */
function buildRecurrenceContinuityRefinement(context: AgendaSessionContext): AgendaRefinement {
  const description = context.recurrence ? describeRecurrence(context.recurrence) : 'recorrência';
  const when = context.date?.resolved ? ` a partir de ${formatDate(context.date.resolved)}` : '';
  return {
    question: `No turno anterior você pediu ${description}${when}. A sua nova mensagem não menciona recorrência. Devo manter a recorrência ou agendar apenas uma ocorrência?`,
    suggestions: [...RECURRENCE_CONTINUITY_SUGGESTIONS],
  };
}

function minutes(value?: string | null): number | null {
  if (!value) return null;
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function hasTimeOverlap(existing: StoredAgendaCommitment, start?: string, end?: string): boolean {
  const existingStart = minutes(existing.time);
  const proposedStart = minutes(start);
  if (existingStart === null || proposedStart === null) return false;
  const proposedEnd = minutes(end) ?? proposedStart + 60;
  const existingEnd = minutes(existing.endTime) ?? existingStart + 60;
  return existingStart < proposedEnd && proposedStart < existingEnd;
}

function normalizeTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Ranqueamento de relevância de um título de compromisso contra o termo
 * buscado, para exclusão em massa por título:
 *   0  igualdade exata (após normalização)
 *   1  o termo é prefixo do título
 *   2  o termo está contido no título
 *   3  interseção não-vazia de tokens (ex.: "Reunião 16h" × "Reunião de 16h")
 *   -1 sem correspondência (não é candidato)
 */
export function rankByTitle(needle: string, candidate: string): number {
  const n = normalizeTitle(needle);
  const c = normalizeTitle(candidate);
  if (!n || !c) return -1;
  if (c === n) return 0;
  if (c.startsWith(n)) return 1;
  if (c.includes(n)) return 2;
  const needleTokens = n.split(' ').filter(Boolean);
  const candidateTokens = new Set(c.split(' ').filter(Boolean));
  if (needleTokens.some((token) => candidateTokens.has(token))) return 3;
  return -1;
}

async function collectWarnings(
  uid: string,
  dates: string[],
  title: string,
  startTime: string | undefined,
  endTime: string | undefined,
  agenda: AgendaReader,
  excludeId?: string,
): Promise<AgendaWarning[]> {
  const warnings: AgendaWarning[] = [];
  const normalized = normalizeTitle(title);
  for (const date of dates.slice(0, MAX_CONFLICT_DATES_TO_READ)) {
    const existing = await agenda.onDay(uid, date);
    for (const commitment of existing) {
      if (commitment.id === excludeId) continue;
      const duplicate = normalizeTitle(commitment.title) === normalized && hasTimeOverlap(commitment, startTime, endTime);
      if (duplicate) {
        warnings.push({ type: 'duplicate', date, message: `Já existe "${commitment.title}" em ${formatDate(date)} nesse horário.` });
      } else if (hasTimeOverlap(commitment, startTime, endTime)) {
        warnings.push({ type: 'conflict', date, message: `Há conflito de horário com "${commitment.title}" em ${formatDate(date)}.` });
      }
    }
  }
  return warnings;
}

function buildSummary(
  title: string,
  count: number,
  firstDate: string,
  lastDate: string,
  startTime?: string,
  endTime?: string,
  maxSlots = false,
): string {
  const time = startTime ? ` às ${startTime}${endTime ? ` às ${endTime}` : ''}` : '';
  const occurrences = count === 1 ? '1 compromisso' : `${count} compromissos`;
  const range = count === 1 ? formatDate(firstDate) : `de ${formatDate(firstDate)} a ${formatDate(lastDate)}`;
  const limit = maxSlots ? ', até o limite máximo da agenda' : '';
  return `Entendi! Vou agendar "${title}" — ${occurrences}${time}, ${range}${limit}. Você prefere ativar o alarme ou apenas anotar? Confirma assim?`;
}

function buildDeleteSummary(count: number, title?: string): string {
  const items = count === 1 ? '1 compromisso' : `${count} compromissos`;
  const reference = title ? ` com o nome "${title}"` : '';
  return `Entendi. Encontrei ${items}${reference}. Pretendo excluí-los permanentemente. Posso prosseguir?`;
}

// ───────────────────────────── Edição (v1: compromisso único) ─────────────────────────────

/** Estado editável atual de um compromisso lido da agenda. */
function snapshotFromCommitment(item: StoredAgendaCommitment): AgendaEditSnapshot {
  return {
    title: item.title,
    date: isoFromDateMs(item.dateMs),
    startTime: item.time ?? null,
    endTime: item.endTime ?? null,
    location: item.location ?? null,
    participants: item.participants ?? null,
    notes: item.notes ?? null,
  };
}

/**
 * Aplica os novos valores do envelope sobre o estado atual. Campos ausentes
 * no envelope mantêm o valor atual; `null` explícito limpa o campo opcional.
 */
function buildEditAfter(before: AgendaEditSnapshot, entities: AgendaEntities): AgendaEditSnapshot {
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

function editSnapshotsEqual(a: AgendaEditSnapshot, b: AgendaEditSnapshot): boolean {
  return a.title === b.title
    && a.date === b.date
    && (a.startTime ?? null) === (b.startTime ?? null)
    && (a.endTime ?? null) === (b.endTime ?? null)
    && (a.location ?? null) === (b.location ?? null)
    && JSON.stringify(a.participants ?? null) === JSON.stringify(b.participants ?? null)
    && (a.notes ?? null) === (b.notes ?? null);
}

function buildEditSummary(before: AgendaEditSnapshot, after: AgendaEditSnapshot): string {
  const changes: string[] = [];
  if (before.title !== after.title) changes.push(`o nome para "${after.title}"`);
  if (before.date !== after.date) changes.push(`a data para ${formatDate(after.date)}`);
  if ((before.startTime ?? null) !== (after.startTime ?? null)) changes.push(`o início para ${after.startTime ?? 'indefinido'}`);
  if ((before.endTime ?? null) !== (after.endTime ?? null)) changes.push(`o término para ${after.endTime ?? 'indefinido'}`);
  if ((before.location ?? null) !== (after.location ?? null)) changes.push(`o local para ${after.location ?? 'sem local'}`);
  if (JSON.stringify(before.participants ?? null) !== JSON.stringify(after.participants ?? null)) changes.push('os participantes');
  if ((before.notes ?? null) !== (after.notes ?? null)) changes.push('as observações');
  if (changes.length === 0) return `Entendi! Vou editar "${after.title}". Confirma?`;
  return `Entendi! Vou editar "${after.title}" alterando ${changes.join(' e ')}. Confirma?`;
}

type EditResolveOutcome =
  | { kind: 'ok'; target: StoredAgendaCommitment }
  | { kind: 'not_found'; title: string }
  | { kind: 'recurring'; title: string }
  | { kind: 'ambiguous'; candidates: StoredAgendaCommitment[]; title: string };

/**
 * Localiza o compromisso a ser editado a partir do envelope. O título é o
 * locator primário; data/horário (quando presentes) estreitam a busca contra
 * a data/horário ATUAIS dos candidatos. 0 resultados → not_found; 1 claro →
 * ok; >1 → ambiguous (pede escolha); compromisso de série → recurring
 * (indisponível). Nunca confia em eventId vindo do LLM.
 */
async function resolveEditTarget(
  uid: string,
  envelope: AgendaEnvelope,
  agenda: AgendaReader,
): Promise<EditResolveOutcome> {
  const title = envelope.entities.title ?? '';
  if (!title) return { kind: 'not_found', title };

  let candidates = await agenda.searchByTitle(uid, title, { maxResults: MAX_EDIT_SCAN });
  if (candidates.length === 0) return { kind: 'not_found', title };

  const newDate = envelope.entities.date?.resolved;
  if (newDate) {
    const onDate = candidates.filter((item) => isoFromDateMs(item.dateMs) === newDate);
    if (onDate.length > 0) candidates = onDate;
  }
  if (envelope.entities.startTime && candidates.length > 1) {
    const atTime = candidates.filter((item) => item.time === envelope.entities.startTime);
    if (atTime.length > 0) candidates = atTime;
  }

  if (candidates.length === 0) return { kind: 'not_found', title };
  if (candidates.length === 1) {
    const target = candidates[0];
    if (target.seriesId) return { kind: 'recurring', title };
    return { kind: 'ok', target };
  }
  return { kind: 'ambiguous', candidates, title };
}

/**
 * Fluxo de edição de compromisso único (v1). Localiza o alvo no backend,
 * monta o estado antes/depois, coleta avisos de conflito (excluindo o próprio
 * compromisso) e grava um pending com target + before + after para o commit
 * revalidar na confirmação.
 */
async function handleEditIntent(
  uid: string,
  envelope: AgendaEnvelope,
  data: InterpretRequestData,
  dependencies: InterpretDependencies,
  now: Date,
  requestId: string | undefined,
): Promise<InterpretResponse> {
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
      .map((item) => `"${item.title}" em ${formatDate(isoFromDateMs(item.dateMs))}${item.time ? ` às ${item.time}` : ''}`)
      .join('; ');
    return clarification([], [`Encontrei mais de um compromisso com esse nome (${options}). Informe a data ou o horário exato para eu identificar qual editar.`]);
  }

  const before = snapshotFromCommitment(resolved.target);
  const after = buildEditAfter(before, envelope.entities);
  if (editSnapshotsEqual(before, after)) {
    return clarification([], ['Não identifiquei o que alterar no compromisso. Informe o que deve mudar (nome, data, horário, local, participantes ou observações).']);
  }

  logStage(requestId, 'collect_edit_warnings', { date: after.date });
  const warnings = await collectWarnings(
    uid,
    [after.date],
    after.title,
    after.startTime ?? undefined,
    after.endTime ?? undefined,
    dependencies.agenda,
    resolved.target.id,
  );

  const token = randomUUID();
  const createdAtMs = now.getTime();
  const expiresAtMs = createdAtMs + PENDING_TTL_MS;
  const recap: AgendaRecap = {
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

/**
 * Resolve os alvos de uma exclusão em massa a partir da intenção+entidades.
 * Prioriza entities.filter (modelo "Filtro = {campo, valor}") e aceita a
 * ausência de data quando o critério é o título. Retorna null quando o filtro
 * de data não pôde ser resolvido.
 */
async function resolveDeleteTargets(
  uid: string,
  envelope: AgendaEnvelope,
  agenda: AgendaReader,
  today: YMD,
): Promise<{ targets: AgendaAffectedItem[]; truncated: boolean; scannedCount: number } | null> {
  const filter = envelope.entities.filter;
  const title = filter?.field === 'title' ? filter.value : envelope.entities.title;
  // Expressão de data BRUTA (antes do colapso de mês → último dia). "novembro"
  // aqui é um mês inteiro, não 30/11.
  const rawDateExpr = filter?.field === 'date' ? filter.value : envelope.entities.date?.expression;

  // Período (ex.: "novembro", "no mês que vem") OU dia único.
  let period: { startMs: number; endMs: number } | null = null;
  let dayIso: string | null = null;
  if (rawDateExpr) {
    period = resolvePeriodRange(rawDateExpr, today);
    if (!period) {
      const resolved = resolveDateExpression(rawDateExpr, today);
      if (!resolved) return null;
      dayIso = resolved.iso;
    }
  }

  let candidates: StoredAgendaCommitment[];
  if (title) {
    candidates = await agenda.searchByTitle(uid, title, { maxResults: MAX_DELETE_SCAN, sinceMs: deleteScanCutoffMs() });
    if (period) {
      candidates = candidates.filter((item) => item.dateMs >= period.startMs && item.dateMs < period.endMs);
    } else if (dayIso) {
      const range = saoPauloDayRangeMillis(isoToYmd(dayIso));
      candidates = candidates.filter((item) => item.dateMs >= range.startMs && item.dateMs < range.endMs);
    }
  } else if (period) {
    candidates = await agenda.onPeriod(uid, period.startMs, period.endMs);
  } else if (dayIso) {
    candidates = await agenda.onDay(uid, dayIso);
  } else {
    candidates = [];
  }

  const targets: AgendaAffectedItem[] = candidates.slice(0, MAX_DELETE_TARGETS).map((item) => ({
    id: item.id,
    title: item.title,
    time: item.time ?? null,
    endTime: item.endTime ?? null,
    dateMs: item.dateMs,
  }));
  return { targets, truncated: candidates.length > MAX_DELETE_TARGETS, scannedCount: candidates.length };
}

export async function orchestrateAgendaInterpret(
  uid: string,
  data: InterpretRequestData,
  dependencies: InterpretDependencies,
): Promise<InterpretResponse> {
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
  } catch (error) {
    logger.error('[agenda:interpret] falha inesperada na orquestração', {
      requestId,
      errorMessage: errorMessage(error),
      errorStack: errorStack(error),
      durationMs: Date.now() - startedAtMs,
    });
    throw error;
  }
}

async function orchestrateAgendaInterpretCore(
  uid: string,
  data: InterpretRequestData,
  dependencies: InterpretDependencies,
): Promise<InterpretResponse> {
  const requestId = dependencies.requestId;
  const now = dependencies.now ?? new Date();
  const sessionId = data.sessionId ?? null;

  const previousContext = sessionId
    ? await dependencies.session.read(uid, sessionId)
    : null;

  const { response: rawResponse, established } = await runInterpretation(uid, data, dependencies, previousContext);
  let response = rawResponse;

  if (response.success && response.outcome === 'clarification' && sessionId) {
    // Eco do contexto já estabelecido no texto da pergunta (continuidade visível
    // ao usuário em qualquer turno). A persistência da sessão ocorre apenas quando
    // o cliente enviou um sessionId — memória temporária, nunca caminho de escrita.
    const echoContext = mergeSessionContext(
      previousContext,
      established,
      { uid, sessionId: sessionId ?? '', createdAtMs: now.getTime() },
    );
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
      } catch (error) {
        logger.warn('[agenda:interpret] falha ao persistir contexto de sessão', {
          requestId,
          errorMessage: errorMessage(error),
        });
      }
    }
  }

  return response;
}

/** Turno de interpretação: a resposta pública + o estado "já estabelecido" do turno. */
type InterpretTurn = {
  response: InterpretResponse;
  established: AgendaSessionContext | null;
};

async function runInterpretation(
  uid: string,
  data: InterpretRequestData,
  dependencies: InterpretDependencies,
  previousContext: AgendaSessionContext | null,
): Promise<InterpretTurn> {
  const requestId = dependencies.requestId;
  const now = dependencies.now ?? new Date();
  const today = todayYmdInProductTimezone(now);
  const systemPrompt = previousContext ? buildSystemPrompt(now, previousContext) : buildSystemPrompt(now);
  const messages = buildMessages(data.prompt, data.history ?? []);
  logStage(requestId, 'inicio', { promptLength: data.prompt.length, historyMessages: (data.history ?? []).length });

  let raw: string;
  try {
    raw = await callModel(dependencies.router, messages, systemPrompt);
    logStage(requestId, 'llm_ok', { rawLength: raw.length });
  } catch {
    logger.warn('[agenda:interpret] modelo temporariamente indisponível (contingência/falha de roteador)', { requestId });
    return { response: { success: false, error: 'O Nexus está temporariamente indisponível. Tente novamente em instantes.' }, established: null };
  }

  let parsed = tryParseEnvelope(raw);
  if (!parsed.ok) {
    const detail = parsed.errors.slice(0, 4).join('; ');
    logger.warn('[agenda:interpret] envelope inválido — nova tentativa com erros de schema', { requestId, errors: parsed.errors.slice(0, 4) });
    try {
      raw = await callModel(
        dependencies.router,
        [
          ...messages,
          {
            role: 'user',
            content: `Sua resposta anterior não passou na validação do contrato JSON. Erros: ${detail}. Responda SOMENTE com o envelope JSON estrito, sem markdown e sem texto adicional.`,
          },
        ],
        systemPrompt,
      );
    } catch {
      if (hasCreateWithoutTimeEvidence(data.prompt)) {
        logStage(requestId, 'normalize_time_gap', { reason: 'retry_indisponivel_com_evidencia' });
        return { response: clarification(['startTime'], [], TIME_GAP_REFINEMENT, TIME_GAP_QUESTION), established: null };
      }
      return { response: clarification([], [FRIENDLY_INVALID_QUESTION]), established: null };
    }
    parsed = tryParseEnvelope(raw);
    if (!parsed.ok) {
      if (hasCreateWithoutTimeEvidence(data.prompt)) {
        logStage(requestId, 'normalize_time_gap', { reason: 'retry_falhou_com_evidencia', parseErrors: parsed.errors.slice(0, 3) });
        return { response: clarification(['startTime'], [], TIME_GAP_REFINEMENT, TIME_GAP_QUESTION), established: null };
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
  const lowConfidence: string[] = [];
  if (normalized.entities.date?.confidence === 'low') lowConfidence.push('A data principal não pôde ser determinada com segurança.');
  if (normalized.entities.recurrence?.until?.confidence === 'low') lowConfidence.push('A data final da recorrência não pôde ser determinada com segurança.');
  if (normalized.entities.limitDate?.confidence === 'low') lowConfidence.push('O limite de dias não pôde ser determinado com segurança.');
  if (lowConfidence.length > 0) return { response: clarification([], lowConfidence), established };

  const validated = parseAndValidateAgendaEnvelope(JSON.stringify(normalized));
  if (!validated.ok) {
    const missing = validated.errors
      .filter((error) => error.includes('obrigatório'))
      .map((error) => error.replace(/^.*?\.(title|date).*$/, '$1'));
    const ambiguous = validated.errors.filter((error) => !error.includes('obrigatório'));
    // Título ausente (com a data já determinada): pergunta natural combinada que
    // já oferece o horário OPCIONAL em uma única frase (horário não entra em `missing`).
    const question = missing.length === 1 && missing[0] === 'title'
      ? (normalized.entities.startTime
          ? 'Qual será o título do compromisso?'
          : 'Qual será o título do compromisso? Se quiser, você também pode informar o horário.')
      : undefined;
    // Sem campo obrigatório ausente identificado (ex.: erros de coerência), mas
    // com evidência de criação com data sem horário → pergunta natural de horário.
    if (missing.length === 0 && hasCreateWithoutTimeEvidence(data.prompt)) {
      logStage(requestId, 'normalize_time_gap', { reason: 'validacao_sem_campo_obrigatorio_com_evidencia', errors: validated.errors.slice(0, 3) });
      return { response: clarification(['startTime'], [], TIME_GAP_REFINEMENT, TIME_GAP_QUESTION), established };
    }
    return { response: clarification(missing, ambiguous, undefined, question), established };
  }

  const envelope = validated.data;
  logStage(requestId, 'validado', { intent: envelope.intent, action: envelope.action, dateResolved: envelope.entities.date?.resolved ?? null });

  // Continuidade de recorrência: o turno anterior estabeleceu uma série e o novo
  // envelope de criação não a repete → confirmação explícita (NUNCA pending).
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
    // Envelope clarify (vazio ou só apontando o horário) com evidência de uma
    // criação com data sem horário: NÃO relé o texto genérico do modelo — pergunta
    // o horário de forma natural. Redirecionamentos fora de escopo são SEMPRE
    // preservados.
    const isOutOfScope = envelope.ambiguous.some((text) => /fugindo das minhas atribui/i.test(text));
    if (!isOutOfScope && hasCreateWithoutTimeEvidence(data.prompt)) {
      const onlyStartTimeGap = envelope.missing.length === 1 && envelope.missing[0] === 'startTime';
      if (envelope.missing.length === 0 || onlyStartTimeGap) {
        logStage(requestId, 'normalize_time_gap', { reason: onlyStartTimeGap ? 'clarify_startTime_com_evidencia' : 'clarify_vazio_com_evidencia', missing: envelope.missing });
        return { response: clarification(['startTime'], [], TIME_GAP_REFINEMENT, TIME_GAP_QUESTION), established };
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
    const warnings: AgendaWarning[] = [];
    if (resolved.truncated) {
      warnings.push({ type: 'truncated', message: `Encontrei mais compromissos do que o limite suportado. A exclusão será aplicada aos ${resolved.targets.length} mais recentes.` });
    }
    const recap: AgendaRecap = {
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
    const token = randomUUID();
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
    if (refinement) return { response: clarification([], [], refinement), established };
  }

  if (!envelope.entities.date) return { response: clarification(['date'], []), established };
  const firstDate = envelope.entities.date.resolved;
  let lastDate = firstDate;
  let occurrenceCount = 1;
  const warnings: AgendaWarning[] = [];
  let recurrence: AgendaRecap['recurrence'];
  let maxSlotsUsed = false;

  if (envelope.entities.recurrence) {
    const limitDate = envelope.entities.limitDate?.resolved;
    maxSlotsUsed = envelope.entities.maxSlots === true;
    const until = envelope.entities.recurrence.until?.resolved
      ?? limitDate
      ?? (maxSlotsUsed ? undefined : addDaysForHorizon(today));
    const expanded = expandRecurrence({
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
    // Título ausente: pergunta natural combinada que já oferece o horário
    // OPCIONAL em uma única frase (horário não entra em `missing`).
    const question = envelope.entities.startTime
      ? 'Qual será o título do compromisso?'
      : 'Qual será o título do compromisso? Se quiser, você também pode informar o horário.';
    return { response: clarification(['title'], [], undefined, question), established };
  }

  const dates = recurrence
    ? expandRecurrence({ freq: recurrence.freq as 'daily' | 'weekly' | 'monthly', startIso: firstDate, untilIso: recurrence.until }).occurrences
    : [firstDate];
  logStage(requestId, 'collect_warnings', { dates: dates.length });
  warnings.push(...await collectWarnings(uid, dates, title, envelope.entities.startTime ?? undefined, envelope.entities.endTime ?? undefined, dependencies.agenda));

  const token = randomUUID();
  const createdAtMs = now.getTime();
  const expiresAtMs = createdAtMs + PENDING_TTL_MS;
  const recap: AgendaRecap = {
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

  // Consistência plano→execução: quando a série foi limitada por limitDate ou
  // maxSlots, materializa a data final resolvida em recurrence.until do
  // envelope gravado, para o commit re-expandir EXATAMENTE a mesma série
  // (evita que o commit expanda até MAX_COMMIT_OCCURRENCES e crie mais do que
  // foi apresentado ao usuário na confirmação).
  let storedEnvelope = envelope;
  if (recurrence && (envelope.entities.limitDate || envelope.entities.maxSlots === true) && !envelope.entities.recurrence?.until) {
    storedEnvelope = {
      ...envelope,
      entities: {
        ...envelope.entities,
        recurrence: {
          ...(envelope.entities.recurrence as NonNullable<AgendaEnvelope['entities']['recurrence']>),
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

export function buildFirestoreDependencies(db: ReturnType<typeof getFirestore>): Omit<InterpretDependencies, 'router' | 'now'> {
  const collectionPath = (uid: string) => `users/${uid}/agenda`;
  const mapDoc = (doc: FirebaseFirestore.QueryDocumentSnapshot): StoredAgendaCommitment => {
    const data = doc.data() as Record<string, unknown>;
    const date = data.date as { toMillis?: () => number } | undefined;
    const participants = Array.isArray(data.participants)
      ? data.participants.filter((item): item is string => typeof item === 'string')
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
        const range = saoPauloDayRangeMillis(isoToYmd(isoDate));
        const snapshot = await db.collection(collectionPath(uid))
          .where('date', '>=', Timestamp.fromMillis(range.startMs))
          .where('date', '<', Timestamp.fromMillis(range.endMs))
          .get();
        return snapshot.docs.map(mapDoc);
      },
      async onPeriod(uid, startMs, endMs) {
        const snapshot = await db.collection(collectionPath(uid))
          .where('date', '>=', Timestamp.fromMillis(startMs))
          .where('date', '<', Timestamp.fromMillis(endMs))
          .orderBy('date', 'asc')
          .get();
        return snapshot.docs.map(mapDoc);
      },
      async upcoming(uid, max) {
        const snapshot = await db.collection(collectionPath(uid))
          .where('date', '>=', Timestamp.fromDate(new Date()))
          .orderBy('date', 'asc')
          .limit(max)
          .get();
        return snapshot.docs.map(mapDoc);
      },
      async searchByTitle(uid, title, opts) {
        const maxResults = opts?.maxResults ?? MAX_DELETE_SCAN;
        let base: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection(collectionPath(uid));
        // Janela temporal opcional (delete em massa): corta a cauda histórica.
        // Mesmo campo do orderBy → índice single-field existente, sem composto.
        if (typeof opts?.sinceMs === 'number') {
          base = base.where('date', '>=', Timestamp.fromMillis(opts.sinceMs));
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
        await db.collection(`${collectionPath(uid)}/_nexus/pending`).doc(token).set(
          sanitizeForFirestore({
            ...document,
            createdAt: Timestamp.fromMillis(Number(document.createdAtMs)),
            expiresAt: Timestamp.fromMillis(Number(document.expiresAtMs)),
          }) as Record<string, unknown>,
        );
      },
    },
    session: {
      async read(uid, sessionId) {
        return readSessionContext(db, uid, sessionId);
      },
      async write(context) {
        await writeSessionContext(db, context);
      },
    },
  };
}

export const nexusAgendaInterpret = onCall(
  {
    memory: '1GiB',
    timeoutSeconds: 60,
    region: 'us-central1',
    secrets: [GROQ_API_KEY_SECRET, OPENROUTER_API_KEY_SECRET],
  },
  async (request) => {
    const requestId = randomUUID();
    const startedAtMs = Date.now();

    try {
      const uid = requireAuth(request);
      logger.info('[agenda:interpret] start', {
        requestId,
        uid: safeUid(uid),
        source: request.data?.source ?? undefined,
      });

      const data = request.data as Partial<InterpretRequestData> | undefined;
      if (!data || typeof data.prompt !== 'string' || !data.prompt.trim()) {
        throw new HttpsError('invalid-argument', 'O comando de agenda é obrigatório.');
      }
      if (data.history !== undefined && !Array.isArray(data.history)) {
        throw new HttpsError('invalid-argument', 'O histórico de conversa é inválido.');
      }
      const history = (data.history as Array<{ role?: string; text?: string }> | undefined)?.slice(0, MAX_HISTORY_MESSAGES);
      if (history && history.some((m) => typeof m !== 'object' || m === null || typeof m.text !== 'string')) {
        throw new HttpsError('invalid-argument', 'O histórico de conversa contém mensagens inválidas.');
      }
      if (data.sessionId !== undefined && (typeof data.sessionId !== 'string' || !data.sessionId.trim() || data.sessionId.length > 128)) {
        throw new HttpsError('invalid-argument', 'O identificador de sessão é inválido.');
      }
      const sessionId = typeof data.sessionId === 'string' && data.sessionId.trim() ? data.sessionId.trim() : undefined;
      logger.info('[agenda:interpret] payload_ok', { requestId, promptLength: data.prompt.length, historyMessages: history?.length ?? 0, hasSession: Boolean(sessionId) });

      const groqApiKey = process.env.GROQ_API_KEY;
      const openrouterApiKey = process.env.OPENROUTER_API_KEY;
      if (!groqApiKey && !openrouterApiKey) {
        logger.warn('[agenda:interpret] nenhuma API key de IA disponível no ambiente', { requestId });
      }

      const router = MultiModelRouter.getInstance();
      router.updateApiKeys({ groq: groqApiKey, openrouter: openrouterApiKey });

      const result = await orchestrateAgendaInterpret(
        uid,
        { prompt: data.prompt, history: (history ?? []) as Array<{ role: string; text: string }>, sessionId },
        { router, requestId, ...buildFirestoreDependencies(getFirestore()) },
      );

      logger.info('[agenda:interpret] ok', {
        requestId,
        success: result.success,
        outcome: result.success ? result.outcome : undefined,
        durationMs: Date.now() - startedAtMs,
      });
      return result;
    } catch (error) {
      if (error instanceof HttpsError) {
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
      throw new HttpsError('internal', 'Não foi possível processar seu comando de agenda. Tente novamente.', { requestId });
    }
  },
);
