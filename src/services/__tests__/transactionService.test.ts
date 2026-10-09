import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSet = vi.hoisted(() => vi.fn());
const mockPush = vi.hoisted(() => vi.fn(() => ({ key: 'tx-1' })));
const mockRef = vi.hoisted(() => vi.fn((...args: any[]) => ({ path: args.join('/') })));
const mockUpdateRecurringBill = vi.hoisted(() => vi.fn());

vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  push: mockPush,
  ref: mockRef,
  set: mockSet,
}));

vi.mock('../billService', () => ({
  updateRecurringBill: mockUpdateRecurringBill,
}));

import { addPaidRecurringBillTransaction } from '../transactionService';

describe('transactionService recurring bill payment', () => {
  beforeEach(() => {
    mockSet.mockClear();
    mockPush.mockClear();
    mockRef.mockClear();
    mockUpdateRecurringBill.mockClear();
  });

  it('cria transação de pagamento e atualiza a conta recorrente', async () => {
    const bill = {
      id: 'bill-123',
      userId: 'user-1',
      name: 'Internet',
      amount: 99.9,
      dueDay: 30,
      category: 'Moradia',
      isActive: true,
      type: 'fixed' as const,
    };

    const txId = await addPaidRecurringBillTransaction('user-1', bill);

    expect(txId).toBe('tx-1');
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledTimes(1);

    const written = mockSet.mock.calls[0][1];
    expect(written).toMatchObject({
      userId: 'user-1',
      description: 'Pagamento de Internet',
      amount: 99.9,
      type: 'expense',
      category: 'Moradia',
      paymentMethod: 'money',
      isBillPayment: false,
      linkedRecurringBillId: 'bill-123',
    });

    expect(typeof written.createdAtMs).toBe('number');
    expect(typeof written.sortKey).toBe('string');
    expect(mockUpdateRecurringBill).toHaveBeenCalledWith('user-1', 'bill-123', expect.objectContaining({ lastPaidDate: expect.any(String) }));
  });
});
