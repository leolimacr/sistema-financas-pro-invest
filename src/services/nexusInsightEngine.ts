import { extractUpcomingBill } from './nexusContextUtils';
import { rankDebts } from './debt/debt.math';
import type { DebtItem } from './debt/debt.types';
import type {
  CreditCard,
  Transaction,
  ActiveAsset,
  PassiveAsset,
  FinancialProfile,
  PersonaContext,
} from '../types';
import { getPersonaVoice } from './personaService';
import { getFlowLabels } from '../theme/fpiVoiceGuide';
import { traceInsightShown, collectFollowUp, getEffectivePriorityDelta, getDomainSuppressionMultiplier, getToneMarker } from './insightResponseObserver';


export type CategoryBudgetStatus = 'green' | 'yellow' | 'red';

export interface BudgetCategoryData {
  name: string;
  limit: number;
  spent: number;
  percentage: number;
  status: CategoryBudgetStatus;
}

export interface BudgetInsightData {
  totalBudget: number;
  totalSpent: number;
  totalPercentage: number;
  daysElapsed: number;
  daysInMonth: number;
  categories: BudgetCategoryData[];
}

export interface NexusAdvisoryContext {
  snapshot: import('../utils/calculations').SovereignSnapshot;
  commandMode: boolean;
  categorySpending: Record<string, number>;
  isPremium: boolean;
}

export type NexusPlanTier = 'free' | 'pro' | 'premium';

export interface NexusActionPayload {
  title?: string;
  value?: number;
  targetDate?: string;
  debtId?: string;
  cardId?: string;
  cardName?: string;
  amount?: number;
  invoiceId?: string;
  periodEnd?: string;
  remainingAmount?: number;
  dueDate?: string;
}

export interface NexusInsightAction {
  label: string;
  type: string;
  requiresPlan?: NexusPlanTier;
  payload?: NexusActionPayload;
}

export interface NexusTraceabilityMetric {
  label: string;
  value: string;
  detail?: string;
}

export interface NexusTraceability {
  /** Resumo explicativo factual de por que o insight foi acionado */
  reason: string;
  /** Período ou recorte temporal apurado */
  period: string;
  /** Timestamp de geração/apuração */
  evaluatedAt: string;
  /** Relação de métricas quantitativas com valores reais */
  metrics: NexusTraceabilityMetric[];
  /** Fontes internas consultadas */
  sources: string[];
}

export interface NexusInsight {
  id: string;
  message: {
    title: string;
    body: string;
    ctaLabel: string;
  };
  deepLink: string;
  priority: 'alta' | 'media' | 'baixa' | 'inline';
  action?: NexusInsightAction;
  style?: {
    brandColor?: string;
  };
  followUp?: string;
  traceability?: NexusTraceability;
}

export interface UserContext {
  hasFinancialProfile: boolean;
  financialProfile?: FinancialProfile;
  hasPaidAccess: boolean;
  isPremium: boolean;
  persona?: PersonaContext;
  transactionsToday: number;
  daysSinceLastTransaction: number;
  launchCount: number;
  launchLimit: number;
  monthBalance: number;
  monthIncome?: number;
  monthExpenses?: number;
  accumulatedBalance?: number;
  marcoZero?: number;
  reserveTarget?: number;
  reserveCurrent?: number;
  sovereignFreeBalance?: number;
  freedomDeficit?: number;
  obligationsDeduction?: number;
  commandMode?: boolean;
  recentLargeIncome?: number;
  hasFirstInvestment: boolean;
  streak: number;
  assets?: ActiveAsset[];
  passives?: PassiveAsset[];
  debts?: DebtItem[];
  hasDebts?: boolean;
  hasRealEstate?: boolean;
  hasVehicles?: boolean;
  totalAssetsValue?: number;
  reserveGoalMet?: boolean;
  debtJustPaidOff?: boolean;
  isFirstSession?: boolean;
  cards?: CreditCard[];
  budgetProgress?: BudgetInsightData;
  transactions?: Transaction[];
  upcomingCreditCardBill?: {
    daysToClose: number;
    estimatedValue: number;
    cardName?: string;
    cardId?: string;
    dueDate?: string;
  };
}

type CatalogItem = {
  id: string;
  condition: (ctx: UserContext) => boolean;
  insight: NexusInsight;
};

