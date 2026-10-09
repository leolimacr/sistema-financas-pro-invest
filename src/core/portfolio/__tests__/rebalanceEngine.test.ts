import { describe, it, expect } from 'vitest';
import {
  simulateRebalanceContribution,
  type RebalanceAssetInput,
} from '../rebalanceEngine';

describe('rebalanceEngine - Simulador Puro de Aportes e Rebalanceamento', () => {
  const sampleAssets: RebalanceAssetInput[] = [
    {
      assetId: 'asset-vale',
      ticker: 'VALE3',
      name: 'Vale',
      category: 'Ações Brasil',
      market: 'B3',
      currency: 'BRL',
      currentPriceBRL: 50.0,
      currentQuantity: 20,
      currentValueBRL: 1000.0,
      targetPercentage: 50.0,
      allowFractional: false,
      minLotSize: 1,
    },
    {
      assetId: 'asset-hglg',
      ticker: 'HGLG11',
      name: 'CSHG Logística',
      category: 'FIIs',
      market: 'B3',
      currency: 'BRL',
      currentPriceBRL: 150.0,
      currentQuantity: 10,
      currentValueBRL: 1500.0,
      targetPercentage: 50.0,
      allowFractional: false,
      minLotSize: 1,
    },
  ];

  describe('1. Validações Prévias e Bloqueios de Segurança', () => {
    it('deve bloquear a simulação se a soma das metas for diferente de 100%', () => {
      const invalidTargetAssets: RebalanceAssetInput[] = [
        { ...sampleAssets[0], targetPercentage: 40.0 },
        { ...sampleAssets[1], targetPercentage: 50.0 }, // Soma = 90%
      ];

      const result = simulateRebalanceContribution(invalidTargetAssets, {
        contributionAmountBRL: 1000.0,
      });

      expect(result.canRebalance).toBe(false);
      expect(result.blockReason).toContain('A soma das metas percentuais é 90%');
      expect(result.orders).toHaveLength(0);
    });

    it('deve bloquear a simulação se o valor do aporte for zero ou negativo', () => {
      const resultZero = simulateRebalanceContribution(sampleAssets, {
        contributionAmountBRL: 0,
      });
      expect(resultZero.canRebalance).toBe(false);

      const resultNeg = simulateRebalanceContribution(sampleAssets, {
        contributionAmountBRL: -500,
      });
      expect(resultNeg.canRebalance).toBe(false);
    });
  });

  describe('2. Distribuição Ponderada e Cotas Inteiras', () => {
    it('deve direcionar o aporte prioritariamente para o ativo mais para trás da meta', () => {
      // VALE3 tem R$ 1.000 (40% da carteira de R$ 2.500) | Meta: 50%
      // HGLG11 tem R$ 1.500 (60% da carteira de R$ 2.500) | Meta: 50%
      // Aporte de R$ 500. Carteira projetada = R$ 3.000. Metas: R$ 1.500 para cada.
      // VALE3 precisa de R$ 500 (exatamente 10 cotas a R$ 50,00).
      // HGLG11 já tem R$ 1.500 (na meta).
      const result = simulateRebalanceContribution(sampleAssets, {
        contributionAmountBRL: 500.0,
      });

      expect(result.canRebalance).toBe(true);
      expect(result.totalAvailableBRL).toBe(500.0);
      expect(result.totalAllocatedBRL).toBe(500.0);
      expect(result.unallocatedCashBRL).toBe(0.0);

      const orderVale = result.orders.find((o) => o.ticker === 'VALE3')!;
      expect(orderVale.status).toBe('RECOMMENDED');
      expect(orderVale.suggestedBuyQuantity).toBe(10);
      expect(orderVale.suggestedAmountBRL).toBe(500.0);
      expect(orderVale.projectedPercentage).toBe(50.0);

      const orderHglg = result.orders.find((o) => o.ticker === 'HGLG11')!;
      expect(orderHglg.status).toBe('ON_OR_ABOVE_TARGET');
      expect(orderHglg.suggestedBuyQuantity).toBe(0);
      expect(orderHglg.suggestedAmountBRL).toBe(0.0);
    });

    it('deve apurar o saldo não alocado (resíduo) quando o aporte não alcança uma cota inteira a mais', () => {
      // Aporte de R$ 480. Preço da VALE3 = R$ 50.
      // Pode comprar 9 cotas (R$ 450,00). Sobram R$ 30,00 de troco.
      const result = simulateRebalanceContribution(sampleAssets, {
        contributionAmountBRL: 480.0,
      });

      expect(result.canRebalance).toBe(true);
      expect(result.totalAllocatedBRL).toBe(450.0);
      expect(result.unallocatedCashBRL).toBe(30.0);

      const orderVale = result.orders.find((o) => o.ticker === 'VALE3')!;
      expect(orderVale.suggestedBuyQuantity).toBe(9);
    });
  });

  describe('3. Ativos Travados pelo Investidor', () => {
    it('não deve alocar recursos em ativo travado mesmo que esteja abaixo da meta', () => {
      // Trava VALE3 (que era o único que precisava de aporte)
      const result = simulateRebalanceContribution(sampleAssets, {
        contributionAmountBRL: 500.0,
        lockedAssetIds: ['asset-vale'],
      });

      expect(result.canRebalance).toBe(true);
      const orderVale = result.orders.find((o) => o.ticker === 'VALE3')!;
      expect(orderVale.status).toBe('LOCKED');
      expect(orderVale.suggestedBuyQuantity).toBe(0);
      expect(orderVale.suggestedAmountBRL).toBe(0);

      // Como o outro ativo já está na meta, o dinheiro não é forçado em compras indevidas
      expect(result.unallocatedCashBRL).toBe(500.0);
    });
  });

  describe('4. Cotações Ausentes, Zeradas ou Desatualizadas', () => {
    it('deve suspender o aporte no ativo cuja cotação for desatualizada ou nula', () => {
      const assetsWithStale: RebalanceAssetInput[] = [
        {
          ...sampleAssets[0],
          isQuoteStaleOrMissing: true, // Cotação desatualizada
        },
        sampleAssets[1],
      ];

      const result = simulateRebalanceContribution(assetsWithStale, {
        contributionAmountBRL: 500.0,
      });

      expect(result.canRebalance).toBe(true);
      const orderVale = result.orders.find((o) => o.ticker === 'VALE3')!;
      expect(orderVale.status).toBe('SKIPPED_STALE_QUOTE');
      expect(orderVale.suggestedBuyQuantity).toBe(0);
    });
  });

  describe('5. Ativos Fracionários (Criptomoedas) e Piso Mínimo', () => {
    it('deve calcular frações decimais para ativos com allowFractional = true', () => {
      const cryptoAssets: RebalanceAssetInput[] = [
        {
          assetId: 'asset-btc',
          ticker: 'BTC',
          name: 'Bitcoin',
          category: 'Cripto',
          market: 'CRYPTO',
          currency: 'BRL',
          currentPriceBRL: 300000.0,
          currentQuantity: 0.01,
          currentValueBRL: 3000.0,
          targetPercentage: 50.0,
          allowFractional: true,
        },
        {
          assetId: 'asset-cdb',
          ticker: 'CDB_POS',
          name: 'CDB DI',
          category: 'Renda Fixa',
          market: 'MANUAL',
          currency: 'BRL',
          currentPriceBRL: 1.0,
          currentQuantity: 5000,
          currentValueBRL: 5000.0,
          targetPercentage: 50.0,
          allowFractional: true,
        },
      ];

      // Total atual = R$ 8.000. Aporte de R$ 2.000. Total projetado = R$ 10.000.
      // Meta BTC (50%) = R$ 5.000. Déficit de BTC = R$ 2.000.
      // Quantidade a comprar: 2.000 / 300.000 = 0.00666667 BTC
      const result = simulateRebalanceContribution(cryptoAssets, {
        contributionAmountBRL: 2000.0,
      });

      expect(result.canRebalance).toBe(true);
      const orderBtc = result.orders.find((o) => o.ticker === 'BTC')!;
      expect(orderBtc.status).toBe('RECOMMENDED');
      expect(orderBtc.suggestedAmountBRL).toBe(2000.0);
      expect(orderBtc.suggestedBuyQuantity).toBeCloseTo(0.00666667, 6);
    });

    it('deve pular ativo se o aporte calculado for inferior ao piso mínimo configurado', () => {
      const assetsWithMin: RebalanceAssetInput[] = [
        {
          ...sampleAssets[0],
          minContributionBRL: 600.0, // Exige no mínimo R$ 600 de aporte
        },
        sampleAssets[1],
      ];

      // Aporte de apenas R$ 400 (abaixo do piso de R$ 600)
      const result = simulateRebalanceContribution(assetsWithMin, {
        contributionAmountBRL: 400.0,
      });

      const orderVale = result.orders.find((o) => o.ticker === 'VALE3')!;
      expect(orderVale.status).toBe('SKIPPED_BELOW_MINIMUM');
      expect(orderVale.suggestedBuyQuantity).toBe(0);
      expect(result.unallocatedCashBRL).toBe(400.0);
    });
  });

  describe('6. Integração com Caixa Interno da Carteira', () => {
    it('deve somar o saldo do caixa disponível ao novo aporte quando useAvailableCash = true', () => {
      // Novo aporte R$ 300 + R$ 200 de saldo existente no Caixa da Carteira = R$ 500 disponíveis
      const result = simulateRebalanceContribution(sampleAssets, {
        contributionAmountBRL: 300.0,
        availablePortfolioCashBRL: 200.0,
        useAvailableCash: true,
      });

      expect(result.totalAvailableBRL).toBe(500.0);
      expect(result.totalAllocatedBRL).toBe(500.0);
      const orderVale = result.orders.find((o) => o.ticker === 'VALE3')!;
      expect(orderVale.suggestedBuyQuantity).toBe(10); // 10 * 50 = R$ 500
    });
  });

  describe('7. Suporte a Ativos Puramente em Saldo (Sem Cotas)', () => {
    it('deve simular aporte em ativo baseado puramente em saldo financeiro sugerindo valor em R$ sem inventar cotas', () => {
      const mixedAssets: RebalanceAssetInput[] = [
        {
          assetId: 'asset-vale',
          ticker: 'VALE3',
          name: 'Vale',
          category: 'Ações Brasil',
          market: 'B3',
          currency: 'BRL',
          currentPriceBRL: 50.0,
          currentQuantity: 20,
          currentValueBRL: 1000.0,
          targetPercentage: 50.0,
        },
        {
          assetId: 'asset-porq',
          ticker: 'PORQ_INTER',
          name: 'Porquinho Inter',
          category: 'Renda Fixa',
          market: 'MANUAL',
          currency: 'BRL',
          currentPriceBRL: 1.0,
          currentQuantity: null, // Ativo puramente em saldo
          currentValueBRL: 600.0,
          targetPercentage: 50.0,
          isBalanceOnly: true,
        },
      ];

      // Aporte de R$ 400
      const result = simulateRebalanceContribution(mixedAssets, {
        contributionAmountBRL: 400.0,
      });

      expect(result.canRebalance).toBe(true);
      const porqOrder = result.orders.find((o) => o.ticker === 'PORQ_INTER')!;
      expect(porqOrder.status).toBe('RECOMMENDED');
      expect(porqOrder.suggestedBuyQuantity).toBeNull(); // Sem cotas fictícias
      expect(porqOrder.suggestedAmountBRL).toBe(400.0);
      expect(porqOrder.projectedValueBRL).toBe(1000.0);
    });
  });
});
