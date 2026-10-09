import React, { createContext, useContext, useRef, useCallback, useState } from 'react';

interface PrefetchContextValue {
  ready: boolean;
  setReady: () => void;
}

const PrefetchContext = createContext<PrefetchContextValue>({
  ready: false,
  setReady: () => {},
});

export const PrefetchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);

  const handleSetReady = useCallback(() => {
    if (!readyRef.current) {
      readyRef.current = true;
      setReady(true);
    }
  }, []);

  return (
    <PrefetchContext.Provider value={{ ready, setReady: handleSetReady }}>
      {children}
    </PrefetchContext.Provider>
  );
};

export const usePrefetchReady = () => useContext(PrefetchContext);

export const AwaitPrefetchComplete: React.FC<{
  children: React.ReactNode;
  fallback: React.ReactNode;
}> = ({ children, fallback }) => {
  const { ready } = usePrefetchReady();
  if (!ready) return <>{fallback}</>;
  return <>{children}</>;
};
