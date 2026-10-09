import { describe, it, expect } from 'vitest';
import {
  isFixedIncomeTaxExempt,
  calculateRegressiveTaxRate,
  calculateIofRate,
  calculateEffectiveAnnualRate,
  calculateFixedIncomeCurve,
} from '../fixedIncomeMath';

describe('fixedIncomeMath - Motor Matemático Especializado de Renda Fixa', () => {
  describe('1. Tabela Regressiva de Imposto de Renda e Isenções', () => {
    it('deve aplicar corretamente as faixas regressivas de IR', () => {
      expect(calculateRegressiveTaxRate(30)).toBe(22.5);
      expect(calculateRegressiveTaxRate(180)).toBe(22.5);
      expect(calculateRegressiveTaxRate(181)).toBe(20.0);
      expect(calculateRegressiveTaxRate(360)).toBe(20.0);
      expect(calculateRegressiveTaxRate(361)).toBe(17.5);
      expect(calculateRegressiveTaxRate(720)).toBe(17.5);
      expect(calculateRegressiveTaxRate(721)).toBe(15.0);
      expect(calculateRegressiveTaxRate(1000)).toBe(15.0);
    });

    it('deve retornar alíquota 0% para ativos isentos de IR', () => {
      expect(calculateRegressiveTaxRate(30, true)).toBe(0);
      expect(calculateRegressiveTaxRate(500, true)).toBe(0);
    });

    it('deve identificar corretamente categorias isentas de IR para PF', () => {
      expect(isFixedIncomeTaxExempt('LCI')).toBe(true);
      expect(isFixedIncomeTaxExempt('LCA')).toBe(true);
      expect(isFixedIncomeTaxExempt('CRI')).toBe(true);
      expect(isFixedIncomeTaxExempt('CRA')).toBe(true);
      expect(isFixedIncomeTaxExempt('Debênture Incentivada')).toBe(true);
      expect(isFixedIncomeTaxExempt('CDB')).toBe(false);
      expect(isFixedIncomeTaxExempt('Tesouro Selic')).toBe(false);
    });
  });

  describe('2. Alíquota de IOF para Resgates de Curto Prazo', () => {
    it('deve tributar IOF regressivo do 1º ao 29º dia e isentar a partir do 30º dia', () => {
      expect(calculateIofRate(1)).toBe(96);
      expect(calculateIofRate(15)).toBe(50);
      expect(calculateIofRate(29)).toBe(3);
      expect(calculateIofRate(30)).toBe(0);
      expect(calculateIofRate(60)).toBe(0);
    });
  });

  describe('3. Taxa Anual Efetiva (Pré, CDI e IPCA)', () => {
    it('deve calcular taxa pré-fixada diretamente', () => {
      expect(calculateEffectiveAnnualRate('PRE', 13.5)).toBe(13.5);
    });

    it('deve calcular taxa pós-fixada atrelada ao CDI', () => {
      // 120% do CDI (com CDI a 10%) = 12%
      expect(calculateEffectiveAnnualRate('CDI', 120, 10.0)).toBe(12.0);
    });

    it('deve calcular taxa híbrida IPCA+ via Equação de Fisher', () => {
      // IPCA 4% + spread 6% -> (1.04 * 1.06 - 1) = 1.1024 - 1 = 10.24%
      const rate = calculateEffectiveAnnualRate('IPCA', 6.0, 10.0, 4.0);
      expect(Number(rate.toFixed(2))).toBe(10.24);
    });
  });

  describe('4. Marcação na Curva e Retorno Líquido de CDB e LCI', () => {
    it('deve calcular valor bruto e valor líquido deduzindo IR regressivo para um CDB', () => {
      const res = calculateFixedIncomeCurve({
        principalBRL: 10000,
        startDate: '2026-01-01',
        currentDate: '2026-07-01', // ~181 dias corridos (faixa de 20%)
        indexation: 'PRE',
        ratePercent: 12.0, // 12% a.a.
        assetType: 'CDB',
      });

      expect(res.principalBRL === undefined).toBe(true);
      expect(res.calendarDaysElapsed).toBe(181);
      expect(res.grossValueBRL).toBeGreaterThan(10000);
      expect(res.grossYieldBRL).toBeGreaterThan(0);
      expect(res.taxRatePercent).toBe(20.0);
      expect(res.taxAmountBRL).toBeGreaterThan(0);
      expect(res.netValueBRL).toBeLessThan(res.grossValueBRL);
      expect(res.netValueBRL).toBeGreaterThan(10000);
      expect(res.isTaxExempt).toBe(false);
    });

    it('deve calcular rendimento líquido sem desconto de IR para uma LCI isenta', () => {
      const res = calculateFixedIncomeCurve({
        principalBRL: 5000,
        startDate: '2026-01-01',
        currentDate: '2026-04-01', // 90 dias
        indexation: 'CDI',
        ratePercent: 95.0, // 95% CDI
        assetType: 'LCI',
        benchmarkCdiAnnual: 10.0,
      });

      expect(res.isTaxExempt).toBe(true);
      expect(res.taxRatePercent).toBe(0);
      expect(res.taxAmountBRL).toBe(0);
      expect(res.netYieldBRL).toBe(res.grossYieldBRL);
      expect(res.netValueBRL).toBe(res.grossValueBRL);
    });

    it('deve aplicar IOF em resgate com menos de 30 dias', () => {
      const res = calculateFixedIncomeCurve({
        principalBRL: 10000,
        startDate: '2026-06-01',
        currentDate: '2026-06-11', // 10 dias decorridos (66% IOF)
        indexation: 'PRE',
        ratePercent: 12.0,
        assetType: 'CDB',
      });

      expect(res.calendarDaysElapsed).toBe(10);
      expect(res.iofRatePercent).toBe(66);
      expect(res.iofAmountBRL).toBeGreaterThan(0);
      expect(res.netYieldBRL).toBeLessThan(res.grossYieldBRL);
    });
  });
});
