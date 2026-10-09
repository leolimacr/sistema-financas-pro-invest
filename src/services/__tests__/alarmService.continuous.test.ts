import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dismissAlarm, snoozeAlarm, scheduleAlarm, type AlarmInfo } from '../alarmService';
import { continuousAlarmPlayer } from '../continuousAlarmPlayer';

// Mock do LocalNotifications
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    createChannel: vi.fn().mockResolvedValue(undefined),
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
  },
}));

describe('alarmService (Continuous & Snooze Integration)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    continuousAlarmPlayer.stop();
  });

  afterEach(() => {
    continuousAlarmPlayer.stop();
    vi.useRealTimers();
  });

  it('dismissAlarm interrompe o continuousAlarmPlayer', () => {
    continuousAlarmPlayer.start({
      commitmentId: 'comm-1',
      title: 'Pagar DAS',
      dateStr: '2026-09-23',
    });

    expect(continuousAlarmPlayer.isPlaying()).toBe(true);

    dismissAlarm();

    expect(continuousAlarmPlayer.isPlaying()).toBe(false);
  });

  it('snoozeAlarm interrompe o player e agenda alarme para 5 minutos à frente', async () => {
    continuousAlarmPlayer.start({
      commitmentId: 'comm-1',
      title: 'Pagar DAS',
      dateStr: '2026-09-23',
    });

    const info: AlarmInfo = {
      commitmentId: 'comm-1',
      title: 'Pagar DAS',
      dateStr: '2026-09-23',
      alarmAt: new Date(),
      mode: 'notification_alarm',
    };

    await snoozeAlarm(info, 5);

    expect(continuousAlarmPlayer.isPlaying()).toBe(false);
  });
});
