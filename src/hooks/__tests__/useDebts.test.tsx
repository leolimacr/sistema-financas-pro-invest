import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const { getDocsMock, collectionMock } = vi.hoisted(() => ({
  getDocsMock: vi.fn<(...args: never[]) => Promise<unknown>>(),
  collectionMock: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', () => ({
  getDocs: getDocsMock,
  collection: collectionMock,
  Timestamp: class {
    toDate() {
      return new Date();
    }
  },
}));

vi.mock('../../firebase', () => ({ firestore: {} }));

import { useDebts } from '../useDebts';
import { queryKeys } from '../../core/query/queryKeys';
import { queryClient } from '../../core/query/queryClient';

const makeClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const wrapper = (client: QueryClient) => {
  const W = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  W.displayName = 'TQW';
  return W;
};

const debtDoc = (id: string, saldo: number) => ({
  id,
  data: () => ({ nome: `D${id}`, saldoDevedor: saldo, parcelasRestantes: 3 }),
});

describe('useDebts - leitor canônico', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    queryClient.clear();
  });

  it('cold start lista dívidas via getDocs real', async () => {
    getDocsMock.mockResolvedValue({ docs: [debtDoc('d1', 100), debtDoc('d2', 200)] });
    const client = makeClient();

    const { result } = renderHook(() => useDebts('u1'), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.debts).toHaveLength(2));
    expect(getDocsMock).toHaveBeenCalledTimes(1);
    expect(result.current.data).toHaveLength(2);
    expect(result.current.loading).toBe(false);
  });

  it('invalidação pós-mutação provoca refetch real (sem remount)', async () => {
    getDocsMock
      .mockResolvedValueOnce({ docs: [debtDoc('d1', 100)] })
      .mockResolvedValueOnce({ docs: [debtDoc('d1', 100), debtDoc('d2', 50)] });
    const client = makeClient();

    const { result } = renderHook(() => useDebts('u1'), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.debts).toHaveLength(1));

    await client.invalidateQueries({ queryKey: queryKeys.debts.byUser('u1') });
    await waitFor(() => expect(result.current.debts).toHaveLength(2));
    expect(getDocsMock).toHaveBeenCalledTimes(2);
  });

  it('expõe forma compatível com todos os consumidores (data/debts/loading)', async () => {
    getDocsMock.mockResolvedValue({ docs: [debtDoc('d1', 10)] });
    const client = makeClient();

    const { result } = renderHook(() => useDebts('u1'), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.debts).toHaveLength(1));

    expect(result.current.data).toEqual(result.current.debts);
    expect(result.current.loading).toBe(result.current.isLoading);
    expect(typeof result.current.isSyncing).toBe('boolean');
  });

  it('sem userId não busca e retorna vazio', () => {
    const client = makeClient();
    const { result } = renderHook(() => useDebts(undefined), { wrapper: wrapper(client) });

    expect(result.current.debts).toEqual([]);
    expect(getDocsMock).not.toHaveBeenCalled();
  });
});
