import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Capacitor } from '@capacitor/core';
import AppHeader from '../AppHeader';

const navMocks = vi.hoisted(() => ({
  handleNavigate: vi.fn(),
  currentTool: 'central',
}));

const routerMocks = vi.hoisted(() => ({
  pathname: '/app/central',
  navigate: vi.fn(),
}));

vi.mock('../../hooks/useNavigation', () => ({
  useNavigation: () => ({
    currentTool: navMocks.currentTool,
    handleNavigate: navMocks.handleNavigate,
  }),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: routerMocks.pathname }),
  useNavigate: () => routerMocks.navigate,
}));

const entitlementMocks = vi.hoisted(() => ({
  effectiveTier: 'free' as 'free' | 'pro' | 'premium',
}));

vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({ effectiveTier: entitlementMocks.effectiveTier }),
}));

const themeMocks = vi.hoisted(() => ({
  resolvedTheme: 'light',
  toggleTheme: vi.fn(),
}));

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    resolvedTheme: themeMocks.resolvedTheme,
    toggleTheme: themeMocks.toggleTheme,
  }),
}));

vi.mock('../../contexts/NotificationContext', () => ({
  useNotifications: () => ({ unreadCount: 0 }),
}));

const baseProps = {
  isAuthenticated: true,
  userMeta: null,
  userDisplayName: 'Teste',
  isPrivacyMode: false,
  onTogglePrivacy: vi.fn(),
  onLogout: vi.fn(),
  onOpenMobileMenu: vi.fn(),
  isNotificationsOpen: false,
  onOpenNotifications: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  routerMocks.pathname = '/app/central';
  navMocks.currentTool = 'central';
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
});

describe('AppHeader (Etapa 6 — E6-05 agenda é rota principal)', () => {
  it('exibe a marca (sem Voltar) em /app/agenda', () => {
    routerMocks.pathname = '/app/agenda';
    navMocks.currentTool = 'agenda';
    render(<AppHeader {...baseProps} />);
    expect(screen.queryByText('Voltar')).not.toBeInTheDocument();
    expect(screen.getByText('Finanças Pro')).toBeInTheDocument();
  });

  it('exibe Voltar fora das rotas principais', () => {
    routerMocks.pathname = '/app/minhas-dividas';
    navMocks.currentTool = 'minhas-dividas';
    render(<AppHeader {...baseProps} />);
    expect(screen.getByText('Voltar')).toBeInTheDocument();
  });
});

describe('AppHeader (Etapa 6 — E6-09 drawer acessível no native)', () => {
  it('botão Menu abre o drawer na web', () => {
    const onOpenMobileMenu = vi.fn();
    render(<AppHeader {...baseProps} onOpenMobileMenu={onOpenMobileMenu} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(onOpenMobileMenu).toHaveBeenCalledTimes(1);
  });

  it('botão Menu também existe em ambiente nativo', () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    const onOpenMobileMenu = vi.fn();
    render(<AppHeader {...baseProps} onOpenMobileMenu={onOpenMobileMenu} />);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(onOpenMobileMenu).toHaveBeenCalledTimes(1);
  });
});

describe('AppHeader (Controle de Tema & Prevenção de Gap Responsivo)', () => {
  it('renderiza o botão de tema desktop em container hidden lg:flex eliminando o gap em 1024-1279px', () => {
    render(<AppHeader {...baseProps} />);
    const themeButtons = screen.getAllByRole('button', { name: /alternar para tema/i });
    expect(themeButtons.length).toBeGreaterThanOrEqual(2);

    // O botão desktop deve estar dentro do container com hidden lg:flex
    const desktopThemeBtn = themeButtons[0];
    const desktopContainer = desktopThemeBtn.closest('.hidden.lg\\:flex');
    expect(desktopContainer).not.toBeNull();
    // Garante que não possui a classe antiga hidden xl:flex que criava o gap em lg (1024-1279px)
    expect(desktopContainer?.classList.contains('xl:flex')).toBe(false);

    // O botão mobile deve estar dentro do container lg:hidden
    const mobileThemeBtn = themeButtons[1];
    const mobileContainer = mobileThemeBtn.closest('.lg\\:hidden');
    expect(mobileContainer).not.toBeNull();
  });

  it('dispara toggleTheme ao clicar no botão de tema', () => {
    render(<AppHeader {...baseProps} />);
    const themeButtons = screen.getAllByRole('button', { name: /alternar para tema/i });
    fireEvent.click(themeButtons[0]);
    expect(themeMocks.toggleTheme).toHaveBeenCalled();
  });

  it('renderiza botão de tema mesmo quando deslogado', () => {
    render(<AppHeader {...baseProps} isAuthenticated={false} />);
    const themeButton = screen.getByRole('button', { name: /alternar para tema/i });
    expect(themeButton).toBeInTheDocument();
    fireEvent.click(themeButton);
    expect(themeMocks.toggleTheme).toHaveBeenCalled();
  });
});

