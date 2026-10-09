import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eventBus } from '../core/orchestration/event-bus';
import { EVENT_TYPES } from '../core/orchestration/domainEvents';
import { queryKeys } from '../core/query/queryKeys';

export function useEventSubscriptions(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const unsubTransactionCreated = eventBus.subscribe(EVENT_TYPES.transaction.created, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byUser(userId) });
    });

    const unsubTransactionUpdated = eventBus.subscribe(EVENT_TYPES.transaction.updated, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byUser(userId) });
    });

    const unsubTransactionDeleted = eventBus.subscribe(EVENT_TYPES.transaction.deleted, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byUser(userId) });
    });

    const unsubDebtCreated = eventBus.subscribe(EVENT_TYPES.debt.created, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debts.byUser(userId) });
    });

    const unsubDebtUpdated = eventBus.subscribe(EVENT_TYPES.debt.updated, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debts.byUser(userId) });
    });

    const unsubDebtAmortized = eventBus.subscribe(EVENT_TYPES.debt.amortized, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debts.byUser(userId) });
    });

    const unsubDebtDeleted = eventBus.subscribe(EVENT_TYPES.debt.deleted, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.debts.byUser(userId) });
    });

    const unsubCardUsage = eventBus.subscribe(EVENT_TYPES.card.usageUpdated, () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.byUser(userId) });
    });

    return () => {
      unsubTransactionCreated();
      unsubTransactionUpdated();
      unsubTransactionDeleted();
      unsubDebtCreated();
      unsubDebtUpdated();
      unsubDebtAmortized();
      unsubDebtDeleted();
      unsubCardUsage();
    };
  }, [userId, queryClient]);
}