const INSIGHT_CATALOG: CatalogItem[] = [
  // ── HOME — tensão soberana ──
  {
    id: 'home-sovereign-deficit',
    condition: (ctx) => {
      const deficit = ctx.freedomDeficit ?? 0;
      const free = ctx.sovereignFreeBalance ?? 0;
      return deficit > 0 || free < 0;
    },
    insight: {
      id: 'home-sovereign-deficit',
      message: {
        title: 'Déficit de liberdade',
        body: '{tone_observacao}{prefix} sua folga do mês está em déficit de {deficit}. A estrutura de proteção está sendo consumida — é hora de revisar compromissos.',
        ctaLabel: 'Ver Estrutura',
      },
      deepLink: 'manager',
      priority: 'alta',
      action: { label: 'Revisar mês', type: 'adjust' },
    },
  },
  {
    id: 'fatima_reserva',
    condition: (ctx) => {
      const bill = extractUpcomingBill(ctx);
      return !!bill && bill.daysToClose <= 5;
    },
    insight: {
      id: 'fatima_reserva',
      message: {
        title: 'Fechamento de fatura',
        body: '{tone_observacao}{prefix} sua fatura fecha em {days} dias ({value}). Movimente a reserva antes do fechamento.',
        ctaLabel: 'Ver Detalhes',
      },
      deepLink: 'manager',
      priority: 'alta',
      action: { label: 'Reservar valor', type: 'reserve', requiresPlan: 'pro' },
    },
  },
  {
    id: 'home-bill-pressure',
    condition: (ctx) => {
      const bill = extractUpcomingBill(ctx);
      if (!bill || bill.daysToClose > 7) return false;
      const marco = ctx.marcoZero || 0;
      return bill.estimatedValue > marco * 0.5 || bill.estimatedValue > (ctx.monthBalance || 0) * 0.4;
    },
    insight: {
      id: 'home-bill-pressure',
      message: {
        title: 'Fatura vs estrutura',
        body: '{tone_observacao}{prefix} fatura de {value} fecha em {days} dias. Isso pressiona seu Colchão Emergencial — reserve o valor ou ajuste o mês.',
        ctaLabel: 'Abrir Controla',
      },
      deepLink: 'manager',
      priority: 'alta',
      action: { label: 'Abrir Controla', type: 'adjust' },
    },
  },
  {
    id: 'home-margin-thin',
    condition: (ctx) => {
      const free = ctx.sovereignFreeBalance ?? 0;
      const buffer = (ctx.marcoZero || 0) + (ctx.reserveCurrent || 0);
      if (free <= 0) return false;
      return free < Math.max(500, buffer * 0.15);
    },
    insight: {
      id: 'home-margin-thin',
      message: {
        title: 'Folga apertada',
        body: '{tone_observacao}{prefix} sua folga do mês ({sovereign}) está abaixo de 15% da estrutura protegida. Qualquer movimento reduz seu fôlego.',
        ctaLabel: 'Revisar mês',
      },
      deepLink: 'manager',
      priority: 'media',
    },
  },
  {
    id: 'home-bonus-inflow',
    condition: (ctx) => (ctx.recentLargeIncome || 0) >= 1500,
    insight: {
      id: 'home-bonus-inflow',
      message: {
        title: 'Entrada relevante',
        body: '{prefix} detectei entrada de {bonus}. Duas rotas: reforçar o Colchão Emergencial ou comprar segurança (reforçar reserva). Qual faz mais sentido agora?',
        ctaLabel: 'Falar com Nexus',
      },
      deepLink: 'ia',
      priority: 'media',
    },
  },
  {
    id: 'home-living-cost-drift',
    condition: (ctx) => {
      const income = ctx.monthIncome || 0;
      const expenses = ctx.monthExpenses || 0;
      if (income <= 0 || ctx.launchCount < 10) return false;
      return expenses / income >= 0.88;
    },
    insight: {
      id: 'home-living-cost-drift',
      message: {
        title: 'Erosão silenciosa',
        body: '{prefix} seus {flowExpense} consomem {ratio}% dos {flowIncome} este mês. A inclinação da curva está apertando sua folga do mês.',
        ctaLabel: 'Ver Controla',
      },
      deepLink: 'manager',
      priority: 'media',
    },
  },
  // ── HOME — pressão orçamentária (budget activo) ──
  {
    id: 'budget-margin-pressure',
    condition: (ctx) => {
      const bp = ctx.budgetProgress;
      if (!bp) return false;
      const monthExp = ctx.monthExpenses ?? 0;
      const free = ctx.sovereignFreeBalance ?? 0;
      return bp.totalPercentage > 90 || (free >= 0 && free < monthExp * 0.3 && bp.totalPercentage > 80);
    },
    insight: {
      id: 'budget-margin-pressure',
      message: {
        title: 'Margem sob pressão',
        body: '{tone_observacao}{prefix} o orçamento consumiu {budgetPct}% da meta e sua folga está em {sovereign}. O orçamento está comprimindo sua margem real — revise antes do fim do mês.',
        ctaLabel: 'Revisar orçamento',
      },
      deepLink: 'manager',
      priority: 'alta',
      action: { label: 'Revisar orçamento', type: 'adjust' },
    },
  },
  {
    id: 'budget-burn-rate',
    condition: (ctx) => {
      const bp = ctx.budgetProgress;
      if (!bp) return false;
      const pctComplete = bp.daysInMonth > 0 ? bp.daysElapsed / bp.daysInMonth : 1;
      return bp.totalPercentage > 75 && pctComplete < 0.7;
    },
    insight: {
      id: 'budget-burn-rate',
      message: {
        title: 'Consumo acelerado',
        body: '{tone_observacao}{prefix} o orçamento já consumiu {budgetPct}% da meta em {budgetDays} dias. O ritmo atual projeta estouro antes do fim do mês.',
        ctaLabel: 'Ajustar orçamento',
      },
      deepLink: 'manager',
      priority: 'alta',
      action: { label: 'Ajustar orçamento', type: 'adjust' },
    },
  },
  {
    id: 'budget-category-at-risk',
    condition: (ctx) => {
      const bp = ctx.budgetProgress;
      if (!bp) return false;
      const pctComplete = bp.daysInMonth > 0 ? bp.daysElapsed / bp.daysInMonth : 1;
      if (pctComplete < 0.3) return false;
      return bp.categories.some((c) => c.status === 'yellow') && bp.totalPercentage < 85;
    },
    insight: {
      id: 'budget-category-at-risk',
      message: {
        title: 'Categoria no limite',
        body: '{tone_observacao}{prefix} {budgetCategory} está com {budgetCatPct}% do orçamento usado. Ajuste o limite ou reduza o ritmo antes que pressione o resto do mês.',
        ctaLabel: 'Ajustar categoria',
      },
      deepLink: 'manager',
      priority: 'media',
      action: { label: 'Ajustar categoria', type: 'adjust' },
    },
  },
  {
    id: 'boas_vindas_primeira_sessao',
    condition: (ctx) => ctx.isFirstSession === true,
    insight: {
      id: 'boas_vindas_primeira_sessao',
      message: {
        title: 'Início de comando',
        body: '{prefix} registre sua primeira movimentação para o sistema calibrar sua estrutura.',
        ctaLabel: 'Lançar agora',
      },
      deepLink: 'transaction-form',
      priority: 'media',
      action: { label: 'Lançar agora', type: 'adjust' },
    },
  },
  // ── CENTRAL ──
  {
    id: 'central-cushion-warning',
    condition: (ctx) => {
      const free = ctx.sovereignFreeBalance ?? 0;
      return free < 0;
    },
    insight: {
      id: 'central-cushion-warning',
      message: {
        title: 'Folga sob pressão',
        body: '{prefix} folga do mês em déficit de {deficit}. Revise Colchão Emergencial, reserva e compromissos do mês.',
        ctaLabel: 'Rever Estrutura',
      },
      deepLink: 'central',
      priority: 'alta',
    },
  },
  {
    id: 'central-nexus-family-protection',
    condition: (ctx) => {
      const hasHighInterestDebt = ctx.debts?.some((d) => (d.taxaMensal || 0) > 5);
      const hasEssentialHome = ctx.passives?.some((p) =>
        checkPurpose(p, ['lar', 'moradia', 'família', 'casa'])
      );
      return !!hasHighInterestDebt && !!hasEssentialHome;
    },
    insight: {
      id: 'central-nexus-family-protection',
      message: {
        title: 'Proteção do lar',
        body: '{prefix} juros altos coexistem com patrimônio essencial. Priorize quitação sem comprometer o porto seguro.',
        ctaLabel: 'Ver Estratégia',
      },
      deepLink: 'minhas-dividas',
      priority: 'alta',
    },
  },
  {
    id: 'central-debt-interest',
    condition: (ctx) => !!ctx.hasDebts,
    insight: {
      id: 'central-debt-interest',
      message: {
        title: 'Impacto dos Juros',
        body: '{prefix} os juros destas dívidas consomem parte da sua folga do mês. Conhecer o custo acumulado e simular uma rota de amortização pode ajudar a recuperar margem no seu fluxo.',
        ctaLabel: 'Ver Estratégia',
      },
      deepLink: 'minhas-dividas',
      priority: 'alta',
    },
  },
  {
    id: 'strategic-opportunity-cost',
    condition: (ctx) => {
      const hasHighInterestDebt = ctx.debts?.some(d => (d.taxaMensal || 0) > 4);
      const hasLiquidityAssets = ctx.assets?.some(a => a.flexibility === 'liquidez' && a.currentValue > 500);
      return !!hasHighInterestDebt && !!hasLiquidityAssets;
    },
    insight: {
      id: 'strategic-opportunity-cost',
      message: {
        title: 'Custo de Oportunidade',
        body: '{prefix} você possui ativos com liquidez enquanto mantém dívidas com juros elevados. A taxa das dívidas costuma superar o rendimento da liquidez — amortizar é uma alternativa que reduz o custo total de juros.',
        ctaLabel: 'Ver Estratégia',
      },
      deepLink: 'minhas-dividas',
      priority: 'alta',
    },
  },
  {
    id: 'strategic-idle-cash',
    condition: (ctx) => {
      const free = ctx.sovereignFreeBalance ?? 0;
      const marco = ctx.marcoZero || 0;      
      return free > marco * 1.5 && free > 2000;
    },
    insight: {
      id: 'strategic-idle-cash',
      message: {
        title: 'Capital Ocioso',
        body: '{prefix} sua folga do mês ({sovereign}) está muito acima do seu Colchão Emergencial. Esse dinheiro parado está perdendo poder de compra. Que tal colocá-lo para trabalhar?',
        ctaLabel: 'Onde Investir?',
      },
      deepLink: 'investimentos',
      priority: 'media',
    },
  },
  {
    id: 'strategic-purpose-alignment',
    condition: (ctx) => {
      const assetsWithoutPurpose = ctx.assets?.filter(a => !a.proposito || a.proposito.length < 5);
      return (assetsWithoutPurpose?.length || 0) >= 2 && ctx.launchCount > 5;
    },
    insight: {
      id: 'strategic-purpose-alignment',
      message: {
        title: 'Investimento sem Alvo',
        body: '{prefix} identifiquei ativos na sua carteira sem um propósito claro. Dinheiro sem destino costuma voltar para o fluxo de consumo. Vamos dar um nome a esse capital?',
        ctaLabel: 'Dar Propósito',
      },
      deepLink: 'investimentos',
      priority: 'baixa',
    },
  },
  // ── HOME — prioridade de dívidas ──
  {
    id: 'strategic-debt-priority',
    condition: (ctx) => !!ctx.hasDebts && (ctx.debts?.length || 0) >= 2,
    insight: {
      id: 'strategic-debt-priority',
      message: {
        title: 'Dívida Prioritária',
        body: '{prefix} identifiquei qual das suas dívidas atacar primeiro com base na taxa, urgência e oportunidade. Eliminar esta dívida libera mais fluxo e acelera sua liberdade financeira.',
        ctaLabel: 'Atacar Dívida',
      },
      deepLink: 'minhas-dividas',
      priority: 'alta',
      action: { label: 'Atacar Agora', type: 'attack_debt' },
    },
  },
];

