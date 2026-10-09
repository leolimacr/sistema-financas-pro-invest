import type { DebtItem } from './debt.types';
import type { SovereignSnapshotResult } from '../../hooks/useSovereignSnapshot';
import type { DebtCommand } from './advisor.types';

// Constantes de Negócio (Configurações do Motor)
const THRESHOLD_ABUSIVE_RATE = 4.0; // Taxa acima de 4% é considerada alerta prioritário
const THRESHOLD_HYGIENE_DAYS = 15;  // Mais de 15 dias sem validar é sinal de desatualização
const OPPORTUNITY_MULTIPLIER = 3.0; // Saldo Livre > 3x parcela para sugerir amortização extra

function getTimestamp(date: Date | { toMillis?: () => number } | undefined): number {
  if (!date) return 0;
  if (date instanceof Date) return date.getTime();
  if (typeof date.toMillis === 'function') return date.toMillis();
  return 0;
}

export const analyzeDebtContext = (
  debts: DebtItem[],
  snapshot: SovereignSnapshotResult
): DebtCommand[] => {
  const commands: DebtCommand[] = [];

  if (debts.length === 0) return [];

  // 1. Comando Dominante: GESTÃO DE CRISE (Prioridade 100)
  if (snapshot.heroValue < 0) {
    commands.push({
      id: 'crisis_management',
      type: 'urgency',
      priority: 100,
      title: 'Pressão na folga do mês',
      description: 'Seus dados indicam um déficit de soberania este mês. Priorize proteger sua estrutura essencial antes de qualquer quitação extra.',
      ctaLabel: 'Ver Estratégia de Crise',
      action: 'open_crisis_mode'
    });
    // Se há crise, suprimimos oportunidades, mas permitimos higiene.
  }

  // 2. Comando: RITUAL DE INTEGRIDADE (Prioridade 80)
  const now = new Date().getTime();
  const oldestDebt = [...debts].sort((a, b) => getTimestamp(a.updatedAt) - getTimestamp(b.updatedAt))[0];

  if (oldestDebt) {
    const lastUpdate = getTimestamp(oldestDebt.updatedAt);
    const daysSince = (now - lastUpdate) / (1000 * 60 * 60 * 24);

    if (daysSince > THRESHOLD_HYGIENE_DAYS) {
      commands.push({
        id: 'integrity_ritual',
        type: 'hygiene',
        priority: 80,
        title: 'Ritual de Integridade',
        description: 'Seus saldos devedores podem estar desatualizados. Valide seus números para manter a estratégia precisa.',
        ctaLabel: 'Validar Dívidas',
        action: 'open_validation',
        metadata: { daysOverdue: Math.floor(daysSince) }
      });
    }
  }

  // 3. Comando: ATACAR PRIORITÁRIA (Prioridade 60)
  const criticalDebt = [...debts].sort((a, b) => (b.taxaMensal || 0) - (a.taxaMensal || 0))[0];
  if (criticalDebt && (criticalDebt.taxaMensal || 0) > THRESHOLD_ABUSIVE_RATE && snapshot.heroValue >= 0) {
    commands.push({
      id: 'attack_priority',
      type: 'urgency',
      priority: 60,
      title: 'Dívida de Alto Impacto',
      description: `A dívida "${criticalDebt.nome}" possui uma taxa de ${criticalDebt.taxaMensal}%/mês. Este é o ponto de maior erosão do seu patrimônio hoje.`,
      ctaLabel: 'Simular Ataque',
      action: 'open_projection',
      metadata: { debtId: criticalDebt.id }
    });
  }

  // 4. Comando: OPORTUNIDADE DE QUITAÇÃO (Prioridade 40)
  if (snapshot.heroValue > (criticalDebt.valorParcela * OPPORTUNITY_MULTIPLIER) && snapshot.heroValue > 0 && commands.length < 2) {
    // Só sugere se não houver crise e se houver folga real
    const suggestedExtra = Math.floor(snapshot.heroValue * 0.3); // Sugere usar 30% do saldo livre
    if (suggestedExtra > 50) {
      commands.push({
        id: 'quittance_opportunity',
        type: 'opportunity',
        priority: 40,
        title: 'Oportunidade de Liberdade',
        description: `Sua folga do mês atual permite acelerar sua quitação. Usar R$ ${suggestedExtra} extras este mês compraria tempo de vida.`,
        ctaLabel: 'Calcular Ganho de Tempo',
        action: 'open_projection',
        metadata: { debtId: criticalDebt.id, suggestedAmount: suggestedExtra }
      });
    }
  }

  // Filtro Final: Máximo de 2 comandos, ordenados por prioridade
  return commands
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2);
};
