import { describe, it, expect } from 'vitest';
import {
  computeRotativoMonthlyInterest,
  projectRotativoCompoundInterest,
  hasInterestBeenAppliedThisMonth,
} from '../rotativo.math';

describe('computeRotativoMonthlyInterest', () => {
  it('returns 0 when saldoDevedor is zero', () => {
    expect(computeRotativoMonthlyInterest(0, 14.9)).toBe(0);
  });

  it('returns 0 when saldoDevedor is negative', () => {
    expect(computeRotativoMonthlyInterest(-100, 14.9)).toBe(0);
  });

  it('returns 0 when taxaMensal is zero', () => {
    expect(computeRotativoMonthlyInterest(5000, 0)).toBe(0);
  });

  it('returns 0 when taxaMensal is negative', () => {
    expect(computeRotativoMonthlyInterest(5000, -5)).toBe(0);
  });

  it('calculates monthly interest for positive values', () => {
    const result = computeRotativoMonthlyInterest(1000, 14.9);
    expect(result).toBe(149);
  });

  it('rounds to 2 decimal places', () => {
    const result = computeRotativoMonthlyInterest(1500.55, 3.5);
    expect(result).toBe(52.52);
  });

  it('works with small balances', () => {
    const result = computeRotativoMonthlyInterest(10.5, 10);
    expect(result).toBe(1.05);
  });

  it('works with large balances', () => {
    const result = computeRotativoMonthlyInterest(100000, 8.5);
    expect(result).toBe(8500);
  });
});

describe('projectRotativoCompoundInterest', () => {
  it('returns original balance when saldoDevedor is zero', () => {
    const result = projectRotativoCompoundInterest(0, 14.9, 6);
    expect(result).toEqual({ finalBalance: 0, totalInterest: 0 });
  });

  it('returns original balance when saldoDevedor is negative', () => {
    const result = projectRotativoCompoundInterest(-500, 14.9, 3);
    expect(result).toEqual({ finalBalance: -500, totalInterest: 0 });
  });

  it('returns original balance when taxaMensal is zero', () => {
    const result = projectRotativoCompoundInterest(5000, 0, 12);
    expect(result).toEqual({ finalBalance: 5000, totalInterest: 0 });
  });

  it('returns original balance when taxaMensal is negative', () => {
    const result = projectRotativoCompoundInterest(5000, -2, 6);
    expect(result).toEqual({ finalBalance: 5000, totalInterest: 0 });
  });

  it('returns original balance when meses is zero', () => {
    const result = projectRotativoCompoundInterest(5000, 14.9, 0);
    expect(result).toEqual({ finalBalance: 5000, totalInterest: 0 });
  });

  it('returns original balance when meses is negative', () => {
    const result = projectRotativoCompoundInterest(5000, 14.9, -1);
    expect(result).toEqual({ finalBalance: 5000, totalInterest: 0 });
  });

  it('1 month equals computeRotativoMonthlyInterest', () => {
    const projection = projectRotativoCompoundInterest(1000, 14.9, 1);
    const monthly = computeRotativoMonthlyInterest(1000, 14.9);
    expect(projection.totalInterest).toBe(monthly);
    expect(projection.finalBalance).toBe(1000 + monthly);
  });

  it('compounds correctly over multiple months', () => {
    const result = projectRotativoCompoundInterest(1000, 14.9, 3);
    // 1000 * (1.149)^3 = 1000 * 1.516910949 = 1516.91
    expect(result.finalBalance).toBe(1516.91);
    expect(result.totalInterest).toBe(516.91);
  });

  it('compounds over 6 months', () => {
    const result = projectRotativoCompoundInterest(2000, 10, 6);
    // 2000 * (1.10)^6 = 2000 * 1.771561 = 3543.122
    expect(result.finalBalance).toBe(3543.12);
    expect(result.totalInterest).toBe(1543.12);
  });

  it('works with decimal taxaMensal', () => {
    const result = projectRotativoCompoundInterest(1500, 2.99, 12);
    // 1500 * (1.0299)^12
    const rate = 2.99 / 100;
    const expected = 1500 * Math.pow(1 + rate, 12);
    expect(result.finalBalance).toBe(Math.round(expected * 100) / 100);
    expect(result.totalInterest).toBe(Math.round((expected - 1500) * 100) / 100);
  });

  it('rounds finalBalance correctly', () => {
    const result = projectRotativoCompoundInterest(1, 0.5, 1);
    expect(result.finalBalance).toBe(1.01);
    expect(result.totalInterest).toBe(0.01);
  });
});

describe('hasInterestBeenAppliedThisMonth', () => {
  const jan15 = new Date(2026, 0, 15); // Jan 15 2026
  const feb1 = new Date(2026, 1, 1);   // Feb 1 2026

  it('returns false when lastAppliedAt is undefined', () => {
    expect(hasInterestBeenAppliedThisMonth(undefined, jan15)).toBe(false);
  });

  it('returns false when lastAppliedAt is null', () => {
    expect(hasInterestBeenAppliedThisMonth(null, jan15)).toBe(false);
  });

  it('returns true when lastAppliedAt is in the same month', () => {
    expect(hasInterestBeenAppliedThisMonth('2026-01-10T10:00:00.000Z', jan15)).toBe(true);
  });

  it('returns false when lastAppliedAt is in a previous month', () => {
    expect(hasInterestBeenAppliedThisMonth('2025-12-31T23:59:59.999Z', jan15)).toBe(false);
  });

  it('returns false when lastAppliedAt is in a later month', () => {
    expect(hasInterestBeenAppliedThisMonth('2026-02-01T00:00:00.000Z', jan15)).toBe(false);
  });

  it('returns false when lastAppliedAt is in the same month but previous year', () => {
    expect(hasInterestBeenAppliedThisMonth('2025-01-15T00:00:00.000Z', jan15)).toBe(false);
  });

  it('handles month boundary correctly (Jan 31 vs Feb 1)', () => {
    const jan31_2026 = new Date(2026, 0, 31);
    const feb1_2026 = new Date(2026, 1, 1);
    expect(hasInterestBeenAppliedThisMonth('2026-01-31T23:59:00.000Z', feb1_2026)).toBe(false);
    expect(hasInterestBeenAppliedThisMonth('2026-02-01T00:00:00.000Z', feb1_2026)).toBe(true);
  });
});
