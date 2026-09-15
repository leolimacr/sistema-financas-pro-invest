import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { Bell, BellOff, CalendarDays, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Check, Trash2, Sparkles, RefreshCw, WifiOff, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AgendaShortcutService } from '../services/agendaShortcutService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Timestamp } from 'firebase/firestore';
import {
  fetchMonthCommitments,
  fetchUpcomingCommitments,
  addCommitment,
  updateCommitment,
  deleteCommitment,
  toggleCommitment,
  reorderDayCommitments,
  type AgendaCommitment,
} from '../services/agendaService';
import { loadMonthCache } from '../agenda/agendaCache';
import { processAgendaSyncQueue } from '../agenda/agendaSyncQueue';
import {
  compareDayCommitments,
  moveCommitment,
  nextOrderForDay,
  replaceDayInMonth,
} from '../agenda/dayOrder';
import {
  scheduleAlarm, cancelAlarm, requestNotificationPermission,
  startAlarmChecker, stopAlarmChecker, setAlarmCallback, type AlarmInfo,
} from '../services/alarmService';
import { extendMonthStream, monthKey, monthsBetween, shiftMonth, type ScrollDirection } from '../agenda/monthMath';
import { useBills } from '../hooks/useBills';
import { resolveScrollContainer, scrollContainerBy } from '../agenda/scrollContainer';
import { useInfiniteMonthScroll, type YearMonth } from '../agenda/useInfiniteMonthScroll';
import AgendaNexusAssistant from './Agenda/AgendaNexusAssistant';

interface AgendaHubProps {
  onNavigate?: (tool: string, state?: any) => void;
  /** Modo de validação dev: compromissos em memória, sem Firebase (página dev-agenda.html). */
  seedCommitments?: AgendaCommitment[];
 }

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Textarea com auto-resize para inputs de compromisso (edição e adição).
// Cresce verticalmente conforme o conteúdo, mantendo largura fluida.
function AutoResizeTextarea({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  autoFocus,
  rows = 1,
  className = '',
  style,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={rows}
      className={`flex-1 text-sm bg-transparent outline-none resize-none ${className}`}
      style={{ minHeight: '20px', lineHeight: '17px', ...style }}
      {...props}
    />
  );
}
 
 // Altura única de cada faixa da agenda — fonte única de verdade para TODAS as
// linhas (vazias, compromisso de 1 linha e cada fragmento de compromisso multilinha).
const AGENDA_ROW_HEIGHT = 28;

// Pauta única do caderno: uma linha horizontal no fim de cada faixa, derivada da
// mesma constante AGENDA_ROW_HEIGHT. Aplicada UMA vez no wrapper do caderno;
// nenhuma linha desenha a própria régua.
const agendaPautaStyle: React.CSSProperties = {
  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0 ${AGENDA_ROW_HEIGHT - 1}px, #7dd3fc ${AGENDA_ROW_HEIGHT - 1}px ${AGENDA_ROW_HEIGHT}px)`,
};

// Limite máximo de "Próximos Compromissos" e chave de persistência (localStorage)
const UPCOMING_LIMIT_MAX = 50;
const UPCOMING_LIMIT_KEY = 'fpi-agenda-proximos-limit';

function getInitialUpcomingLimit(): number {
  try {
    const v = Number(localStorage.getItem(UPCOMING_LIMIT_KEY));
    if (Number.isFinite(v) && v >= 1) return Math.min(Math.floor(v), UPCOMING_LIMIT_MAX);
  } catch {
    /* localStorage indisponível — usa padrão */
  }
  return 5;
}

// Janela (ms) em que a extensão automática fica suspensa após uma navegação
// programática de mês — cobre a duração do scroll smooth até a seção alvo.
const MONTH_NAV_SUPPRESS_MS = 500;

function measureCommitLines(el: HTMLElement): string[] | null {
  const textNode = Array.from(el.childNodes).find((n) => n.nodeType === Node.TEXT_NODE) as Text | undefined;
  if (!textNode) return null;
  const text = textNode.textContent ?? '';
  if (!text) return [''];
  try {
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const rects = Array.from(range.getClientRects()).filter((r) => r.width > 0 && r.height > 0);
    if (rects.length <= 1) return [text];
    const spansLines = (start: number, end: number): number => {
      const r = document.createRange();
      r.setStart(textNode, start);
      r.setEnd(textNode, end);
      return r.getClientRects().length;
    };
    const lines: string[] = [];
    let start = 0;
    while (start < text.length) {
      while (start < text.length && /\s/.test(text[start])) start++;
      if (start >= text.length) break;
      let lineEnd = start;
      let idx = start;
      while (idx < text.length) {
        let wordEnd = idx;
        while (wordEnd < text.length && !/\s/.test(text[wordEnd])) wordEnd++;
        let afterWord = wordEnd;
        while (afterWord < text.length && /\s/.test(text[afterWord])) afterWord++;
        if (spansLines(start, afterWord) >= 2) break;
        lineEnd = afterWord;
        idx = afterWord;
      }
      if (lineEnd === start) {
        let lo = start + 1;
        let hi = text.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (spansLines(start, mid) >= 2) hi = mid;
          else lo = mid + 1;
        }
        lines.push(text.slice(start, lo - 1));
        start = lo - 1;
      } else {
        lines.push(text.slice(start, lineEnd));
        start = lineEnd;
      }
    }
    return lines;
  } catch {
    return [text];
  }
}

function tsToDate(ts: Timestamp | Date): Date {
  return ts instanceof Date ? ts : ts.toDate();
}

function toDateInputStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function groupSeedByMonth(seed: AgendaCommitment[] | undefined): Record<string, AgendaCommitment[]> {
  const out: Record<string, AgendaCommitment[]> = {};
  if (!seed) return out;
  for (const c of seed) {
    const d = tsToDate(c.date);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    (out[k] ??= []).push(c);
  }
  return out;
}

// Garante que (year, month) exista no stream mantendo a ordem cronológica.
// Se já existir, devolve a MESMA referência (sem mutação/duplicação).
function withMonthInStream(stream: YearMonth[], year: number, month: number): YearMonth[] {
  if (stream.some((m) => m.year === year && m.month === month)) return stream;
  const idx = stream.findIndex((m) => m.year > year || (m.year === year && m.month > month));
  if (idx === -1) return [...stream, { year, month }];
  if (idx === 0) return [{ year, month }, ...stream];
  return [...stream.slice(0, idx), { year, month }, ...stream.slice(idx)];
}

