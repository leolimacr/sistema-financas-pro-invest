import React, { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import {
  CalendarDays, ChevronLeft, ChevronRight, Sparkles, RefreshCw, WifiOff, Smartphone, Search, Sun, Moon
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AgendaShortcutService } from '../services/agendaShortcutService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { useBills } from '../hooks/useBills';
import { searchCommitments, isSyncedBill, type AgendaCommitment } from '../services/agendaService';
import { extendMonthStream, monthKey, monthsBetween, shiftMonth, type ScrollDirection } from '../agenda/monthMath';
import { resolveScrollContainer, scrollContainerBy } from '../agenda/scrollContainer';
import { useInfiniteMonthScroll, type YearMonth } from '../agenda/useInfiniteMonthScroll';
import { useAgendaPaperTheme } from '../agenda/useAgendaPaperTheme';

import {
  AgendaHubProps,
  MONTHS,
  agendaPautaStyle,
  getInitialUpcomingLimit,
  MONTH_NAV_SUPPRESS_MS,
  measureCommitLines,
  tsToDate,
  withMonthInStream,
} from '../agenda/agendaTypes';
import { useAgendaAlarms } from '../agenda/useAgendaAlarms';
import { useAgendaOperations } from '../agenda/useAgendaOperations';

import AgendaNexusAssistant from './Agenda/AgendaNexusAssistant';
import AgendaCalendarModal from './Agenda/AgendaCalendarModal';
import AgendaAlarmModal from './Agenda/AgendaAlarmModal';
import AgendaDeleteModal from './Agenda/AgendaDeleteModal';
import AgendaShortcutModal from './Agenda/AgendaShortcutModal';
import AgendaUpcomingList from './Agenda/AgendaUpcomingList';
import AgendaWeekGrid from './Agenda/AgendaWeekGrid';
import AgendaSearchPanel from './Agenda/AgendaSearchPanel';
import AgendaSyncedBillsPanel from './Agenda/AgendaSyncedBillsPanel';
import { AgendaSyncBillsModal } from './Agenda/AgendaSyncBillsModal';
import AgendaDayRow, { EditingMeta } from './Agenda/AgendaDayRow';

const AgendaHub: React.FC<AgendaHubProps> = ({ onNavigate, seedCommitments }) => {
  const { user } = useAuth();
  const userId = user?.uid;
  const { addToast } = useToast();
  const { bills: recurringBills = [] } = useBills(userId);

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

  const [upcomingLimit, setUpcomingLimit] = useState<number>(() => getInitialUpcomingLimit());
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [showWeekFocus, setShowWeekFocus] = useState(false);
  const [showSyncedBills, setShowSyncedBills] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [highlightCommitmentId, setHighlightCommitmentId] = useState<string | null>(null);

  // Pesquisa por palavras-chave
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AgendaCommitment[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Nexus Assistant
  const [showAgendaNexus, setShowAgendaNexus] = useState(false);
  const nexusTriggerRef = useRef<HTMLButtonElement | null>(null);
  const nexusPanelRef = useRef<HTMLDivElement | null>(null);

  // Tema soberano independente da folha pautada
  const { resolvedTheme } = useTheme();
  const {
    resolvedPaperTheme,
    isPaperDark,
    togglePaperTheme,
  } = useAgendaPaperTheme(resolvedTheme);

  // Próximos personalizável
  const [customOpen, setCustomOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');

  // Inline editing & adding
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [addingDayKey, setAddingDayKey] = useState<string | null>(null);
  const [addText, setAddText] = useState('');
  const [editingMeta, setEditingMeta] = useState<EditingMeta | null>(null);

  // Calendário popover
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  // Atalho no celular
  const [showShortcutModal, setShowShortcutModal] = useState(false);
  const [isPinningShortcut, setIsPinningShortcut] = useState(false);

  // DOM Refs
  const notebookRef = useRef<HTMLDivElement | null>(null);
  const monthHeaderRef = useRef<HTMLDivElement | null>(null);
  const navTimersRef = useRef<number[]>([]);
  const pendingMonthNavRef = useRef<YearMonth | null>(null);
  const initialScrollDone = useRef(false);

  // Operações de CRUD e dados
  const {
    allMonths,
    setAllMonths,
    upcoming,
    initialLoading,
    loadError,
    setLoadError,
    isOnline,
    isSyncingQueue,
    isSyncingBills,
    dayMap,
    deleteConfirmTarget,
    setDeleteConfirmTarget,
    ensureMonthLoaded,
    loadUpcoming,
    reloadData,
    reloadAgendaAfterNexus,
    handleSyncBills,
    openDeleteConfirm,
    confirmDelete,
    handleToggle,
    commitEdit,
    commitAdd,
    shiftCommitment,
  } = useAgendaOperations({
    userId,
    seedCommitments,
    activeYear,
    activeMonth,
    upcomingLimit,
    recurringBills,
    addToast,
  });

  // Alarmes e permissões
  const {
    alarmTarget,
    setAlarmTarget,
    openAlarm,
    setAlarm,
    clearAlarm,
  } = useAgendaAlarms({
    userId,
    allMonths,
    reloadData,
    addToast,
    onNavigate,
  });

  // Timers cleanup
  useEffect(() => {
    const timers = navTimersRef.current;
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, []);

  // Pruning de meses distantes
  const pruneDistantMonths = useCallback((activeYear: number, activeMonth: number) => {
    setMonthStream((prev) => {
      const pruned = prev.filter(({ year, month }) => {
        const diff = monthsBetween(activeYear, activeMonth, year, month);
        return Math.abs(diff) <= 3;
      });
      if (pruned.length === prev.length) return prev;
      return pruned;
    });
    setAllMonths((prev) => {
      const keep: Record<string, AgendaCommitment[]> = {};
      for (let i = -3; i <= 3; i++) {
        const { year: ny, month: nm } = shiftMonth(activeYear, activeMonth, i);
        const key = monthKey(ny, nm);
        if (prev[key]) keep[key] = prev[key];
      }
      if (Object.keys(keep).length === Object.keys(prev).length) return prev;
      return keep;
    });
  }, [setAllMonths]);

  // Extensão atômica do stream
  const extendMonths = useCallback((direction: ScrollDirection, count: number) => {
    setMonthStream((prev) => extendMonthStream(prev, direction, count));
  }, []);

  const activeMonthObj = useMemo(
    () => ({ year: activeYear, month: activeMonth }),
    [activeYear, activeMonth]
  );

  const onActiveMonthChange = useCallback((next: YearMonth) => {
    setActiveYear(next.year);
    setActiveMonth(next.month);
  }, []);

  // Motor de infinite scroll
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

  // Medição de linhas de títulos quebrados
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
            ([id, ls]) => prev[id] && prev[id].length === ls.length && prev[id].every((ln, i) => ln === ls[i])
          );
        return same ? prev : nextLines;
      });
    };

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    measure();
    if (typeof document.fonts !== 'undefined') {
      document.fonts
        .ready.then(() => {
          if (!disposed) measure();
        })
        .catch(() => {});
    }
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [allMonths, monthStream]);

  // Scroll inicial para o dia de hoje
  useEffect(() => {
    if (initialLoading || initialScrollDone.current) return;
    if (activeYear !== today.getFullYear() || activeMonth !== today.getMonth()) return;
    const el = document.getElementById(`agenda-day-${activeYear}-${activeMonth}-${today.getDate()}`);
    if (el) {
      initialScrollDone.current = true;
      el.scrollIntoView({ block: 'center', behavior: 'auto' });
    }
  }, [initialLoading, activeYear, activeMonth, today]);

  // Sincronização de Deep Link Contextual
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const view = searchParams.get('view');
    const highlight = searchParams.get('highlight');
    const dateParam = searchParams.get('date');

    if (view === 'week') {
      setShowWeekFocus(true);
      setShowUpcoming(false);
      setShowSearch(false);
    }
    if (highlight) {
      setHighlightCommitmentId(highlight);
    }
    if (dateParam) {
      const parts = dateParam.split('-');
      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]) - 1;
        const d = Number(parts[2]);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          ensureMonthLoaded(y, m);
        }
      }
    }
  }, [searchParams, ensureMonthLoaded]);

  // Navegação para dia específico
  const goToDate = useCallback(
    (date: Date) => {
      const y = date.getFullYear();
      const m = date.getMonth();
      const d = date.getDate();
      suppressAutoExtendRef.current = true;
      ensureMonthLoaded(y, m);
      captureScrollAnchor();
      setMonthStream((prev) => withMonthInStream(prev, y, m));
      setActiveYear(y);
      setActiveMonth(m);
      const t1 = window.setTimeout(() => {
        document.getElementById(`agenda-day-${y}-${m}-${d}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        navTimersRef.current.push(
          window.setTimeout(() => {
            suppressAutoExtendRef.current = false;
          }, 2000)
        );
      }, 80);
      navTimersRef.current.push(t1);
    },
    [ensureMonthLoaded, captureScrollAnchor, suppressAutoExtendRef]
  );

  const goToday = useCallback(() => {
    const ty = today.getFullYear();
    const tm = today.getMonth();
    suppressAutoExtendRef.current = true;
    captureScrollAnchor();
    setMonthStream((prev) => {
      if (prev.some((m) => m.year === ty && m.month === tm)) return prev;
      return [{ year: ty, month: tm }, ...prev];
    });
    setActiveYear(ty);
    setActiveMonth(tm);
    const t1 = window.setTimeout(() => {
      const el = document.getElementById(`agenda-day-${ty}-${tm}-${today.getDate()}`);
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      navTimersRef.current.push(
        window.setTimeout(() => {
          suppressAutoExtendRef.current = false;
        }, 2000)
      );
    }, 80);
    navTimersRef.current.push(t1);
  }, [today, captureScrollAnchor, suppressAutoExtendRef]);

  // Scroll até a seção do mês
  const scrollToMonthSection = useCallback(
    (year: number, month: number): boolean => {
      const key = monthKey(year, month);
      const section = notebookRef.current?.querySelector<HTMLElement>(
        `[data-month-section="${key}"], [data-month-section="${year}-${month}"]`
      );
      if (!section) return false;

      const sc = resolveScrollContainer(notebookRef.current);
      const usefulTop = monthHeaderRef.current?.getBoundingClientRect().bottom ?? 0;
      scrollContainerBy(sc, section.getBoundingClientRect().top - usefulTop);
      return true;
    },
    [notebookRef, monthHeaderRef]
  );

  const navigateToMonth = useCallback(
    (year: number, month: number) => {
      suppressAutoExtendRef.current = true;
      navTimersRef.current.push(
        window.setTimeout(() => {
          suppressAutoExtendRef.current = false;
        }, MONTH_NAV_SUPPRESS_MS)
      );

      if (
        activeYear === year &&
        activeMonth === month &&
        monthStream.some((m) => m.year === year && m.month === month)
      ) {
        scrollToMonthSection(year, month);
        return;
      }

      ensureMonthLoaded(year, month);
      setMonthStream((prev) => withMonthInStream(prev, year, month));
      setActiveYear(year);
      setActiveMonth(month);
      pendingMonthNavRef.current = { year, month };
    },
    [activeYear, activeMonth, monthStream, ensureMonthLoaded, suppressAutoExtendRef, scrollToMonthSection]
  );

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

  // Calendário modal
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

  const pickCalendarDate = useCallback(
    (date: Date) => {
      goToDate(date);
      setCalendarOpen(false);
    },
    [goToDate]
  );

  // Próximos
  const applyUpcomingLimit = useCallback(
    (raw: number) => {
      const safe = Math.max(1, Math.min(Math.floor(raw), 50));
      setUpcomingLimit(safe);
      try {
        localStorage.setItem('fpi-agenda-proximos-limit', String(safe));
      } catch {
        /* ignore */
      }
      setShowUpcoming(true);
      setCustomOpen(false);
      loadUpcoming(safe);
    },
    [loadUpcoming]
  );

  const commitCustom = useCallback(() => {
    const n = Number(customInput.trim());
    if (Number.isFinite(n) && n >= 1) {
      applyUpcomingLimit(n);
    } else {
      setCustomOpen(false);
    }
  }, [customInput, applyUpcomingLimit]);

  const toggleUpcoming = useCallback(() => {
    setShowUpcoming((prev) => {
      const next = !prev;
      if (next) {
        setShowSearch(false);
        setShowWeekFocus(false);
        setShowSyncedBills(false);
      }
      return next;
    });
    loadUpcoming();
  }, [loadUpcoming]);

  const toggleSyncedBills = useCallback(() => {
    setShowSyncedBills((prev) => {
      const next = !prev;
      if (next) {
        setShowUpcoming(false);
        setShowWeekFocus(false);
        setShowSearch(false);
      }
      return next;
    });
  }, []);

  const handleSyncBillsAndOpen = useCallback(() => {
    setShowSyncModal(true);
  }, []);

  const handleConfirmSync = useCallback(
    async (chosenYear: number, chosenMonth: number) => {
      setShowSyncModal(false);
      await handleSyncBills(chosenYear, chosenMonth);
      if (chosenYear !== activeYear || chosenMonth !== activeMonth) {
        navigateToMonth(chosenYear, chosenMonth);
      }
      setShowSyncedBills(true);
      setShowUpcoming(false);
      setShowWeekFocus(false);
      setShowSearch(false);
    },
    [handleSyncBills, activeYear, activeMonth, navigateToMonth]
  );

  // Semana em Foco
  const weekCommitments = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 999);

    const map = new Map<string, AgendaCommitment>();
    Object.values(allMonths).forEach((list) => {
      list.forEach((c) => {
        if (c.id) map.set(c.id, c);
      });
    });
    upcoming.forEach((c) => {
      if (c.id) map.set(c.id, c);
    });

    const list = Array.from(map.values()).filter((c) => {
      const d = tsToDate(c.date);
      return d >= start && d <= end;
    });

    return list.sort((a, b) => tsToDate(a.date).getTime() - tsToDate(b.date).getTime());
  }, [allMonths, upcoming]);

  // Contas Sincronizadas do Mês Ativo
  const activeMonthKey = useMemo(() => monthKey(activeYear, activeMonth), [activeYear, activeMonth]);
  const activeMonthCommitments = useMemo(() => {
    return allMonths[activeMonthKey] || allMonths[`${activeYear}-${activeMonth}`] || [];
  }, [allMonths, activeMonthKey, activeYear, activeMonth]);

  const activeMonthSyncedCount = useMemo(() => {
    return activeMonthCommitments.filter(isSyncedBill).length;
  }, [activeMonthCommitments]);

  const handleFocusCommitment = useCallback(
    (c: AgendaCommitment) => {
      const targetDate = tsToDate(c.date);
      goToDate(targetDate);
      if (c.id) {
        setHighlightCommitmentId(c.id);
        window.setTimeout(() => {
          const el =
            document.querySelector(`[data-commit-id="${c.id}"]`) ||
            document.getElementById(`agenda-commitment-${c.id}`) ||
            document.getElementById(
              `agenda-day-${targetDate.getFullYear()}-${targetDate.getMonth()}-${targetDate.getDate()}`
            );
          el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 250);
        window.setTimeout(() => {
          setHighlightCommitmentId(null);
        }, 4500);
      }
      setShowWeekFocus(false);
      setShowUpcoming(false);
      setShowSearch(false);
      setShowSyncedBills(false);
    },
    [goToDate]
  );

  // Pesquisa
  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      const next = !prev;
      if (next) {
        setShowUpcoming(false);
        setShowWeekFocus(false);
        setShowSyncedBills(false);
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
      return next;
    });
  }, []);

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setSearchQuery('');
  }, []);

  const handleSelectSearchResult = useCallback(
    (c: AgendaCommitment) => {
      const targetDate = tsToDate(c.date);
      goToDate(targetDate);
      closeSearch();
    },
    [goToDate, closeSearch]
  );

  useEffect(() => {
    if (!showSearch) return;

    const queryClean = searchQuery.trim();
    if (!queryClean) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    let active = true;
    setIsSearching(true);

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchCommitments(userId || '', queryClean, allMonths);
        if (active) {
          setSearchResults(results);
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('[AgendaHub] Erro na pesquisa:', err);
      } finally {
        if (active) setIsSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery, showSearch, userId, allMonths]);

  useEffect(() => {
    if (!showSearch) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, closeSearch]);

  // Nexus Assistant
  const handleOpenNexus = useCallback(() => {
    setShowAgendaNexus(true);
  }, []);

  const handleCloseNexus = useCallback(() => {
    setShowAgendaNexus(false);
    requestAnimationFrame(() => nexusTriggerRef.current?.focus());
  }, []);

  const handleNexusTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      handleOpenNexus();
    },
    [handleOpenNexus]
  );

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

  // Atalho no celular
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

  // Divider entre meses
  function renderDivider(month: number, year: number) {
    return (
      <div key={`divider-${year}-${month}`} className="flex items-center gap-3 h-[28px] select-none">
        <div className={`flex-1 h-px ${isPaperDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${isPaperDark ? 'text-slate-500' : 'text-slate-400'}`}>
          {MONTHS[month]} {year}
        </span>
        <div className={`flex-1 h-px ${isPaperDark ? 'bg-slate-800' : 'bg-slate-200'}`} />
      </div>
    );
  }

  return (
    <>
      {!userId ? (
        <div className="max-w-4xl mx-auto px-4 pt-14 md:pt-6 pb-28 animate-in fade-in duration-500">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Faça login para usar a Agenda.</p>
        </div>
      ) : (
        <div className="w-full pb-28 bg-surface-canvas dark:bg-slate-950 min-h-full">
          {/* Cabeçalho da Agenda — Sticky soberano no topo */}
          <div
            ref={monthHeaderRef}
            data-testid="agenda-header"
            className="sticky top-0 z-40 isolate bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs"
          >
            <div className="w-full px-2.5 sm:px-5 md:px-6 grid grid-cols-[1fr_auto] md:grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-1.5 py-1.5 md:py-0 md:h-14">
              {/* Bloco 1 — Título & Ferramentas Inteligentes (Linha 1 no Mobile; Coluna 1 no Desktop) */}
              <div className="col-span-2 md:col-span-1 flex items-center justify-between md:justify-start gap-1.5 sm:gap-2 min-w-0 md:order-1">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
                  <h1 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5 shrink-0">
                    <CalendarDays size={18} className="text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>Agenda</span>
                  </h1>
                  {!isOnline && (
                    <span
                      data-testid="agenda-offline-badge"
                      title="Modo Offline: Seus compromissos continuam salvos no aparelho."
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 shadow-xs shrink-0"
                    >
                      <WifiOff size={11} className="text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="hidden md:inline">Offline</span>
                    </span>
                  )}
                  {isSyncingQueue && (
                    <span
                      data-testid="agenda-syncing-badge"
                      title="Sincronizando compromissos com a nuvem..."
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 shadow-xs shrink-0"
                    >
                      <RefreshCw size={11} className="animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
                    </span>
                  )}
                </div>

                <div className="hidden lg:block h-4 w-px bg-slate-200 dark:bg-slate-800 mx-0.5 shrink-0" aria-hidden="true" />

                <div className="flex items-center gap-1 shrink-0">
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
                    className="relative inline-flex cursor-pointer items-center gap-1 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 sm:py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300 shadow-xs transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 active:scale-95 shrink-0"
                  >
                    <Sparkles size={13} aria-hidden="true" className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>Nexus</span>
                  </button>
                  {userId && (
                    <button
                      type="button"
                      onClick={handleSyncBillsAndOpen}
                      disabled={isSyncingBills}
                      aria-label="Sincronizar contas do Controla"
                      title="Sincronizar contas do Controla para este mês"
                      data-testid="agenda-sync-bills"
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 sm:px-2 sm:py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      <RefreshCw size={12} className={isSyncingBills ? 'animate-spin text-sky-600' : 'text-slate-500 dark:text-slate-400'} />
                      <span className="hidden sm:inline">Sincronizar</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowShortcutModal(true)}
                    aria-label="Atalho da Agenda no celular"
                    title="Criar atalho da Agenda na tela do celular"
                    data-testid="agenda-shortcut-trigger"
                    className="md:hidden inline-flex items-center gap-1 rounded-xl border border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/40 p-1.5 sm:px-2 sm:py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 shadow-xs transition hover:bg-sky-100 dark:hover:bg-sky-900/50 active:scale-95 shrink-0"
                  >
                    <Smartphone size={13} className="text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="hidden sm:inline">Atalho</span>
                  </button>
                </div>
              </div>

              {/* Bloco 2 — Navegação de mês (Linha 2 Coluna 1 no Mobile; Coluna Central no Desktop) */}
              <div className="justify-self-start sm:justify-self-center flex items-center md:order-2 w-auto py-0.5 md:py-0 shrink-0">
                <div className="inline-flex items-center gap-0.5 bg-slate-50/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/90 rounded-2xl p-0.5 shadow-2xs">
                  <button
                    onClick={goPrevMonth}
                    className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 shrink-0 active:scale-95"
                    aria-label="Mês anterior"
                    data-testid="agenda-prev-month"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span
                    data-testid="agenda-month-label"
                    aria-live="polite"
                    className="text-[11px] sm:text-xs md:text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight text-center px-1 sm:px-2 whitespace-nowrap min-w-[76px] sm:min-w-[125px]"
                  >
                    <time dateTime={`${activeYear}-${String(activeMonth + 1).padStart(2, '0')}`}>
                      {MONTHS[activeMonth]} {activeYear}
                    </time>
                  </span>
                  <button
                    onClick={goNextMonth}
                    className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs rounded-xl transition-all text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 shrink-0 active:scale-95"
                    aria-label="Próximo mês"
                    data-testid="agenda-next-month"
                  >
                    <ChevronRight size={15} />
                  </button>
                  <div className="h-3 sm:h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" aria-hidden="true" />
                  <button
                    onClick={openCalendar}
                    className="p-1 sm:p-1.5 hover:bg-white dark:hover:bg-slate-700 hover:shadow-2xs rounded-xl transition-all text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 shrink-0 active:scale-95"
                    aria-label="Ir para data"
                    title="Ir para data"
                    data-testid="agenda-open-calendar-header"
                  >
                    <CalendarDays size={15} />
                  </button>
                </div>
              </div>

              {/* Bloco 3 — Visões e Filtros (Linha 2 Coluna 2 no Mobile; Coluna 3 à direita no Desktop) */}
              <div className="justify-self-end flex items-center gap-1 sm:gap-1.5 shrink-0 md:order-3">
                {userId && (
                  <button
                    type="button"
                    onClick={goToday}
                    aria-label="Ir para hoje"
                    title="Ir para hoje"
                    data-testid="agenda-hoje"
                    className="bg-sky-500 text-white px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl shadow-xs hover:bg-sky-600 transition-all active:scale-95 text-[11px] sm:text-xs font-black shrink-0 tracking-wide"
                  >
                    HOJE
                  </button>
                )}
                {userId && (
                  <button
                    type="button"
                    onClick={toggleSyncedBills}
                    data-testid="agenda-synced-bills-toggle"
                    className={`inline-flex items-center gap-1 rounded-xl border p-1 sm:px-2.5 sm:py-1.5 text-xs font-bold shadow-xs transition active:scale-95 shrink-0 ${
                      showSyncedBills
                        ? 'border-sky-500 bg-sky-500 text-white hover:bg-sky-600'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    title="Ver apenas contas sincronizadas do Controla neste mês"
                  >
                    <RefreshCw size={12} className={showSyncedBills ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                    <span className="hidden sm:inline">Contas</span>
                    {activeMonthSyncedCount > 0 && (
                      <span
                        className={`inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black ${
                          showSyncedBills
                            ? 'bg-white text-sky-700'
                            : 'bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300'
                        }`}
                      >
                        {activeMonthSyncedCount}
                      </span>
                    )}
                  </button>
                )}
                <button
                  onClick={toggleUpcoming}
                  data-testid="agenda-proximos-toggle"
                  className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl shadow-xs transition-all active:scale-95 text-[11px] sm:text-xs font-bold shrink-0 ${
                    showUpcoming
                      ? 'bg-sky-600 text-white'
                      : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Próximos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWeekFocus((v) => !v);
                    setShowUpcoming(false);
                    setShowSearch(false);
                    setShowSyncedBills(false);
                  }}
                  data-testid="agenda-week-toggle"
                  className={`inline-flex items-center gap-1 rounded-xl border p-1 sm:px-2.5 sm:py-1.5 text-xs font-bold shadow-xs transition active:scale-95 shrink-0 ${
                    showWeekFocus
                      ? 'border-sky-500 bg-sky-500 text-white hover:bg-sky-600'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                  title="Ver compromissos dos próximos 7 dias"
                >
                  <CalendarDays size={13} className={showWeekFocus ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                  <span className="hidden sm:inline">Semana</span>
                </button>
                <button
                  type="button"
                  onClick={toggleSearch}
                  aria-label="Pesquisar compromissos"
                  title="Pesquisar compromissos por palavra-chave"
                  data-testid="agenda-search-trigger"
                  className={`inline-flex items-center gap-1 rounded-xl border p-1 sm:px-2.5 sm:py-1.5 text-xs font-bold shadow-xs transition active:scale-95 shrink-0 ${
                    showSearch
                      ? 'border-sky-500 bg-sky-500 text-white hover:bg-sky-600'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Search size={13} className={showSearch ? 'text-white' : 'text-slate-500 dark:text-slate-400'} />
                  <span className="hidden sm:inline">Pesquisar</span>
                </button>
                <button
                  type="button"
                  onClick={togglePaperTheme}
                  aria-label={isPaperDark ? 'Mudar folha para tema claro' : 'Mudar folha para tema escuro'}
                  title={isPaperDark ? 'Folha pautada: Escura (toque para folha clara)' : 'Folha pautada: Clara (toque para folha escura)'}
                  data-testid="agenda-paper-theme-toggle"
                  data-paper-theme={resolvedPaperTheme}
                  className="inline-flex items-center gap-1 rounded-xl border p-1 sm:px-2.5 sm:py-1.5 text-xs font-bold shadow-xs transition active:scale-95 shrink-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {isPaperDark ? (
                    <Sun size={13} className="text-amber-500 shrink-0" />
                  ) : (
                    <Moon size={13} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                  )}
                  <span className="hidden sm:inline">
                    {isPaperDark ? 'Folha Clara' : 'Folha Escura'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Folha do Caderno e Painéis */}
          <div className="max-w-4xl mx-auto px-2 sm:px-4 pt-4">
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
                className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-900/40 dark:bg-slate-950/70 p-4 pt-[calc(4rem+env(safe-area-inset-top)+1rem)] backdrop-blur-sm md:items-center md:pt-4"
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

            {showSearch ? (
              <AgendaSearchPanel
                show={showSearch}
                searchQuery={searchQuery}
                isSearching={isSearching}
                searchResults={searchResults}
                searchInputRef={searchInputRef}
                onClose={closeSearch}
                onChangeQuery={setSearchQuery}
                onClearQuery={() => setSearchQuery('')}
                onSelectResult={handleSelectSearchResult}
                onToggleCommitment={handleToggle}
                onOpenDeleteConfirm={openDeleteConfirm}
              />
            ) : showWeekFocus ? (
              <AgendaWeekGrid
                show={showWeekFocus}
                weekCommitments={weekCommitments}
                highlightCommitmentId={highlightCommitmentId}
                onClose={() => setShowWeekFocus(false)}
                onToggleCommitment={handleToggle}
                onFocusCommitment={handleFocusCommitment}
              />
            ) : showUpcoming ? (
              <AgendaUpcomingList
                show={showUpcoming}
                upcoming={upcoming}
                upcomingLimit={upcomingLimit}
                customOpen={customOpen}
                customInput={customInput}
                onClose={() => setShowUpcoming(false)}
                onApplyLimit={applyUpcomingLimit}
                onSetCustomOpen={setCustomOpen}
                onSetCustomInput={setCustomInput}
                onCommitCustom={commitCustom}
                onToggleCommitment={handleToggle}
                onOpenDeleteConfirm={openDeleteConfirm}
              />
            ) : showSyncedBills ? (
              <AgendaSyncedBillsPanel
                show={showSyncedBills}
                activeYear={activeYear}
                activeMonth={activeMonth}
                commitments={activeMonthCommitments}
                recurringBills={recurringBills}
                isSyncing={isSyncingBills}
                onClose={() => setShowSyncedBills(false)}
                onToggleCommitment={handleToggle}
                onFocusCommitment={handleFocusCommitment}
                onSyncAgain={handleSyncBillsAndOpen}
                onOpenDeleteConfirm={openDeleteConfirm}
              />
            ) : (
              <div
                ref={notebookRef}
                data-testid="agenda-notebook-container"
                data-agenda-paper={resolvedPaperTheme}
                className={`${
                  isPaperDark
                    ? 'bg-slate-900 border-slate-800 shadow-none'
                    : 'bg-white border-slate-200/90 shadow-card'
                } rounded-2xl border overflow-hidden relative -mt-2 transition-colors duration-200`}
              >
                <div className="relative">
                  <div
                    className="relative pl-2 pr-2 sm:pl-4 sm:pr-4"
                    data-notebook-content
                    style={{
                      ...agendaPautaStyle,
                      '--agenda-pauta-color': isPaperDark ? 'rgba(56, 189, 248, 0.18)' : '#7dd3fc',
                      overflowAnchor: 'auto',
                    } as React.CSSProperties}
                  >
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
                              {days.map((day) => (
                                <AgendaDayRow
                                  key={`${year}-${month}-${day}`}
                                  day={day}
                                  month={month}
                                  year={year}
                                  today={today}
                                  commitments={dayMap.get(`${year}-${month}-${day}`) || []}
                                  commitLines={commitLines}
                                  editingId={editingId}
                                  editText={editText}
                                  editingMeta={editingMeta}
                                  addingDayKey={addingDayKey}
                                  addText={addText}
                                  highlightCommitmentId={highlightCommitmentId}
                                  isPaperDark={isPaperDark}
                                  onStartEdit={(c, date, dayKey, index, totalInDay) => {
                                    setEditingId(c.id ?? null);
                                    setEditText(c.title);
                                    setEditingMeta({ commitment: c, date, dayKey, index, totalInDay });
                                  }}
                                  onCancelEdit={() => {
                                    setEditingId(null);
                                    setEditingMeta(null);
                                    setEditText('');
                                  }}
                                  onCommitEdit={(id) => {
                                    commitEdit(id, editText);
                                    setEditingId(null);
                                    setEditingMeta(null);
                                    setEditText('');
                                  }}
                                  onChangeEditText={setEditText}
                                  onStartAdd={(dayKey) => {
                                    setAddingDayKey(dayKey);
                                    setAddText('');
                                  }}
                                  onCancelAdd={() => {
                                    setAddingDayKey(null);
                                    setAddText('');
                                  }}
                                  onCommitAdd={(dateObj) => {
                                    commitAdd(dateObj, addText);
                                    setAddingDayKey(null);
                                    setAddText('');
                                  }}
                                  onChangeAddText={setAddText}
                                  onToggleCommitment={handleToggle}
                                  onOpenAlarm={openAlarm}
                                  onOpenDeleteConfirm={openDeleteConfirm}
                                  onShiftCommitment={shiftCommitment}
                                  onSetEditingMeta={setEditingMeta}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Popovers e Modais */}
      <AgendaAlarmModal
        target={alarmTarget}
        onClose={() => setAlarmTarget(null)}
        onSetAlarm={setAlarm}
        onClearAlarm={clearAlarm}
      />

      <AgendaCalendarModal
        open={calendarOpen}
        calYear={calYear}
        calMonth={calMonth}
        today={today}
        dayMap={dayMap}
        onClose={() => setCalendarOpen(false)}
        onPrevMonth={calGoPrev}
        onNextMonth={calGoNext}
        onSelectDate={pickCalendarDate}
        onGoToday={goToday}
      />

      {loadError && (
        <div className="fixed bottom-24 right-6 z-50 bg-red-500 text-white px-4 py-2.5 rounded-xl shadow-lg font-bold text-sm flex items-center gap-2">
          <span>Erro ao carregar dados</span>
          <button
            onClick={() => {
              setLoadError(false);
              reloadData();
            }}
            className="underline font-black"
          >
            Tentar novamente
          </button>
        </div>
      )}

      <AgendaDeleteModal
        target={deleteConfirmTarget}
        onClose={() => setDeleteConfirmTarget(null)}
        onConfirm={confirmDelete}
      />

      <AgendaShortcutModal
        open={showShortcutModal}
        isPinning={isPinningShortcut}
        onClose={() => setShowShortcutModal(false)}
        onRequestShortcut={handleRequestShortcut}
      />

      <AgendaSyncBillsModal
        open={showSyncModal}
        initialYear={activeYear}
        initialMonth={activeMonth}
        recurringBills={recurringBills}
        allMonths={allMonths}
        isSyncing={isSyncingBills}
        onClose={() => setShowSyncModal(false)}
        onConfirmSync={handleConfirmSync}
      />
    </>
  );
};

export { AgendaHub };
export default AgendaHub;
export { pickActiveMonth } from '../agenda/activeMonth';
export { isProbeInterlocked, nextExtendDelay, resolveFlushDirection, getExtendBuffer } from '../agenda/useInfiniteMonthScroll';
