import { describe, it, expect } from 'vitest';
import type { Transaction } from '../../types';
import {
  calculateMonthTotals,
  filterTransactionsByMonth,
  formatMonthLabel,
  getCurrentMonthKey,
  getMonthKey,
  isValidMonthKey,
  shiftMonthKey,
} from '../dashboardService';

const base = (over: Partial<Transaction> & { id: string }): Transaction => ({
  userId: 'u1',
  type: 'expense',
  date: '2026-09-10',
  description: 'x',
  category: 'geral',
  amount: 100,
  ...over,
});

describe('dashboardService (E8-01)', () => {
  it('getMonthKey formata com zero à esquerda', () => {
    expect(getMonthKey(2026, 9)).toBe('2026-09');
    expect(getMonthKey(2026, 1)).toBe('2026-01');
  });

  it('getCurrentMonthKey usa a data de referência', () => {
    expect(getCurrentMonthKey(new Date(2026, 8, 9))).toBe('2026-09');
  });

  it('isValidMonthKey rejeita chaves inválidas', () => {
    expect(isValidMonthKey('2026-09')).toBe(true);
    expect(isValidMonthKey('2026-13')).toBe(false);
    expect(isValidMonthKey('09/2026')).toBe(false);
    expect(isValidMonthKey('')).toBe(false);
  });

  it('shiftMonthKey atravessa virada de ano', () => {
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
    expect(shiftMonthKey('2026-09', 0)).toBe('2026-09');
    expect(shiftMonthKey('invalida', 1)).toBe('invalida');
  });

  it('filterTransactionsByMonth filtra por prefixo YYYY-MM', () => {
    const txs = [
      base({ id: 'a', date: '2026-09-01' }),
      base({ id: 'b', date: '2026-08-31' }),
      base({ id: 'c', date: '2026-09-30' }),
    ];
    expect(filterTransactionsByMonth(txs, '2026-09').map((t) => t.id)).toEqual(['a', 'c']);
    expect(filterTransactionsByMonth(txs, 'xx')).toEqual([]);
  });

  it('calculateMonthTotals soma receitas, despesas e saldo', () => {
    const txs = [
      base({ id: 'a', type: 'income', amount: 3000, date: '2026-09-05' }),
      base({ id: 'b', type: 'expense', amount: 1200, date: '2026-09-06' }),
      base({ id: 'c', type: 'expense', amount: 800, date: '2026-08-06' }),
    ];
    const totals = calculateMonthTotals(txs, '2026-09');
    expect(totals).toMatchObject({
      monthKey: '2026-09',
      totalIncome: 3000,
      totalExpense: 1200,
      balance: 1800,
      count: 2,
    });
  });

  it('calculateMonthTotals com mês vazio zera tudo', () => {
    expect(calculateMonthTotals([], '2026-09')).toMatchObject({
      totalIncome: 0,
      totalExpense: 0,
      balance: 0,
      count: 0,
    });
  });

  it('formatMonthLabel gera rótulo pt-BR', () => {
    expect(formatMonthLabel('2026-09')).toContain('2026');
    expect(formatMonthLabel('xx')).toBe('xx');
  });
});
