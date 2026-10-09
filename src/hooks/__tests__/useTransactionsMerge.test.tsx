import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

interface SeedTx {
  id: string;
  type: 'expense';
  date: string;
  description: string;
  category: string;
  amount: number;
  paymentMethod: 'money';
  sortKey: string;
}

const seed: SeedTx[] = [];
{
  const now = new Date();
  for (let m = 2; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    for (let i = 0; i < 50; i++) {
      const day = String((i % 28) + 1).padStart(2, '0');
      const id = `t-${y}-${mo}-${i}`;
      seed.push({
        id,
        type: 'expense',
        date: `${y}-${mo}-${day}`,
        description: `Tx ${id}`,
        category: 'Casa',
        amount: 10 + i,
        paymentMethod: 'money',
        sortKey: `${y}${mo}${day}_0000000000000_${id}`,
      });
    }
  }
}

// ---- mocks firebase/database ----
vi.mock('firebase/database', () => {
  const mark = (k: string, v?: unknown) => ({ __k: k, __v: v });
  return {
    ref: (_db: unknown, path: string) => ({ __path: path }),
    query: (r: unknown, ...c: unknown[]) => ({ __ref: r, __c: c }),
    orderByChild: (k: string) => mark('orderByChild', k),
    limitToLast: (n: number) => mark('limitToLast', n),
    startAt: (v: unknown) => mark('startAt', v),
    endAt: (v: unknown) => mark('endAt', v),
    endBefore: (v: unknown) => mark('endBefore', v),
    push: vi.fn(() => ({ key: 'new-id' })),
    set: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    get: (q: { __ref?: unknown; __c?: { __k: string; __v: unknown }[] } & Record<string, unknown>) => {
      const cs = (q.__c ?? []) as { __k: string; __v: unknown }[];
      const start = cs.find(c => c.__k === 'startAt')?.__v as string | undefined;
      const end = cs.find(c => c.__k === 'endAt')?.__v as string | undefined;
      let list = [...seed];
      if (start && end) {
        const mk = (start as string).slice(0, 7);
        list = list.filter(t => t.date.slice(0, 7) === mk);
      }
      return Promise.resolve({
        exists: () => list.length > 0,
        forEach: (cb: (c: { key: string; val: () => SeedTx }) => void) => {
          list.forEach(t => cb({ key: t.id, val: () => t }));
        },
      });
    },
  };
});

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../firebase', () => ({ db: {}, firestore: {} }));
vi.mock('../useTransactionsContext', () => ({
  useTransactionsContext: () => ({ bridgeReady: true, hasConnectedAtLeastOnce: true }),
}));
vi.mock('../useEntitlement', () => ({ useEntitlement: () => ({ effectiveTier: 'pro' }) }));
vi.mock('../useDebts', () => ({ useDebts: () => ({ debts: [] }) }));
vi.mock('../useCards', () => ({ useCards: () => ({ cards: [] }) }));

import { useTransactions } from '../useTransactions';

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper = (client: QueryClient) => {
  const W = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  W.displayName = 'TQW2';
  return W;
};

const monthKeyOf = (dateStr: string) => {
  const [y, m] = dateStr.split('-').map(Number);
  return { y, m };
};

describe('useTransactions - fusão bridge/fetchMonth sem perda nem duplicação (150 txns, 3 meses)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('monta 150 únicos; navega entre meses; reedita antiga; sem duplicar', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useTransactions('u1'), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.transactions.length).toBe(150));
    expect(new Set(result.current.transactions.map(t => t.id)).size).toBe(150);

    const months = [...new Set(seed.map(t => t.date.slice(0, 7)))];
    expect(months).toHaveLength(3);

    // Navegação entre meses (ida e volta), 2× cada — sem duplicação
    for (const mk of months) {
      const { y, m } = monthKeyOf(mk + '-01');
      await act(async () => { await result.current.fetchMonth(y, m); });
      await act(async () => { await result.current.fetchMonth(y, m); });
    }
    expect(result.current.transactions.length).toBe(150);
    expect(new Set(result.current.transactions.map(t => t.id)).size).toBe(150);

    // Edição de transação antiga (fora do mês corrente)
    const oldest = [...seed].sort((a, b) => a.date.localeCompare(b.date))[0];
    await act(async () => {
      await result.current.saveLancamento({ ...oldest, amount: 777 });
    });

    const ids = result.current.transactions.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain(oldest.id);
  }, 30000);
});
