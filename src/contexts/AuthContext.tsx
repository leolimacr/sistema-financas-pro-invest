import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { auth, firestore } from '../firebase';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserMeta } from '../types';
import { DEMO_USER, DEMO_USER_META } from '../constants/demoDataset';

interface AuthContextType {
  user: User | null;
  userMeta: UserMeta | null;
  userMetaLoading: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  userMeta: null,
  userMetaLoading: true,
  isAuthenticated: false,
  loading: true,
  isDemoMode: false,
  enterDemoMode: () => {},
  exitDemoMode: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userMeta, setUserMeta] = useState<UserMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [userMetaLoading, setUserMetaLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && sessionStorage.getItem('fpi_demo_mode') === 'true';
    } catch {
      return false;
    }
  });

  const enterDemoMode = () => {
    try {
      sessionStorage.setItem('fpi_demo_mode', 'true');
    } catch {}
    setIsDemoMode(true);
  };

  const exitDemoMode = () => {
    try {
      sessionStorage.removeItem('fpi_demo_mode');
    } catch {}
    setIsDemoMode(false);
  };

  const unsubscribeMetaRef = useRef<(() => void) | null>(null);
  const userMetaTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearUserMetaTimeout = () => {
    if (userMetaTimeoutRef.current) {
      clearTimeout(userMetaTimeoutRef.current);
      userMetaTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      clearUserMetaTimeout();
      
      if (currentUser) {
        // [FINOPS] Único listener para o perfil do usuário
        if (unsubscribeMetaRef.current) unsubscribeMetaRef.current();
        setUserMeta(null);
        setUserMetaLoading(true);
        
        const userDocRef = doc(firestore, 'users', currentUser.uid);
        unsubscribeMetaRef.current = onSnapshot(userDocRef, (docSnap) => {
          clearUserMetaTimeout();
          if (docSnap.exists()) {
            setUserMeta({ uid: currentUser.uid, ...docSnap.data() } as UserMeta);
          } else {
            setUserMeta(null);
          }
          setUserMetaLoading(false);
        }, (error) => {
          console.error("Erro no listener de UserMeta:", error);
          clearUserMetaTimeout();
          setUserMeta(null);
          setUserMetaLoading(false);
        });

        userMetaTimeoutRef.current = setTimeout(() => {
          setUserMeta(null);
          setUserMetaLoading(false);
        }, 8000);
      } else {
        if (unsubscribeMetaRef.current) unsubscribeMetaRef.current();
        unsubscribeMetaRef.current = null;
        setUserMeta(null);
        setUserMetaLoading(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeMetaRef.current) unsubscribeMetaRef.current();
      clearUserMetaTimeout();
    };
  }, []);

  const logout = async () => {
    try {
      if (unsubscribeMetaRef.current) unsubscribeMetaRef.current();
      sessionStorage.removeItem('fpi_demo_mode');
      setIsDemoMode(false);
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const effectiveUser = isDemoMode && !user ? DEMO_USER : user;
  const effectiveUserMeta = isDemoMode && !user ? DEMO_USER_META : userMeta;
  const effectiveUserMetaLoading = isDemoMode && !user ? false : userMetaLoading;
  const effectiveIsAuthenticated = isDemoMode || !!user;
  const effectiveLoading = isDemoMode && !user ? false : loading;

  const value = useMemo(() => ({
    user: effectiveUser,
    userMeta: effectiveUserMeta,
    userMetaLoading: effectiveUserMetaLoading,
    isAuthenticated: effectiveIsAuthenticated,
    loading: effectiveLoading,
    isDemoMode,
    enterDemoMode,
    exitDemoMode,
    logout
  }), [
    effectiveUser,
    effectiveUserMeta,
    effectiveUserMetaLoading,
    effectiveIsAuthenticated,
    effectiveLoading,
    isDemoMode,
    logout
  ]);

  return (
    <AuthContext.Provider value={value}>
      {!effectiveLoading && children}
    </AuthContext.Provider>
  );
};
