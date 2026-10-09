import React from 'react';
import { CalendarDays, X, Check, ChevronRight } from 'lucide-react';
import type { AgendaCommitment } from '../../services/agendaService';
import {
  DAYS_SHORT,
  MONTHS,
  tsToDate,
  commitmentTimeLabel,
} from '../../agenda/agendaTypes';

interface AgendaWeekGridProps {
  show: boolean;
  weekCommitments: AgendaCommitment[];
  highlightCommitmentId: string | null;
  onClose: () => void;
  onToggleCommitment: (id: string, completed: boolean) => void;
  onFocusCommitment: (c: AgendaCommitment) => void;
}

export const AgendaWeekGrid: React.FC<AgendaWeekGridProps> = ({
  show,
  weekCommitments,
  highlightCommitmentId,
  onClose,
  onToggleCommitment,
  onFocusCommitment,
}) => {
  if (!show) return null;

  return (
    <section data-testid="agenda-week-panel" className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-200 dark:border-slate-800 shadow-card dark:shadow-none p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-sky-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-50 dark:bg-sky-950/40 rounded-xl text-sky-600 dark:text-sky-400">
            <CalendarDays size={18} />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Sua Semana em Foco (Próximos 7 Dias)
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Visão cronológica dos compromissos programados. Clique em &quot;Ver no Caderno&quot; para ir ao dia exato.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Voltar ao caderno completo"
          data-testid="agenda-week-close"
        >
          <X size={18} />
        </button>
      </div>

      {weekCommitments.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 space-y-1">
          <CalendarDays size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Nenhum compromisso agendado para os próximos 7 dias.</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Sua semana está livre e tranquila. Aproveite para planejar com calma!</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {weekCommitments.length} {weekCommitments.length === 1 ? 'compromisso agendado' : 'compromissos agendados'}:
            </p>
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline"
            >
              Ver caderno completo
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto">
            {weekCommitments.map((c) => {
              const d = tsToDate(c.date);
              const isHighlighted = highlightCommitmentId === c.id;
              const dayLabel = `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
              return (
                <div
                  key={c.id || `${c.title}_${d.getTime()}`}
                  className={`flex items-center gap-3 py-3 px-2 rounded-xl group transition ${
                    isHighlighted ? 'bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60' : 'hover:bg-sky-50/50 dark:hover:bg-slate-800/60'
                  }`}
                  data-testid={`agenda-week-item-${c.id}`}
                >
                  <button
                    type="button"
                    onClick={() => c.id && onToggleCommitment(c.id, !c.completed)}
                    className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      c.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-sky-400'
                    }`}
                    aria-label="Marcar/desmarcar"
                  >
                    {c.completed && <Check size={10} strokeWidth={3} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-tight text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-md">
                        {dayLabel}
                      </span>
                      {isHighlighted && (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">
                          Citado na Notificação
                        </span>
                      )}
                      {commitmentTimeLabel(c) && (
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                          {commitmentTimeLabel(c)}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs font-bold leading-tight mt-1 truncate ${
                        c.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {c.title}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onFocusCommitment(c)}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-xs font-bold transition active:scale-95"
                    title="Ir direto até este dia no caderno"
                    data-testid={`agenda-week-focus-btn-${c.id}`}
                  >
                    <span className="hidden sm:inline">Ver no Caderno</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default AgendaWeekGrid;