describe('AppHeader (Botão Baixar App & Badges de Plano no Tema Escuro & Claro)', () => {
  beforeEach(() => {
    entitlementMocks.effectiveTier = 'free';
  });

  it('botão Baixar App logado possui classes integradas ao tema escuro e preservadas no claro', () => {
    render(<AppHeader {...baseProps} isAuthenticated={true} />);
    const baixarBtn = screen.getByRole('button', { name: /baixar app/i });
    expect(baixarBtn).toBeInTheDocument();

    // Verificação de classes no tema claro
    expect(baixarBtn.className).toContain('bg-emerald-50');
    expect(baixarBtn.className).toContain('hover:bg-emerald-100');
    expect(baixarBtn.className).toContain('border-emerald-200/80');
    expect(baixarBtn.className).toContain('text-slate-700');

    // Verificação de integração no tema escuro
    expect(baixarBtn.className).toContain('dark:bg-emerald-950/40');
    expect(baixarBtn.className).toContain('dark:hover:bg-emerald-900/60');
    expect(baixarBtn.className).toContain('dark:border-emerald-800/60');
    expect(baixarBtn.className).toContain('dark:text-emerald-300');
    expect(baixarBtn.className).toContain('dark:hover:text-emerald-100');

    // Verificação de foco e acessibilidade
    expect(baixarBtn.className).toContain('focus-visible:ring-2');
    expect(baixarBtn.className).toContain('dark:focus-visible:ring-emerald-400/50');
  });

  it('badge de Plano Premium possui estilização dark integrada no desktop e mobile', () => {
    entitlementMocks.effectiveTier = 'premium';
    render(<AppHeader {...baseProps} isAuthenticated={true} />);

    // Localiza os elementos com role="status" e aria-label="Plano Premium"
    const badges = screen.getAllByRole('status', { name: /plano premium/i });
    expect(badges.length).toBe(2); // desktop e mobile

    const desktopBadge = badges.find(b => b.classList.contains('lg:flex'));
    const mobileBadge = badges.find(b => b.classList.contains('lg:hidden'));

    expect(desktopBadge).toBeDefined();
    expect(desktopBadge?.className).toContain('bg-emerald-50');
    expect(desktopBadge?.className).toContain('dark:bg-emerald-950/60');
    expect(desktopBadge?.className).toContain('dark:border-emerald-800/80');
    expect(desktopBadge?.className).toContain('dark:text-emerald-300');
    expect(desktopBadge?.className).toContain('dark:shadow-[0_0_12px_rgba(16,185,129,0.15)]');

    expect(mobileBadge).toBeDefined();
    expect(mobileBadge?.className).toContain('dark:shadow-none');
    expect(mobileBadge?.className).toContain('dark:ring-1');
    expect(mobileBadge?.className).toContain('dark:ring-emerald-500/40');
  });

  it('badge de Plano Pro possui estilização dark integrada no desktop e mobile', () => {
    entitlementMocks.effectiveTier = 'pro';
    render(<AppHeader {...baseProps} isAuthenticated={true} />);

    const badges = screen.getAllByRole('status', { name: /plano pro/i });
    expect(badges.length).toBe(2);

    const desktopBadge = badges.find(b => b.classList.contains('lg:flex'));
    const mobileBadge = badges.find(b => b.classList.contains('lg:hidden'));

    expect(desktopBadge).toBeDefined();
    expect(desktopBadge?.className).toContain('bg-sky-50');
    expect(desktopBadge?.className).toContain('dark:bg-sky-950/60');
    expect(desktopBadge?.className).toContain('dark:border-sky-800/80');
    expect(desktopBadge?.className).toContain('dark:text-sky-300');

    expect(mobileBadge).toBeDefined();
    expect(mobileBadge?.className).toContain('dark:shadow-none');
    expect(mobileBadge?.className).toContain('dark:ring-1');
    expect(mobileBadge?.className).toContain('dark:ring-sky-500/40');
  });

  it('botão Baixar App de visitante possui suporte completo a tema escuro e claro', () => {
    render(<AppHeader {...baseProps} isAuthenticated={false} />);
    const baixarBtn = screen.getByRole('button', { name: /baixar app/i });
    expect(baixarBtn).toBeInTheDocument();

    expect(baixarBtn.className).toContain('bg-slate-100');
    expect(baixarBtn.className).toContain('dark:bg-slate-800');
    expect(baixarBtn.className).toContain('dark:text-slate-200');
    expect(baixarBtn.className).toContain('dark:border-slate-700');
  });

  it('aciona onOpenDownloadQr no desktop ao clicar em Baixar App', () => {
    const onOpenDownloadQr = vi.fn();
    window.innerWidth = 1440;
    render(<AppHeader {...baseProps} isAuthenticated={true} onOpenDownloadQr={onOpenDownloadQr} />);

    const baixarBtn = screen.getByRole('button', { name: /baixar app/i });
    fireEvent.click(baixarBtn);
    expect(onOpenDownloadQr).toHaveBeenCalledTimes(1);
  });
});

