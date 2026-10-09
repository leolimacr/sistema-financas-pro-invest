import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { RecurringBill } from '../../types';
import type { AgendaCommitment } from '../../services/agendaService';
import { isSyncedBill } from '../../services/agendaService';
import { MONTHS, type YearMonth } from '../../agenda/agendaTypes';
import { shiftMonth } from '../../agenda/monthMath';

export interface AgendaSyncBillsModalProps {
  open: boolean;
  initialYear: number;
  initialMonth: number;
  recurringBills: RecurringBill[];
  allMonths: Record<string, AgendaCommitment[]>;
  isSyncing: boolean;
  onClose: () => void;
  onConfirmSync: (year: number, month: number) => Promise<void> | void;
}

export const AgendaSyncBillsModal: React.FC<AgendaSyncBillsModalProps> = ({
  open,
  initialYear,
  initialMonth,
  recurringBills,
  allMonths,
  isSyncing,
  onClose,
  onConfirmSync,
}) => {
  const today = useMemo(() => new Date(), []);
  const currentCalYear = today.getFullYear();
  const currentCalMonth = today.getMonth();

  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);

  // Sincroniza o estado interno sempre que o modal for aberto
  useEffect(() => {
    if (open) {
      setSelectedYear(initialYear);
      setSelectedMonth(initialMonth);
    }
  }, [open, initialYear, initialMonth]);

  // Contas fixas ativas no Controla
  const activeBills = useMemo(() => {
    return recurringBills.filter((b) => b && b.isActive !== false);
  }, [recurringBills]);

  // Contas já sincronizadas no mês selecionado
  const monthKey = `${selectedYear}-${selectedMonth}`;
  const existingMonthCommitments = useMemo(() => {
    return allMonths[monthKey] || allMonths[`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`] || [];
  }, [allMonths, monthKey, selectedYear, selectedMonth]);

  const alreadySyncedCount = useMemo(() => {
    return existingMonthCommitments.filter(isSyncedBill).length;
  }, [existingMonthCommitments]);

  // Próximo mês a partir do relógio atual
  const nextMonthObj = useMemo(() => {
    return shiftMonth(currentCalYear, currentCalMonth, 1);
  }, [currentCalYear, currentCalMonth]);

  const isCurrentMonthSelected =
    selectedYear === currentCalYear && selectedMonth === currentCalMonth;
  const isNextMonthSelected =
    selectedYear === nextMonthObj.year && selectedMonth === nextMonthObj.month;

  const handlePrevMonth = () => {
    const prev = shiftMonth(selectedYear, selectedMonth, -1);
    setSelectedYear(prev.year);
    setSelectedMonth(prev.month);
  };

  const handleNextMonth = () => {
    const next = shiftMonth(selectedYear, selectedMonth, 1);
    setSelectedYear(next.year);
    setSelectedMonth(next.month);
  };

  const handleSelectCurrentMonth = () => {
    setSelectedYear(currentCalYear);
    setSelectedMonth(currentCalMonth);
  };

  const handleSelectNextMonth = () => {
    setSelectedYear(nextMonthObj.year);
    setSelectedMonth(nextMonthObj.month);
  };

  const handleConfirm = async () => {
    await onConfirmSync(selectedYear, selectedMonth);
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-modal-title"
      data-testid="agenda-sync-bills-modal"
      className="fixed inset-0 z-[120] bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo / Cabeçalho do Modal */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 shadow-xs">
              <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            </div>
            <div>
              <h2
                id="sync-modal-title"
                className="text-base font-black text-slate-900 dark:text-slate-100 tracking-tight"
              >
                Sincronizar Contas
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Escolha o mês para importar suas contas fixas do Controla
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Atalhos Rápidos de Escolha */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Atalhos Rápidos
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleSelectCurrentMonth}
              data-testid="sync-select-current-month"
              className={`p-2.5 rounded-2xl text-left border text-xs font-bold transition-all flex flex-col justify-between gap-1 ${
                isCurrentMonthSelected
                  ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Mês Atual
              </span>
              <span className="font-black text-sm">
                {MONTHS[currentCalMonth]} {currentCalYear}
              </span>
            </button>

            <button
              type="button"
              onClick={handleSelectNextMonth}
              data-testid="sync-select-next-month"
              className={`p-2.5 rounded-2xl text-left border text-xs font-bold transition-all flex flex-col justify-between gap-1 ${
                isNextMonthSelected
                  ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Próximo Mês
              </span>
              <span className="font-black text-sm">
                {MONTHS[nextMonthObj.month]} {nextMonthObj.year}
              </span>
            </button>
          </div>
        </div>

        {/* Seletor Mês a Mês Personalizado */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Ou navegue para outro mês
          </label>
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Mês anterior"
              data-testid="sync-month-prev"
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition text-slate-600 dark:text-slate-300 hover:text-slate-900 active:scale-95"
            >
              <ChevronLeft size={18} />
            </button>

            <div className="text-center px-2">
              <span
                data-testid="sync-selected-month-label"
                className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight"
              >
                {MONTHS[selectedMonth]} {selectedYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Próximo mês"
              data-testid="sync-month-next"
              className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition text-slate-600 dark:text-slate-300 hover:text-slate-900 active:scale-95"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Card Informativo com Resumo do Impacto */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-700 dark:text-slate-200 font-bold">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} className="text-sky-600 dark:text-sky-400" />
              Contas ativas no Controla:
            </span>
            <span className="font-black text-sm">{activeBills.length}</span>
          </div>

          {alreadySyncedCount > 0 && (
            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400" />
                Já sincronizadas em {MONTHS[selectedMonth]}:
              </span>
              <span className="font-bold">{alreadySyncedCount}</span>
            </div>
          )}

          <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Ao confirmar, as contas fixas serão agendadas nos dias exatos de vencimento em{' '}
            <strong className="text-slate-800 dark:text-slate-200 font-bold">
              {MONTHS[selectedMonth]} de {selectedYear}
            </strong>
            . Compromissos já existentes não serão duplicados.
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSyncing || activeBills.length === 0}
            data-testid="sync-confirm-button"
            className="flex-[2] py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black uppercase tracking-wider shadow-sm transition flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Sincronizando...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                <span>Sincronizar {MONTHS[selectedMonth]}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
