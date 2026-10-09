import React, { FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Info,
  MapPin,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {
  useAgendaNexus,
  type AgendaNexusAffectedItem,
  type AgendaNexusEditSnapshot,
  type AgendaNexusProposal,
  type AgendaReminderMode,
} from '../../hooks/useAgendaNexus';

interface AgendaNexusAssistantProps {
  className?: string;
  onCommitted?: () => void;
  onUndone?: () => void;
  onClose?: () => void;
  autoFocusCommand?: boolean;
}

function displayValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function formatDate(value?: string): string | null {
  if (!value) return null;
  const parts = value.split('-');
  if (parts.length !== 3) return value;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/** Data civil em America/Sao_Paulo a partir do epoch ms do compromisso. */
function formatPreviewDate(dateMs?: number): string | null {
  if (typeof dateMs !== 'number' || !Number.isFinite(dateMs)) return null;
  return new Date(dateMs).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

function DeleteItemsPreview({ items }: { items: AgendaNexusAffectedItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-rose-100 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 p-4" aria-label="Itens que serão excluídos">
      <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400">
        <AlertTriangle size={13} aria-hidden="true" />
        {items.length === 1 ? '1 compromisso será excluído' : `${items.length} compromissos serão excluídos`}
      </p>
      <ul className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
        {items.map((item) => {
          const itemDate = formatPreviewDate(item.dateMs);
          const itemTime = typeof item.time === 'string' && item.time ? item.time : null;
          return (
            <li key={item.id ?? `${item.title}-${item.dateMs}`} className="flex items-center justify-between gap-3 rounded-lg border border-rose-100 dark:border-rose-900/40 bg-white dark:bg-slate-800 px-3 py-2">
              <span className="min-w-0 truncate text-xs font-semibold text-slate-800 dark:text-slate-200">{item.title ?? 'Sem título'}</span>
              <span className="shrink-0 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {itemDate}
                {itemTime ? ` · ${itemTime}` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatRecurrence(proposal: AgendaNexusProposal): string | null {
  const recurrence = proposal.recurrence;
  if (!recurrence || typeof recurrence !== 'object') return null;
  const freq = typeof recurrence.freq === 'string' ? recurrence.freq : null;
  if (!freq) return null;
  const labels: Record<string, string> = {
    daily: 'Todos os dias',
    weekly: 'Toda semana',
    monthly: 'Todo mês',
  };
  return labels[freq] ?? freq;
}

function editFieldValue(snapshot: AgendaNexusEditSnapshot | null | undefined, field: keyof AgendaNexusEditSnapshot): string {
  if (!snapshot) return '—';
  const value = snapshot[field];
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'date' && typeof value === 'string') return formatDate(value) ?? value;
  if (field === 'participants' && Array.isArray(value)) return value.join(', ');
  return String(value);
}

/** Diferenças entre o estado atual (before) e o proposto (after) numa edição. */
function buildEditDiff(before?: AgendaNexusEditSnapshot | null, after?: AgendaNexusEditSnapshot | null): Array<{ label: string; before: string; after: string }> {
  if (!before || !after) return [];
  const labels: Record<string, string> = {
    title: 'Título',
    date: 'Data',
    startTime: 'Início',
    endTime: 'Término',
    location: 'Local',
    participants: 'Participantes',
    notes: 'Observações',
  };
  return (Object.keys(labels) as Array<keyof AgendaNexusEditSnapshot>)
    .filter((field) => editFieldValue(before, field) !== editFieldValue(after, field))
    .map((field) => ({ label: labels[field], before: editFieldValue(before, field), after: editFieldValue(after, field) }));
}

function EditDiffPreview({ before, after }: { before?: AgendaNexusEditSnapshot | null; after?: AgendaNexusEditSnapshot | null }) {
  const diff = buildEditDiff(before, after);
  if (diff.length === 0) return null;
  return (
    <div className="rounded-2xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/20 p-4" aria-label="Alterações da edição">
      <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-400">
        <Info size={13} aria-hidden="true" />
        Alterações propostas
      </p>
      <ul className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
        {diff.map((change) => (
          <li key={change.label} className="rounded-lg border border-sky-100 dark:border-sky-900/40 bg-white dark:bg-slate-800 px-3 py-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{change.label}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400"><span className="line-through">{change.before}</span> <span aria-hidden="true">→</span> <span className="font-semibold text-slate-800 dark:text-slate-200">{change.after}</span></p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatWarning(warning: unknown): string {
  if (typeof warning === 'string') return warning;
  if (warning && typeof warning === 'object') {
    const item = warning as { message?: unknown; type?: unknown };
    return String(item.message ?? item.type ?? 'Alerta na agenda');
  }
  return 'Alerta na agenda';
}

function SummaryRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{label}</p>
        <p className="break-words text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

function ListNotice({ title, items, tone = 'slate' }: { title: string; items: string[]; tone?: 'slate' | 'amber' | 'rose' }) {
  if (items.length === 0) return null;
  const colors = {
    slate: 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300',
    amber: 'border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300',
    rose: 'border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[tone]}`}>
      <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
        <Info size={13} aria-hidden="true" />
        {title}
      </p>
      <ul className="space-y-1 text-xs leading-relaxed">
        {items.map((item, index) => <li key={`${item}-${index}`}>• {item}</li>)}
      </ul>
    </div>
  );
}

/** Rótulo amigável dos campos ausentes retornados pelo backend. */
const MISSING_FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  date: 'Data',
  startTime: 'Horário de início',
  endTime: 'Horário de término',
  location: 'Local',
  participants: 'Participantes',
  notes: 'Observações',
  byDay: 'Dia da semana',
  recurrence: 'Recorrência',
  limitDate: 'Prazo da série',
  filter: 'Critério de identificação',
};

/** Rótulo amigável de cada modo de aviso escolhido na confirmação. */
const REMINDER_LABELS: Record<AgendaReminderMode, string> = {
  none: 'Sem aviso',
  notification: 'Notificação',
  notification_alarm: 'Notificação + alarme',
};

const REMINDER_OPTIONS: Array<{ value: AgendaReminderMode; label: string }> = [
  { value: 'none', label: 'Sem aviso' },
  { value: 'notification', label: 'Notificação' },
  { value: 'notification_alarm', label: 'Notificação + alarme' },
];

const INITIAL_SUGGESTIONS = [
  'Dentista amanhã às 14h',
  'Reunião toda terça às 10h',
  'Pagar condomínio dia 10',
  'Quais meus próximos compromissos?',
] as const;

export default function AgendaNexusAssistant({ className = '', onCommitted, onUndone, onClose, autoFocusCommand = false }: AgendaNexusAssistantProps) {
  const nexus = useAgendaNexus();
  const [input, setInput] = useState('');
  const [reminderChoice, setReminderChoice] = useState<AgendaReminderMode>('none');
  const [showTimeInAgenda, setShowTimeInAgenda] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const inputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const confirmingRef = useRef(false);
  const previousStageRef = useRef(nexus.stage);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (previousStageRef.current !== 'success' && nexus.stage === 'success') onCommitted?.();
    if (previousStageRef.current !== 'undone' && nexus.stage === 'undone') onUndone?.();
    previousStageRef.current = nexus.stage;
  }, [nexus.stage, onCommitted, onUndone]);

  useEffect(() => {
    if (nexus.stage === 'clarify' || nexus.stage === 'cancelled') inputRef.current?.focus();
  }, [nexus.stage]);

  useEffect(() => {
    if (autoFocusCommand) inputRef.current?.focus();
  }, [autoFocusCommand]);

  useEffect(() => {
    if (nexus.proposal) {
      setReminderChoice('none');
      setShowTimeInAgenda(true);
    }
  }, [nexus.proposal]);

  useEffect(() => {
    const container = threadRef.current;
    if (container && typeof container.scrollTo === 'function') {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [nexus.stage, nexus.dialogue]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const command = input.trim();
    if (!command || nexus.isLoading) return;
    await nexus.interpret({ prompt: command });
    setInput('');
  };

  const handleCorrect = () => {
    confirmingRef.current = false;
    nexus.cancel();
    inputRef.current?.focus();
  };

  const handleConfirm = async () => {
    if (confirmingRef.current || !canConfirm) return;
    confirmingRef.current = true;
    try {
      await nexus.commit(undefined, { reminderMode: reminderChoice });
    } finally {
      confirmingRef.current = false;
    }
  };

  const handleSuggestion = async (value: string) => {
    if (nexus.isLoading) return;
    setInput(value);
    await nexus.interpret({ prompt: value });
    setInput('');
  };

  const proposal = nexus.proposal;
  const refinement = nexus.refinement;
  const dialogue = nexus.dialogue;
  const isDialogueMode = dialogue.length > 0;
  const isDelete = proposal?.intent === 'delete' && proposal?.action === 'delete_commitment';
  const isEdit = proposal?.intent === 'edit' && proposal?.action === 'edit_commitment';
  const editBefore = proposal?.before ?? null;
  const editAfter = proposal?.after ?? null;
  const warnings = Array.isArray(proposal?.warnings)
    ? proposal.warnings.map(formatWarning)
    : [];
  const missing = nexus.missing.map((field) => MISSING_FIELD_LABELS[field] ?? field);
  const ambiguous = nexus.ambiguous;
  const assumptions = nexus.assumptions.map((assumption) => String(assumption.note ?? assumption.field ?? 'Suposição aplicada'));
  const affectedItems = Array.isArray(proposal?.affectedItems) ? proposal.affectedItems : [];
  const matchCount = typeof proposal?.matchCount === 'number' ? proposal.matchCount : null;
  const canConfirm = nexus.stage === 'done'
    && Boolean(proposal)
    && !nexus.isLoading
    && (
      (proposal?.intent === 'create' && proposal?.action === 'create_commitment')
      || (isDelete && matchCount !== null && matchCount > 0 && affectedItems.length > 0)
      || (isEdit && Boolean(editBefore) && Boolean(editAfter))
    );
  const showProposal = Boolean(proposal) && ['done', 'committing', 'success', 'partial', 'error', 'undone'].includes(nexus.stage);
  const startDate = formatDate(proposal?.firstDate);
  const endDate = formatDate(proposal?.lastDate);
  const title = displayValue(proposal?.title);
  const startTime = displayValue(proposal?.startTime);
  const endTime = displayValue(proposal?.endTime);
  const recurrence = proposal ? formatRecurrence(proposal) : null;
  const location = displayValue(proposal?.location);
  const notes = displayValue(proposal?.notes);
  const participants = Array.isArray(proposal?.participants) ? proposal.participants.join(', ') : null;
  const deletedCount = Array.isArray(nexus.commitResult?.idsDeleted) ? nexus.commitResult.idsDeleted.length : null;
  const missingTargets = isDelete && matchCount !== null && deletedCount !== null && deletedCount < matchCount
    ? matchCount - deletedCount
    : null;
  const successTitle = isDelete
    ? deletedCount !== null && deletedCount > 0
      ? `Pronto! ${deletedCount === 1 ? '1 compromisso excluído' : `${deletedCount} compromissos excluídos`} com sucesso.`
      : 'Compromissos excluídos com sucesso.'
    : isEdit
      ? 'Compromisso atualizado com sucesso.'
      : 'Compromisso criado com sucesso.';
  const successSubtitle = isDelete
    ? 'Os compromissos foram removidos permanentemente da sua Agenda.'
    : isEdit
      ? 'As alterações foram registradas no compromisso da sua Agenda.'
      : 'A criação foi registrada na sua Agenda.';

  return (
    <section className={`flex max-h-[calc(100dvh-7rem)] w-full flex-col overflow-hidden rounded-3xl border border-sky-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm md:max-h-[calc(100dvh-4rem)] ${className}`} aria-labelledby="agenda-nexus-title">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 bg-sky-50/70 dark:bg-slate-800/60 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-sky-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-sky-700 dark:text-sky-400 shadow-sm">
            <Sparkles size={19} aria-hidden="true" />
          </div>
          <div>
            <h2 id="agenda-nexus-title" className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">Nexus na Agenda</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">Descreva o compromisso. Eu organizo os dados antes de qualquer alteração.</p>
          </div>
        </div>
         {(onClose || (nexus.stage !== 'idle' && nexus.stage !== 'cancelled')) && (
           <button type="button" onClick={() => { nexus.reset(); onClose?.(); }} className="rounded-xl p-2 text-slate-500 dark:text-slate-400 transition hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100" aria-label="Fechar Nexus na Agenda">
            <X size={17} aria-hidden="true" />
          </button>
        )}
      </div>

      <div ref={threadRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 md:p-6">
        {!isOnline && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-xs font-semibold text-amber-800 dark:text-amber-300" role="status">
            <WifiOff size={16} className="shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>O Nexus na Agenda precisa de conexão com a internet para interpretar comandos. O caderno continua funcionando offline.</span>
          </div>
        )}

        {nexus.isLoading && (
          <div className="flex items-center gap-3 rounded-2xl border border-sky-100 dark:border-sky-900/40 bg-sky-50 dark:bg-sky-950/20 px-4 py-3 text-xs font-bold text-sky-800 dark:text-sky-300" role="status" aria-live="polite">
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:300ms]" />
            </span>
            {nexus.progressMessage ?? 'Nexus analisando…'}
          </div>
        )}

        {nexus.stage === 'cancelled' && <p className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 text-xs text-slate-600 dark:text-slate-300" role="status">Operação cancelada. Você pode escrever uma nova solicitação.</p>}

        {!isDialogueMode && nexus.stage === 'idle' && !showProposal && (
          <div className="space-y-3 py-1">
            <div className="rounded-2xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20 p-4">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Como posso ajudar você na sua agenda hoje?
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Você pode digitar em linguagem natural ou tocar em uma das sugestões abaixo:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {INITIAL_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void handleSuggestion(suggestion)}
                  disabled={nexus.isLoading || !isOnline}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-sky-800 dark:text-sky-300 shadow-sm transition hover:bg-sky-50 dark:hover:bg-slate-700 hover:border-sky-300 dark:hover:border-slate-600 active:scale-95 disabled:opacity-50"
                >
                  <Sparkles size={12} className="text-sky-500 shrink-0" aria-hidden="true" />
                  <span>{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {isDialogueMode && (
          <div className="space-y-3" role="status" aria-live="polite">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-400">
              <MessageCircle size={13} aria-hidden="true" />
              Diálogo com o Nexus
            </p>
            <div className="space-y-2">
              {dialogue.map((message, index) => (
                message.role === 'user' ? (
                  <div key={`user-${index}`} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-sky-100 dark:bg-sky-950/80 px-4 py-3 text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">{message.text}</div>
                  </div>
                ) : (
                  <div key={`assistant-${index}`} className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-sky-200 dark:border-sky-900/40 bg-sky-50 dark:bg-slate-800 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-800 dark:text-slate-200">{message.text}</div>
                  </div>
                )
              ))}
            </div>
            {refinement?.suggestions && Array.isArray(refinement.suggestions) && refinement.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {refinement.suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void handleSuggestion(suggestion)}
                    disabled={nexus.isLoading || !isOnline}
                    className="inline-flex items-center rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 px-3.5 py-2 text-xs font-bold text-sky-800 dark:text-sky-300 shadow-sm transition hover:bg-sky-100 dark:hover:bg-sky-900/60 active:scale-95 disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {nexus.stage === 'clarify' && !isDialogueMode && (
          <div className="space-y-3" role="status" aria-live="polite">
            <ListNotice title="Faltam informações" items={missing} />
            <ListNotice title="Preciso esclarecer" items={ambiguous} tone="amber" />
          </div>
        )}

        {showProposal && proposal && (
          <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm md:p-5" aria-label="Proposta do Nexus">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <CalendarDays size={17} className="text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">Revise antes de confirmar</h3>
              <span className="ml-auto rounded-full bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-300">Aguardando confirmação</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {title && (
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-3 sm:col-span-2 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400"><MessageCircle size={15} aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{isDelete ? 'Compromissos com o nome' : 'Compromisso'}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                        <p className="break-words text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</p>
                        {showTimeInAgenda && startTime && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-100 dark:bg-sky-950/60 px-1.5 py-0.5 font-mono text-xs font-bold text-sky-800 dark:text-sky-300">
                            <Clock3 size={13} aria-hidden="true" />
                            {endTime ? `${startTime} às ${endTime}` : startTime}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {startTime && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-start sm:justify-end">
                      <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 select-none py-0.5" aria-label="Mostrar o horário da agenda">
                        <input
                          type="checkbox"
                          checked={showTimeInAgenda}
                          onChange={(event) => setShowTimeInAgenda(event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 accent-sky-600 focus:ring-sky-500"
                        />
                        <span>Mostrar o horário da agenda</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
              {startDate && <SummaryRow icon={<CalendarDays size={15} />} label="Data inicial" value={startDate} />}
              {endDate && endDate !== startDate && <SummaryRow icon={<CalendarDays size={15} />} label="Data final" value={endDate} />}
              {!title && startTime ? (
                <SummaryRow icon={<Clock3 size={15} />} label={endTime ? 'Horário' : 'Início'} value={endTime ? `${startTime} às ${endTime}` : startTime} />
              ) : (
                !startTime && !isDelete && !isEdit && <SummaryRow icon={<Clock3 size={15} />} label="Horário" value="Dia inteiro (sem horário)" />
              )}
              {recurrence && <SummaryRow icon={<RotateCcw size={15} />} label="Recorrência" value={recurrence} />}
              {!isDelete && typeof proposal.occurrenceCount === 'number' && <SummaryRow icon={<CalendarDays size={15} />} label="Ocorrências" value={String(proposal.occurrenceCount)} />}
              {isDelete && matchCount !== null && <SummaryRow icon={<AlertTriangle size={15} />} label="Itens a excluir" value={`${matchCount} ${matchCount === 1 ? 'compromisso' : 'compromissos'}`} />}
              {location && <SummaryRow icon={<MapPin size={15} />} label="Local" value={location} />}
              {participants && <SummaryRow icon={<Users size={15} />} label="Participantes" value={participants} />}
              {notes && <SummaryRow icon={<Info size={15} />} label="Observações" value={notes} />}
              {canConfirm && !isDelete && !isEdit && reminderChoice !== 'none' && <SummaryRow icon={<Bell size={15} />} label="Aviso" value={REMINDER_LABELS[reminderChoice]} />}
            </div>
            {isDelete && affectedItems.length > 0 && <DeleteItemsPreview items={affectedItems} />}
            {isEdit && <EditDiffPreview before={editBefore} after={editAfter} />}
            <ListNotice title="Suposições" items={assumptions} />
            <ListNotice title="Conflitos ou duplicidades encontrados" items={warnings} tone="amber" />
            {canConfirm && !isDelete && !isEdit && (
              <fieldset className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4" aria-label="Preferência de aviso">
                <legend className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Aviso</legend>
                <p className="mb-2 text-xs text-slate-600 dark:text-slate-300">Você quer receber um aviso nesses compromissos?</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                  {REMINDER_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      <input type="radio" name="agenda-reminder" value={option.value} checked={reminderChoice === option.value} onChange={() => setReminderChoice(option.value)} className="accent-sky-600" />
                      {option.label}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">O alarme sonoro depende das permissões do dispositivo e pode exigir o aplicativo instalado ou aberto em segundo plano.</p>
              </fieldset>
            )}
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 dark:border-slate-800 pt-4 sm:flex-row sm:justify-end">
               <button type="button" onClick={() => { nexus.cancel(); onClose?.(); }} disabled={nexus.isLoading} className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50">Cancelar</button>
              <button type="button" onClick={handleCorrect} disabled={nexus.isLoading} className="rounded-xl border border-sky-200 dark:border-sky-800 px-4 py-3 text-xs font-black uppercase tracking-widest text-sky-700 dark:text-sky-300 transition hover:bg-sky-50 dark:hover:bg-sky-950/40 disabled:opacity-50">Corrigir</button>
              {canConfirm && <button type="button" onClick={() => void handleConfirm()} disabled={!canConfirm || confirmingRef.current} className="rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{isDelete ? 'Confirmar exclusão' : isEdit ? 'Confirmar edição' : 'Confirmar criação'}</button>}
            </div>
          </div>
        )}

        {nexus.stage === 'committing' && <p className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs font-bold text-amber-800 dark:text-amber-300" role="status" aria-live="polite">{isDelete ? 'Confirmando a exclusão na Agenda…' : isEdit ? 'Confirmando a edição na Agenda…' : 'Confirmando a criação na Agenda…'}</p>}
        {nexus.stage === 'success' && <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-sm text-emerald-800 dark:text-emerald-300" role="status"><CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><div><p className="font-black">{successTitle}</p><p className="mt-1 text-xs">{successSubtitle}</p>{missingTargets !== null && <p className="mt-2 rounded-lg bg-amber-100 dark:bg-amber-950/50 px-2 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">{missingTargets === 1 ? '1 compromisso não foi encontrado na agenda' : `${missingTargets} compromissos não foram encontrados na agenda`} — os demais foram excluídos.</p>}{nexus.canUndo && <button type="button" onClick={() => void nexus.undo()} className="mt-3 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">Desfazer</button>}</div></div>}
        {nexus.stage === 'undone' && <p className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-4 text-sm font-semibold text-slate-700 dark:text-slate-300" role="status">A criação foi desfeita.</p>}
        {nexus.stage === 'partial' && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-4 text-sm text-amber-900 dark:text-amber-200" role="alert"><AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /><div><p className="font-black">Operação parcialmente concluída.</p><p className="mt-1 text-xs">Alguns compromissos podem ter sido criados. É necessária reconciliação antes de tentar novamente.</p>{nexus.error && <p className="mt-2 text-xs">{nexus.error}</p>}</div></div>}
        {nexus.stage === 'error' && nexus.error && <p className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs font-semibold text-rose-800 dark:text-rose-300" role="alert">{nexus.error}</p>}
      </div>

      <footer className="shrink-0 border-t border-slate-100 dark:border-slate-800 p-4 md:p-5">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="agenda-nexus-command" className="sr-only">Comando para o Nexus</label>
          <input
            ref={inputRef}
            id="agenda-nexus-command"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={nexus.isLoading || !isOnline}
            placeholder={
              !isOnline
                ? 'Sem conexão com a internet...'
                : isDialogueMode
                  ? 'Digite sua resposta ou complemente a informação...'
                  : 'Ex.: reunião toda terça, às 17h, até novembro'
            }
            className="min-h-11 flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30 disabled:bg-slate-100 dark:disabled:bg-slate-900"
          />
          <button
            type="submit"
            disabled={!input.trim() || nexus.isLoading || !isOnline}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={15} aria-hidden="true" />
            Enviar
          </button>
        </form>
      </footer>
    </section>
  );
}
