import { firestore } from '../firebase';
import {
  collection, addDoc, doc, getDoc, setDoc, updateDoc,
  query, where, getDocs, Timestamp, increment, limit,
} from 'firebase/firestore';
import type { RecurringBill } from '../types';
import type { PresenceNotificationPayload, NotificationCategory } from './NotificationService';
import { NotificationService } from './NotificationService';

// Mapeamento de urgência para score numérico (usado no orderBy do Firestore)
export const URGENCY_SCORE: Record<'high' | 'medium' | 'low', number> = {
  high: 3,
  medium: 2,
  low: 1,
};

// Mapeamento de categoria para canal principal
const CATEGORY_CHANNEL: Record<string, 'push' | 'in_app' | 'email'> = {
  'debt.due_soon_3d': 'push',
  'debt.due_soon_7d': 'in_app',
  'debt.missing_data': 'in_app',
  'debt.inactive_7d': 'push',
  'debt.context_changed': 'in_app',
  'debt.plan_stale_30d': 'email',
  'debt.new_debt_added': 'in_app',
  'debt.rotativo_converted': 'push',
  'debt.rotativo_interest_applied': 'in_app',
  'wealth.review_overdue_14d': 'in_app',
  'wealth.aport_upcoming': 'push',
  'wealth.goal_near': 'in_app',
  'wealth.liabilities_stale': 'email',
  'nexus.insight_ready': 'push',
  'reengagement.inactive_14d': 'push',
};

const EVENT_TO_NOTIFICATION_CATEGORY: Partial<Record<string, NotificationCategory>> = {
  'debt.due_soon_3d': 'debt_due',
  'debt.inactive_7d': 'debt_inactive',
  'debt.context_changed': 'debt_context',
  'debt.rotativo_converted': 'debt_due',
  'wealth.aport_upcoming': 'wealth_aport',
  'wealth.goal_near': 'wealth_goal',
  'nexus.insight_ready': 'nexus_insight',
  'reengagement.inactive_14d': 'reengagement',
};

export interface CreatePresenceEventParams {
  uid: string;
  eventType: string;
  persona: 'debts' | 'wealth';
  urgency: 'high' | 'medium' | 'low';
  message: { title: string; body: string; ctaLabel: string };
  deepLink: string;
  cooldownHours: number;
  expiresInHours: number;
  resourceId?: string; // ID da dívida, meta ou ativo relacionado
  payload?: Record<string, unknown>;
}

const RECURRING_BILL_DUE_EVENT = 'finance.recurring_bill_due_today';

