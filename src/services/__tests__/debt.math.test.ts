import { describe, it, expect } from 'vitest';
import { 
  buildInstallmentSchedule, 
  computeCurrentInstallment, 
  computeRemainingInstallments,
  getCurrentSeriesInfo,
  convertAnnualToMonthlyRate,
  convertMonthlyToAnnualRate,
  InterestRatePeriod
} from '../debt/debt.math';
import type { DebtItem, DebtAdjustmentConfig, DebtSeries } from '../debt/debt.types';

const createTestDebt = (overrides: Partial<DebtItem> = {}): DebtItem => ({
  id: 'test-debt-1',
  nome: 'Financiamento Terreno',
  tipo: 'Financiamento',
  saldoDevedor: 100000,
  taxaMensal: 1.0,
  parcelasRestantes: 24,
  valorParcela: 346.53,
  dataVencimento: '2026-01-15',
  createdAt: new Date(),
  updatedAt: new Date(),
  proposito: '',
  totalParcelas: 24,
  parcelasPagas: 0,
  historicoPagamentos: [],
  ...overrides,
});

const createAnnualPercentConfig = (series: DebtSeries[]): DebtAdjustmentConfig => ({
  type: 'annual_percent',
  annualPercentRate: 8.5,
  series,
  frequency: 'monthly',
});

const createManualSeriesConfig = (series: DebtSeries[]): DebtAdjustmentConfig => ({
  type: 'manual_series',
  series,
  frequency: 'monthly',
});

