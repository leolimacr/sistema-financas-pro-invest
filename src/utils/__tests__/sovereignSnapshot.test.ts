import { describe, it, expect } from 'vitest';
import { buildSovereignSnapshot, computeLaunchImpact, resolveObligationPressure } from '../../utils/calculations';

describe('buildSovereignSnapshot virtualImpact composition', () => {
  it('uses obligationPressure directly (card invoice + rotativo combined)', () => {
    const result = buildSovereignSnapshot({
      monthBalance: 5000,
      accumulatedBalance: 20000,
      accumulatedIncome: 50000,
      accumulatedExpenses: 30000,
      obligationPressure: 1500, // card invoice remaining (1000) + rotativo (500)
      commandMode: true,
      income: 5000,
      expenses: 3000,
      monthlyAport: 2000,
    });

    expect(result.obligationsDeduction).toBe(1500);
    expect(result.virtualImpact).toBe(1500);
  });

  it('handles zero obligationPressure', () => {
    const result = buildSovereignSnapshot({
      monthBalance: 5000,
      accumulatedBalance: 20000,
      accumulatedIncome: 50000,
      accumulatedExpenses: 30000,
      obligationPressure: 0,
      commandMode: true,
      income: 5000,
      expenses: 3000,
      monthlyAport: 2000,
    });

    expect(result.obligationsDeduction).toBe(0);
    expect(result.virtualImpact).toBe(0);
  });

  it('handles undefined obligationPressure as zero', () => {
    const result = buildSovereignSnapshot({
      monthBalance: 5000,
      accumulatedBalance: 20000,
      accumulatedIncome: 50000,
      accumulatedExpenses: 30000,
      commandMode: true,
      income: 5000,
      expenses: 3000,
      monthlyAport: 2000,
    });

    expect(result.obligationsDeduction).toBe(0);
    expect(result.virtualImpact).toBe(0);
  });
});

describe('buildSovereignSnapshot with exclusions', () => {
  const commonParams = {
    accumulatedIncome: 50000,
    accumulatedExpenses: 30000,
    income: 5000,
    expenses: 3000,
    monthlyAport: 2000,
    financialProfile: {
      monthlyIncome: 5000,
      colchaoInicialTarget: 5000,
      marcoZero: 2000,
      emergencyReserveTarget: 8000,
      emergencyReserveCurrent: 3000,
    },
  };

  it('subtracts exclusions from sovereignFreeBalance', () => {
    const totalProtectionTarget = 5000 + 8000;
    const expectedFreeBalance = 15000 - 1000 - 500 - totalProtectionTarget - 1000; // with 1000 exclusions: -500

    const result = buildSovereignSnapshot({
      ...commonParams,
      monthBalance: 2000,
      accumulatedBalance: 15000,
      obligationPressure: 1000,
      pendingBills: 500,
      commandMode: false,
      exclusions: 1000,
    });

    expect(result.sovereignFreeBalance).toBe(expectedFreeBalance);
  });

  it('heroValue reflects exclusions in commandMode', () => {
    const totalProtectionTarget = 5000 + 8000;
    const expectedFreeBalance = 15000 - 1000 - 500 - totalProtectionTarget - 1000;

    const result = buildSovereignSnapshot({
      ...commonParams,
      monthBalance: 2000,
      accumulatedBalance: 15000,
      obligationPressure: 1000,
      pendingBills: 500,
      commandMode: true,
      exclusions: 1000,
    });

    expect(result.heroValue).toBe(result.sovereignFreeBalance);
    expect(result.heroValue).toBe(expectedFreeBalance);
    expect(result.heroValue).not.toBe(result.monthBalance);
  });

  it('handles zero exclusions without changing behavior', () => {
    const totalProtectionTarget = 5000 + 8000;
    const expectedFreeBalance = 15000 - 1000 - 500 - totalProtectionTarget; // 500

    const result = buildSovereignSnapshot({
      ...commonParams,
      monthBalance: 2000,
      accumulatedBalance: 15000,
      obligationPressure: 1000,
      pendingBills: 500,
      commandMode: false,
      exclusions: 0,
    });

    expect(result.sovereignFreeBalance).toBe(expectedFreeBalance);
  });

  it('handles undefined exclusions as zero', () => {
    const totalProtectionTarget = 5000 + 8000;
    const expectedFreeBalance = 15000 - 1000 - 500 - totalProtectionTarget; // 500

    const result = buildSovereignSnapshot({
      ...commonParams,
      monthBalance: 2000,
      accumulatedBalance: 15000,
      obligationPressure: 1000,
      pendingBills: 500,
      commandMode: false,
    });

    expect(result.sovereignFreeBalance).toBe(expectedFreeBalance);
  });
});