const SEEN_HOME_KEY = 'nexus-seen-records-v2';
const SEEN_CENTRAL_KEY = 'nexus-central-records-v2';
const MAX_SEEN = 20;
const SUPPRESSION_DURATION_MS = 60 * 60 * 1000;

interface SeenRecord {
  id: string;
  fingerprint: string;
  seenAt: number;
}

export function buildUserContext(params: Partial<UserContext>): UserContext {
  const ctx: UserContext = {
    hasFinancialProfile: false,
    hasPaidAccess: false,
    isPremium: false,
    transactionsToday: 0,
    daysSinceLastTransaction: 999,
    launchCount: 0,
    launchLimit: 30,
    monthBalance: 0,
    accumulatedBalance: 0,
    marcoZero: 0,
    reserveTarget: 0,
    reserveCurrent: 0,
    hasFirstInvestment: false,
    streak: 0,
    ...params,
  };

  ctx.upcomingCreditCardBill = extractUpcomingBill(ctx, params.debts);
  const onboardingCompleted =
    typeof window !== 'undefined' && (localStorage.getItem('financas-pro-invest_onboarding_op_completed') || localStorage.getItem('fpi_onboarding_op_completed'));
  ctx.isFirstSession = ctx.launchCount === 0 && !onboardingCompleted;

  if (ctx.recentLargeIncome === undefined && params.transactions?.length) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    ctx.recentLargeIncome = params.transactions
      .filter((t) => t.type === 'income' && new Date(t.date).getTime() >= weekAgo)
      .reduce((max, t) => Math.max(max, t.amount || 0), 0);
  }

  // Patrimônio Total = Bens Patrimoniais + Investimentos + Reserva de Emergência + Saldo em Conta (colchão + corrente) - Dívidas
  if (ctx.totalAssetsValue === undefined) {
    const totalInvestments = (ctx.assets || []).reduce((s, a) => s + (a.currentValue || 0), 0);
    const totalProperty = (ctx.passives || []).reduce((s, p) => s + (p.currentValue || 0), 0);
    const totalDebts = (ctx.debts || []).reduce((s, d) => s + (d.saldoDevedor || 0), 0);
    const cashInBank = ctx.accumulatedBalance || 0;
    ctx.totalAssetsValue = totalInvestments + totalProperty + cashInBank + (ctx.reserveCurrent || 0) - totalDebts;
  }

  return ctx;
}

