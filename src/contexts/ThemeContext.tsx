import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Preferences } from '@capacitor/preferences';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const THEME_STORAGE_KEY = 'fpi_theme';

/**
 * Retorna o tema do sistema operacional usando matchMedia.
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Lê o tema inicial de forma síncrona a partir do localStorage.
 * Retorna 'system' caso não haja preferência salva ou o valor seja inválido.
 */
export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'system';
  }
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // Falha silenciosa em caso de armazenamento bloqueado ou indisponível
  }
  return 'system';
}

/**
 * Aplica a classe CSS 'dark' e o color-scheme na raiz do documento HTML.
 */
export function applyThemeToDom(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  try {
    const root = document.documentElement;
    if (resolved === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  } catch {
    // Falha silenciosa
  }
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(getInitialTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Escuta mudanças dinâmicas no sistema operacional caso o modo 'system' esteja ativo
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else if ('addListener' in mediaQuery) {
      // Fallback para Safari < 14
      (mediaQuery as any).addListener(handleChange);
      return () => (mediaQuery as any).removeListener(handleChange);
    }
  }, []);

  // Calcula o tema resolvido
  const resolvedTheme: ResolvedTheme = useMemo(() => {
    return theme === 'system' ? systemTheme : theme;
  }, [theme, systemTheme]);

  // Aplica o tema na árvore do DOM sempre que resolvedTheme mudar
  useEffect(() => {
    applyThemeToDom(resolvedTheme);
  }, [resolvedTheme]);

  // Contingência nativa: se localStorage estiver ausente, tenta recuperar assincronamente de Preferences
  useEffect(() => {
    let isMounted = true;
    async function recoverFromCapacitorPreferences() {
      try {
        let hasLocal = false;
        try {
          hasLocal = localStorage.getItem(THEME_STORAGE_KEY) !== null;
        } catch {
          hasLocal = false;
        }

        // Se localStorage não tiver valor registrado, consulta o Capacitor Preferences
        if (!hasLocal) {
          const { value } = await Preferences.get({ key: THEME_STORAGE_KEY });
          if (!isMounted) return;

          // Re-inspeciona localStorage para garantir que uma escolha explícita do usuário feita enquanto a leitura nativa estava pendente não seja sobrescrita
          let userMadeChoice = false;
          try {
            userMadeChoice = localStorage.getItem(THEME_STORAGE_KEY) !== null;
          } catch {
            userMadeChoice = false;
          }

          if (!userMadeChoice && (value === 'light' || value === 'dark' || value === 'system')) {
            setThemeState(value);
            try {
              localStorage.setItem(THEME_STORAGE_KEY, value);
            } catch {
              // Silencioso
            }
          }
        }
      } catch {
        // Silencioso em caso de falha no plugin nativo
      }
    }

    recoverFromCapacitorPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    const validTheme: ThemeMode =
      newTheme === 'light' || newTheme === 'dark' || newTheme === 'system'
        ? newTheme
        : 'system';

    setThemeState(validTheme);

    // Persistência síncrona local (web / WebView)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, validTheme);
    } catch {
      // Silencioso
    }

    // Persistência assíncrona redundante nativa (Capacitor Preferences)
    Preferences.set({ key: THEME_STORAGE_KEY, value: validTheme }).catch(() => {
      // Silencioso
    });
  }, []);

  const toggleTheme = useCallback(() => {
    // Alternância rápida registra uma escolha explícita ('light' ou 'dark')
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [resolvedTheme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

const DEFAULT_THEME_CONTEXT: ThemeContextValue = {
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
};

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    return DEFAULT_THEME_CONTEXT;
  }
  return context;
}

