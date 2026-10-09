import React from 'react';
import { X, Check, Trash2 } from 'lucide-react';
import type { AgendaCommitment } from '../../services/agendaService';
import {
  UPCOMING_LIMIT_MAX,
  DAYS_SHORT,
  MONTHS,
  tsToDate,
  commitmentTimeLabel,
} from '../../agenda/agendaTypes';

interface AgendaUpcomingListProps {
  show: boolean;
  upcoming: AgendaCommitment[];
  upcomingLimit: number;
  customOpen: boolean;
  customInput: string;
  onClose: () => void;
  onApplyLimit: (limit: number) => void;
  onSetCustomOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  onSetCustomInput: (input: string) => void;
  onCommitCustom: () => void;
  onToggleCommitment: (id: string, completed: boolean) => void;
  onOpenDeleteConfirm: (id: string, title: string) => void;
}

export const AgendaUpcomingList: React.FC<AgendaUpcomingListProps> = ({
  show,
  upcoming,
  upcomingLimit,
  customOpen,
  customInput,
  onClose,
  onApplyLimit,
  onSetCustomOpen,
  onSetCustomInput,
  onCommitCustom,
  onToggleCommitment,
  onOpenDeleteConfirm,
}) => {
  if (!show) return null;

  return (
    <section data-testid="agenda-proximos-panel" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card dark:shadow-none p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Próximos Compromissos
        </h2>
        <button
          onClick={onClose}
          className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Voltar ao caderno"
          data-testid="agenda-proximos-close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => onApplyLimit(5)}
          data-testid="agenda-proximos-5"
          className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
            upcomingLimit === 5 ? 'bg-sky-500 text-white' : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40'
          }`}
        >
          5
        </button>
        <button
          onClick={() => onSetCustomOpen((v) => !v)}
          data-testid="agenda-proximos-custom"
          className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${
            customOpen || upcomingLimit !== 5 ? 'bg-sky-500 text-white' : 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/40'
          }`}
        >
          N
        </button>
        {customOpen && (
          <>
            <input
              type="number"
              min={1}
              max={UPCOMING_LIMIT_MAX}
              value={customInput}
              onChange={(e) => onSetCustomInput(e.target.value)}
              onBlur={onCommitCustom}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onCommitCustom();
                if (e.key === 'Escape') onSetCustomOpen(false);
              }}
              autoFocus
              placeholder="Nº"
              data-testid="agenda-proximos-input"
              className="w-20 text-sm px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30"
            />
            <button
              onClick={onCommitCustom}
              className="text-xs font-bold px-3 py-1 rounded-full bg-sky-500 text-white hover:bg-sky-600 transition-colors"
            >
              Ver
            </button>
          </>
        )}
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum compromisso futuro.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {upcoming.map((c) => {
            const d = tsToDate(c.date);
            const label = `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
            return (
              <div key={c.id} className="flex items-center gap-3 py-2.5 group">
                <button
                  onClick={() => c.id && onToggleCommitment(c.id, !c.completed)}
                  className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    c.completed
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-300 dark:border-slate-600 hover:border-sky-400'
                  }`}
                >
                  {c.completed && <Check size={10} strokeWidth={3} />}
                </button>
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 min-w-[90px] uppercase tracking-tight">
                  {label}
                </span>
                <span
                  className={`flex-1 text-sm leading-tight break-words font-bold ${
                    c.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {c.title}
                </span>
                {commitmentTimeLabel(c) && (
                  <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                    {commitmentTimeLabel(c)}
                  </span>
                )}
                <button
                  onClick={() => c.id && onOpenDeleteConfirm(c.id, c.title)}
                  className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg p-1 transition-all shrink-0"
                  title="Excluir"
                >
                  <Trash2 size={16} className="w-[16px] h-[16px]" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AgendaUpcomingList;