/** Tensão financeira real — quando false, Dom do Tempo silencia insights médios/baixos. */
export function hasFinancialTension(ctx: UserContext): boolean {
  const free = ctx.sovereignFreeBalance ?? 0;
  if (free < 0 || (ctx.freedomDeficit || 0) > 0) return true;
  if (ctx.monthBalance < 0) return true;
  const bill = extractUpcomingBill(ctx);
  if (bill && bill.daysToClose <= 5) return true;
  const buffer = (ctx.marcoZero || 0) + (ctx.reserveCurrent || 0);
  if (buffer > 0 && free > 0 && free < buffer * 0.1) return true;
  return false;
}

export function isMarginStable(ctx: UserContext): boolean {
  return ctx.launchCount >= 5 && !hasFinancialTension(ctx);
}

function checkPurpose(item: { proposito?: string }, keywords: string[]): boolean {
  if (!item.proposito) return false;
  const lower = item.proposito.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

type CatalogDomain = 'protecao' | 'cartao' | 'orcamento';

function catalogItemDomain(id: string): CatalogDomain | null {
  if (id === 'home-sovereign-deficit' || id === 'home-margin-thin' || id === 'central-cushion-warning') return 'protecao';
  if (id === 'fatima_reserva' || id === 'home-bill-pressure') return 'cartao';
  if (id.startsWith('budget-')) return 'orcamento';
  return null;
}

function bucket(n: number, step: number): number {
  return Math.round(n / step) * step;
}

function getSeenRecords(key: string): SeenRecord[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getInsightFingerprint(id: string, ctx: UserContext): string {
  const free = ctx.sovereignFreeBalance ?? 0;
  const bill = extractUpcomingBill(ctx);

  switch (id) {
    case 'home-sovereign-deficit':
      return `def:${bucket(ctx.freedomDeficit || Math.abs(Math.min(0, free)), 250)}`;
    case 'home-margin-thin':
      return `thin:${bucket(free, 300)}`;
    case 'home-bill-pressure':
    case 'fatima_reserva':
      return `bill:${bill?.estimatedValue || 0}:${bill?.daysToClose || 0}`;
    case 'home-bonus-inflow':
      return `bonus:${ctx.recentLargeIncome || 0}`;
    case 'home-living-cost-drift': {
      const income = ctx.monthIncome || 1;
      return `drift:${bucket(ctx.monthExpenses || 0, 400)}:${bucket(income, 400)}`;
    }
    case 'central-cushion-warning':
      return `cushion:${bucket(free, 500)}`;
    case 'budget-burn-rate': {
      const pct = ctx.budgetProgress?.totalPercentage ?? 0;
      return `burn:${bucket(pct, 10)}:${bucket(ctx.budgetProgress?.daysElapsed ?? 0, 5)}`;
    }
    case 'budget-margin-pressure': {
      const pct2 = ctx.budgetProgress?.totalPercentage ?? 0;
      return `margin:${bucket(pct2, 10)}:${bucket(free, 500)}`;
    }
    case 'budget-category-at-risk': {
      const bp = ctx.budgetProgress;
      if (!bp) return 'cat:static';
      const risk = bp.categories
        .filter((c) => c.status === 'yellow' || c.status === 'red')
        .sort((a, b) => b.percentage - a.percentage)[0];
      return risk ? `cat:${risk.name}:${bucket(risk.percentage, 10)}` : 'cat:static';
    }
    default:
      return 'static';
  }
}

function isInsightSuppressed(id: string, ctx: UserContext, key: string): boolean {
  const record = getSeenRecords(key).find((r) => r.id === id);
  if (!record) return false;
  const domain = catalogItemDomain(id);
  const multiplier = domain ? getDomainSuppressionMultiplier(domain) : 1;
  if (Date.now() - record.seenAt >= SUPPRESSION_DURATION_MS * multiplier) return false;
  return record.fingerprint === getInsightFingerprint(id, ctx);
}

function markInsightSeen(id: string, ctx: UserContext, key: string): void {
  if (typeof window === 'undefined') return;
  const fp = getInsightFingerprint(id, ctx);
  const updated = [
    { id, fingerprint: fp, seenAt: Date.now() },
    ...getSeenRecords(key).filter((r) => r.id !== id),
  ].slice(0, MAX_SEEN);
  localStorage.setItem(key, JSON.stringify(updated));
}

export function dismissPrioritizedInsight(id: string, ctx: UserContext): void {
  markInsightSeen(id, ctx, SEEN_HOME_KEY);
}

function interpolateMessage(template: string, vars: Record<string, string | number>): string {
  let result = template;
  Object.entries(vars).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  });
  return result;
}

