import React from 'react';
import { Check, X, ChevronRight, Sparkles } from 'lucide-react';
import type { NexusInsight } from '../../services/nexusInsightEngine';
import { trackInsightClicked } from '../../services/nexusAnalyticsService';

const PRIORITY_COLORS: Record<string, string> = {
  alta: 'border-l-red-500',
  media: 'border-l-amber-400',
  baixa: 'border-l-slate-300 dark:border-l-slate-600',
  inline: 'border-l-slate-200 dark:border-l-slate-700',
};

interface NexusFeedItemProps {
  insight: NexusInsight;
  isNew: boolean;
  onAcknowledge: (id: string) => void;
  onDismiss: (id: string) => void;
  onNavigate: (route: string) => void;
  surface?: string;
}

export const NexusFeedItem: React.FC<NexusFeedItemProps> = ({
  insight,
  isNew,
  onAcknowledge,
  onDismiss,
  onNavigate,
  surface = 'feed',
}) => {
  const borderColor = PRIORITY_COLORS[insight.priority] || 'border-l-slate-300 dark:border-l-slate-600';
  const bgClass = isNew ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/60 dark:bg-slate-800/60';

  return (
    <div
      className={`relative rounded-2xl border border-slate-200 dark:border-slate-700 border-l-4 ${borderColor} ${bgClass} p-4 transition-all hover:shadow-sm animate-in slide-in-from-bottom fade-in duration-300`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {isNew && (
            <Sparkles size={12} className="shrink-0 text-amber-500 fill-amber-500 animate-pulse" />
          )}
          <h4 className="text-[11px] font-black text-slate-900 dark:text-white tracking-tight truncate">
            {insight.message.title}
          </h4>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onAcknowledge(insight.id)}
            title="Reconhecer"
            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all"
          >
            <Check size={14} strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => onDismiss(insight.id)}
            title="Descartar"
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1.5 line-clamp-2">
        {insight.message.body}
      </p>

      {insight.deepLink && (
        <button
          type="button"
          onClick={() => {
            trackInsightClicked(insight.id, insight.priority, insight.deepLink!, surface);
            onNavigate(insight.deepLink!);
          }}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-brand-primary dark:text-emerald-400 uppercase tracking-widest hover:text-brand-primary/80 dark:hover:text-emerald-300 transition-colors"
        >
          <span>{insight.message.ctaLabel || 'Ver'}</span>
          <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
};
