import { useEffect, useRef } from 'react';
import type { DebtItem } from '../services/debt/debt.types';
import type { ActiveAsset, UserMetadata, RecurringBill } from '../types';
import type { AgendaCommitment } from '../services/agendaService';
import type { SovereignSnapshot } from '../utils/calculations';
import { PresenceEventService } from '../services/PresenceEventService';

interface UseNexusAdvisorTriggersParams {
  userId: string | undefined;
  sovereign: SovereignSnapshot;
  debts: DebtItem[];
  assets: ActiveAsset[];
  bills?: RecurringBill[];
  commitments?: AgendaCommitment[];
  userMeta: UserMetadata | null;
  launchCount: number;
}

export const useNexusAdvisorTriggers = ({
  userId,
  sovereign,
  debts,
  assets,
  bills,
  commitments,
  userMeta,
  launchCount,
}: UseNexusAdvisorTriggersParams) => {
  const lastEvaluatedSignatureRef = useRef<string>('');

  useEffect(() => {
    if (!userId || launchCount < 3) return;

    const signature = [
      sovereign.sovereignFreeBalance < 0 ? 'neg' : 'pos',
      Math.round(sovereign.sovereignFreeBalance / 500) * 500,
      sovereign.protectionShortfall > 100 ? 'shortfall' : 'ok',
      debts.length,
      debts.some((d) => (d.taxaMensal || 0) > 0) ? 'debts_interest' : 'no_interest',
      assets.length,
      bills?.length || 0,
      commitments?.length || 0,
    ].join('::');

    if (lastEvaluatedSignatureRef.current === signature) return;
    lastEvaluatedSignatureRef.current = signature;

    const evaluate = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 0. Antecipação Ativa da Agenda (Próximos 7 dias) — Conexão Nexus + Agenda
      if (commitments && commitments.length > 0) {
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);

        const upcomingWeekCommitments = commitments.filter((c) => {
          if (c.completed) return false;
          const cDate = c.date && typeof c.date.toDate === 'function' ? c.date.toDate() : new Date((c.date as any)?.seconds ? (c.date as any).seconds * 1000 : c.date);
          return cDate >= today && cDate <= in7Days;
        });

        if (upcomingWeekCommitments.length > 0) {
          const count = upcomingWeekCommitments.length;
          const firstCommitment = upcomingWeekCommitments[0];
          const firstTitle = firstCommitment.title || 'Compromisso programado';

          const firstDate = firstCommitment.date && typeof (firstCommitment.date as any).toDate === 'function'
            ? (firstCommitment.date as any).toDate()
            : new Date((firstCommitment.date as any)?.seconds ? (firstCommitment.date as any).seconds * 1000 : firstCommitment.date);
          const firstDateStr = firstDate instanceof Date && !isNaN(firstDate.getTime())
            ? firstDate.toISOString().split('T')[0]
            : '';

          const agendaDeepLink = `agenda?view=week&highlight=${encodeURIComponent(firstCommitment.id || '')}&date=${firstDateStr}`;

          await PresenceEventService.createNexusAdvisorAlert(userId, {
            id: `nexus-alert-agenda-7d-${today.getDate()}`,
            title: count === 1 ? 'Compromisso na sua Semana' : `${count} Compromissos na sua Semana`,
            body: count === 1
              ? `Você tem "${firstTitle}" agendado para os próximos dias. Confira sua Agenda para manter o ritmo sem pressa.`
              : `Você tem ${count} compromissos agendados nos próximos 7 dias, incluindo "${firstTitle}". Organize seus horários para uma semana tranquila.`,
            ctaLabel: count === 1 ? 'Ver Compromisso' : 'Ver Semana em Foco',
            deepLink: agendaDeepLink,
            urgency: 'medium',
            cooldownHours: 72,
          }).catch(() => {});
        }
      }

      // 1. Antecipação Ativa de Tensão no Caixa (Próximos 3 a 5 dias)
      if (bills && bills.length > 0 && launchCount >= 5) {
        const currentDay = today.getDate();
        const next5Days = currentDay + 5;

        const upcomingBills = bills.filter((b) => {
          if (!b.isActive) return false;
          if (b.lastPaidDate) {
            const pDate = new Date(b.lastPaidDate.replace(/-/g, '/'));
            if (!isNaN(pDate.getTime()) && pDate.getMonth() === today.getMonth() && pDate.getFullYear() === today.getFullYear()) {
              return false;
            }
          }
          return b.dueDay >= currentDay && b.dueDay <= next5Days;
        });

        const upcomingTotal = upcomingBills.reduce((sum, b) => sum + (b.amount || 0), 0);

        if (upcomingTotal > 0) {
          const availableCash = sovereign.monthBalance > 0 ? sovereign.monthBalance : sovereign.accumulatedBalance;
          if (availableCash < upcomingTotal || (availableCash > 0 && upcomingTotal >= availableCash * 0.7)) {
            const formattedTotal = upcomingTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            await PresenceEventService.createNexusAdvisorAlert(userId, {
              id: `nexus-alert-bills-5d-${currentDay}`,
              title: 'Atenção ao Caixa nos Próximos Dias',
              body: `Você possui ${formattedTotal} em contas a vencer nos próximos 5 dias. Recomendo segurar gastos não essenciais nestes dias para manter tudo em dia com tranquilidade.`,
              ctaLabel: 'Ver Contas',
              deepLink: 'controla?view=contas&filter=next5days',
              urgency: 'high',
              cooldownHours: 72,
            }).catch(() => {});
          }
        }
      }

      // 2. Saldo Livre Real negativo
      if (sovereign.sovereignFreeBalance < 0 && launchCount >= 5) {
        await PresenceEventService.createNexusAdvisorAlert(userId, {
          id: 'nexus-alert-negative-free-balance',
          title: 'Atenção ao Saldo Livre',
          body: 'Seu saldo livre projetado está no negativo este mês. Recomendo dar uma olhada nas contas pendentes no Controla para manter sua reserva protegida.',
          ctaLabel: 'Revisar Fluxo',
          deepLink: 'controla?view=contas',
          urgency: 'high',
          cooldownHours: 48,
        }).catch(() => {});
      }

      // 3. Dívidas Ativas: Custo de Oportunidade Estratégico ou Sangria Geral de Juros
      const hasInterestDebts = debts.some((d) => (d.taxaMensal || 0) > 0);
      const hasHighDebt = debts.some((d) => (d.taxaMensal || 0) > 3.5);
      const hasLiquidity = assets.some((a) => a.flexibility === 'liquidez' && a.currentValue >= 500);

      if (hasHighDebt && hasLiquidity) {
        await PresenceEventService.createNexusAdvisorAlert(userId, {
          id: 'nexus-alert-opportunity-cost',
          title: 'Custo de Oportunidade',
          body: 'O custo das suas dívidas supera o rendimento esperado de aplicações de liquidez. Avalie priorizar a quitação para estancar a perda real.',
          ctaLabel: 'Comparar e Quitar',
          deepLink: 'minhas-dividas?view=estrategia',
          urgency: 'high',
          cooldownHours: 72,
        }).catch(() => {});
      } else if (hasInterestDebts) {
        await PresenceEventService.createNexusAdvisorAlert(userId, {
          id: 'nexus-alert-debt-interest',
          title: 'Impacto dos Juros no Fluxo',
          body: 'Você possui dívidas com juros ativos consumindo margem da sua folga. Simule uma rota de amortização para estancar essa perda.',
          ctaLabel: 'Ver Estratégia',
          deepLink: 'minhas-dividas?view=estrategia',
          urgency: 'high',
          cooldownHours: 72,
        }).catch(() => {});
      }

      // 4. Oportunidade de Alocação de Capital Ocioso
      const colchaoTarget = userMeta?.financialProfile?.colchaoInicialTarget || 2000;
      if (
        sovereign.sovereignFreeBalance > colchaoTarget * 1.5 &&
        sovereign.sovereignFreeBalance >= 2500 &&
        sovereign.protectionShortfall === 0
      ) {
        await PresenceEventService.createNexusAdvisorAlert(userId, {
          id: 'nexus-alert-idle-cash',
          title: 'Oportunidade de Alocação',
          body: 'Sua reserva atingiu o patamar seguro e há saldo livre ocioso sem render. É o momento de direcionar o excedente para seus investimentos.',
          ctaLabel: 'Onde Investir',
          deepLink: 'investimentos?action=new-asset',
          urgency: 'medium',
          cooldownHours: 96,
        }).catch(() => {});
      }

      // 5. Prioridade de Proteção (Colchão com Déficit)
      if (
        sovereign.protectionShortfall > 200 &&
        sovereign.sovereignFreeBalance > 300 &&
        launchCount >= 5
      ) {
        await PresenceEventService.createNexusAdvisorAlert(userId, {
          id: 'nexus-alert-protection-shortfall',
          title: 'Prioridade de Proteção',
          body: 'Sua base de proteção financeira ainda está abaixo da meta. Priorize destinar a folga deste período para recompor sua segurança.',
          ctaLabel: 'Ver Situação',
          deepLink: 'central?view=protection',
          urgency: 'medium',
          cooldownHours: 96,
        }).catch(() => {});
      }
    };

    void evaluate();
  }, [userId, sovereign, debts, assets, bills, commitments, userMeta, launchCount]);
};

