import { describe, it, expect } from 'vitest';
import {
  validateMovementInput,
  validateSellFeasibility,
  validateTargetSum,
  validateAssetRegistration,
} from '../portfolioValidators';

describe('portfolioValidators - Validadores de Dados e Integridade', () => {
  describe('1. Validação de Lançamentos de Movimentação', () => {
    it('deve aprovar movimentação válida em BRL com dinheiro novo', () => {
      const res = validateMovementInput({
        assetId: 'asset-1',
        type: 'BUY',
        date: '2026-06-15',
        quantity: 100,
        unitPrice: 25.5,
        fees: 2.0,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fundingSource: 'EXTERNAL_NEW_MONEY',
      });

      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('deve rejeitar compra paga com PORTFOLIO_CASH sem cashAssetId', () => {
      const res = validateMovementInput({
        assetId: 'asset-1',
        type: 'BUY',
        date: '2026-06-15',
        quantity: 100,
        unitPrice: 25.5,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fundingSource: 'PORTFOLIO_CASH',
        // cashAssetId ausente
      });

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('cashAssetId'))).toBe(true);
    });

    it('deve aprovar compra paga com PORTFOLIO_CASH quando cashAssetId estiver preenchido', () => {
      const res = validateMovementInput({
        assetId: 'asset-1',
        type: 'BUY',
        date: '2026-06-15',
        quantity: 100,
        unitPrice: 25.5,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fundingSource: 'PORTFOLIO_CASH',
        cashAssetId: 'asset-cash-brl',
      });

      expect(res.isValid).toBe(true);
    });

    it('deve rejeitar venda sem settlementTarget', () => {
      const res = validateMovementInput({
        assetId: 'asset-1',
        type: 'SELL',
        date: '2026-06-15',
        quantity: 50,
        unitPrice: 30.0,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        // settlementTarget ausente
      });

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('settlementTarget'))).toBe(true);
    });

    it('deve rejeitar quantidades e preços negativos, NaN ou não-finitos', () => {
      const res1 = validateMovementInput({
        assetId: 'asset-1',
        type: 'BUY',
        date: '2026-06-15',
        quantity: -10,
        unitPrice: 25.5,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fundingSource: 'EXTERNAL_NEW_MONEY',
      });
      expect(res1.isValid).toBe(false);
      expect(res1.errors.some((e) => e.includes('quantidade'))).toBe(true);

      const res2 = validateMovementInput({
        assetId: 'asset-1',
        type: 'BUY',
        date: '2026-06-15',
        quantity: NaN,
        unitPrice: 25.5,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fundingSource: 'EXTERNAL_NEW_MONEY',
      });
      expect(res2.isValid).toBe(false);

      const res3 = validateMovementInput({
        assetId: 'asset-1',
        type: 'BUY',
        date: '2026-06-15',
        quantity: 10,
        unitPrice: Infinity,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fundingSource: 'EXTERNAL_NEW_MONEY',
      });
      expect(res3.isValid).toBe(false);
      expect(res3.errors.some((e) => e.includes('preço unitário'))).toBe(true);
    });

    it('deve aceitar INITIAL_POSITION com quantidade nula (quantity: null) se houver saldo financeiro válido', () => {
      const res = validateMovementInput({
        assetId: 'asset-porquinho',
        type: 'INITIAL_POSITION',
        date: '2026-01-01',
        quantity: null,
        grossAmount: 1618.67,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        hasKnownQuantity: false,
      });

      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('deve aceitar INITIAL_POSITION com quantidade nula e saldo zero (grossAmount: 0)', () => {
      const res = validateMovementInput({
        assetId: 'asset-porquinho',
        type: 'INITIAL_POSITION',
        date: '2026-01-01',
        quantity: null,
        grossAmount: 0,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        hasKnownQuantity: false,
      });

      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('deve rejeitar INITIAL_POSITION com quantidade nula se o saldo financeiro (grossAmount) for omitido', () => {
      const res = validateMovementInput({
        assetId: 'asset-porquinho',
        type: 'INITIAL_POSITION',
        date: '2026-01-01',
        quantity: null,
        // grossAmount omitido
        currency: 'BRL',
        fxRateToBRL: 1.0,
        hasKnownQuantity: false,
      });

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('saldo financeiro (grossAmount) é obrigatório'))).toBe(true);
    });

    it('deve rejeitar INITIAL_POSITION com quantidade nula quando apenas unitPrice for fornecido sem grossAmount', () => {
      const res = validateMovementInput({
        assetId: 'asset-porquinho',
        type: 'INITIAL_POSITION',
        date: '2026-01-01',
        quantity: null,
        unitPrice: 1618.67, // unitPrice não deve ser aceito como substituto de grossAmount
        currency: 'BRL',
        fxRateToBRL: 1.0,
        hasKnownQuantity: false,
      });

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('saldo financeiro (grossAmount) é obrigatório'))).toBe(true);
    });

    it('deve rejeitar INITIAL_POSITION com quantidade nula se o saldo financeiro for negativo ou inválido', () => {
      const res = validateMovementInput({
        assetId: 'asset-porquinho',
        type: 'INITIAL_POSITION',
        date: '2026-01-01',
        quantity: null,
        grossAmount: -50.0,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        hasKnownQuantity: false,
      });

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('saldo financeiro (grossAmount) é obrigatório'))).toBe(true);
    });

    it('deve rejeitar BUY com quantidade nula (quantity: null)', () => {
      const res = validateMovementInput({
        assetId: 'asset-vale3',
        type: 'BUY',
        date: '2026-06-15',
        quantity: null,
        unitPrice: 50.0,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fundingSource: 'EXTERNAL_NEW_MONEY',
      });

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('quantidade deve ser um número'))).toBe(true);
    });

    it('deve rejeitar data com formato inválido', () => {
      const res = validateMovementInput({
        assetId: 'asset-1',
        type: 'BUY',
        date: '15/06/2026', // Formato não ISO
        quantity: 10,
        unitPrice: 10,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fundingSource: 'EXTERNAL_NEW_MONEY',
      });

      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes('data'))).toBe(true);
    });

    it('deve rejeitar taxa de câmbio diferente de 1.0 para BRL e menor/igual a 0 para USD', () => {
      const resBRL = validateMovementInput({
        assetId: 'asset-1',
        type: 'BUY',
        date: '2026-06-15',
        quantity: 10,
        unitPrice: 10,
        currency: 'BRL',
        fxRateToBRL: 5.2, // Inválido para BRL
        fundingSource: 'EXTERNAL_NEW_MONEY',
      });
      expect(resBRL.isValid).toBe(false);

      const resUSD = validateMovementInput({
        assetId: 'asset-1',
        type: 'BUY',
        date: '2026-06-15',
        quantity: 10,
        unitPrice: 10,
        currency: 'USD',
        fxRateToBRL: 0, // Inválido para USD
        fundingSource: 'EXTERNAL_NEW_MONEY',
      });
      expect(resUSD.isValid).toBe(false);
    });
  });

  describe('2. Validação de Viabilidade de Venda', () => {
    it('deve permitir venda quando a quantidade solicitada for menor ou igual à disponível', () => {
      const res = validateSellFeasibility(100, 50);
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('deve permitir venda total exata considerando tolerância de ponto flutuante', () => {
      const res = validateSellFeasibility(100.00000001, 100.00000001);
      expect(res.isValid).toBe(true);
    });

    it('deve rejeitar venda quando a quantidade solicitada for maior que o saldo disponível', () => {
      const res = validateSellFeasibility(100, 100.5);
      expect(res.isValid).toBe(false);
      expect(res.errors[0]).toContain('Saldo insuficiente para venda');
    });

    it('deve rejeitar quantidade de venda zero ou negativa', () => {
      expect(validateSellFeasibility(100, 0).isValid).toBe(false);
      expect(validateSellFeasibility(100, -5).isValid).toBe(false);
    });
  });

  describe('3. Validação de Metas de Alocação', () => {
    it('deve aprovar metas cuja soma seja exatamente 100%', () => {
      const res = validateTargetSum([25, 25, 50]);
      expect(res.isValid).toBe(true);
      expect(res.sum).toBe(100.0);
      expect(res.discrepancy).toBe(0.0);
    });

    it('deve detectar discrepância de metas somando mais de 100% (ex: 100.0015% da planilha original)', () => {
      const res = validateTargetSum([12.5, 20.0005, 18.5, 49.001]);
      expect(res.isValid).toBe(false);
      expect(res.sum).toBe(100.0015);
      expect(res.discrepancy).toBe(0.0015);
    });

    it('deve detectar discrepância de metas somando menos de 100%', () => {
      const res = validateTargetSum([30, 30, 30]);
      expect(res.isValid).toBe(false);
      expect(res.sum).toBe(90.0);
      expect(res.discrepancy).toBe(-10.0);
    });
  });

  describe('4. Validação de Cadastro de Ativo', () => {
    it('deve aprovar ativo com campos válidos', () => {
      const res = validateAssetRegistration({
        ticker: 'WEGE3',
        name: 'WEG S.A.',
        category: 'Ações Brasil',
        currency: 'BRL',
        market: 'B3',
        targetPercentage: 15.0,
      });

      expect(res.isValid).toBe(true);
    });

    it('deve rejeitar ticker vazio ou com mais de 20 caracteres', () => {
      expect(validateAssetRegistration({ ticker: '', name: 'Teste', category: 'Ações' }).isValid).toBe(false);
      expect(validateAssetRegistration({ ticker: 'TICKERMUITOLONGOCOMMAISDE20CARACTERES', name: 'Teste', category: 'Ações' }).isValid).toBe(false);
    });

    it('deve rejeitar meta percentual negativa ou superior a 100', () => {
      expect(validateAssetRegistration({ ticker: 'WEGE3', name: 'WEG', category: 'Ações', targetPercentage: -1 }).isValid).toBe(false);
      expect(validateAssetRegistration({ ticker: 'WEGE3', name: 'WEG', category: 'Ações', targetPercentage: 101 }).isValid).toBe(false);
    });
  });
});
