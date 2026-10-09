import { describe, it, expect } from 'vitest';
import { validateTransaction, isValidTransaction } from '../transactionValidation';
import type { Transaction } from '../../types';

type Input = Omit<Transaction, 'id' | 'userId'> & { id?: string };

const validBase: Input = {
  type: 'expense',
  date: '2026-05-20',
  description: 'Mercado',
  category: 'Alimentação',
  amount: 150.5,
  paymentMethod: 'money',
};

describe('transactionValidation - contrato de escrita', () => {
  it('aceita criação completa válida', () => {
    expect(validateTransaction(validBase)).toEqual([]);
    expect(isValidTransaction(validBase)).toBe(true);
  });

  it('aceita edição (objeto cheio com id) válida', () => {
    expect(isValidTransaction({ ...validBase, id: 'tx1' })).toBe(true);
  });

  it('aceita amount como string numérica (legado)', () => {
    expect(isValidTransaction({ ...validBase, amount: '123.45' as unknown as number })).toBe(true);
  });

  it('rejeita amount ausente, zero, negativo, NaN e não-numérico', () => {
    for (const amount of [undefined, null, 0, -10, NaN, Infinity, 'abc', '']) {
      const errors = validateTransaction({ ...validBase, amount: amount as unknown as number });
      expect(errors.some(e => e.field === 'amount')).toBe(true);
    }
  });

  it('rejeita type fora do contrato real (incl. transfer)', () => {
    for (const type of ['transfer', 'debit', '', undefined]) {
      const errors = validateTransaction({ ...validBase, type: type as unknown as Input['type'] });
      expect(errors.some(e => e.field === 'type')).toBe(true);
    }
    expect(isValidTransaction({ ...validBase, type: 'income' })).toBe(true);
  });

  it('rejeita datas fora do formato YYYY-MM-DD ou inválidas', () => {
    for (const date of ['15/05/2026', '2026-13-40', '', undefined]) {
      const errors = validateTransaction({ ...validBase, date: date as unknown as string });
      expect(errors.some(e => e.field === 'date')).toBe(true);
    }
    expect(isValidTransaction({ ...validBase, date: '2026-01-05' })).toBe(true);
  });

  it('rejeita paymentMethod fora do contrato real, mas aceita ausente (legado)', () => {
    for (const paymentMethod of ['debit', 'transfer', 'other', 'pix']) {
      const errors = validateTransaction({ ...validBase, paymentMethod: paymentMethod as unknown as Input['paymentMethod'] });
      expect(errors.some(e => e.field === 'paymentMethod')).toBe(true);
    }
    expect(isValidTransaction({ ...validBase, paymentMethod: undefined })).toBe(true);
    for (const paymentMethod of ['money', 'credit', 'voucher'] as const) {
      expect(isValidTransaction({ ...validBase, paymentMethod })).toBe(true);
    }
  });

  it('tolera description/category vazias (re-submissão de legado)', () => {
    expect(isValidTransaction({ ...validBase, description: '', category: '' })).toBe(true);
  });

  it('rejeita description/category não-texto', () => {
    expect(validateTransaction({ ...validBase, description: 42 as unknown as string }).some(e => e.field === 'description')).toBe(true);
    expect(validateTransaction({ ...validBase, category: 42 as unknown as string }).some(e => e.field === 'category')).toBe(true);
  });
});
