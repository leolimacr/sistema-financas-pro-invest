import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDocs, collection } from 'firebase/firestore';
import { firestore } from '../firebase';
import { queryKeys } from '../core/query/queryKeys';
import type { DebtItem } from '../services/debt/debt.types';
import { mapDebtFromFirestore } from '../services/debt/debt.mapper';

/**
 * Fonte única para leitura de dívidas.
 * getDocs real no mount (não depende de bridge órfã).
 * staleTime 5min — invalidações pós-mutação causam refetch real.
 * localStorage hidrata cold start; useMemo estabiliza referência.
 */
export const useDebts = (userId: string | undefined) => {
  const key = queryKeys.debts.byUser(userId || 'anonymous');

  // --- localStorage hydration (cold start rápido) ---
  const cachedRaw = typeof window !== 'undefined'
    ? (() => {
        const newKey = `financas-pro-invest_debts_${userId}`;
        const legacyKey = `fpi_debts_${userId}`;
        try {
          const fromNew = localStorage.getItem(newKey);
          if (fromNew) return fromNew;
          const fromLegacy = localStorage.getItem(legacyKey);
          if (fromLegacy) {
            try { localStorage.setItem(newKey, fromLegacy); localStorage.removeItem(legacyKey); } catch {}
            return fromLegacy;
          }
        } catch {}
        return null;
      })()
    : null;

  const cachedData = cachedRaw
    ? (() => {
        try {
          const p = JSON.parse(cachedRaw);
          return Date.now() - p.ts < 86_400_000 ? p.data as DebtItem[] : undefined;
        } catch { return undefined; }
      })()
    : undefined;

  // --- Query com getDocs real ---
  const { data: rawDebts = [], isLoading, error, isFetching } = useQuery<DebtItem[], Error>({
    queryKey: key,
    queryFn: async () => {
      if (!userId) return [];
      if (userId === 'demo-sandbox-soberano') {
        const { DEMO_DEBTS } = await import('../constants/demoDataset');
        return DEMO_DEBTS;
      }
      const snapshot = await getDocs(collection(firestore, 'users', userId, 'dividas'));
      const debts = snapshot.docs.map(doc => mapDebtFromFirestore(doc.id, doc.data()));
      // Atualizar cache localStorage (TTL 24h)
      try {
        localStorage.setItem(`financas-pro-invest_debts_${userId}`, JSON.stringify({ data: debts, ts: Date.now() }));
      } catch {}
      return debts;
    },
    placeholderData: cachedData,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // --- Referência estável (id + saldo) ---
  const prevDebtsRef = useRef<DebtItem[]>([]);
  const debts = useMemo(() => {
    const next = rawDebts || [];
    const prev = prevDebtsRef.current;
    if (next.length !== prev.length || !next.every((d, i) => d.id === prev[i]?.id && d.saldoDevedor === prev[i]?.saldoDevedor)) {
      prevDebtsRef.current = next;
      return next;
    }
    return prev;
  }, [rawDebts]);

  const isSyncing = isFetching && !isLoading;

  return {
    data: debts,  // Alias para compatibilidade
    debts,        // Consumidores novos devem usar este
    isLoading,
    loading: isLoading, // Alias (PublicHome consome `loading`)
    isSyncing,
    isFetching,
    error: error?.message || null,
  };
};
