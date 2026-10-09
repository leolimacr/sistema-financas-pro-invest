import type { SovereignSnapshot } from '../utils/calculations';

export type StageId =
  | 'indefinido'
  | 'pressao'
  | 'colchao-incompleto'
  | 'estavel'
  | 'solido'
  | 'expansao';

export interface StageInfo {
  id: StageId;
  numericStage: number;
  name: string;
  explanation: string;
  blockers: string[];
  nextStep: string;
}

export interface ClassifyInput {
  launchCount: number;
  sovereignFreeBalance: number;
  protectionShortfall: number;
  leewayDays: number;
  freedomDeficit: number;
  colchaoShortfall?: number;
  reserveShortfall?: number;
  cashSurplus?: number;
}

const STAGE_THRESHOLDS: Record<StageId, { minStage: number; check: (i: ClassifyInput) => boolean }> = {
  'expansao': { minStage: 5, check: (i) => i.protectionShortfall <= 0 && i.leewayDays > 180 },
  'solido':  { minStage: 4, check: (i) => i.protectionShortfall <= 0 && i.leewayDays > 90 },
  'estavel':   { minStage: 3, check: (i) => i.protectionShortfall <= 0 && i.sovereignFreeBalance >= 0 },
  'colchao-incompleto': { minStage: 2, check: (i) => (i.cashSurplus !== undefined ? i.cashSurplus >= 0 : i.sovereignFreeBalance >= 0) && i.protectionShortfall > 0 },
  'pressao': { minStage: 1, check: (i) => (i.cashSurplus !== undefined ? i.cashSurplus < 0 : i.sovereignFreeBalance < 0) },
  'indefinido': { minStage: 0, check: () => true },
};

const STAGE_ORDER: StageId[] = ['expansao', 'solido', 'estavel', 'colchao-incompleto', 'pressao', 'indefinido'];

const STAGE_META: Record<StageId, { name: string; explanation: (i: ClassifyInput) => string; blockers: (i: ClassifyInput) => string[]; nextStep: string }> = {
  'indefinido': {
    name: 'Indefinido',
    explanation: (i) => i.launchCount > 0
      ? `Você já registrou ${i.launchCount} ${i.launchCount === 1 ? 'movimentação' : 'movimentações'}. Continue até 5 para ativar a classificação completa do seu estágio financeiro.`
      : 'Ainda não há dados suficientes para classificar seu estágio financeiro. Continue registrando movimentações.',
    blockers: (i) => i.launchCount > 0
      ? [`Apenas ${i.launchCount} de 5 lançamentos necessários para ativar o Mapa`]
      : ['Menos de 5 lançamentos registrados'],
    nextStep: 'Registrar movimentações regularmente para ativar o Mapa de Soberania',
  },
  'pressao': {
    name: 'Atenção no Fluxo',
    explanation: (i) => `Sua disponibilidade real está em R$ -${Math.abs(i.sovereignFreeBalance).toFixed(2)}. Os compromissos do mês superam as entradas do período — a reserva de proteção está sendo usada para cobrir despesas correntes.`,
    blockers: (i) => {
      const b: string[] = [];
      if (i.freedomDeficit > 0) b.push(`Déficit de R$ ${i.freedomDeficit.toFixed(2)} na folga do mês`);
      if (i.protectionShortfall > 0) b.push(`Proteção incompleta (faltam R$ ${i.protectionShortfall.toFixed(2)})`);
      return b;
    },
    nextStep: 'Regularizar fluxo mensal e reconstruir o Colchão Emergencial',
  },
  'colchao-incompleto': {
    name: 'Proteção em Formação',
    explanation: (i) => {
      if (i.colchaoShortfall !== undefined && i.colchaoShortfall <= 0 && (i.reserveShortfall ?? 0) > 0) {
        return `Seu caixa cobre suas obrigações imediatas e seu Colchão Emergencial está 100% formado. Faltam R$ ${i.protectionShortfall.toFixed(2)} para completar sua Reserva de Emergência.`;
      }
      return `Seu caixa cobre suas obrigações imediatas e você está formando seu Colchão Emergencial. Faltam R$ ${i.protectionShortfall.toFixed(2)} para cobrir toda a sua meta de proteção.`;
    },
    blockers: (i) => [`Faltam R$ ${i.protectionShortfall.toFixed(2)} para completar a proteção`],
    nextStep: 'Completar o Colchão Emergencial e a Reserva de Emergência',
  },
  'estavel': {
    name: 'Estável',
    explanation: (i) => `Proteção completa. Sua disponibilidade real de R$ ${i.sovereignFreeBalance.toFixed(2)} cobre ${i.leewayDays} dias de despesas. A estrutura está sólida — sem déficits, sem proteção incompleta.`,
    blockers: (i) => {
      if (i.leewayDays <= 0) return ['Folga ainda insuficiente para cobrir imprevistos'];
      if (i.leewayDays <= 30) return [`Margem apertada: ${i.leewayDays} dias de folga`];
      return [];
    },
    nextStep: 'Aumentar a margem mensal para acelerar a liberdade financeira',
  },
  'solido': {
    name: 'Sólido',
    explanation: (i) => `Proteção completa com excedente. Sua disponibilidade real de R$ ${i.sovereignFreeBalance.toFixed(2)} cobre mais de 3 meses de despesas. Há margem para decisões estratégicas.`,
    blockers: () => [],
    nextStep: 'Direcionar capital excedente para alocação estratégica (investimentos, quitação de passivos, novos objetivos)',
  },
  'expansao': {
    name: 'Expansão',
    explanation: (i) => `Proteção completa com excedente consolidado. Sua disponibilidade real de R$ ${i.sovereignFreeBalance.toFixed(2)} cobre mais de 6 meses de despesas. O acúmulo de capital permite avançar além da segurança.`,
    blockers: () => [],
    nextStep: 'Estruturar alocação de capital para geração de renda e perpetuação patrimonial',
  },
};

