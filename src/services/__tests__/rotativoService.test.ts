import { describe, it, expect } from 'vitest';
import { checkOverdueInvoices } from '../rotativoService';
import type { CardInvoice, CreditCard } from '../../types';

const makeCard = (id: string, name: string): CreditCard => ({
  id,
  name,
  saldoUtilizadoTotal: 5000,
});

const makeInvoice = (
  id: string,
  cardId: string,
  overrides: Partial<CardInvoice> = {},
): CardInvoice => ({
  id,
  cardId,
  periodStart: '2026-06-01',
  periodEnd: '2026-06-15',
  dueDate: '2026-06-10',
  total: 3000,
  status: 'open',
  paidAmount: 0,
  remainingAmount: 3000,
  transactionCount: 5,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const FUTURE_DUE = '2099-01-01';
const PAST_DUE = '2020-01-01';

describe('rotativoService — checkOverdueInvoices', () => {
  it('returns empty when no invoices are overdue', () => {
    const cards = [makeCard('card-1', 'Nubank')];
    const invoices = [
      makeInvoice('inv-1', 'card-1', { dueDate: FUTURE_DUE }),
    ];

    const result = checkOverdueInvoices(cards, invoices);
    expect(result).toHaveLength(0);
  });

  it('returns overdue invoice when dueDate is in the past and has remainingAmount', () => {
    const cards = [makeCard('card-1', 'Nubank')];
    const invoices = [
      makeInvoice('inv-1', 'card-1', { dueDate: PAST_DUE, remainingAmount: 1500 }),
    ];

    const result = checkOverdueInvoices(cards, invoices);
    expect(result).toHaveLength(1);
    expect(result[0].cardId).toBe('card-1');
    expect(result[0].remainingAmount).toBe(1500);
    expect(result[0].cardName).toBe('Nubank');
  });

  it('excludes invoices with rotativoConverted: true', () => {
    const cards = [makeCard('card-1', 'Nubank')];
    const invoices = [
      makeInvoice('inv-1', 'card-1', {
        dueDate: PAST_DUE,
        remainingAmount: 2000,
        rotativoConverted: true,
      }),
    ];

    const result = checkOverdueInvoices(cards, invoices);
    expect(result).toHaveLength(0);
  });

  it('excludes invoices with zero remainingAmount even if overdue', () => {
    const cards = [makeCard('card-1', 'Nubank')];
    const invoices = [
      makeInvoice('inv-1', 'card-1', {
        dueDate: PAST_DUE,
        remainingAmount: 0,
      }),
    ];

    const result = checkOverdueInvoices(cards, invoices);
    expect(result).toHaveLength(0);
  });

  it('excludes invoices without dueDate', () => {
    const cards = [makeCard('card-1', 'Nubank')];
    const invoices = [
      makeInvoice('inv-1', 'card-1', {
        dueDate: undefined as any,
        remainingAmount: 1000,
      }),
    ];

    const result = checkOverdueInvoices(cards, invoices);
    expect(result).toHaveLength(0);
  });

  it('returns multiple overdue invoices for different cards', () => {
    const cards = [makeCard('card-1', 'Nubank'), makeCard('card-2', 'Inter')];
    const invoices = [
      makeInvoice('inv-1', 'card-1', { dueDate: PAST_DUE, remainingAmount: 500 }),
      makeInvoice('inv-2', 'card-2', { dueDate: PAST_DUE, remainingAmount: 800 }),
    ];

    const result = checkOverdueInvoices(cards, invoices);
    expect(result).toHaveLength(2);
  });

  it('uses card name from card list', () => {
    const cards = [makeCard('card-1', 'C6 Bank')];
    const invoices = [
      makeInvoice('inv-1', 'card-1', { dueDate: PAST_DUE, remainingAmount: 1000 }),
    ];

    const result = checkOverdueInvoices(cards, invoices);
    expect(result[0].cardName).toBe('C6 Bank');
  });

  it('falls back to "Cartão" when card not found in list', () => {
    const cards: CreditCard[] = [];
    const invoices = [
      makeInvoice('inv-1', 'unknown-card', { dueDate: PAST_DUE, remainingAmount: 1000 }),
    ];

    const result = checkOverdueInvoices(cards, invoices);
    expect(result[0].cardName).toBe('Cartão');
  });
});