function prepareInsight(insight: NexusInsight, ctx: UserContext): NexusInsight {
  const voice = getPersonaVoice(ctx.persona?.archetype || 'guardian');
  const flow = getFlowLabels(ctx.commandMode);
  const bill = extractUpcomingBill(ctx);
  const free = ctx.sovereignFreeBalance ?? 0;
  const deficit = ctx.freedomDeficit ?? Math.abs(Math.min(0, free));
  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  const domain = catalogItemDomain(insight.id);
  const toneMarker = domain ? getToneMarker(domain) : '';

  const vars: Record<string, string | number> = {
    prefix: voice.prefix,
    motto: voice.motto,
    flowIncome: flow.income.toLowerCase(),
    flowExpense: flow.expense.toLowerCase(),
    streak: ctx.streak,
    sovereign: fmt(free),
    deficit: fmt(deficit),
    bonus: fmt(ctx.recentLargeIncome || 0),
    ratio: ctx.monthIncome
      ? Math.round(((ctx.monthExpenses || 0) / ctx.monthIncome) * 100)
      : 0,
    tone_observacao: toneMarker,
  };

  if (bill) {
    vars.days = bill.daysToClose;
    vars.value = fmt(bill.estimatedValue);
  }

  if (ctx.budgetProgress) {
    const bp = ctx.budgetProgress;
    vars.budgetPct = Math.round(bp.totalPercentage);
    vars.budgetDays = bp.daysElapsed;
    const projected = bp.daysElapsed > 0
      ? Math.max(0, (bp.totalSpent / bp.daysElapsed) * bp.daysInMonth - bp.totalBudget)
      : 0;
    vars.budgetOvershoot = fmt(projected);
    const riskCat = [...bp.categories]
      .filter((c) => c.status === 'yellow' || c.status === 'red')
      .sort((a, b) => b.percentage - a.percentage)[0];
    if (riskCat) {
      vars.budgetCategory = riskCat.name;
      vars.budgetCatPct = Math.round(riskCat.percentage);
    } else {
      vars.budgetCategory = '—';
      vars.budgetCatPct = 0;
    }
  }

  const prepared: NexusInsight = {
    ...insight,
    message: {
      ...insight.message,
      body: interpolateMessage(insight.message.body, vars),
    },
    style: { brandColor: voice.color },
  };

  if (prepared.action?.type === 'attack_debt' && ctx.debts && ctx.debts.length >= 2) {
    const rankings = rankDebts(ctx.debts, ctx.sovereignFreeBalance);
    if (rankings[0]?.debt?.id) {
      prepared.action = { ...prepared.action, payload: { debtId: rankings[0].debt.id } };
    }
  }

  prepared.traceability = buildInsightTraceability(insight.id, ctx);

  return prepared;
}

