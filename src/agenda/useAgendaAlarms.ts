import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AgendaCommitment, AgendaReminderMode } from '../services/agendaService';
import { updateCommitment } from '../services/agendaService';
import {
  scheduleAlarm,
  cancelAlarm,
  requestNotificationPermission,
  startAlarmChecker,
  stopAlarmChecker,
  setAlarmCallback,
  type AlarmInfo,
} from '../services/alarmService';
import { tsToDate, toDateInputStr, formatTime } from './agendaTypes';

export interface UseAgendaAlarmsParams {
  userId?: string;
  allMonths: Record<string, AgendaCommitment[]>;
  reloadData: () => void;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigate?: (tool: string, state?: any) => void;
}

export function useAgendaAlarms({
  userId,
  allMonths,
  reloadData,
  addToast,
  onNavigate,
}: UseAgendaAlarmsParams) {
  const navigate = useNavigate();
  const [alarmTarget, setAlarmTarget] = useState<{
    id: string;
    date: Date;
    title: string;
    currentAlarm?: Date;
    currentMode?: AgendaReminderMode;
  } | null>(null);

  // Pedir permissão de notificação (desktop) na primeira visita
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Callback de disparo de alarme
  useEffect(() => {
    setAlarmCallback((info: AlarmInfo) => {
      if (onNavigate) {
        onNavigate('agenda', { date: info.dateStr });
      } else {
        navigate(`/app/agenda?date=${info.dateStr}`);
      }
    });
    return () => setAlarmCallback(() => {});
  }, [navigate, onNavigate]);

  // Coletar compromissos com alarme e iniciar checker
  useEffect(() => {
    const alarms: AlarmInfo[] = [];
    for (const [, commitments] of Object.entries(allMonths)) {
      for (const c of commitments) {
        if (c.alarmAt && c.id) {
          const d = tsToDate(c.alarmAt);
          alarms.push({
            commitmentId: c.id,
            title: c.title,
            dateStr: toDateInputStr(tsToDate(c.date)),
            alarmAt: d,
            mode: c.reminderMode || 'notification',
            userId: userId || undefined,
          });
        }
      }
    }
    startAlarmChecker(alarms);
    return () => stopAlarmChecker();
  }, [allMonths, userId]);

  const openAlarm = useCallback((c: AgendaCommitment) => {
    const d = tsToDate(c.date);
    setAlarmTarget({
      id: c.id ?? '',
      date: d,
      title: c.title,
      currentAlarm: c.alarmAt ? tsToDate(c.alarmAt) : undefined,
      currentMode: c.reminderMode || 'notification_alarm',
    });
  }, []);

  const setAlarm = useCallback(async (time: string, mode: AgendaReminderMode = 'notification_alarm') => {
    if (!userId || !alarmTarget) return;
    const [h, m] = time.split(':').map(Number);
    const alarmDate = new Date(alarmTarget.date);
    alarmDate.setHours(h, m, 0, 0);
    try {
      await updateCommitment(userId, alarmTarget.id, {
        alarmAt: alarmDate,
        reminderMode: mode,
      });
      await scheduleAlarm({
        commitmentId: alarmTarget.id,
        title: alarmTarget.title,
        dateStr: toDateInputStr(alarmTarget.date),
        alarmAt: alarmDate,
        mode,
        userId,
      });
      reloadData();
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Agenda] Erro ao definir alarme', e);
      addToast('Erro ao definir alarme', 'error');
    }
    setAlarmTarget(null);
  }, [userId, alarmTarget, reloadData, addToast]);

  const clearAlarm = useCallback(async () => {
    if (!userId || !alarmTarget) return;
    try {
      await updateCommitment(userId, alarmTarget.id, {
        alarmAt: null,
        reminderMode: null,
      });
      await cancelAlarm(alarmTarget.id);
      reloadData();
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Agenda] Erro ao remover alarme', e);
      addToast('Erro ao remover alarme', 'error');
    }
    setAlarmTarget(null);
  }, [userId, alarmTarget, reloadData, addToast]);

  return {
    alarmTarget,
    setAlarmTarget,
    openAlarm,
    setAlarm,
    clearAlarm,
  };
}