const AgendaHub: React.FC<AgendaHubProps> = ({ onNavigate, seedCommitments }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [activeYear, setActiveYear] = useState(today.getFullYear());
  const [activeMonth, setActiveMonth] = useState(today.getMonth());

  // Stream de meses — só cresce, nunca encolhe
  const [monthStream, setMonthStream] = useState<Array<{ year: number; month: number }>>(() => {
    const y = today.getFullYear();
    const m = today.getMonth();
    const result: Array<{ year: number; month: number }> = [];
    for (let i = -2; i <= 2; i++) {
      result.push(shiftMonth(y, m, i));
    }
    return result;
  });

  // Linhas medidas de cada título quebrado (commit id → linhas)
  const [commitLines, setCommitLines] = useState<Record<string, string[]>>({});

  const [allMonths, setAllMonths] = useState<Record<string, AgendaCommitment[]>>(() => groupSeedByMonth(seedCommitments));
  const [upcoming, setUpcoming] = useState<AgendaCommitment[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [upcomingLimit, setUpcomingLimit] = useState<number>(() => getInitialUpcomingLimit());
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showAgendaNexus, setShowAgendaNexus] = useState(false);
  const nexusTriggerRef = useRef<HTMLButtonElement | null>(null);
  const nexusPanelRef = useRef<HTMLDivElement | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const upcomingLimitRef = useRef(upcomingLimit);
  upcomingLimitRef.current = upcomingLimit;

  // --- Inline editing ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [addingDayKey, setAddingDayKey] = useState<string | null>(null);
  const [addText, setAddText] = useState('');

  // --- Alarm popover ---
  const [alarmTarget, setAlarmTarget] = useState<{
    id: string; date: Date; title: string; currentAlarm?: Date;
  } | null>(null);

  // --- Calendário popover (navegação rápida para datas distantes) ---
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // --- Confirmação de exclusão de compromisso ---
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; title: string } | null>(null);

  // --- Atalho no celular (Modal Pedagógico & Native Pin) ---
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [isPinningShortcut, setIsPinningShortcut] = useState(false);

  const userId = user?.uid;
  const { bills: recurringBills = [] } = useBills(userId);
  const [isSyncingBills, setIsSyncingBills] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const notebookRef = useRef<HTMLDivElement | null>(null);
  const loadedKeysRef = useRef<Set<string>>(new Set());
  const monthStreamRef = useRef(monthStream);
  monthStreamRef.current = monthStream;
  const initialLoadingRef = useRef(true);
  const isSavingRef = useRef(false);
  const monthHeaderRef = useRef<HTMLDivElement | null>(null);

  // --- Loading de dados com Cache Local Soberano (Zero Tela Branca Offline) ---
  const ensureMonthLoaded = useCallback(async (year: number, month: number, force?: boolean) => {
    if (!userId || seedCommitments) return;
    const key = `${year}-${month}`;

    // 1. Hidratação Instantânea via Cache Local (aparelho)
    const cachedData = loadMonthCache(userId, year, month);
    if (cachedData && cachedData.length > 0) {
      setAllMonths((prev) => {
        if (!prev[key] || prev[key].length === 0) {
          return { ...prev, [key]: cachedData };
        }
        return prev;
      });
    }

    if (!force && loadedKeysRef.current.has(key)) return;
    loadedKeysRef.current.add(key);
    try {
      const data = await fetchMonthCommitments(userId, year, month);
      if (import.meta.env.DEV) console.log(`[Agenda] ensureMonthLoaded ${key} force=${force} → ${data.length} itens`);
      setAllMonths((prev) => {
        const n = prev[key]?.length ?? 0;
        if (import.meta.env.DEV && n !== data.length) console.log(`[Agenda] setAllMonths ${key}: ${n}→${data.length}`);
        return { ...prev, [key]: data };
      });
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Agenda] Falha ao carregar mês', year, month, e);
      setLoadError(true);
      // NUNCA esvazia os compromissos se houver cache local ou dados prévios!
      setAllMonths((prev) => {
        if (prev[key] && prev[key].length > 0) return prev;
        if (cachedData && cachedData.length > 0) return { ...prev, [key]: cachedData };
        return { ...prev, [key]: [] };
      });
    }
  }, [userId, seedCommitments]);

  const loadUpcoming = useCallback(async (limit?: number) => {
    if (seedCommitments) {
      setUpcoming([]);
      return;
    }
    if (!userId) return;
    try {
      const data = await fetchUpcomingCommitments(userId, limit ?? upcomingLimitRef.current);
      setUpcoming(data);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Agenda] Falha ao carregar próximos compromissos', e);
      setLoadError(true);
      setUpcoming([]);
    }
  }, [userId, seedCommitments]);

  // Aplica um limite de "Próximos Compromissos" e abre (ou atualiza) o painel
  const applyUpcomingLimit = useCallback((raw: number) => {
    const safe = Math.max(1, Math.min(Math.floor(raw), UPCOMING_LIMIT_MAX));
    setUpcomingLimit(safe);
    try { localStorage.setItem(UPCOMING_LIMIT_KEY, String(safe)); } catch { /* ignore */ }
    setShowUpcoming(true);
    setCustomOpen(false);
    loadUpcoming(safe);
  }, [loadUpcoming]);

  const commitCustom = useCallback(() => {
    const n = Number(customInput.trim());
    if (Number.isFinite(n) && n >= 1) {
      applyUpcomingLimit(n);
    } else {
      setCustomOpen(false);
    }
  }, [customInput, applyUpcomingLimit]);


  const handleSyncBills = useCallback(async () => {
    if (!userId) return;
    if (!recurringBills || recurringBills.length === 0) {
      addToast('Nenhuma conta fixa ativa encontrada no Controla.', 'info');
      return;
    }
    setIsSyncingBills(true);
    try {
      const count = await syncBillsToAgenda(userId, recurringBills, activeYear, activeMonth);
      if (count > 0) {
        addToast(
          `${count} ${count === 1 ? 'conta sincronizada' : 'contas sincronizadas'} com a Agenda!`,
          'success'
        );
        await ensureMonthLoaded(activeYear, activeMonth, true);
        await loadUpcoming(upcomingLimitRef.current);
      } else {
        addToast('Todas as contas deste mês já estão sincronizadas na Agenda.', 'info');
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Agenda] Erro ao sincronizar contas', e);
      addToast('Erro ao sincronizar contas com a Agenda.', 'error');
    } finally {
      setIsSyncingBills(false);
    }
  }, [userId, recurringBills, activeYear, activeMonth, ensureMonthLoaded, loadUpcoming, addToast]);

  const toggleUpcoming = useCallback(() => {
    setShowUpcoming((prev) => !prev);
    loadUpcoming();
  }, [loadUpcoming]);

  // Carrega dados APENAS para activeMonth ± 1 (lazy — sem buscas desnecessárias)
  useEffect(() => {
    if (!userId) return;
    const offsets = [-1, 0, 1];
    Promise.all(offsets.map((offset) => {
      const { year: ny, month: nm } = shiftMonth(activeYear, activeMonth, offset);
      return ensureMonthLoaded(ny, nm);
    })).finally(() => {
      if (initialLoadingRef.current) {
        initialLoadingRef.current = false;
        setInitialLoading(false);
      }
    });
    loadUpcoming();
  }, [activeYear, activeMonth, userId, ensureMonthLoaded, loadUpcoming]);

  // Podar meses distantes para evitar crescimento infinito da DOM. Mantém o
  // stream limitado a ±3 meses do mês ativo. Roda tanto quando o mês ativo muda
  // quanto imediatamente após cada extensão (flush do debounce) — assim mesmo
  // durante scroll contínuo dentro do mesmo mês a DOM não cresce sem limite.
  const pruneDistantMonths = useCallback((activeYear: number, activeMonth: number) => {
    setMonthStream(prev => {
      const pruned = prev.filter(({ year, month }) => {
        const diff = monthsBetween(activeYear, activeMonth, year, month);
        return Math.abs(diff) <= 3;
      });
      if (pruned.length === prev.length) return prev;
      return pruned;
    });
    setAllMonths(prev => {
      const keep: Record<string, AgendaCommitment[]> = {};
      for (let i = -3; i <= 3; i++) {
        const { year: ny, month: nm } = shiftMonth(activeYear, activeMonth, i);
        const key = monthKey(ny, nm);
        if (prev[key]) keep[key] = prev[key];
      }
      if (Object.keys(keep).length === Object.keys(prev).length) return prev;
      return keep;
    });
  }, []);

  // --- Mapa dia → compromissos ---
  const dayMap = useMemo(() => {
    const map = new Map<string, AgendaCommitment[]>();
    for (const [, commitments] of Object.entries(allMonths)) {
      for (const c of commitments) {
        const d = tsToDate(c.date);
        const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        if (!map.has(k)) map.set(k, []);
        map.get(k)!.push(c);
      }
    }
    for (const list of map.values()) {
      list.sort(compareDayCommitments);
    }
    return map;
  }, [allMonths]);

  // --- Detecção de título quebrado: mede o texto real e, se couber em 2+ linhas,
  // armazena os fragmentos para renderizar cada linha como uma faixa própria ---
  useEffect(() => {
    const container = notebookRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;

    let disposed = false;

    const measure = () => {
      if (disposed) return;
      const lines: Record<string, string[]> = {};
      container.querySelectorAll<HTMLElement>('[data-title-anchor]').forEach((titleEl) => {
        const row = titleEl.closest<HTMLElement>('[data-commit-id]');
        const id = row?.dataset.commitId;
        if (!id) return;
        const anchor = row.querySelector<HTMLElement>('[data-measure-anchor]');
        const result = measureCommitLines(anchor ?? titleEl);
        if (result && result.length > 1) lines[id] = result;
      });
      setCommitLines((prev) => {
        const nextLines: Record<string, string[]> = {};
        for (const id of Object.keys(lines)) nextLines[id] = lines[id];
        const same =
          Object.keys(nextLines).length === Object.keys(prev).length &&
          Object.entries(nextLines).every(
            ([id, ls]) => prev[id] && prev[id].length === ls.length && prev[id].every((ln, i) => ln === ls[i]),
          );
        return same ? prev : nextLines;
      });
    };

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    measure();
    if (typeof document.fonts !== 'undefined') {
      document.fonts.ready.then(() => {
        if (!disposed) measure();
      }).catch(() => {});
    }
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [allMonths, monthStream]);

  // --- Extensão ATÔMICA do stream (adiciona meses à DOM — nunca remove) ---
  // Um único setMonthStream por flush automático; o count vem do motor de
  // scroll e a lógica de meses/duplicatas/ordem vive em monthMath (função pura).
  const extendMonths = useCallback((direction: ScrollDirection, count: number) => {
    setMonthStream(prev => extendMonthStream(prev, direction, count));
  }, []);

  // Mês ativo como objeto estável (referência) para o hook do motor de scroll.
  const activeMonthObj = useMemo(
    () => ({ year: activeYear, month: activeMonth }),
    [activeYear, activeMonth],
  );

  const onActiveMonthChange = useCallback((next: YearMonth) => {
    setActiveYear(next.year);
    setActiveMonth(next.month);
  }, []);

  // Motor de infinite scroll (extraído): resolução do scroller, listener de
  // scroll com rAF + debounce/ceiling, extensão forward/backward em buffer
  // zones, compensação de posição por âncora e poda de meses distantes.
  const { captureScrollAnchor, suppressAutoExtendRef } = useInfiniteMonthScroll({
    notebookRef,
    monthHeaderRef,
    monthStream,
    activeMonth: activeMonthObj,
    initialLoading,
    onActiveMonthChange,
    onExtendMonths: extendMonths,
    onPruneDistantMonths: pruneDistantMonths,
  });

  // --- Scroll para o dia atual na abertura ---
  const initialScrollDone = useRef(false);

  useEffect(() => {
    if (initialLoading || initialScrollDone.current) return;
    if (activeYear !== today.getFullYear() || activeMonth !== today.getMonth()) return;
    const el = document.getElementById(`agenda-day-${activeYear}-${activeMonth}-${today.getDate()}`);
    if (el) {
      initialScrollDone.current = true;
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [initialLoading, activeYear, activeMonth, today]);

  // Timers de navegação (goToDate/goToday): cancelados no unmount para não
  // dispararem scroll/supressão em um caderno já desmontado.
  const navTimersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = navTimersRef.current;
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, []);

  // --- Pedir permissão de notificação (desktop) na primeira visita ---
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // --- Coletar compromissos com alarme e iniciar checker ---
  const navigate = useNavigate();
  useEffect(() => {
    setAlarmCallback((info: AlarmInfo) => {
      if (onNavigate) {
        onNavigate('agenda', { date: info.dateStr });
      } else {
        navigate(`/app/agenda?date=${info.dateStr}`);
      }
    });
    return () => setAlarmCallback(() => {});
  }, [navigate, onNavigate]);

  useEffect(() => {
    const alarms: AlarmInfo[] = [];
    for (const [, commitments] of Object.entries(allMonths)) {
      for (const c of commitments) {
        if (c.alarmAt && c.id) {
          const d = tsToDate(c.alarmAt);
          alarms.push({
            commitmentId: c.id,
            title: c.title,
            dateStr: toDateInputStr(tsToDate(c.date)),
            alarmAt: d,
            userId: userId || undefined,
          });
        }
      }
    }
    startAlarmChecker(alarms);
    return () => stopAlarmChecker();
  }, [allMonths, userId]);

  // --- Navegação por mês (botões do cabeçalho) ---
  // Intenção pendente de navegação mensal: consumida pelo useLayoutEffect abaixo
  // (pós-render), que só rola quando a seção alvo já existe na DOM. Nunca usa
  // setTimeout para "aguardar o render" — é o próprio efeito que espera a seção
  // aparecer, mantendo a intenção até lá.
  const pendingMonthNavRef = useRef<YearMonth | null>(null);

  // Posiciona o topo da seção do mês alvo no topo da área útil (logo abaixo do
  // cabeçalho fixo), buscando a seção DENTRO do caderno (nunca no document).
  // Devolve false se a seção ainda não existe — o chamador mantém a intenção.
  const scrollToMonthSection = useCallback((year: number, month: number): boolean => {
    const key = monthKey(year, month);
    const section = notebookRef.current?.querySelector<HTMLElement>(`[data-month-section="${key}"], [data-month-section="${year}-${month}"]`);
    if (!section) return false;

    // Alinha o topo da seção exatamente ao topo da área útil — logo abaixo do
    // cabeçalho fixo (AppHeader + cabeçalho da Agenda). Medir o cabeçalho real,
    // em vez de depender de scroll-margin fixa, garante que o dia 1 seja a
    // primeira linha visível: scroll-margin menor que a pilha fixa deixava o
    // dia 1 escondido sob a barra (primeiro dia visível = dia 2).
    const sc = resolveScrollContainer(notebookRef.current);
    const usefulTop = monthHeaderRef.current?.getBoundingClientRect().bottom ?? 0;
    scrollContainerBy(sc, section.getBoundingClientRect().top - usefulTop);
    return true;
  }, [notebookRef, monthHeaderRef]);

  // Fluxo centralizado de navegação mensal: ativa suppress temporário, garante o
  // mês no stream (sem duplicar, ordem cronológica), atualiza o mês ativo e
  // registra a intenção que o useLayoutEffect consome assim que a seção renderizar.
  const navigateToMonth = useCallback((year: number, month: number) => {
    suppressAutoExtendRef.current = true;
    navTimersRef.current.push(window.setTimeout(() => {
      suppressAutoExtendRef.current = false;
    }, MONTH_NAV_SUPPRESS_MS));

    // Já está no mês alvo e a seção existe: navega direto, sem pendência (que
    // ficaria órfã — nenhum estado muda para o efeito re-disparar).
    if (activeYear === year && activeMonth === month &&
        monthStream.some((m) => m.year === year && m.month === month)) {
      scrollToMonthSection(year, month);
      return;
    }

    ensureMonthLoaded(year, month);
    setMonthStream(prev => withMonthInStream(prev, year, month));
    setActiveYear(year);
    setActiveMonth(month);
    pendingMonthNavRef.current = { year, month };
  }, [activeYear, activeMonth, monthStream, ensureMonthLoaded, suppressAutoExtendRef, scrollToMonthSection]);

  // Consome a intenção pendente APÓS o render: só navega quando a seção do mês
  // alvo existe na DOM; se ainda não existe, mantém a intenção e re-tenta no
  // próximo render (monthStream/activeMonth/initialLoading mudam).
  useLayoutEffect(() => {
    const target = pendingMonthNavRef.current;
    if (!target) return;
    if (!scrollToMonthSection(target.year, target.month)) return;
    pendingMonthNavRef.current = null;
  }, [monthStream, activeYear, activeMonth, initialLoading, scrollToMonthSection]);

  const goPrevMonth = useCallback(() => {
    const { year, month } = shiftMonth(activeYear, activeMonth, -1);
    navigateToMonth(year, month);
  }, [activeYear, activeMonth, navigateToMonth]);

  const goNextMonth = useCallback(() => {
    const { year, month } = shiftMonth(activeYear, activeMonth, 1);
    navigateToMonth(year, month);
  }, [activeYear, activeMonth, navigateToMonth]);

  // --- Ir para hoje ---
  const goToDate = useCallback((date: Date) => {
    const y = date.getFullYear();
    const m = date.getMonth();
    const d = date.getDate();
    suppressAutoExtendRef.current = true;
    ensureMonthLoaded(y, m);
    captureScrollAnchor();
    setMonthStream(prev => withMonthInStream(prev, y, m));
    setActiveYear(y);
    setActiveMonth(m);
    const t1 = window.setTimeout(() => {
      document.getElementById(`agenda-day-${y}-${m}-${d}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      navTimersRef.current.push(window.setTimeout(() => { suppressAutoExtendRef.current = false; }, 2000));
    }, 80);
    navTimersRef.current.push(t1);
  }, [ensureMonthLoaded, captureScrollAnchor, suppressAutoExtendRef]);

  const goToday = useCallback(() => {
    const ty = today.getFullYear();
    const tm = today.getMonth();
    suppressAutoExtendRef.current = true;
    captureScrollAnchor();
    setMonthStream(prev => {
      if (prev.some(m => m.year === ty && m.month === tm)) return prev;
      return [{ year: ty, month: tm }, ...prev];
    });
    setActiveYear(ty);
    setActiveMonth(tm);
    const t1 = window.setTimeout(() => {
      const el = document.getElementById(`agenda-day-${ty}-${tm}-${today.getDate()}`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      navTimersRef.current.push(window.setTimeout(() => { suppressAutoExtendRef.current = false; }, 2000));
    }, 80);
    navTimersRef.current.push(t1);
  }, [today, captureScrollAnchor, suppressAutoExtendRef]);

  // --- Navegação interna do calendário popover ---
  const openCalendar = useCallback(() => {
    setCalYear(activeYear);
    setCalMonth(activeMonth);
    setCalendarOpen(true);
  }, [activeYear, activeMonth]);

  const calGoPrev = useCallback(() => {
    const { year: y, month: m } = shiftMonth(calYear, calMonth, -1);
    setCalMonth(m);
    setCalYear(y);
  }, [calMonth, calYear]);

  const calGoNext = useCallback(() => {
    const { year: y, month: m } = shiftMonth(calYear, calMonth, 1);
    setCalMonth(m);
    setCalYear(y);
  }, [calMonth, calYear]);

  const pickCalendarDate = useCallback((date: Date) => {
    goToDate(date);
    setCalendarOpen(false);
  }, [goToDate]);

  // --- CRUD callbacks ---
  const reloadData = useCallback(() => {
    if (!userId) return;
    const offsets = [-1, 0, 1];
    Promise.all(offsets.map((offset) => {
      const { year: ny, month: nm } = shiftMonth(activeYear, activeMonth, offset);
      return ensureMonthLoaded(ny, nm, true);
    }));
    loadUpcoming();
  }, [userId, activeYear, activeMonth, ensureMonthLoaded, loadUpcoming]);

  const reloadAgendaAfterNexus = useCallback(() => {
    reloadData();
  }, [reloadData]);

  const handleOpenNexus = useCallback(() => {
    setShowAgendaNexus(true);
  }, []);

  const handleCloseNexus = useCallback(() => {
    setShowAgendaNexus(false);
    requestAnimationFrame(() => nexusTriggerRef.current?.focus());
  }, []);

  const handleNexusTriggerKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleOpenNexus();
  }, [handleOpenNexus]);

  useEffect(() => {
    if (!showAgendaNexus) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleCloseNexus();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAgendaNexus, handleCloseNexus]);

  useEffect(() => {
    if (showAgendaNexus) requestAnimationFrame(() => nexusPanelRef.current?.focus());
  }, [showAgendaNexus]);

  const reloadDataRef = useRef(reloadData);
  reloadDataRef.current = reloadData;
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

  // Monitoramento de conectividade e sincronização da fila offline
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncPendingQueue = async () => {
      if (!userId || !navigator.onLine) return;
      try {
        setIsSyncingQueue(true);
        const res = await processAgendaSyncQueue(userId, {
          onIdReplaced: (tempId, realId, year, month) => {
            const key = `${year}-${month}`;
            setAllMonths((prev) => {
              const list = prev[key];
              if (!list) return prev;
              return {
                ...prev,
                [key]: list.map((c) => (c.id === tempId ? { ...c, id: realId } : c)),
              };
            });
          },
        });
        if (res.processed > 0) {
          addToastRef.current(
            `${res.processed} ${res.processed === 1 ? 'compromisso sincronizado' : 'compromissos sincronizados'} com a nuvem!`,
            'success'
          );
          reloadDataRef.current();
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[AgendaHub] Erro na sincronização da fila:', err);
      } finally {
        setIsSyncingQueue(false);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      void syncPendingQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Se estiver online no mount e houver operações pendentes, sincroniza
    if (navigator.onLine && userId) {
      void syncPendingQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId]);

  const handleDelete = useCallback(async (id: string) => {
    if (!userId) return;
    try {
      await deleteCommitment(userId, id, { year: activeYear, month: activeMonth });
      reloadData();
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Agenda] Erro ao excluir', e);
      addToast('Não foi possível excluir o compromisso', 'error');
    }
  }, [userId, activeYear, activeMonth, reloadData, addToast]);

  const openDeleteConfirm = useCallback((id: string, title: string) => {
    setDeleteConfirmTarget({ id, title: title ?? '' });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!userId || !deleteConfirmTarget) return;
    try {
      await deleteCommitment(userId, deleteConfirmTarget.id, { year: activeYear, month: activeMonth });
      reloadData();
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Agenda] Erro ao excluir', e);
      addToast('Não foi possível excluir o compromisso', 'error');
    } finally {
      setDeleteConfirmTarget(null);
    }
  }, [userId, deleteConfirmTarget, activeYear, activeMonth, reloadData, addToast]);

  const handleRequestShortcut = useCallback(async () => {
    setIsPinningShortcut(true);
    try {
      if (AgendaShortcutService.isNativeAndroid()) {
        const res = await AgendaShortcutService.requestPinShortcut();
        if (res.success) {
          addToast(
            'Solicitação enviada! Confirme no diálogo do Android para adicionar o atalho à tela inicial.',
            'success'
          );
        } else {
          addToast(res.message || 'Não foi possível criar o atalho automaticamente.', 'info');
        }
      } else {
        addToast('Siga as instruções para adicionar à tela inicial pelo seu dispositivo.', 'info');
      }
    } catch {
      addToast('Erro ao solicitar criação de atalho.', 'error');
    } finally {
      setIsPinningShortcut(false);
    }
  }, [addToast]);

  const handleToggle = useCallback(async (id: string, completed: boolean) => {
    if (!userId) return;
    try {
      await toggleCommitment(userId, id, completed, { year: activeYear, month: activeMonth });
      reloadData();
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Agenda] Erro ao marcar/desmarcar', e);
      addToast('Erro ao atualizar status', 'error');
    }
  }, [userId, activeYear, activeMonth, reloadData, addToast]);

  // --- Inline edit handlers ---
  const startEdit = useCallback((c: AgendaCommitment) => {
    setEditingId(c.id ?? null);
    setEditText(c.title);
  }, []);

  const commitEdit = useCallback(async (id: string) => {
    if (!userId) return;
    const text = editText.trim();
    if (!text) {
      await handleDelete(id);
    } else {
      try {
        await updateCommitment(userId, id, { title: text }, { year: activeYear, month: activeMonth });
        reloadData();
      } catch (e) {
        if (import.meta.env.DEV) console.error('[Agenda] Erro ao editar', e);
        addToast('Não foi possível salvar a alteração', 'error');
      }
    }
    setEditingId(null);
    setEditText('');
  }, [userId, editText, activeYear, activeMonth, reloadData, handleDelete, addToast]);

  const startAdd = useCallback((dayKey: string) => {
    setAddingDayKey(dayKey);
    setAddText('');
  }, []);

  const commitAdd = useCallback(async (dateObj: Date) => {
    if (!userId) return;
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    try {
      const text = addText.trim();
      if (text) {
        const dayKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
        const dayItems = dayMap.get(dayKey) || [];
        const nextOrder = nextOrderForDay(dayItems);

        const docRefId = await addCommitment(userId, {
          date: dateObj,
          title: text,
          completed: false,
          order: nextOrder,
        });

        const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
        const optimisticCommitment = {
          id: docRefId,
          date: dateObj,
          title: text,
          completed: false,
          order: nextOrder,
        } as unknown as AgendaCommitment;
        setAllMonths((prev) => {
          const existing = prev[key] || [];
          return { ...prev, [key]: [...existing, optimisticCommitment] };
        });
        loadedKeysRef.current.delete(key);

        if (!navigator.onLine) {
          addToast('Compromisso salvo no aparelho (modo offline)', 'info');
        }
      }
      setAddingDayKey(null);
      setAddText('');
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Agenda] Erro ao adicionar', e);
      addToast('Não foi possível adicionar o compromisso', 'error');
    } finally {
      isSavingRef.current = false;
    }
  }, [userId, addText, dayMap, addToast]);

  const shiftCommitment = useCallback((dayKey: string, fromIndex: number, toIndex: number) => {
    const dayItems = dayMap.get(dayKey) || [];
    const reordered = moveCommitment(dayItems, fromIndex, toIndex);
    if (reordered === dayItems) return;

    const [yStr, mStr] = dayKey.split('-');
    const monthKeyStr = `${yStr}-${mStr}`;

    setAllMonths((prev) => {
      const monthList = prev[monthKeyStr];
      if (!monthList) return prev;
      const nextMonthList = replaceDayInMonth(monthList, dayKey, reordered);
      if (nextMonthList === monthList) return prev;
      return { ...prev, [monthKeyStr]: nextMonthList };
    });

    if (seedCommitments || !userId) return;

    const payload = reordered
      .filter((c): c is AgendaCommitment & { id: string; order: number } => typeof c.id === 'string' && typeof c.order === 'number')
      .map((c) => ({ id: c.id, order: c.order }));

    reorderDayCommitments(userId, payload, { year: Number(yStr), month: Number(mStr) }).catch((err) => {
      if (import.meta.env.DEV) console.error('[Agenda] Erro ao persistir reordenação', err);
      addToast('Não foi possível salvar a nova ordem dos compromissos', 'error');
      reloadData();
    });
  }, [dayMap, seedCommitments, userId, addToast, reloadData]);

  // --- Alarm handlers ---
  const openAlarm = useCallback((c: AgendaCommitment) => {
    const d = tsToDate(c.date);
    setAlarmTarget({
      id: c.id ?? '',
      date: d,
      title: c.title,
      currentAlarm: c.alarmAt ? tsToDate(c.alarmAt) : undefined,
    });
  }, []);

  const setAlarm = useCallback(async (time: string) => {
    if (!userId || !alarmTarget) return;
    const [h, m] = time.split(':').map(Number);
    const alarmDate = new Date(alarmTarget.date);
    alarmDate.setHours(h, m, 0, 0);
    try {
      await updateCommitment(userId, alarmTarget.id, { alarmAt: alarmDate });
      scheduleAlarm({
        commitmentId: alarmTarget.id,
        title: alarmTarget.title,
        dateStr: toDateInputStr(alarmTarget.date),
        alarmAt: alarmDate,
        userId,
      });
      reloadData();
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Agenda] Erro ao definir alarme', e);
      addToast('Erro ao definir alarme', 'error');
    }
    setAlarmTarget(null);
  }, [userId, alarmTarget, reloadData, addToast]);

  const clearAlarm = useCallback(async () => {
    if (!userId || !alarmTarget) return;
    try {
      await updateCommitment(userId, alarmTarget.id, { alarmAt: null });
      cancelAlarm(alarmTarget.id);
      reloadData();
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Agenda] Erro ao remover alarme', e);
      addToast('Erro ao remover alarme', 'error');
    }
    setAlarmTarget(null);
  }, [userId, alarmTarget, reloadData, addToast]);

  function commitmentTimeLabel(c: AgendaCommitment): string {
    if (c.time) return c.time;
    const d = tsToDate(c.date);
    if (d.getHours() || d.getMinutes()) return formatTime(d);
    return '';
  }

  // --- Renderização de cada linha de dia (inline edit + alarme) ---
  function renderDayRow(
    day: number,
    month: number,
    year: number,
  ) {
    const key = `${year}-${month}-${day}`;
    const commitments = dayMap.get(key) || [];
    const dateObj = new Date(year, month, day);
    const dayIdx = dateObj.getDay();
    const dayOfWeek = DAYS_SHORT[dayIdx];
    const isToday = isSameDay(dateObj, today);
    const isWeekend = dayIdx === 0 || dayIdx === 6;
    const isEmpty = commitments.length === 0;
    const isAdding = addingDayKey === key;
    const todayCls = isToday ? 'font-bold italic' : '';

    // Estrutura única de TODA faixa da agenda (vazia, de 1 linha ou fragmento de
    // multilinha): altura fixa = AGENDA_ROW_HEIGHT; a régua vem UMA vez da pauta
    // global do caderno — nenhuma linha desenha a própria régua.
    const rowCls = `relative flex items-end gap-1.5 md:gap-3 -mx-2 px-2 sm:-mx-4 sm:px-4 ${todayCls}`;

    const firstCommit = commitments[0];
    const restCommits = commitments.slice(1);
    const firstId = firstCommit?.id ?? '';
    const firstLines = firstId ? commitLines[firstId] : undefined;
    const firstFragments = firstLines && firstLines.length > 1 ? firstLines : null;

    const dayLabel = (
      <span
        className={`inline-flex items-baseline whitespace-nowrap gap-1 w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 text-[14px] md:text-[15px] leading-[17px] font-black uppercase tracking-wider translate-y-[1px] pr-1.5 ${
          isToday ? 'text-sky-700 ring-1.5 ring-sky-500 rounded-full px-1' : isWeekend ? 'text-rose-500' : 'text-slate-500'
        }`}
      >
        <span className="shrink-0">{dayOfWeek}</span>
        <span className="shrink-0">{day}</span>
      </span>
    );

    // Caixa de texto comum a qualquer compromisso: âncora invisível com o título
    // completo (para medição de quebra) + fragmento 1 (ou o título completo).
    const titleSpan = (c: AgendaCommitment, fragments: string[] | null) => (
      <span
        className={`flex-1 text-[13px] sm:text-sm leading-[17px] tracking-tight sm:tracking-normal break-words cursor-text relative min-w-0 translate-y-[1.5px] font-bold ${
          c.completed ? 'line-through text-slate-400' : 'text-slate-800'
        }`}
        data-title-anchor={c.id}
        onClick={() => startEdit(c)}
      >
        {fragments && (
          <span aria-hidden className="invisible absolute left-0 right-0 top-0" data-measure-anchor>
            {c.title}
          </span>
        )}
        {fragments ? fragments[0] : c.title}
      </span>
    );

    // Linhas 2..N de um compromisso quebrado: faixas reais da mesma grade, sem
    // rótulo de dia/checkbox. Começam na margem útil da folha (apenas o respiro
    // do px da faixa), dando a cada linha a largura quase total disponível.
    const continuationRows = (c: AgendaCommitment, fragments: string[] | null) =>
      fragments && fragments.length > 1 && editingId !== c.id
        ? fragments.slice(1).map((ln, i) => (
            <div
              key={`frag-${c.id}-${i}`}
              data-continuation-row={c.id}
              className={rowCls}
              style={{ height: AGENDA_ROW_HEIGHT }}
            >
              <span
                className={`flex-1 text-[13px] sm:text-sm leading-[17px] tracking-tight sm:tracking-normal break-words cursor-text min-w-0 translate-y-[1.5px] font-bold ${
                  c.completed ? 'line-through text-slate-400' : 'text-slate-800'
                }`}
                data-fragment-line
                onClick={() => startEdit(c)}
              >
                {ln}
              </span>
            </div>
          ))
        : null;

    const reorderButtons = (index: number) => {
      if (commitments.length <= 1) return null;
      return (
        <div className="flex items-center gap-0 md:gap-0.5 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity" data-testid={`agenda-reorder-group-${index}`}>
          <button
            type="button"
            disabled={index === 0}
            onClick={(e) => {
              e.stopPropagation();
              shiftCommitment(key, index, index - 1);
            }}
            className={`p-0.5 transition-colors ${
              index === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-sky-600'
            }`}
            title="Subir compromisso"
            aria-label="Subir compromisso"
            data-testid={`agenda-reorder-up-${index}`}
          >
            <ChevronUp size={13} className="w-[13px] h-[13px] md:w-[14px] md:h-[14px]" />
          </button>
          <button
            type="button"
            disabled={index === commitments.length - 1}
            onClick={(e) => {
              e.stopPropagation();
              shiftCommitment(key, index, index + 1);
            }}
            className={`p-0.5 transition-colors ${
              index === commitments.length - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-sky-600'
            }`}
            title="Descer compromisso"
            aria-label="Descer compromisso"
            data-testid={`agenda-reorder-down-${index}`}
          >
            <ChevronDown size={13} className="w-[13px] h-[13px] md:w-[14px] md:h-[14px]" />
          </button>
        </div>
      );
    };

    const controls = (c: AgendaCommitment, index: number) => (
      <div className="shrink-0 flex items-center gap-0.5 sm:gap-1 ml-auto">
        {commitmentTimeLabel(c) && (
          <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 shrink-0 tracking-tight sm:tracking-normal">{commitmentTimeLabel(c)}</span>
        )}
        {reorderButtons(index)}
        <button
          onClick={() => openAlarm(c)}
          className={`transition-colors p-0.5 shrink-0 ${
            c.alarmAt ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'
          }`}
          title={c.alarmAt ? 'Alarme definido' : 'Definir alarme'}
        >
          {c.alarmAt
            ? <Bell size={14} fill="currentColor" className="w-[14px] h-[14px]" />
            : <BellOff size={14} className="w-[14px] h-[14px]" />}
        </button>
        <button
          onClick={() => c.id && openDeleteConfirm(c.id, c.title)}
          className="text-slate-400 hover:text-red-500 md:opacity-0 md:group-hover:opacity-100 transition-all p-0.5 shrink-0"
          title="Excluir"
        >
          <Trash2 size={14} className="w-[14px] h-[14px]" />
        </button>
      </div>
    );

    const editInput = (commitId: string | undefined) => (
      <div className="flex items-center gap-1.5 flex-1 bg-white rounded-xl shadow-md border border-sky-400 ring-2 ring-sky-100 px-2.5 py-1 z-30 relative -my-1">
        <AutoResizeTextarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={() => commitId && commitEdit(commitId)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && commitId) {
              e.preventDefault();
              commitEdit(commitId);
            }
            if (e.key === 'Escape') setEditingId(null);
          }}
          className="flex-1 text-[13px] sm:text-sm text-slate-800 min-w-0 tracking-tight sm:tracking-normal bg-transparent focus:outline-none"
          autoFocus
          rows={1}
        />
        <button
          onClick={() => commitId && commitEdit(commitId)}
          className="shrink-0 text-emerald-600 hover:text-emerald-700 p-0.5 self-center transition-colors"
          title="Confirmar"
        >
          <Check size={16} strokeWidth={3} className="w-[16px] h-[16px]" />
        </button>
        <button
          onClick={() => setEditingId(null)}
          className="text-slate-400 hover:text-slate-600 p-0.5 shrink-0 self-center transition-colors"
          title="Cancelar"
        >
          <X size={16} className="w-[16px] h-[16px]" />
        </button>
      </div>
    );

    // Controles do input de ADIÇÃO (dia vazio e dias com compromissos). Compartilhados
    // para o input viver SEMPRE na linha de destino do compromisso: para dias vazios a
    // linha é a própria linha da data (primeira linha); para dias preenchidos é a linha
    // vazia logo abaixo. Assim o clique, o cursor e a renderização final coincidem.
    const addInputControls = () => (
      <div className="flex items-center gap-1.5 flex-1 bg-white rounded-xl shadow-md border border-sky-400 ring-2 ring-sky-100 px-2.5 py-1 z-30 relative -my-1">
        <div className="shrink-0 w-3.5 h-3.5 rounded border-2 border-dashed border-sky-400" />
        <AutoResizeTextarea
          value={addText}
          onChange={(e) => setAddText(e.target.value)}
          onBlur={() => commitAdd(dateObj)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commitAdd(dateObj);
            }
            if (e.key === 'Escape') setAddingDayKey(null);
          }}
          placeholder="Digite o compromisso..."
          className="flex-1 text-[13px] sm:text-sm text-slate-700 placeholder-slate-400 tracking-tight sm:tracking-normal bg-transparent focus:outline-none"
          autoFocus
          rows={1}
        />
        <button
          onClick={() => commitAdd(dateObj)}
          className="shrink-0 text-emerald-600 hover:text-emerald-700 p-0.5 self-center transition-colors"
          title="Confirmar"
        >
          <Check size={16} strokeWidth={3} className="w-[16px] h-[16px]" />
        </button>
        <button
          onClick={() => setAddingDayKey(null)}
          className="text-slate-400 hover:text-slate-600 p-0.5 shrink-0 self-center transition-colors"
          title="Cancelar"
        >
          <X size={16} className="w-[16px] h-[16px]" />
        </button>
      </div>
    );

    const checkbox = (c: AgendaCommitment) => (
      <button
        onClick={() => c.id && handleToggle(c.id, !c.completed)}
        className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors mb-px ${
          c.completed
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-slate-300 hover:border-sky-400'
        }`}
      >
        {c.completed && <Check size={11} strokeWidth={3} className="w-[11px] h-[11px]" />}
      </button>
    );

    return (
      <div key={key}>
        {/* Linha do dia: cabeçalho + primeiro compromisso na MESMA faixa da grade.
            Em dias vazios esta linha é a LINHA DE ENTRADA: clicável quando ociosa e,
            ao adicionar, o input de digitação vive NELA — o cursor e a renderização
            final do compromisso ficam sempre na linha da data, sem subir/descer. */}
        <div
          id={`agenda-day-${year}-${month}-${day}`}
          data-commit-id={firstCommit?.id}
          className={`${rowCls} group ${isEmpty && !isAdding ? 'cursor-pointer hover:bg-sky-50/50 rounded-sm' : ''}`}
          style={{ height: AGENDA_ROW_HEIGHT }}
          onClick={isEmpty && !isAdding ? () => startAdd(key) : undefined}
        >
          {dayLabel}

          {isEmpty ? (
            isAdding ? (
              addInputControls()
            ) : (
              <span className="text-[11px] text-slate-300 flex-1">—</span>
            )
          ) : (
            firstCommit &&
              (editingId === firstCommit.id ? (
                editInput(firstCommit.id)
              ) : (
                <>
                  {checkbox(firstCommit)}
                  {titleSpan(firstCommit, firstFragments)}
                  {controls(firstCommit, 0)}
                </>
              ))
          )}
        </div>

        {/* Fragmentos 2..N do primeiro compromisso — faixas reais da mesma grade */}
        {continuationRows(firstCommit, firstFragments)}

        {/* Demais compromissos: cada um em faixa própria + fragmentos */}
        {restCommits.map((c, restIdx) => {
          const cId = c.id ?? '';
          const cLines = cId ? commitLines[cId] : undefined;
          const cFragments = cLines && cLines.length > 1 ? cLines : null;
          return (
            <div key={c.id}>
              <div
                data-commit-id={c.id}
                className={`${rowCls} hover:bg-sky-50/50 rounded-sm group`}
                style={{ height: AGENDA_ROW_HEIGHT }}
              >
                <span className="w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 pr-1.5" aria-hidden="true" />
                {editingId === c.id ? (
                  editInput(c.id)
                ) : (
                  <>
                    {checkbox(c)}
                    {titleSpan(c, cFragments)}
                    {controls(c, restIdx + 1)}
                  </>
                )}
              </div>
              {continuationRows(c, cFragments)}
            </div>
          );
        })}

        {!isEmpty ? (
          isAdding ? (
            <div className="relative flex items-end gap-1.5 md:gap-3 -mx-2 px-2 sm:-mx-4 sm:px-4" style={{ height: AGENDA_ROW_HEIGHT }}>
              <span className="w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 pr-1.5" aria-hidden="true" />
              {addInputControls()}
            </div>
          ) : (
            <div
              className="relative flex items-end gap-1.5 md:gap-3 -mx-2 px-2 sm:-mx-4 sm:px-4 cursor-pointer hover:bg-sky-50/50 rounded-sm group"
              onClick={() => startAdd(key)}
              style={{ height: AGENDA_ROW_HEIGHT }}
            >
              <span className="w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 pr-1.5" aria-hidden="true" />
            </div>
          )
        ) : (
          <div
            className="relative flex items-end gap-1.5 md:gap-3 -mx-2 px-2 sm:-mx-4 sm:px-4"
            style={{ height: AGENDA_ROW_HEIGHT }}
            aria-hidden="true"
          >
            <span className="w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 pr-1.5" aria-hidden="true" />
          </div>
        )}
      </div>
    );
  }

  // --- Divider entre meses ---
  function renderDivider(month: number, year: number) {
    return (
      <div key={`divider-${year}-${month}`} className="flex items-center gap-3 h-[28px] select-none">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {MONTHS[month]} {year}
        </span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>
    );
  }

  // --- Render ---
  return (
    <>
      {!userId ? (
        <div className="max-w-4xl mx-auto px-4 pt-14 md:pt-6 pb-28 animate-in fade-in duration-500">
          <p className="text-slate-500 text-sm">Faça login para usar a Agenda.</p>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-2 sm:px-4 pb-28">

          {/* Cabeçalho fixo — seção + mês/ano sempre visíveis durante o scroll.
              Usa `fixed` (não `sticky`): o AppLayout tem <main overflow-y-auto>,
              que se torna o "scroll container" mais próximo e impede o sticky de
              engatar. UMA estrutura única responsiva (testids não duplicados):
              mobile 2 linhas (título+atalhos / navegação de mês); desktop 1 linha
              h-14 com o mês sobreposto ao centro, inalterado. */}
          {/* BARRA FIXA ÚNICA — topo absoluto em relação à viewport.
              Reestruturação em CSS Grid soberano:
              - Mobile: 2 linhas limpas (Linha 1: Título + Ações; Linha 2: Navegação de Mês).
              - Desktop: 3 colunas fluidas em linha única (md:grid-cols-[auto_1fr_auto]),
                onde o mês vive na coluna central (1fr) com justify-self-center,
                eliminando 100% qualquer risco geométrico de sobreposição sobre o Nexus. */}
          <div
            ref={monthHeaderRef}
            data-testid="agenda-header"
            className="fixed top-[calc(4rem+env(safe-area-inset-top))] left-0 right-0 z-[90] isolate bg-white border-b border-slate-100"
          >
            <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 w-full px-3 md:px-4 py-1.5 md:py-0 md:h-14">
              {/* Bloco 1 — título e status (Coluna 1) */}
              <div className="flex items-center gap-2 min-w-0 justify-self-start">
                <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2 shrink-0">
                  <CalendarDays size={18} className="text-sky-600" />
                  Agenda
                </h1>
                {!isOnline && (
                  <span
                    data-testid="agenda-offline-badge"
                    title="Modo Offline: Seus compromissos continuam salvos no aparelho."
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] md:text-[11px] font-black uppercase tracking-wider text-amber-700 shadow-xs shrink-0"
                  >
                    <WifiOff size={12} className="text-amber-600 shrink-0" />
                    <span>Offline</span>
                  </span>
                )}
                {isSyncingQueue && (
                  <span
                    data-testid="agenda-syncing-badge"
                    title="Sincronizando compromissos com a nuvem..."
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] md:text-[11px] font-black uppercase tracking-wider text-emerald-700 shadow-xs shrink-0"
                  >
                    <RefreshCw size={12} className="animate-spin text-emerald-600 shrink-0" />
                    <span className="hidden sm:inline">Sincronizando...</span>
                  </span>
                )}
              </div>

              {/* Bloco 2 — ações (Nexus, Sincronizar, HOJE, Próximos)
                  No mobile: canto superior direito (col 2, row 1).
                  No desktop: coluna 3 à direita via md:order-3. */}
              <div className="justify-self-end flex items-center gap-1.5 md:gap-2 shrink-0 md:order-3">
                <button
                  type="button"
                  onClick={handleOpenNexus}
                  onKeyDown={handleNexusTriggerKeyDown}
                  ref={nexusTriggerRef}
                  aria-label="Abrir Nexus na Agenda"
                  aria-expanded={showAgendaNexus}
                  aria-controls="agenda-nexus-panel"
                  title="Nexus na Agenda"
                  data-testid="agenda-nexus-trigger"
                  className="relative inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1.5 md:px-3 text-xs font-black text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 active:scale-95 shrink-0"
                >
                  <Sparkles size={14} aria-hidden="true" className="shrink-0" />
                  <span className="hidden xl:inline">Nexus na Agenda</span>
                  <span className="xl:hidden">Nexus</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowShortcutModal(true)}
                  aria-label="Atalho da Agenda no celular"
                  title="Criar atalho da Agenda na tela do celular"
                  data-testid="agenda-shortcut-trigger"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-2 py-1.5 md:px-2.5 text-xs font-bold text-sky-700 shadow-sm transition hover:bg-sky-100 hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 active:scale-95 shrink-0"
                >
                  <Smartphone size={13} className="text-sky-600 shrink-0" />
                  <span className="hidden xl:inline">Atalho</span>
                </button>
                {userId && (
                  <button
                    type="button"
                    onClick={handleSyncBills}
                    disabled={isSyncingBills}
                    aria-label="Sincronizar contas do Controla"
                    title="Sincronizar contas do Controla para este mês"
                    data-testid="agenda-sync-bills"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 md:px-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw size={13} className={isSyncingBills ? 'animate-spin text-sky-600' : 'text-slate-500'} />
                    <span className="hidden xl:inline">Sincronizar Contas</span>
                  </button>
                )}
                {userId && (
                  <button
                    type="button"
                    onClick={goToday}
                    aria-label="Ir para hoje"
                    title="Ir para hoje"
                    data-testid="agenda-hoje"
                    className="bg-sky-500 text-white px-2 py-1.5 md:px-2.5 rounded-xl shadow hover:bg-sky-600 transition-all active:scale-95 text-xs md:text-sm font-bold shrink-0"
                  >
                    HOJE
                  </button>
                )}
                <button
                  onClick={toggleUpcoming}
                  data-testid="agenda-proximos-toggle"
                  className="bg-sky-500 text-white px-2 py-1.5 md:px-2.5 rounded-lg shadow hover:bg-sky-600 transition-all active:scale-95 text-xs md:text-sm font-bold shrink-0"
                >
                  Próximos
                </button>
              </div>

              {/* Bloco 3 — Navegação de mês
                  No mobile: linha 2 (col-span-2).
                  No desktop: coluna central (md:order-2 md:col-span-1), centralizado com justify-self-center sem NENHUM absolute! */}
              <div className="col-span-2 md:col-span-1 justify-self-center flex items-center justify-center gap-0.5 md:gap-1 md:order-2 w-full md:w-auto py-0.5 md:py-0">
                <button
                  onClick={goPrevMonth}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800 shrink-0"
                  aria-label="Mês anterior"
                  data-testid="agenda-prev-month"
                >
                  <ChevronLeft size={18} />
                </button>
                <span
                  data-testid="agenda-month-label"
                  aria-live="polite"
                  className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-tight text-center mx-1 whitespace-nowrap"
                >
                  <time dateTime={`${activeYear}-${String(activeMonth + 1).padStart(2, '0')}`}>
                    {MONTHS[activeMonth]} {activeYear}
                  </time>
                </span>
                <button
                  onClick={goNextMonth}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800 shrink-0"
                  aria-label="Próximo mês"
                  data-testid="agenda-next-month"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={openCalendar}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800 shrink-0"
                  aria-label="Ir para data"
                  title="Ir para data"
                  data-testid="agenda-open-calendar-header"
                >
                  <CalendarDays size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Espaçador que reserva a altura do cabeçalho fixo para o caderno não
              ficar escondido sob a barra. Mobile: altura das duas linhas
              (min-h-[84px]). Desktop: h-14 (56px). */}
          <div className="min-h-[84px] md:min-h-14" aria-hidden="true" />

          {showAgendaNexus && (
            <div
              id="agenda-nexus-panel"
              ref={nexusPanelRef}
              data-testid="agenda-nexus-panel"
              data-state="open"
              role="dialog"
              aria-modal="true"
              aria-label="Nexus na Agenda"
              tabIndex={-1}
              onClick={(event) => {
                if (event.target === event.currentTarget) handleCloseNexus();
              }}
              className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[calc(4rem+env(safe-area-inset-top)+1rem)] backdrop-blur-sm md:items-center md:pt-4"
            >
              <div className="w-full max-w-2xl">
              <AgendaNexusAssistant
                onCommitted={reloadAgendaAfterNexus}
                onUndone={reloadAgendaAfterNexus}
                onClose={handleCloseNexus}
                autoFocusCommand
              />
              </div>
            </div>
          )}

      {showUpcoming ? (
        <section data-testid="agenda-proximos-panel" className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Próximos Compromissos
            </h2>
            <button
              onClick={() => setShowUpcoming(false)}
              className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Voltar ao caderno"
              data-testid="agenda-proximos-close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => applyUpcomingLimit(5)}
              data-testid="agenda-proximos-5"
              className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                upcomingLimit === 5 ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
              }`}
            >
              5
            </button>
            <button
              onClick={() => setCustomOpen((v) => !v)}
              data-testid="agenda-proximos-custom"
              className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
                customOpen || upcomingLimit !== 5 ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
              }`}
            >
              N
            </button>
            {customOpen && (
              <>
                <input
                  type="number"
                  min={1}
                  max={UPCOMING_LIMIT_MAX}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onBlur={commitCustom}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitCustom();
                    if (e.key === 'Escape') setCustomOpen(false);
                  }}
                  autoFocus
                  placeholder="Nº"
                  data-testid="agenda-proximos-input"
                  className="w-20 text-sm px-2 py-1 rounded-lg border border-slate-200 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <button
                  onClick={commitCustom}
                  className="text-xs font-bold px-3 py-1 rounded-full bg-sky-500 text-white hover:bg-sky-600 transition-colors"
                >
                  Ver
                </button>
              </>
            )}
          </div>

          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum compromisso futuro.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming.map((c) => {
                const d = tsToDate(c.date);
                const label = `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
                return (
                  <div key={c.id} className="flex items-center gap-3 py-2.5 group">
                    <button
                      onClick={() => c.id && handleToggle(c.id, !c.completed)}
                      className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                        c.completed
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 hover:border-sky-400'
                      }`}
                    >
                      {c.completed && <Check size={10} strokeWidth={3} />}
                    </button>
                    <span className="text-[11px] font-black text-slate-500 min-w-[90px] uppercase tracking-tight">
                      {label}
                    </span>
                    <span
                      className={`flex-1 text-sm leading-tight break-words font-bold ${
                        c.completed ? 'line-through text-slate-400' : 'text-slate-800'
                      }`}
                    >
                      {c.title}
                    </span>
                    {commitmentTimeLabel(c) && (
                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {commitmentTimeLabel(c)}
                      </span>
                    )}
                    <button
                      onClick={() => c.id && openDeleteConfirm(c.id, c.title)}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg p-1 transition-all shrink-0"
                      title="Excluir"
                    >
                      <Trash2 size={16} className="w-[16px] h-[16px]" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <>
      {/* CADERNO */}
      <div ref={notebookRef} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative -mt-2">
        <div className="relative">
          {/* Linha vertical vermelha (margem do caderno) */}
          {/* Linha vermelha vertical lateral removida: ocupava a lateral esquerda e
              reduzia a área útil; a folha pautada + linhas horizontais seguem
              intocadas, regidas pela pauta global do caderno. */}

          <div className="relative pl-2 pr-2 sm:pl-4 sm:pr-4" data-notebook-content style={{ ...agendaPautaStyle, overflowAnchor: 'none' }}>
            {initialLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              monthStream.map(({ year, month }, idx) => {
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                return (
                  <div key={`sec-${year}-${month}`}>
                    {idx > 0 && renderDivider(month, year)}
                    <div
                      data-month-section={`${year}-${month}`}
                      className="scroll-mt-[96px] md:scroll-mt-16"
                    >
                      {days.map((day) => renderDayRow(day, month, year))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
        </>
      )}

    </div>
      )}

      {/* POPOVER — Configurar alarme */}
      {alarmTarget && (
        <div className="fixed inset-0 z-[100] bg-black/30 flex items-end md:items-center justify-center p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]" onClick={() => setAlarmTarget(null)}>
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">Alarme</h3>
              <button onClick={() => setAlarmTarget(null)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-600 truncate">{alarmTarget.title}</p>
            {alarmTarget.currentAlarm && (
              <p className="text-[11px] text-amber-600 font-medium">
                Alarme atual: {formatTime(alarmTarget.currentAlarm)}
              </p>
            )}
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5 block">
                Horário do alarme
              </label>
              <input
                type="time"
                defaultValue={alarmTarget.currentAlarm ? formatTime(alarmTarget.currentAlarm) : ''}
                id="alarm-time-input"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-2">
              {alarmTarget.currentAlarm && (
                <button
                  onClick={clearAlarm}
                  className="flex-1 py-3 rounded-xl border border-red-200 text-red-600 text-[11px] font-black uppercase tracking-widest hover:bg-red-50 transition-colors"
                >
                  Remover
                </button>
              )}
              <button
                onClick={() => {
                  const input = document.getElementById('alarm-time-input') as HTMLInputElement;
                  if (input?.value) setAlarm(input.value);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
              >
                Definir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPOVER — Calendário de navegação rápida */}
      {calendarOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/30 flex items-end md:items-center justify-center p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
          onClick={() => setCalendarOpen(false)}
          data-testid="agenda-calendar-popover"
        >
          <div
            className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">Calendário</h3>
              <button
                onClick={() => setCalendarOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={calGoPrev}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
                aria-label="Mês anterior no calendário"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                {MONTHS[calMonth]} {calYear}
              </span>
              <button
                onClick={calGoNext}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-800"
                aria-label="Próximo mês no calendário"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {DAYS_SHORT.map((d) => (
                <span key={d} className="text-[9px] font-black uppercase tracking-wider text-slate-400 py-1">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {(() => {
                const cells: React.ReactNode[] = [];
                const firstDayOffset = new Date(calYear, calMonth, 1).getDay();
                const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                for (let i = 0; i < firstDayOffset; i++) cells.push(<div key={`pad-${i}`} />);
                for (let day = 1; day <= daysInMonth; day++) {
                  const dateObj = new Date(calYear, calMonth, day);
                  const isToday = isSameDay(dateObj, today);
                  const dayIdx = dateObj.getDay();
                  const hasCommits = dayMap.has(`${calYear}-${calMonth}-${day}`);
                  cells.push(
                    <button
                      key={`day-${day}`}
                      onClick={() => pickCalendarDate(dateObj)}
                      data-testid={`calendar-day-${calYear}-${calMonth}-${day}`}
                      className={`relative h-9 rounded-lg text-sm font-semibold transition-colors ${
                        isToday
                          ? 'bg-sky-500 text-white shadow'
                          : dayIdx === 0
                            ? 'text-red-700 hover:bg-red-50'
                            : dayIdx === 6
                              ? 'text-rose-500 hover:bg-rose-50'
                              : 'text-slate-700 hover:bg-sky-50'
                      }`}
                    >
                      {day}
                      {hasCommits && !isToday && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-400" />
                      )}
                    </button>
                  );
                }
                return cells;
              })()}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { goToday(); setCalendarOpen(false); }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
              >
                Hoje
              </button>
              <button
                onClick={() => setCalendarOpen(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      {loadError && (
        <div className="fixed bottom-24 right-6 z-50 bg-red-500 text-white px-4 py-2.5 rounded-xl shadow-lg font-bold text-sm flex items-center gap-2">
          <span>Erro ao carregar dados</span>
          <button
            onClick={() => { setLoadError(false); reloadData(); }}
            className="underline font-black"
          >
            Tentar novamente
          </button>
        </div>
      )}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-in fade-in duration-300">
          <div className="absolute inset-0" onClick={() => setDeleteConfirmTarget(null)}></div>
          <div className="bg-white border border-slate-200 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col relative z-10">
            <div className="p-6 md:p-8 flex flex-col gap-4 max-h-[95vh]">
              <h3 className="text-xl md:text-2xl font-black text-slate-900 text-center">Excluir compromisso?</h3>
              <p className="text-slate-600 text-center leading-relaxed">
                Tem certeza que deseja excluir o compromisso &ldquo;<strong className="font-black text-slate-900">{(deleteConfirmTarget?.title?.length ?? 0 > 60
                  ? deleteConfirmTarget.title.substring(0, 60) + '...'
                  : deleteConfirmTarget.title)}</strong>&rdquo;? Esta ação é irreversível.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PEDAGÓGICO — Atalho da Agenda na Tela Inicial */}
      {showShortcutModal && (
        <div
          className="fixed inset-0 z-[1000] bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-in fade-in duration-200"
          onClick={() => setShowShortcutModal(false)}
          data-testid="agenda-shortcut-modal"
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Atalho da Agenda</h3>
                  <p className="text-[11px] font-semibold text-slate-500">Acesso instantâneo com 1 toque</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Card com o Ícone da Agenda */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-50/70 to-blue-50/40 border border-sky-100 flex items-center gap-4">
              <div className="relative shrink-0">
                <img
                  src="/assets/images/brand/agenda-icon.png"
                  alt="Ícone Agenda Finanças Pro Invest"
                  className="w-16 h-16 rounded-2xl shadow-lg border-2 border-white object-cover"
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-black">
                  ✓
                </span>
              </div>
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider mb-1">
                  Finanças Pro Invest
                </div>
                <h4 className="text-sm font-black text-slate-900 leading-snug">Agenda de Compromissos</h4>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Acesse suas tarefas e compromissos diretamente da tela inicial do celular com um único toque.
                </p>
              </div>
            </div>

            {/* Explicação Pedagógica: Por que criar o atalho? */}
            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-black">
                  1
                </div>
                <p>
                  <strong className="text-slate-800 font-bold">Sem passos intermediários:</strong> Toque no ícone da Agenda na sua tela inicial e você será levado diretamente aos seus compromissos, sem precisar carregar a tela principal primeiro.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-black">
                  2
                </div>
                <p>
                  <strong className="text-slate-800 font-bold">Funciona Offline:</strong> Mesmo sem internet, o atalho abre imediatamente o caderno com os dados já salvos no seu aparelho.
                </p>
              </div>
            </div>

            {/* Ação Dinâmica Principal */}
            {AgendaShortcutService.isNativeAndroid() ? (
              <button
                type="button"
                onClick={handleRequestShortcut}
                disabled={isPinningShortcut}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-md hover:shadow-lg hover:brightness-105 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <Smartphone size={18} />
                <span>{isPinningShortcut ? 'Solicitando ao Android...' : 'Adicionar Atalho à Tela Inicial'}</span>
              </button>
            ) : null}

            {/* Passo a Passo Pedagógico */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 block">
                Outras Formas Práticas de Acessar:
              </span>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-[11px] text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="font-black text-slate-700 shrink-0">Opção A (Toque Longo):</span>
                  <span>
                    Na tela inicial do celular, <strong>pressione e segure o ícone do Finanças Pro Invest</strong> por 1 segundo. No menu que surgir, segure a opção <strong>&quot;Agenda&quot;</strong> e arraste para sua tela inicial.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-slate-700 shrink-0">Opção B (Navegador/PWA):</span>
                  <span>
                    No Chrome/Safari, toque no menu <strong className="text-slate-800">⋮</strong> (ou Compartilhar no iPhone) e selecione <strong className="text-slate-800">&quot;Adicionar à tela de início&quot;</strong>.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              data-testid="agenda-shortcut-close"
              onClick={() => setShowShortcutModal(false)}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export { AgendaHub };
export { pickActiveMonth } from '../agenda/activeMonth';
export { isProbeInterlocked, nextExtendDelay, resolveFlushDirection, getExtendBuffer } from '../agenda/useInfiniteMonthScroll';
