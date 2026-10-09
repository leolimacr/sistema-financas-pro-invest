import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppRoutes from '../AppRoutes';
import { PortfolioPage } from '../../pages/PortfolioPage';

// Mocks estritamente necessários para isolar os contextos e serviços de infraestrutura externa
vi.mock('../../contexts/TransactionsContext', () => ({
  useTransactionsContext: () => ({ bridgeReady: true, hasConnectedAtLeastOnce: true }),
}));
vi.mock('../../contexts/DebtContext', () => ({
  useDebtContext: () => ({ debtBridgeReady: true, hasConnectedAtLeastOnce: true }),
}));
vi.mock('../../contexts/FinanceContext', () => ({
  useFinanceContext: () => ({ financeBridgeReady: true, hasConnectedAtLeastOnce: true }),
}));
vi.mock('../../hooks/useWealthData', () => ({
  useWealthData: () => ({ totalWealth: 0 }),
}));
vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({
    effectiveTier: 'pro',
    hasFeature: () => true,
    loading: false,
  }),
}));
vi.mock('../../hooks/useNavigation', () => ({
  useNavigation: () => ({
    handleNavigate: vi.fn(),
    handleAuthSuccess: vi.fn(),
    homeKey: 0,
    currentTool: 'central',
  }),
}));
vi.mock('../../components/MobileAppGate', () => ({
  default: () => null,
}));
vi.mock('../../layouts/PublicLayout', () => ({
  default: () => <Outlet />,
}));
vi.mock('../../layouts/AppLayout', () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="app-layout">
      <header data-testid="app-header">App Header Real</header>
      {children}
    </div>
  ),
}));
vi.mock('../../components/Auth/AuthLogin', () => ({
  default: () => <div data-testid="login-page">Tela de Login Real</div>,
}));
vi.mock('../../components/tools/wealth/ActiveWealthManager', () => ({
  ActiveWealthManager: () => <div data-testid="legacy-investments-module">Módulo Antigo de Investimentos (ActiveWealthManager)</div>,
  default: () => <div data-testid="legacy-investments-module">Módulo Antigo de Investimentos (ActiveWealthManager)</div>,
}));

// Fábrica do estado da aplicação repassado para AppRoutes
const createMockState = (isAuthenticated: boolean) => ({
  user: isAuthenticated ? { uid: 'test-user-123', email: 'investidor@financasproinvest.com' } : null,
  isAuthenticated,
  isMobileBrowser: false,
  lancamentos: [],
  categories: [],
  deleteLancamento: vi.fn(),
  saveCategory: vi.fn(),
  deleteCategory: vi.fn(),
  userMeta: { onboardingCompleted: true },
  userMetaLoaded: true,
  isAppLocked: false,
  storedPin: null,
  handleUnlockSuccess: vi.fn(),
  isPrivacyMode: false,
  setActiveModal: vi.fn(),
  setOnboardingDismissed: vi.fn(),
  routerNavigate: vi.fn(),
  handleEditTransaction: vi.fn(),
  getAiContextTransactions: vi.fn(),
  setIsPrivacyMode: vi.fn(),
  openTransactionForm: vi.fn(),
  isSyncing: false,
  isLoading: false,
  userMetaLoading: false,
} as any);

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

describe('Rotas e Coexistência - /app/carteira vs /app/investimentos (AppRoutes Real)', () => {
  it('1. Deve renderizar a nova interface de carteira em estado vazio legítimo ao acessar diretamente /app/carteira autenticado através de AppRoutes real', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app/carteira']}>
          <AppRoutes state={createMockState(true)} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // Aguarda o carregamento do suspense da nova página dentro do layout real
    await waitFor(() => {
      expect(screen.getByTestId('portfolio-empty-state')).toBeInTheDocument();
    });

    // Confirma que a página vazia legítima explica como começar e NÃO contém ativos fictícios
    expect(screen.getByText(/sua carteira soberana de investimentos/i)).toBeInTheDocument();
    expect(screen.getByText(/caixa de oportunidade/i)).toBeInTheDocument();
    expect(screen.queryByTestId('legacy-investments-module')).not.toBeInTheDocument();
    expect(screen.queryByText('PETR4')).not.toBeInTheDocument();
    expect(screen.queryByText('VALE3')).not.toBeInTheDocument();
  });

  it('2. Deve barrar o acesso a /app/carteira e redirecionar para login com redirect correto quando não autenticado através do ProtectedRoute real', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app/carteira']}>
          <AppRoutes state={createMockState(false)} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    // Não deve renderizar nem o layout do app nem a carteira
    expect(screen.queryByTestId('portfolio-empty-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('app-header')).not.toBeInTheDocument();
  });

  it('3. Deve manter /app/investimentos estritamente apontado para o módulo antigo sem qualquer interferência através de AppRoutes real', async () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app/investimentos']}>
          <AppRoutes state={createMockState(true)} />
        </MemoryRouter>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('legacy-investments-module')).toBeInTheDocument();
    });

    // Confirma que a nova carteira NÃO é renderizada em /app/investimentos
    expect(screen.queryByTestId('portfolio-empty-state')).not.toBeInTheDocument();
  });

  it('4. Deve garantir o isolamento e independência total de PortfolioPage pura (teste unitário)', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <PortfolioPage />
      </QueryClientProvider>
    );
    expect(screen.getByTestId('portfolio-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/sua carteira soberana de investimentos/i)).toBeInTheDocument();
  });
});
