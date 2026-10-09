import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEventSubscriptions } from '../useEventSubscriptions';
import { eventBus } from '../../core/orchestration/event-bus';
import { EVENT_TYPES, createDomainEvent } from '../../core/orchestration/domainEvents';

const USER_ID = 'test-user-123';

function createWrapper() {
  const queryClient = new QueryClient();
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  return { Wrapper, invalidateSpy };
}

describe('useEventSubscriptions', () => {
  let wrapperInfo: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    wrapperInfo = createWrapper();

    const dedupReset = (eventBus as any).handlers;
    if (dedupReset) {
      dedupReset.clear();
    }
  });

  afterEach(() => {
    wrapperInfo.invalidateSpy.mockClear();
  });

  it('does NOT subscribe when userId is undefined', () => {
    renderHook(() => useEventSubscriptions(undefined), { wrapper: wrapperInfo.Wrapper });
    expect(wrapperInfo.invalidateSpy).not.toHaveBeenCalled();
  });

  it('does NOT subscribe when userId is empty', () => {
    renderHook(() => useEventSubscriptions(''), { wrapper: wrapperInfo.Wrapper });
    expect(wrapperInfo.invalidateSpy).not.toHaveBeenCalled();
  });

  it('invalidates transactions query on transaction.created event', async () => {
    renderHook(() => useEventSubscriptions(USER_ID), { wrapper: wrapperInfo.Wrapper });

    const event = createDomainEvent('transaction', EVENT_TYPES.transaction.created, {
      transaction: {} as any,
      isNew: true,
      userId: USER_ID,
    }, 'test');
    await eventBus.publish(event);

    expect(wrapperInfo.invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['transactions', USER_ID],
    });
  });

  it('invalidates transactions query on transaction.updated event', async () => {
    renderHook(() => useEventSubscriptions(USER_ID), { wrapper: wrapperInfo.Wrapper });

    await eventBus.publish(createDomainEvent('transaction', EVENT_TYPES.transaction.updated, {
      transaction: {} as any,
      previousTransaction: null,
      userId: USER_ID,
      changedFields: ['amount'],
    }, 'test'));

    expect(wrapperInfo.invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['transactions', USER_ID],
    });
  });

  it('invalidates transactions query on transaction.deleted event', async () => {
    renderHook(() => useEventSubscriptions(USER_ID), { wrapper: wrapperInfo.Wrapper });

    await eventBus.publish(createDomainEvent('transaction', EVENT_TYPES.transaction.deleted, {
      transactionId: 'tx-1',
      userId: USER_ID,
      previousTransaction: {} as any,
    }, 'test'));

    expect(wrapperInfo.invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['transactions', USER_ID],
    });
  });

  it('invalidates debts query on debt.created event', async () => {
    renderHook(() => useEventSubscriptions(USER_ID), { wrapper: wrapperInfo.Wrapper });

    await eventBus.publish(createDomainEvent('debt', EVENT_TYPES.debt.created, {
      debt: {} as any,
      userId: USER_ID,
    }, 'test'));

    expect(wrapperInfo.invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['debts', USER_ID],
    });
  });

  it('invalidates debts query on debt.updated event', async () => {
    renderHook(() => useEventSubscriptions(USER_ID), { wrapper: wrapperInfo.Wrapper });

    await eventBus.publish(createDomainEvent('debt', EVENT_TYPES.debt.updated, {
      debtId: 'debt-1',
      userId: USER_ID,
      previousDebt: null,
      changes: {},
    }, 'test'));

    expect(wrapperInfo.invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['debts', USER_ID],
    });
  });

  it('invalidates debts query on debt.amortized event', async () => {
    renderHook(() => useEventSubscriptions(USER_ID), { wrapper: wrapperInfo.Wrapper });

    await eventBus.publish(createDomainEvent('debt', EVENT_TYPES.debt.amortized, {
      debtId: 'debt-1',
      userId: USER_ID,
      amount: 100,
      previousSaldo: 500,
      newSaldo: 400,
      previousParcelas: 10,
      newParcelas: 9,
    }, 'test'));

    expect(wrapperInfo.invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['debts', USER_ID],
    });
  });

  it('invalidates debts query on debt.deleted event', async () => {
    renderHook(() => useEventSubscriptions(USER_ID), { wrapper: wrapperInfo.Wrapper });

    await eventBus.publish(createDomainEvent('debt', EVENT_TYPES.debt.deleted, {
      debtId: 'debt-1',
      userId: USER_ID,
      previousDebt: {} as any,
    }, 'test'));

    expect(wrapperInfo.invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['debts', USER_ID],
    });
  });

  it('invalidates cards query on card.usage.updated event', async () => {
    renderHook(() => useEventSubscriptions(USER_ID), { wrapper: wrapperInfo.Wrapper });

    await eventBus.publish(createDomainEvent('card', EVENT_TYPES.card.usageUpdated, {
      cardId: 'card-1',
      userId: USER_ID,
      previousSaldoUtilizado: 1000,
      newSaldoUtilizado: 1200,
      reason: 'purchase',
    }, 'test'));

    expect(wrapperInfo.invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['cards', USER_ID],
    });
  });
});
