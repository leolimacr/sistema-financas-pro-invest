import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppDesktopNav from '../AppDesktopNav';

const navMocks = vi.hoisted(() => ({
  handleNavigate: vi.fn(),
  currentTool: 'central' as string,
}));

vi.mock('../../hooks/useNavigation', () => ({
  useNavigation: () => ({
    handleNavigate: navMocks.handleNavigate,
    currentTool: navMocks.currentTool,
  }),
}));

describe('AppDesktopNav - Atalho Visível para Carteira Soberana', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    navMocks.currentTool = 'central';
  });

  it('1. O atalho da Carteira Soberana é exibido na barra lateral desktop', () => {
    render(<AppDesktopNav />);

    const shortcut = screen.getByTestId('desktop-nav-portfolio');
    expect(shortcut).toBeInTheDocument();
    expect(screen.getByText('Carteira Soberana')).toBeInTheDocument();
    expect(screen.getByText('V1')).toBeInTheDocument();
    expect(screen.getByText('Custódia e metas')).toBeInTheDocument();
    expect(screen.getByText('Patrimônio')).toBeInTheDocument();
  });

  it('2. Clicar no atalho navega para /app/carteira (via handleNavigate("portfolio"))', () => {
    render(<AppDesktopNav />);

    const shortcut = screen.getByTestId('desktop-nav-portfolio');
    fireEvent.click(shortcut);

    expect(navMocks.handleNavigate).toHaveBeenCalledWith('portfolio');
  });

  it('3. /app/investimentos continua independente e não ativa a Carteira Soberana', () => {
    navMocks.currentTool = 'investimentos';
    render(<AppDesktopNav />);

    const shortcut = screen.getByTestId('desktop-nav-portfolio');
    expect(shortcut).not.toHaveAttribute('aria-current', 'page');
    expect(shortcut.className).not.toContain('bg-emerald-50');
  });

  it('4. O estado ativo (aria-current="page") aparece apenas quando a rota for /app/carteira', () => {
    // Quando em 'portfolio'
    navMocks.currentTool = 'portfolio';
    const { unmount } = render(<AppDesktopNav />);

    const activeShortcut = screen.getByTestId('desktop-nav-portfolio');
    expect(activeShortcut).toHaveAttribute('aria-current', 'page');
    expect(activeShortcut.className).toContain('bg-emerald-50');

    // Central NÃO deve estar ativa quando em 'portfolio'
    const centralBtn = screen.getByRole('button', { name: /central/i });
    expect(centralBtn).not.toHaveAttribute('aria-current', 'page');

    unmount();

    // Quando em outra ferramenta (ex: 'manager' / Controla), a Carteira Soberana NÃO está ativa
    navMocks.currentTool = 'manager';
    render(<AppDesktopNav />);

    const inactiveShortcut = screen.getByTestId('desktop-nav-portfolio');
    expect(inactiveShortcut).not.toHaveAttribute('aria-current', 'page');
  });
});
