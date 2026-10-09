import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AppMobileDrawer from '../AppMobileDrawer';

const navMocks = vi.hoisted(() => ({
  handleNavigate: vi.fn(),
}));

const entitlementMocks = vi.hoisted(() => ({
  tier: 'free' as string,
}));

vi.mock('../../hooks/useNavigation', () => ({
  useNavigation: () => ({ handleNavigate: navMocks.handleNavigate }),
}));

vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({ effectiveTier: entitlementMocks.tier }),
}));

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  isAuthenticated: true,
  userMeta: null,
  userDisplayName: 'Teste',
  onLogout: vi.fn(),
  onOpenCourse: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  entitlementMocks.tier = 'free';
});

describe('AppMobileDrawer (Etapa 6 — E6-01)', () => {
  it('não renderiza nada quando fechado', () => {
    const { container } = render(<AppMobileDrawer {...baseProps} isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza aberto com os 5 blocos executivos e atalhos principais', () => {
    render(<AppMobileDrawer {...baseProps} />);
    expect(screen.getByText('Menu Soberano')).toBeInTheDocument();
    expect(screen.getByText('Rotina & Caixa')).toBeInTheDocument();
    expect(screen.getByText('Operação Diária')).toBeInTheDocument();
    expect(screen.getByText('Patrimônio & Decisões')).toBeInTheDocument();
    expect(screen.getByText('Inteligência & Descoberta')).toBeInTheDocument();
    expect(screen.getByText('Sistema')).toBeInTheDocument();
    expect(screen.getByText('Central')).toBeInTheDocument();
    expect(screen.getByText('Controla')).toBeInTheDocument();
    expect(screen.getByText('Agenda')).toBeInTheDocument();
    expect(screen.getByText('Minhas Dívidas')).toBeInTheDocument();
    expect(screen.getByText('Configurações')).toBeInTheDocument();
    expect(screen.getByText('Explorar')).toBeInTheDocument();
  });

  it('navega para o Controla e fecha o drawer', () => {
    const onClose = vi.fn();
    render(<AppMobileDrawer {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Controla'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(navMocks.handleNavigate).toHaveBeenCalledWith('manager');
  });

  it('gate visual: sem premium, Minhas Dívidas leva ao pricing', () => {
    render(<AppMobileDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('Minhas Dívidas'));
    expect(navMocks.handleNavigate).toHaveBeenCalledWith('pricing');
    expect(navMocks.handleNavigate).not.toHaveBeenCalledWith('minhas-dividas');
  });

  it('com premium, Minhas Dívidas navega direto', () => {
    entitlementMocks.tier = 'premium';
    render(<AppMobileDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('Minhas Dívidas'));
    expect(navMocks.handleNavigate).toHaveBeenCalledWith('minhas-dividas');
  });

  it('sem autenticação, atalhos levam ao login', () => {
    render(<AppMobileDrawer {...baseProps} isAuthenticated={false} />);
    fireEvent.click(screen.getByText('Controla'));
    expect(navMocks.handleNavigate).toHaveBeenCalledWith('login');
  });

  it('navega para a Carteira Soberana (portfolio) e fecha o drawer', () => {
    const onClose = vi.fn();
    render(<AppMobileDrawer {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Carteira Soberana'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(navMocks.handleNavigate).toHaveBeenCalledWith('portfolio');
  });

  it('com premium, Investimentos navega para o módulo legado de investimentos', () => {
    entitlementMocks.tier = 'premium';
    const onClose = vi.fn();
    render(<AppMobileDrawer {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Investimentos'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(navMocks.handleNavigate).toHaveBeenCalledWith('investimentos');
  });

  it('logout fecha o drawer e desloga', () => {
    const onClose = vi.fn();
    const onLogout = vi.fn();
    render(<AppMobileDrawer {...baseProps} onClose={onClose} onLogout={onLogout} />);
    fireEvent.click(screen.getByText('Sair da Conta'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('fecha o drawer ao clicar no backdrop (fora da prateleira na lateral esquerda)', () => {
    const onClose = vi.fn();
    render(<AppMobileDrawer {...baseProps} onClose={onClose} />);
    const backdrop = screen.getByTestId('app-mobile-drawer-backdrop');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('não fecha o drawer ao clicar dentro da prateleira de opções', () => {
    const onClose = vi.fn();
    render(<AppMobileDrawer {...baseProps} onClose={onClose} />);
    const content = screen.getByTestId('app-mobile-drawer-content');
    fireEvent.click(content);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('fecha o drawer ao pressionar a tecla Escape', () => {
    const onClose = vi.fn();
    render(<AppMobileDrawer {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
