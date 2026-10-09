import React from 'react';
import { Bell, ChevronUp, ChevronDown, X, Check, Trash2 } from 'lucide-react';
import type { AgendaCommitment } from '../../services/agendaService';
import {
  AGENDA_ROW_HEIGHT,
  DAYS_SHORT,
  isSameDay,
  formatTime,
  tsToDate,
  commitmentTimeLabel,
} from '../../agenda/agendaTypes';
import AutoResizeTextarea from './AutoResizeTextarea';

export interface EditingMeta {
  commitment: AgendaCommitment;
  date: Date;
  dayKey: string;
  index: number;
  totalInDay: number;
}

interface AgendaDayRowProps {
  day: number;
  month: number;
  year: number;
  today: Date;
  commitments: AgendaCommitment[];
  commitLines: Record<string, string[]>;
  editingId: string | null;
  editText: string;
  editingMeta: EditingMeta | null;
  addingDayKey: string | null;
  addText: string;
  highlightCommitmentId: string | null;
  onStartEdit: (c: AgendaCommitment, date: Date, dayKey: string, index: number, totalInDay: number) => void;
  onCancelEdit: () => void;
  onCommitEdit: (id: string) => void;
  onChangeEditText: (text: string) => void;
  onStartAdd: (dayKey: string) => void;
  onCancelAdd: () => void;
  onCommitAdd: (date: Date) => void;
  onChangeAddText: (text: string) => void;
  onToggleCommitment: (id: string, completed: boolean) => void;
  onOpenAlarm: (c: AgendaCommitment) => void;
  onOpenDeleteConfirm: (id: string, title: string) => void;
  onShiftCommitment: (dayKey: string, fromIndex: number, toIndex: number) => void;
  onSetEditingMeta: (meta: EditingMeta | null) => void;
  isPaperDark?: boolean;
}

