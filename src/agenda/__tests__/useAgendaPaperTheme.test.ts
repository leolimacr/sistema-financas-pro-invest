import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useAgendaPaperTheme,
  AGENDA_PAPER_THEME_KEY,
  getStoredAgendaPaperTheme,
} from '../useAgendaPaperTheme';

describe('useAgendaPaperTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('inicia como "auto" e resolve para o tema da aplicação se nenhum tema estiver salvo', () => {
    const { result, rerender } = renderHook(
      ({ appTheme }) => useAgendaPaperTheme(appTheme),
      { initialProps: { appTheme: 'dark' as const } }
    );

    expect(result.current.paperMode).toBe('auto');
    expect(result.current.resolvedPaperTheme).toBe('dark');
    expect(result.current.isPaperDark).toBe(true);

    rerender({ appTheme: 'light' });
    expect(result.current.resolvedPaperTheme).toBe('light');
    expect(result.current.isPaperDark).toBe(false);
  });

  it('lê valor salvo em localStorage na inicialização quando for compatível com o tema atual', () => {
    localStorage.setItem(AGENDA_PAPER_THEME_KEY, JSON.stringify({ mode: 'light', forAppTheme: 'dark' }));
    expect(getStoredAgendaPaperTheme('dark')).toBe('light');

    const { result } = renderHook(() => useAgendaPaperTheme('dark'));

    expect(result.current.paperMode).toBe('light');
    expect(result.current.resolvedPaperTheme).toBe('light');
    expect(result.current.isPaperDark).toBe(false);
  });

  it('acompanha o novo tema do app quando o usuário altera o tema global no Finanças Pro Invest', () => {
    // 1. App está no modo escuro
    const { result, rerender } = renderHook(
      ({ appTheme }) => useAgendaPaperTheme(appTheme),
      { initialProps: { appTheme: 'dark' as const } }
    );
    expect(result.current.resolvedPaperTheme).toBe('dark');

    // 2. Usuário clica no botão da Agenda para colocar folha branca
    act(() => {
      result.current.togglePaperTheme();
    });
    expect(result.current.resolvedPaperTheme).toBe('light');
    expect(result.current.isPaperDark).toBe(false);
    expect(localStorage.getItem(AGENDA_PAPER_THEME_KEY)).not.toBeNull();

    // 3. Usuário clica no botão do Finanças Pro Invest para mudar para modo claro:
    // A Agenda deve imediatamente acompanhar o tema do app (virar claro) e limpar a sobreposição
    rerender({ appTheme: 'light' });
    expect(result.current.paperMode).toBe('auto');
    expect(result.current.resolvedPaperTheme).toBe('light');
    expect(result.current.isPaperDark).toBe(false);
    expect(localStorage.getItem(AGENDA_PAPER_THEME_KEY)).toBeNull();

    // 4. Se o usuário estiver no modo claro e customizar a agenda para folha escura:
    act(() => {
      result.current.togglePaperTheme();
    });
    expect(result.current.resolvedPaperTheme).toBe('dark');
    expect(result.current.isPaperDark).toBe(true);

    // 5. Se o usuário mudar o tema do Finanças Pro Invest para escuro novamente:
    // A Agenda acompanha o novo tema escuro
    rerender({ appTheme: 'dark' });
    expect(result.current.paperMode).toBe('auto');
    expect(result.current.resolvedPaperTheme).toBe('dark');
    expect(result.current.isPaperDark).toBe(true);
  });

  it('alterna de dark para light e salva payload no localStorage', () => {
    const { result } = renderHook(() => useAgendaPaperTheme('dark'));

    expect(result.current.resolvedPaperTheme).toBe('dark');

    act(() => {
      result.current.togglePaperTheme();
    });

    expect(result.current.paperMode).toBe('light');
    expect(result.current.resolvedPaperTheme).toBe('light');
    expect(result.current.isPaperDark).toBe(false);

    const saved = JSON.parse(localStorage.getItem(AGENDA_PAPER_THEME_KEY) || '{}');
    expect(saved).toEqual({ mode: 'light', forAppTheme: 'dark' });
  });

  it('alterna de light para dark e salva payload no localStorage', () => {
    const { result } = renderHook(() => useAgendaPaperTheme('light'));

    expect(result.current.resolvedPaperTheme).toBe('light');

    act(() => {
      result.current.togglePaperTheme();
    });

    expect(result.current.paperMode).toBe('dark');
    expect(result.current.resolvedPaperTheme).toBe('dark');
    expect(result.current.isPaperDark).toBe(true);

    const saved = JSON.parse(localStorage.getItem(AGENDA_PAPER_THEME_KEY) || '{}');
    expect(saved).toEqual({ mode: 'dark', forAppTheme: 'light' });
  });

  it('permite redefinir para "auto" removendo a chave do localStorage', () => {
    localStorage.setItem(AGENDA_PAPER_THEME_KEY, JSON.stringify({ mode: 'light', forAppTheme: 'dark' }));
    const { result } = renderHook(() => useAgendaPaperTheme('dark'));

    expect(result.current.paperMode).toBe('light');

    act(() => {
      result.current.resetToAuto();
    });

    expect(result.current.paperMode).toBe('auto');
    expect(result.current.resolvedPaperTheme).toBe('dark');
    expect(localStorage.getItem(AGENDA_PAPER_THEME_KEY)).toBeNull();
  });

  it('permite definir explicitamente com setPaperTheme', () => {
    const { result } = renderHook(() => useAgendaPaperTheme('dark'));

    act(() => {
      result.current.setPaperTheme('light');
    });

    expect(result.current.paperMode).toBe('light');
    const saved = JSON.parse(localStorage.getItem(AGENDA_PAPER_THEME_KEY) || '{}');
    expect(saved.mode).toBe('light');

    act(() => {
      result.current.setPaperTheme('auto');
    });

    expect(result.current.paperMode).toBe('auto');
    expect(localStorage.getItem(AGENDA_PAPER_THEME_KEY)).toBeNull();
  });
});
