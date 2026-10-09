import React from 'react';
import { Shield, ChevronRight } from 'lucide-react';
import { BASE_PROTECAO } from '../../theme/fpiVoiceGuide';

interface BaseDeProtecaoCardProps {
  colchaoInicialTarget: number;
  colchaoInicialCurrent: number;
  reserveTarget: number;
  reserveCurrent: number;
  monthlyExpenses: number;
  formatCurrency: (val: number) => string;
  onAjustar: () => void;
}

const BaseDeProtecaoCard: React.FC<BaseDeProtecaoCardProps> = ({
  colchaoInicialTarget,
  colchaoInicialCurrent,
  reserveTarget,
  reserveCurrent,
  monthlyExpenses,
  formatCurrency,
  onAjustar,
}) => {
  const totalProtegido = colchaoInicialCurrent + reserveCurrent;
  const hasData = colchaoInicialCurrent > 0 || reserveCurrent > 0 || colchaoInicialTarget > 0 || reserveTarget > 0;
  const tempoSeguranca =
    monthlyExpenses > 0 ? Math.floor(totalProtegido / monthlyExpenses) : null;

  const colchaoProgress = colchaoInicialTarget > 0
    ? Math.min(100, Math.round((colchaoInicialCurrent / colchaoInicialTarget) * 100))
    : colchaoInicialCurrent > 0 ? 100 : 0;

  const reserveProgress = reserveTarget > 0
    ? Math.min(100, Math.round((reserveCurrent / reserveTarget) * 100))
    : reserveCurrent > 0 ? 100 : 0;

  const colchaoShortfall = Math.max(0, colchaoInicialTarget - colchaoInicialCurrent);
  const reserveShortfall = Math.max(0, reserveTarget - reserveCurrent);

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-50 to-white dark:from-slate-900 dark:to-slate-950 border border-emerald-200 dark:border-emerald-900/40 border-l-[3px] border-l-brand-primary p-6 md:p-8 shadow-floating">
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/[0.04] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <Shield size={22} />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {BASE_PROTECAO.title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              {BASE_PROTECAO.subtitle}
            </p>
          </div>
        </div>

        {!hasData ? (
          <div className="bg-white/60 dark:bg-slate-800/60 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-5 text-center">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
              {BASE_PROTECAO.emptyStateTitle}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {BASE_PROTECAO.emptyStateDescription}
            </p>
          </div>
        ) : (
          <>
            <div className="text-center py-4">
              <p className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white">
                {formatCurrency(totalProtegido)}
              </p>
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mt-1">
                {BASE_PROTECAO.totalLabel}
              </p>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-sky-900/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {BASE_PROTECAO.colchaoBlockTitle}
                </p>
                <p className="text-xs font-black text-sky-600 dark:text-sky-400">
                  {formatCurrency(colchaoInicialCurrent)}
                </p>
              </div>
              <div className="w-full h-2 bg-sky-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${colchaoProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                  {colchaoInicialTarget > 0
                    ? `Meta ${formatCurrency(colchaoInicialTarget)}`
                    : BASE_PROTECAO.colchaoBlockSubtitle}
                </p>
                {colchaoShortfall > 0 && (
                  <p className="text-[9px] font-bold text-sky-600 dark:text-sky-400">
                    Falta: {formatCurrency(colchaoShortfall)}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {BASE_PROTECAO.reservaBlockTitle}
                </p>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(reserveCurrent)}
                </p>
              </div>
              <div className="w-full h-2 bg-emerald-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${reserveProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                  {reserveTarget > 0
                    ? `Meta ${formatCurrency(reserveTarget)}`
                    : BASE_PROTECAO.reservaBlockSubtitle}
                </p>
                {reserveShortfall > 0 && (
                  <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    Falta: {formatCurrency(reserveShortfall)}
                  </p>
                )}
              </div>
            </div>

            <div className="text-center">
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
                {BASE_PROTECAO.safetyTimeLabel}: {tempoSeguranca !== null
                  ? `${tempoSeguranca} ${BASE_PROTECAO.safetyTimeSuffix}`
                  : '—'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-2">
                Usado para calcular sua Disponibilidade Real.
              </p>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onAjustar}
          className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
        >
          {BASE_PROTECAO.cta} <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
};

export default BaseDeProtecaoCard;
