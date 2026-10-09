import React, { useEffect, useState, useCallback } from 'react';
import { BellRing, Check, Clock, Volume2 } from 'lucide-react';
import {
  continuousAlarmPlayer,
  type ActiveAlarmPayload,
} from '../../services/continuousAlarmPlayer';
import { dismissAlarm, snoozeAlarm } from '../../services/alarmService';

export const ActiveAlarmModal: React.FC = () => {
  const [active, setActive] = useState(false);
  const [payload, setPayload] = useState<ActiveAlarmPayload | null>(null);

  useEffect(() => {
    const unsubscribe = continuousAlarmPlayer.subscribe((isPlaying, activePayload) => {
      setActive(isPlaying);
      setPayload(activePayload);
    });
    return unsubscribe;
  }, []);

  const handleDismiss = useCallback(() => {
    dismissAlarm();
  }, []);

  const handleSnooze = useCallback(() => {
    if (payload) {
      void snoozeAlarm(
        {
          commitmentId: payload.commitmentId,
          title: payload.title,
          dateStr: payload.dateStr,
          alarmAt: new Date(),
          userId: payload.userId,
        },
        5
      );
    } else {
      dismissAlarm();
    }
  }, [payload]);

  // Teclado: Escape ou Espaço para dispensar
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, handleDismiss]);

  if (!active || !payload) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="alarm-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-sm rounded-[2.5rem] bg-white dark:bg-slate-900 p-7 shadow-2xl border-2 border-emerald-500/40 dark:border-emerald-500/60 text-center animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Halo luminoso de pulso */}
        <div className="absolute -top-12 -left-12 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-sky-500/15 rounded-full blur-2xl animate-pulse pointer-events-none" />

        {/* Ícone com anel pulsante */}
        <div className="mx-auto mb-5 relative flex items-center justify-center w-20 h-20 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-inner">
          <span className="absolute inset-0 rounded-3xl bg-emerald-400/20 animate-ping opacity-75" />
          <BellRing size={38} className="animate-bounce relative z-10" />
        </div>

        {/* Tag de Alarme Ativo */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-black uppercase tracking-widest mb-3">
          <Volume2 size={12} className="animate-pulse" />
          <span>Alarme da Agenda</span>
        </div>

        {/* Título do Compromisso */}
        <h2
          id="alarm-modal-title"
          className="text-xl font-black text-slate-900 dark:text-white leading-snug tracking-tight mb-2 px-2 break-words"
        >
          {payload.title}
        </h2>

        {/* Data / Horário */}
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6 flex items-center justify-center gap-1.5">
          <Clock size={13} className="text-slate-400 dark:text-slate-500" />
          <span>Horário programado atingido</span>
        </p>

        {/* Ações: Dispensar ou Soneca */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleDismiss}
            autoFocus
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Check size={16} />
            <span>Dispensar Alarme</span>
          </button>

          <button
            type="button"
            onClick={handleSnooze}
            className="w-full py-3 px-6 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Clock size={14} className="text-slate-500 dark:text-slate-400" />
            <span>Soneca (+5 min)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveAlarmModal;
