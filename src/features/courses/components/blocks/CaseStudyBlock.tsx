import React from 'react';
import { Layers, AlertCircle, CheckCircle2, AlertTriangle, Info, ArrowRight } from 'lucide-react';

interface Scenario {
  title: string;
  badge?: string;
  badgeType?: 'danger' | 'warning' | 'success' | 'info';
  points: string[];
  highlightedResult?: string;
}

interface Props {
  title: string;
  subtitle?: string;
  scenarios: Scenario[];
  takeaway?: string;
}

const badgeStyles = {
  danger: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  warning: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  success: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  info: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
};

const badgeIcons = {
  danger: <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />,
  warning: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />,
  success: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
  info: <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />,
};

export const CaseStudyBlock: React.FC<Props> = ({
  title,
  subtitle,
  scenarios,
  takeaway,
}) => {
  return (
    <div className="my-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 md:p-7 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-600 dark:text-blue-400 block mb-0.5">
            Estudo de Caso Prático
          </span>
          <h4 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {title}
          </h4>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Grid de Cenários */}
      <div className={`grid grid-cols-1 ${scenarios.length > 1 ? 'md:grid-cols-2 lg:grid-cols-' + Math.min(scenarios.length, 3) : ''} gap-4 mb-5`}>
        {scenarios.map((scenario, idx) => {
          const type = scenario.badgeType || 'info';
          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h5 className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base">
                    {scenario.title}
                  </h5>
                  {scenario.badge && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${badgeStyles[type]}`}
                    >
                      {badgeIcons[type]}
                      {scenario.badge}
                    </span>
                  )}
                </div>

                <ul className="space-y-2 mb-4">
                  {scenario.points.map((point, pIdx) => (
                    <li key={pIdx} className="text-xs md:text-sm text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <span className="text-slate-400 dark:text-slate-500 mt-1">•</span>
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {scenario.highlightedResult && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-lg border dark:border-slate-700">
                  {scenario.highlightedResult}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Conclusão / Aprendizado Central */}
      {takeaway && (
        <div className="rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900/60 p-4 flex items-start gap-3">
          <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            <strong className="text-blue-900 dark:text-blue-300 font-semibold block mb-0.5">Lição Soberana:</strong>
            {takeaway}
          </div>
        </div>
      )}
    </div>
  );
};

export default CaseStudyBlock;
