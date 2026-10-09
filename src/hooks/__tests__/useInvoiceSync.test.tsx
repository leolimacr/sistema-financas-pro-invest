import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { eventBus } from '../../core/orchestration/event-bus';
import { EVENT_TYPES, createDomainEvent } from '../../core/orchestration/domainEvents';
import type { CardInvoice, CreditCard } from '../../types';

const state = vi.hoisted(() => ({
  user: { uid: 'user-1' } as { uid: string } | null,
  cards: [] as CreditCard[],
  invoices: [] as CardInvoice[],
  invoicesLoading: false,
}));

const mocks = vi.hoisted(() => ({
  syncCardInvoices: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: state.user }),
}));
vi.mock('../useCards', () => ({
  useCards: () => ({ cards: state.cards }),
}));
vi.mock('../useCardInvoices', () => ({
  useInvoicesByUser: () => ({ invoices: state.invoices, isLoading: state.invoicesLoading }),
}));
vi.mock('../../services/invoiceGeneratorService', () => ({
  syncCardInvoices: mocks.syncCardInvoices,
}));
vi.mock('../../services/rotativoService', () => ({
  checkOverdueInvoices: () => [],
}));

const card: CreditCard = {
  id: 'card-1',
  name: 'Nubank',
  type: 'credit',
  closingDay: 12,
  dueDay: 20,
};

function setup() {
  const client = new QueryClient();
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useInvoiceSync([]), { wrapper });
  return { client, view };
}

import { useInvoiceSync } from '../useInvoiceSync';

beforeEach(() => {
  mocks.syncCardInvoices.mockReset();
  mocks.syncCardInvoices.mockResolvedValue({ synced: 0, changed: 0, skipped: 0, errors: 0 });
  state.user = { uid: 'user-1' };
  state.cards = [card];
  state.invoices = [];
  state.invoicesLoading = false;
});

describe('useInvoiceSync initial reconciliation', () => {
  it('runs exactly once per authenticated-mounted cycle', async () => {
    const { view } = setup();
    await Promise.resolve();
    expect(mocks.syncCardInvoices).toHaveBeenCalledTimes(1);
    expect(mocks.syncCardInvoices).toHaveBeenCalledWith('user-1', card, [], []);

    view.rerender();
    await Promise.resolve();
    expect(mocks.syncCardInvoices).toHaveBeenCalledTimes(1);

    // logout -> login (same uid) is a NEW authenticated cycle
    state.user = null;
    view.rerender();
    await Promise.resolve();
    expect(mocks.syncCardInvoices).toHaveBeenCalledTimes(1);

    state.user = { uid: 'user-1' };
    view.rerender();
    await Promise.resolve();
    expect(mocks.syncCardInvoices).toHaveBeenCalledTimes(2);
  });

  it('waits for invoices to finish loading before reconciling', async () => {
    state.invoicesLoading = true;
    const { view } = setup();
    await Promise.resolve();
    expect(mocks.syncCardInvoices).not.toHaveBeenCalled();

    state.invoicesLoading = false;
    view.rerender();
    await Promise.resolve();
    expect(mocks.syncCardInvoices).toHaveBeenCalledTimes(1);
  });

  it('uses the loaded stored invoices as the write-if-changed baseline', async () => {
    const existing: CardInvoice = {
      id: 'card-1_2026-06-12',
      cardId: 'card-1',
      periodStart: '2026-05-13',
      periodEnd: '2026-06-12',
      dueDate: '2026-06-20',
      total: 100,
      status: 'open',
      paidAmount: 0,
      remainingAmount: 100,
      transactionCount: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    state.invoices = [existing];
    const { view } = setup();
    await Promise.resolve();
    expect(mocks.syncCardInvoices).toHaveBeenCalledWith('user-1', card, [], [existing]);
    view.unmount();
  });

  it('is not retriggered by react-query invalidation', async () => {
    const { client, view } = setup();
    await Promise.resolve();
    expect(mocks.syncCardInvoices).toHaveBeenCalledTimes(1);

    client.invalidateQueries();
    await Promise.resolve();
    expect(mocks.syncCardInvoices).toHaveBeenCalledTimes(1);

    view.unmount();
  });
});

describe('useInvoiceSync debounce + single in-flight', () => {
  it('never runs two debounced syncs concurrently', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    mocks.syncCardInvoices.mockImplementation(async () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((resolve) => setTimeout(resolve, 30));
      concurrent--;
      return { synced: 0, changed: 0, skipped: 0, errors: 0 };
    });

    const { view } = setup();
    await Promise.resolve();
    const afterMount = mocks.syncCardInvoices.mock.calls.length;

    await eventBus.publish(createDomainEvent(
      'transaction', EVENT_TYPES.transaction.created,
      { transaction: {} as never, isNew: true, userId: 'user-1' },
      'test', 'evt-1',
    ));
    await eventBus.publish(createDomainEvent(
      'transaction', EVENT_TYPES.transaction.created,
      { transaction: {} as never, isNew: true, userId: 'user-1' },
      'test', 'evt-2',
    ));

    await new Promise((resolve) => setTimeout(resolve, 2300));
    expect(mocks.syncCardInvoices.mock.calls.length).toBeGreaterThan(afterMount);
    expect(maxConcurrent).toBe(1);
    view.unmount();
  });
});