export function buildInsightTraceability(id: string, ctx: UserContext): NexusTraceability {
  const free = ctx.sovereignFreeBalance ?? 0;
  const deficit = ctx.freedomDeficit ?? Math.abs(Math.min(0, free));
  const bill = extractUpcomingBill(ctx);
  const buffer = (ctx.marcoZero || 0) + (ctx.reserveCurrent || 0);
  const bp = ctx.budgetProgress;
  const debts = ctx.debts || [];
  const totalDebts = debts.reduce((s, d) => s + (d.saldoDevedor || 0), 0);
  const maxTaxa = debts.length > 0 ? Math.max(...debts.map((d) => d.taxaMensal || 0)) : 0;
  const ratio = ctx.monthIncome ? Math.round(((ctx.monthExpenses || 0) / ctx.monthIncome) * 100) : 0;

  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  const evaluatedAt = new Date().toISOString();

  switch (id) {
    case 'home-sovereign-deficit':
    case 'op-sovereign-deficit':
      return {
        reason: `Déficit de liberdade apurado em ${fmt(deficit)} com saldo livre de ${fmt(free)}, consumindo a estrutura de proteção.`,
        period: 'Mês corrente',
        evaluatedAt,
        metrics: [
          { label: 'Déficit de Liberdade', value: fmt(deficit) },
          { label: 'Saldo Livre Real', value: fmt(free) },
          { label: 'Colchão Inicial', value: fmt(ctx.marcoZero || 0) },
        ],
        sources: ['Lançamentos do mês', 'Colchão Emergencial', 'Obrigações fixas'],
      };

    case 'fatima_reserva':
    case 'home-bill-pressure': {
      const estimatedVal = bill?.estimatedValue || 0;
      const days = bill?.daysToClose ?? 0;
      return {
        reason: `Fatura prevista de ${fmt(estimatedVal)} com vencimento em ${days} dias contra Colchão Emergencial de ${fmt(ctx.marcoZero || 0)}.`,
        period: 'Ciclo da fatura',
        evaluatedAt,
        metrics: [
          { label: 'Fatura Prevista', value: fmt(estimatedVal) },
          { label: 'Dias p/ Fechamento', value: `${days} dias` },
          { label: 'Colchão Emergencial', value: fmt(ctx.marcoZero || 0) },
        ],
        sources: ['Cartões de crédito', 'Extrato de lançamentos', 'Base de Proteção'],
      };
    }

    case 'home-margin-thin':
      return {
        reason: `Saldo livre de ${fmt(free)} abaixo de 15% da estrutura de proteção (${fmt(buffer * 0.15)}).`,
        period: 'Mês corrente',
        evaluatedAt,
        metrics: [
          { label: 'Saldo Livre Real', value: fmt(free) },
          { label: 'Margem Mínima Segura', value: fmt(buffer * 0.15) },
          { label: 'Estrutura Protegida', value: fmt(buffer) },
        ],
        sources: ['Fluxo de caixa', 'Reserva de Emergência', 'Colchão'],
      };

    case 'home-bonus-inflow':
      return {
        reason: `Receita avulsa relevante de ${fmt(ctx.recentLargeIncome || 0)} detectada nos últimos 7 dias.`,
        period: 'Últimos 7 dias',
        evaluatedAt,
        metrics: [
          { label: 'Receita Detectada', value: fmt(ctx.recentLargeIncome || 0) },
          { label: 'Saldo Livre Atual', value: fmt(free) },
        ],
        sources: ['Lançamentos de receita recente'],
      };

    case 'home-living-cost-drift':
      return {
        reason: `Despesas de ${fmt(ctx.monthExpenses || 0)} comprometendo ${ratio}% das receitas cadastradas (${fmt(ctx.monthIncome || 0)}).`,
        period: 'Mês corrente',
        evaluatedAt,
        metrics: [
          { label: 'Despesas do Mês', value: fmt(ctx.monthExpenses || 0) },
          { label: 'Receitas do Mês', value: fmt(ctx.monthIncome || 0) },
          { label: 'Comprometimento', value: `${ratio}%` },
        ],
        sources: ['Extrato de receitas e despesas'],
      };

    case 'budget-margin-pressure':
    case 'budget-burn-rate':
    case 'budget-category-at-risk': {
      const budgetPct = bp ? Math.round(bp.totalPercentage) : 0;
      const daysElapsed = bp?.daysElapsed || 0;
      const daysTotal = bp?.daysInMonth || 30;
      return {
        reason: `Consumo de ${budgetPct}% do teto orçamentário em ${daysElapsed} dias decorridos do mês.`,
        period: 'Mês corrente',
        evaluatedAt,
        metrics: [
          { label: 'Orçamento Planejado', value: fmt(bp?.totalBudget || 0) },
          { label: 'Gasto Realizado', value: fmt(bp?.totalSpent || 0) },
          { label: 'Percentual Consumido', value: `${budgetPct}%` },
          { label: 'Dias Decorridos', value: `${daysElapsed}/${daysTotal} dias` },
        ],
        sources: ['Planejamento de orçamento', 'Lançamentos categorizados'],
      };
    }

    case 'central-debt-interest':
    case 'strategic-debt-priority':
    case 'strategic-opportunity-cost':
      return {
        reason: `${debts.length} dívidas ativas somando ${fmt(totalDebts)} com juros contratuais de até ${maxTaxa.toFixed(2)}% a.m.`,
        period: 'Posição atual',
        evaluatedAt,
        metrics: [
          { label: 'Saldo Devedor Total', value: fmt(totalDebts) },
          { label: 'Maior Taxa Cadastrada', value: `${maxTaxa.toFixed(2)}% a.m.` },
          { label: 'Dívidas Ativas', value: `${debts.length}` },
        ],
        sources: ['Módulo de dívidas', 'Contratos cadastrados'],
      };

    case 'strategic-idle-cash':
      return {
        reason: `Saldo livre de ${fmt(free)} superior a 150% do Colchão Emergencial (${fmt((ctx.marcoZero || 0) * 1.5)}).`,
        period: 'Posição atual',
        evaluatedAt,
        metrics: [
          { label: 'Saldo Livre Disponível', value: fmt(free) },
          { label: 'Colchão de Referência', value: fmt(ctx.marcoZero || 0) },
        ],
        sources: ['Soberania financeira', 'Colchão Emergencial'],
      };

    default:
      return {
        reason: 'Diagnóstico consolidado com base nos registros do mês e na estrutura patrimonial do usuário.',
        period: 'Mês corrente',
        evaluatedAt,
        metrics: [
          { label: 'Saldo do Mês', value: fmt(ctx.monthBalance || 0) },
          { label: 'Saldo Livre Real', value: fmt(free) },
        ],
        sources: ['Extrato de lançamentos', 'Perfil financeiro'],
      };
  }
}