describe('debt.math – buildInstallmentSchedule', () => {
  describe('annual_percent reajuste', () => {
    it('gera cronograma com reajuste de 8.5% a.a. para 2 anos (24 parcelas)', () => {
      const series: DebtSeries[] = [
        {
          id: 'series-1',
          year: 2026,
          startMonth: 1,
          installmentsCount: 12,
          installmentValue: 4700, // Valor calibrado para ~24 meses
          adjustmentRate: 8.5,
        },
        {
          id: 'series-2',
          year: 2027,
          startMonth: 1,
          installmentsCount: 12,
          installmentValue: 5099.5, // 4700 * 1.085
          adjustmentRate: 8.5,
        },
      ];

      const config = createAnnualPercentConfig(series);
      const result = buildInstallmentSchedule(100000, 1.0, config, 0);

      expect(result.valid).toBe(true);
      expect(result.rows.length).toBe(24);
      
      // Primeira parcela: payment = installmentValue (4700) = amortization + interest
      // interest = 100000 * 0.01 = 1000, amortization = 3700
      expect(result.rows[0].payment).toBeCloseTo(4700, 1);
      expect(result.rows[0].interest).toBeCloseTo(1000, 1);
      expect(result.rows[0].amortization).toBeCloseTo(3700, 1);
      expect(result.rows[0].seriesIndex).toBe(0);
      expect(result.rows[0].installmentInSeries).toBe(1);
      expect(result.rows[0].year).toBe(2026);
      expect(result.rows[0].monthInYear).toBe(1);
      
      // Última parcela do ano 1
      expect(result.rows[11].seriesIndex).toBe(0);
      expect(result.rows[11].installmentInSeries).toBe(12);
      
      // Primeira parcela do ano 2 - deve ter valor reajustado
      expect(result.rows[12].seriesIndex).toBe(1);
      expect(result.rows[12].installmentInSeries).toBe(1);
      expect(result.rows[12].payment).toBeGreaterThan(result.rows[11].payment);
      expect(result.rows[12].year).toBe(2027);
      expect(result.rows[12].monthInYear).toBe(1);
      
      // Última parcela
      expect(result.rows[23].seriesIndex).toBe(1);
      expect(result.rows[23].installmentInSeries).toBe(12);
      
      // Total pago deve ser maior que o principal
      expect(result.totalPaid).toBeGreaterThan(100000);
      expect(result.totalInterest).toBeGreaterThan(0);
    });

it('aplica extraPayment corretamente reduzindo saldo mais rápido', () => {
      const series: DebtSeries[] = [
        {
          id: 'series-1',
          year: 2026,
          startMonth: 1,
          installmentsCount: 12,
          installmentValue: 2000, // Valor que leva > 12 meses sem extra
          adjustmentRate: 8.5,
        },
      ];

      const config = createAnnualPercentConfig(series);
      // Sem extra: payment = 2000, juros = 1000, amortização = 1000 -> 100 meses
      // Com extra 8000: payment = 10000, juros = 1000, amortização = 9000 -> ~11 meses
      const result = buildInstallmentSchedule(100000, 1.0, config, 8000); // R$ 8000 extra por mês
      
      // Com extra payment alto, deve quitar antes das 12 parcelas
      expect(result.rows.length).toBeLessThan(12);
      expect(result.rows[result.rows.length - 1].balance).toBe(0);
    });

    it('calcula juros e amortização corretamente para cada parcela', () => {
      const series: DebtSeries[] = [
        {
          id: 'series-1',
          year: 2026,
          startMonth: 1,
          installmentsCount: 3,
          installmentValue: 1000,
          adjustmentRate: 8.5,
        },
      ];

      const config = createAnnualPercentConfig(series);
      const result = buildInstallmentSchedule(5000, 2.0, config, 0); // 2% a.m.

      expect(result.rows.length).toBe(3);
      
      // Parcela 1: juros = 5000 * 0.02 = 100, amortização = 1000 - 100 = 900
      expect(result.rows[0].interest).toBeCloseTo(100, 1);
      expect(result.rows[0].amortization).toBeCloseTo(900, 1);
      expect(result.rows[0].balance).toBeCloseTo(4100, 1);
      
      // Parcela 2: juros = 4100 * 0.02 = 82, amortização = 1000 - 82 = 918
      expect(result.rows[1].interest).toBeCloseTo(82, 1);
      expect(result.rows[1].amortization).toBeCloseTo(918, 1);
      expect(result.rows[1].balance).toBeCloseTo(3182, 1);
    });
  });

  describe('manual_series (tabela manual)', () => {
    it('usa valores exatos informados nas séries', () => {
      const series: DebtSeries[] = [
        {
          id: 'series-1',
          year: 2026,
          startMonth: 1,
          installmentsCount: 6,
          installmentValue: 375, // Cobre juros (75) + amortização (300)
          effectiveRate: 1.2,
        },
        {
          id: 'series-2',
          year: 2027,
          startMonth: 1,
          installmentsCount: 6,
          installmentValue: 475, // Cobre juros + amortização
          effectiveRate: 1.5,
        },
      ];

      const config = createManualSeriesConfig(series);
      const result = buildInstallmentSchedule(5000, 1.5, config, 0);

      expect(result.valid).toBe(true);
      expect(result.rows.length).toBe(12);
      
      // Primeira parcela: payment = 375 = amortization + interest
      // interest = 5000 * 0.015 = 75, amortization = 300
      expect(result.rows[0].payment).toBeCloseTo(375, 1);
      expect(result.rows[0].interest).toBeCloseTo(75, 1);
      expect(result.rows[0].amortization).toBeCloseTo(300, 1);
      expect(result.rows[5].seriesIndex).toBe(0);
      
      // Próximas 6 parcelas = 475
      expect(result.rows[6].payment).toBeCloseTo(475, 1);
      expect(result.rows[6].seriesIndex).toBe(1);
    });
  });

  describe('casos de borda', () => {
    it('retorna inválido para principal <= 0', () => {
      const series: DebtSeries[] = [
        { id: 's1', year: 2026, startMonth: 1, installmentsCount: 12, installmentValue: 100 },
      ];
      const config = createAnnualPercentConfig(series);
      const result = buildInstallmentSchedule(0, 1.0, config, 0);
      expect(result.valid).toBe(false);
    });

    it('retorna inválido para taxa < 0', () => {
      const series: DebtSeries[] = [
        { id: 's1', year: 2026, startMonth: 1, installmentsCount: 12, installmentValue: 100 },
      ];
      const config = createAnnualPercentConfig(series);
      const result = buildInstallmentSchedule(10000, -1, config, 0);
      expect(result.valid).toBe(false);
    });

    it('frequência trimestral gera 4 parcelas por ano', () => {
      const series: DebtSeries[] = [
        {
          id: 'series-1',
          year: 2026,
          startMonth: 1,
          installmentsCount: 4,
          installmentValue: 1000,
          adjustmentRate: 8.5,
        },
      ];

      const config: DebtAdjustmentConfig = {
        type: 'annual_percent',
        annualPercentRate: 8.5,
        series,
        frequency: 'quarterly',
      };

      const result = buildInstallmentSchedule(5000, 1.0, config, 0);
      
      expect(result.rows.length).toBe(4);
      // Meses: 1, 4, 7, 10
      expect(result.rows[0].monthInYear).toBe(1);
      expect(result.rows[1].monthInYear).toBe(4);
      expect(result.rows[2].monthInYear).toBe(7);
      expect(result.rows[3].monthInYear).toBe(10);
    });

    it('frequência semestral gera 2 parcelas por ano', () => {
      const series: DebtSeries[] = [
        {
          id: 'series-1',
          year: 2026,
          startMonth: 1,
          installmentsCount: 2,
          installmentValue: 2000,
          adjustmentRate: 8.5,
        },
      ];

      const config: DebtAdjustmentConfig = {
        type: 'annual_percent',
        annualPercentRate: 8.5,
        series,
        frequency: 'semi_annual',
      };

      const result = buildInstallmentSchedule(10000, 1.0, config, 0);
      
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].monthInYear).toBe(1);
      expect(result.rows[1].monthInYear).toBe(7);
    });
  });
});

