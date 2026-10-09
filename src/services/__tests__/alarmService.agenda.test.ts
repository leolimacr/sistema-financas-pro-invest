import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  startAlarmChecker,
  stopAlarmChecker,
  resetAlarmState,
  setAlarmCallback,
  type AlarmInfo,
} from '../alarmService';

function alarmIn(msFromNow: number): AlarmInfo {
  return {
    commitmentId: 'c1',
    title: 'Reunião',
    dateStr: '2026-09-06',
    alarmAt: new Date(Date.now() + msFromNow),
    mode: 'notification',
  };
}

describe('alarmService - memória de disparo fora do ciclo do checker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-06T12:00:00Z'));
    resetAlarmState();
    setAlarmCallback(() => {});
  });

  afterEach(() => {
    stopAlarmChecker();
    resetAlarmState();
    setAlarmCallback(() => {});
    vi.useRealTimers();
  });

  it('stop + start (reload de dados) dentro da janela não re-dispara', () => {
    const onDue = vi.fn();
    setAlarmCallback(onDue);

    // Alarme a 59.5s: tick@30s → diff +29.5s (dentro da janela) → dispara 1×.
    startAlarmChecker([alarmIn(59500)]);
    vi.advanceTimersByTime(30000);
    expect(onDue).toHaveBeenCalledTimes(1);

    // Simula reload de dados (stop + start com a lista atualizada).
    stopAlarmChecker();
    startAlarmChecker([alarmIn(29500)]);
    // tick@60s → diff −0.5s (ainda na janela) → NÃO pode disparar de novo.
    vi.advanceTimersByTime(30000);
    expect(onDue).toHaveBeenCalledTimes(1);
  });

  it('resetAlarmState (troca de usuário/unmount) libera novo disparo', () => {
    const onDue = vi.fn();
    setAlarmCallback(onDue);

    startAlarmChecker([alarmIn(59500)]);
    vi.advanceTimersByTime(30000);
    expect(onDue).toHaveBeenCalledTimes(1);

    resetAlarmState();
    startAlarmChecker([alarmIn(59500)]);
    vi.advanceTimersByTime(30000);
    expect(onDue).toHaveBeenCalledTimes(2);
  });
});
