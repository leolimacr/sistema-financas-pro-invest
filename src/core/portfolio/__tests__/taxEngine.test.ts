import { describe, it, expect } from 'vitest';
import { computePortfolioTaxes, calculateDarfDueDate } from '../taxEngine';
import type { PortfolioAsset, PortfolioMovement } from '../portfolioTypes';

describe('taxEngine - Motor Fiscal e Apuração de IRPF', () => {
  const mockAssets: PortfolioAsset[] = [
    {
      id: 'ast-vale3',
      userId: 'user-1',
      ticker: 'VALE3',
      name: 'Vale S.A.',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'ast-hglg11',
      userId: 'user-1',
      ticker: 'HGLG11',
      name: 'CSHG Logística',
      category: 'Fundos Imobiliários',
      currency: 'BRL',
      market: 'B3',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  describe('1. Data de Vencimento da DARF', () => {
    it('deve calcular o último dia do mês subsequente', () => {
      expect(calculateDarfDueDate('2026-01')).toBe('2026-02-28');
      expect(calculateDarfDueDate('2026-02')).toBe('2026-03-31');
      expect(calculateDarfDueDate('2026-03')).toBe('2026-04-30');
      expect(calculateDarfDueDate('2026-04')).toBe('2026-05-31');
    });
  });

  describe('2. Isenção dos R$ 20.000 em Ações Comuns (Swing Trade)', () => {
    it('deve isentar lucro em ações quando a soma das vendas no mês for menor ou igual a R$ 20.000', () => {
      const movements: PortfolioMovement[] = [
        // Compra 100 VALE3 a R$ 60 = R$ 6.000
        {
          id: 'mov-buy-vale',
          userId: 'user-1',
          assetId: 'ast-vale3',
          type: 'BUY',
          date: '2026-02-01',
          quantity: 100,
          unitPrice: 60,
          fees: 0,
          grossAmount: 6000,
          netAmount: 6000,
          currency: 'BRL',
          fxRateToBRL: 1,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 6000,
          status: 'ACTIVE',
          createdAt: '2026-02-01',
          updatedAt: '2026-02-01',
        },
        // Vende 100 VALE3 a R$ 80 = R$ 8.000 (Lucro R$ 2.000, Venda <= R$ 20.000)
        {
          id: 'mov-sell-vale',
          userId: 'user-1',
          assetId: 'ast-vale3',
          type: 'SELL',
          date: '2026-02-15',
          quantity: 100,
          unitPrice: 80,
          fees: 0,
          grossAmount: 8000,
          netAmount: 8000,
          currency: 'BRL',
          fxRateToBRL: 1,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 8000,
          status: 'ACTIVE',
          createdAt: '2026-02-15',
          updatedAt: '2026-02-15',
        },
      ];

      const summary = computePortfolioTaxes(mockAssets, movements);
      expect(summary.reports).toHaveLength(1);
      const febReport = summary.reports[0];

      expect(febReport.stocksSalesTotalBRL).toBe(8000);
      expect(febReport.isStocksExempt).toBe(true);
      expect(febReport.stocksExemptProfitBRL).toBe(2000);
      expect(febReport.stocksTaxDueBRL).toBe(0);
      expect(febReport.totalTaxDueBRL).toBe(0);
    });

    it('deve tributar 15% quando o valor total de vendas de ações no mês ultrapassar R$ 20.000', () => {
      const movements: PortfolioMovement[] = [
        // Compra 400 VALE3 a R$ 50 = R$ 20.000
        {
          id: 'mov-buy-400',
          userId: 'user-1',
          assetId: 'ast-vale3',
          type: 'BUY',
          date: '2026-03-01',
          quantity: 400,
          unitPrice: 50,
          fees: 0,
          grossAmount: 20000,
          netAmount: 20000,
          currency: 'BRL',
          fxRateToBRL: 1,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 20000,
          status: 'ACTIVE',
          createdAt: '2026-03-01',
          updatedAt: '2026-03-01',
        },
        // Vende 400 VALE3 a R$ 60 = R$ 24.000 (> R$ 20.000). Lucro = R$ 4.000
        {
          id: 'mov-sell-400',
          userId: 'user-1',
          assetId: 'ast-vale3',
          type: 'SELL',
          date: '2026-03-20',
          quantity: 400,
          unitPrice: 60,
          fees: 0,
          grossAmount: 24000,
          netAmount: 24000,
          currency: 'BRL',
          fxRateToBRL: 1,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 24000,
          status: 'ACTIVE',
          createdAt: '2026-03-20',
          updatedAt: '2026-03-20',
        },
      ];

      const summary = computePortfolioTaxes(mockAssets, movements);
      const marReport = summary.reports[0];

      expect(marReport.stocksSalesTotalBRL).toBe(24000);
      expect(marReport.isStocksExempt).toBe(false);
      expect(marReport.stocksTaxableProfitBRL).toBe(4000);
      // 15% de 4.000 = 600
      expect(marReport.stocksTaxDueBRL).toBe(600);
      expect(marReport.totalTaxDueBRL).toBe(600);
      expect(marReport.darfCode).toBe('6015');
      expect(marReport.isDarfPayable).toBe(true);
    });
  });

  describe('3. Tributação de Fundos Imobiliários (FIIs)', () => {
    it('deve tributar FIIs a 20% mesmo com vendas totais abaixo de R$ 20.000', () => {
      const movements: PortfolioMovement[] = [
        // Compra 10 HGLG11 a R$ 150 = R$ 1.500
        {
          id: 'mov-buy-fii',
          userId: 'user-1',
          assetId: 'ast-hglg11',
          type: 'BUY',
          date: '2026-04-05',
          quantity: 10,
          unitPrice: 150,
          fees: 0,
          grossAmount: 1500,
          netAmount: 1500,
          currency: 'BRL',
          fxRateToBRL: 1,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 1500,
          status: 'ACTIVE',
          createdAt: '2026-04-05',
          updatedAt: '2026-04-05',
        },
        // Vende 10 HGLG11 a R$ 170 = R$ 1.700. Lucro = R$ 200
        {
          id: 'mov-sell-fii',
          userId: 'user-1',
          assetId: 'ast-hglg11',
          type: 'SELL',
          date: '2026-04-20',
          quantity: 10,
          unitPrice: 170,
          fees: 0,
          grossAmount: 1700,
          netAmount: 1700,
          currency: 'BRL',
          fxRateToBRL: 1,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 1700,
          status: 'ACTIVE',
          createdAt: '2026-04-20',
          updatedAt: '2026-04-20',
        },
      ];

      const summary = computePortfolioTaxes(mockAssets, movements);
      const aprReport = summary.reports[0];

      expect(aprReport.fiisSalesTotalBRL).toBe(1700);
      expect(aprReport.fiisTaxableProfitBRL).toBe(200);
      // 20% de 200 = R$ 40
      expect(aprReport.fiisTaxDueBRL).toBe(40);
      expect(aprReport.totalTaxDueBRL).toBe(40);
      expect(aprReport.isDarfPayable).toBe(true);
    });
  });

  describe('4. Compensação de Prejuízos Fiscais Passados', () => {
    it('deve compensar prejuízo anterior de ações reduzindo o imposto em mês com vendas tributáveis', () => {
      const movements: PortfolioMovement[] = [
        // Compra e venda com prejuízo de R$ 1.000 em Janeiro
        {
          id: 'mov-b1',
          userId: 'user-1',
          assetId: 'ast-vale3',
          type: 'BUY',
          date: '2026-01-05',
          quantity: 100,
          unitPrice: 60,
          fees: 0,
          grossAmount: 6000,
          netAmount: 6000,
          currency: 'BRL',
          fxRateToBRL: 1,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 6000,
          status: 'ACTIVE',
          createdAt: '2026-01-05',
          updatedAt: '2026-01-05',
        },
        {
          id: 'mov-s1-loss',
          userId: 'user-1',
          assetId: 'ast-vale3',
          type: 'SELL',
          date: '2026-01-20',
          quantity: 100,
          unitPrice: 50, // Venda a 50 -> Prejuízo de R$ 1.000
          fees: 0,
          grossAmount: 5000,
          netAmount: 5000,
          currency: 'BRL',
          fxRateToBRL: 1,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 5000,
          status: 'ACTIVE',
          createdAt: '2026-01-20',
          updatedAt: '2026-01-20',
        },
        // Em Fevereiro: Compra e venda tributável (> R$ 20k) com lucro bruto de R$ 3.000
        {
          id: 'mov-b2',
          userId: 'user-1',
          assetId: 'ast-vale3',
          type: 'BUY',
          date: '2026-02-05',
          quantity: 500,
          unitPrice: 40,
          fees: 0,
          grossAmount: 20000,
          netAmount: 20000,
          currency: 'BRL',
          fxRateToBRL: 1,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 20000,
          status: 'ACTIVE',
          createdAt: '2026-02-05',
          updatedAt: '2026-02-05',
        },
        {
          id: 'mov-s2-profit',
          userId: 'user-1',
          assetId: 'ast-vale3',
          type: 'SELL',
          date: '2026-02-25',
          quantity: 500,
          unitPrice: 46, // Venda a 46 -> Total R$ 23.000 (> 20k). Lucro R$ 3.000
          fees: 0,
          grossAmount: 23000,
          netAmount: 23000,
          currency: 'BRL',
          fxRateToBRL: 1,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 23000,
          status: 'ACTIVE',
          createdAt: '2026-02-25',
          updatedAt: '2026-02-25',
        },
      ];

      const summary = computePortfolioTaxes(mockAssets, movements);
      // Ordenado do mais recente para o mais antigo: [Fev, Jan]
      const [febReport, janReport] = summary.reports;

      expect(janReport.stocksRawProfitLossBRL).toBe(-1000);
      expect(janReport.stocksRemainingLossBRL).toBe(1000);

      expect(febReport.stocksRawProfitLossBRL).toBe(3000);
      expect(febReport.stocksLossCarriedForwardBRL).toBe(1000); // 1.000 compensados
      expect(febReport.stocksTaxableProfitBRL).toBe(2000);     // 3.000 - 1.000 = 2.000 tributáveis
      // 15% de 2.000 = R$ 300
      expect(febReport.stocksTaxDueBRL).toBe(300);
      expect(febReport.stocksRemainingLossBRL).toBe(0);
    });
  });
});