describe('debt.math – computeCurrentInstallment', () => {
  it('retorna valorParcela para dívida fixed', () => {
    const debt = createTestDebt({ 
      valorParcela: 500,
      adjustmentConfig: { type: 'fixed', series: [], frequency: 'monthly' },
    });
    expect(computeCurrentInstallment(debt)).toBe(500);
  });

  it('retorna valor da série atual para annual_percent', () => {
    const series: DebtSeries[] = [
      { id: 's1', year: 2026, startMonth: 1, installmentsCount: 12, installmentValue: 346.53, adjustmentRate: 8.5 },
      { id: 's2', year: 2027, startMonth: 1, installmentsCount: 12, installmentValue: 375.98, adjustmentRate: 8.5 },
    ];
    
    const debt = createTestDebt({
      adjustmentConfig: { type: 'annual_percent', annualPercentRate: 8.5, series, frequency: 'monthly' },
      currentSeriesIndex: 0,
      parcelasPagas: 0,
    });
    expect(computeCurrentInstallment(debt)).toBe(346.53);

    // Após pagar 12 parcelas, deve estar na série 2
    const debtInSeries2 = createTestDebt({
      adjustmentConfig: { type: 'annual_percent', annualPercentRate: 8.5, series, frequency: 'monthly' },
      currentSeriesIndex: 1,
      parcelasPagas: 12,
    });
    expect(computeCurrentInstallment(debtInSeries2)).toBe(375.98);
  });

  it('retorna primeira série se currentSeriesIndex inválido', () => {
    const series: DebtSeries[] = [
      { id: 's1', year: 2026, startMonth: 1, installmentsCount: 12, installmentValue: 346.53 },
      { id: 's2', year: 2027, startMonth: 1, installmentsCount: 12, installmentValue: 375.98 },
    ];
    
    const debt = createTestDebt({
      adjustmentConfig: { type: 'annual_percent', annualPercentRate: 8.5, series, frequency: 'monthly' },
      currentSeriesIndex: 99,
      parcelasPagas: 0,
    });
    expect(computeCurrentInstallment(debt)).toBe(346.53);
  });
});

describe('debt.math – computeRemainingInstallments', () => {
  it('retorna parcelasRestantes para dívida fixed', () => {
    const debt = createTestDebt({ 
      parcelasRestantes: 10,
      adjustmentConfig: { type: 'fixed', series: [], frequency: 'monthly' },
    });
    expect(computeRemainingInstallments(debt)).toBe(10);
  });

  it('calcula parcelas restantes corretamente para annual_percent', () => {
    const series: DebtSeries[] = [
      { id: 's1', year: 2026, startMonth: 1, installmentsCount: 12, installmentValue: 346.53 },
      { id: 's2', year: 2027, startMonth: 1, installmentsCount: 12, installmentValue: 375.98 },
      { id: 's3', year: 2028, startMonth: 1, installmentsCount: 12, installmentValue: 407.94 },
    ];
    
    // No início: 36 parcelas restantes
    const debt0 = createTestDebt({
      adjustmentConfig: { type: 'annual_percent', annualPercentRate: 8.5, series, frequency: 'monthly' },
      parcelasPagas: 0,
    });
    expect(computeRemainingInstallments(debt0)).toBe(36);

    // Após 5 parcelas: 31 restantes
    const debt5 = createTestDebt({
      adjustmentConfig: { type: 'annual_percent', annualPercentRate: 8.5, series, frequency: 'monthly' },
      parcelasPagas: 5,
    });
    expect(computeRemainingInstallments(debt5)).toBe(31);

    // Após 12 parcelas (fim série 1): 24 restantes
    const debt12 = createTestDebt({
      adjustmentConfig: { type: 'annual_percent', annualPercentRate: 8.5, series, frequency: 'monthly' },
      parcelasPagas: 12,
    });
    expect(computeRemainingInstallments(debt12)).toBe(24);

    // Após 24 parcelas (fim série 2): 12 restantes
    const debt24 = createTestDebt({
      adjustmentConfig: { type: 'annual_percent', annualPercentRate: 8.5, series, frequency: 'monthly' },
      parcelasPagas: 24,
    });
    expect(computeRemainingInstallments(debt24)).toBe(12);

    // Após 36 parcelas (fim): 0 restantes
    const debt36 = createTestDebt({
      adjustmentConfig: { type: 'annual_percent', annualPercentRate: 8.5, series, frequency: 'monthly' },
      parcelasPagas: 36,
    });
    expect(computeRemainingInstallments(debt36)).toBe(0);
  });
});

