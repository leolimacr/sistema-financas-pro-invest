import React from 'react';
import type { AveragesDataEntry } from './averagesTypes';

export interface AveragesOverviewCardProps {
  totalEntry: AveragesDataEntry;
  selectedYear: number;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
  averageMode: 'real' | 'occurrence';
  isPrivacyMode: boolean;
  includeCurrentMonthTotal: boolean;
  setIncludeCurrentMonthTotal: React.Dispatch<React.SetStateAction<boolean>>;
  showCategoryBreakdown: boolean;
  setShowCategoryBreakdown: React.Dispatch<React.SetStateAction<boolean>>;
}

export const AveragesOverviewCard: React.FC<AveragesOverviewCardProps> = ({
  totalEntry,
  selectedYear,
  setSelectedYear,
  averageMode,
  isPrivacyMode,
  includeCurrentMonthTotal,
  setIncludeCurrentMonthTotal,
  showCategoryBreakdown,
  setShowCategoryBreakdown,
}) => {
  const ytdActiveAvg = averageMode === 'real' ? totalEntry.average : totalEntry.averageOccurrence;
  const currentMaxYear = new Date().getFullYear();

  return (
    <div className="mt-5 p-4 bg-surface-secondary dark:bg-slate-800/60 border border-surface-elevated dark:border-slate-700 rounded-3xl">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[9px] px-2 py-1 bg-brand-secondary/15 text-brand-secondary rounded-full font-black uppercase tracking-ultra-wide">
          GERAL
        </span>
        <span className="text-xxs font-black text-text-primary dark:text-white uppercase tracking-ultra-wide">
          Visão Geral · {selectedYear}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => setSelectedYear(y => y - 1)}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-elevated dark:bg-slate-700 hover:bg-surface-secondary dark:hover:bg-slate-600 text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white transition-all text-xxs font-black"
          >
            ◀
          </button>
          <span className="text-xxs font-black text-text-secondary dark:text-slate-300 px-1">{selectedYear}</span>
          <button
            type="button"
            onClick={() => setSelectedYear(y => Math.min(y + 1, currentMaxYear))}
            disabled={selectedYear >= currentMaxYear}
            className="w-6 h-6 flex items-center justify-center rounded-lg bg-surface-elevated dark:bg-slate-700 hover:bg-surface-secondary dark:hover:bg-slate-600 text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white transition-all text-xxs font-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="bg-surface-elevated dark:bg-slate-800 rounded-2xl p-3">
          <p className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide">Total acumulado</p>
          <p className="text-sm font-black text-text-primary dark:text-white mt-0.5">
            {isPrivacyMode ? '••••' : `R$ ${totalEntry.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          {totalEntry.totalMonthsInWindow > 0 && (
            <p className="text-[9px] font-bold text-text-muted dark:text-slate-400 mt-0.5">
              {totalEntry.totalMonthsInWindow} {totalEntry.totalMonthsInWindow === 1 ? 'mês fechado' : 'meses fechados'}
            </p>
          )}
        </div>
        <div className="bg-surface-elevated dark:bg-slate-800 rounded-2xl p-3">
          <p className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide">Média mensal</p>
          <p className="text-sm font-black text-brand-secondary mt-0.5">
            {isPrivacyMode ? '••••' : `R$ ${ytdActiveAvg.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </div>
        <div className="bg-surface-elevated dark:bg-slate-800 rounded-2xl p-3">
          <p className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide">Projeção anual</p>
          <p className="text-sm font-black mt-0.5" style={{ color: '#f59e0b' }}>
            {isPrivacyMode ? '••••' : `R$ ${(totalEntry.projectedYearTotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
        </div>
        <div className="bg-surface-elevated dark:bg-slate-800 rounded-2xl p-3">
          <p className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide flex items-center gap-1">
            Tendência
            <span className="relative group">
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-surface-elevated dark:bg-slate-700 text-text-muted dark:text-slate-400 text-[8px] font-black cursor-help">?</span>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-52 p-2 rounded-xl bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-700 shadow-soft text-[8px] font-bold text-text-secondary dark:text-slate-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                Compara a média dos últimos 3 meses com os 3 meses anteriores para mostrar se seus gastos estão subindo (▲), caindo (▼) ou estáveis (→).
              </span>
            </span>
          </p>
          {totalEntry.trend ? (
            <p className={`text-sm font-black mt-0.5 flex items-center gap-1 ${totalEntry.trend.direction === 'up' ? 'text-action-dangerDark' : totalEntry.trend.direction === 'down' ? 'text-action-primaryDark' : 'text-text-muted dark:text-slate-400'}`}>
              {totalEntry.trend.direction === 'up' ? '▲' : totalEntry.trend.direction === 'down' ? '▼' : '→'} {totalEntry.trend.percentage.toFixed(0)}%
            </p>
          ) : (
            <p className="text-[9px] font-bold text-text-muted dark:text-slate-400 mt-1.5">
              {totalEntry.totalMonthsInWindow < 6 ? `— (${6 - totalEntry.totalMonthsInWindow} ${totalEntry.totalMonthsInWindow === 5 ? 'mês' : 'meses'} para calcular)` : '—'}
            </p>
          )}
        </div>
      </div>

      {(totalEntry.highestMonth || totalEntry.lowestMonth) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {totalEntry.highestMonth && totalEntry.highestMonth.value > 0 && (
            <div className="flex items-center gap-1.5 bg-status-danger/10 rounded-xl px-3 py-1.5">
              <span className="text-[9px] font-black text-action-dangerDark">▲ Mês mais alto</span>
              <span className="text-xxs font-black text-text-primary dark:text-white">{totalEntry.highestMonth.label}</span>
              <span className="text-xxs font-black text-text-secondary dark:text-slate-300">
                {isPrivacyMode ? '••••' : `R$ ${totalEntry.highestMonth.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
          )}
          {totalEntry.lowestMonth && totalEntry.lowestMonth.value > 0 && (
            <div className="flex items-center gap-1.5 bg-status-success/10 rounded-xl px-3 py-1.5">
              <span className="text-[9px] font-black text-action-primaryDark">▼ Mês mais baixo</span>
              <span className="text-xxs font-black text-text-primary dark:text-white">{totalEntry.lowestMonth.label}</span>
              <span className="text-xxs font-black text-text-secondary dark:text-slate-300">
                {isPrivacyMode ? '••••' : `R$ ${totalEntry.lowestMonth.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {totalEntry.months.map(m => {
          const isFuture = !m.isClosed && !m.isCurrentMonth;
          const isCurrentInactive = m.isCurrentMonth && !includeCurrentMonthTotal;
          const isAbove = m.deviation !== null && m.deviation > 0;
          return (
            <div
              key={`${m.year}-${m.month}`}
              className={`p-2.5 rounded-2xl border text-center transition-all ${
                isFuture
                  ? 'border-surface-elevated/40 dark:border-slate-800 opacity-40 bg-surface-primary/30 dark:bg-slate-900/30'
                  : m.isCurrentMonth
                  ? includeCurrentMonthTotal
                    ? 'border-brand-secondary/40 bg-brand-secondary/5 dark:bg-brand-secondary/10'
                    : 'border-surface-elevated dark:border-slate-800 opacity-60 bg-surface-primary/50 dark:bg-slate-900/50'
                  : 'border-surface-elevated dark:border-slate-700 bg-surface-primary dark:bg-slate-900'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide">{m.label}</span>
                {m.isCurrentMonth && (
                  <span className="text-[7px] font-black uppercase text-brand-secondary">Atual</span>
                )}
              </div>
              <p className="text-xxs font-black text-text-primary dark:text-white">
                {isFuture ? '—' : isPrivacyMode ? '••••' : `R$ ${m.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              </p>
              {m.isCurrentMonth && m.projection && !isPrivacyMode && (
                <p className="text-[8px] font-bold text-text-muted dark:text-slate-400 mt-0.5">
                  →R$ {m.projection.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              )}
              {!isFuture && !isCurrentInactive && m.deviation !== null && (
                <p className={`text-[8px] font-black mt-0.5 ${isAbove ? 'text-action-dangerDark' : 'text-action-primaryDark'}`}>
                  {isAbove ? '▲' : '▼'} {Math.abs(Math.round(m.deviation))}%
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 pt-4 border-t border-surface-elevated dark:border-slate-700">
        <label className={`flex items-center gap-2 cursor-pointer select-none px-4 py-2.5 rounded-2xl border-2 transition-all ${
          includeCurrentMonthTotal
            ? 'bg-status-success/10 border-status-success/30 shadow-soft'
            : 'bg-status-info/10 border-status-info/30'
        }`}>
          <div
            onClick={() => setIncludeCurrentMonthTotal(p => !p)}
            className={`w-9 h-5 rounded-full transition-all relative ${
              includeCurrentMonthTotal ? 'bg-status-info ring-1 ring-status-info/40 shadow-lg' : 'bg-text-muted/30'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-surface-primary rounded-full shadow-soft transition-transform ${
              includeCurrentMonthTotal ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </div>
          <span className={`text-xxs font-black uppercase tracking-ultra-wide transition-all ${
            includeCurrentMonthTotal ? 'text-action-primaryDark' : 'text-action-sky'
          }`}>
            Incluir mês atual na média
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={() => setShowCategoryBreakdown(p => !p)}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-xxs font-black uppercase border transition-all active:scale-95 bg-surface-elevated dark:bg-slate-800 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700"
      >
        {showCategoryBreakdown ? '▲ Ocultar análise por categoria' : '▼ Análise por categoria'}
      </button>
    </div>
  );
};
