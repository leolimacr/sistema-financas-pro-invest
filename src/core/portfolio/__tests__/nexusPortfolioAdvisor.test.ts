import { describe, it, expect } from 'vitest';
import { evaluatePortfolioInsights, isEmergencyReserveVulnerable } from '../nexusPortfolioAdvisor';
import type { DerivedAssetPosition, PortfolioAllocationSummary } from '../portfolioTypes';
import type { PortfolioTaxSummary } from '../taxEngine';

describe('nexusPortfolioAdvisor - Consciência Estratégica da Carteira', () => {
  const baseSummary: PortfolioAllocationSummary = {
    consolidatedTotalBRL: 100000,
    totalInvestedAssetsBRL: 95000,
    totalPortfolioCashBRL: 5000,
    denominatorUsedBRL: 100000,
    includeCashInTargets: true,
    sumTargetsPercentage: 100,
    isTargetSumValid: true,
    targetDiscrepancyPercent: 0,
    categories: [
      {
        category: 'Ações Brasil',
        targetPercentage: 40,
        currentValueBRL: 40000,
        currentPercentage: 40,
        differenceBRL: 0,
        allocationRatio: 1,
      },
      {
        category: 'Renda Fixa',
        targetPercentage: 60,
        currentValueBRL: 60000,
        currentPercentage: 60,
        differenceBRL: 0,
        allocationRatio: 1,
      },
    ],
    assets: [],
  };

  const balancedPositions: DerivedAssetPosition[] = [
    {
      assetId: 'ast-vale',
      ticker: 'VALE3',
      name: 'Vale',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      targetPercentage: 20,
      quantity: 100,
      hasKnownQuantity: true,
      isBalanceOnly: false,
      hasKnownCost: true,
      avgCostOriginal: 60,
      avgCostBRL: 60,
      totalInvestedBRL: 6000,
      realizedPnLOriginal: 0,
      realizedPnLBRL: 0,
      totalDividendsOriginal: 0,
      totalDividendsBRL: 0,
      currentPriceOriginal: 65,
      currentFxRateToBRL: 1,
      currentPriceBRL: 65,
      currentValueOriginal: 6500,
      currentValueBRL: 6500,
      unrealizedPnLBRL: 500,
      unrealizedPnLPercent: 8.33,
      assetReturnPercentOriginal: 8.33,
      fxReturnPercent: 0,
      movementCount: 1,
      ledgerChecksum: 'c1',
      lastMovementDate: '2026-06-01',
      institution: 'XP Investimentos',
    },
  ];

  it('1. Deve emitir parecer positivo de calibração quando a carteira estiver em equilíbrio', () => {
    // Sem caixa ocioso nem desvios
    const summaryNoCash = { ...baseSummary, totalPortfolioCashBRL: 0 };
    const insights = evaluatePortfolioInsights({
      summary: summaryNoCash,
      positions: balancedPositions,
    });

    expect(insights).toHaveLength(1);
    expect(insights[0].category).toBe('DISCIPLINE');
    expect(insights[0].severity).toBe('positive');
    expect(insights[0].title).toContain('Carteira Soberana Calibrada');
  });

  it('2. Deve disparar alerta de concentração quando um ativo representar mais de 25% do patrimônio', () => {
    const concentratedPosition: DerivedAssetPosition = {
      ...balancedPositions[0],
      currentValueBRL: 35000, // 35% de 100k
    };

    const insights = evaluatePortfolioInsights({
      summary: { ...baseSummary, totalPortfolioCashBRL: 0 },
      positions: [concentratedPosition],
    });

    const concentrationAlert = insights.find((i) => i.category === 'CONCENTRATION');
    expect(concentrationAlert).toBeDefined();
    expect(concentrationAlert?.severity).toBe('warning');
    expect(concentrationAlert?.message).toContain('35.0%');
  });

  it('3. Deve alertar desvio de alocação por classe quando diferença ultrapassar 15 pontos percentuais', () => {
    const imbalancedSummary: PortfolioAllocationSummary = {
      ...baseSummary,
      totalPortfolioCashBRL: 0,
      categories: [
        {
          category: 'Ações Brasil',
          targetPercentage: 40,
          currentValueBRL: 65000,
          currentPercentage: 65, // Desvio de 25 pontos percentuais (> 15)
          differenceBRL: 25000,
          allocationRatio: 1.625,
        },
      ],
    };

    const insights = evaluatePortfolioInsights({
      summary: imbalancedSummary,
      positions: balancedPositions,
    });

    const rebalanceAlert = insights.find((i) => i.category === 'REBALANCE');
    expect(rebalanceAlert).toBeDefined();
    expect(rebalanceAlert?.title).toContain('Desvio de Meta');
  });

  it('4. Deve sugerir uso do Caixa de Oportunidade quando houver saldo em caixa e classes deficitárias', () => {
    const summaryWithDeficit: PortfolioAllocationSummary = {
      ...baseSummary,
      totalPortfolioCashBRL: 5000,
      categories: [
        {
          category: 'Renda Fixa',
          targetPercentage: 60,
          currentValueBRL: 40000,
          currentPercentage: 40,
          differenceBRL: -20000, // Classe abaixo da meta
          allocationRatio: 0.67,
        },
      ],
    };

    const insights = evaluatePortfolioInsights({
      summary: summaryWithDeficit,
      positions: balancedPositions,
    });

    const cashAlert = insights.find((i) => i.category === 'OPPORTUNITY_CASH');
    expect(cashAlert).toBeDefined();
    expect(cashAlert?.title).toContain('Caixa Estratégico Disponível');
  });

  it('5. Deve alertar proximidade do teto de isenção de R$ 20.000 em vendas de ações no mês', () => {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const mockTaxSummary: PortfolioTaxSummary = {
      accumulatedStocksLossBRL: 0,
      accumulatedFiisLossBRL: 0,
      totalTaxPaidOrDueBRL: 0,
      totalExemptProfitBRL: 2500,
      reports: [
        {
          yearMonth: currentMonthKey,
          monthName: 'Mês Atual',
          stocksSalesTotalBRL: 17500, // Entre 15k e 20k
          isStocksExempt: true,
          stocksRawProfitLossBRL: 2500,
          stocksExemptProfitBRL: 2500,
          stocksTaxableProfitBRL: 0,
          stocksLossCarriedForwardBRL: 0,
          stocksRemainingLossBRL: 0,
          stocksTaxDueBRL: 0,
          fiisSalesTotalBRL: 0,
          fiisRawProfitLossBRL: 0,
          fiisTaxableProfitBRL: 0,
          fiisLossCarriedForwardBRL: 0,
          fiisRemainingLossBRL: 0,
          fiisTaxDueBRL: 0,
          totalTaxDueBRL: 0,
          darfCode: '6015',
          darfDueDate: '2026-11-30',
          isDarfPayable: false,
          sales: [],
        },
      ],
    };

    const summaryNoCash = { ...baseSummary, totalPortfolioCashBRL: 0 };
    const insights = evaluatePortfolioInsights({
      summary: summaryNoCash,
      positions: balancedPositions,
      taxSummary: mockTaxSummary,
    });

    const taxAlert = insights.find((i) => i.category === 'TAX');
    expect(taxAlert).toBeDefined();
    expect(taxAlert?.title).toContain('Limite de Isenção');
    expect(taxAlert?.message).toContain('17.500,00');
  });

  it('deve emitir alerta de blindagem de liquidez quando o Saldo Livre Real for negativo', () => {
    const summaryNoCash = { ...baseSummary, totalPortfolioCashBRL: 0 };
    const insights = evaluatePortfolioInsights({
      summary: summaryNoCash,
      positions: balancedPositions,
      availableFreeBalance: -1500,
    });

    const shieldInsight = insights.find((i) => i.category === 'LIQUIDITY_SHIELD');
    expect(shieldInsight).toBeDefined();
    expect(shieldInsight?.severity).toBe('warning');
    expect(shieldInsight?.title).toContain('Saldo Livre Deficitário');
    expect(shieldInsight?.message).toContain('1.500,00');
  });

  it('deve emitir alerta de blindagem quando a Reserva de Emergência estiver vulnerável', () => {
    const summaryNoCash = { ...baseSummary, totalPortfolioCashBRL: 0 };
    const insights = evaluatePortfolioInsights({
      summary: summaryNoCash,
      positions: balancedPositions,
      availableFreeBalance: 500,
      hasEmergencyReserveAlert: true,
    });

    const reserveInsight = insights.find((i) => i.id === 'insight-liquidity-shield-reserve');
    expect(reserveInsight).toBeDefined();
    expect(reserveInsight?.severity).toBe('warning');
    expect(reserveInsight?.title).toContain('Reserva de Emergência Vulnerável');
  });

  it('deve sugerir aporte quando houver Saldo Livre Real positivo e ativos abaixo da meta', () => {
    const summaryWithUnderweight: PortfolioAllocationSummary = {
      ...baseSummary,
      totalPortfolioCashBRL: 0,
      categories: [
        {
          category: 'Ações Brasil',
          targetPercentage: 50,
          currentValueBRL: 30000,
          currentPercentage: 30,
          differenceBRL: -20000,
          allocationRatio: 0.6,
        },
      ],
    };

    const insights = evaluatePortfolioInsights({
      summary: summaryWithUnderweight,
      positions: balancedPositions,
      availableFreeBalance: 2500,
    });

    const freeBalanceInsight = insights.find((i) => i.id === 'insight-free-balance-available');
    expect(freeBalanceInsight).toBeDefined();
    expect(freeBalanceInsight?.severity).toBe('action');
    expect(freeBalanceInsight?.message).toContain('2.500,00');
  });

  it('deve emitir alerta de calibração quando houver ativos sem cotas ou sem instituição', () => {
    const uncalibratedPosition: DerivedAssetPosition = {
      ...balancedPositions[0],
      assetId: 'ast-petr',
      ticker: 'PETR4',
      quantity: null,
      hasKnownQuantity: false,
      isBalanceOnly: true,
      institution: undefined,
      targetPercentage: 0,
    };

    const insights = evaluatePortfolioInsights({
      summary: baseSummary,
      positions: [uncalibratedPosition],
    });

    const calibrationInsight = insights.find((i) => i.category === 'CALIBRATION');
    expect(calibrationInsight).toBeDefined();
    expect(calibrationInsight?.id).toBe('insight-calibration-needed');
    expect(calibrationInsight?.severity).toBe('action');
    expect(calibrationInsight?.actionLabel).toBe('Calibrar Ativos');
    expect(calibrationInsight?.message).toContain('sem quantidade de cotas');
  });

  describe('isEmergencyReserveVulnerable - Avaliação Factual da Base de Proteção', () => {
    it('deve retornar false quando snapshot for nulo ou metas não estiverem definidas', () => {
      expect(isEmergencyReserveVulnerable(null)).toBe(false);
      expect(isEmergencyReserveVulnerable(undefined)).toBe(false);
      expect(isEmergencyReserveVulnerable({ reserveTarget: 0, reserveCoverage: 0 })).toBe(false);
      expect(isEmergencyReserveVulnerable({ totalProtectionTarget: 0, protectionBuffer: 0 })).toBe(false);
    });

    it('deve retornar false quando a reserva/proteção estiver 100% coberta ou excedente', () => {
      // Cenário do investidor real: Meta 40k reserva + 15k colchão = 55k total, coberto 55k com excedente
      const solidProtection = {
        totalProtectionTarget: 55000,
        protectionBuffer: 55000,
        reserveTarget: 40000,
        reserveCoverage: 40000,
        reserveShortfall: 0,
      };
      expect(isEmergencyReserveVulnerable(solidProtection)).toBe(false);

      // Cenário com apenas reserva isolada
      const solidReserveOnly = {
        reserveTarget: 40000,
        reserveCoverage: 40000,
      };
      expect(isEmergencyReserveVulnerable(solidReserveOnly)).toBe(false);
    });

    it('deve retornar true quando a cobertura estiver abaixo de 50% da meta', () => {
      // Meta 40k, mas apenas 15k cobertos (37.5% de cobertura)
      const vulnerableSnapshot = {
        totalProtectionTarget: 55000,
        protectionBuffer: 20000,
        reserveTarget: 40000,
        reserveCoverage: 5000,
      };
      expect(isEmergencyReserveVulnerable(vulnerableSnapshot)).toBe(true);
    });

    it('não deve emitir alerta falso quando o snapshot do usuário for sólido e com saldo livre excedente', () => {
      const summaryWithUnderweight: PortfolioAllocationSummary = {
        ...baseSummary,
        totalPortfolioCashBRL: 0,
        categories: [
          {
            category: 'Ações Brasil',
            targetPercentage: 50,
            currentValueBRL: 30000,
            currentPercentage: 30,
            differenceBRL: -20000,
            allocationRatio: 0.6,
          },
        ],
      };

      const solidSnapshot = {
        totalProtectionTarget: 55000,
        protectionBuffer: 55000,
        reserveTarget: 40000,
        reserveCoverage: 40000,
        reserveShortfall: 0,
      };

      const insights = evaluatePortfolioInsights({
        summary: summaryWithUnderweight,
        positions: balancedPositions,
        availableFreeBalance: 18540.65,
        sovereignSnapshot: solidSnapshot,
      });

      // Não deve ter alerta de reserva vulnerável
      const reserveAlert = insights.find((i) => i.id === 'insight-liquidity-shield-reserve');
      expect(reserveAlert).toBeUndefined();

      // Deve sugerir aporte usando o saldo livre real apurado
      const freeBalanceInsight = insights.find((i) => i.id === 'insight-free-balance-available');
      expect(freeBalanceInsight).toBeDefined();
      expect(freeBalanceInsight?.message).toContain('18.540,65');
    });
  });
});

