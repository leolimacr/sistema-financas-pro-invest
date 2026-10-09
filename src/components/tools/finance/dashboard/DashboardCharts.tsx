import React from 'react';
import { PieChart, BarChart3 } from 'lucide-react';
import { getFlowLabels } from '../../../../theme/fpiVoiceGuide';

interface DashboardChartsProps {
  categoryStats: {
    data: any[];
    gradient: string;
  };
  stats: {
    income: number;
    expenses: number;
  };
  commandMode?: boolean;
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({
  categoryStats,
  stats,
  commandMode = false,
}) => {
  const voice = getFlowLabels(commandMode);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Composição por categoria */}
      <div className="bg-surface-primary dark:bg-slate-900 p-6 md:p-8 rounded-section border border-slate-200 dark:border-slate-800">
        <h3 className="text-text-primary dark:text-white font-black mb-6 text-sm tracking-tight flex items-center gap-3">
          <PieChart size={16} className="text-brand-primary" /> {voice.compositionTitle}
        </h3>
        <div className="flex items-center gap-10">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full flex-shrink-0 shadow-2xl" style={{ background: categoryStats.gradient }}></div>
          <div className="flex-1 space-y-3">
            {categoryStats.data.length > 0 ? categoryStats.data.map((cat: any) => (
              <div key={cat.name} className="flex flex-col">
                <div className="flex justify-between text-xxs font-bold uppercase tracking-ultra-wide mb-1">
                  <span className="text-text-secondary dark:text-slate-300">{cat.name}</span>
                  <span className="text-text-primary dark:text-white">{Math.round(cat.percent)}%</span>
                </div>
                <div className="w-full bg-surface-elevated dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="h-full transition-all duration-1000" style={{ width: `${cat.percent}%`, backgroundColor: cat.color }}></div>
                </div>
              </div>
            )) : (
              <div className="space-y-1">
                <p className="text-text-secondary dark:text-slate-300 font-bold text-sm">Nenhum compromisso no período</p>
                <p className="text-text-muted dark:text-slate-400 text-xxs leading-relaxed">O gráfico aparece quando houver movimentações de saída registradas.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visão de Fluxo */}
      <div className="bg-surface-primary dark:bg-slate-900 p-6 md:p-8 rounded-section border border-slate-200 dark:border-slate-800">
        <h3 className="text-text-primary dark:text-white font-black mb-6 text-sm tracking-tight flex items-center gap-3">
          <BarChart3 size={16} className="text-brand-secondary" /> {voice.flowChart}
        </h3>
        <div className="flex items-end justify-around h-32 gap-4">
          {[
            { label: voice.income, c: 'bg-brand-primary', h: (stats.income / Math.max(stats.income, stats.expenses, 1)) * 100 },
            { label: voice.expense, c: 'bg-status-danger', h: (stats.expenses / Math.max(stats.income, stats.expenses, 1)) * 100 }
          ].map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full">
              <div className="w-full bg-surface-elevated dark:bg-slate-800/80 rounded-2xl h-full flex items-end overflow-hidden border border-surface-elevated dark:border-slate-700/60">
                <div className={`w-full ${b.c} transition-all duration-1000 shadow-none`} style={{ height: `${b.h}%` }}></div>
              </div>
              <span className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide">{b.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
