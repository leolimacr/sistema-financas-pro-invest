import { describe, it, expect, vi, afterEach } from 'vitest';
import { getCurrentInvoice, isBillPaid } from '../invoiceUtils';
import type { CreditCard, Transaction, RecurringBill } from '../../types';

describe('invoiceUtils - getCurrentInvoice', () => {
  const mockCard: CreditCard = {
    id: 'card1',
    name: 'Nubank',
    closingDay: 15,
    dueDay: 22
  };

  const mockTransactions: Transaction[] = [
    { id: 't1', userId: 'u1', type: 'expense', date: '2026-05-10', amount: 100, category: 'Food', description: 'Lunch', cardId: 'card1', paymentMethod: 'credit' },
    { id: 't2', userId: 'u1', type: 'expense', date: '2026-05-20', amount: 200, category: 'Food', description: 'Dinner', cardId: 'card1', paymentMethod: 'credit' },
    { id: 't3', userId: 'u1', type: 'expense', date: '2026-04-20', amount: 50, category: 'Food', description: 'Snack', cardId: 'card1', paymentMethod: 'credit' },
  ];

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deve retornar null se closingDay ou dueDay não estiverem definidos', () => {
    const incompleteCard = { ...mockCard, closingDay: undefined };
    expect(getCurrentInvoice(incompleteCard as any, [])).toBeNull();
  });

  it('deve calcular corretamente quando hoje > closingDay', () => {
    // Hoje: 20/05/2026. closingDay: 15.
    // Período: 16/05 a 15/06
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
    
    const result = getCurrentInvoice(mockCard, [
      ...mockTransactions,
      { id: 't4', userId: 'u1', type: 'expense', date: '2026-05-16', amount: 300, category: 'Shop', description: 'Shoes', cardId: 'card1', paymentMethod: 'credit' }
    ]);

    expect(result?.total).toBe(500); // t2 (200) + t4 (300)
    expect(result?.periodStart).toBe('2026-05-16');
    expect(result?.periodEnd).toBe('2026-06-15');
    expect(result?.dueDate).toBe('2026-06-22');
  });

  it('deve calcular corretamente quando hoje <= closingDay', () => {
    // Hoje: 10/05/2026. closingDay: 15.
    // Período: 16/04 a 15/05
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

    const result = getCurrentInvoice(mockCard, mockTransactions);

    expect(result?.total).toBe(150); // t1 (100) + t3 (50)
    expect(result?.periodStart).toBe('2026-04-16');
    expect(result?.periodEnd).toBe('2026-05-15');
    expect(result?.dueDate).toBe('2026-05-22');
  });

  it('deve somar apenas despesas do cartão correto', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-10T12:00:00Z'));

    const mixedTransactions: Transaction[] = [
      { id: 't1', userId: 'u1', type: 'expense', date: '2026-05-10', amount: 100, category: 'Food', description: 'Lunch', cardId: 'card1', paymentMethod: 'credit' },
      { id: 't2', userId: 'u1', type: 'expense', date: '2026-05-10', amount: 200, category: 'Food', description: 'Dinner', cardId: 'card2', paymentMethod: 'credit' }, // Outro cartão
      { id: 't3', userId: 'u1', type: 'income', date: '2026-05-10', amount: 500, category: 'Salary', description: 'Pay', paymentMethod: 'money' }, // Receita
    ];

    const result = getCurrentInvoice(mockCard, mixedTransactions);
    expect(result?.total).toBe(100);
  });
});

describe('invoiceUtils - isBillPaid (contrato seguro)', () => {
  const bill: RecurringBill = {
    id: 'b1',
    userId: 'u1',
    name: 'Conta de Luz',
    amount: 120,
    dueDay: 10,
    category: 'Casa',
    isActive: true,
    type: 'fixed',
  };

  const tx = (over: Partial<Transaction>): Transaction => ({
    id: 'x',
    userId: 'u1',
    type: 'expense',
    date: '2026-05-12',
    description: 'Conta de Luz',
    category: 'Casa',
    amount: 120,
    ...over,
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Regra 1: linkedRecurringBillId exato marca como paga mesmo com descrição/valor divergentes', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
    expect(isBillPaid(bill, [tx({ linkedRecurringBillId: 'b1', description: 'outra coisa', amount: 999 })])).toBe(true);
  });

  it('link para outra conta não marca como paga, mesmo com nome exato', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
    expect(isBillPaid(bill, [tx({ linkedRecurringBillId: 'b9' })])).toBe(false);
  });

  it('nome parcial nunca marca como paga', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
    expect(isBillPaid(bill, [tx({ description: 'Luz' })])).toBe(false);
    expect(isBillPaid(bill, [tx({ description: 'Conta de Luzerne' })])).toBe(false);
  });

  it('categoria sozinha nunca marca como paga', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
    expect(isBillPaid(bill, [tx({ description: 'Aluguel mensal' })])).toBe(false);
  });

  it('legado: nome normalizado exato + valor compatível marca como paga', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
    expect(isBillPaid(bill, [tx({ description: '  conta DE luz  ', amount: 120.5 })])).toBe(true);
  });

  it('legado: nome exato com valor divergente permanece pendente', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
    expect(isBillPaid(bill, [tx({ amount: 300 })])).toBe(false);
  });

  it('legado: nomes vazios nunca casam', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
    const emptyBill = { ...bill, name: '' };
    expect(isBillPaid(emptyBill, [tx({ description: '' })])).toBe(false);
  });

  it('ignora receitas e lançamentos de outro mês', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
    expect(isBillPaid(bill, [tx({ type: 'income', linkedRecurringBillId: 'b1' })])).toBe(false);
    expect(isBillPaid(bill, [tx({ date: '2026-04-12', linkedRecurringBillId: 'b1' })])).toBe(false);
  });

  it('Regra 0: bill.lastPaidDate no mês corrente marca como paga mesmo sem transações', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00Z'));
    const paidBill = { ...bill, lastPaidDate: '2026-05-10' };
    expect(isBillPaid(paidBill, [])).toBe(true);

    const oldPaidBill = { ...bill, lastPaidDate: '2026-04-10' };
    expect(isBillPaid(oldPaidBill, [])).toBe(false);
  });
});
