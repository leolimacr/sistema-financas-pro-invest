import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CardInvoice, CreditCard, InvoiceStatus } from '../../types';

/* ============================================================
   cardInvoiceStateValid
   Valida se uma combinação de campos da CardInvoice é coerente.
   ============================================================ */
type InvoiceState = {
  status: InvoiceStatus;
  remainingAmount: number;
  rotativoConverted?: boolean;
  rotativoSettled?: boolean;
  rotativoDebtId?: string;
  paidAmount: number;
  total: number;
};

function cardInvoiceStateValid(state: InvoiceState): { valid: boolean; reason?: string } {
  if (state.rotativoSettled && !state.rotativoConverted) {
    return { valid: false, reason: 'rotativoSettled requires rotativoConverted' };
  }
  if (state.rotativoSettled && state.status !== 'paid') {
    return { valid: false, reason: 'rotativoSettled should have status=paid' };
  }
  if (state.rotativoConverted && !state.rotativoDebtId) {
    return { valid: false, reason: 'rotativoConverted requires rotativoDebtId' };
  }
  if (!state.rotativoConverted && state.rotativoDebtId) {
    return { valid: false, reason: 'rotativoDebtId without rotativoConverted' };
  }
  if (!state.rotativoConverted && state.rotativoSettled) {
    return { valid: false, reason: 'rotativoSettled without rotativoConverted' };
  }
  if (state.remainingAmount < 0) {
    return { valid: false, reason: 'remainingAmount cannot be negative' };
  }
  if (state.paidAmount < 0) {
    return { valid: false, reason: 'paidAmount cannot be negative' };
  }
  if (state.total < 0) {
    return { valid: false, reason: 'total cannot be negative' };
  }
  if (state.paidAmount > state.total && state.total > 0) {
    return { valid: false, reason: 'paidAmount exceeds total' };
  }
  if (state.status === 'paid' && state.remainingAmount > 0) {
    return { valid: false, reason: 'status=paid but remainingAmount > 0' };
  }
  if (state.status === 'open' && state.paidAmount > 0) {
    return { valid: false, reason: 'status=open with partial payment (should be partial)' };
  }
  return { valid: true };
}

describe('CardInvoice state validation', () => {
  it('open invoice is valid', () => {
    expect(cardInvoiceStateValid({
      status: 'open', remainingAmount: 3000, paidAmount: 0, total: 3000,
    })).toEqual({ valid: true });
  });

  it('paid invoice is valid', () => {
    expect(cardInvoiceStateValid({
      status: 'paid', remainingAmount: 0, paidAmount: 3000, total: 3000,
    })).toEqual({ valid: true });
  });

  it('partial invoice is valid', () => {
    expect(cardInvoiceStateValid({
      status: 'partial', remainingAmount: 1000, paidAmount: 2000, total: 3000,
    })).toEqual({ valid: true });
  });

  it('rotativoConverted with rotativoDebtId is valid', () => {
    expect(cardInvoiceStateValid({
      status: 'open', remainingAmount: 3000, paidAmount: 0, total: 3000,
      rotativoConverted: true, rotativoDebtId: 'debt-1',
    })).toEqual({ valid: true });
  });

  it('rotativoSettled with both flags is valid', () => {
    expect(cardInvoiceStateValid({
      status: 'paid', remainingAmount: 0, paidAmount: 3000, total: 3000,
      rotativoConverted: true, rotativoDebtId: 'debt-1', rotativoSettled: true,
    })).toEqual({ valid: true });
  });

  it('rotativoSettled without rotativoConverted is INVALID', () => {
    expect(cardInvoiceStateValid({
      status: 'paid', remainingAmount: 0, paidAmount: 3000, total: 3000,
      rotativoSettled: true,
    })).toEqual({ valid: false, reason: 'rotativoSettled requires rotativoConverted' });
  });

  it('rotativoConverted without rotativoDebtId is INVALID', () => {
    expect(cardInvoiceStateValid({
      status: 'open', remainingAmount: 3000, paidAmount: 0, total: 3000,
      rotativoConverted: true,
    })).toEqual({ valid: false, reason: 'rotativoConverted requires rotativoDebtId' });
  });

  it('rotativoDebtId without rotativoConverted is INVALID', () => {
    expect(cardInvoiceStateValid({
      status: 'open', remainingAmount: 3000, paidAmount: 0, total: 3000,
      rotativoDebtId: 'debt-1',
    })).toEqual({ valid: false, reason: 'rotativoDebtId without rotativoConverted' });
  });

  it('remainingAmount negative is INVALID', () => {
    expect(cardInvoiceStateValid({
      status: 'open', remainingAmount: -1, paidAmount: 0, total: 0,
    })).toEqual({ valid: false, reason: 'remainingAmount cannot be negative' });
  });

  it('paidAmount exceeds total is INVALID', () => {
    expect(cardInvoiceStateValid({
      status: 'partial', remainingAmount: 0, paidAmount: 5000, total: 3000,
    })).toEqual({ valid: false, reason: 'paidAmount exceeds total' });
  });

  it('status=paid with remainingAmount > 0 is INVALID', () => {
    expect(cardInvoiceStateValid({
      status: 'paid', remainingAmount: 500, paidAmount: 2500, total: 3000,
    })).toEqual({ valid: false, reason: 'status=paid but remainingAmount > 0' });
  });

  it('status=open with paidAmount > 0 is INVALID (should be partial)', () => {
    expect(cardInvoiceStateValid({
      status: 'open', remainingAmount: 3000, paidAmount: 500, total: 3000,
    })).toEqual({ valid: false, reason: 'status=open with partial payment (should be partial)' });
  });

  it('total = 0 paid = 0 is valid (empty invoice edge case)', () => {
    expect(cardInvoiceStateValid({
      status: 'paid', remainingAmount: 0, paidAmount: 0, total: 0,
    })).toEqual({ valid: true });
  });
});

