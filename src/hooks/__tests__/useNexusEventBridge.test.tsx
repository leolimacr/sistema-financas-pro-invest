import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useNexusEventBridge } from '../useNexusEventBridge';
import { eventBus } from '../../core/orchestration/event-bus';
import { EVENT_TYPES, createDomainEvent } from '../../core/orchestration/domainEvents';
import {
  getEventInsight,
  dismissCurrentInsight,
  clearEventInsightStore,
} from '../../services/eventInsightStore';
import { PresenceEventService } from '../../services/PresenceEventService';

vi.mock('../../services/PresenceEventService', () => ({
  PresenceEventService: {
    createNexusAdvisorAlert: vi.fn().mockResolvedValue(true),
  },
}));

const USER_ID = 'test-user-123';

describe('useNexusEventBridge', () => {
  beforeEach(() => {
    localStorage.clear();
    clearEventInsightStore();
  });

  it('does not subscribe when userId is undefined', () => {
    renderHook(() => useNexusEventBridge(undefined));
    expect(getEventInsight()).toBeNull();
  });

  it('does not subscribe when userId is empty', () => {
    renderHook(() => useNexusEventBridge(''));
    expect(getEventInsight()).toBeNull();
  });

  it('generates insight on transaction.created (large income)', async () => {
    renderHook(() => useNexusEventBridge(USER_ID));

    await eventBus.publish(createDomainEvent(
      'transaction',
      EVENT_TYPES.transaction.created,
      {
        transaction: { amount: 3000, type: 'income' } as any,
        isNew: true,
        userId: USER_ID,
      },
      'test'
    ));

    expect(getEventInsight()).not.toBeNull();
    expect(getEventInsight()?.message.title).toBe('Entrada de valor relevante');
  });

  it('does NOT generate insight for small transaction', async () => {
    renderHook(() => useNexusEventBridge(USER_ID));

    await eventBus.publish(createDomainEvent(
      'transaction',
      EVENT_TYPES.transaction.created,
      {
        transaction: { amount: 50, type: 'income' } as any,
        isNew: true,
        userId: USER_ID,
      },
      'test'
    ));

    expect(getEventInsight()).toBeNull();
  });

  it('generates insight on debt.amortized when debt reaches zero', async () => {
    renderHook(() => useNexusEventBridge(USER_ID));

    await eventBus.publish(createDomainEvent(
      'debt',
      EVENT_TYPES.debt.amortized,
      {
        debtId: 'debt-1',
        userId: USER_ID,
        amount: 500,
        previousSaldo: 500,
        newSaldo: 0,
        previousParcelas: 1,
        newParcelas: 0,
      },
      'test'
    ));

    expect(getEventInsight()).not.toBeNull();
    expect(getEventInsight()?.message.title).toBe('Dívida totalmente quitada!');
  });

  it('does NOT duplicate same event insight (dedup by eventBus + store)', async () => {
    renderHook(() => useNexusEventBridge(USER_ID));

    const event = createDomainEvent(
      'transaction',
      EVENT_TYPES.transaction.created,
      {
        transaction: { amount: 3000, type: 'income' } as any,
        isNew: true,
        userId: USER_ID,
      },
      'test'
    );

    await eventBus.publish(event);
    expect(getEventInsight()).not.toBeNull();

    const firstId = getEventInsight()!.id;

    await eventBus.publish(event);
    expect(getEventInsight()?.id).toBe(firstId);
  });

  it('dismissCurrentInsight clears the insight', async () => {
    renderHook(() => useNexusEventBridge(USER_ID));

    await eventBus.publish(createDomainEvent(
      'transaction',
      EVENT_TYPES.transaction.created,
      {
        transaction: { amount: 3000, type: 'income' } as any,
        isNew: true,
        userId: USER_ID,
      },
      'test'
    ));

    expect(getEventInsight()).not.toBeNull();

    dismissCurrentInsight();
    expect(getEventInsight()).toBeNull();
  });

  it('generates insight on card.usage.updated (purchase pressure)', async () => {
    renderHook(() => useNexusEventBridge(USER_ID));

    await eventBus.publish(createDomainEvent(
      'card',
      EVENT_TYPES.card.usageUpdated,
      {
        cardId: 'card-1',
        userId: USER_ID,
        previousSaldoUtilizado: 1000,
        newSaldoUtilizado: 3500,
        reason: 'purchase',
      },
      'test'
    ));

    expect(getEventInsight()).not.toBeNull();
    expect(getEventInsight()?.message.title).toBe('Pressão no limite do cartão');
  });

  it('generates insight on debt.deleted', async () => {
    renderHook(() => useNexusEventBridge(USER_ID));

    await eventBus.publish(createDomainEvent(
      'debt',
      EVENT_TYPES.debt.deleted,
      {
        debtId: 'debt-1',
        userId: USER_ID,
        previousDebt: { saldoDevedor: 10000 } as any,
      },
      'test'
    ));

    expect(getEventInsight()).not.toBeNull();
    expect(getEventInsight()?.message.title).toBe('Dívida removida');
  });

  it('generates insight on transaction.deleted with debt link', async () => {
    renderHook(() => useNexusEventBridge(USER_ID));

    await eventBus.publish(createDomainEvent(
      'transaction',
      EVENT_TYPES.transaction.deleted,
      {
        transactionId: 'tx-1',
        userId: USER_ID,
        previousTransaction: { amount: 300, linkedDebtId: 'debt-1' } as any,
      },
      'test'
    ));

    expect(getEventInsight()).not.toBeNull();
    expect(getEventInsight()?.message.title).toBe('Estorno de amortização');
  });

  it('dispatches CFP advisor alert when installment expense is created', async () => {
    renderHook(() => useNexusEventBridge(USER_ID));

    await eventBus.publish(createDomainEvent(
      'transaction',
      EVENT_TYPES.transaction.created,
      {
        transaction: {
          id: 'tx-installment-1',
          amount: 250,
          type: 'expense',
          installmentsCount: 10,
        } as any,
        isNew: true,
        userId: USER_ID,
      },
      'test'
    ));

    expect(PresenceEventService.createNexusAdvisorAlert).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        id: 'nexus-alert-installment-tx-installment-1',
        title: 'Parcelamento Registrado',
        urgency: 'medium',
      })
    );
  });
});

