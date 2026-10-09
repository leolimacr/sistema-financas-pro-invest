import { describe, it, expect, vi, beforeEach } from 'vitest';
import { amortizeRotativoDebt } from '../rotativoService';
import type { DebtItem } from '../debt/debt.types';

const mockRunTransaction = vi.hoisted(() => vi.fn());

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    runTransaction: mockRunTransaction,
  };
});

const makeRotativoDebt = (overrides: Partial<DebtItem> = {}): DebtItem => ({
  id: 'debt-1',
  nome: 'Rotativo - Nubank - 2026-06',
  tipo: 'Rotativo cartão',
  saldoDevedor: 1500,
  taxaMensal: 14.9,
  parcelasRestantes: 1,
  valorParcela: 1500,
  dataVencimento: '2026-07-10',
  originType: 'rotativo_cartao',
  originCardId: 'card-1',
  originInvoiceId: 'inv-1',
  originInvoicePeriodEnd: '2026-06',
  totalParcelas: 1,
  parcelasPagas: 0,
  historicoPagamentos: [],
  ...overrides,
});

const mockTransaction = () => ({
  get: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
});

describe('amortizeRotativoDebt — guards', () => {
  beforeEach(() => {
    mockRunTransaction.mockReset();
  });

  it('rejects non-rotativo debt', async () => {
    const debt = makeRotativoDebt({ originType: 'manual' });
    const result = await amortizeRotativoDebt('user-1', debt);
    expect(result.success).toBe(false);
    expect(result.error).toContain('rotativa');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('rejects debt with saldoDevedor zero', async () => {
    const debt = makeRotativoDebt({ saldoDevedor: 0 });
    const result = await amortizeRotativoDebt('user-1', debt);
    expect(result.success).toBe(false);
    expect(result.error).toContain('zerado');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('rejects debt with negative saldoDevedor', async () => {
    const debt = makeRotativoDebt({ saldoDevedor: -100 });
    const result = await amortizeRotativoDebt('user-1', debt);
    expect(result.success).toBe(false);
    expect(result.error).toContain('zerado');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('rejects debt with taxaMensal zero', async () => {
    const debt = makeRotativoDebt({ taxaMensal: 0 });
    const result = await amortizeRotativoDebt('user-1', debt);
    expect(result.success).toBe(false);
    expect(result.error).toContain('zerada');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('rejects debt with negative taxaMensal', async () => {
    const debt = makeRotativoDebt({ taxaMensal: -5 });
    const result = await amortizeRotativoDebt('user-1', debt);
    expect(result.success).toBe(false);
    expect(result.error).toContain('zerada');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('rejects debt without id', async () => {
    const debt = makeRotativoDebt({ id: undefined });
    const result = await amortizeRotativoDebt('user-1', debt);
    expect(result.success).toBe(false);
    expect(result.error).toContain('sem ID');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });

  it('rejects debt when interest already applied this month', async () => {
    const now = new Date();
    const thisMonthIso = now.toISOString();
    const debt = makeRotativoDebt({ lastInterestAppliedAt: thisMonthIso });
    const result = await amortizeRotativoDebt('user-1', debt);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Juros já aplicados');
    expect(mockRunTransaction).not.toHaveBeenCalled();
  });
});

describe('amortizeRotativoDebt — transaction', () => {
  beforeEach(() => {
    mockRunTransaction.mockReset();
  });

  it('applies interest and updates saldoDevedor and lastInterestAppliedAt', async () => {
    const tx = mockTransaction();
    tx.get.mockResolvedValue({
      exists: true,
      data: () => ({ saldoDevedor: 1000, taxaMensal: 14.9 }),
    });
    mockRunTransaction.mockImplementation(async (_db, callback) => {
      await callback(tx);
    });

    const debt = makeRotativoDebt({ saldoDevedor: 1000, taxaMensal: 14.9 });
    const result = await amortizeRotativoDebt('user-1', debt);

    expect(result.success).toBe(true);
    expect(result.interest).toBe(149);
    expect(result.newSaldo).toBe(1149);
    expect(tx.get).toHaveBeenCalled();
    expect(tx.update).toHaveBeenCalledWith(expect.anything(), {
      saldoDevedor: 1149,
      lastInterestAppliedAt: expect.any(String),
    });
  });

  it('skips interest when currentSaldo is zero inside transaction', async () => {
    const tx = mockTransaction();
    tx.get.mockResolvedValue({
      exists: true,
      data: () => ({ saldoDevedor: 0, taxaMensal: 14.9 }),
    });
    mockRunTransaction.mockImplementation(async (_db, callback) => {
      await callback(tx);
    });

    const debt = makeRotativoDebt({ saldoDevedor: 1000, taxaMensal: 14.9 });
    const result = await amortizeRotativoDebt('user-1', debt);

    expect(result.success).toBe(true);
    expect(result.interest).toBe(0);
    expect(result.newSaldo).toBe(0);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('skips interest when currentTaxa is zero inside transaction', async () => {
    const tx = mockTransaction();
    tx.get.mockResolvedValue({
      exists: true,
      data: () => ({ saldoDevedor: 1000, taxaMensal: 0 }),
    });
    mockRunTransaction.mockImplementation(async (_db, callback) => {
      await callback(tx);
    });

    const debt = makeRotativoDebt({ saldoDevedor: 1000, taxaMensal: 14.9 });
    const result = await amortizeRotativoDebt('user-1', debt);

    expect(result.success).toBe(true);
    expect(result.interest).toBe(0);
    expect(result.newSaldo).toBe(0);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('throws when debt is not found in Firestore', async () => {
    const tx = mockTransaction();
    tx.get.mockResolvedValue({
      exists: false,
      data: () => ({}),
    });
    mockRunTransaction.mockImplementation(async (_db, callback) => {
      await callback(tx);
    });

    const debt = makeRotativoDebt();
    const result = await amortizeRotativoDebt('user-1', debt);

    expect(result.success).toBe(false);
    expect(result.error).toContain('não encontrada');
  });

  it('skips when lastInterestAppliedAt is set inside transaction (re-check)', async () => {
    const tx = mockTransaction();
    tx.get.mockResolvedValue({
      exists: true,
      data: () => ({ saldoDevedor: 1000, taxaMensal: 14.9, lastInterestAppliedAt: new Date().toISOString() }),
    });
    mockRunTransaction.mockImplementation(async (_db, callback) => {
      await callback(tx);
    });

    const debt = makeRotativoDebt({ saldoDevedor: 1000, taxaMensal: 14.9 });
    const result = await amortizeRotativoDebt('user-1', debt);

    expect(result.success).toBe(true);
    expect(result.interest).toBe(0);
    expect(result.newSaldo).toBe(0);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('reads latest saldo inside transaction (race protection)', async () => {
    const tx = mockTransaction();
    const getMock = vi.fn()
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ saldoDevedor: 500, taxaMensal: 10 }),
      });
    tx.get = getMock;
    mockRunTransaction.mockImplementation(async (_db, callback) => {
      await callback(tx);
    });

    const debt = makeRotativoDebt({ saldoDevedor: 500, taxaMensal: 10 });
    const result = await amortizeRotativoDebt('user-1', debt);

    expect(result.success).toBe(true);
    expect(result.interest).toBe(50);
    expect(result.newSaldo).toBe(550);
  });
});
