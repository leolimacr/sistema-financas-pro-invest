import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { queryKeys } from '../core/query/queryKeys';

interface DebtContextValue {
  debtBridgeReady: boolean;
  hasConnectedAtLeastOnce: boolean;
}

const DebtContext = createContext<DebtContextValue>({
  debtBridgeReady: false,
  hasConnectedAtLeastOnce: false,
});

export function DebtProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [debtBridgeReady, setDebtBridgeReady] = useState(false);
  const [hasConnectedAtLeastOnce, setHasConnectedAtLeastOnce] = useState(false);

  const key = queryKeys.debts.byUser(user?.uid || 'anonymous');

  // Seed from localStorage para cold start rápido
  const storageKey = useMemo(() => {
    if (!user?.uid) return null;
    const legacyKey = `fpi_debts_${user.uid}`;
    const currentKey = `financas-pro-invest_debts_${user.uid}`;
    try {
      const current = localStorage.getItem(currentKey);
      if (current) return currentKey;
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) {
        localStorage.setItem(currentKey, legacy);
        localStorage.removeItem(legacyKey);
        return currentKey;
      }
    } catch {}
    return currentKey;
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) {
      setDebtBridgeReady(false);
      return;
    }

    if (storageKey) {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.data && Date.now() - parsed.ts < 600_000) {
            queryClient.setQueryData(key, parsed.data);
            setDebtBridgeReady(true);
            setHasConnectedAtLeastOnce(true);
          }
        }
      } catch {}
    }
  }, [user?.uid, storageKey, queryClient, key]);

  // Reage quando o cache é populado por qualquer fonte (getDocs do useDebts)
  const { data } = useQuery({
    queryKey: key,
    queryFn: () => queryClient.getQueryData(key) ?? undefined,
    enabled: !!user?.uid,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (data !== undefined) {
      setDebtBridgeReady(true);
      setHasConnectedAtLeastOnce(true);
    }
  }, [data]);

  const value = useMemo<DebtContextValue>(
    () => ({ debtBridgeReady, hasConnectedAtLeastOnce }),
    [debtBridgeReady, hasConnectedAtLeastOnce],
  );

  return (
    <DebtContext.Provider value={value}>
      {children}
    </DebtContext.Provider>
  );
}

export const useDebtContext = () => useContext(DebtContext);
