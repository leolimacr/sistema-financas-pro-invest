import { useEffect, useState, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { resolveAppRoute } from '../utils/deepLinkRouter';

export const TOOL_ROUTES: Record<string, string> = {
  central: '/app/central',
  home: '/app/central',
  dashboard: '/app/dashboard',
  manager: '/app/controla',
  controla: '/app/controla',
  despesas: '/app/controla',
  cartoes: '/app/controla',
  chat: '/app/ia',
  explorar: '/app/explorar',
  agenda: '/app/agenda',
  settings: '/app/mais',
  pricing: '/app/mais/pricing',
  'minhas-dividas': '/app/minhas-dividas',
  passivos: '/app/passivos',
  patrimonio: '/app/passivos',
  investimentos: '/app/investimentos',
  portfolio: '/app/carteira',
  metas: '/app/metas',
  login: '/login',
  register: '/register',
  termos: '/termos',
  privacidade: '/privacidade',
  download: '/download',
  'tool-fire': '/app/ferramentas/fire',
  'tool-juros': '/app/ferramentas/juros',
  'tool-inflacao': '/app/ferramentas/inflacao',
  'tool-alugar': '/app/ferramentas/alugar',
  'tool-dividas': '/app/ferramentas/dividas',
  'tool-dividendos': '/app/ferramentas/dividendos',
  'tool-buy-cash-or-installments': '/app/ferramentas/compra-avista-parcelado',
  'article-2026': '/artigos/investir-2026',
};

export const PUBLIC_TOOL_PATHS: Record<string, string> = {
  'tool-fire': '/ferramentas/fire',
  'tool-juros': '/ferramentas/juros',
  'tool-inflacao': '/ferramentas/inflacao',
  'tool-alugar': '/ferramentas/alugar',
  'tool-dividas': '/ferramentas/dividas',
  'tool-dividendos': '/ferramentas/dividendos',
  'tool-buy-cash-or-installments': '/ferramentas/compra-avista-parcelado',
};

export const useNavigation = () => {
  const isNative = Capacitor.isNativePlatform();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [homeKey, setHomeKey] = useState(0);
  const [navigationReady, setNavigationReady] = useState(!isNative);
  const [postAuthRedirect, setPostAuthRedirect] = useState<string | null>(null);

  const currentTool = useMemo(() => {
    // Condicionante 1: Enquanto navigationReady for false no Native, retorna 'home'
    if (isNative && !navigationReady) return 'home';

    const path = location.pathname;
    
    // Atalho para central (antes home)
    if (path === '/' || path === '/app/home' || path === '/app/central') return 'central';
    
    // Inverte o mapeamento TOOL_ROUTES para encontrar a chave a partir do path
    // Ordenamos por tamanho de string decrescente para evitar que '/app/mais' 
    // capture '/app/mais/pricing' indevidamente se usarmos startsWith simples
    const sortedEntries = Object.entries(TOOL_ROUTES).sort((a, b) => b[1].length - a[1].length);
    const entry = sortedEntries.find(([_, route]) => path.startsWith(route));
    
    if (entry) return entry[0];

    const publicEntry = Object.entries(PUBLIC_TOOL_PATHS).find(([_, route]) => path.startsWith(route));
    if (publicEntry) return publicEntry[0];

    // Fallback para rotas de curso
    if (path.includes('/curso')) return 'central';

    return 'central';
  }, [location.pathname, navigationReady, isNative]);

  const navigateTo = useCallback((tool: string, state?: any) => {
    const normalizedTool = tool === 'home' ? 'central' : tool;
    if (normalizedTool === 'central') setHomeKey(prev => prev + 1);
    
    let path = TOOL_ROUTES[normalizedTool] || resolveAppRoute(normalizedTool);
    if (!user && PUBLIC_TOOL_PATHS[normalizedTool]) {
      path = PUBLIC_TOOL_PATHS[normalizedTool];
    }
    
    window.scrollTo(0, 0);
    navigate(path, { state });

    // Persistência no Capacitor
    if (isNative && user?.uid) {
        const key = `app_home_${user.uid}`;
        Preferences.set({ key, value: 'central' });
    }
  }, [navigate, isNative, user]);

  const resetNavigation = useCallback(() => {
    setPostAuthRedirect(null);
    navigate('/');
  }, [navigate]);

  const shouldRememberAuthReturn = useCallback((targetTool: string) => {
    if (targetTool === 'login' || targetTool === 'register') {
      if (currentTool !== 'login' && currentTool !== 'register' && currentTool.startsWith('tool-')) {
        return true;
      }
    }
    return false;
  }, [currentTool]);

  const handleNavigate = useCallback((tool: string, state?: any) => {
    if (shouldRememberAuthReturn(tool)) {
      setPostAuthRedirect(currentTool);
    }

    // Se estiver em uma rota de curso e navegar para algo fora das rotas de curso,
    // o navigateTo já cuida de mudar o path.
    navigateTo(tool, state);
  }, [shouldRememberAuthReturn, currentTool, navigateTo]);

  const handleAuthSuccess = useCallback(() => {
    // 1. Verifica parâmetro ?redirect= na URL atual (ex: /login?redirect=/app/dashboard?origin=email_weekly_summary)
    const searchParams = new URLSearchParams(location.search);
    const redirectUrl = searchParams.get('redirect');
    if (redirectUrl) {
      window.scrollTo(0, 0);
      navigate(redirectUrl, { replace: true });
      return;
    }

    const destination = postAuthRedirect || 'home';
    setPostAuthRedirect(null);
    navigateTo(destination);
  }, [location.search, navigate, postAuthRedirect, navigateTo]);

  useEffect(() => {
    if (!isNative) {
      setNavigationReady(true);
      return;
    }

    let cancelled = false;

    const loadInitialTool = async () => {
      try {
        const key = user?.uid ? `app_home_${user.uid}` : 'app_home_guest';
        await Preferences.get({ key });

        if (!cancelled) {
          const initialTool = 'central';
          const initialPath = '/app/central';
          
          if (location.pathname === '/' || location.pathname === '/index.html') {
              navigate(initialPath, { replace: true });
          }
          
          setNavigationReady(true);
        }
      } catch {
        if (!cancelled) {
          setNavigationReady(true);
        }
      }
    };

    loadInitialTool();

    return () => {
      cancelled = true;
    };
  }, [isNative, user?.uid, navigate]);

  return { 
    currentTool, 
    homeKey, 
    navigateTo, 
    handleNavigate, 
    handleAuthSuccess, 
    resetNavigation, 
    navigationReady 
  };
};
