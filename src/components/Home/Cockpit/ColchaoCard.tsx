import React from 'react';
import { ShieldCheck, PartyPopper, Target } from 'lucide-react';

interface ColchaoCardProps {
  marcoZero: number;
  colchaoTarget: number;
  formatCurrency: (val: number) => string;
  onNavigate?: (tool: string) => void;
}

const ColchaoCard: React.FC<ColchaoCardProps> = ({
  marcoZero,
  colchaoTarget,
  formatCurrency,
  onNavigate,
}) => {
  if (colchaoTarget <= 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 shrink-0">
            <Target size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-1">
              Colchão Emergencial
            </p>
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              Defina sua primeira camada de proteção
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Um colchão emergencial amortece meses de aperto antes de mexer na reserva.
            </p>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('mais')}
                className="mt-3 px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-widest hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors"
              >
                Configurar colchão
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const progress = Math.min(1, marcoZero / colchaoTarget);
  const isComplete = marcoZero >= colchaoTarget;
  const remaining = Math.max(0, colchaoTarget - marcoZero);

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl shrink-0 ${
          isComplete ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400'
        }`}>
          {isComplete ? <PartyPopper size={20} /> : <ShieldCheck size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
              Colchão Emergencial
            </p>
            <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Meta {formatCurrency(colchaoTarget)}
            </p>
          </div>
          {isComplete ? (
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">
              🎉 Colchão completo! {formatCurrency(marcoZero)}
            </p>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                {formatCurrency(marcoZero)} de {formatCurrency(colchaoTarget)}
              </p>
              <div className="mt-2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-sky-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
                Faltam {formatCurrency(remaining)} para completar seu colchão.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ColchaoCard;
