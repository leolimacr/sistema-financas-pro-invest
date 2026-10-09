import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { formatTime } from '../../agenda/agendaTypes';
import type { AgendaReminderMode } from '../../services/agendaService';

interface AlarmTarget {
  id: string;
  date: Date;
  title: string;
  currentAlarm?: Date;
  currentMode?: AgendaReminderMode;
}

interface AgendaAlarmModalProps {
  target: AlarmTarget | null;
  onClose: () => void;
  onSetAlarm: (time: string, mode: AgendaReminderMode) => void;
  onClearAlarm: () => void;
}

export const AgendaAlarmModal: React.FC<AgendaAlarmModalProps> = ({
  target,
  onClose,
  onSetAlarm,
  onClearAlarm,
}) => {
  const [selectedMode, setSelectedMode] = useState<AgendaReminderMode>('notification_alarm');

  useEffect(() => {
    if (target) {
      setSelectedMode(target.currentMode || 'notification_alarm');
    }
  }, [target]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/30 flex items-end md:items-center justify-center p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">Configurar Aviso</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 truncate">{target.title}</p>
        {target.currentAlarm && (
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            Horário atual: {formatTime(target.currentAlarm)}
          </p>
        )}

        <div>
          <label htmlFor="alarm-time-input" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-1.5 block">
            Horário do disparo
          </label>
          <input
            type="time"
            defaultValue={target.currentAlarm ? formatTime(target.currentAlarm) : ''}
            id="alarm-time-input"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 dark:focus:border-sky-400 transition-all"
            autoFocus
          />
        </div>

        {/* Seletor Triplo de Modo */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-1.5 block">
            Tipo de Aviso
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedMode('notification')}
              className={`py-2.5 px-2 rounded-xl text-center border transition-all ${
                selectedMode === 'notification'
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-black shadow-sm ring-2 ring-sky-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold'
              }`}
            >
              <span className="text-base block mb-0.5">🔔</span>
              <span className="text-[10px] uppercase tracking-wider block">Notificação</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('alarm')}
              className={`py-2.5 px-2 rounded-xl text-center border transition-all ${
                selectedMode === 'alarm'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-black shadow-sm ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold'
              }`}
            >
              <span className="text-base block mb-0.5">⏰</span>
              <span className="text-[10px] uppercase tracking-wider block">Alarme</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedMode('notification_alarm')}
              className={`py-2.5 px-2 rounded-xl text-center border transition-all ${
                selectedMode === 'notification_alarm'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-black shadow-sm ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold'
              }`}
            >
              <span className="text-base block mb-0.5">🔔+⏰</span>
              <span className="text-[10px] uppercase tracking-wider block">Ambos</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 leading-tight">
            {selectedMode === 'notification' && 'Aviso visual padrão com som breve (sem repetição).'}
            {selectedMode === 'alarm' && 'Alarme contínuo em loop até dispensar ou adiar.'}
            {selectedMode === 'notification_alarm' && 'Notificação no aparelho + alarme sonoro contínuo com tela de despertar.'}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          {target.currentAlarm && (
            <button
              onClick={onClearAlarm}
              className="flex-1 py-3 rounded-xl border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              Remover
            </button>
          )}
          <button
            onClick={() => {
              const input = document.getElementById('alarm-time-input') as HTMLInputElement;
              if (input?.value) onSetAlarm(input.value, selectedMode);
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
          >
            Definir
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgendaAlarmModal;
