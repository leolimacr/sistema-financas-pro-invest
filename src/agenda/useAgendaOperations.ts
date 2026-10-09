import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { AgendaCommitment } from '../services/agendaService';
import {
  fetchMonthCommitments,
  fetchUpcomingCommitments,
  addCommitment,
  updateCommitment,
  deleteCommitment,
  toggleCommitment,
  reorderDayCommitments,
  syncBillsToAgenda,
} from '../services/agendaService';
import { loadMonthCache, clearUserAgendaCache } from './agendaCache';
import { processAgendaSyncQueue } from './agendaSyncQueue';
import {
  compareDayCommitments,
  moveCommitment,
  nextOrderForDay,
  replaceDayInMonth,
} from './dayOrder';
import { shiftMonth } from './monthMath';
import { tsToDate, groupSeedByMonth, MONTHS } from './agendaTypes';

export interface UseAgendaOperationsParams {
  userId?: string;
  seedCommitments?: AgendaCommitment[];
  activeYear: number;
  activeMonth: number;
  upcomingLimit: number;
  recurringBills: any[];
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function useAgendaOperations({
  userId,
  seedCommitments,
  activeYear,
  activeMonth,
  upcomingLimit,
  recurringBills,
  addToast,
}: UseAgendaOperationsParams) {
  const [allMonths, setAllMonths] = useState<Record<string, AgendaCommitment[]>>(() =>
    groupSeedByMonth(seedCommitments)
  );
  const [upcoming, setUpcoming] = useState<AgendaCommitment[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [isSyncingBills, setIsSyncingBills] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; title: string } | null>(null);

  const loadedKeysRef = useRef<Set<string>>(new Set());
  const initialLoadingRef = useRef(true);
  const isSavingRef = useRef(false);
  const upcomingLimitRef = useRef(upcomingLimit);
  upcomingLimitRef.current = upcomingLimit;

  // --- Loading de dados com Cache Local Soberano ---
  const ensureMonthLoaded = useCallback(
    async (year: number, month: number, force?: boolean) => {
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
        if (import.meta.env.DEV)
          console.log(`[Agenda] ensureMonthLoaded ${key} force=${force} → ${data.length} itens`);
        setAllMonths((prev) => {
          const n = prev[key]?.length ?? 0;
          if (import.meta.env.DEV && n !== data.length)
            console.log(`[Agenda] setAllMonths ${key}: ${n}→${data.length}`);
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
    },
    [userId, seedCommitments]
  );

  const loadUpcoming = useCallback(
    async (limit?: number) => {
      if (seedCommitments) {
        setUpcoming([]);
        return;
      }
      if (!userId) return;
      try {
        const data = await fetchUpcomingCommitments(userId, limit ?? upcomingLimitRef.current);
        setUpcoming(data);
      } catch (e) {
        if (import.meta.env.DEV)
          console.warn('[Agenda] Falha ao carregar próximos compromissos', e);
        setLoadError(true);
        setUpcoming([]);
      }
    },
    [userId, seedCommitments]
  );

  const reloadData = useCallback(() => {
    if (!userId) return;
    const offsets = [-1, 0, 1];
    Promise.all(
      offsets.map((offset) => {
        const { year: ny, month: nm } = shiftMonth(activeYear, activeMonth, offset);
        return ensureMonthLoaded(ny, nm, true);
      })
    );
    loadUpcoming();
  }, [userId, activeYear, activeMonth, ensureMonthLoaded, loadUpcoming]);

  const reloadAgendaAfterNexus = useCallback(() => {
    if (userId) {
      clearUserAgendaCache(userId);
    }
    reloadData();
  }, [userId, reloadData]);

  const handleSyncBills = useCallback(
    async (targetYear?: number, targetMonth?: number): Promise<number> => {
      if (!userId) return 0;
      const y = targetYear ?? activeYear;
      const m = targetMonth ?? activeMonth;
      if (!recurringBills || recurringBills.length === 0) {
        addToast('Nenhuma conta fixa ativa encontrada no Controla.', 'info');
        return 0;
      }
      setIsSyncingBills(true);
      try {
        const count = await syncBillsToAgenda(userId, recurringBills, y, m);
        const monthLabel = `${MONTHS[m]} de ${y}`;
        if (count > 0) {
          addToast(
            `${count} ${count === 1 ? 'conta sincronizada' : 'contas sincronizadas'} em ${monthLabel}!`,
            'success'
          );
          try {
            await ensureMonthLoaded(y, m, true);
            await loadUpcoming(upcomingLimitRef.current);
          } catch (refreshErr) {
            console.warn('[Agenda] Aviso ao recarregar lista após sync:', refreshErr);
          }
        } else {
          addToast(`Todas as contas de ${monthLabel} já estão sincronizadas na Agenda.`, 'info');
        }
        return count;
      } catch (e) {
        console.error('[Agenda] Erro ao sincronizar contas:', e);
        addToast('Erro ao sincronizar contas com a Agenda.', 'error');
        return 0;
      } finally {
        setIsSyncingBills(false);
      }
    },
    [userId, recurringBills, activeYear, activeMonth, ensureMonthLoaded, loadUpcoming, addToast]
  );

  // Carrega dados APENAS para activeMonth ± 1 (lazy)
  useEffect(() => {
    if (!userId) return;
    const offsets = [-1, 0, 1];
    Promise.all(
      offsets.map((offset) => {
        const { year: ny, month: nm } = shiftMonth(activeYear, activeMonth, offset);
        return ensureMonthLoaded(ny, nm);
      })
    ).finally(() => {
      if (initialLoadingRef.current) {
        initialLoadingRef.current = false;
        setInitialLoading(false);
      }
    });
    loadUpcoming();
  }, [activeYear, activeMonth, userId, ensureMonthLoaded, loadUpcoming]);

  // Monitoramento de conectividade e sincronização da fila offline
  const reloadDataRef = useRef(reloadData);
  reloadDataRef.current = reloadData;
  const addToastRef = useRef(addToast);
  addToastRef.current = addToast;

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

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        void syncPendingQueue();
      }, 800);
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.onLine && userId) {
      void syncPendingQueue();
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId]);

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

  // --- CRUD Handlers ---
  const handleDelete = useCallback(
    async (id: string) => {
      if (!userId) return;
      try {
        await deleteCommitment(userId, id, { year: activeYear, month: activeMonth });
        reloadData();
      } catch (e) {
        if (import.meta.env.DEV) console.error('[Agenda] Erro ao excluir', e);
        addToast('Não foi possível excluir o compromisso', 'error');
      }
    },
    [userId, activeYear, activeMonth, reloadData, addToast]
  );

  const openDeleteConfirm = useCallback((id: string, title: string) => {
    setDeleteConfirmTarget({ id, title: title ?? '' });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!userId || !deleteConfirmTarget) return;
    try {
      await deleteCommitment(userId, deleteConfirmTarget.id, {
        year: activeYear,
        month: activeMonth,
      });
      reloadData();
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Agenda] Erro ao excluir', e);
      addToast('Não foi possível excluir o compromisso', 'error');
    } finally {
      setDeleteConfirmTarget(null);
    }
  }, [userId, deleteConfirmTarget, activeYear, activeMonth, reloadData, addToast]);

  const handleToggle = useCallback(
    async (id: string, completed: boolean) => {
      if (!userId) return;
      try {
        await toggleCommitment(userId, id, completed, { year: activeYear, month: activeMonth });
        reloadData();
      } catch (e) {
        if (import.meta.env.DEV) console.error('[Agenda] Erro ao marcar/desmarcar', e);
        addToast('Erro ao atualizar status', 'error');
      }
    },
    [userId, activeYear, activeMonth, reloadData, addToast]
  );

  const commitEdit = useCallback(
    async (id: string, text: string) => {
      if (!userId) return;
      const cleanText = text.trim();
      if (!cleanText) {
        await handleDelete(id);
      } else {
        try {
          await updateCommitment(
            userId,
            id,
            { title: cleanText },
            { year: activeYear, month: activeMonth }
          );
          reloadData();
        } catch (e) {
          if (import.meta.env.DEV) console.error('[Agenda] Erro ao editar', e);
          addToast('Não foi possível salvar a alteração', 'error');
        }
      }
    },
    [userId, activeYear, activeMonth, reloadData, handleDelete, addToast]
  );

  const commitAdd = useCallback(
    async (dateObj: Date, text: string) => {
      if (!userId) return;
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      try {
        const cleanText = text.trim();
        if (cleanText) {
          const dayKey = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}`;
          const dayItems = dayMap.get(dayKey) || [];
          const nextOrder = nextOrderForDay(dayItems);

          const docRefId = await addCommitment(userId, {
            date: dateObj,
            title: cleanText,
            completed: false,
            order: nextOrder,
          });

          const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}`;
          const optimisticCommitment = {
            id: docRefId,
            date: dateObj,
            title: cleanText,
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
      } catch (e) {
        if (import.meta.env.DEV) console.error('[Agenda] Erro ao adicionar', e);
        addToast('Não foi possível adicionar o compromisso', 'error');
      } finally {
        isSavingRef.current = false;
      }
    },
    [userId, dayMap, addToast]
  );

  const shiftCommitment = useCallback(
    (dayKey: string, fromIndex: number, toIndex: number) => {
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
        .filter(
          (c): c is AgendaCommitment & { id: string; order: number } =>
            typeof c.id === 'string' && typeof c.order === 'number'
        )
        .map((c) => ({ id: c.id, order: c.order }));

      reorderDayCommitments(userId, payload, { year: Number(yStr), month: Number(mStr) }).catch(
        (err) => {
          if (import.meta.env.DEV) console.error('[Agenda] Erro ao persistir reordenação', err);
          addToast('Não foi possível salvar a nova ordem dos compromissos', 'error');
          reloadData();
        }
      );
    },
    [dayMap, seedCommitments, userId, addToast, reloadData]
  );

  return {
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
    handleDelete,
    openDeleteConfirm,
    confirmDelete,
    handleToggle,
    commitEdit,
    commitAdd,
    shiftCommitment,
  };
}
