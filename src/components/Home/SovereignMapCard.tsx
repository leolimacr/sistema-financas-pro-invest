import React from 'react';
import type { StageInfo } from '../../services/sovereignMap';

interface SovereignMapCardProps {
  stage: StageInfo;
  onNavigate?: (tool: string) => void;
}

const STAGE_COLORS: Record<string, string> = {
  'indefinido': 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400',
  'pressao': 'bg-red-50 dark:bg-rose-950/30 border-red-200 dark:border-rose-900/50 text-red-700 dark:text-rose-400',
  'colchao-incompleto': 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400',
  'estavel': 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400',
  'solido': 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-900/50 text-sky-700 dark:text-sky-400',
  'expansao': 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400',
};

const SovereignMapCard: React.FC<SovereignMapCardProps> = ({ stage, onNavigate }) => {
  const colorClass = STAGE_COLORS[stage.id] || STAGE_COLORS['indefinido'];

  return (
    <div className={`rounded-section border p-5 ${colorClass}`}>
      <div className="mb-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          Leitura de Posição
        </h3>
      </div>

      <p className="text-base font-black tracking-tight mb-2 text-slate-950 dark:text-white">
        {stage.name}
      </p>

      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mb-3">
        {stage.explanation}
      </p>

      {stage.blockers.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
            Fatores limitantes
          </p>
          <ul className="space-y-1">
            {stage.blockers.map((b, i) => (
              <li key={i} className="text-sm flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-current opacity-40" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {onNavigate && stage.numericStage >= 4 && (
        <button
          type="button"
          onClick={() => onNavigate('investimentos')}
          className="mt-4 w-full text-sm font-bold py-2.5 px-4 rounded-xl bg-white/60 dark:bg-slate-800/80 hover:bg-white/90 dark:hover:bg-slate-800 text-slate-900 dark:text-white transition-colors"
        >
          Explorar alocação
        </button>
      )}
    </div>
  );
};

export default SovereignMapCard;
