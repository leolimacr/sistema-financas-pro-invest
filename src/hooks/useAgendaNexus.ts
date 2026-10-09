import { useCallback, useEffect, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

export type AgendaNexusStage =
  | 'idle'
  | 'interpreting'
  | 'resolving_dates'
  | 'done'
  | 'clarify'
  | 'error'
  | 'cancelled'
  | 'committing'
  | 'success'
  | 'undoing'
  | 'undone'
  | 'partial';

export interface AgendaNexusHistoryMessage {
  role: 'user' | 'ai' | 'assistant';
  text: string;
}

export interface AgendaNexusInterpretInput {
  prompt: string;
  history?: AgendaNexusHistoryMessage[];
}

export interface AgendaNexusAffectedItem {
  id?: string;
  title?: string;
  time?: string | null;
  endTime?: string | null;
  dateMs?: number;
}

/** Estado editável de um compromisso (antes/depois numa proposta de edição). */
export interface AgendaNexusEditSnapshot {
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  participants?: string[] | null;
  notes?: string | null;
}

export interface AgendaNexusProposal {
  intent?: string;
  action?: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  firstDate?: string;
  lastDate?: string;
  occurrenceCount?: number;
  recurrence?: Record<string, unknown> | null;
  summary?: string;
  /** Quantidade de itens que uma operação em massa (exclusão) vai afetar. */
  matchCount?: number;
  /** Esboço dos itens afetados — renderizado antes da aprovação. */
  affectedItems?: AgendaNexusAffectedItem[];
  /** TRUE quando a operação em massa foi truncada no teto de itens. */
  truncated?: boolean;
  /** Estado atual do compromisso alvo numa proposta de edição. */
  before?: AgendaNexusEditSnapshot;
  /** Estado proposto do compromisso numa proposta de edição. */
  after?: AgendaNexusEditSnapshot;
  [key: string]: unknown;
}

export interface AgendaNexusRefinement {
  question: string;
  suggestions: string[];
}

export interface AgendaNexusInterpretResponse {
  success: boolean;
  outcome?: 'proposal' | 'clarification' | 'query_result';
  status?: string;
  confirmationToken?: string;
  expiresAtMs?: number;
  recap?: AgendaNexusProposal;
  proposal?: AgendaNexusProposal;
  commitments?: Array<{ id: string; title: string; time?: string | null; dateMs: number }>;
  warnings?: Array<Record<string, unknown>>;
  /** Pergunta natural primária gerada pelo backend (preferida sobre `questions`/`ambiguous`). */
  question?: string;
  clarification?: {
    missing?: string[];
    ambiguous?: string[];
    questions?: string[];
    refinement?: AgendaNexusRefinement;
  };
  error?: string;
  message?: string;
  [key: string]: unknown;
}

export interface AgendaNexusCommitResult {
  success: boolean;
  status?: 'committed' | 'partial' | 'failed' | 'idempotent' | string;
  intent?: 'create' | 'delete' | 'edit' | string;
  actionId?: string;
  idsCreated?: string[];
  idsDeleted?: string[];
  idsEdited?: string[];
  seriesId?: string;
  occurrenceCount?: number;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export interface AgendaNexusUndoContract {
  actionId: string;
  confirmationToken: string;
}

/**
 * Modo de aviso de um compromisso: 'none' (apenas anotar), 'notification'
 * (apenas notificação visual) ou 'notification_alarm' (notificação + som /
 * vibração quando o dispositivo permitir). Aplicado no momento da confirmação.
 */
export type AgendaReminderMode = 'none' | 'notification' | 'notification_alarm';

export interface AgendaNexusCommitOptions {
  /** Modo de aviso escolhido no fieldset de confirmação. 'none' não envia nada. */
  reminderMode?: AgendaReminderMode;
  /** Modo legado compatível: TRUE = notificação. */
  alarm?: boolean;
}

export interface UseAgendaNexusResult {
  interpret(input: AgendaNexusInterpretInput): Promise<AgendaNexusInterpretResponse | null>;
  commit(confirmationToken?: string, options?: AgendaNexusCommitOptions): Promise<AgendaNexusCommitResult | null>;
  undo(): Promise<AgendaNexusCommitResult | null>;
  cancel(): void;
  reset(): void;
  isLoading: boolean;
  stage: AgendaNexusStage;
  progressMessage: string | null;
  proposal: AgendaNexusProposal | null;
  missing: string[];
  ambiguous: string[];
  assumptions: Array<Record<string, unknown>>;
  refinement: AgendaNexusRefinement | null;
  /** Thread contínua da sessão (usuário + Nexus), espelho do histórico enviado ao backend. */
  dialogue: AgendaNexusHistoryMessage[];
  commitResult: AgendaNexusCommitResult | null;
  error: string | null;
  canUndo: boolean;
  undoContract: AgendaNexusUndoContract | null;
}

const INTERPRET_PROGRESS_MESSAGES = [
  { delay: 2000, message: 'Estruturando datas e recorrência…' },
  { delay: 7000, message: 'Quase lá — verificando sua agenda…' },
] as const;

const INITIAL_PROGRESS_MESSAGE = 'Nexus lendo sua solicitação…';
const UNDO_TTL_MS = 60_000;
/** Teto de mensagens da thread visual e do payload enviado ao backend. */
const MAX_TRANSCRIPT_MESSAGES = 24;

/**
 * Identificador de sessão de diálogo enviado ao backend para preservar o
 * contexto entre turnos de clarificação (mesmo fluxo, várias mensagens).
 * UUID v4 quando o navegador suporta crypto.randomUUID; fallback determinístico.
 */
function generateSessionId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fallback abaixo
  }
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Rótulo gramatical humano de cada campo — usado apenas no fallback local. */
const NATURAL_FIELD_LABELS: Record<string, string> = {
  title: 'o título do compromisso',
  date: 'a data ou o período',
  startTime: 'o horário',
  endTime: 'o horário de término',
  byDay: 'o dia da semana',
  location: 'o local',
  participants: 'os participantes',
  notes: 'uma observação',
  recurrence: 'a recorrência',
  limitDate: 'o prazo da recorrência',
  filter: 'o critério de identificação',
};

/** Tokens técnicos que nunca podem aparecer no texto exibido ao usuário. */
const TECHNICAL_FIELD_TOKENS = ['title', 'startTime', 'endTime', 'byDay', 'limitDate', 'recurrence', 'filter', 'missing', 'participants'];

/** TRUE quando o texto contém um nome técnico de campo (ex.: "Informe title."). */
function isTechnicalFieldText(text: string): boolean {
  const t = text.toLowerCase();
  return TECHNICAL_FIELD_TOKENS.some((token) =>
    new RegExp(`(^|[^a-z0-9])${token}([^a-z0-9]|$)`).test(t),
  );
}

/**
 * Fallback local de última instância (quando o backend não retorna texto
 * natural): transforma campos ausentes em uma frase natural. Nunca expõe
 * nomes técnicos como `title`/`startTime`.
 */
function buildNaturalFallback(missing: string[]): string | null {
  const labels = missing.map((field) => NATURAL_FIELD_LABELS[field] ?? 'mais informações').filter(Boolean);
  if (labels.length === 0) return null;
  if (labels.length === 1) return `Informe, por favor, ${labels[0]}.`;
  if (labels.length === 2) return `Informe, por favor, ${labels[0]} e ${labels[1]}.`;
  return `Informe, por favor, ${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}.`;
}

function getCallableErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { message?: unknown; code?: unknown; details?: unknown };
    if (typeof candidate.details === 'object' && candidate.details !== null) {
      const details = candidate.details as { message?: unknown; error?: unknown };
      if (typeof details.message === 'string') return details.message;
      if (typeof details.error === 'string') return details.error;
    }
    if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
    if (candidate.code === 'unauthenticated') return 'Faça login para usar o Nexus na Agenda.';
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Não foi possível concluir a operação da Agenda. Tente novamente.';
}

