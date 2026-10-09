import { useEffect, useRef } from 'react';
import type { DebtItem } from '../services/debt/debt.types';
import { PresenceEventService } from '../services/PresenceEventService';
import { FPI_COPY } from '../theme/fpiVoiceGuide';

const DAYS_MS = 24 * 60 * 60 * 1000;

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / DAYS_MS);
}

interface UsePresenceTriggersParams {
  userId: string | undefined;
  debts: DebtItem[];
  debtsLoading: boolean;
}

export const usePresenceTriggers = ({
  userId,
  debts,
  debtsLoading,
}: UsePresenceTriggersParams) => {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!userId || debtsLoading) return;
    if (firedRef.current) return;
    firedRef.current = true;

    const evaluate = async () => {
      for (const debt of debts) {
        const debtId = debt.id;
        if (!debtId) continue;

        const dateStr = debt.dataVencimento;
        if (dateStr) {
          const days = daysUntil(dateStr);

          if (days >= 0 && days <= 3) {
            await PresenceEventService.create({
              uid: userId,
              eventType: 'debt.due_soon_3d',
              persona: 'debts',
              urgency: 'high',
              message: {
                title: `Vencimento em ${days === 0 ? 'hoje' : `${days} dia${days > 1 ? 's' : ''}`}`,
                body: `${debt.nome} vence ${days === 0 ? 'hoje' : `em ${days} dia${days > 1 ? 's' : ''}`}. Vale revisar a prioridade de pagamento.`,
                ctaLabel: 'Revisar dívidas',
              },
              deepLink: `minhas-dividas?highlight=${debtId}`,
              cooldownHours: 24,
              expiresInHours: days <= 0 ? 24 : days * 24,
              resourceId: debtId,
              payload: { debtName: debt.nome, dueDate: dateStr, amount: debt.valorParcela },
            }).catch(() => {});
          } else if (days > 3 && days <= 7) {
            await PresenceEventService.create({
              uid: userId,
              eventType: 'debt.due_soon_7d',
              persona: 'debts',
              urgency: 'medium',
              message: {
                title: 'Vencimento em breve',
                body: `${debt.nome} vence em ${days} dias.`,
                ctaLabel: 'Ver dívidas próximas',
              },
              deepLink: `minhas-dividas?highlight=${debtId}`,
              cooldownHours: 72,
              expiresInHours: days * 24,
              resourceId: debtId,
              payload: { debtName: debt.nome, dueDate: dateStr },
            }).catch(() => {});
          }
        }
      }

      // --- debt.plan_stale_30d ---
      try {
        const { firestore } = await import('../firebase');
        const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
        const plansQ = query(
          collection(firestore, 'users', userId, 'nexusPlans'),
          orderBy('createdAt', 'desc'),
          limit(1),
        );
        const plansSnap = await getDocs(plansQ);
        if (!plansSnap.empty) {
          const lastPlan = plansSnap.docs[0].data();
          const lastPlanDate: Date = lastPlan.createdAt?.toDate
            ? lastPlan.createdAt.toDate()
            : new Date(lastPlan.createdAt);
          const daysSincePlan = (Date.now() - lastPlanDate.getTime()) / DAYS_MS;
          if (daysSincePlan >= 30) {
            await PresenceEventService.create({
              uid: userId,
              eventType: 'debt.plan_stale_30d',
              persona: 'debts',
              urgency: 'low',
              message: {
                title: 'Plano com mais de 30 dias',
                body: 'Seu plano de quitação pode estar desatualizado. Vale pedir ao Nexus uma revisão.',
                ctaLabel: 'Revisar plano',
              },
              deepLink: 'minhas-dividas?view=estrategia',
              cooldownHours: 30 * 24,
              expiresInHours: 30 * 24,
              resourceId: userId,
              payload: { daysSincePlan: Math.floor(daysSincePlan) },
            }).catch(() => {});
          }
        }
      } catch { /* silencioso */ }

      // --- debt.context_changed ---
      if (debts.length > 0) {
        try {
          const { firestore } = await import('../firebase');
          const { collection, query, orderBy, limit, getDocs } = await import('firebase/firestore');
          const txQ = query(
            collection(firestore, 'users', userId, 'transactions'),
            orderBy('date', 'desc'),
            limit(1),
          );
          const txSnap = await getDocs(txQ);
          if (!txSnap.empty) {
            const lastTx = txSnap.docs[0].data();
            const lastTxDate: Date = lastTx.date?.toDate
              ? lastTx.date.toDate()
              : new Date(lastTx.date);
            const daysSinceTx = (Date.now() - lastTxDate.getTime()) / DAYS_MS;
            if (daysSinceTx >= 10) {
              await PresenceEventService.create({
                uid: userId,
                eventType: 'debt.context_changed',
                persona: 'debts',
                urgency: 'low',
                message: {
                  title: 'Contexto desatualizado',
                  body: FPI_COPY.presenceInactiveDays(Math.floor(daysSinceTx)),
                  ctaLabel: FPI_COPY.presenceInactiveCta,
                },
                deepLink: 'controla?action=new-tx',
                cooldownHours: 72,
                expiresInHours: 7 * 24,
                resourceId: userId,
                payload: { daysSinceLastTransaction: Math.floor(daysSinceTx) },
              }).catch(() => {});
            }
          }
        } catch { /* silencioso */ }
      }
    };

    evaluate();
  }, [userId, debts, debtsLoading]);
};
