import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildJurosRotativoId,
  prepareConversionRecord,
  prepareManualInterestRecord,
  prepareRevertMark,
  getAggregateByPeriod,
  getTotalInterestForDebt,
} from '../rotativoInterestHistory';

const mockGetDocs = vi.hoisted(() => vi.fn());

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getDocs: mockGetDocs,
    collection: vi.fn(() => 'mocked-collection'),
    doc: vi.fn((...args: any[]) => ({
      id: args[args.length - 1] as string,
      path: args.join('/'),
    })),
    query: vi.fn((...args: any[]) => args),
    where: vi.fn(() => 'where-clause'),
    orderBy: vi.fn(() => 'order-clause'),
    Timestamp: {
      now: vi.fn(() => ({ seconds: 123, nanoseconds: 456, toDate: () => new Date(), toMillis: () => 123000 })),
      fromDate: vi.fn((d: Date) => ({ seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 })),
    },
  };
});

// ─── Deterministic ID ─────────────────────────────────────────────

describe('buildJurosRotativoId', () => {
  it('produz ID determinístico com debtId + competence + source', () => {
    expect(buildJurosRotativoId('debt123', '2026-06', 'conversion')).toBe('debt123_2026-06_conversion');
  });

  it('produz ID para manual_interest', () => {
    expect(buildJurosRotativoId('debt456', '2026-07', 'manual_interest')).toBe('debt456_2026-07_manual_interest');
  });

  it('produz ID para scheduled_interest', () => {
    expect(buildJurosRotativoId('debt789', '2026-08', 'scheduled_interest')).toBe('debt789_2026-08_scheduled_interest');
  });
});

// ─── prepareConversionRecord ──────────────────────────────────────

describe('prepareConversionRecord', () => {
  const result = prepareConversionRecord('user1', {
    debtId: 'debt1',
    debtName: 'Rotativo - Nubank - 2026-06',
    competence: '2026-06',
    principal: 2500,
    taxaMensal: 14.9,
  });

  it('usa o doc ID determinístico', () => {
    expect(result.ref.id).toBe('debt1_2026-06_conversion');
  });

  it('monta o caminho correto do Firestore', () => {
    expect(result.ref.path).toContain('users/user1/jurosRotativos/debt1_2026-06_conversion');
  });

  it('monta os dados corretos', () => {
    expect(result.data).toMatchObject({
      debtId: 'debt1',
      debtName: 'Rotativo - Nubank - 2026-06',
      competence: '2026-06',
      source: 'conversion',
      principal: 2500,
      taxaMensal: 14.9,
      interestAmount: 0,
      newBalance: 2500,
      monthsLost: 0,
      reverted: false,
      revertedAt: null,
    });
    expect(result.data.appliedAt).toBeDefined();
  });
});

// ─── prepareManualInterestRecord ──────────────────────────────────

describe('prepareManualInterestRecord', () => {
  const result = prepareManualInterestRecord('user1', {
    debtId: 'debt1',
    debtName: 'Rotativo - Nubank - 2026-06',
    competence: '2026-06',
    principal: 2500,
    taxaMensal: 14.9,
    interestAmount: 372.5,
    newBalance: 2872.5,
    monthsLost: 1,
  });

  it('usa o doc ID determinístico', () => {
    expect(result.ref.id).toBe('debt1_2026-06_manual_interest');
  });

  it('monta os dados corretos', () => {
    expect(result.data).toMatchObject({
      debtId: 'debt1',
      competence: '2026-06',
      source: 'manual_interest',
      principal: 2500,
      interestAmount: 372.5,
      newBalance: 2872.5,
      monthsLost: 1,
      reverted: false,
      revertedAt: null,
    });
  });
});

// ─── prepareRevertMark ────────────────────────────────────────────

describe('prepareRevertMark', () => {
  const result = prepareRevertMark('user1', 'debt1', '2026-06');

  it('usa o doc ID da conversion', () => {
    expect(result.ref.id).toBe('debt1_2026-06_conversion');
  });

  it('marca como revertido com merge', () => {
    expect(result.data).toMatchObject({ reverted: true });
    expect(result.data.revertedAt).toBeDefined();
  });
});

// ─── Aggregate (mock getDocs) ─────────────────────────────────────

describe('getAggregateByPeriod', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('agrupa por competence e soma interestAmount', async () => {
    const mockDocs = [
      { id: 'd1_2026-06_conversion', data: () => ({ debtId: 'd1', competence: '2026-06', interestAmount: 0, source: 'conversion', reverted: false }) },
      { id: 'd1_2026-06_manual_interest', data: () => ({ debtId: 'd1', competence: '2026-06', interestAmount: 149, source: 'manual_interest', reverted: false }) },
      { id: 'd2_2026-06_scheduled_interest', data: () => ({ debtId: 'd2', competence: '2026-06', interestAmount: 200, source: 'scheduled_interest', reverted: false }) },
      { id: 'd1_2026-07_scheduled_interest', data: () => ({ debtId: 'd1', competence: '2026-07', interestAmount: 175.5, source: 'scheduled_interest', reverted: false }) },
    ];

    mockGetDocs.mockResolvedValueOnce({
      docs: mockDocs as any,
      empty: false,
      size: mockDocs.length,
    } as any);

    const result = await getAggregateByPeriod('user1', '2026-01', '2026-12');

    expect(result).toHaveLength(2);
    expect(result[0].competence).toBe('2026-06');
    expect(result[0].totalInterest).toBe(349);
    expect(result[0].debtCount).toBe(2);
    expect(result[1].competence).toBe('2026-07');
    expect(result[1].totalInterest).toBe(175.5);
    expect(result[1].debtCount).toBe(1);
  });

  it('exclui registros revertidos por padrão', async () => {
    const mockDocs = [
      { id: 'd1_2026-06_conversion', data: () => ({ debtId: 'd1', competence: '2026-06', interestAmount: 0, source: 'conversion', reverted: false }) },
      { id: 'd1_2026-06_scheduled_interest', data: () => ({ debtId: 'd1', competence: '2026-06', interestAmount: 100, source: 'scheduled_interest', reverted: true }) },
    ];

    mockGetDocs.mockResolvedValueOnce({
      docs: mockDocs as any,
      empty: false,
      size: mockDocs.length,
    } as any);

    const result = await getAggregateByPeriod('user1', '2026-01', '2026-12');

    expect(result).toHaveLength(1);
    expect(result[0].totalInterest).toBe(0);
  });

  it('retorna array vazio quando não há registros', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [],
      empty: true,
      size: 0,
    } as any);

    const result = await getAggregateByPeriod('user1', '2026-01', '2026-12');
    expect(result).toEqual([]);
  });
});

// ─── getTotalInterestForDebt (mock) ───────────────────────────────

describe('getTotalInterestForDebt', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('soma juros de todas as dívidas não revertidas', async () => {
    const mockDocs = [
      { data: () => ({ debtId: 'd1', interestAmount: 100, reverted: false }) },
      { data: () => ({ debtId: 'd1', interestAmount: 150, reverted: false }) },
      { data: () => ({ debtId: 'd2', interestAmount: 200, reverted: false }) },
    ];

    mockGetDocs.mockResolvedValueOnce({
      docs: mockDocs as any,
      empty: false,
      size: 3,
    } as any);

    const total = await getTotalInterestForDebt('user1', 'd1');
    expect(total).toBe(450);
  });
});
