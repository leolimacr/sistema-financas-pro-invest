import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSchedule = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockCancel = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockRequestPermissions = vi.hoisted(() => vi.fn().mockResolvedValue({ display: 'granted' }));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    schedule: mockSchedule,
    cancel: mockCancel,
    requestPermissions: mockRequestPermissions,
  },
}));

import { NotificationService } from '../NotificationService';
import type { RecurringBill } from '../../types';

describe('NotificationService - Ícones e Configurações Mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('dispatch inclui smallIcon ic_stat_fpi, largeIcon ic_stat_logo e iconColor #0284c7', async () => {
    await NotificationService.dispatch({
      title: 'Aviso Financeiro',
      body: 'Seu saldo livre precisa de atenção.',
      category: 'nexus_insight',
      deepLink: 'central',
    });

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const notification = mockSchedule.mock.calls[0][0].notifications[0];
    expect(notification.smallIcon).toBe('ic_stat_fpi');
    expect(notification.largeIcon).toBe('ic_stat_logo');
    expect(notification.iconColor).toBe('#0284c7');
    expect(notification.title).toBe('Aviso Financeiro');
    expect(notification.body).toBe('Seu saldo livre precisa de atenção.');
  });

  it('scheduleDailyReminder inclui smallIcon ic_stat_fpi, largeIcon ic_stat_logo e iconColor #0284c7', async () => {
    await NotificationService.scheduleDailyReminder();

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const notification = mockSchedule.mock.calls[0][0].notifications[0];
    expect(notification.smallIcon).toBe('ic_stat_fpi');
    expect(notification.largeIcon).toBe('ic_stat_logo');
    expect(notification.iconColor).toBe('#0284c7');
  });

  it('scheduleReengagementReminder inclui smallIcon ic_stat_fpi, largeIcon ic_stat_logo e iconColor #0284c7', async () => {
    await NotificationService.scheduleReengagementReminder(1500);

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const notification = mockSchedule.mock.calls[0][0].notifications[0];
    expect(notification.smallIcon).toBe('ic_stat_fpi');
    expect(notification.largeIcon).toBe('ic_stat_logo');
    expect(notification.iconColor).toBe('#0284c7');
  });

  it('scheduleRecurringBillDueNotification inclui smallIcon ic_stat_fpi, largeIcon ic_stat_logo e iconColor #0284c7', async () => {
    const mockBill: RecurringBill = {
      id: 'bill-netflix',
      name: 'Netflix',
      amount: 55.9,
      dueDay: 15,
      frequency: 'monthly',
      category: 'Lazer',
      active: true,
      autoRenew: true,
      reminderDays: 1,
    };

    await NotificationService.scheduleRecurringBillDueNotification(mockBill, 'user-123');

    expect(mockSchedule).toHaveBeenCalledTimes(1);
    const notification = mockSchedule.mock.calls[0][0].notifications[0];
    expect(notification.smallIcon).toBe('ic_stat_fpi');
    expect(notification.largeIcon).toBe('ic_stat_logo');
    expect(notification.iconColor).toBe('#0284c7');
    expect(notification.title).toContain('Netflix');
  });
});
