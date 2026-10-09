import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ResolvedTheme } from '../contexts/ThemeContext';

export type AgendaPaperThemeMode = 'auto' | 'light' | 'dark';
export type AgendaResolvedPaperTheme = 'light' | 'dark';

export interface StoredPaperPreference {
  mode: 'light' | 'dark';
  forAppTheme: ResolvedTheme;
}

export const AGENDA_PAPER_THEME_KEY = 'fpi_agenda_paper_theme';

export function getStoredAgendaPaperTheme(currentAppTheme?: ResolvedTheme): AgendaPaperThemeMode {
  if (typeof window === 'undefined') return 'auto';
  try {
    const raw = localStorage.getItem(AGENDA_PAPER_THEME_KEY);
    if (!raw) return 'auto';

    // Pode ser JSON estruturado ou string legada ('light' | 'dark' | 'auto')
    if (raw.startsWith('{')) {
      const parsed: StoredPaperPreference = JSON.parse(raw);
      if (parsed && (parsed.mode === 'light' || parsed.mode === 'dark')) {
        // Se o tema do app mudou em relação a quando foi salvo, a agenda acompanha o tema atual do app
        if (currentAppTheme && parsed.forAppTheme && parsed.forAppTheme !== currentAppTheme) {
          return 'auto';
        }
        return parsed.mode;
      }
    } else if (raw === 'light' || raw === 'dark' || raw === 'auto') {
      return raw;
    }
  } catch {
    // Falha silenciosa em caso de restrição de storage
  }
  return 'auto';
}

export interface UseAgendaPaperThemeReturn {
  paperMode: AgendaPaperThemeMode;
  resolvedPaperTheme: AgendaResolvedPaperTheme;
  isPaperDark: boolean;
  togglePaperTheme: () => void;
  resetToAuto: () => void;
  setPaperTheme: (mode: AgendaPaperThemeMode) => void;
}

/**
 * Hook para gerenciar o tema da folha pautada da Agenda.
 * 
 * Regra de Negócio Soberana:
 * 1. Sempre que o usuário clicar no botão de alternar tema global do Finanças Pro Invest,
 *    a folha pautada da Agenda acompanha imediatamente a escolha global (sincronização automática).
 * 2. Se o usuário quiser uma folha diferente especificamente na Agenda (ex: folha branca no modo escuro),
 *    ele clica no botão independente da Agenda para customizá-la.
 * 3. Se futuramente o tema do Finanças Pro Invest for alterado novamente, a folha volta a acompanhar
 *    a nova escolha global.
 */
export function useAgendaPaperTheme(resolvedAppTheme: ResolvedTheme = 'light'): UseAgendaPaperThemeReturn {
  const [paperMode, setPaperMode] = useState<AgendaPaperThemeMode>(() => getStoredAgendaPaperTheme(resolvedAppTheme));
  const prevAppThemeRef = useRef<ResolvedTheme>(resolvedAppTheme);

  // Sincronização: sempre que o tema geral da aplicação mudar pelo clique do usuário,
  // a folha pautada da Agenda acompanha o novo tema selecionado.
  useEffect(() => {
    if (prevAppThemeRef.current !== resolvedAppTheme) {
      prevAppThemeRef.current = resolvedAppTheme;
      setPaperMode('auto');
      try {
        localStorage.removeItem(AGENDA_PAPER_THEME_KEY);
      } catch {
        // Falha silenciosa
      }
    }
  }, [resolvedAppTheme]);

  const resolvedPaperTheme: AgendaResolvedPaperTheme = useMemo(() => {
    if (paperMode === 'light' || paperMode === 'dark') {
      return paperMode;
    }
    return resolvedAppTheme;
  }, [paperMode, resolvedAppTheme]);

  const togglePaperTheme = useCallback(() => {
    setPaperMode((prev) => {
      const current = prev === 'auto' ? resolvedAppTheme : prev;
      const next: AgendaPaperThemeMode = current === 'dark' ? 'light' : 'dark';
      try {
        const payload: StoredPaperPreference = {
          mode: next,
          forAppTheme: resolvedAppTheme,
        };
        localStorage.setItem(AGENDA_PAPER_THEME_KEY, JSON.stringify(payload));
      } catch {
        // Falha silenciosa
      }
      return next;
    });
  }, [resolvedAppTheme]);

  const resetToAuto = useCallback(() => {
    try {
      localStorage.removeItem(AGENDA_PAPER_THEME_KEY);
    } catch {
      // Falha silenciosa
    }
    setPaperMode('auto');
  }, []);

  const setPaperTheme = useCallback((mode: AgendaPaperThemeMode) => {
    try {
      if (mode === 'auto') {
        localStorage.removeItem(AGENDA_PAPER_THEME_KEY);
      } else {
        const payload: StoredPaperPreference = {
          mode,
          forAppTheme: resolvedAppTheme,
        };
        localStorage.setItem(AGENDA_PAPER_THEME_KEY, JSON.stringify(payload));
      }
    } catch {
      // Falha silenciosa
    }
    setPaperMode(mode);
  }, [resolvedAppTheme]);

  return {
    paperMode,
    resolvedPaperTheme,
    isPaperDark: resolvedPaperTheme === 'dark',
    togglePaperTheme,
    resetToAuto,
    setPaperTheme,
  };
}
