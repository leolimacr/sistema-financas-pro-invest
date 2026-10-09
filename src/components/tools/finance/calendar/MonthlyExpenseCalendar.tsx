import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingDown,
  LayoutGrid,
  List,
  Receipt,
} from 'lucide-react';
import type { Transaction } from '../../../../types';
import {
  getCalendarGridDays,
  computeDailyExpenseMap,
  formatDayExpenseAmount,
  formatMobileExpenseAmount,
  formatCalendarFullDate,
  getWeekdayNameFromIso,
  WEEKDAY_LABELS_SHORT,
} from '../../../../utils/expenseCalendarUtils';
import { shiftMonthKey, formatMonthLabel, getCurrentMonthKey } from '../../../../services/dashboardService';
import DayExpensesModal from './DayExpensesModal';

interface MonthlyExpenseCalendarProps {
  transactions: Transaction[];
  initialMonthKey?: string;
  onMonthChange?: (monthKey: string) => void;
  onEditTransaction?: (t: Transaction) => void;
  onOpenForm?: (initialData?: Partial<Transaction>) => void;
  isPrivacyMode?: boolean;
  userCardNames?: string[];
}

export const MonthlyExpenseCalendar: React.FC<MonthlyExpenseCalendarProps> = ({
  transactions,
  initialMonthKey,
  onMonthChange,
  onEditTransaction,
  onOpenForm,
  isPrivacyMode = false,
  userCardNames,
}) => {
  // Mês ativo exibido no calendário (ex: '2026-09')
  const [activeMonthKey, setActiveMonthKey] = useState<string>(() => {
    return initialMonthKey || getCurrentMonthKey();
  });

  // Dia selecionado para abertura do modal de detalhamento
  const [selectedDayIso, setSelectedDayIso] = useState<string | null>(null);

  // Modo de visualização mobile: 'grid' (grade do mês) ou 'agenda' (lista diária)
  const [mobileViewMode, setMobileViewMode] = useState<'grid' | 'agenda'>('grid');

  const [currentYear, currentMonth] = useMemo(() => {
    const [y, m] = activeMonthKey.split('-').map(Number);
    return [y || new Date().getFullYear(), m || new Date().getMonth() + 1];
  }, [activeMonthKey]);

  // Células da grade mensal (35 ou 42 dias)
  const gridCells = useMemo(() => {
    return getCalendarGridDays(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Agrupamento contábil soberano das saídas/despesas do mês
  const expenseSummary = useMemo(() => {
    return computeDailyExpenseMap(transactions, activeMonthKey, userCardNames);
  }, [transactions, activeMonthKey, userCardNames]);

  // Lista ordenada cronologicamente dos dias com saídas para a visão Agenda (mobile)
  const daysWithExpensesList = useMemo(() => {
    return Array.from(expenseSummary.dailyMap.values()).sort((a, b) =>
      a.dateIso.localeCompare(b.dateIso)
    );
  }, [expenseSummary.dailyMap]);

  // Navegação de meses
  const handlePrevMonth = useCallback(() => {
    const prevKey = shiftMonthKey(activeMonthKey, -1);
    setActiveMonthKey(prevKey);
    onMonthChange?.(prevKey);
  }, [activeMonthKey, onMonthChange]);

  const handleNextMonth = useCallback(() => {
    const nextKey = shiftMonthKey(activeMonthKey, 1);
    setActiveMonthKey(nextKey);
    onMonthChange?.(nextKey);
  }, [activeMonthKey, onMonthChange]);

  const handleGoCurrentMonth = useCallback(() => {
    const nowKey = getCurrentMonthKey();
    setActiveMonthKey(nowKey);
    onMonthChange?.(nowKey);
  }, [onMonthChange]);

  const isCurrentMonthNow = activeMonthKey === getCurrentMonthKey();

  // Dados do dia aberto no modal
  const selectedDayData = useMemo(() => {
    if (!selectedDayIso) return { transactions: [], total: 0 };
    const daySummary = expenseSummary.dailyMap.get(selectedDayIso);
    return {
      transactions: daySummary?.transactions || [],
      total: daySummary?.totalAmount || 0,
    };
  }, [selectedDayIso, expenseSummary.dailyMap]);

  return (
    <div className="bg-surface-primary dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden p-3.5 sm:p-6 space-y-4">
      {/* 1. Header de Navegação Superior (Mês, Ano, Setas e Resumo de Saídas) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {/* Seta Mês Anterior */}
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Mês anterior"
            className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 shadow-xs transition-all active:scale-95 shrink-0"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Rótulo do Mês e Ano */}
          <div className="flex items-center gap-2.5 min-w-0">
            <h2
              data-testid="calendar-month-heading"
              className="text-base sm:text-xl font-black text-slate-950 dark:text-white capitalize tracking-tight select-none"
            >
              {formatMonthLabel(activeMonthKey)}
            </h2>

            {!isCurrentMonthNow && (
              <button
                type="button"
                onClick={handleGoCurrentMonth}
                className="px-3 py-1 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-[11px] font-black uppercase tracking-wider transition-colors shadow-xs"
                title="Voltar para o mês atual"
              >
                Hoje
              </button>
            )}
          </div>

          {/* Seta Próximo Mês */}
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Próximo mês"
            className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-slate-700 shadow-xs transition-all active:scale-95 shrink-0"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Resumo Consolidado de Saídas do Mês com Alto Contraste */}
        <div className="flex items-center gap-3 self-start sm:self-auto bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 rounded-2xl px-3.5 py-2 shadow-xs">
          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-900/40 shrink-0">
            <TrendingDown size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-400">
              Total de saídas no mês
            </span>
            <span
              data-testid="calendar-month-total"
              className="text-base sm:text-lg font-black text-red-700 dark:text-red-400 tabular-nums leading-tight"
            >
              {isPrivacyMode
                ? '••••••'
                : expenseSummary.totalMonthExpenses.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
            </span>
          </div>
          {expenseSummary.daysWithExpensesCount > 0 && (
            <div className="hidden md:block pl-3 border-l-2 border-slate-200 dark:border-slate-800 text-right">
              <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block">
                {expenseSummary.daysWithExpensesCount} dias com gastos
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold block">
                {expenseSummary.totalTransactionsCount} saídas
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Seletor Mobile de Modo de Visualização (Grade vs Agenda) */}
      <div className="flex sm:hidden items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
        <button
          type="button"
          data-testid="calendar-view-mode-grid"
          onClick={() => setMobileViewMode('grid')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-black transition-all ${
            mobileViewMode === 'grid'
              ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <LayoutGrid size={14} />
          <span>Grade (Mês)</span>
        </button>
        <button
          type="button"
          data-testid="calendar-view-mode-agenda"
          onClick={() => setMobileViewMode('agenda')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-black transition-all ${
            mobileViewMode === 'agenda'
              ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <List size={14} />
          <span>
            Agenda ({expenseSummary.daysWithExpensesCount}{' '}
            {expenseSummary.daysWithExpensesCount === 1 ? 'dia' : 'dias'})
          </span>
        </button>
      </div>

      {/* 3. Cabeçalho dos Dias da Semana (DOM a SÁB) com Fundo Destacado e Alto Contraste */}
      <div
        className={`${
          mobileViewMode === 'agenda' ? 'hidden sm:grid' : 'grid'
        } grid-cols-7 gap-1 sm:gap-2 text-center select-none bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl py-2 px-1`}
      >
        {WEEKDAY_LABELS_SHORT.map((label, index) => {
          const isWeekend = index === 0 || index === 6;
          return (
            <div
              key={label}
              className={`text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                isWeekend ? 'text-red-700 dark:text-red-400' : 'text-slate-900 dark:text-slate-200'
              }`}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* 4. Grade Mensal com os Quadradinhos dos Dias com Bordas Nítidas */}
      <div
        className={`${
          mobileViewMode === 'agenda' ? 'hidden sm:grid' : 'grid'
        } grid-cols-7 gap-1 sm:gap-2`}
      >
        {gridCells.map((cell) => {
          const dayExpenses = cell.isCurrentMonth
            ? expenseSummary.dailyMap.get(cell.dateIso)
            : undefined;
          const totalSpent = dayExpenses?.totalAmount || 0;
          const hasExpenses = totalSpent > 0;
          const count = dayExpenses?.transactionCount || 0;

          // Células de meses adjacentes (padding)
          if (!cell.isCurrentMonth) {
            return (
              <div
                key={cell.dateIso}
                className="min-h-[58px] sm:min-h-[85px] p-1 sm:p-2.5 rounded-2xl bg-slate-50/60 dark:bg-slate-950/40 border border-dashed border-slate-200/80 dark:border-slate-800 select-none pointer-events-none flex flex-col justify-between"
              >
                <span className="text-xs font-bold text-slate-400 dark:text-slate-600">
                  {cell.dayNumber}
                </span>
              </div>
            );
          }

          return (
            <button
              key={cell.dateIso}
              type="button"
              onClick={() => setSelectedDayIso(cell.dateIso)}
              data-testid={`calendar-cell-${cell.dateIso}`}
              aria-label={`Dia ${cell.dayNumber}, gasto de ${formatDayExpenseAmount(totalSpent, { isPrivacyMode }) || 'zero'}`}
              className={`min-h-[58px] sm:min-h-[85px] p-1 sm:p-2.5 rounded-2xl border-2 text-left transition-all duration-150 flex flex-col justify-between relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900 ${
                cell.isToday
                  ? 'ring-2 ring-slate-900 dark:ring-slate-100 border-slate-900 dark:border-slate-100 shadow-sm z-10'
                  : ''
              } ${
                hasExpenses
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-950/50 hover:border-rose-500 dark:hover:border-rose-700 shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700'
              }`}
            >
              {/* Topo do quadradinho: Número do dia + Badge de contagem */}
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs sm:text-sm font-black ${
                    cell.isToday
                      ? 'w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center text-[10px] sm:text-xs shadow-xs'
                      : hasExpenses
                        ? 'text-slate-950 dark:text-white'
                        : 'text-slate-800 dark:text-slate-300'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {count > 1 && (
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-[10px] font-black text-red-900 dark:text-red-300 leading-tight">
                    {count}x
                  </span>
                )}
              </div>

              {/* Centro/Rodapé do quadradinho: Valor gasto naquele dia */}
              <div className="w-full mt-1">
                {hasExpenses ? (
                  <div className="flex flex-col">
                    {/* Desktop: valor completo horizontal */}
                    <span
                      data-testid={`day-amount-${cell.dateIso}`}
                      className="hidden sm:block text-xs sm:text-sm font-black text-red-700 dark:text-red-400 tabular-nums leading-tight tracking-tight truncate"
                    >
                      {formatDayExpenseAmount(totalSpent, { isPrivacyMode })}
                    </span>

                    {/* Mobile: visualização inteligente vertical sem truncamento */}
                    <div
                      data-testid={`mobile-day-amount-${cell.dateIso}`}
                      className="flex sm:hidden flex-col items-start leading-none min-w-0 w-full"
                    >
                      {!isPrivacyMode && (
                        <span className="text-[7.5px] font-black uppercase text-red-600/80 dark:text-red-400/80 leading-none mb-0.5">
                          R$
                        </span>
                      )}
                      <span className="text-[10px] font-black text-red-700 dark:text-red-400 tabular-nums tracking-tighter leading-tight truncate">
                        {formatMobileExpenseAmount(totalSpent, isPrivacyMode)}
                      </span>
                    </div>

                    <span className="hidden md:block text-[9px] font-black text-slate-700 dark:text-slate-400 truncate">
                      {count} {count === 1 ? 'saída' : 'saídas'}
                    </span>
                  </div>
                ) : (
                  <span className="block text-xs font-bold text-slate-300 dark:text-slate-700 text-center select-none">
                    -
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 5. Visão de Agenda / Lista Cronológica no Mobile */}
      {mobileViewMode === 'agenda' && (
        <div data-testid="calendar-agenda-view" className="block sm:hidden space-y-2.5">
          {daysWithExpensesList.length === 0 ? (
            <div className="py-8 px-4 text-center bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl">
              <Receipt size={32} className="mx-auto text-slate-400 dark:text-slate-600 mb-2" />
              <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                Nenhuma saída registrada neste mês
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Navegue para outro mês ou lance uma nova despesa.
              </p>
            </div>
          ) : (
            daysWithExpensesList.map((daySummary) => {
              const weekday = getWeekdayNameFromIso(daySummary.dateIso);
              const dayNum = parseInt(daySummary.dateIso.split('-')[2], 10);
              return (
                <div
                  key={daySummary.dateIso}
                  data-testid={`agenda-day-${daySummary.dateIso}`}
                  className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs"
                >
                  {/* Cabeçalho do dia */}
                  <button
                    type="button"
                    onClick={() => setSelectedDayIso(daySummary.dateIso)}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                        {dayNum}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 dark:text-white capitalize truncate">
                          {weekday}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                          {daySummary.transactionCount}{' '}
                          {daySummary.transactionCount === 1 ? 'saída' : 'saídas'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-red-700 dark:text-red-400 tabular-nums">
                        {isPrivacyMode
                          ? '••••••'
                          : daySummary.totalAmount.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            })}
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                        Ver detalhes →
                      </div>
                    </div>
                  </button>

                  {/* Transações do dia */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80 px-3">
                    {daySummary.transactions.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedDayIso(daySummary.dateIso)}
                        className="py-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 -mx-3 px-3 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {t.description || 'Despesa sem descrição'}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                              {t.category || 'Geral'}
                            </span>
                            {t.paymentMethod === 'credit' && (
                              <span className="text-[9px] font-black text-purple-700 dark:text-purple-300">
                                • Cartão
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs font-black text-red-700 dark:text-red-400 tabular-nums shrink-0">
                          {isPrivacyMode
                            ? '••••'
                            : Number(t.amount).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 6. Rodapé Informativo / Legenda de Rigor Contábil com Alto Contraste */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-600 dark:text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800">
        <p>
          💡 <strong className="text-slate-900 dark:text-slate-200">Dica:</strong>{' '}
          {mobileViewMode === 'agenda'
            ? 'Toque em qualquer dia da agenda para abrir a tela completa e gerenciar saídas.'
            : 'Clique em qualquer dia para ver a lista discriminada e o total.'}
        </p>
        <p className="text-slate-600 dark:text-slate-400">
          Compras no cartão constam na data da compra. Quitações de fatura não duplicam gastos.
        </p>
      </div>

      {/* 5. Modal / Gaveta de Detalhamento do Dia Clicado */}
      <DayExpensesModal
        isOpen={Boolean(selectedDayIso)}
        onClose={() => setSelectedDayIso(null)}
        dateIso={selectedDayIso}
        transactions={selectedDayData.transactions}
        totalAmount={selectedDayData.total}
        isPrivacyMode={isPrivacyMode}
        onEditTransaction={onEditTransaction}
        onOpenForm={onOpenForm}
      />
    </div>
  );
};

export default MonthlyExpenseCalendar;
