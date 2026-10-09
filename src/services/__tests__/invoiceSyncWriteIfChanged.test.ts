import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CardInvoice, CreditCard, Transaction } from '../../types';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args: unknown[]) => args.join('/')),
  doc: vi.fn((...args: unknown[]) => ({ path: args.join('/') })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  query: vi.fn((...args: unknown[]) => args),
  where: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn((...args: unknown[]) => args),
  limit: vi.fn((...args: unknown[]) => args),
}));

vi.mock('../../firebase', () => ({ firestore: {} }));
vi.mock('../../core/query/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

import { setDoc } from 'firebase/firestore';
import {
  computeInvoiceFingerprintV1,
  saveInvoiceIfChanged,
  buildInvoiceId,
  type InvoiceDerivedFields,
} from '../invoiceService';
import { syncCardInvoices, syncAllCardsInvoices } from '../invoiceGeneratorService';

const mockSetDoc = setDoc as unknown as ReturnType<typeof vi.fn>;

const card: CreditCard = {
  id: 'card-1',
  name: 'Nubank',
  type: 'credit',
  closingDay: 12,
  dueDay: 20,
};

function derived(overrides: Partial<InvoiceDerivedFields> = {}): InvoiceDerivedFields {
  return {
    cardId: 'card-1',
    periodStart: '2026-05-13',
    periodEnd: '2026-06-12',
    dueDate: '2026-06-20',
    total: 100,
    status: 'open',
    paidAmount: 0,
    remainingAmount: 100,
    transactionCount: 1,
    lastTransactionDate: '2026-06-11',
    ...overrides,
  };
}

function stored(overrides: Partial<CardInvoice> = {}): CardInvoice {
  const d = derived(overrides as Partial<InvoiceDerivedFields>);
  return {
    id: buildInvoiceId(d.cardId, d.periodEnd),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...d,
    ...overrides,
  };
}

function tx(id: string, date: string, amount: number, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id,
    userId: 'user-1',
    type: 'expense',
    date,
    description: `tx-${id}`,
    category: 'alimentacao',
    amount,
    cardId: 'card-1',
    ...overrides,
  };
}

beforeEach(() => {
  mockSetDoc.mockClear();
});

describe('computeInvoiceFingerprintV1', () => {
  it('is deterministic for the same business payload', () => {
    expect(computeInvoiceFingerprintV1(derived())).toBe(computeInvoiceFingerprintV1(derived()));
  });

  it('normalizes money to cents (12.345 === 12.35)', () => {
    const a = derived({ total: 12.345 });
    const b = derived({ total: 12.35 });
    expect(computeInvoiceFingerprintV1(a)).toBe(computeInvoiceFingerprintV1(b));
  });

  it('distinguishes total 0 from total null', () => {
    const a = derived({ total: 0 });
    const b = derived({ total: null as unknown as number });
    expect(computeInvoiceFingerprintV1(a)).not.toBe(computeInvoiceFingerprintV1(b));
  });

  it('collision check: same total/count/lastTxDate but different paid/status differ', () => {
    const base = { total: 100, transactionCount: 1, lastTransactionDate: '2026-06-11' };
    const open = derived({ ...base, paidAmount: 0, status: 'open', remainingAmount: 100 });
    const partial = derived({ ...base, paidAmount: 40, status: 'partial', remainingAmount: 60 });
    expect(computeInvoiceFingerprintV1(open)).not.toBe(computeInvoiceFingerprintV1(partial));
  });

  it('distinguishes different periods', () => {
    const a = derived({ periodEnd: '2026-06-12' });
    const b = derived({ periodEnd: '2026-07-12' });
    expect(computeInvoiceFingerprintV1(a)).not.toBe(computeInvoiceFingerprintV1(b));
  });

  it('ignores createdAt/updatedAt churn', () => {
    const d = derived();
    const withTimestamps = { ...d, createdAt: 'T0', updatedAt: 'T1' } as InvoiceDerivedFields;
    expect(computeInvoiceFingerprintV1(withTimestamps)).toBe(computeInvoiceFingerprintV1(d));
  });

  it('is prefixed with the version', () => {
    expect(computeInvoiceFingerprintV1(derived())).toContain('v1');
  });
});

