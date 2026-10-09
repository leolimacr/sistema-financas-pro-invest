import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, renderHook } from '@testing-library/react';
import {
  ThemeProvider,
  useTheme,
  getSystemTheme,
  getInitialTheme,
  applyThemeToDom,
  THEME_STORAGE_KEY,
} from '../ThemeContext';
import { Preferences } from '@capacitor/preferences';

// Mock do @capacitor/preferences
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ThemeContext & useTheme', () => {
  let listeners: ((e: MediaQueryListEvent) => void)[] = [];
  let matchesDark = false;

  beforeEach(() => {
    listeners = [];
    matchesDark = false;
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    vi.clearAllMocks();

    // Mock do window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: matchesDark,
      media: query,
      onchange: null,
      addListener: vi.fn((cb) => listeners.push(cb)),
      removeListener: vi.fn((cb) => {
        listeners = listeners.filter((l) => l !== cb);
      }),
      addEventListener: vi.fn((event, cb) => {
        if (event === 'change') listeners.push(cb);
      }),
      removeEventListener: vi.fn((event, cb) => {
        if (event === 'change') listeners = listeners.filter((l) => l !== cb);
      }),
      dispatchEvent: vi.fn(),
    }));

    (Preferences.get as any).mockResolvedValue({ value: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
  });

  describe('Funções Puras Auxiliares', () => {
    it('getSystemTheme retorna "dark" quando matchMedia bate true e "light" quando false', () => {
      matchesDark = true;
      expect(getSystemTheme()).toBe('dark');

      matchesDark = false;
      expect(getSystemTheme()).toBe('light');
    });

    it('getInitialTheme lê valores válidos do localStorage ("light", "dark", "system")', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      expect(getInitialTheme()).toBe('light');

      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      expect(getInitialTheme()).toBe('dark');

      localStorage.setItem(THEME_STORAGE_KEY, 'system');
      expect(getInitialTheme()).toBe('system');
    });

    it('getInitialTheme retorna "system" para valor ausente ou inválido', () => {
      expect(getInitialTheme()).toBe('system');

      localStorage.setItem(THEME_STORAGE_KEY, 'invalid_mode');
      expect(getInitialTheme()).toBe('system');
    });

    it('getInitialTheme lida silenciosamente se localStorage lançar exceção', () => {
      const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Access denied');
      });
      expect(getInitialTheme()).toBe('system');
      spy.mockRestore();
    });

    it('applyThemeToDom manipula corretamente classe e color-scheme', () => {
      applyThemeToDom('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');

      applyThemeToDom('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('light');
    });
  });

  describe('Hook useTheme fora do Provider', () => {
    it('retorna valores padrão seguros sem lançar erro quando invocado fora do ThemeProvider', () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('light');
      expect(typeof result.current.setTheme).toBe('function');
      expect(typeof result.current.toggleTheme).toBe('function');
    });
  });

  describe('Comportamento do ThemeProvider', () => {
    it('inicia com "system" e resolve para a preferência do sistema operacional quando não há valor salvo', () => {
      matchesDark = false;
      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(document.documentElement.style.colorScheme).toBe('light');
    });

    it('inicia com "system" e resolve para "dark" se o SO preferir escuro', () => {
      matchesDark = true;
      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      expect(result.current.theme).toBe('system');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');
    });

    it('uma escolha explícita no localStorage prevalece na inicialização', () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      matchesDark = false; // SO é light, mas usuário escolheu dark

      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('setTheme atualiza o estado, DOM, localStorage e Preferences', async () => {
      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      await act(async () => {
        result.current.setTheme('dark');
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(Preferences.set).toHaveBeenCalledWith({
        key: THEME_STORAGE_KEY,
        value: 'dark',
      });

      await act(async () => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });

    it('toggleTheme alterna entre "light" e "dark" registrando escolha explícita', async () => {
      matchesDark = false; // Começa claro via sistema
      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      expect(result.current.resolvedTheme).toBe('light');

      // Primeiro toggle: passa para 'dark'
      await act(async () => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

      // Segundo toggle: passa para 'light'
      await act(async () => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });

    it('modo "system" acompanha dinamicamente a mudança do SO via listener', async () => {
      matchesDark = false;
      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      expect(result.current.resolvedTheme).toBe('light');
      expect(listeners.length).toBeGreaterThan(0);

      // Simula mudança de tema do sistema operacional para dark
      await act(async () => {
        for (const listener of listeners) {
          listener({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(result.current.resolvedTheme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('escolha explícita NÃO é alterada quando o SO muda de tema', async () => {
      matchesDark = false;
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');

      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');

      // Simula SO mudando para light (matches: false)
      await act(async () => {
        for (const listener of listeners) {
          listener({ matches: false } as MediaQueryListEvent);
        }
      });

      // Permanece dark porque a escolha do usuário é explícita
      expect(result.current.theme).toBe('dark');
      expect(result.current.resolvedTheme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('contingência nativa: recupera do Preferences se localStorage estiver nulo', async () => {
      // localStorage está vazio
      (Preferences.get as any).mockResolvedValueOnce({ value: 'dark' });

      let hookResult: any;
      await act(async () => {
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
        hookResult = result;
      });

      expect(hookResult.current.theme).toBe('dark');
      expect(hookResult.current.resolvedTheme).toBe('dark');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('precedência estrita: NÃO sobrescreve localStorage com Preferences se localStorage já tiver valor', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
      (Preferences.get as any).mockResolvedValueOnce({ value: 'dark' });

      let hookResult: any;
      await act(async () => {
        const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
        hookResult = result;
      });

      // localStorage é soberano na inicialização
      expect(hookResult.current.theme).toBe('light');
      expect(hookResult.current.resolvedTheme).toBe('light');
      expect(Preferences.get).not.toHaveBeenCalled();
    });

    it('corrida assíncrona: se o usuário fizer uma escolha enquanto Preferences.get está pendente, a resposta atrasada NÃO sobrescreve a escolha do usuário', async () => {
      let resolvePreferences!: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePreferences = resolve;
      });
      (Preferences.get as any).mockReturnValueOnce(delayedPromise);

      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      // O usuário explicitamente clica e define 'light' antes de Preferences resolver
      await act(async () => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');

      // Agora a promessa lenta do Capacitor resolve retornando 'dark'
      await act(async () => {
        resolvePreferences({ value: 'dark' });
        await delayedPromise;
      });

      // A escolha do usuário ('light') continua preservada!
      expect(result.current.theme).toBe('light');
      expect(result.current.resolvedTheme).toBe('light');
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    });

    it('resiliência: falha no localStorage.setItem não quebra a aplicação nem lança erro fatal', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      await act(async () => {
        expect(() => result.current.setTheme('dark')).not.toThrow();
      });

      expect(result.current.theme).toBe('dark');
      setItemSpy.mockRestore();
    });

    it('resiliência: falha no Preferences.set é tratada silenciosamente sem rejeição não capturada', async () => {
      (Preferences.set as any).mockRejectedValueOnce(new Error('Capacitor Bridge Disconnected'));

      const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

      await act(async () => {
        expect(() => result.current.setTheme('dark')).not.toThrow();
      });

      expect(result.current.theme).toBe('dark');
    });
  });
});