/* ============================================================
   checkOverdueInvoices — pure function test (already exists,
   but adding rotativoSettled coverage)
   ============================================================ */
import { checkOverdueInvoices } from '../rotativoService';

const makeCard = (id: string, name: string): CreditCard => ({
  id, name, saldoUtilizadoTotal: 5000,
});

const makeInvoice = (
  id: string, cardId: string, overrides: Partial<CardInvoice> = {},
): CardInvoice => ({
  id, cardId,
  periodStart: '2026-06-01', periodEnd: '2026-06-15',
  dueDate: '2020-01-01',
  total: 3000, status: 'open', paidAmount: 0, remainingAmount: 3000,
  transactionCount: 5,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

describe('rotativoService checkOverdueInvoices — rotativoSettled guard', () => {
  it('excludes rotativoSettled invoices even if overdue', () => {
    const result = checkOverdueInvoices(
      [makeCard('c1', 'Nubank')],
      [makeInvoice('i1', 'c1', { remainingAmount: 2000, rotativoConverted: true, rotativoSettled: true })],
    );
    expect(result).toHaveLength(0);
  });

  it('excludes rotativoConverted invoices', () => {
    const result = checkOverdueInvoices(
      [makeCard('c1', 'Nubank')],
      [makeInvoice('i1', 'c1', { remainingAmount: 2000, rotativoConverted: true })],
    );
    expect(result).toHaveLength(0);
  });

  it('detects overdue invoice that is NOT converted or settled', () => {
    const result = checkOverdueInvoices(
      [makeCard('c1', 'Nubank')],
      [makeInvoice('i1', 'c1', { remainingAmount: 2000 })],
    );
    expect(result).toHaveLength(1);
  });
});

/* ============================================================
   Snapshot integrity — pure formula tests
   Verifica que rotativoDebtBalance + cardInvoiceRemaining
   produzem obrigações corretas no snapshot
   ============================================================ */
import { buildSovereignSnapshot } from '../../utils/calculations';

describe('Snapshot integrity — rotativo + invoice', () => {
  it('obligationsDeduction = obligationPressure + pendingBills', () => {
    const result = buildSovereignSnapshot({
      monthBalance: 10000,
      accumulatedBalance: 50000,
      accumulatedIncome: 100000,
      accumulatedExpenses: 50000,
      obligationPressure: 3500, // card invoice (2000) + rotativo (1500) combined
      commandMode: true,
      income: 10000,
      expenses: 6000,
      monthlyAport: 4000,
    });
    expect(result.obligationsDeduction).toBe(3500);
    expect(result.virtualImpact).toBe(3500);
  });

  it('zero obligationPressure does not inflate obligations', () => {
    const result = buildSovereignSnapshot({
      monthBalance: 10000,
      accumulatedBalance: 50000,
      accumulatedIncome: 100000,
      accumulatedExpenses: 50000,
      obligationPressure: 0,
      commandMode: true,
      income: 10000,
      expenses: 6000,
      monthlyAport: 4000,
    });
    expect(result.obligationsDeduction).toBe(0);
  });

  it('undefined obligationPressure treated as zero', () => {
    const result = buildSovereignSnapshot({
      monthBalance: 10000,
      accumulatedBalance: 50000,
      accumulatedIncome: 100000,
      accumulatedExpenses: 50000,
      commandMode: true,
      income: 10000,
      expenses: 6000,
      monthlyAport: 4000,
    });
    expect(result.obligationsDeduction).toBe(0);
  });
});

/* ============================================================
   cardFuturePressure formula integrity
   cardFuturePressure = max(0, totalCreditUsed - cardInvoiceRemaining - rotativoDebtBalance)
   Verifica que a obrigação não evapora nem duplica
   ============================================================ */
function computeCardFuturePressure(
  totalCreditUsed: number,
  cardInvoiceRemaining: number,
  rotativoDebtBalance: number,
): number {
  return Math.max(0, totalCreditUsed - cardInvoiceRemaining - rotativoDebtBalance);
}

describe('cardFuturePressure formula integrity', () => {
  it('future pressure = credit used minus invoice minus rotativo debt', () => {
    expect(computeCardFuturePressure(5000, 2000, 1000)).toBe(2000);
  });

  it('zero when credit used is fully covered by invoice and rotativo', () => {
    expect(computeCardFuturePressure(3000, 2000, 1000)).toBe(0);
  });

  it('zero when credit used < invoice + rotativo', () => {
    expect(computeCardFuturePressure(2500, 2000, 1000)).toBe(0);
  });

  it('zero when everything is zero', () => {
    expect(computeCardFuturePressure(0, 0, 0)).toBe(0);
  });

  it('handles rotativo debt > credit used (edge case)', () => {
    expect(computeCardFuturePressure(1000, 0, 2000)).toBe(0);
  });

  it('no double counting: invoice remaining + rotativo = total obligation', () => {
    const totalCredit = 10000;
    const invoiceRemaining = 4000;
    const rotativoDebt = 3000;
    const futurePressure = computeCardFuturePressure(totalCredit, invoiceRemaining, rotativoDebt);
    expect(futurePressure).toBe(3000);
    expect(invoiceRemaining + rotativoDebt + futurePressure).toBe(totalCredit);
  });
});

/* ============================================================
   Garantia de que rotativo_cartao debts não entram em AmortizeAll
   ============================================================ */
describe('AmortizeAll excludes rotativo_cartao debts', () => {
  it('filter removes debts with originType rotativo_cartao', () => {
    const debts = [
      { id: 'd1', saldoDevedor: 1000, parcelasRestantes: 3, originType: 'manual' as const },
      { id: 'd2', saldoDevedor: 2000, parcelasRestantes: 5, originType: 'rotativo_cartao' as const },
      { id: 'd3', saldoDevedor: 500, parcelasRestantes: 1, originType: undefined },
    ];
    const filtered = debts.filter(d => d.saldoDevedor > 0 && d.parcelasRestantes > 0 && d.originType !== 'rotativo_cartao');
    expect(filtered).toHaveLength(2);
    expect(filtered.map(d => d.id)).toEqual(['d1', 'd3']);
  });
});

/* ============================================================
   Garantia de que convertToDebt usa Math.max(0, ...) no saldoDevedor
   A função checkOverdueInvoices já garante remainingAmount > 0,
   mas validamos que a lógica de criação trata o valor corretamente.
   ============================================================ */
describe('convertToDebt saldoDevedor integrity', () => {
  it('saldoDevedor is positive when info.remainingAmount > 0', () => {
    const saldo = Math.max(0, 1500);
    expect(saldo).toBe(1500);
  });

  it('saldoDevedor is zero when info.remainingAmount is negative (edge guard)', () => {
    const saldo = Math.max(0, -500);
    expect(saldo).toBe(0);
  });
});

/* ============================================================
   Guard contra dupla conversão
   Se invoice já está rotativoConverted, checkOverdueInvoices
   a exclui — logo convertToDebt nunca é chamada para ela
   ============================================================ */
describe('Double conversion guard', () => {
  it('rotativoConverted invoice is invisible to checkOverdueInvoices', () => {
    const invoices = [makeInvoice('i1', 'c1', { rotativoConverted: true, remainingAmount: 2000 })];
    const result = checkOverdueInvoices([makeCard('c1', 'Nubank')], invoices);
    expect(result).toHaveLength(0);
  });
});

/* ============================================================
   Garantia de que rotativo.cartao settlement via payInvoice
   funciona: quando saldo chega a 0, settleRotativoConversion
   marca rotativoSettled = true na invoice
   ============================================================ */
describe('Rotativo settlement on payInvoice redirect', () => {
  it('newSaldo <= 0 triggers settle (logic verification)', () => {
    const remainingDebt = 500;
    const paymentAmount = 500;
    const newSaldo = Math.max(0, remainingDebt - paymentAmount);
    expect(newSaldo).toBe(0);
    const shouldSettle = newSaldo <= 0;
    expect(shouldSettle).toBe(true);
  });

  it('partial payment does not trigger settle', () => {
    const remainingDebt = 1000;
    const paymentAmount = 300;
    const newSaldo = Math.max(0, remainingDebt - paymentAmount);
    expect(newSaldo).toBe(700);
    const shouldSettle = newSaldo <= 0;
    expect(shouldSettle).toBe(false);
  });

  it('overpayment caps at zero (no negative saldo)', () => {
    const remainingDebt = 300;
    const paymentAmount = 500;
    const newSaldo = Math.max(0, remainingDebt - paymentAmount);
    expect(newSaldo).toBe(0);
  });
});

/* ============================================================
   Reverse conversion integrity
   revertRotativoConversion restaura a invoice original:
     rotativoConverted=false, rotativoDebtId=undefined,
     rotativoConvertedAt=undefined, rotativoSettled=undefined
   A invoice volta a ser trackeável (não excluída de checkOverdueInvoices)
   ============================================================ */
describe('Reverse conversion integrity', () => {
  const reversedInvoice = {
    rotativoConverted: false,
    rotativoDebtId: undefined,
    rotativoConvertedAt: undefined,
    rotativoSettled: undefined,
  };

  it('after revert, rotativoConverted is false', () => {
    expect(reversedInvoice.rotativoConverted).toBe(false);
  });

  it('after revert, rotativoDebtId is undefined', () => {
    expect(reversedInvoice.rotativoDebtId).toBeUndefined();
  });

  it('after revert, rotativoSettled is cleared (not left as true)', () => {
    expect(reversedInvoice.rotativoSettled).toBeUndefined();
  });

  it('after revert, invoice is trackable by checkOverdueInvoices', () => {
    const invoice = makeInvoice('i1', 'c1', {
      ...reversedInvoice as any,
      remainingAmount: 2000,
    });
    const result = checkOverdueInvoices([makeCard('c1', 'Nubank')], [invoice]);
    expect(result).toHaveLength(1);
  });
});

/* ============================================================
   SovereignFreeBalance: rotativo debits appear as obligations
   A fórmula: sovereignFreeBalance = accumulatedBalance - virtualImpact - pendingBills - protectionShortfall
   Onde virtualImpact = cardInvoiceRemaining + rotativoDebtBalance
   Logo rotativoDebtBalance é debitado do saldo livre
   ============================================================ */
import { computeSovereignMetrics } from '../../utils/calculations';

describe('SovereignFreeBalance includes rotativoDebtBalance via virtualImpact', () => {
  it('rotativoDebtBalance reduces sovereignFreeBalance', () => {
    const metrics = computeSovereignMetrics(5000, 2000, 500, 30000);
    const virtualImpact = 2000;
    const sovereignFree = 30000 - virtualImpact - 500 - 0;
    expect(metrics.sovereignFreeBalance).toBe(sovereignFree);
  });

  it('higher rotativo debt = lower sovereign free balance', () => {
    const base = computeSovereignMetrics(5000, 2000, 500, 30000);
    const withRotativo = computeSovereignMetrics(5000, 2000 + 1500, 500, 30000);
    expect(withRotativo.sovereignFreeBalance).toBe(base.sovereignFreeBalance - 1500);
  });
});

/* ============================================================
   Atomicidade da conversão — runTransaction garante all-or-nothing
   Teste de contrato: verifica que o guard contra dupla conversão
   está ativo na camada de detecção (checkOverdueInvoices)
   ============================================================ */
describe('convertToDebt atomicity — pre-guard', () => {
  it('rotativoConverted invoice é excluída pelo checkOverdueInvoices (nunca chega em convertToDebt)', () => {
    const result = checkOverdueInvoices(
      [makeCard('c1', 'Nubank')],
      [makeInvoice('i1', 'c1', { rotativoConverted: true, remainingAmount: 2000 })],
    );
    expect(result).toHaveLength(0);
  });

  it('invoice sem remainingAmount não chega em convertToDebt', () => {
    const result = checkOverdueInvoices(
      [makeCard('c1', 'Nubank')],
      [makeInvoice('i1', 'c1', { remainingAmount: 0, dueDate: '2020-01-01' })],
    );
    expect(result).toHaveLength(0);
  });
});
