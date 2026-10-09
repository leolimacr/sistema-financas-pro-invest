import { useEffect, useRef } from 'react';
import type { Goal } from '../services/goalService';
import type { ActiveAsset } from '../types';
import { PresenceEventService } from '../services/PresenceEventService';

interface UseWealthPresenceTriggersParams {
  userId: string | undefined;
  goals: Goal[];
  assets: ActiveAsset[];
  goalsLoading: boolean;
  assetsLoading: boolean;
  lastWealthReviewAt?: Date | null;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const useWealthPresenceTriggers = ({
  userId,
  goals,
  assets,
  goalsLoading,
  assetsLoading,
  lastWealthReviewAt,
}: UseWealthPresenceTriggersParams) => {
  const firedSignatureRef = useRef('');

  useEffect(() => {
    if (!userId || goalsLoading || assetsLoading) return;

    // Re-fire quando a assinatura dos dados muda (evita stale closure)
    const signature = [
      goals.map(g => `${g.id}:${g.currentAmount}:${g.targetAmount}`).join('|'),
      assets.map(a => a.id).join('|'),
      lastWealthReviewAt?.getTime() ?? 'none',
    ].join('::');

    if (firedSignatureRef.current === signature) return;
    firedSignatureRef.current = signature;

    const evaluate = async () => {
      const now = new Date();

      // --- wealth.review_overdue_14d ---
      if (lastWealthReviewAt) {
        const daysSinceReview =
          (now.getTime() - lastWealthReviewAt.getTime()) / MS_PER_DAY;
        if (daysSinceReview >= 14) {
          await PresenceEventService.create({
            uid: userId,
            eventType: 'wealth.review_overdue_14d',
            persona: 'wealth',
            urgency: 'low',
            message: {
              title: 'Revisão pendente',
              body: `Seu patrimônio não é revisado há ${Math.floor(daysSinceReview)} dias. Vale uma conferida.`,
              ctaLabel: 'Revisar patrimônio',
            },
            deepLink: '/patrimonio',
            cooldownHours: 168,
            expiresInHours: 30 * 24,
            resourceId: userId,
            payload: { daysSinceReview: Math.floor(daysSinceReview) },
          }).catch(() => {});
        }
      } else if (assets.length > 0) {
        await PresenceEventService.create({
          uid: userId,
          eventType: 'wealth.review_overdue_14d',
          persona: 'wealth',
          urgency: 'low',
          message: {
            title: 'Patrimônio cadastrado, mas não revisado',
            body: 'Você tem ativos registrados. O Nexus pode ajudar a avaliar sua situação atual.',
            ctaLabel: 'Revisar com Nexus',
          },
          deepLink: '/nexus?context=patrimonio',
          cooldownHours: 168,
          expiresInHours: 30 * 24,
          resourceId: userId,
          payload: {},
        }).catch(() => {});
      }

      // --- wealth.goal_near e wealth.aport_upcoming ---
      for (const goal of goals) {
        if (!goal.id) continue;

        const rawTarget: unknown = goal.targetDate;
        const targetDate: Date | null = typeof rawTarget === 'string' || rawTarget instanceof Date
          ? new Date(rawTarget as string | Date)
          : (rawTarget as { toDate?: () => Date } | null)?.toDate?.() ?? null;

        if (!targetDate) continue;

        const daysToTarget = (targetDate.getTime() - now.getTime()) / MS_PER_DAY;

        if (daysToTarget > 0 && daysToTarget <= 30) {
          await PresenceEventService.create({
            uid: userId,
            eventType: 'wealth.goal_near',
            persona: 'wealth',
            urgency: 'medium',
            message: {
              title: `Meta próxima do prazo`,
              body: `"${goal.title}" vence em ${Math.ceil(daysToTarget)} dias. Veja se está no ritmo certo.`,
              ctaLabel: 'Acompanhar meta',
            },
            deepLink: `/app/metas?highlight=${goal.id}`,
            cooldownHours: 72,
            expiresInHours: 30 * 24,
            resourceId: goal.id,
            payload: {
              goalId: goal.id,
              goalTitle: goal.title,
              daysToTarget: Math.ceil(daysToTarget),
              targetAmount: goal.targetAmount,
              currentAmount: goal.currentAmount,
            },
          }).catch(() => {});
        }

        const today = now.getDate();
        const isAportWindow = today >= 1 && today <= 5;
        const hasProgress = (goal.currentAmount ?? 0) > 0;
        const withinAportHorizon = daysToTarget > 3 && daysToTarget <= 90;

        if (isAportWindow && hasProgress && withinAportHorizon) {
          await PresenceEventService.create({
            uid: userId,
            eventType: 'wealth.aport_upcoming',
            persona: 'wealth',
            urgency: 'medium',
            message: {
              title: 'Período de aporte',
              body: `Seu aporte para "${goal.title}" pode ser feito agora. Vale revisar a distribuição.`,
              ctaLabel: 'Ver distribuição',
            },
            deepLink: '/investimentos?tab=aportes',
            cooldownHours: 72,
            expiresInHours: 5 * 24,
            resourceId: `aport_${goal.id}`,
            payload: {
              goalId: goal.id,
              goalTitle: goal.title,
              targetAmount: goal.targetAmount,
              currentAmount: goal.currentAmount,
            },
          }).catch(() => {});
        }
      }
    };

    evaluate();
  }, [userId, goals, assets, goalsLoading, assetsLoading, lastWealthReviewAt]);
};
