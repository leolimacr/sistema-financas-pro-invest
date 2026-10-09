import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { resolveAppRoute } from '../utils/deepLinkRouter';
import type { NexusInsight } from './nexusInsightEngine';
import type { RecurringBill } from '../types'; // Adicionado

// IDs reservados por categoria para evitar duplicatas
const NOTIFICATION_IDS = {
  debt_due: 201,
  debt_inactive: 202,
  debt_context: 203,
  wealth_aport: 204,
  wealth_goal: 205,
  nexus_insight: 206,
  reengagement: 207,
  daily_reminder: 208,
  recurring_bill_due: 209, // NOVO: ID para notificações de contas recorrentes
} as const;

const buildRecurringBillNotificationId = (billId: string): number => {
  let hash = 0;
  for (let i = 0; i < billId.length; i += 1) {
    hash = (hash * 31 + billId.charCodeAt(i)) | 0;
  }
  return NOTIFICATION_IDS.recurring_bill_due + Math.abs(hash % 1000000);
};

const getLastDayOfMonth = (year: number, monthIndex: number): number => new Date(year, monthIndex + 1, 0).getDate();

const buildNextRecurringBillDueDate = (bill: RecurringBill, now = new Date()): Date => {
  const buildForMonth = (year: number, monthIndex: number) => {
    const day = Math.min(Math.max(1, bill.dueDay), getLastDayOfMonth(year, monthIndex));
    return new Date(year, monthIndex, day, 6, 0, 0, 0);
  };

  let scheduled = buildForMonth(now.getFullYear(), now.getMonth());
  if (scheduled.getTime() <= now.getTime()) {
    scheduled = buildForMonth(now.getFullYear(), now.getMonth() + 1);
  }

  if (bill.lastPaidDate) {
    const lastPaid = new Date(bill.lastPaidDate);
    if (
      lastPaid.getFullYear() === scheduled.getFullYear() &&
      lastPaid.getMonth() === scheduled.getMonth()
    ) {
      scheduled = buildForMonth(scheduled.getFullYear(), scheduled.getMonth() + 1);
    }
  }

  return scheduled;
};

export type NotificationCategory = keyof typeof NOTIFICATION_IDS;

export interface PresenceNotificationPayload {
  category: NotificationCategory;
  title: string;
  body: string;
  deepLink?: string;
}

export const NotificationService = {
  async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === 'granted';
    } catch (error) {
      console.error('[NotificationService] Erro ao solicitar permissão:', error);
      return false;
    }
  },

  // Despacha um push contextual a partir de um evento de presença
  // Chamado pelo PresenceEventService após validar cooldown e frequency cap
  async dispatch(payload: PresenceNotificationPayload): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const id = NOTIFICATION_IDS[payload.category];

    try {
      // Cancela notificação anterior da mesma categoria (evita empilhamento)
      await LocalNotifications.cancel({ notifications: [{ id }] });

      const resolvedDeepLink = resolveAppRoute(payload.deepLink, payload.category);

      await LocalNotifications.schedule({
        notifications: [
          {
            title: payload.title,
            body: payload.body,
            id,
            schedule: { at: new Date(Date.now() + 500) }, // imediato
            sound: 'default',
            smallIcon: 'ic_stat_fpi',
            largeIcon: 'ic_stat_logo',
            iconColor: '#0284c7',
            extra: { 
              deepLink: resolvedDeepLink,
              targetRoute: resolvedDeepLink,
              category: payload.category,
              eventType: payload.category,
            },
          },
        ],
      });
    } catch (error) {
      console.error(`[NotificationService] Erro ao despachar categoria ${payload.category}:`, error);
    }
  },

  async scheduleDailyReminder(insight?: NexusInsight | null): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const title = insight?.message.title || "Hora de organizar?";
    const body = insight?.message.body || "Que tal registrar suas movimentações de hoje? Manter a rotina gera clareza.";
    const deepLink = insight?.deepLink ? resolveAppRoute(insight.deepLink) : '/app/controla?action=new-transaction';

    try {
      await this.cancelCategory('daily_reminder');
      
      const scheduledTime = new Date();
      scheduledTime.setHours(20, 0, 0, 0); // Todo dia às 20h
      
      // Se já passou das 20h hoje, agenda para amanhã
      if (new Date().getTime() > scheduledTime.getTime()) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_IDS.daily_reminder,
            title,
            body,
            schedule: {
              at: scheduledTime,
              repeats: true,
              every: 'day',
              allowWhileIdle: true,
            },
            sound: 'default',
            smallIcon: 'ic_stat_fpi',
            largeIcon: 'ic_stat_logo',
            iconColor: '#0284c7',
            extra: { 
              deepLink,
              targetRoute: deepLink,
              eventType: 'daily_reminder',
            },
          }
        ]
      });
    } catch (error) {
      console.error('[NotificationService] Erro ao agendar lembrete diário:', error);
    }
  },

  async scheduleReengagementReminder(estimatedBalance: number): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    try {
      await this.cancelCategory('reengagement');

      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      threeDaysLater.setHours(10, 0, 0, 0); // Às 10h da manhã

      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_IDS.reengagement,
            title: "Foco na Eficiência",
            body: `Seu saldo atual estimado é de ${formatCurrency(estimatedBalance)}. Mantenha a precisão lançando suas últimas compras.`,
            schedule: { at: threeDaysLater },
            sound: 'default',
            smallIcon: 'ic_stat_fpi',
            largeIcon: 'ic_stat_logo',
            iconColor: '#0284c7',
            extra: { 
              deepLink: '/app/controla?action=new-transaction',
              targetRoute: '/app/controla?action=new-transaction',
              eventType: 'reengagement',
            },
          }
        ]
      });
    } catch (error) {
      console.error('[NotificationService] Erro ao agendar reengajamento:', error);
    }
  },

  async scheduleRecurringBillDueNotification(bill: RecurringBill, userId: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const notificationTime = buildNextRecurringBillDueDate(bill);
      const id = buildRecurringBillNotificationId(bill.id);

      await LocalNotifications.cancel({ notifications: [{ id }] }); // Cancelar anterior se existir

      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title: `💸 Sua conta ${bill.name} vence hoje!`,
            body: 'Você já pode marcar esta despesa como paga ou revisar no Controla.',
            schedule: { at: notificationTime },
            sound: 'default',
            smallIcon: 'ic_stat_fpi',
            largeIcon: 'ic_stat_logo',
            iconColor: '#0284c7',
            extra: {
              deepLink: `app://mark-bill-paid/${bill.id}`,
              targetRoute: `/app/controla?view=contas&highlightBill=${bill.id}`,
              eventType: 'recurring_bill_due',
              billId: bill.id, // Passar o ID da conta para o deepLink
              userId,
            },
          },
        ],
      });
    } catch (error) {
      console.error(`[NotificationService] Erro ao agendar notificação para conta ${bill.name}:`, error);
    }
  },

  async cancelCategory(category: NotificationCategory): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_IDS[category] }] });
    } catch (error) {
      console.error(`[NotificationService] Erro ao cancelar ${category}:`, error);
    }
  },

  async cancelAll(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const all = Object.values(NOTIFICATION_IDS).map(id => ({ id }));
      await LocalNotifications.cancel({ notifications: all });
    } catch (error) {
      console.error('[NotificationService] Erro ao cancelar todas:', error);
    }
  },
};