export const PresenceEventService = {
  async createRecurringBillDue(uid: string, bill: RecurringBill): Promise<boolean> {
    return this.create({
      uid,
      eventType: RECURRING_BILL_DUE_EVENT,
      persona: 'wealth',
      urgency: 'high',
      message: {
        title: `${bill.name} vence hoje`,
        body: 'Você já pode marcar esta despesa como paga ou revisar no Controla.',
        ctaLabel: 'Marcar como paga',
      },
      deepLink: 'manager',
      cooldownHours: 24,
      expiresInHours: 72,
      resourceId: bill.id,
      payload: {
        billId: bill.id,
        billName: bill.name,
        amount: bill.amount,
        dueDay: bill.dueDay,
      },
    });
  },

  async markRecurringBillActioned(uid: string, billId: string): Promise<void> {
    try {
      const eventsRef = collection(firestore, 'users', uid, 'presenceEvents');
      const q = query(
        eventsRef,
        where('eventType', '==', RECURRING_BILL_DUE_EVENT),
        where('resourceId', '==', billId),
        limit(5),
      );
      const snap = await getDocs(q);
      await Promise.all(
        snap.docs.map((d) => updateDoc(d.ref, {
          status: 'actioned',
          read: true,
          actionedAt: Timestamp.now(),
        }))
      );
    } catch {
      // Silencioso — não bloqueia o fluxo de pagamento
    }
  },

  async createNexusAdvisorAlert(
    uid: string,
    alert: {
      id: string;
      title: string;
      body: string;
      ctaLabel?: string;
      deepLink: string;
      urgency: 'high' | 'medium' | 'low';
      cooldownHours?: number;
    }
  ): Promise<boolean> {
    return this.create({
      uid,
      eventType: 'nexus.insight_ready',
      persona: 'wealth',
      urgency: alert.urgency,
      message: {
        title: alert.title,
        body: alert.body,
        ctaLabel: alert.ctaLabel || 'Ver Estratégia',
      },
      deepLink: alert.deepLink,
      cooldownHours: alert.cooldownHours ?? 48,
      expiresInHours: 72,
      resourceId: alert.id,
      payload: { insightId: alert.id },
    });
  },


  // Cria um evento de presença respeitando cooldown, frequency cap e preferências do usuário
  async create(params: CreatePresenceEventParams): Promise<boolean> {
    const {
      uid, eventType, persona, urgency, message,
      deepLink, cooldownHours, expiresInHours, resourceId, payload,
    } = params;

    if (!uid || uid === 'demo-sandbox-soberano') {
      return false;
    }

    const now = Timestamp.now();
    const cooldownMs = cooldownHours * 60 * 60 * 1000;

    // --- Verificar preferências do usuário ---
    const prefsSnap = await getDoc(doc(firestore, 'users', uid, 'presencePreferences', 'config'));
    const prefs = prefsSnap.exists() ? prefsSnap.data() : null;

    const primaryChannel = CATEGORY_CHANNEL[eventType] ?? 'in_app';
    let resolvedChannel: 'push' | 'in_app' | 'email' = primaryChannel;

    console.log('[PresenceEventService.create] Início', {
      uid,
      eventType,
      persona,
      urgency,
      resourceId: resourceId ?? null,
      primaryChannel,
      prefs: prefs ?? null,
    });

    if (prefs) {
      if (prefs.intensity === 'essential' && urgency !== 'high') {
        console.log('[PresenceEventService.create] Bloqueado por intensity=essential', { eventType, urgency });
        return false;
      }

      const topicMap: Record<string, string> = {
        debts: 'debts',
        wealth: 'wealth',
      };
      const topic = topicMap[persona];
      if (topic && prefs.topics?.[topic] === false) {
        console.log('[PresenceEventService.create] Bloqueado por tópico desativado', { eventType, topic });
        return false;
      }

      if (primaryChannel === 'push' && prefs.pushEnabled === false) {
        resolvedChannel = 'in_app';
      }

      if (primaryChannel === 'email' && prefs.emailEnabled === false) {
        resolvedChannel = 'in_app';
      }
    }

    console.log('[PresenceEventService.create] Canal resolvido', {
      eventType,
      primaryChannel,
      resolvedChannel,
    });

    const stateRef = doc(firestore, 'users', uid, 'presenceState', 'current');
    const stateSnap = await getDoc(stateRef);
    const state = stateSnap.exists() ? stateSnap.data() : {};

    // Verificar frequency cap diário (máx 1 push não urgente por dia)
    const channel = resolvedChannel;
    if (channel === 'push' && urgency !== 'high') {
      const lastPush = state.lastPushSentAt as Timestamp | undefined;
      const lastPushDate = lastPush ? new Date(lastPush.toMillis()) : null;
      const today = new Date();
      const isNewDay = !lastPushDate ||
        lastPushDate.getDate() !== today.getDate() ||
        lastPushDate.getMonth() !== today.getMonth() ||
        lastPushDate.getFullYear() !== today.getFullYear();
      const pushCountToday = isNewDay ? 0 : (state.pushCountToday ?? 0);
      if (pushCountToday >= 1) {
        console.log('[PresenceEventService.create] Bloqueado por frequency cap diário', {
          eventType,
          channel,
          urgency,
          pushCountToday,
        });
        return false;
      }
      if (isNewDay) {
        await setDoc(stateRef, { pushCountToday: 0 }, { merge: true });
      }
    }

    // Verificar cooldown por categoria
    const categoryKey = eventType.replace('.', '_');
    const lastCategoryPush = state.lastCategoryPush?.[categoryKey];
    if (lastCategoryPush) {
      const elapsed = now.toMillis() - lastCategoryPush.toMillis();
      if (elapsed < cooldownMs) {
        console.log('[PresenceEventService.create] Bloqueado por cooldown', {
          eventType,
          categoryKey,
          elapsedMs: elapsed,
          cooldownMs,
        });
        return false;
      }
    }

    // Verificar se já existe evento pendente do mesmo tipo para o mesmo recurso
    if (resourceId) {
      const existingQ = query(
        collection(firestore, 'users', uid, 'presenceEvents'),
        where('eventType', '==', eventType),
        where('resourceId', '==', resourceId),
        where('status', '==', 'pending'),
        limit(1),
      );
      const existingSnap = await getDocs(existingQ);
      if (!existingSnap.empty) {
        console.log('[PresenceEventService.create] Bloqueado por evento pendente existente', {
          eventType,
          resourceId,
          existingCount: existingSnap.size,
        });
        return false;
      }
    }

    const expiresAt = Timestamp.fromMillis(now.toMillis() + expiresInHours * 60 * 60 * 1000);

    // Gravar evento
    const createdRef = await addDoc(collection(firestore, 'users', uid, 'presenceEvents'), {
      eventType,
      persona,
      urgency,
      urgencyScore: URGENCY_SCORE[urgency],
      status: 'pending',
      channel,
      message,
      deepLink,
      payload: payload ?? {},
      resourceId: resourceId ?? null,
      createdAt: now,
      expiresAt,
      seenAt: null,
      actionedAt: null,
    });

    console.log('[PresenceEventService.create] Evento criado', {
      eventType,
      eventId: createdRef.id,
      channel,
      resourceId: resourceId ?? null,
    });

    // Atualizar presenceState
    const stateUpdate: Record<string, unknown> = {
      [`lastCategoryPush.${categoryKey}`]: now,
    };
    if (channel === 'push') {
      stateUpdate.lastPushSentAt = now;
      stateUpdate.pushCountToday = increment(1);
    }
    await setDoc(stateRef, stateUpdate, { merge: true });

    // Despachar push local se canal for push
    const capacitorAvailable = typeof (window as any).Capacitor !== 'undefined';
    const notifCategory = EVENT_TO_NOTIFICATION_CATEGORY[eventType];

    if (channel === 'push' && capacitorAvailable && notifCategory) {
      const notifPayload: PresenceNotificationPayload = {
        category: notifCategory,
        title: message.title,
        body: message.body,
        deepLink,
      };
      await NotificationService.dispatch(notifPayload);
    }

    return true;
  },

  // Marcar evento como visto (chamado pelo HomePresenceFeed ao navegar)
  async markActioned(uid: string, eventId: string): Promise<void> {
    try {
      const ref = doc(firestore, 'users', uid, 'presenceEvents', eventId);
      await updateDoc(ref, { status: 'actioned', read: true, actionedAt: Timestamp.now() });
    } catch {
      // Silencioso — não bloqueia navegação
    }
  },
};