describe('resolveObligationPressure - helper puro', () => {
  it('soma invoices (stored ou computed - paid) + rotativo', () => {
    const r = resolveObligationPressure(
      [
        { computedTotal: 1000, paidAmount: 200, storedRemaining: 800, rotativoConverted: false },
        { computedTotal: 500, paidAmount: 0, storedRemaining: null, rotativoConverted: false },
      ],
      300
    );
    expect(r).toBe(800 + 500 + 300);
  });

  it('rotativoConverted zera a linha', () => {
    const r = resolveObligationPressure(
      [{ computedTotal: 1000, paidAmount: 0, storedRemaining: 900, rotativoConverted: true }],
      100
    );
    expect(r).toBe(100);
  });

  it('sem storedRemaining usa computed - paid (com floor 0)', () => {
    const r = resolveObligationPressure(
      [{ computedTotal: 400, paidAmount: 500, storedRemaining: null, rotativoConverted: false }],
      0
    );
    expect(r).toBe(0);
  });

  it('sem sources, retorna só rotativo', () => {
    expect(resolveObligationPressure([], 750)).toBe(750);
    expect(resolveObligationPressure([], 0)).toBe(0);
  });
});

describe('computeLaunchImpact - crédito retorna null (sem impacto imediato no caixa)', () => {
  const baseSnapshot = buildSovereignSnapshot({
    monthBalance: 2000,
    accumulatedBalance: 15000,
    accumulatedIncome: 50000,
    accumulatedExpenses: 30000,
    obligationPressure: 500,
    pendingBills: 200,
    commandMode: false,
    income: 5000,
    expenses: 3000,
    monthlyAport: 2000,
  });

  it('despesa no crédito retorna null', () => {
    expect(computeLaunchImpact(baseSnapshot, 100, 'expense', 'credit')).toBeNull();
  });

  it('despesa no dinheiro retorna preview negativo', () => {
    const p = computeLaunchImpact(baseSnapshot, 100, 'expense', 'money');
    expect(p).not.toBeNull();
    expect(p!.delta).toBe(-100);
  });

  it('receita retorna preview positivo', () => {
    const p = computeLaunchImpact(baseSnapshot, 250, 'income', 'money');
    expect(p).not.toBeNull();
    expect(p!.delta).toBe(250);
  });
});

