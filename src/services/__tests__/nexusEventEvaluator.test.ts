import { describe, it, expect } from 'vitest';
import {
  evaluateTransactionCreated,
  evaluateTransactionUpdated,
  evaluateTransactionDeleted,
  evaluateCardUsageUpdated,
  evaluateCardInvoiceOverdue,
  evaluateDebtCreated,
  evaluateDebtUpdated,
  evaluateDebtAmortized,
  evaluateDebtDeleted,
} from '../nexusEventEvaluator';

describe('nexusEventEvaluator', () => {
  describe('evaluateTransactionCreated', () => {
    it('returns null for small income', () => {
      const result = evaluateTransactionCreated({
        transaction: { amount: 100, type: 'income' } as any,
        isNew: true,
        userId: 'u1',
      });
      expect(result).toBeNull();
    });

    it('returns insight for large income >= 2000', () => {
      const result = evaluateTransactionCreated({
        transaction: { amount: 2500, type: 'income' } as any,
        isNew: true,
        userId: 'u1',
      });
      expect(result?.id).toBe('nexus-event-large-income');
      expect(result?.priority).toBe('media');
    });

    it('returns insight for bill payment', () => {
      const result = evaluateTransactionCreated({
        transaction: { amount: 800, isBillPayment: true } as any,
        isNew: true,
        userId: 'u1',
      });
      expect(result?.id).toBe('nexus-event-bill-payment');
    });

    it('returns insight for debt-linked transaction', () => {
      const result = evaluateTransactionCreated({
        transaction: { amount: 500, linkedDebtId: 'debt-1' } as any,
        isNew: true,
        userId: 'u1',
      });
      expect(result?.id).toBe('nexus-event-debt-amortization');
    });

    it('returns insight for large expense >= 1500', () => {
      const result = evaluateTransactionCreated({
        transaction: { amount: 1800, type: 'expense' } as any,
        isNew: true,
        userId: 'u1',
      });
      expect(result?.id).toBe('nexus-event-large-expense');
      expect(result?.priority).toBe('baixa');
    });
  });

  describe('evaluateTransactionUpdated', () => {
    it('returns null for small change', () => {
      const result = evaluateTransactionUpdated({
        transaction: { amount: 510 } as any,
        previousTransaction: { amount: 500 } as any,
        userId: 'u1',
        changedFields: ['amount'],
      });
      expect(result).toBeNull();
    });

    it('returns insight for change >= 750', () => {
      const result = evaluateTransactionUpdated({
        transaction: { amount: 1500 } as any,
        previousTransaction: { amount: 500 } as any,
        userId: 'u1',
        changedFields: ['amount'],
      });
      expect(result?.id).toBe('nexus-event-transaction-updated');
    });

    it('returns insight when debt link changes', () => {
      const result = evaluateTransactionUpdated({
        transaction: { amount: 100, linkedDebtId: 'debt-2' } as any,
        previousTransaction: { amount: 100, linkedDebtId: 'debt-1' } as any,
        userId: 'u1',
        changedFields: ['linkedDebtId'],
      });
      expect(result?.id).toBe('nexus-event-debt-link-changed');
    });
  });

  describe('evaluateTransactionDeleted', () => {
    it('returns null for small deletion', () => {
      const result = evaluateTransactionDeleted({
        transactionId: 'tx-1',
        userId: 'u1',
        previousTransaction: { amount: 100 } as any,
      });
      expect(result).toBeNull();
    });

    it('returns debt rollback insight when linked to debt', () => {
      const result = evaluateTransactionDeleted({
        transactionId: 'tx-1',
        userId: 'u1',
        previousTransaction: { amount: 300, linkedDebtId: 'debt-1' } as any,
      });
      expect(result?.id).toBe('nexus-event-debt-rollback');
    });

    it('returns insight for amount >= 750', () => {
      const result = evaluateTransactionDeleted({
        transactionId: 'tx-1',
        userId: 'u1',
        previousTransaction: { amount: 800 } as any,
      });
      expect(result?.id).toBe('nexus-event-transaction-deleted');
    });
  });

  describe('evaluateCardUsageUpdated', () => {
    it('returns insight for large purchase jump >= 2000', () => {
      const result = evaluateCardUsageUpdated({
        cardId: 'card-1',
        userId: 'u1',
        previousSaldoUtilizado: 1000,
        newSaldoUtilizado: 3500,
        reason: 'purchase',
      });
      expect(result?.id).toBe('nexus-event-card-pressure');
      expect(result?.action?.type).toBe('pay_invoice');
      expect(result?.action?.payload?.cardId).toBe('card-1');
      expect(result?.action?.payload?.amount).toBe(2500);
    });

    it('returns insight for bill payment recovery >= 1000', () => {
      const result = evaluateCardUsageUpdated({
        cardId: 'card-1',
        userId: 'u1',
        previousSaldoUtilizado: 3000,
        newSaldoUtilizado: 500,
        reason: 'bill_payment',
      });
      expect(result?.id).toBe('nexus-event-card-recovery');
    });

    it('returns insight for rollback', () => {
      const result = evaluateCardUsageUpdated({
        cardId: 'card-1',
        userId: 'u1',
        previousSaldoUtilizado: 5000,
        newSaldoUtilizado: 4500,
        reason: 'rollback',
      });
      expect(result?.id).toBe('nexus-event-card-rollback');
    });

    it('returns null for small purchase', () => {
      const result = evaluateCardUsageUpdated({
        cardId: 'card-1',
        userId: 'u1',
        previousSaldoUtilizado: 1000,
        newSaldoUtilizado: 1200,
        reason: 'purchase',
      });
      expect(result).toBeNull();
    });
  });

  describe('evaluateDebtCreated', () => {
    it('returns insight for debt >= 5000', () => {
      const result = evaluateDebtCreated({
        debt: { saldoDevedor: 10000 } as any,
        userId: 'u1',
      });
      expect(result?.id).toBe('nexus-event-debt-created');
      expect(result?.priority).toBe('media');
    });

    it('returns low-priority insight for small debt', () => {
      const result = evaluateDebtCreated({
        debt: { saldoDevedor: 800 } as any,
        userId: 'u1',
      });
      expect(result?.id).toBe('nexus-event-debt-created-small');
      expect(result?.priority).toBe('baixa');
    });

    it('returns null for tiny debt', () => {
      const result = evaluateDebtCreated({
        debt: { saldoDevedor: 300 } as any,
        userId: 'u1',
      });
      expect(result).toBeNull();
    });
  });

  describe('evaluateDebtUpdated', () => {
    it('returns null for small change', () => {
      const result = evaluateDebtUpdated({
        debtId: 'debt-1',
        userId: 'u1',
        previousDebt: { saldoDevedor: 5000 } as any,
        changes: { saldoDevedor: 5100 },
      });
      expect(result).toBeNull();
    });

    it('returns insight for significant reduction', () => {
      const result = evaluateDebtUpdated({
        debtId: 'debt-1',
        userId: 'u1',
        previousDebt: { saldoDevedor: 10000 } as any,
        changes: { saldoDevedor: 7000 },
      });
      expect(result?.id).toBe('nexus-event-debt-updated');
    });
  });

  describe('evaluateDebtAmortized', () => {
    it('returns celebration insight when debt reaches zero', () => {
      const result = evaluateDebtAmortized({
        debtId: 'debt-1',
        userId: 'u1',
        amount: 500,
        previousSaldo: 500,
        newSaldo: 0,
        previousParcelas: 1,
        newParcelas: 0,
      });
      expect(result?.id).toBe('nexus-event-debt-paid-off');
      expect(result?.priority).toBe('alta');
    });

    it('returns progress insight when > 50% paid', () => {
      const result = evaluateDebtAmortized({
        debtId: 'debt-1',
        userId: 'u1',
        amount: 3000,
        previousSaldo: 5000,
        newSaldo: 2000,
        previousParcelas: 5,
        newParcelas: 4,
      });
      expect(result?.id).toBe('nexus-event-debt-progress');
    });

    it('returns basic insight for significant amount', () => {
      const result = evaluateDebtAmortized({
        debtId: 'debt-1',
        userId: 'u1',
        amount: 800,
        previousSaldo: 5000,
        newSaldo: 4200,
        previousParcelas: 5,
        newParcelas: 4,
      });
      expect(result?.id).toBe('nexus-event-debt-amortized');
    });

    it('returns null for small amortization', () => {
      const result = evaluateDebtAmortized({
        debtId: 'debt-1',
        userId: 'u1',
        amount: 100,
        previousSaldo: 5000,
        newSaldo: 4900,
        previousParcelas: 5,
        newParcelas: 4,
      });
      expect(result).toBeNull();
    });
  });

  describe('evaluateDebtDeleted', () => {
    it('returns medium insight for large debt', () => {
      const result = evaluateDebtDeleted({
        debtId: 'debt-1',
        userId: 'u1',
        previousDebt: { saldoDevedor: 10000 } as any,
      });
      expect(result?.id).toBe('nexus-event-debt-deleted');
      expect(result?.priority).toBe('media');
    });

    it('returns low insight for small debt', () => {
      const result = evaluateDebtDeleted({
        debtId: 'debt-1',
        userId: 'u1',
        previousDebt: { saldoDevedor: 800 } as any,
      });
      expect(result?.id).toBe('nexus-event-debt-deleted-small');
      expect(result?.priority).toBe('baixa');
    });

    it('returns null for tiny debt deletion', () => {
      const result = evaluateDebtDeleted({
        debtId: 'debt-1',
        userId: 'u1',
        previousDebt: { saldoDevedor: 300 } as any,
      });
      expect(result).toBeNull();
    });
  });

  describe('evaluateCardInvoiceOverdue', () => {
    it('returns alta priority insight with convert_rotativo action', () => {
      const result = evaluateCardInvoiceOverdue({
        cardId: 'card-1',
        userId: 'u1',
        invoiceId: 'invoice-1',
        periodEnd: '2026-06-15',
        remainingAmount: 2500,
        dueDate: '2026-06-10',
        cardName: 'Nubank',
      });
      expect(result?.id).toBe('nexus-event-card-invoice-overdue');
      expect(result?.priority).toBe('alta');
      expect(result?.action?.type).toBe('convert_rotativo');
      expect(result?.action?.payload?.cardId).toBe('card-1');
      expect(result?.action?.payload?.remainingAmount).toBe(2500);
      expect(result?.action?.payload?.dueDate).toBe('2026-06-10');
      expect(result?.action?.payload?.cardName).toBe('Nubank');
    });

    it('includes deepLink to minhas-dividas', () => {
      const result = evaluateCardInvoiceOverdue({
        cardId: 'card-1',
        userId: 'u1',
        invoiceId: 'invoice-1',
        periodEnd: '2026-06-15',
        remainingAmount: 1000,
        dueDate: '2026-06-05',
        cardName: 'Inter',
      });
      expect(result?.deepLink).toBe('minhas-dividas');
    });
  });
});
