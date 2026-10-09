import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPrioritizedInsight,
  getCentralInsights,
  buildUserContext,
  getOperationalInsight,
  isMarginStable,
  hasFinancialTension,
  dismissPrioritizedInsight,
  buildInsightTraceability,
} from '../nexusInsightEngine';
import type { BudgetInsightData, BudgetCategoryData } from '../nexusInsightEngine';

describe('NexusInsightEngine v2', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        store[key] = val;
      }),
      clear: vi.fn(() => {
        store = {};
      }),
    });
  });

  it('retorna insight de fatura quando fechamento está próximo', () => {
    const ctx = buildUserContext({
      hasFinancialProfile: true,
      launchCount: 10,
      upcomingCreditCardBill: { daysToClose: 3, estimatedValue: 1500.5 },
    });

    const insight = getPrioritizedInsight(ctx);
    expect(insight?.id).toBe('fatima_reserva');
    expect(insight?.message.body).toContain('3 dias');
  });

  it('Dom do Tempo: margem estável suprime insights médios', () => {
    const ctx = buildUserContext({
      hasFinancialProfile: true,
      launchCount: 20,
      monthBalance: 8000,
      monthIncome: 10000,
      monthExpenses: 5000,
      sovereignFreeBalance: 4000,
      marcoZero: 2000,
      reserveCurrent: 1000,
    });

    expect(isMarginStable(ctx)).toBe(true);
    expect(hasFinancialTension(ctx)).toBe(false);

    const insight = getPrioritizedInsight(ctx);
    if (insight) {
      expect(insight.priority).toBe('alta');
    }
  });

  it('detecta déficit de liberdade na Home', () => {
    const ctx = buildUserContext({
      hasFinancialProfile: true,
      launchCount: 15,
      sovereignFreeBalance: -500,
      freedomDeficit: 500,
    });

    const insight = getPrioritizedInsight(ctx);
    expect(insight?.id).toBe('home-sovereign-deficit');
  });

  it('reexibe insight quando fingerprint muda', () => {
    const base = buildUserContext({
      hasFinancialProfile: true,
      launchCount: 15,
      sovereignFreeBalance: -200,
      freedomDeficit: 200,
    });

    getPrioritizedInsight(base);
    dismissPrioritizedInsight('home-sovereign-deficit', base);

    const worsened = buildUserContext({
      ...base,
      sovereignFreeBalance: -800,
      freedomDeficit: 800,
    });

    const again = getPrioritizedInsight(worsened);
    expect(again?.id).toBe('home-sovereign-deficit');
  });

  it('insight operacional usa margem soberana negativa', () => {
    const ctx = buildUserContext({
      sovereignFreeBalance: -100,
      monthBalance: -100,
      transactionsToday: 1,
    });

    const insight = getOperationalInsight(ctx);
    expect(insight?.id).toBe('op-budget-warning');
    expect(insight?.message.body).toContain('folga');
  });

  it('Central retorna insights de dívida quando aplicável', () => {
    const ctx = buildUserContext({
      hasFinancialProfile: true,
      hasDebts: true,
      launchCount: 10,
    });

    const insights = getCentralInsights(ctx);
    expect(insights.some((i) => i.id === 'central-debt-interest')).toBe(true);
  });

  it('central-cushion-warning aparece quando sovereignFreeBalance < 0', () => {
    const ctx = buildUserContext({
      launchCount: 10,
      sovereignFreeBalance: -2000,
      freedomDeficit: 2000,
      monthBalance: 5000,
    });

    const insights = getCentralInsights(ctx);
    expect(insights.some((i) => i.id === 'central-cushion-warning')).toBe(true);
  });

  it('central-cushion-warning NÃO aparece quando sovereignFreeBalance >= 0 mesmo com monthBalance negativo', () => {
    const ctx = buildUserContext({
      launchCount: 10,
      sovereignFreeBalance: 5000,
      monthBalance: -3000,
      obligationsDeduction: 6000,
      marcoZero: 2000,
      reserveCurrent: 1000,
    });

    const insights = getCentralInsights(ctx);
    expect(insights.some((i) => i.id === 'central-cushion-warning')).toBe(false);
  });

  it('central-cushion-warning sincroniza com home-sovereign-deficit (mesma condição)', () => {
    const ctxNegativo = buildUserContext({
      launchCount: 15,
      sovereignFreeBalance: -1500,
      freedomDeficit: 1500,
    });

    const homeInsight = getPrioritizedInsight(ctxNegativo);
    const centralInsights = getCentralInsights(ctxNegativo);

    const homeDispara = homeInsight?.id === 'home-sovereign-deficit';
    const centralDispara = centralInsights.some((i) => i.id === 'central-cushion-warning');

    expect(homeDispara).toBe(true);
    expect(centralDispara).toBe(true);
  });
});

