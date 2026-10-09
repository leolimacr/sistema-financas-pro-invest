import { useCallback, useEffect, useRef } from 'react';
import { eventBus } from '../core/orchestration/event-bus';
import { EVENT_TYPES, createDomainEvent } from '../core/orchestration/domainEvents';
import type { CardUsageUpdatedEvent, TransactionCreatedEvent, TransactionDeletedEvent } from '../core/orchestration/domainEvents';
import { queryKeys } from '../core/query/queryKeys';
import { syncCardInvoices } from '../services/invoiceGeneratorService';
import { checkOverdueInvoices } from '../services/rotativoService';
import { useAuth } from '../contexts/AuthContext';
import { useCards } from './useCards';
import { useInvoicesByUser } from './useCardInvoices';
import { useQueryClient } from '@tanstack/react-query';
import type { Transaction } from '../types';

const publishedOverdue = new Set<string>();

export function useInvoiceSync(transactions: Transaction[]) {
  const { user } = useAuth();
  const { cards } = useCards(user?.uid);
  const { invoices: storedInvoices, isLoading: invoicesLoading } = useInvoicesByUser(user?.uid);
  const queryClient = useQueryClient();
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef = useRef<number>(0);
  const syncRunningRef = useRef(false);
  const initialSyncRef = useRef<{ uid: string | null; ran: boolean }>({ uid: null, ran: false });

  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const transactionsRef = useRef(transactions);
  transactionsRef.current = transactions;
  const invoicesRef = useRef(storedInvoices);
  invoicesRef.current = storedInvoices;

  // A new authenticated cycle (including logout/login with the same uid) resets the guard,
  // so a fresh initial reconciliation runs once after the invoices finish loading.
  useEffect(() => {
    initialSyncRef.current = { uid: user?.uid ?? null, ran: false };
  }, [user?.uid]);

  // Single in-flight per tab: any concurrent sync (initial reconciliation or an
  // event-triggered run) is re-scheduled, never executed in parallel.
  const syncAllConditional = useCallback(async (uid: string): Promise<void> => {
    if (syncRunningRef.current) return;
    syncRunningRef.current = true;
    try {
      const cards = cardsRef.current;
      const safeTx = Array.isArray(transactionsRef.current) ? transactionsRef.current : [];
      const existing = invoicesRef.current;
      for (const card of cards) {
        await syncCardInvoices(uid, card, safeTx, existing).catch(() => {});
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.byUser(uid) });
    } finally {
      syncRunningRef.current = false;
    }
  }, [queryClient]);

  // Initial reconciliation: runs once per authenticated-mounted cycle, deferred until
  // the invoices cache is loaded so that write-if-changed compares against real docs.
  useEffect(() => {
    if (!user?.uid) return;
    if (invoicesLoading) return;

    const guard = initialSyncRef.current;
    if (guard.uid === user.uid && guard.ran) return;
    guard.uid = user.uid;
    guard.ran = true;

    const reconcileOnce = async () => {
      if (syncRunningRef.current) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          void reconcileOnce();
        }, 2000);
        return;
      }
      await syncAllConditional(user.uid);
    };
    void reconcileOnce();
  }, [user?.uid, invoicesLoading, syncAllConditional]);

  useEffect(() => {
    if (!user?.uid) return;

    const debouncedSync = () => {
      const now = Date.now();
      if (now - lastSyncRef.current < 2000) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(debouncedSync, 2000);
        return;
      }

      lastSyncRef.current = now;
      void runSyncNow(user.uid);
    };

    const runSyncNow = async (uid: string): Promise<void> => {
      if (syncRunningRef.current) {
        if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => {
          void runSyncNow(uid);
        }, 2000);
        return;
      }
      await syncAllConditional(uid);
    };

    const publishOverdueEvents = () => {
      const cards = cardsRef.current;
      const invoices = invoicesRef.current;
      const overdueInvoices = checkOverdueInvoices(cards, invoices);
      for (const info of overdueInvoices) {
        const dedupKey = `${info.cardId}|${info.periodEnd}`;
        if (publishedOverdue.has(dedupKey)) continue;
        publishedOverdue.add(dedupKey);

        eventBus.publish(createDomainEvent(
          'card',
          EVENT_TYPES.card.invoiceOverdue,
          info,
          'useInvoiceSync',
          `overdue-${info.cardId}-${info.periodEnd}`,
        ));
      }
    };

    publishOverdueEvents();

    const unsubCardUsage = eventBus.subscribe<CardUsageUpdatedEvent['payload']>(
      EVENT_TYPES.card.usageUpdated,
      () => debouncedSync(),
    );

    const unsubTxCreated = eventBus.subscribe<TransactionCreatedEvent['payload']>(
      EVENT_TYPES.transaction.created,
      () => debouncedSync(),
    );

    const unsubTxDeleted = eventBus.subscribe<TransactionDeletedEvent['payload']>(
      EVENT_TYPES.transaction.deleted,
      () => debouncedSync(),
    );

    return () => {
      unsubCardUsage();
      unsubTxCreated();
      unsubTxDeleted();
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [user?.uid, syncAllConditional]);
}