function pickBest(candidates: CatalogItem[]): CatalogItem | null {
  if (candidates.length === 0) return null;
  const priorityOrder: Record<string, number> = { alta: 0, media: 1, baixa: 2, inline: 3 };
  return [...candidates].sort(
    (a, b) => priorityOrder[a.insight.priority] - priorityOrder[b.insight.priority]
  )[0];
}

export function getPrioritizedInsight(ctx: UserContext): NexusInsight | null {
  let candidates = INSIGHT_CATALOG.filter((item) => !item.id.startsWith('central-'))
    .filter((item) => item.condition(ctx))
    .filter((item) => !isInsightSuppressed(item.id, ctx, SEEN_HOME_KEY));

  const priorityLevels: Array<'alta' | 'media' | 'baixa' | 'inline'> = ['alta', 'media', 'baixa', 'inline'];

  // Comportamento: rebalanceia prioridade por domínio
  candidates = candidates.map((item) => {
    const domain = catalogItemDomain(item.id);
    const delta = domain ? getEffectivePriorityDelta(domain) : 0;
    if (delta === 0) return item;
    const idx = priorityLevels.indexOf(item.insight.priority);
    const adjusted = Math.max(0, Math.min(3, idx + delta));
    return { ...item, insight: { ...item.insight, priority: priorityLevels[adjusted] } };
  });

  // Dom do Tempo: plano estável → silencia insights médios/baixos
  if (isMarginStable(ctx)) {
    candidates = candidates.filter((item) => item.insight.priority === 'alta');
  }

  const chosen = pickBest(candidates);
  if (!chosen) return null;

  markInsightSeen(chosen.id, ctx, SEEN_HOME_KEY);
  const prepared = prepareInsight(chosen.insight, ctx);

  traceInsightShown(chosen.insight, ctx);

  const followUp = collectFollowUp(ctx);
  if (followUp) {
    prepared.followUp = followUp.text;
  }

  return prepared;
}

