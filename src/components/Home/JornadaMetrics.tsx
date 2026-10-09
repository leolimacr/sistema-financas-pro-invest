import React from 'react';
import { Crown } from 'lucide-react';

interface JornadaMetricsProps {
  stageName: string;
  effectiveTier: 'free' | 'pro' | 'premium';
  saldoRealTotal: number;
  colchaoTarget: number;
  patrimonioLiquido: number;
  activeDebtsCount: number;
  reserveTarget: number | null | undefined;
  formatCurrency: (val: number) => string;
  onNavigate: (tool: string) => void;
  isPrivacyMode?: boolean;
}

const JornadaMetrics: React.FC<JornadaMetricsProps> = ({
  stageName,
  effectiveTier,
  saldoRealTotal,
  colchaoTarget,
  patrimonioLiquido,
  activeDebtsCount,
  reserveTarget,
  formatCurrency,
  isPrivacyMode = false,
}) => {
  const hasPremiumAccess = effectiveTier === 'premium';
  const hasProAccess = effectiveTier === 'pro' || effectiveTier === 'premium';

  const formatVal = (val: number) => (isPrivacyMode ? '••••••' : formatCurrency(val));

  // Filosofia dos Dois Escudos: 1º Escudo (Colchão) preenchido primeiro, 2º Escudo (Reserva) preenchido em seguida
  const colchaoDisplay = Math.min(saldoRealTotal, colchaoTarget ?? 0);
  const remainingForReserve = Math.max(0, saldoRealTotal - (colchaoTarget ?? 0));
  const reserveDisplay = Math.min(remainingForReserve, reserveTarget ?? 0);

  return (
    <section className="relative overflow-hidden rounded-section bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800 border-l-4 border-l-indigo-500 p-5 md:p-6">
      <div className="relative space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/60 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-400">
            Evolução
          </span>
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
              hasPremiumAccess
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                : hasProAccess
                  ? 'bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {hasPremiumAccess ? <Crown size={12} /> : null}
            Plano {effectiveTier === 'premium' ? 'Premium' : effectiveTier === 'pro' ? 'Pro' : 'Free'}
          </span>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-[0.2em]">
            Estágio: {stageName}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-surface-subtle dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Reserva de Emergência</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {reserveDisplay > 0 ? `Saldo atual ${formatVal(reserveDisplay)}` : '—'}
            </p>
            {reserveTarget != null && reserveTarget > 0 && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Meta {formatVal(reserveTarget)}</p>
            )}
          </div>
          <div className="rounded-2xl bg-surface-subtle dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Colchão Emergencial</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {colchaoDisplay > 0 ? `Saldo atual ${formatVal(colchaoDisplay)}` : '—'}
            </p>
            {colchaoTarget > 0 && (
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Meta {formatVal(colchaoTarget)}</p>
            )}
          </div>
          <div className="rounded-2xl bg-surface-subtle dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Patrimônio líquido</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {patrimonioLiquido !== 0 ? formatVal(patrimonioLiquido) : '—'}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-subtle dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Dívidas ativas</p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{activeDebtsCount > 0 ? activeDebtsCount : '—'}</p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default JornadaMetrics;
