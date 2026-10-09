import React, { createContext, useContext, useEffect, useRef, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { createTransactionsRealtimeBridge } from '../services/transaction.realtime';

function migrateLocalStorageKey(uid: string): string {
  const legacyKey = `fpi_tx_${uid}`;
  const currentKey = `financas-pro-invest_tx_${uid}`;
  try {
    const current = localStorage.getItem(currentKey);
    if (current) return currentKey;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy) {
      localStorage.setItem(currentKey, legacy);
      localStorage.removeItem(legacyKey);
    }
  } catch {}
  return currentKey;
}

interface TransactionsContextValue {
  bridgeReady: boolean;
  hasConnectedAtLeastOnce: boolean;
}

const TransactionsContext = createContext<TransactionsContextValue>({
  bridgeReady: false,
  hasConnectedAtLeastOnce: false,
});

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const hasCachedData = (() => {
    if (!user?.uid) return false;
    try {
      const raw = localStorage.getItem(`financas-pro-invest_tx_${user.uid}`);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Date.now() - parsed.ts < 600_000;
    } catch { return false; }
  })();

  const [bridgeReady, setBridgeReady] = useState(hasCachedData);
  const [hasConnectedAtLeastOnce, setHasConnectedAtLeastOnce] = useState(false);

  useEffect(() => {
    if (!user?.uid) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      setBridgeReady(false);
      return;
    }

    const storageKey = migrateLocalStorageKey(user.uid);

    const bridge = createTransactionsRealtimeBridge(user.uid);
    unsubscribeRef.current = bridge.subscribe((data: any) => {
      setBridgeReady(true);
      setHasConnectedAtLeastOnce(true);
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ data, ts: Date.now() })
        );
      } catch {}
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [user?.uid, queryClient]);

  return (
    <TransactionsContext.Provider value={useMemo(() => ({ bridgeReady, hasConnectedAtLeastOnce }), [bridgeReady, hasConnectedAtLeastOnce])}>
      {children}
    </TransactionsContext.Provider>
  );
}

export const useTransactionsContext = () => useContext(TransactionsContext);