describe('debt.math – getCurrentSeriesInfo', () => {
  it('retorna série 0 para dívida no início', () => {
    const series: DebtSeries[] = [
      { id: 's1', year: 2026, startMonth: 1, installmentsCount: 12, installmentValue: 346.53 },
      { id: 's2', year: 2027, startMonth: 1, installmentsCount: 12, installmentValue: 375.98 },
    ];
    
    const debt = createTestDebt({
      adjustmentConfig: { type: 'annual_percent', annualPercentRate: 8.5, series, frequency: 'monthly' },
      parcelasPagas: 0,
    });
    const info = getCurrentSeriesInfo(debt);
    expect(info.seriesIndex).toBe(0);
    expect(info.series?.id).toBe('s1');
    expect(info.installmentInSeries).toBe(1);
  });

  it('retorna série correta no meio da série', () => {
    const series: DebtSeries[] = [
      { id: 's1', year: 2026, startMonth: 1, installmentsCount: 12, installmentValue: 346.53 },
      { id: 's2', year: 2027, startMonth: 1, installmentsCount: 12, installmentValue: 375.98 },
    ];
    
    const debt = createTestDebt({
      adjustmentConfig: { type: 'annual_percent', annualPercentRate: 8.5, series, frequency: 'monthly' },
      parcelasPagas: 5,
    });
    const info = getCurrentSeriesInfo(debt);
    expect(info.seriesIndex).toBe(0);
    expect(info.installmentInSeries).toBe(6); // 5 pagas + 1 = próxima é a 6ª
  });

  it('retorna última série quando todas pagas', () => {
    const series: DebtSeries[] = [
      { id: 's1', year: 2026, startMonth: 1, installmentsCount: 12, installmentValue: 346.53 },
      { id: 's2', year: 2027, startMonth: 1, installmentsCount: 12, installmentValue: 375.98 },
    ];
    
    const debt = createTestDebt({
      adjustmentConfig: { type: 'annual_percent', annualPercentRate: 8.5, series, frequency: 'monthly' },
      parcelasPagas: 24,
    });
    const info = getCurrentSeriesInfo(debt);
    expect(info.seriesIndex).toBe(1);
    expect(info.series?.id).toBe('s2');
    expect(info.installmentInSeries).toBe(12);
  });
});

describe('debt.math – taxas de juros (conversão anual ↔ mensal)', () => {
  describe('convertAnnualToMonthlyRate', () => {
    it('converte 12% a.a. para taxa mensal equivalente (~0,9488% a.m.)', () => {
      const result = convertAnnualToMonthlyRate(12);
      expect(result).toBeCloseTo(0.948879, 4);
    });

    it('converte 8.5% a.a. para taxa mensal equivalente (~0,682% a.m.)', () => {
      const result = convertAnnualToMonthlyRate(8.5);
      expect(result).toBeCloseTo(0.682149, 4);
    });

    it('converte 100% a.a. para taxa mensal equivalente (~5,946% a.m.)', () => {
      const result = convertAnnualToMonthlyRate(100);
      expect(result).toBeCloseTo(5.946309, 4);
    });

    it('retorna 0 para taxa anual 0', () => {
      expect(convertAnnualToMonthlyRate(0)).toBe(0);
    });

    it('retorna 0 para taxa anual negativa', () => {
      expect(convertAnnualToMonthlyRate(-5)).toBe(0);
    });

    it('round-trip: anual → mensal → anual retorna valor original', () => {
      const annual = 12.5;
      const monthly = convertAnnualToMonthlyRate(annual);
      const backToAnnual = convertMonthlyToAnnualRate(monthly);
      expect(backToAnnual).toBeCloseTo(annual, 6);
    });
  });

  describe('convertMonthlyToAnnualRate', () => {
    it('converte 1% a.m. para taxa anual equivalente (~12,68% a.a.)', () => {
      const result = convertMonthlyToAnnualRate(1);
      expect(result).toBeCloseTo(12.682503, 4);
    });

    it('converte 0.9488% a.m. para ~12% a.a.', () => {
      const result = convertMonthlyToAnnualRate(0.948879);
      expect(result).toBeCloseTo(12, 2);
    });

    it('retorna 0 para taxa mensal 0', () => {
      expect(convertMonthlyToAnnualRate(0)).toBe(0);
    });

    it('retorna 0 para taxa mensal negativa', () => {
      expect(convertMonthlyToAnnualRate(-1)).toBe(0);
    });
  });

  describe('InterestRatePeriod type', () => {
    it('aceita apenas monthly ou annual', () => {
      const monthly: InterestRatePeriod = 'monthly';
      const annual: InterestRatePeriod = 'annual';
      expect(monthly).toBe('monthly');
      expect(annual).toBe('annual');
    });
  });
});