describe('sovereignFreeBalance canonical truth', () => {
  const commonParams = {
    accumulatedIncome: 50000,
    accumulatedExpenses: 30000,
    income: 5000,
    expenses: 3000,
    monthlyAport: 2000,
    financialProfile: {
      monthlyIncome: 5000,
      colchaoInicialTarget: 5000,
      marcoZero: 2000,
      emergencyReserveTarget: 8000,
      emergencyReserveCurrent: 3000,
    },
  };

  it('heroValue equals sovereignFreeBalance in commandMode', () => {
    const result = buildSovereignSnapshot({
      ...commonParams,
      monthBalance: 2000,
      accumulatedBalance: 15000,
      obligationPressure: 1000,
      pendingBills: 500,
      commandMode: true,
    });

    expect(result.heroValue).toBe(result.sovereignFreeBalance);
    expect(result.heroValue).not.toBe(result.monthBalance);
  });

  it('heroValue equals monthBalance in rotina mode', () => {
    const result = buildSovereignSnapshot({
      ...commonParams,
      monthBalance: 2000,
      accumulatedBalance: 15000,
      obligationPressure: 1000,
      pendingBills: 500,
      commandMode: false,
    });

    expect(result.heroValue).toBe(result.monthBalance);
    expect(result.heroValue).not.toBe(result.sovereignFreeBalance);
  });

  it('sovereignFreeBalance formula: accumulated - virtualImpact - pendingBills - totalProtectionTarget', () => {
    const totalProtectionTarget = 5000 + 8000;
    const expectedFreeBalance = 15000 - 1000 - 500 - totalProtectionTarget; // 15000 - 1500 - 13000 = 500

    const result = buildSovereignSnapshot({
      ...commonParams,
      monthBalance: 2000,
      accumulatedBalance: 15000,
      obligationPressure: 1000,
      pendingBills: 500,
      commandMode: false,
    });

    expect(result.sovereignFreeBalance).toBe(expectedFreeBalance);
    expect(result.protectionShortfall).toBe(0);
  });

  it('cenário canônico do usuário: saldo 59.720,40 cobre reserva 43.743 e colchão 15.000 com folga de 977,40', () => {
    const result = buildSovereignSnapshot({
      monthBalance: 977.40,
      accumulatedBalance: 59720.40,
      accumulatedIncome: 100000,
      accumulatedExpenses: 40279.60,
      obligationPressure: 0,
      pendingBills: 0,
      commandMode: true,
      income: 5000,
      expenses: 3000,
      financialProfile: {
        monthlyIncome: 5000,
        emergencyReserveTarget: 43743,
        emergencyReserveCurrent: 0, // Ignorado pelo cálculo derivado
        colchaoInicialTarget: 15000,
      },
    });

    expect(result.reserveCoverage).toBe(43743);
    expect(result.reserveShortfall).toBe(0);
    expect(result.colchaoCoverage).toBe(15000);
    expect(result.colchaoShortfall).toBe(0);
    expect(result.protectionShortfall).toBe(0);
    expect(result.sovereignFreeBalance).toBeCloseTo(977.40, 2);
    expect(result.heroValue).toBeCloseTo(977.40, 2);
  });

  it('cenário real do usuário: saldo 59.720,40 com obrigações de 1.848,76 preenche Colchão 15k e deixa Reserva em 42.871,64 (faltando apenas 871,36)', () => {
    const result = buildSovereignSnapshot({
      monthBalance: 1000,
      accumulatedBalance: 59720.40,
      accumulatedIncome: 100000,
      accumulatedExpenses: 40279.60,
      obligationPressure: 1848.76,
      pendingBills: 0,
      commandMode: true,
      income: 5000,
      expenses: 3000,
      financialProfile: {
        monthlyIncome: 5000,
        emergencyReserveTarget: 43743,
        colchaoInicialTarget: 15000,
      },
    });

    // 1º Escudo: Colchão totalmente protegido (15.000)
    expect(result.colchaoCoverage).toBe(15000);
    expect(result.colchaoShortfall).toBe(0);

    // 2º Escudo: Reserva recebe todo o excedente restante (57.871,64 - 15.000 = 42.871,64)
    expect(result.reserveCoverage).toBeCloseTo(42871.64, 2);
    expect(result.reserveShortfall).toBeCloseTo(871.36, 2);
    expect(result.protectionShortfall).toBeCloseTo(871.36, 2);

    // Caixa após obrigações é positivo e não invadido
    expect(result.cashSurplus).toBeCloseTo(57871.64, 2);

    // Saldo livre (Disponibilidade Real) indica que faltam 871,36 para blindagem de 100%
    expect(result.sovereignFreeBalance).toBeCloseTo(-871.36, 2);
  });
});