import React from 'react';
import type { AveragesDataEntry, AveragesWindow, AverageMode } from './averagesTypes';

export interface AveragesCategorySectionProps {
  averagesData: AveragesDataEntry[];
  averagesWindow: AveragesWindow;
  setAveragesWindow: (v: AveragesWindow) => void;
  customPeriodStart: string;
  setCustomPeriodStart: (v: string) => void;
  customPeriodEnd: string;
  setCustomPeriodEnd: (v: string) => void;
  averageMode: AverageMode;
  setAverageMode: (v: AverageMode) => void;
  includeCurrentMonth: boolean;
  setIncludeCurrentMonth: React.Dispatch<React.SetStateAction<boolean>>;
  isPrivacyMode: boolean;
}

export const AveragesCategorySection: React.FC<AveragesCategorySectionProps> = ({
  averagesData,
  averagesWindow,
  setAveragesWindow,
  customPeriodStart,
  setCustomPeriodStart,
  customPeriodEnd,
  setCustomPeriodEnd,
  averageMode,
  setAverageMode,
  includeCurrentMonth,
  setIncludeCurrentMonth,
  isPrivacyMode,
}) => {
  return (
    <>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4 pb-4 border-b border-surface-elevated dark:border-slate-800">
        <div className="flex flex-wrap gap-2">
          <div className="flex bg-surface-secondary dark:bg-slate-800/80 rounded-2xl p-1 border border-surface-elevated dark:border-slate-700 gap-1 flex-wrap">
            {([
              { key: 'year' as const, label: 'Ano atual' },
              { key: 'last3' as const, label: 'Últ. 3m' },
              { key: 'last6' as const, label: 'Últ. 6m' },
              { key: 'all' as const, label: 'Tudo' },
              { key: 'custom' as const, label: 'Escolher período' },
            ]).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setAveragesWindow(opt.key)}
                className={`px-3 py-1.5 rounded-xl text-xxs font-black uppercase transition-all ${
                  averagesWindow === opt.key
                    ? 'bg-brand-secondary text-text-onBrand shadow-soft'
                    : 'text-text-secondary dark:text-slate-400 hover:text-text-primary dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {averagesWindow === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 mt-1 w-full">
              <span className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide shrink-0">De</span>
              <div className="flex items-center gap-2 bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 rounded-2xl px-3 py-2">
                <select
                  value={customPeriodStart ? customPeriodStart.split('-')[1] : ''}
                  onChange={e => {
                    const year = customPeriodStart ? customPeriodStart.split('-')[0] : new Date().getFullYear().toString();
                    if (e.target.value) setCustomPeriodStart(`${year}-${e.target.value}`);
                  }}
                  className="text-xxs font-black text-text-primary dark:text-white bg-transparent dark:bg-slate-800 outline-none border-none cursor-pointer"
                >
                  <option value="" className="dark:bg-slate-800 dark:text-white">Mês</option>
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                    <option key={m} value={m} className="dark:bg-slate-800 dark:text-white">
                      {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i]}
                    </option>
                  ))}
                </select>
                <select
                  value={customPeriodStart ? customPeriodStart.split('-')[0] : ''}
                  onChange={e => {
                    const month = customPeriodStart ? customPeriodStart.split('-')[1] : '01';
                    if (e.target.value) setCustomPeriodStart(`${e.target.value}-${month}`);
                  }}
                  className="text-xxs font-black text-text-primary dark:text-white bg-transparent dark:bg-slate-800 outline-none border-none cursor-pointer"
                >
                  <option value="" className="dark:bg-slate-800 dark:text-white">Ano</option>
                  {Array.from({ length: 36 }, (_, i) => 2015 + i).map(y => (
                    <option key={y} value={y} className="dark:bg-slate-800 dark:text-white">{y}</option>
                  ))}
                </select>
              </div>

              <span className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase">até</span>

              <div className="flex items-center gap-2 bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 rounded-2xl px-3 py-2">
                <select
                  value={customPeriodEnd ? customPeriodEnd.split('-')[1] : ''}
                  onChange={e => {
                    const year = customPeriodEnd ? customPeriodEnd.split('-')[0] : new Date().getFullYear().toString();
                    if (e.target.value) setCustomPeriodEnd(`${year}-${e.target.value}`);
                  }}
                  className="text-xxs font-black text-text-primary dark:text-white bg-transparent dark:bg-slate-800 outline-none border-none cursor-pointer"
                >
                  <option value="" className="dark:bg-slate-800 dark:text-white">Mês</option>
                  {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                    <option key={m} value={m} className="dark:bg-slate-800 dark:text-white">
                      {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i]}
                    </option>
                  ))}
                </select>
                <select
                  value={customPeriodEnd ? customPeriodEnd.split('-')[0] : ''}
                  onChange={e => {
                    const month = customPeriodEnd ? customPeriodEnd.split('-')[1] : '01';
                    if (e.target.value) setCustomPeriodEnd(`${e.target.value}-${month}`);
                  }}
                  className="text-xxs font-black text-text-primary dark:text-white bg-transparent dark:bg-slate-800 outline-none border-none cursor-pointer"
                >
                  <option value="" className="dark:bg-slate-800 dark:text-white">Ano</option>
                  {Array.from({ length: 36 }, (_, i) => 2015 + i).map(y => (
                    <option key={y} value={y} className="dark:bg-slate-800 dark:text-white">{y}</option>
                  ))}
                </select>
              </div>

              {customPeriodStart && customPeriodEnd && customPeriodStart <= customPeriodEnd && (
                <span className="text-xxs font-black text-brand-secondary uppercase tracking-ultra-wide">
                  {(() => {
                    const [sy, sm] = customPeriodStart.split('-').map(Number);
                    const [ey, em] = customPeriodEnd.split('-').map(Number);
                    const total = (ey - sy) * 12 + (em - sm) + 1;
                    return `${total} ${total === 1 ? 'mês' : 'meses'}`;
                  })()}
                </span>
              )}

              {customPeriodStart && customPeriodEnd && customPeriodStart > customPeriodEnd && (
                <span className="text-xxs font-black text-action-dangerDark uppercase tracking-ultra-wide">
                  ⚠ Data final anterior à inicial
                </span>
              )}
            </div>
          )}
          
          <div className="flex bg-surface-secondary dark:bg-slate-800/80 rounded-2xl p-1 border border-surface-elevated dark:border-slate-700 gap-1">
            {([
              { key: 'real' as const, label: 'Média real' },
              { key: 'occurrence' as const, label: 'Média de ocorrência' },
            ]).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setAverageMode(opt.key)}
                className={`px-3 py-1.5 rounded-xl text-xxs font-black uppercase transition-all ${
                  averageMode === opt.key
                    ? 'bg-action-sky text-text-onBrand shadow-soft'
                    : 'text-text-secondary dark:text-slate-400 hover:text-text-primary dark:hover:text-white'
                }`}
              >
                {opt.label}
                <span className="relative group ml-1">
                  <span className="w-4 h-4 inline-flex items-center justify-center rounded-full bg-surface-elevated dark:bg-slate-700 text-text-muted dark:text-slate-400 text-[9px] font-black cursor-help">?</span>
                  <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-56 p-2.5 rounded-xl bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-700 shadow-soft text-[8px] font-bold text-text-secondary dark:text-slate-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {opt.key === 'real'
                      ? 'Considera todos os meses da janela, inclusive aqueles sem gastos na categoria. O total é dividido por todos os meses do período.'
                      : 'Considera apenas os meses em que houve gasto na categoria. Ignora meses com zero despesa.'}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <label className={`flex items-center gap-2 cursor-pointer select-none px-4 py-2.5 rounded-2xl border-2 transition-all ${
          includeCurrentMonth
            ? 'bg-status-success/10 border-status-success/30 shadow-soft'
            : 'bg-status-info/10 border-status-info/30'
        }`}>
          <div
            onClick={() => setIncludeCurrentMonth(p => !p)}
            className={`w-9 h-5 rounded-full transition-all relative ${
              includeCurrentMonth ? 'bg-status-info ring-1 ring-status-info/40 shadow-lg' : 'bg-text-muted/30'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-surface-primary rounded-full shadow-soft transition-transform ${
              includeCurrentMonth ? 'translate-x-4' : 'translate-x-0.5'
            }`} />
          </div>
          <span className={`text-xxs font-black uppercase tracking-ultra-wide transition-all ${
            includeCurrentMonth ? 'text-status-success' : 'text-status-info'
          }`}>
            Incluir mês atual na média
          </span>
        </label>
      </div>

      <div className="space-y-6 mt-4">
        {averagesData.filter(a => a.category !== 'Total Geral').map(({ category, average, averageOccurrence, totalValue, totalMonthsInWindow, monthsWithValue, months }) => {
          const isTotal = category === 'Total Geral';
          const activeAverage = averageMode === 'real' ? average : averageOccurrence;
          const maxValue = Math.max(...months.map(m => Math.max(m.value, m.projection || 0)), 1);
          const cardClass = isTotal ? 'bg-surface-secondary dark:bg-slate-800/60 border border-surface-elevated dark:border-slate-700 rounded-3xl p-4 -mx-1' : '';
          return (
            <div key={category} className={cardClass}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  {isTotal && (
                    <span className="text-[9px] px-2 py-0.5 bg-brand-secondary/15 text-brand-secondary rounded-full font-black uppercase tracking-ultra-wide">GERAL</span>
                  )}
                  <p className="text-sm font-black text-text-primary dark:text-white">{category}</p>
                </div>
                <div className="flex flex-wrap gap-4 sm:text-right">
                  <div>
                    <p className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase">Total no período</p>
                    <p className="text-sm font-black text-text-secondary dark:text-slate-300">
                      {isPrivacyMode ? '••••' : `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase">
                      {averageMode === 'real'
                        ? `Média real · ${totalMonthsInWindow} ${totalMonthsInWindow === 1 ? 'mês' : 'meses'}`
                        : `Média de ocorrência · ${monthsWithValue} ${monthsWithValue === 1 ? 'mês' : 'meses'}`}
                    </p>
                    <p className="text-sm font-black text-brand-secondary">
                      {isPrivacyMode ? '••••' : `R$ ${activeAverage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {months.map(m => {
                  if (!m.isClosed && !m.isCurrentMonth) return null;
                  if (averageMode === 'occurrence' && m.value === 0 && !m.isCurrentMonth) return null;
                  const barWidth = (m.value / maxValue) * 100;
                  const projWidth = m.projection ? (m.projection / maxValue) * 100 : 0;
                  const avgWidth = (average / maxValue) * 100;
                  const isAbove = m.deviation !== null && m.deviation > 0;
                  const isBelow = m.deviation !== null && m.deviation < 0;
                  return (
                    <div key={`${m.year}-${m.month}`} className="flex items-center gap-3">
                      <span className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase w-12 shrink-0 text-right">
                        {m.label}
                      </span>
                      <div className="flex-1 relative h-6 bg-surface-elevated dark:bg-slate-800 rounded-lg overflow-visible">
                        <div
                          className={`absolute left-0 top-0 h-full rounded-lg transition-all duration-700 ${
                            m.isCurrentMonth && !includeCurrentMonth ? 'bg-surface-secondary dark:bg-slate-700' : isAbove ? 'bg-status-danger/60' : isBelow ? 'bg-status-success/60' : 'bg-brand-secondary/60'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                        {m.isCurrentMonth && m.projection && (
                          <div
                            className="absolute left-0 top-0 h-full rounded-lg border-2 border-dashed border-text-muted dark:border-slate-500 bg-transparent transition-all duration-700"
                            style={{ width: `${projWidth}%` }}
                          />
                        )}
                        <div
                          className="absolute top-0 h-full w-0.5 bg-brand-secondary opacity-60"
                          style={{ left: `${Math.min(avgWidth, 99)}%` }}
                        />
                      </div>
                      <div className="w-40 shrink-0 flex items-center gap-2">
                        <span className="text-xxs font-black text-text-secondary dark:text-slate-300">
                          {isPrivacyMode ? '••••' : `R$ ${m.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </span>
                        {m.isCurrentMonth && m.projection && !isPrivacyMode && (
                          <span className="text-xxs text-text-muted dark:text-slate-400 font-bold">
                            {`→ R$ ${m.projection.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </span>
                        )}
                        {m.deviation !== null && (
                          <span className={`text-xxs font-black ${isAbove ? 'text-action-dangerDark' : 'text-action-primaryDark'}`}>
                            {isAbove ? '▲' : '▼'} {Math.abs(Math.round(m.deviation))}%
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {isTotal && (
                <div className="border-b border-surface-elevated dark:border-slate-700 mt-3 mb-1" />
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
