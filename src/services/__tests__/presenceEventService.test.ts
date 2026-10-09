import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDocs = vi.hoisted(() => vi.fn());
const mockUpdateDoc = vi.hoisted(() => vi.fn());
const mockQuery = vi.hoisted(() => vi.fn((...args: any[]) => args));
const mockCollection = vi.hoisted(() => vi.fn((...args: any[]) => args));
const mockWhere = vi.hoisted(() => vi.fn((...args: any[]) => args));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
  },
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    requestPermissions: vi.fn(async () => ({ display: 'granted' })),
    schedule: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock('../../firebase', () => ({
  firestore: {},
}));

vi.mock('firebase/firestore', () => ({
  addDoc: vi.fn(),
  collection: mockCollection,
  doc: vi.fn((...args: any[]) => ({ path: args.join('/') })),
  getDoc: vi.fn(),
  getDocs: mockGetDocs,
  query: mockQuery,
  setDoc: vi.fn(),
  updateDoc: mockUpdateDoc,
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  where: mockWhere,
  Timestamp: {
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
    fromMillis: vi.fn((ms: number) => ({ toMillis: () => ms })),
  },
  increment: vi.fn((n: number) => n),
}));

import { PresenceEventService } from '../PresenceEventService';

describe('PresenceEventService recurring bill inbox', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockUpdateDoc.mockReset();
    mockQuery.mockClear();
    mockCollection.mockClear();
    mockWhere.mockClear();
  });

  it('monta evento interno de vencimento recorrente', async () => {
    const spy = vi.spyOn(PresenceEventService, 'create').mockResolvedValue(true);

    await PresenceEventService.createRecurringBillDue('user-1', {
      id: 'bill-1',
      userId: 'user-1',
      name: 'Internet',
      amount: 99.9,
      dueDay: 30,
      category: 'Moradia',
      isActive: true,
      type: 'fixed',
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      uid: 'user-1',
      eventType: 'finance.recurring_bill_due_today',
      deepLink: 'manager',
      resourceId: 'bill-1',
      urgency: 'high',
      message: expect.objectContaining({
        title: 'Internet vence hoje',
      }),
    }));

    spy.mockRestore();
  });

  it('marca o evento da conta como lido e actioned', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { ref: { id: 'event-1' } },
      ],
    });

    await PresenceEventService.markRecurringBillActioned('user-1', 'bill-1');

    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({ id: 'event-1' }), expect.objectContaining({
      status: 'actioned',
      read: true,
    }));
  });
});