export const AgendaDayRow: React.FC<AgendaDayRowProps> = ({
  day,
  month,
  year,
  today,
  commitments,
  commitLines,
  editingId,
  editText,
  editingMeta,
  addingDayKey,
  addText,
  highlightCommitmentId,
  onStartEdit,
  onCancelEdit,
  onCommitEdit,
  onChangeEditText,
  onStartAdd,
  onCancelAdd,
  onCommitAdd,
  onChangeAddText,
  onToggleCommitment,
  onOpenAlarm,
  onOpenDeleteConfirm,
  onShiftCommitment,
  onSetEditingMeta,
  isPaperDark = false,
}) => {
  const key = `${year}-${month}-${day}`;
  const dateObj = new Date(year, month, day);
  const dayIdx = dateObj.getDay();
  const dayOfWeek = DAYS_SHORT[dayIdx];
  const isToday = isSameDay(dateObj, today);
  const isSunday = dayIdx === 0;
  const isSaturday = dayIdx === 6;
  const isEmpty = commitments.length === 0;
  const isAdding = addingDayKey === key;
  const todayCls = isToday ? 'font-bold italic' : '';

  const rowCls = `relative flex items-end gap-1.5 md:gap-3 -mx-2 px-2 sm:-mx-4 sm:px-4 ${todayCls}`;

  const firstCommit = commitments[0];
  const restCommits = commitments.slice(1);
  const firstId = firstCommit?.id ?? '';
  const firstLines = firstId ? commitLines[firstId] : undefined;
  const firstFragments = firstLines && firstLines.length > 1 ? firstLines : null;

  const dayLabelColor = isToday
    ? (isPaperDark
        ? 'text-sky-300 underline decoration-2 decoration-sky-500 underline-offset-[3px]'
        : 'text-sky-700 underline decoration-2 decoration-sky-500 underline-offset-[3px]')
    : isSunday
      ? (isPaperDark ? 'text-red-400' : 'text-red-600')
      : isSaturday
        ? (isPaperDark ? 'text-fuchsia-400' : 'text-[#a8256a]')
        : (isPaperDark ? 'text-slate-400' : 'text-slate-500');

  const dayLabel = (
    <span
      data-testid={`agenda-day-label-${year}-${month}-${day}`}
      className={`inline-flex items-baseline whitespace-nowrap gap-1 w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 text-[14px] md:text-[15px] leading-[17px] font-black uppercase tracking-wider translate-y-[1px] pr-1.5 ${dayLabelColor}`}
    >
      <span className={`shrink-0 ${isToday ? 'underline decoration-2 decoration-sky-500 underline-offset-[3px]' : ''}`}>{dayOfWeek}</span>
      <span className={`shrink-0 ${isToday ? 'underline decoration-2 decoration-sky-500 underline-offset-[3px]' : ''}`}>{day}</span>
    </span>
  );

  const titleColor = (c: AgendaCommitment) =>
    c.completed
      ? (isPaperDark ? 'line-through text-slate-500' : 'line-through text-slate-400')
      : (isPaperDark ? 'text-slate-200' : 'text-slate-800');

  const titleSpan = (c: AgendaCommitment, fragments: string[] | null, index: number, totalInDay: number) => (
    <span
      className={`flex-1 text-[13px] sm:text-sm leading-[17px] tracking-tight sm:tracking-normal break-words cursor-pointer relative min-w-0 translate-y-[1.5px] font-bold ${titleColor(c)}`}
      data-title-anchor={c.id}
      data-testid={`agenda-commitment-title-${c.id}`}
      onClick={() => onStartEdit(c, dateObj, key, index, totalInDay)}
      title="Toque para editar compromisso"
    >
      {fragments && (
        <span aria-hidden className="invisible absolute left-0 right-0 top-0" data-measure-anchor>
          {c.title}
        </span>
      )}
      {fragments ? fragments[0] : c.title}
    </span>
  );

  const continuationRows = (c: AgendaCommitment, fragments: string[] | null, index: number, totalInDay: number) =>
    fragments && fragments.length > 1 && editingId !== c.id
      ? fragments.slice(1).map((ln, i) => (
          <div
            key={`frag-${c.id}-${i}`}
            data-continuation-row={c.id}
            className={rowCls}
            style={{ height: AGENDA_ROW_HEIGHT }}
          >
            <span
              className={`flex-1 text-[13px] sm:text-sm leading-[17px] tracking-tight sm:tracking-normal break-words cursor-pointer min-w-0 translate-y-[1.5px] font-bold ${titleColor(c)}`}
              data-fragment-line
              onClick={() => onStartEdit(c, dateObj, key, index, totalInDay)}
            >
              {ln}
            </span>
          </div>
        ))
      : null;

  const statusIndicator = (c: AgendaCommitment) => {
    const timeStr = commitmentTimeLabel(c);
    const hasAlarm = Boolean(c.alarmAt);
    if (!timeStr && !hasAlarm) return null;
    return (
      <span
        className={`shrink-0 flex items-center gap-1 text-[10px] sm:text-[11px] font-mono ml-auto select-none pl-1.5 ${
          isPaperDark ? 'text-slate-500' : 'text-slate-400'
        }`}
        data-testid={`agenda-status-indicator-${c.id}`}
      >
        {timeStr && <span>{timeStr}</span>}
        {hasAlarm && (
          <Bell size={12} fill="currentColor" className={`${isPaperDark ? 'text-amber-400' : 'text-amber-500'} w-[12px] h-[12px] shrink-0`} />
        )}
      </span>
    );
  };

  const editInput = (c: AgendaCommitment, index: number, totalInDay: number) => {
    const commitId = c.id;
    return (
      <div
        className={`flex flex-col gap-2 flex-1 rounded-2xl shadow-xl p-2.5 sm:p-3 z-40 relative -my-2.5 animate-in zoom-in-95 duration-150 ${
          isPaperDark
            ? 'bg-slate-900 border border-sky-500 ring-4 ring-sky-900/40'
            : 'bg-white border border-sky-400 ring-4 ring-sky-100/70'
        }`}
        data-testid={`agenda-edit-card-${commitId}`}
      >
        <AutoResizeTextarea
          value={editText}
          onChange={(e) => onChangeEditText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && commitId) {
              e.preventDefault();
              onCommitEdit(commitId);
            }
            if (e.key === 'Escape') onCancelEdit();
          }}
          placeholder="Descrição do compromisso..."
          className={`w-full text-[13px] sm:text-sm min-w-0 tracking-tight sm:tracking-normal bg-transparent focus:outline-none font-bold ${
            isPaperDark
              ? 'text-slate-100 placeholder-slate-500'
              : 'text-slate-800 placeholder-slate-400'
          }`}
          autoFocus
          rows={1}
        />

        <div className={`flex items-center justify-between gap-1.5 pt-1.5 border-t flex-wrap ${
          isPaperDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => onOpenAlarm(c)}
              className={`h-8 px-2.5 flex items-center gap-1.5 rounded-xl border text-xs font-bold transition-all ${
                c.alarmAt
                  ? isPaperDark
                    ? 'bg-amber-950/40 border-amber-800/60 text-amber-300 hover:bg-amber-900/40'
                    : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
                  : isPaperDark
                    ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-sky-300'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-sky-700'
              }`}
              title={c.alarmAt ? 'Alterar horário / alarme' : 'Definir horário e alarme'}
              data-testid="agenda-edit-alarm"
            >
              <Bell size={14} fill={c.alarmAt ? 'currentColor' : 'none'} className={c.alarmAt ? (isPaperDark ? 'text-amber-400' : 'text-amber-600') : (isPaperDark ? 'text-slate-400' : 'text-slate-500')} />
              <span>{c.alarmAt ? formatTime(tsToDate(c.alarmAt)) : 'Horário'}</span>
            </button>

            {totalInDay > 1 && (
              <div className="flex items-center gap-0.5" data-testid="agenda-edit-reorder-group">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => {
                    if (index > 0) {
                      onShiftCommitment(key, index, index - 1);
                      if (editingMeta) onSetEditingMeta({ ...editingMeta, index: index - 1 });
                    }
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all ${
                    index === 0
                      ? isPaperDark
                        ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-50/50 border-slate-100 text-slate-300 cursor-not-allowed'
                      : isPaperDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-sky-300 active:scale-95'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-sky-700 active:scale-95'
                  }`}
                  title="Mover para cima"
                  aria-label="Mover para cima"
                  data-testid="agenda-edit-move-up"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  disabled={index === totalInDay - 1}
                  onClick={() => {
                    if (index < totalInDay - 1) {
                      onShiftCommitment(key, index, index + 1);
                      if (editingMeta) onSetEditingMeta({ ...editingMeta, index: index + 1 });
                    }
                  }}
                  className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all ${
                    index === totalInDay - 1
                      ? isPaperDark
                        ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-50/50 border-slate-100 text-slate-300 cursor-not-allowed'
                      : isPaperDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-sky-300 active:scale-95'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-sky-50 hover:text-sky-700 active:scale-95'
                  }`}
                  title="Mover para baixo"
                  aria-label="Mover para baixo"
                  data-testid="agenda-edit-move-down"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                if (commitId) {
                  onOpenDeleteConfirm(commitId, editText || c.title);
                }
              }}
              className={`w-8 h-8 flex items-center justify-center rounded-xl border active:scale-95 transition-all ${
                isPaperDark
                  ? 'border-red-800/60 bg-red-950/40 text-red-400 hover:bg-red-900/50'
                  : 'border-red-200 bg-red-50/80 text-red-600 hover:bg-red-100'
              }`}
              title="Excluir compromisso"
              aria-label="Excluir compromisso"
              data-testid="agenda-edit-delete"
            >
              <Trash2 size={15} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={onCancelEdit}
              className={`h-8 px-2.5 flex items-center justify-center rounded-xl border text-xs font-bold active:scale-95 transition-all ${
                isPaperDark
                  ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
              title="Cancelar"
              aria-label="Cancelar alteração"
              data-testid="agenda-edit-cancel"
            >
              <X size={15} className="mr-0.5" />
              <span>Cancelar</span>
            </button>
            <button
              type="button"
              onClick={() => commitId && onCommitEdit(commitId)}
              className="h-8 px-3 flex items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs hover:brightness-110 active:scale-95 text-xs font-black uppercase tracking-wider transition-all"
              title="Confirmar"
              aria-label="Confirmar alteração"
              data-testid="agenda-edit-confirm"
            >
              <Check size={15} strokeWidth={3} />
              <span>Confirmar</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const addInputControls = () => (
    <div className={`flex flex-col gap-2 flex-1 rounded-2xl shadow-xl p-2.5 sm:p-3 z-40 relative -my-2.5 animate-in zoom-in-95 duration-150 ${
      isPaperDark
        ? 'bg-slate-900 border border-sky-500 ring-4 ring-sky-900/40'
        : 'bg-white border border-sky-400 ring-4 ring-sky-100/70'
    }`}>
      <AutoResizeTextarea
        value={addText}
        onChange={(e) => onChangeAddText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onCommitAdd(dateObj);
          }
          if (e.key === 'Escape') onCancelAdd();
        }}
        placeholder="Digite o compromisso..."
        className={`w-full text-[13px] sm:text-sm min-w-0 tracking-tight sm:tracking-normal bg-transparent focus:outline-none font-bold ${
          isPaperDark
            ? 'text-slate-100 placeholder-slate-500'
            : 'text-slate-800 placeholder-slate-400'
        }`}
        autoFocus
        rows={1}
      />
      <div className={`flex items-center justify-end gap-1.5 pt-1.5 border-t ${
        isPaperDark ? 'border-slate-800' : 'border-slate-100'
      }`}>
        <button
          type="button"
          onClick={onCancelAdd}
          className={`h-8 px-2.5 flex items-center justify-center rounded-xl border text-xs font-bold active:scale-95 transition-all ${
            isPaperDark
              ? 'border-slate-700 text-slate-400 hover:bg-slate-800'
              : 'border-slate-200 text-slate-500 hover:bg-slate-100'
          }`}
          title="Cancelar"
          aria-label="Cancelar adição"
        >
          <X size={15} className="mr-0.5" />
          <span>Cancelar</span>
        </button>
        <button
          type="button"
          onClick={() => onCommitAdd(dateObj)}
          className="h-8 px-3 flex items-center gap-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs hover:brightness-110 active:scale-95 text-xs font-black uppercase tracking-wider transition-all"
          title="Confirmar"
          aria-label="Confirmar novo compromisso"
        >
          <Check size={15} strokeWidth={3} />
          <span>Confirmar</span>
        </button>
      </div>
    </div>
  );

  const checkbox = (c: AgendaCommitment) => (
    <button
      onClick={() => c.id && onToggleCommitment(c.id, !c.completed)}
      className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors mb-px ${
        c.completed
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : isPaperDark
            ? 'border-slate-600 hover:border-sky-400'
            : 'border-slate-300 hover:border-sky-400'
      }`}
    >
      {c.completed && <Check size={11} strokeWidth={3} className="w-[11px] h-[11px]" />}
    </button>
  );

  const hoverCls = isPaperDark ? 'hover:bg-slate-800/50' : 'hover:bg-sky-50/50';

  return (
    <div key={key}>
      <div
        id={`agenda-day-${year}-${month}-${day}`}
        data-commit-id={firstCommit?.id}
        className={`${rowCls} group ${isEmpty && !isAdding ? `cursor-pointer ${hoverCls} rounded-sm` : ''}`}
        style={{ height: AGENDA_ROW_HEIGHT }}
        onClick={isEmpty && !isAdding ? () => onStartAdd(key) : undefined}
      >
        {dayLabel}

        {isEmpty ? (
          isAdding ? (
            addInputControls()
          ) : (
            <span className={`text-[11px] flex-1 ${isPaperDark ? 'text-slate-600' : 'text-slate-300'}`}>—</span>
          )
        ) : (
          firstCommit &&
            (editingId === firstCommit.id ? (
              editInput(firstCommit, 0, commitments.length)
            ) : (
              <>
                {checkbox(firstCommit)}
                {titleSpan(firstCommit, firstFragments, 0, commitments.length)}
                {statusIndicator(firstCommit)}
              </>
            ))
        )}
      </div>

      {continuationRows(firstCommit, firstFragments, 0, commitments.length)}

      {restCommits.map((c, restIdx) => {
        const cId = c.id ?? '';
        const cLines = cId ? commitLines[cId] : undefined;
        const cFragments = cLines && cLines.length > 1 ? cLines : null;
        const currentIdx = restIdx + 1;
        return (
          <div key={c.id}>
            <div
              id={c.id ? `agenda-commitment-${c.id}` : undefined}
              data-commit-id={c.id}
              className={`${rowCls} ${hoverCls} rounded-sm group`}
              style={{ height: AGENDA_ROW_HEIGHT }}
            >
              <span className="w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 pr-1.5" aria-hidden="true" />
              {editingId === c.id ? (
                editInput(c, currentIdx, commitments.length)
              ) : (
                <>
                  {checkbox(c)}
                  {titleSpan(c, cFragments, currentIdx, commitments.length)}
                  {statusIndicator(c)}
                </>
              )}
            </div>
            {continuationRows(c, cFragments, currentIdx, commitments.length)}
          </div>
        );
      })}

      {!isEmpty ? (
        isAdding ? (
          <div className="relative flex items-end gap-1.5 md:gap-3 -mx-2 px-2 sm:-mx-4 sm:px-4" style={{ height: AGENDA_ROW_HEIGHT }}>
            <span className="w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 pr-1.5" aria-hidden="true" />
            {addInputControls()}
          </div>
        ) : (
          <div
            className={`relative flex items-end gap-1.5 md:gap-3 -mx-2 px-2 sm:-mx-4 sm:px-4 cursor-pointer ${hoverCls} rounded-sm group`}
            onClick={() => onStartAdd(key)}
            style={{ height: AGENDA_ROW_HEIGHT }}
          >
            <span className="w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 pr-1.5" aria-hidden="true" />
          </div>
        )
      ) : (
        <div
          className="relative flex items-end gap-1.5 md:gap-3 -mx-2 px-2 sm:-mx-4 sm:px-4"
          style={{ height: AGENDA_ROW_HEIGHT }}
          aria-hidden="true"
        >
          <span className="w-[62px] min-w-[62px] max-w-[85px] md:w-[70px] md:min-w-[70px] shrink-0 pr-1.5" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

export default AgendaDayRow;
