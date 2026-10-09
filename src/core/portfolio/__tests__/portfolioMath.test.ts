import { describe, it, expect } from 'vitest';
import {
  replayAssetLedger,
  calculateExternalNetInflow,
  calculateMonthlyOrganicGrowth,
  calculateModifiedDietzReturn,
  calculateFxAndAssetReturnDecomposition,
  computePortfolioAllocation,
  computeLedgerChecksum,
  calculateLedgerCashBalance,
  reconcileCashBalance,
} from '../portfolioMath';
import type { PortfolioMovement, PortfolioCashBalance } from '../portfolioTypes';

describe('portfolioMath - Motor Financeiro Puro', () => {
  const baseAsset = {
    assetId: 'asset-vale3',
    ticker: 'VALE3',
    name: 'Vale S.A.',
    category: 'Ações Brasil',
    currency: 'BRL' as const,
    market: 'B3' as const,
    targetPercentage: 10.0,
  };

  describe('1. Posição Inicial e Preço Médio', () => {
    it('deve processar posição inicial SEM custo conhecido mantendo quantidade mas com PM e PnL nulos', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-1',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: 100,
          unitPrice: 0,
          fees: 0,
          grossAmount: 0,
          netAmount: 0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 0,
          hasKnownCost: false,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 60.0,
        currentFxRateToBRL: 1.0,
      });

      expect(result.quantity).toBe(100);
      expect(result.hasKnownCost).toBe(false);
      expect(result.avgCostOriginal).toBeNull();
      expect(result.avgCostBRL).toBeNull();
      expect(result.totalInvestedBRL).toBeNull();
      expect(result.currentValueBRL).toBe(6000.0);
      expect(result.unrealizedPnLBRL).toBeNull();
      expect(result.unrealizedPnLPercent).toBeNull();
    });

    it('deve processar posição inicial puramente baseada em saldo (quantity: null, isBalanceOnly: true) sem cotas nem PM fictícios', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-porq',
          userId: 'user-1',
          assetId: 'asset-porq',
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 0,
          fees: 0,
          grossAmount: 1618.67,
          netAmount: 1618.67,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 1618.67,
          hasKnownCost: false,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        assetId: 'asset-porq',
        ticker: 'PORQ_INTER',
        name: 'Porquinho Inter',
        category: 'Renda Fixa',
        currency: 'BRL',
        market: 'MANUAL',
        movements,
        currentPriceOriginal: 1.0,
        currentFxRateToBRL: 1.0,
      });

      expect(result.quantity).toBeNull();
      expect(result.hasKnownQuantity).toBe(false);
      expect(result.isBalanceOnly).toBe(true);
      expect(result.hasKnownCost).toBe(false);
      expect(result.avgCostOriginal).toBeNull();
      expect(result.avgCostBRL).toBeNull();
      expect(result.totalInvestedBRL).toBeNull();
      expect(result.currentValueBRL).toBe(1618.67);
      expect(result.unrealizedPnLBRL).toBeNull();
      expect(result.unrealizedPnLPercent).toBeNull();
    });

    it('deve processar posição inicial baseada em saldo com valor ZERO preservando saldo 0.00 sem acionar fallback', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-porq-zero',
          userId: 'user-1',
          assetId: 'asset-porq',
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 50.0, // unitPrice arbitrário que NÃO deve ser usado como saldo
          fees: 0,
          grossAmount: 0, // Saldo inicial zero explícito
          netAmount: 0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 0,
          hasKnownCost: false,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        assetId: 'asset-porq',
        ticker: 'PORQ_INTER',
        name: 'Porquinho Inter',
        category: 'Renda Fixa',
        currency: 'BRL',
        market: 'MANUAL',
        movements,
        currentPriceOriginal: 1.0,
        currentFxRateToBRL: 1.0,
      });

      expect(result.quantity).toBeNull();
      expect(result.isBalanceOnly).toBe(true);
      expect(result.currentValueBRL).toBe(0.0); // Preserva estritamente 0, sem cair no fallback de unitPrice: 50
    });

    it('deve processar posição inicial COM custo conhecido apurando PM e ganho não realizado', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-1',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: 100,
          unitPrice: 50.0,
          fees: 0,
          grossAmount: 5000.0,
          netAmount: 5000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 5000.0,
          hasKnownCost: true,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 65.0,
        currentFxRateToBRL: 1.0,
      });

      expect(result.quantity).toBe(100);
      expect(result.hasKnownCost).toBe(true);
      expect(result.avgCostOriginal).toBe(50.0);
      expect(result.avgCostBRL).toBe(50.0);
      expect(result.totalInvestedBRL).toBe(5000.0);
      expect(result.currentValueBRL).toBe(6500.0);
      expect(result.unrealizedPnLBRL).toBe(1500.0);
      expect(result.unrealizedPnLPercent).toBe(30.0);
    });
  });

  describe('2. Compras Ponderadas, Vendas Parciais e Zeramento de Posição', () => {
    it('deve ponderar o preço médio em compras sucessivas e incluir taxas no custo de aquisição', () => {
      const movements: PortfolioMovement[] = [
        // Compra 1: 100 cotas a R$ 10,00 + R$ 10 de taxa = R$ 1.010 (PM = 10,10)
        {
          id: 'mov-buy-1',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-02-01',
          quantity: 100,
          unitPrice: 10.0,
          fees: 10.0,
          grossAmount: 1000.0,
          netAmount: 1010.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 1010.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-02-01T10:00:00Z',
          updatedAt: '2026-02-01T10:00:00Z',
        },
        // Compra 2: 100 cotas a R$ 20,00 (sem taxa) = R$ 2.000 -> Total: 200 cotas, custo R$ 3.010 -> PM = 15,05
        {
          id: 'mov-buy-2',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-02-15',
          quantity: 100,
          unitPrice: 20.0,
          fees: 0,
          grossAmount: 2000.0,
          netAmount: 2000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 2000.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-02-15T10:00:00Z',
          updatedAt: '2026-02-15T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 25.0,
        currentFxRateToBRL: 1.0,
      });

      expect(result.quantity).toBe(200);
      expect(result.avgCostOriginal).toBe(15.05);
      expect(result.avgCostBRL).toBe(15.05);
      expect(result.totalInvestedBRL).toBe(3010.0);
      expect(result.currentValueBRL).toBe(5000.0);
      expect(result.unrealizedPnLBRL).toBe(1990.0);
    });

    it('em venda parcial, deve manter o preço médio intacto e apurar o lucro realizado', () => {
      const movements: PortfolioMovement[] = [
        // Compra: 200 cotas a R$ 15,00 = R$ 3.000 (PM = 15,00)
        {
          id: 'mov-buy-1',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-03-01',
          quantity: 200,
          unitPrice: 15.0,
          fees: 0,
          grossAmount: 3000.0,
          netAmount: 3000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 3000.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-03-01T10:00:00Z',
          updatedAt: '2026-03-01T10:00:00Z',
        },
        // Venda parcial: 50 cotas a R$ 25,00 com R$ 10 de corretagem = líquido R$ 1.240,00
        // Custo das 50 cotas: 50 * 15 = R$ 750,00 -> Lucro realizado: 1240 - 750 = R$ 490,00
        {
          id: 'mov-sell-1',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'SELL',
          date: '2026-03-10',
          quantity: 50,
          unitPrice: 25.0,
          fees: 10.0,
          grossAmount: 1250.0,
          netAmount: 1240.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 1240.0,
          settlementTarget: 'PORTFOLIO_CASH',
          status: 'ACTIVE',
          createdAt: '2026-03-10T10:00:00Z',
          updatedAt: '2026-03-10T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 30.0,
        currentFxRateToBRL: 1.0,
      });

      expect(result.quantity).toBe(150);
      expect(result.avgCostOriginal).toBe(15.0); // Preço médio inalterado
      expect(result.avgCostBRL).toBe(15.0);
      expect(result.totalInvestedBRL).toBe(2250.0); // 150 * 15
      expect(result.realizedPnLOriginal).toBe(490.0);
      expect(result.realizedPnLBRL).toBe(490.0);
      expect(result.currentValueBRL).toBe(4500.0); // 150 * 30
      expect(result.unrealizedPnLBRL).toBe(2250.0); // 4500 - 2250
    });

    it('em venda total, deve zerar a quantidade e resetar o preço médio para null', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-buy-1',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-04-01',
          quantity: 100,
          unitPrice: 20.0,
          fees: 0,
          grossAmount: 2000.0,
          netAmount: 2000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 2000.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-04-01T10:00:00Z',
          updatedAt: '2026-04-01T10:00:00Z',
        },
        {
          id: 'mov-sell-all',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'SELL',
          date: '2026-04-10',
          quantity: 100,
          unitPrice: 22.0,
          fees: 0,
          grossAmount: 2200.0,
          netAmount: 2200.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 2200.0,
          settlementTarget: 'EXTERNAL_OUTSIDE',
          status: 'ACTIVE',
          createdAt: '2026-04-10T10:00:00Z',
          updatedAt: '2026-04-10T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 22.0,
        currentFxRateToBRL: 1.0,
      });

      expect(result.quantity).toBe(0);
      expect(result.avgCostOriginal).toBeNull();
      expect(result.avgCostBRL).toBeNull();
      expect(result.totalInvestedBRL).toBe(0);
      expect(result.currentValueBRL).toBe(0);
      expect(result.realizedPnLBRL).toBe(200.0); // 2200 - 2000
      expect(result.unrealizedPnLBRL).toBeNull();
    });
  });

  describe('3. Distinção de Fluxo Externo (F_m) vs. Caixa Interno', () => {
    it('compras pagas com PORTFOLIO_CASH não devem ser contadas como novo aporte externo', () => {
      const movements: PortfolioMovement[] = [
        // Aporte externo que entrou no caixa: R$ 5.000
        {
          id: 'mov-dep-1',
          userId: 'user-1',
          assetId: 'asset-cash-brl',
          type: 'EXTERNAL_DEPOSIT',
          date: '2026-05-02',
          quantity: 5000,
          unitPrice: 1.0,
          fees: 0,
          grossAmount: 5000.0,
          netAmount: 5000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 5000.0,
          status: 'ACTIVE',
          createdAt: '2026-05-02T10:00:00Z',
          updatedAt: '2026-05-02T10:00:00Z',
        },
        // Compra de R$ 3.000 em ações paga com o caixa interno da carteira
        {
          id: 'mov-buy-internal',
          userId: 'user-1',
          assetId: 'asset-vale3',
          cashAssetId: 'asset-cash-brl',
          type: 'BUY',
          date: '2026-05-10',
          quantity: 100,
          unitPrice: 30.0,
          fees: 0,
          grossAmount: 3000.0,
          netAmount: 3000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 3000.0,
          fundingSource: 'PORTFOLIO_CASH', // << RECURSO INTERNO
          status: 'ACTIVE',
          createdAt: '2026-05-10T10:00:00Z',
          updatedAt: '2026-05-10T10:00:00Z',
        },
        // Provento de R$ 150 recebido e creditado no caixa da carteira
        {
          id: 'mov-div-1',
          userId: 'user-1',
          assetId: 'asset-vale3',
          cashAssetId: 'asset-cash-brl',
          type: 'DIVIDEND',
          date: '2026-05-20',
          quantity: 1,
          unitPrice: 150.0,
          fees: 0,
          grossAmount: 150.0,
          netAmount: 150.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 150.0,
          settlementTarget: 'PORTFOLIO_CASH',
          status: 'ACTIVE',
          createdAt: '2026-05-20T10:00:00Z',
          updatedAt: '2026-05-20T10:00:00Z',
        },
      ];

      // O fluxo líquido do mês deve ser estritamente R$ 5.000 (o aporte externo), e não R$ 8.000!
      const netInflow = calculateExternalNetInflow(movements, '2026-05');
      expect(netInflow).toBe(5000.0);
    });

    it('compras pagas com EXTERNAL_NEW_MONEY devem somar em F_m', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-buy-new',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-06-05',
          quantity: 50,
          unitPrice: 40.0,
          fees: 0,
          grossAmount: 2000.0,
          netAmount: 2000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 2000.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-06-05T10:00:00Z',
          updatedAt: '2026-06-05T10:00:00Z',
        },
      ];

      const netInflow = calculateExternalNetInflow(movements, '2026-06');
      expect(netInflow).toBe(2000.0);
    });
  });

  describe('4. Câmbio Explícito e Decomposição Ativo vs. Dólar', () => {
    it('deve converter ativos internacionais com taxa explícita e calcular retorno em moeda original e efeito FX', () => {
      const usAsset = {
        assetId: 'asset-vt',
        ticker: 'VT',
        name: 'Vanguard Total World Stock',
        category: 'Exterior',
        currency: 'USD' as const,
        market: 'US' as const,
        targetPercentage: 20.0,
      };

      const movements: PortfolioMovement[] = [
        // Compra de 10 cotas de VT a US$ 100,00 quando US$ 1 = R$ 5,00
        // Custo USD = $ 1.000,00 | Custo BRL = R$ 5.000,00 (PM BRL = 500,00)
        {
          id: 'mov-vt-1',
          userId: 'user-1',
          assetId: 'asset-vt',
          type: 'BUY',
          date: '2026-01-15',
          quantity: 10,
          unitPrice: 100.0,
          fees: 0,
          grossAmount: 1000.0,
          netAmount: 1000.0,
          currency: 'USD',
          fxRateToBRL: 5.0,
          fxSource: 'USER_EFFECTIVE_RATE',
          netAmountBRL: 5000.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-01-15T10:00:00Z',
          updatedAt: '2026-01-15T10:00:00Z',
        },
      ];

      // Hoje: Cotação subiu para US$ 110,00 (+10%) e o Dólar subiu para R$ 5,50 (+10%)
      const result = replayAssetLedger({
        ...usAsset,
        movements,
        currentPriceOriginal: 110.0,
        currentFxRateToBRL: 5.5,
      });

      expect(result.quantity).toBe(10);
      expect(result.avgCostOriginal).toBe(100.0);
      expect(result.avgCostBRL).toBe(500.0);
      expect(result.currentValueOriginal).toBe(1100.0);
      expect(result.currentValueBRL).toBe(6050.0); // 1100 * 5.50

      // Lucro não realizado em BRL: 6050 - 5000 = 1050
      expect(result.unrealizedPnLBRL).toBe(1050.0);
      expect(result.unrealizedPnLPercent).toBe(21.0); // (605 / 500 - 1) = +21%

      expect(result.assetReturnPercentOriginal).toBe(10.0); // Ativo valorizou 10% em USD
      expect(result.fxReturnPercent).toBe(10.0); // Câmbio valorizou 10%
    });

    it('deve decompor formalmente retorno do ativo e retorno cambial', () => {
      const decomp = calculateFxAndAssetReturnDecomposition(100.0, 110.0, 5.0, 5.5);
      expect(decomp.assetReturnPercent).toBe(10.0);
      expect(decomp.fxReturnPercent).toBe(10.0);
      // (1 + 0.10) * (1 + 0.10) - 1 = 1.21 - 1 = +21.0%
      expect(decomp.totalReturnPercentBRL).toBe(21.0);
    });
  });

  describe('5. Crescimento Orgânico Mensal e Modified Dietz', () => {
    it('deve descontar os aportes externos da evolução patrimonial', () => {
      // Começou o mês com R$ 100.000, aportou R$ 10.000 e terminou com R$ 115.000
      // Crescimento orgânico real: 115.000 - 100.000 - 10.000 = R$ 5.000
      const organicGrowth = calculateMonthlyOrganicGrowth(100000.0, 115000.0, 10000.0);
      expect(organicGrowth).toBe(5000.0);
    });

    it('deve calcular Modified Dietz ponderando o dia do aporte', () => {
      // Início: R$ 100.000 | Fim: R$ 115.000 | Aporte de R$ 10.000 no dia 15 de um mês de 30 dias (peso = 0.5)
      // Denominador: 100.000 + (10.000 * 0.5) = 105.000
      // Ganho: 115.000 - 100.000 - 10.000 = 5.000
      // Retorno: 5.000 / 105.000 = 4.7619% -> 4.76%
      const dietzReturn = calculateModifiedDietzReturn(
        100000.0,
        115000.0,
        [{ day: 15, amountBRL: 10000.0 }],
        30
      );
      expect(dietzReturn).toBe(4.76);
    });

    it('deve retornar null em Modified Dietz se o denominador for menor ou igual a zero', () => {
      const dietzReturn = calculateModifiedDietzReturn(0, 0, [], 30);
      expect(dietzReturn).toBeNull();
    });
  });

  describe('6. Alocação de Carteira e Denominador Explícito', () => {
    const assets = [
      {
        assetId: 'a1',
        ticker: 'VALE3',
        name: 'Vale',
        category: 'Ações',
        currency: 'BRL' as const,
        market: 'B3' as const,
        targetPercentage: 50.0,
        quantity: 100,
        hasKnownQuantity: true,
        isBalanceOnly: false,
        hasKnownCost: true,
        avgCostOriginal: 50,
        avgCostBRL: 50,
        totalInvestedBRL: 5000,
        realizedPnLOriginal: 0,
        realizedPnLBRL: 0,
        totalDividendsOriginal: 0,
        totalDividendsBRL: 0,
        currentPriceOriginal: 60,
        currentFxRateToBRL: 1.0,
        currentPriceBRL: 60,
        currentValueOriginal: 6000,
        currentValueBRL: 6000,
        unrealizedPnLBRL: 1000,
        unrealizedPnLPercent: 20,
        assetReturnPercentOriginal: 20,
        fxReturnPercent: null,
        movementCount: 1,
        ledgerChecksum: '1234',
        lastMovementDate: '2026-01-01',
      },
      {
        assetId: 'a2',
        ticker: 'HGLG11',
        name: 'CSHG Logística',
        category: 'FIIs',
        currency: 'BRL' as const,
        market: 'B3' as const,
        targetPercentage: 50.0,
        quantity: 20,
        hasKnownQuantity: true,
        isBalanceOnly: false,
        hasKnownCost: true,
        avgCostOriginal: 150,
        avgCostBRL: 150,
        totalInvestedBRL: 3000,
        realizedPnLOriginal: 0,
        realizedPnLBRL: 0,
        totalDividendsOriginal: 0,
        totalDividendsBRL: 0,
        currentPriceOriginal: 200,
        currentFxRateToBRL: 1.0,
        currentPriceBRL: 200,
        currentValueOriginal: 4000,
        currentValueBRL: 4000,
        unrealizedPnLBRL: 1000,
        unrealizedPnLPercent: 33.33,
        assetReturnPercentOriginal: 33.33,
        fxReturnPercent: null,
        movementCount: 1,
        ledgerChecksum: '5678',
        lastMovementDate: '2026-01-01',
      },
    ];

    const cashAssets = [
      {
        assetId: 'cash-1',
        ticker: 'CAIXA_BRL',
        name: 'Conta Corrente / Caixa',
        category: 'Caixa',
        currency: 'BRL' as const,
        market: 'MANUAL' as const,
        targetPercentage: 0,
        quantity: 2000,
        hasKnownQuantity: true,
        isBalanceOnly: false,
        hasKnownCost: true,
        avgCostOriginal: 1,
        avgCostBRL: 1,
        totalInvestedBRL: 2000,
        realizedPnLOriginal: 0,
        realizedPnLBRL: 0,
        totalDividendsOriginal: 0,
        totalDividendsBRL: 0,
        currentPriceOriginal: 1,
        currentFxRateToBRL: 1.0,
        currentPriceBRL: 1,
        currentValueOriginal: 2000,
        currentValueBRL: 2000,
        unrealizedPnLBRL: 0,
        unrealizedPnLPercent: 0,
        assetReturnPercentOriginal: 0,
        fxReturnPercent: null,
        movementCount: 1,
        ledgerChecksum: '9999',
        lastMovementDate: '2026-01-01',
      },
    ];

    it('com includeCashInTargets = false, deve calcular percentuais sobre o total investido (R$ 10.000)', () => {
      const summary = computePortfolioAllocation(assets, cashAssets, false);

      expect(summary.totalInvestedAssetsBRL).toBe(10000.0);
      expect(summary.totalPortfolioCashBRL).toBe(2000.0);
      expect(summary.consolidatedTotalBRL).toBe(12000.0);
      expect(summary.denominatorUsedBRL).toBe(10000.0); // Denominador = 10.000
      expect(summary.isTargetSumValid).toBe(true);

      const acoes = summary.categories.find((c) => c.category === 'Ações')!;
      expect(acoes.currentPercentage).toBe(60.0); // 6.000 / 10.000 = 60%
      expect(acoes.differenceBRL).toBe(1000.0); // 6.000 - 5.000 = +1.000 (sobra)
    });

    it('com includeCashInTargets = true, deve calcular percentuais sobre o total consolidado (R$ 12.000)', () => {
      const summary = computePortfolioAllocation(assets, cashAssets, true);

      expect(summary.denominatorUsedBRL).toBe(12000.0); // Denominador = 12.000
      const acoes = summary.categories.find((c) => c.category === 'Ações')!;
      expect(acoes.currentPercentage).toBe(50.0); // 6.000 / 12.000 = 50%
      expect(acoes.differenceBRL).toBe(0.0); // Meta 50% de 12.000 = 6.000 -> dif 0
    });
  });

  describe('7. Checksum Determinístico do Livro', () => {
    it('deve gerar o mesmo checksum para os mesmos movimentos e mudar se houver qualquer alteração', () => {
      const movA: PortfolioMovement = {
        id: 'mov-1',
        userId: 'u1',
        assetId: 'a1',
        type: 'BUY',
        date: '2026-01-01',
        quantity: 10,
        unitPrice: 100,
        fees: 0,
        grossAmount: 1000,
        netAmount: 1000,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fxSource: 'FIXED_ONE',
        netAmountBRL: 1000,
        status: 'ACTIVE',
        createdAt: '2026-01-01T10:00:00Z',
        updatedAt: '2026-01-01T10:00:00Z',
      };

      const checksum1 = computeLedgerChecksum([movA]);
      const checksum2 = computeLedgerChecksum([movA]);
      expect(checksum1).toBe(checksum2);

      const movB = { ...movA, quantity: 15, netAmountBRL: 1500, updatedAt: '2026-01-01T11:00:00Z' };
      const checksum3 = computeLedgerChecksum([movB]);
      expect(checksum3).not.toBe(checksum1);
    });
  });

  describe('8. Reconciliação e Controle de Saldo de Caixa', () => {
    const cashId = 'asset-caixa-oportunidade';

    it('deve calcular o saldo de caixa do ledger com entradas, débitos e desconsiderar movimentos estornados', () => {
      const movements: PortfolioMovement[] = [
        // 1. Aporte inicial: R$ 10.000
        {
          id: 'mov-init',
          userId: 'u1',
          assetId: cashId,
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 0,
          fees: 0,
          grossAmount: 10000.0,
          netAmount: 10000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 10000.0,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
        // 2. Débito no caixa para compra de ativo (SELL no caixa): R$ 3.850
        {
          id: 'mov-debit-buy',
          userId: 'u1',
          assetId: cashId,
          type: 'SELL',
          date: '2026-01-05',
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 0,
          fees: 0,
          grossAmount: 3850.0,
          netAmount: 3850.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 3850.0,
          status: 'ACTIVE',
          createdAt: '2026-01-05T10:00:00Z',
          updatedAt: '2026-01-05T10:00:00Z',
        },
        // 3. Crédito de venda de ativo (BUY no caixa): R$ 2.000
        {
          id: 'mov-credit-sell',
          userId: 'u1',
          assetId: cashId,
          type: 'BUY',
          date: '2026-01-10',
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 0,
          fees: 0,
          grossAmount: 2000.0,
          netAmount: 2000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 2000.0,
          status: 'ACTIVE',
          createdAt: '2026-01-10T10:00:00Z',
          updatedAt: '2026-01-10T10:00:00Z',
        },
        // 4. Provento recebido (DIVIDEND no caixa): R$ 150
        {
          id: 'mov-div',
          userId: 'u1',
          assetId: cashId,
          type: 'DIVIDEND',
          date: '2026-01-15',
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 0,
          fees: 0,
          grossAmount: 150.0,
          netAmount: 150.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 150.0,
          status: 'ACTIVE',
          createdAt: '2026-01-15T10:00:00Z',
          updatedAt: '2026-01-15T10:00:00Z',
        },
        // 5. Movimento estornado (VOIDED): saída de R$ 5.000 que NÃO deve impactar
        {
          id: 'mov-voided',
          userId: 'u1',
          assetId: cashId,
          type: 'SELL',
          date: '2026-01-20',
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 0,
          fees: 0,
          grossAmount: 5000.0,
          netAmount: 5000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 5000.0,
          status: 'VOIDED',
          createdAt: '2026-01-20T10:00:00Z',
          updatedAt: '2026-01-20T10:00:00Z',
        },
      ];

      // Saldo esperado: 10.000 - 3.850 + 2.000 + 150 = 8.300
      const balance = calculateLedgerCashBalance(movements, cashId);
      expect(balance).toBe(8300.0);
    });

    it('reconciliador deve confirmar concordância quando o saldo persistido bate com o livro-razão', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-init',
          userId: 'u1',
          assetId: cashId,
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 0,
          fees: 0,
          grossAmount: 10000.0,
          netAmount: 10000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 10000.0,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
      ];

      const persisted: PortfolioCashBalance = {
        userId: 'u1',
        cashAssetId: cashId,
        availableBalanceBRL: 10000.0,
        version: 1,
        updatedAt: '2026-01-01T10:00:00Z',
      };

      const result = reconcileCashBalance(cashId, movements, persisted);
      expect(result.isDivergent).toBe(false);
      expect(result.difference).toBe(0.0);
      expect(result.ledgerBalance).toBe(10000.0);
      expect(result.persistedBalance).toBe(10000.0);
    });

    it('reconciliador deve sinalizar divergência se o saldo persistido divergir do livro-razão', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-init',
          userId: 'u1',
          assetId: cashId,
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 0,
          fees: 0,
          grossAmount: 10000.0,
          netAmount: 10000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 10000.0,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
      ];

      // Persistido diz R$ 8.000, mas ledger diz R$ 10.000 (divergência de -R$ 2.000)
      const persisted: PortfolioCashBalance = {
        userId: 'u1',
        cashAssetId: cashId,
        availableBalanceBRL: 8000.0,
        version: 3,
        updatedAt: '2026-01-01T10:00:00Z',
      };

      const result = reconcileCashBalance(cashId, movements, persisted);
      expect(result.isDivergent).toBe(true);
      expect(result.difference).toBe(-2000.0);
      expect(result.ledgerBalance).toBe(10000.0);
      expect(result.persistedBalance).toBe(8000.0);
    });

    it('reconciliador deve sinalizar documento ausente quando persistedBalance for nulo', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-init',
          userId: 'u1',
          assetId: cashId,
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 0,
          fees: 0,
          grossAmount: 5000.0,
          netAmount: 5000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 5000.0,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
      ];

      const result = reconcileCashBalance(cashId, movements, null);
      expect(result.isDivergent).toBe(true);
      expect(result.persistedBalance).toBeNull();
      expect(result.ledgerBalance).toBe(5000.0);
      expect(result.difference).toBe(5000.0);
    });
  });

  describe('9. Casos Cirúrgicos do Motor: Custo Desconhecido, Compras Posteriores, Vendas, Splits e Intraday', () => {
    it('FALHA ATUAL DO MOTOR: posição com 200 cotas de custo desconhecido seguida de compra de 10 cotas com custo conhecido DEVE manter hasKnownCost = false, PM nulo e PnL nulo', () => {
      const movements: PortfolioMovement[] = [
        // Posição inicial: 200 cotas sem custo conhecido
        {
          id: 'mov-init-unknown',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: 200,
          unitPrice: 0,
          fees: 0,
          grossAmount: 0,
          netAmount: 0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 0,
          hasKnownCost: false,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
        // Compra posterior: 10 cotas a R$ 30,00 (total R$ 300)
        {
          id: 'mov-buy-subsequent',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-02-01',
          quantity: 10,
          unitPrice: 30.0,
          fees: 0,
          grossAmount: 300.0,
          netAmount: 300.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 300.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-02-01T10:00:00Z',
          updatedAt: '2026-02-01T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 35.0,
        currentFxRateToBRL: 1.0,
      });

      // Quantidade total apurada deve ser 210
      expect(result.quantity).toBe(210);
      // Custo da posição inteira permanece DESCONHECIDO (não pode inventar PM para as 210 cotas!)
      expect(result.hasKnownCost).toBe(false);
      expect(result.avgCostOriginal).toBeNull();
      expect(result.avgCostBRL).toBeNull();
      expect(result.totalInvestedBRL).toBeNull();
      // Valor de mercado existe (210 * 35 = 7350), mas PnL não realizado DEVE ser nulo!
      expect(result.currentValueBRL).toBe(7350.0);
      expect(result.unrealizedPnLBRL).toBeNull();
      expect(result.unrealizedPnLPercent).toBeNull();
    });

    it('ao informar posteriormente o custo inicial válido, o replay deve recalcular o PM e o resultado com precisão', () => {
      // Mesmo cenário, mas com custo inicial de R$ 20,00 por cota (investido R$ 4.000)
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-init-valid-cost',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: 200,
          unitPrice: 20.0,
          fees: 0,
          grossAmount: 4000.0,
          netAmount: 4000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 4000.0,
          hasKnownCost: true,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
        {
          id: 'mov-buy-subsequent',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-02-01',
          quantity: 10,
          unitPrice: 30.0,
          fees: 0,
          grossAmount: 300.0,
          netAmount: 300.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 300.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-02-01T10:00:00Z',
          updatedAt: '2026-02-01T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 35.0,
        currentFxRateToBRL: 1.0,
      });

      // Total investido: 4000 + 300 = 4300. Quantidade: 210. PM: 4300 / 210 = 20.4762
      expect(result.quantity).toBe(210);
      expect(result.hasKnownCost).toBe(true);
      expect(result.avgCostBRL).toBe(20.4762);
      expect(result.totalInvestedBRL).toBe(4300.0);
      expect(result.currentValueBRL).toBe(7350.0);
      // Ganho não realizado: 7350 - 4300 = 3050.0
      expect(result.unrealizedPnLBRL).toBe(3050.0);
      expect(result.unrealizedPnLPercent).toBe(70.93);
    });

    it('venda parcial de posição com custo desconhecido reduz a quantidade sem fabricar lucro realizado', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-init-unknown',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: 200,
          unitPrice: 0,
          fees: 0,
          grossAmount: 0,
          netAmount: 0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 0,
          hasKnownCost: false,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
        {
          id: 'mov-sell-partial',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'SELL',
          date: '2026-02-10',
          quantity: 50,
          unitPrice: 30.0,
          fees: 0,
          grossAmount: 1500.0,
          netAmount: 1500.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 1500.0,
          settlementTarget: 'PORTFOLIO_CASH',
          status: 'ACTIVE',
          createdAt: '2026-02-10T10:00:00Z',
          updatedAt: '2026-02-10T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 30.0,
        currentFxRateToBRL: 1.0,
      });

      expect(result.quantity).toBe(150);
      expect(result.hasKnownCost).toBe(false);
      expect(result.avgCostBRL).toBeNull();
      expect(result.totalInvestedBRL).toBeNull();
      expect(result.realizedPnLBRL).toBe(0.0); // Não fabrica lucro realizado
      expect(result.unrealizedPnLBRL).toBeNull();
    });

    it('venda total de posição com custo desconhecido seguida de nova compra deve iniciar nova posição com custo conhecido', () => {
      const movements: PortfolioMovement[] = [
        // 1. Inicia com 100 cotas de custo desconhecido
        {
          id: 'mov-init-unknown',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: 100,
          unitPrice: 0,
          fees: 0,
          grossAmount: 0,
          netAmount: 0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 0,
          hasKnownCost: false,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
        // 2. Venda total das 100 cotas (zeramento)
        {
          id: 'mov-sell-all',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'SELL',
          date: '2026-01-20',
          quantity: 100,
          unitPrice: 25.0,
          fees: 0,
          grossAmount: 2500.0,
          netAmount: 2500.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 2500.0,
          settlementTarget: 'PORTFOLIO_CASH',
          status: 'ACTIVE',
          createdAt: '2026-01-20T10:00:00Z',
          updatedAt: '2026-01-20T10:00:00Z',
        },
        // 3. Nova compra: 50 cotas a R$ 20,00
        {
          id: 'mov-buy-new',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-02-15',
          quantity: 50,
          unitPrice: 20.0,
          fees: 0,
          grossAmount: 1000.0,
          netAmount: 1000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 1000.0,
          fundingSource: 'PORTFOLIO_CASH',
          status: 'ACTIVE',
          createdAt: '2026-02-15T10:00:00Z',
          updatedAt: '2026-02-15T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 25.0,
        currentFxRateToBRL: 1.0,
      });

      // A nova posição de 50 cotas deve ter custo conhecido (não contaminada pelo desconhecimento passado)
      expect(result.quantity).toBe(50);
      expect(result.hasKnownCost).toBe(true);
      expect(result.avgCostBRL).toBe(20.0);
      expect(result.totalInvestedBRL).toBe(1000.0);
      expect(result.currentValueBRL).toBe(1250.0);
      expect(result.unrealizedPnLBRL).toBe(250.0);
      expect(result.unrealizedPnLPercent).toBe(25.0);
    });

    it('desdobramento (SPLIT_OR_BONUS) em posição com custo desconhecido preserva hasKnownCost = false', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-init-unknown',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: 200,
          unitPrice: 0,
          fees: 0,
          grossAmount: 0,
          netAmount: 0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 0,
          hasKnownCost: false,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
        // Desdobramento 1:2 -> total de 400 cotas
        {
          id: 'mov-split',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'SPLIT_OR_BONUS',
          date: '2026-02-01',
          quantity: 400,
          unitPrice: 0,
          fees: 0,
          grossAmount: 0,
          netAmount: 0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 0,
          status: 'ACTIVE',
          createdAt: '2026-02-01T10:00:00Z',
          updatedAt: '2026-02-01T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 15.0,
        currentFxRateToBRL: 1.0,
      });

      expect(result.quantity).toBe(400);
      expect(result.hasKnownCost).toBe(false);
      expect(result.avgCostBRL).toBeNull();
      expect(result.totalInvestedBRL).toBeNull();
      expect(result.unrealizedPnLBRL).toBeNull();
    });

    it('desdobramento (SPLIT_OR_BONUS) em posição com custo conhecido recalcula o PM dividindo pela nova quantidade', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-buy-1',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-01-10',
          quantity: 100,
          unitPrice: 50.0,
          fees: 0,
          grossAmount: 5000.0,
          netAmount: 5000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 5000.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-01-10T10:00:00Z',
          updatedAt: '2026-01-10T10:00:00Z',
        },
        // Desdobramento 1:2 -> 200 cotas
        {
          id: 'mov-split',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'SPLIT_OR_BONUS',
          date: '2026-02-01',
          quantity: 200,
          unitPrice: 0,
          fees: 0,
          grossAmount: 0,
          netAmount: 0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 0,
          status: 'ACTIVE',
          createdAt: '2026-02-01T10:00:00Z',
          updatedAt: '2026-02-01T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 30.0,
        currentFxRateToBRL: 1.0,
      });

      expect(result.quantity).toBe(200);
      expect(result.hasKnownCost).toBe(true);
      expect(result.avgCostBRL).toBe(25.0); // 5000 / 200 = 25.0
      expect(result.totalInvestedBRL).toBe(5000.0);
      expect(result.currentValueBRL).toBe(6000.0);
      expect(result.unrealizedPnLBRL).toBe(1000.0);
    });

    it('movimentos com status = VOIDED (estornados) são rigorosamente ignorados no replay', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-buy-valid',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-01-10',
          quantity: 100,
          unitPrice: 20.0,
          fees: 0,
          grossAmount: 2000.0,
          netAmount: 2000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 2000.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-01-10T10:00:00Z',
          updatedAt: '2026-01-10T10:00:00Z',
        },
        // Movimento errôneo que foi estornado:
        {
          id: 'mov-buy-voided',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-01-15',
          quantity: 500,
          unitPrice: 80.0,
          fees: 0,
          grossAmount: 40000.0,
          netAmount: 40000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 40000.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'VOIDED',
          createdAt: '2026-01-15T10:00:00Z',
          updatedAt: '2026-01-15T12:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 22.0,
        currentFxRateToBRL: 1.0,
      });

      expect(result.quantity).toBe(100);
      expect(result.avgCostBRL).toBe(20.0);
      expect(result.totalInvestedBRL).toBe(2000.0);
      expect(result.movementCount).toBe(1); // Apenas o movimento ACTIVE é contado
    });

    it('movimentos na mesma data: INITIAL_POSITION deve ser avaliado antes de BUY intradiário, independente do createdAt', () => {
      const movements: PortfolioMovement[] = [
        // BUY criado com createdAt anterior (ex: 08:00) na mesma data
        {
          id: 'mov-buy-same-day',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-03-01',
          quantity: 10,
          unitPrice: 30.0,
          fees: 0,
          grossAmount: 300.0,
          netAmount: 300.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 300.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-03-01T08:00:00Z',
          updatedAt: '2026-03-01T08:00:00Z',
        },
        // INITIAL_POSITION cadastrado depois (ex: 15:00) mas que representa a abertura do dia
        {
          id: 'mov-init-same-day',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'INITIAL_POSITION',
          date: '2026-03-01',
          quantity: 200,
          unitPrice: 0,
          fees: 0,
          grossAmount: 0,
          netAmount: 0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 0,
          hasKnownCost: false,
          status: 'ACTIVE',
          createdAt: '2026-03-01T15:00:00Z',
          updatedAt: '2026-03-01T15:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 35.0,
        currentFxRateToBRL: 1.0,
      });

      // Como INITIAL_POSITION é abertura, ele é processado primeiro (200 cotas sem custo),
      // e o BUY é somado depois (+10 cotas), mantendo hasKnownCost = false!
      expect(result.quantity).toBe(210);
      expect(result.hasKnownCost).toBe(false);
      expect(result.avgCostBRL).toBeNull();
      expect(result.totalInvestedBRL).toBeNull();
    });

    it('ordem intradiária indeterminável entre BUY e SELL na mesma data deve sinalizar limitação em vez de fabricar precisão', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-sell-ambiguous',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'SELL',
          date: '2026-04-10',
          quantity: 50,
          unitPrice: 30.0,
          fees: 0,
          grossAmount: 1500.0,
          netAmount: 1500.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 1500.0,
          settlementTarget: 'PORTFOLIO_CASH',
          status: 'ACTIVE',
          createdAt: '2026-04-10T10:00:00Z',
          updatedAt: '2026-04-10T10:00:00Z',
        },
        {
          id: 'mov-buy-ambiguous',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-04-10',
          quantity: 50,
          unitPrice: 20.0,
          fees: 0,
          grossAmount: 1000.0,
          netAmount: 1000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 1000.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-04-10T10:00:00Z', // Timestamp idêntico!
          updatedAt: '2026-04-10T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 25.0,
        currentFxRateToBRL: 1.0,
      });

      // O motor deve sinalizar ordem indeterminada e emitir aviso de auditoria
      expect(result.hasIndeterminateIntradayOrder).toBe(true);
      expect(result.calculationWarnings?.length).toBeGreaterThan(0);
    });

    it('venda de quantidade superior à custódia disponível deve emitir aviso e não gerar cotas negativas', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-buy-1',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'BUY',
          date: '2026-05-01',
          quantity: 100,
          unitPrice: 20.0,
          fees: 0,
          grossAmount: 2000.0,
          netAmount: 2000.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 2000.0,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-05-01T10:00:00Z',
          updatedAt: '2026-05-01T10:00:00Z',
        },
        // Venda de 150 cotas quando só possui 100
        {
          id: 'mov-sell-excess',
          userId: 'user-1',
          assetId: 'asset-vale3',
          type: 'SELL',
          date: '2026-05-10',
          quantity: 150,
          unitPrice: 25.0,
          fees: 0,
          grossAmount: 3750.0,
          netAmount: 3750.0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 3750.0,
          settlementTarget: 'PORTFOLIO_CASH',
          status: 'ACTIVE',
          createdAt: '2026-05-10T10:00:00Z',
          updatedAt: '2026-05-10T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        ...baseAsset,
        movements,
        currentPriceOriginal: 25.0,
        currentFxRateToBRL: 1.0,
      });

      // Quantidade travada em zero (sem saldo fantasma negativo) e aviso emitido
      expect(result.quantity).toBe(0);
      expect(result.calculationWarnings?.some((w) => w.includes('INSUFFICIENT_POSITION_FOR_SALE'))).toBe(true);
    });
  });

  describe('11. Marcação na Curva Automática de Renda Fixa', () => {
    it('deve marcar na curva título de CDB baseado em saldo sem requerer cotação externa', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-cdb-1',
          userId: 'user-1',
          assetId: 'asset-cdb',
          type: 'INITIAL_POSITION',
          date: '2026-01-01',
          quantity: null,
          hasKnownQuantity: false,
          unitPrice: 0,
          fees: 0,
          grossAmount: 10000,
          netAmount: 10000,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 10000,
          hasKnownCost: true,
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        assetId: 'asset-cdb',
        ticker: 'CDB-INTER-110',
        name: 'CDB Inter 110% CDI',
        category: 'Renda Fixa',
        currency: 'BRL',
        market: 'RF',
        targetPercentage: 20.0,
        movements,
        currentPriceOriginal: null,
        currentFxRateToBRL: 1.0,
        fixedIncomeIndexation: 'CDI',
        fixedIncomeRatePercent: 110,
        fixedIncomeStartDate: '2026-01-01',
        todayISO: '2026-07-02',
      });

      expect(result.isBalanceOnly).toBe(true);
      expect(result.hasMarketQuote).toBe(true);
      expect(result.fixedIncomeDetails).toBeDefined();
      expect(result.fixedIncomeDetails?.calendarDaysElapsed).toBe(182);
      expect(result.fixedIncomeDetails?.grossValueBRL).toBeGreaterThan(10000);
      expect(result.currentValueBRL).toBe(result.fixedIncomeDetails?.grossValueBRL);
      expect(result.unrealizedPnLBRL).toBe(result.fixedIncomeDetails?.grossYieldBRL);
      expect(result.unrealizedPnLPercent).toBeGreaterThan(0);
    });

    it('deve marcar na curva título fracionado em cotas calculando cotação unitária dinamicamente', () => {
      const movements: PortfolioMovement[] = [
        {
          id: 'mov-tesouro-1',
          userId: 'user-1',
          assetId: 'asset-tesouro',
          type: 'BUY',
          date: '2026-01-01',
          quantity: 5,
          unitPrice: 1000,
          fees: 0,
          grossAmount: 5000,
          netAmount: 5000,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 5000,
          fundingSource: 'EXTERNAL_NEW_MONEY',
          status: 'ACTIVE',
          createdAt: '2026-01-01T10:00:00Z',
          updatedAt: '2026-01-01T10:00:00Z',
        },
      ];

      const result = replayAssetLedger({
        assetId: 'asset-tesouro',
        ticker: 'TESOURO-PRE-2029',
        name: 'Tesouro Prefixado 2029',
        category: 'Tesouro Direto',
        currency: 'BRL',
        market: 'RF',
        targetPercentage: 15.0,
        movements,
        currentPriceOriginal: null,
        currentFxRateToBRL: 1.0,
        fixedIncomeIndexation: 'PRE',
        fixedIncomeRatePercent: 12.0,
        fixedIncomeStartDate: '2026-01-01',
        todayISO: '2026-07-02',
      });

      expect(result.quantity).toBe(5);
      expect(result.hasMarketQuote).toBe(true);
      expect(result.fixedIncomeDetails).toBeDefined();
      expect(result.currentValueBRL).toBeGreaterThan(5000);
      expect(result.currentPriceBRL).toBe(Number((result.currentValueBRL! / 5).toFixed(4)));
      expect(result.unrealizedPnLBRL).toBeGreaterThan(0);
    });
  });
});

