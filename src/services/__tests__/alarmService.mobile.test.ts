import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSchedule = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockCancelNative = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: mockSchedule,
    cancel: mockCancelNative,
  },
}));

import { scheduleAlarm, cancelAlarm } from '../alarmService';
import type { AlarmInfo } from '../alarmService';

const makeAlarm = (overrides?: Partial<AlarmInfo>): AlarmInfo => ({
  commitmentId: 'c-100',
  title: 'Consulta Médica',
  dateStr: '2026-09-20',
  alarmAt: new Date('2026-09-20T14:30:00Z'),
  ...overrides,
});

describe('alarmService (mobile nativo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scheduleAlarm inclui smallIcon ic_stat_fpi, largeIcon ic_stat_logo e iconColor #0284c7', async () => {
    const alarm = makeAlarm();
    await scheduleAlarm(alarm);

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const notification = mockSchedule.mock.calls[0][0].notifications[0];
    expect(notification.title).toBe('Agenda');
    expect(notification.body).toBe('Consulta Médica');
    expect(notification.smallIcon).toBe('ic_stat_fpi');
    expect(notification.largeIcon).toBe('ic_stat_logo');
    expect(notification.iconColor).toBe('#0284c7');
    expect(notification.sound).toBe('default');
    expect(notification.extra).toEqual({
      commitmentId: 'c-100',
      dateStr: '2026-09-20',
      deepLink: '/app/agenda',
      targetRoute: '/app/agenda',
      eventType: 'agenda.alarm_due',
    });
  });

  it('cancelAlarm cancela notificação nativa correspondente', async () => {
    await cancelAlarm('c-100');
    expect(mockCancelNative).toHaveBeenCalledTimes(1);
  });
});