function getResponseError(data: AgendaNexusInterpretResponse | AgendaNexusCommitResult): string | null {
  if (typeof data.error === 'string' && data.error.trim()) return data.error;
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  return null;
}

function isPartialResponse(data: AgendaNexusCommitResult): boolean {
  return data.status === 'partial' || data.status === 'failed' || data.success === false && data.status === 'partial';
}

function extractProposal(data: AgendaNexusInterpretResponse): AgendaNexusProposal | null {
  if (data.recap && typeof data.recap === 'object') return data.recap;
  if (data.proposal && typeof data.proposal === 'object') return data.proposal;
  return null;
}

/** Resumo natural de um resultado de consulta, para entrar na thread como fala do Nexus. */
function queryResultSummary(data: AgendaNexusInterpretResponse): string | null {
  if (data.outcome !== 'query_result') return null;
  const commitments = Array.isArray(data.commitments) ? data.commitments : [];
  if (commitments.length === 0) return 'Não encontrei compromissos futuros na sua agenda.';
  const samples = commitments.slice(0, 3).map((c) => `"${c.title}"`).join(', ');
  const more = commitments.length > 3 ? ` e mais ${commitments.length - 3}` : '';
  return `Encontrei ${commitments.length === 1 ? '1 compromisso' : `${commitments.length} compromissos`} na sua agenda: ${samples}${more}.`;
}

