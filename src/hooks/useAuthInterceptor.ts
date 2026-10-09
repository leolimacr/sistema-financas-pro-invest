import { useState, useCallback } from 'react';

/**
 * Hook Guardião para interceptar navegações protegidas em superfícies públicas.
 * Se o usuário não estiver autenticado, exibe o PreAuthModal em vez de redirecionar.
 */
export const useAuthInterceptor = (isAuthenticated: boolean, onNavigate: (route: string) => void) => {
  const [showPreAuth, setShowPreAuth] = useState(false);
  const [intendedRoute, setIntendedRoute] = useState<string | null>(null);

  const handleProtectedAction = useCallback((route: string) => {
    if (isAuthenticated || route === 'download') {
      onNavigate(route);
    } else {
      setIntendedRoute(route);
      setShowPreAuth(true);
    }
  }, [isAuthenticated, onNavigate]);

  const closePreAuth = useCallback(() => {
    setShowPreAuth(false);
    setIntendedRoute(null);
  }, []);

  const goToLogin = useCallback(() => {
    setShowPreAuth(false);
    // Idealmente aqui poderíamos passar o intendedRoute via state para o Login
    onNavigate('login');
  }, [onNavigate]);

  const goToRegister = useCallback(() => {
    setShowPreAuth(false);
    onNavigate('register');
  }, [onNavigate]);

  return {
    showPreAuth,
    intendedRoute,
    handleProtectedAction,
    closePreAuth,
    goToLogin,
    goToRegister,
  };
};
