import React from 'react';
import { History, ChevronRight, X } from 'lucide-react';
import type { SessionSummary } from '../../hooks/useSessionTimeline';

interface SessionTimelineCardProps {
  summary: SessionSummary | null;
  onDismiss: () => void;
  onNavigate: (route: string, context?: Record<string, unknown>) => void;
}

const SessionTimelineCard: React.FC<SessionTimelineCardProps> = ({ summary, onDismiss, onNavigate }) => {
  if (!summary) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-5 shadow-sm animate-in fade-in duration-500">
      <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all z-10"
        aria-label="Fechar"
      >
        <X size={14} />
      </button>

      <div className="relative z-10 flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center shadow-sm">
          <History size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 pr-6 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 mb-1">
            Desde sua última visita
          </p>
          <p className="text-sm text-slate-700 font-medium leading-relaxed">
            {summary.message}
          </p>

          {summary.cta && (
            <button
              onClick={() => onNavigate(summary.cta!.route, summary.cta!.context)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-sky-700 transition-all active:scale-95 shadow-sm"
            >
              <span>{summary.cta.label}</span>
              <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionTimelineCard;