export function useAgendaNexus(): UseAgendaNexusResult {
  const [stage, setStage] = useState<AgendaNexusStage>('idle');
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [proposal, setProposal] = useState<AgendaNexusProposal | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [ambiguous, setAmbiguous] = useState<string[]>([]);
  const [assumptions, setAssumptions] = useState<Array<Record<string, unknown>>>([]);
  const [commitResult, setCommitResult] = useState<AgendaNexusCommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [undoContract, setUndoContract] = useState<AgendaNexusUndoContract | null>(null);
  const [refinement, setRefinement] = useState<AgendaNexusRefinement | null>(null);
  const [dialogue, setDialogue] = useState<AgendaNexusHistoryMessage[]>([]);

  const requestGenerationRef = useRef(0);
  const activeOperationRef = useRef<'interpret' | 'commit' | null>(null);
  const timersRef = useRef<number[]>([]);
  const undoTimerRef = useRef<number | null>(null);
  const pendingConfirmationTokenRef = useRef<string | null>(null);
  const proposalIntentRef = useRef<string | null>(null);
  const dialogueHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const sessionIdRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
    if (undoTimerRef.current !== null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }, []);

  const invalidateOperation = useCallback(() => {
    requestGenerationRef.current += 1;
    activeOperationRef.current = null;
    clearTimers();
  }, [clearTimers]);

  const reset = useCallback(() => {
    invalidateOperation();
    pendingConfirmationTokenRef.current = null;
    proposalIntentRef.current = null;
    dialogueHistoryRef.current = [];
    sessionIdRef.current = null;
    setDialogue([]);
    setStage('idle');
    setProgressMessage(null);
    setProposal(null);
    setMissing([]);
    setAmbiguous([]);
    setAssumptions([]);
    setRefinement(null);
    setCommitResult(null);
    setError(null);
    setCanUndo(false);
    setUndoContract(null);
  }, [invalidateOperation]);

  const cancel = useCallback(() => {
    invalidateOperation();
    pendingConfirmationTokenRef.current = null;
    proposalIntentRef.current = null;
    sessionIdRef.current = null;
    // A thread NÃO é apagada no cancelamento: o usuário pode corrigir uma
    // proposta digitando texto livre sem perder o contexto da conversa.
    setStage('cancelled');
    setProgressMessage(null);
    setRefinement(null);
    setError(null);
  }, [invalidateOperation]);

  const appendTranscript = useCallback((message: { role: 'user' | 'assistant'; text: string }) => {
    dialogueHistoryRef.current = [...dialogueHistoryRef.current, message].slice(-MAX_TRANSCRIPT_MESSAGES);
    setDialogue([...dialogueHistoryRef.current]);
  }, []);

  const interpret = useCallback(async (input: AgendaNexusInterpretInput) => {
    if (activeOperationRef.current !== null) return null;
    if (!input.prompt.trim()) {
      setStage('error');
      setError('Digite uma solicitação para interpretar.');
      return null;
    }

    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    activeOperationRef.current = 'interpret';
    clearTimers();
    setStage('interpreting');
    setProgressMessage(INITIAL_PROGRESS_MESSAGE);
    setProposal(null);
    setMissing([]);
    setAmbiguous([]);
    setAssumptions([]);
    setRefinement(null);
    setCommitResult(null);
    setError(null);
    setCanUndo(false);
    setUndoContract(null);

    // Contrato de não-duplicação: o prompt atual vai separado no campo `prompt`;
    // o histórico é capturado ANTES de inserir a mensagem atual na thread
    // visual, para ela aparecer imediatamente sem ser enviada duas vezes ao LLM.
    const historyToSend = [...dialogueHistoryRef.current];
    appendTranscript({ role: 'user', text: input.prompt });

    INTERPRET_PROGRESS_MESSAGES.forEach(({ delay, message }) => {
      const timer = window.setTimeout(() => {
        if (requestGenerationRef.current !== generation || activeOperationRef.current !== 'interpret') return;
        setStage('resolving_dates');
        setProgressMessage(message);
      }, delay);
      timersRef.current.push(timer);
    });

    try {
      if (!sessionIdRef.current) sessionIdRef.current = generateSessionId();
      const callable = httpsCallable(functions, 'nexusAgendaInterpret');
      const result = await callable({ prompt: input.prompt, history: historyToSend, sessionId: sessionIdRef.current });
      if (requestGenerationRef.current !== generation || activeOperationRef.current !== 'interpret') return null;

      const data = result.data as AgendaNexusInterpretResponse;
      const responseError = getResponseError(data);
      if (!data.success || responseError) {
        setStage('error');
        setError(responseError ?? 'O Nexus não conseguiu interpretar a solicitação.');
        return data;
      }

      const rawProposal = extractProposal(data);
      const nextProposal = rawProposal
        ? { ...rawProposal, warnings: data.warnings ?? rawProposal.warnings, assumptions: data.assumptions ?? rawProposal.assumptions }
        : null;
      proposalIntentRef.current = typeof nextProposal?.intent === 'string' ? nextProposal.intent : null;
      const nextMissing = data.clarification?.missing ?? [];
      const nextAmbiguous = data.clarification?.ambiguous ?? [];
      const nextAssumptions = Array.isArray(data.assumptions)
        ? data.assumptions
        : Array.isArray(nextProposal?.assumptions) ? nextProposal.assumptions as Array<Record<string, unknown>> : [];
      const nextRefinement = data.clarification?.refinement ?? null;
      setProposal(nextProposal);
      setMissing(nextMissing);
      setAmbiguous(nextAmbiguous);
      setAssumptions(nextAssumptions);
      setRefinement(nextRefinement);

      const isClarifying = data.outcome === 'clarification' || nextMissing.length > 0 || nextAmbiguous.length > 0;
      if (isClarifying) {
        // Prioridade da pergunta natural (nunca os nomes técnicos de `missing`):
        // refinamento → `question` do backend → `questions[0]` → `ambiguous[0]`
        // → fallback local natural. Textos com nomes técnicos são pulados.
        const candidates = [
          nextRefinement?.question,
          data.question,
          data.clarification?.questions?.[0],
          nextAmbiguous[0],
          buildNaturalFallback(nextMissing),
        ];
        const question = candidates.find((text) => text != null && text.length > 0 && !isTechnicalFieldText(text)) ?? null;
        if (question) appendTranscript({ role: 'assistant', text: question });
      } else {
        const assistantText = nextProposal?.summary ?? queryResultSummary(data);
        if (assistantText) appendTranscript({ role: 'assistant', text: assistantText });
      }

      if (isClarifying) {
        setStage('clarify');
      } else {
        pendingConfirmationTokenRef.current = data.confirmationToken ?? null;
        sessionIdRef.current = null;
        setStage('done');
      }
      return data;
    } catch (callError) {
      if (requestGenerationRef.current !== generation || activeOperationRef.current !== 'interpret') return null;
      // Falha de rede/backend: mensagem segura sem detalhes internos e a
      // thread permanece visível para uma nova tentativa em texto livre.
      setStage('error');
      setError(getCallableErrorMessage(callError));
      return null;
    } finally {
      if (requestGenerationRef.current === generation) {
        activeOperationRef.current = null;
        clearTimers();
        setProgressMessage(null);
      }
    }
  }, [appendTranscript, clearTimers]);

  const commit = useCallback(async (confirmationToken?: string, options?: AgendaNexusCommitOptions) => {
    if (activeOperationRef.current !== null) return null;
    const token = confirmationToken ?? pendingConfirmationTokenRef.current;
    if (!token) {
      setStage('error');
      setError('Nenhuma proposta confirmável está disponível.');
      return null;
    }

    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    activeOperationRef.current = 'commit';
    setStage('committing');
    setError(null);
    setCommitResult(null);

    try {
      const callable = httpsCallable(functions, 'nexusAgendaCommit');
      const reminderMode =
        options?.reminderMode === 'notification' || options?.reminderMode === 'notification_alarm'
          ? options.reminderMode
          : undefined;
      const payload: Record<string, unknown> = {
        confirmationToken: token,
        confirmed: true,
      };
      if (reminderMode) payload.reminderMode = reminderMode;
      else if (options?.alarm === true) payload.alarm = true;
      const result = await callable(payload);
      if (requestGenerationRef.current !== generation || activeOperationRef.current !== 'commit') return null;

      const data = result.data as AgendaNexusCommitResult;
      setCommitResult(data);
      const responseError = getResponseError(data);
      if (isPartialResponse(data)) {
        setStage('partial');
        setError(responseError ?? 'A operação foi parcialmente concluída e precisa de reconciliação.');
        setCanUndo(false);
      } else if (!data.success || responseError) {
        setStage('error');
        setError(responseError ?? 'Não foi possível confirmar a operação da Agenda.');
        setCanUndo(false);
      } else {
        const isCreate = proposalIntentRef.current === 'create';
        setStage('success');
        setCanUndo(isCreate);
        if (isCreate) {
          setUndoContract(data.actionId ? { actionId: data.actionId, confirmationToken: token } : null);
          undoTimerRef.current = window.setTimeout(() => {
            undoTimerRef.current = null;
            setCanUndo(false);
            setUndoContract(null);
          }, UNDO_TTL_MS);
        } else {
          setUndoContract(null);
        }
        pendingConfirmationTokenRef.current = null;
        sessionIdRef.current = null;
      }
      return data;
    } catch (callError) {
      if (requestGenerationRef.current !== generation || activeOperationRef.current !== 'commit') return null;
      const message = getCallableErrorMessage(callError);
      const partial = /partial|parcial|reconcilia/i.test(message);
      setStage(partial ? 'partial' : 'error');
      setError(message);
      setCanUndo(false);
      return null;
    } finally {
      if (requestGenerationRef.current === generation) activeOperationRef.current = null;
    }
  }, []);

  const undo = useCallback(async () => {
    if (activeOperationRef.current !== null || !undoContract?.actionId || !canUndo) return null;
    const generation = requestGenerationRef.current + 1;
    requestGenerationRef.current = generation;
    activeOperationRef.current = 'commit';
    setStage('undoing');
    setError(null);
    try {
      const callable = httpsCallable(functions, 'nexusAgendaUndo');
      const result = await callable({ actionId: undoContract.actionId });
      if (requestGenerationRef.current !== generation || activeOperationRef.current !== 'commit') return null;
      const data = result.data as AgendaNexusCommitResult;
      setCommitResult(data);
      const responseError = getResponseError(data);
      if (!data.success || responseError || data.status === 'partial' || data.status === 'failed') {
        setStage(data.status === 'partial' ? 'partial' : 'error');
        setError(responseError ?? 'Não foi possível desfazer a criação.');
      } else {
        setStage('undone');
        setCanUndo(false);
        setUndoContract(null);
      }
      return data;
    } catch (callError) {
      if (requestGenerationRef.current !== generation || activeOperationRef.current !== 'commit') return null;
      setStage('error');
      setError(getCallableErrorMessage(callError));
      return null;
    } finally {
      if (requestGenerationRef.current === generation) activeOperationRef.current = null;
    }
  }, [canUndo, undoContract]);

  useEffect(() => () => {
    invalidateOperation();
  }, [invalidateOperation]);

  return {
    interpret,
    commit,
    cancel,
    reset,
    isLoading: stage === 'interpreting' || stage === 'resolving_dates' || stage === 'committing' || stage === 'undoing',
    stage,
    progressMessage,
    proposal,
    missing,
    ambiguous,
    assumptions,
    refinement,
    dialogue,
    commitResult,
    undo,
    error,
    canUndo,
    undoContract,
  };
}
