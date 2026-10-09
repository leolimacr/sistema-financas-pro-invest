import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

interface FinanceContextValue {
  financeBridgeReady: boolean;
  hasConnectedAtLeastOnce: boolean;
}

const FinanceContext = createContext<FinanceContextValue>({
  financeBridgeReady: false,
  hasConnectedAtLeastOnce: false,
});

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const value = useMemo<FinanceContextValue>(() => ({
    financeBridgeReady: !!user?.uid,
    hasConnectedAtLeastOnce: !!user?.uid,
  }), [user?.uid]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinanceContext = () => useContext(FinanceContext);
