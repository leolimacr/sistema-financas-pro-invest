import { useEffect, useRef } from 'react';
import { firestore } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { PresenceEventService } from '../services/PresenceEventService';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

interface UseReengagementTriggerParams {
  userId: string | undefined;
  isLoading: boolean;
}

export const useReengagementTrigger = ({
  userId,
  isLoading,
}: UseReengagementTriggerParams) => {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!userId || isLoading || firedRef.current) return;
    firedRef.current = true;

    const evaluate = async () => {
      try {
        // Lê doc raiz users/{uid} (já em cache via AuthContext = 0 reads adicionais)
        const userSnap = await getDoc(doc(firestore, 'users', userId));
        if (!userSnap.exists()) return;

        const lastActiveRaw = userSnap.data()?.lastActiveAt;
        if (!lastActiveRaw) return;

        const lastActive: Date = lastActiveRaw.toDate
          ? lastActiveRaw.toDate()
          : new Date(lastActiveRaw);

        const daysSince = (Date.now() - lastActive.getTime()) / MS_PER_DAY;

        if (daysSince >= 14) {
          await PresenceEventService.create({
            uid: userId,
            eventType: 'reengagement.inactive_14d',
            persona: 'debts',
            urgency: 'medium',
            message: {
              title: 'Tudo bem por aí?',
              body: `Faz ${Math.floor(daysSince)} dias desde sua última visita. Seu plano pode precisar de uma revisão rápida.`,
              ctaLabel: 'Retomar plano',
            },
            deepLink: 'home',
            cooldownHours: 168,
            expiresInHours: 7 * 24,
            resourceId: userId,
            payload: { daysSinceLastActive: Math.floor(daysSince) },
          }).catch(() => {});
        }
      } catch {
        // silencioso
      }
    };

    evaluate();
  }, [userId, isLoading]);
};