/** Contrato: launchCount < 5 força "indefinido" apenas quando sovereignFreeBalance >= 0;
 *  com freeBalance negativo, classifica como "pressao" mesmo com poucas transações.
 *  leewayDays é derivado de sovereignFreeBalance/expenses; quando expenses = 0,
 *  leewayDays = 0, tornando "solido"/"expansao" inalcançáveis — intencional (sem custo diário não há folga). */
export function classifyStage(input: ClassifyInput): StageInfo {
  if (input.launchCount < 5 && input.sovereignFreeBalance >= 0) {
    const m = STAGE_META['indefinido'];
    return {
      id: 'indefinido',
      numericStage: 0,
      name: m.name,
      explanation: m.explanation(input),
      blockers: m.blockers(input),
      nextStep: m.nextStep,
    };
  }

  for (const id of STAGE_ORDER) {
    const t = STAGE_THRESHOLDS[id];
    if (t.check(input)) {
      const m = STAGE_META[id];
      return {
        id,
        numericStage: t.minStage,
        name: m.name,
        explanation: m.explanation(input),
        blockers: m.blockers(input),
        nextStep: m.nextStep,
      };
    }
  }

  const m = STAGE_META['indefinido'];
  return {
    id: 'indefinido',
    numericStage: 0,
    name: m.name,
    explanation: m.explanation(input),
    blockers: m.blockers(input),
    nextStep: m.nextStep,
  };
}

export function classifyFromSnapshot(
  snapshot: SovereignSnapshot,
  launchCount: number
): StageInfo {
  return classifyStage({
    launchCount,
    sovereignFreeBalance: snapshot.sovereignFreeBalance,
    protectionShortfall: snapshot.protectionShortfall,
    leewayDays: snapshot.leewayDays,
    freedomDeficit: snapshot.freedomDeficit,
    colchaoShortfall: snapshot.colchaoShortfall,
    reserveShortfall: snapshot.reserveShortfall,
    cashSurplus: snapshot.cashSurplus,
  });
}