describe('saveInvoiceIfChanged', () => {
  it('creates when the document does not exist', async () => {
    const result = await saveInvoiceIfChanged('user-1', derived(), new Map());
    expect(result).toEqual({ written: true, reason: 'created' });
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const payload = mockSetDoc.mock.calls[0][1];
    expect(payload.createdAt).toEqual(expect.any(String));
    expect(payload.updatedAt).toEqual(expect.any(String));
    expect(payload._fingerprint).toEqual(computeInvoiceFingerprintV1(derived()));
  });

  it('skips (0 writes) when an identical document already exists', async () => {
    const existing = stored();
    const map = new Map([[existing.id, existing]]);
    const result = await saveInvoiceIfChanged('user-1', derived(), map);
    expect(result).toEqual({ written: false, reason: 'unchanged' });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('skips a legacy document (no _fingerprint) with identical business fields', async () => {
    const existing: CardInvoice = { ...stored(), _fingerprint: undefined };
    const map = new Map([[existing.id, existing]]);
    const result = await saveInvoiceIfChanged('user-1', derived(), map);
    expect(result.written).toBe(false);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('updates a legacy document (no _fingerprint) when business fields changed, preserving createdAt', async () => {
    const existing: CardInvoice = { ...stored({ total: 50 }), _fingerprint: undefined };
    const map = new Map([[existing.id, existing]]);
    const result = await saveInvoiceIfChanged('user-1', derived(), map);
    expect(result).toEqual({ written: true, reason: 'updated' });
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const payload = mockSetDoc.mock.calls[0][1];
    expect(payload.total).toBe(100);
    expect(payload.createdAt).toBeUndefined();
    expect(payload.updatedAt).toEqual(expect.any(String));
    expect(payload._fingerprint).toEqual(computeInvoiceFingerprintV1(derived()));
  });

  it('skips a fingerprint-matching document even when its timestamps drifted', async () => {
    const d = derived();
    const existing = stored({
      ...d,
      _fingerprint: computeInvoiceFingerprintV1(d),
      createdAt: '1999-01-01T00:00:00.000Z',
    });
    const map = new Map([[existing.id, existing]]);
    const result = await saveInvoiceIfChanged('user-1', d, map);
    expect(result.written).toBe(false);
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});

describe('syncCardInvoices', () => {
  it('returns zeros for a card without closing day', async () => {
    const result = await syncCardInvoices('user-1', { ...card, closingDay: 0, dueDay: 0 }, []);
    expect(result).toEqual({ synced: 0, changed: 0, skipped: 0, errors: 0 });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('skips unchanged periods and writes only the new period', async () => {
    // '2026-05-30' → período 2026-06-12 (igual ao existing → skip)
    // '2026-07-05' → período 2026-07-12 (novo → create)
    const existing = stored({ lastTransactionDate: '2026-05-30' });
    const result = await syncCardInvoices('user-1', card, [
      tx('a', '2026-05-30', 100),
      tx('b', '2026-07-05', 50),
    ], [existing]);

    expect(result.synced).toBe(2);
    expect(result.changed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const payload = mockSetDoc.mock.calls[0][1];
    expect(payload.periodEnd).toBe('2026-07-12');
    expect(payload.total).toBe(50);
    expect(payload.createdAt).toEqual(expect.any(String));
  });
});

describe('syncAllCardsInvoices', () => {
  it('skips voucher cards and cards without closing day', async () => {
    const voucher = { ...card, id: 'card-voucher', type: 'voucher' as const, closingDay: 12, dueDay: 20 };
    const noClosing = { ...card, id: 'card-no-close', closingDay: 0, dueDay: 0 };
    const result = await syncAllCardsInvoices('user-1', [voucher, noClosing], [tx('a', '2026-05-30', 100)]);
    expect(result).toEqual({ synced: 0, errors: 0, cardCount: 0 });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });
});