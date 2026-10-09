import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockSchedule = vi.hoisted(() => vi.fn());
const mockCancelNative = vi.hoisted(() => vi.fn());

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: mockSchedule,
    cancel: mockCancelNative,
  },
}));

import {
  scheduleAlarm,
  cancelAlarm,
  startAlarmChecker,
  stopAlarmChecker,
  resetAlarmState,
  setAlarmCallback,
} from '../alarmService';
import type { AlarmInfo } from '../alarmService';

const makeAlarm = (overrides?: Partial<AlarmInfo>): AlarmInfo => ({
  commitmentId: 'c-1',
  title: 'Compromisso',
  dateStr: '2026-07-29',
  alarmAt: new Date(0),
  ...overrides,
});

describe('alarmService', () => {
  let onAlarmSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    resetAlarmState();
    onAlarmSpy = vi.fn();
    setAlarmCallback(onAlarmSpy as (info: AlarmInfo) => void);
  });

  afterEach(() => {
    stopAlarmChecker();
    resetAlarmState();
    vi.useRealTimers();
    setAlarmCallback(() => {});
  });

  describe('scheduleAlarm (desktop)', () => {
    it('não chama LocalNotifications no desktop', async () => {
      await scheduleAlarm(makeAlarm());
      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });

  describe('cancelAlarm (desktop)', () => {
    it('não chama LocalNotifications no desktop', async () => {
      await cancelAlarm('c-1');
      expect(mockCancelNative).not.toHaveBeenCalled();
    });
  });

  describe('startAlarmChecker', () => {
    it('dispara alarme quando diff está em [-1000, 30000]', () => {
      // Clock starts at Date.now(). After advanceTimersByTime(30000), clock = Date.now() + 30000.
      // alarmAt = Date.now() + 31000 → diff = 31000 - 30000 = 1000 ∈ [-1000, 30000] → dispara.
      const alarmAt = new Date(Date.now() + 31000);
      startAlarmChecker([makeAlarm({ alarmAt })]);

      vi.advanceTimersByTime(30000);

      expect(onAlarmSpy).toHaveBeenCalledTimes(1);
    });

    it('não dispara alarme com diff > 30s (muito no futuro)', () => {
      // diff = 63100 - 30000 = 33100 > 30000 → não dispara.
      const alarmAt = new Date(Date.now() + 63100);
      startAlarmChecker([makeAlarm({ alarmAt })]);

      vi.advanceTimersByTime(30000);

      expect(onAlarmSpy).not.toHaveBeenCalled();
    });

    it('não dispara alarme com diff < -1000 (muito no passado)', () => {
      // diff = 5000 - 30000 = -25000 < -1000 → não dispara.
      const alarmAt = new Date(Date.now() + 5000);
      startAlarmChecker([makeAlarm({ alarmAt })]);

      vi.advanceTimersByTime(30000);

      expect(onAlarmSpy).not.toHaveBeenCalled();
    });

    it('não dispara o mesmo alarme duas vezes (dedup)', () => {
      // diff₁ = 60000 - 30000 = 30000 ∈ [-1000, 30000] → dispara.
      // diff₂ = 60000 - 60000 = 0 ∈ [-1000, 30000] mas firedIds bloqueia.
      const alarmAt = new Date(Date.now() + 60000);
      startAlarmChecker([makeAlarm({ alarmAt })]);

      vi.advanceTimersByTime(30000);
      expect(onAlarmSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(30000);
      expect(onAlarmSpy).toHaveBeenCalledTimes(1);
    });

    it('dispara alarmes independentemente', () => {
      // Ambos diff = 31000 - 30000 = 1000 → ambos disparam.
      const alarmAt = new Date(Date.now() + 31000);
      startAlarmChecker([
        makeAlarm({ commitmentId: 'c-1', alarmAt }),
        makeAlarm({ commitmentId: 'c-2', alarmAt }),
      ]);

      vi.advanceTimersByTime(30000);

      expect(onAlarmSpy).toHaveBeenCalledTimes(2);
    });

    it('limpa firedIds após diff < -60000', () => {
      // 1° tick: diff = 31000 - 30000 = 1000 → dispara.
      // 2° tick: diff = 31000 - 120000 = -89000 < -60000 → firedIds.delete.
      const alarmAt = new Date(Date.now() + 31000);
      startAlarmChecker([makeAlarm({ alarmAt })]);

      vi.advanceTimersByTime(30000);
      expect(onAlarmSpy).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(90000);
      expect(onAlarmSpy).toHaveBeenCalledTimes(1);
    });
  });
});