export function getCentralInsights(ctx: UserContext): NexusInsight[] {
  const candidates = INSIGHT_CATALOG.filter((item) => item.id.startsWith('central-'))
    .filter((item) => item.condition(ctx))
    .filter((item) => !isInsightSuppressed(item.id, ctx, SEEN_CENTRAL_KEY));

  if (candidates.length === 0) return [];

  const priorityOrder: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
  const sorted = [...candidates].sort(
    (a, b) => priorityOrder[a.insight.priority] - priorityOrder[b.insight.priority]
  );

  const top = sorted.slice(0, 3);
  if (top.length > 0) {
    markInsightSeen(top[0].id, ctx, SEEN_CENTRAL_KEY);
  }

  return top.map((c) => prepareInsight(c.insight, ctx));
}

export function getOperationalInsight(ctx: UserContext): NexusInsight | null {
  const OPERATIONAL: CatalogItem[] = [
    {
      id: 'op-sovereign-deficit',
      condition: (c) => {
        const margin = c.sovereignFreeBalance ?? 0;
        return !!c.commandMode && ((c.freedomDeficit || 0) > 0 || margin < 0);
      },
      insight: {
        id: 'op-sovereign-deficit',
        message: {
          title: 'Estrutura pressionada',
          body: '{prefix} este movimento mantém sua folga do mês em déficit de {deficit}.',
          ctaLabel: 'Ver Baldes',
        },
        deepLink: 'manager',
        priority: 'inline',
      },
    },
    {
      id: 'op-consistency-5',
      condition: (c) => c.transactionsToday === 5,
      insight: {
        id: 'op-consistency-5',
        message: {
          title: 'Consistência de registro',
          body: '{prefix} 5 movimentações hoje — registro em dia.',
          ctaLabel: 'Continuar',
        },
        deepLink: 'manager',
        priority: 'inline',
      },
    },
    {
      id: 'op-budget-warning',
      condition: (c) => {
        const margin = c.sovereignFreeBalance ?? c.monthBalance;
        return margin < 0;
      },
      insight: {
        id: 'op-budget-warning',
        message: {
          title: 'Folga negativa',
          body: '{prefix} a folga do mês ficou negativa neste mês. Revisar estrutura pode recuperar fôlego.',
          ctaLabel: 'Ver Detalhes',
        },
        deepLink: 'manager',
        priority: 'inline',
      },
    },
  ];

  const hit = OPERATIONAL.find((item) => item.condition(ctx));
  return hit ? prepareInsight(hit.insight, ctx) : null;
}