describe('Budget Insights — orçamento ativo', () => {
  function makeBudgetProgress(
    overrides: Partial<BudgetInsightData> & { categories?: BudgetCategoryData[] }
  ): BudgetInsightData {
    return {
      totalBudget: 5000,
      totalSpent: 0,
      totalPercentage: 0,
      daysElapsed: 10,
      daysInMonth: 30,
      categories: [],
      ...overrides,
    };
  }

  it('budget-margin-pressure: orçamento > 90% comprime margem', () => {
    const ctx = buildUserContext({
      launchCount: 15,
      monthExpenses: 4000,
      sovereignFreeBalance: 500,
      budgetProgress: makeBudgetProgress({
        totalPercentage: 92,
        totalSpent: 4600,
        daysElapsed: 25,
      }),
    });
    const insight = getPrioritizedInsight(ctx);
    expect(insight?.id).toBe('budget-margin-pressure');
    expect(insight?.message.body).toContain('92%');
  });

  it('budget-margin-pressure: margem comprimida mesmo com % < 90 quando free < 30% despesas', () => {
    const ctx = buildUserContext({
      launchCount: 15,
      monthExpenses: 3000,
      sovereignFreeBalance: 200,
      budgetProgress: makeBudgetProgress({
        totalPercentage: 85,
        totalSpent: 4250,
        daysElapsed: 24,
        daysInMonth: 30,
      }),
    });
    const insight = getPrioritizedInsight(ctx);
    expect(insight?.id).toBe('budget-margin-pressure');
  });

  it('budget-burn-rate: consumo > 75% com menos de 70% do mês decorrido', () => {
    const ctx = buildUserContext({
      launchCount: 15,
      sovereignFreeBalance: 3000,
      budgetProgress: makeBudgetProgress({
        totalPercentage: 80,
        totalSpent: 4000,
        daysElapsed: 10,
        daysInMonth: 30,
      }),
    });
    const insight = getPrioritizedInsight(ctx);
    expect(insight?.id).toBe('budget-burn-rate');
    expect(insight?.message.body).toContain('80%');
    expect(insight?.message.body).toContain('10 dias');
  });

  it('budget-burn-rate não dispara quando consumo é alto mas mês já passou de 70%', () => {
    const ctx = buildUserContext({
      launchCount: 15,
      budgetProgress: makeBudgetProgress({
        totalPercentage: 80,
        daysElapsed: 25,
        daysInMonth: 30,
      }),
    });
    const insight = getPrioritizedInsight(ctx);
    expect(insight?.id).not.toBe('budget-burn-rate');
  });

  it('budget-category-at-risk: categoria amarela dispara alerta', () => {
    const ctx = buildUserContext({
      launchCount: 3,
      budgetProgress: makeBudgetProgress({
        totalPercentage: 50,
        totalSpent: 2500,
        daysElapsed: 15,
        categories: [
          { name: 'Alimentação', limit: 1000, spent: 850, percentage: 85, status: 'yellow' },
          { name: 'Transporte', limit: 500, spent: 200, percentage: 40, status: 'green' },
        ],
      }),
    });
    const insight = getPrioritizedInsight(ctx);
    expect(insight?.id).toBe('budget-category-at-risk');
    expect(insight?.message.body).toContain('Alimentação');
    expect(insight?.message.body).toContain('85%');
  });

  it('budget-category-at-risk não dispara nos primeiros 30% do mês', () => {
    const ctx = buildUserContext({
      launchCount: 15,
      budgetProgress: makeBudgetProgress({
        totalPercentage: 50,
        totalSpent: 2500,
        daysElapsed: 5,
        daysInMonth: 30,
        categories: [
          { name: 'Lazer', limit: 500, spent: 420, percentage: 84, status: 'yellow' },
        ],
      }),
    });
    const insight = getPrioritizedInsight(ctx);
    expect(insight?.id).not.toBe('budget-category-at-risk');
  });

  it('budget-category-at-risk não dispara se % total >= 85 (já coberto por outros insights)', () => {
    const ctx = buildUserContext({
      launchCount: 15,
      budgetProgress: makeBudgetProgress({
        totalPercentage: 86,
        daysElapsed: 15,
        categories: [
          { name: 'Lazer', limit: 500, spent: 420, percentage: 84, status: 'yellow' },
        ],
      }),
    });
    const insight = getPrioritizedInsight(ctx);
    expect(insight?.id).not.toBe('budget-category-at-risk');
  });

  it('sem budgetProgress, insights de orçamento não interferem', () => {
    const ctx = buildUserContext({
      launchCount: 15,
      monthExpenses: 4000,
      sovereignFreeBalance: 500,
    });
    const insight = getPrioritizedInsight(ctx);
    expect(insight?.id).not.toBe('budget-margin-pressure');
    expect(insight?.id).not.toBe('budget-burn-rate');
    expect(insight?.id).not.toBe('budget-category-at-risk');
  });
  describe('Rastreabilidade Quantitativa Fiel (Frente 3)', () => {
    it('gera rastreabilidade com métricas exatas para iminência de fatura', () => {
      const ctx = buildUserContext({
        hasFinancialProfile: true,
        launchCount: 10,
        marcoZero: 3000,
        upcomingCreditCardBill: { daysToClose: 2, estimatedValue: 1850.75 },
      });

      const trace = buildInsightTraceability('fatima_reserva', ctx);
      expect(trace.reason).toContain('1.850,75');
      expect(trace.reason).toContain('2 dias');
      expect(trace.period).toBe('Ciclo da fatura');
      expect(trace.sources).toContain('Cartões de crédito');

      const valMetric = trace.metrics.find((m) => m.label === 'Fatura Prevista');
      const daysMetric = trace.metrics.find((m) => m.label === 'Dias p/ Fechamento');
      const bufferMetric = trace.metrics.find((m) => m.label === 'Colchão Emergencial');

      expect(valMetric?.value).toContain('1.850,75');
      expect(daysMetric?.value).toBe('2 dias');
      expect(bufferMetric?.value).toContain('3.000,00');
    });

    it('anexa traceability em getPrioritizedInsight para home-sovereign-deficit', () => {
      const ctx = buildUserContext({
        hasFinancialProfile: true,
        launchCount: 12,
        sovereignFreeBalance: -450,
        freedomDeficit: 450,
        marcoZero: 2000,
      });

      const insight = getPrioritizedInsight(ctx);
      expect(insight?.id).toBe('home-sovereign-deficit');
      expect(insight?.traceability).toBeDefined();
      expect(insight?.traceability?.reason).toContain('450,00');
      expect(insight?.traceability?.sources).toContain('Colchão Emergencial');

      const deficitMetric = insight?.traceability?.metrics.find((m) => m.label === 'Déficit de Liberdade');
      expect(deficitMetric?.value).toContain('450,00');
    });

    it('anexa rastreabilidade contábil nas recomendações centrais de dívidas', () => {
      const ctx = buildUserContext({
        hasFinancialProfile: true,
        launchCount: 8,
        hasDebts: true,
        debts: [
          { id: 'd1', name: 'Cartão Rotativo', saldoDevedor: 3500, taxaMensal: 14.5 } as any,
          { id: 'd2', name: 'Empréstimo Pessoal', saldoDevedor: 6000, taxaMensal: 3.2 } as any,
        ],
      });

      const central = getCentralInsights(ctx);
      expect(central.length).toBeGreaterThan(0);
      const debtInsight = central.find((c) => c.traceability?.metrics.some((m) => m.label === 'Saldo Devedor Total'));
      expect(debtInsight).toBeDefined();
      expect(debtInsight?.traceability?.metrics.find((m) => m.label === 'Saldo Devedor Total')?.value).toContain('9.500,00');
      expect(debtInsight?.traceability?.metrics.find((m) => m.label === 'Maior Taxa Cadastrada')?.value).toBe('14.50% a.m.');
      expect(debtInsight?.traceability?.metrics.find((m) => m.label === 'Dívidas Ativas')?.value).toBe('2');
    });
  });
});
