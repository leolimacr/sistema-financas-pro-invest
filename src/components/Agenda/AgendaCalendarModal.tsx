import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTHS, DAYS_SHORT, isSameDay } from '../../agenda/agendaTypes';

interface AgendaCalendarModalProps {
  open: boolean;
  calYear: number;
  calMonth: number;
  today: Date;
  dayMap: Map<string, unknown[]>;
  onClose: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
  onGoToday: () => void;
}

export const AgendaCalendarModal: React.FC<AgendaCalendarModalProps> = ({
  open,
  calYear,
  calMonth,
  today,
  dayMap,
  onClose,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
  onGoToday,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/30 flex items-end md:items-center justify-center p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      onClick={onClose}
      data-testid="agenda-calendar-popover"
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Calendário</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={onPrevMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            aria-label="Mês anterior no calendário"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">
            {MONTHS[calMonth]} {calYear}
          </span>
          <button
            onClick={onNextMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            aria-label="Próximo mês no calendário"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {DAYS_SHORT.map((d, idx) => (
            <span
              key={d}
              className={`text-[9px] font-black uppercase tracking-wider py-1 ${
                idx === 0
                  ? 'text-red-600 dark:text-red-400'
                  : idx === 6
                    ? 'text-[#a8256a] dark:text-fuchsia-400'
                    : 'text-slate-400 dark:text-slate-500'
              }`}
            >
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {(() => {
            const cells: React.ReactNode[] = [];
            const firstDayOffset = new Date(calYear, calMonth, 1).getDay();
            const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
            for (let i = 0; i < firstDayOffset; i++) cells.push(<div key={`pad-${i}`} />);
            for (let day = 1; day <= daysInMonth; day++) {
              const dateObj = new Date(calYear, calMonth, day);
              const isTodayDate = isSameDay(dateObj, today);
              const dayIdx = dateObj.getDay();
              const hasCommits = dayMap.has(`${calYear}-${calMonth}-${day}`);
              cells.push(
                <button
                  key={`day-${day}`}
                  onClick={() => onSelectDate(dateObj)}
                  data-testid={`calendar-day-${calYear}-${calMonth}-${day}`}
                  className={`relative h-9 rounded-lg text-sm font-semibold transition-colors ${
                    isTodayDate
                      ? 'bg-sky-500 text-white shadow font-black underline decoration-2 decoration-white underline-offset-2'
                      : dayIdx === 0
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold'
                        : dayIdx === 6
                          ? 'text-[#a8256a] dark:text-fuchsia-400 hover:bg-fuchsia-50/50 dark:hover:bg-fuchsia-950/40 font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {day}
                  {hasCommits && !isTodayDate && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-400" />
                  )}
                </button>
              );
            }
            return cells;
          })()}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => {
              onGoToday();
              onClose();
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
          >
            Hoje
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgendaCalendarModal;
