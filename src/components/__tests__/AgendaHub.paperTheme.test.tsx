import React from 'react';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AgendaHub from '../AgendaHub';
import { AGENDA_PAPER_THEME_KEY } from '../../agenda/useAgendaPaperTheme';

// Mock do ThemeContext para podermos testar tanto modo claro quanto escuro global
let mockResolvedTheme: 'light' | 'dark' = 'dark';
const mockToggleTheme = vi.fn();

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: mockResolvedTheme,
    resolvedTheme: mockResolvedTheme,
    toggleTheme: mockToggleTheme,
    setTheme: vi.fn(),
  }),
}));

// Mock do AuthContext
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-test-paper' },
    currentUser: { uid: 'user-test-paper' },
    userMeta: null,
  }),
}));

// Mock do ToastContext
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

// Mock do useBills
vi.mock('../../hooks/useBills', () => ({
  useBills: () => ({
    bills: [],
    loading: false,
  }),
}));

// Mock de serviços de agenda
vi.mock('../../services/agendaService', () => ({
  fetchMonthCommitments: vi.fn().mockResolvedValue([]),
  fetchUpcomingCommitments: vi.fn().mockResolvedValue([]),
  loadAgendaForMonths: vi.fn().mockResolvedValue([]),
  saveAgendaCommitment: vi.fn().mockResolvedValue('test-id'),
  updateAgendaCommitment: vi.fn().mockResolvedValue(undefined),
  deleteAgendaCommitment: vi.fn().mockResolvedValue(undefined),
  reorderDayCommitments: vi.fn().mockResolvedValue(undefined),
  searchCommitments: vi.fn().mockResolvedValue([]),
  isSyncedBill: vi.fn().mockReturnValue(false),
}));

// Mock de react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('AgendaHub — Botão Independente de Folha Pautada', () => {
  beforeEach(() => {
    localStorage.clear();
    mockResolvedTheme = 'dark';
    vi.clearAllMocks();
  });

  it('renderiza o botão de alternância da folha pautada com acessibilidade e atributos corretos', async () => {
    render(<AgendaHub />);

    const toggleBtn = screen.getByTestId('agenda-paper-theme-toggle');
    expect(toggleBtn).toBeInTheDocument();
    expect(toggleBtn).toHaveAttribute('data-paper-theme', 'dark');

    const container = screen.getByTestId('agenda-notebook-container');
    expect(container).toHaveAttribute('data-agenda-paper', 'dark');
    expect(container.className).toContain('bg-slate-900');
  });

  it('permite alternar para folha branca mesmo quando o app está em modo escuro', async () => {
    mockResolvedTheme = 'dark';
    render(<AgendaHub />);

    const toggleBtn = screen.getByTestId('agenda-paper-theme-toggle');
    const container = screen.getByTestId('agenda-notebook-container');

    // Inicialmente no dark mode da aplicação, a folha segue o padrão (escura)
    expect(container).toHaveAttribute('data-agenda-paper', 'dark');
    expect(container.className).toContain('bg-slate-900');

    // Clica para mudar a folha para clara
    act(() => {
      fireEvent.click(toggleBtn);
    });

    // A folha deve se tornar clara (branca), persistindo payload no localStorage
    expect(localStorage.getItem(AGENDA_PAPER_THEME_KEY)).toContain('light');
    expect(toggleBtn).toHaveAttribute('data-paper-theme', 'light');
    expect(container).toHaveAttribute('data-agenda-paper', 'light');
    expect(container.className).toContain('bg-white');

    // O tema global NÃO deve ser afetado (toggleTheme não foi chamado)
    expect(mockToggleTheme).not.toHaveBeenCalled();
  });

  it('quando o usuário clica no modo claro/escuro no Finanças Pro Invest, a agenda acompanha a escolha global', async () => {
    mockResolvedTheme = 'dark';
    const { rerender } = render(<AgendaHub />);

    const toggleBtn = screen.getByTestId('agenda-paper-theme-toggle');
    const container = screen.getByTestId('agenda-notebook-container');

    // 1. Usuário estava no escuro e customizou a folha para clara
    act(() => {
      fireEvent.click(toggleBtn);
    });
    expect(container).toHaveAttribute('data-agenda-paper', 'light');

    // 2. Agora o usuário clica no botão do Finanças Pro Invest mudando o app para modo claro:
    mockResolvedTheme = 'light';
    rerender(<AgendaHub />);

    // A folha da agenda deve acompanhar o modo claro do app imediatamente
    expect(container).toHaveAttribute('data-agenda-paper', 'light');
    expect(container.className).toContain('bg-white');

    // 3. O usuário agora clica no botão do Finanças Pro Invest mudando o app para escuro:
    mockResolvedTheme = 'dark';
    rerender(<AgendaHub />);

    // A folha da agenda deve acompanhar o modo escuro do app imediatamente
    expect(container).toHaveAttribute('data-agenda-paper', 'dark');
    expect(container.className).toContain('bg-slate-900');
  });

  it('lembra a preferência da folha branca ao recarregar quando o app permanecer no mesmo tema', async () => {
    localStorage.setItem(AGENDA_PAPER_THEME_KEY, JSON.stringify({ mode: 'light', forAppTheme: 'dark' }));
    mockResolvedTheme = 'dark'; // App está em Dark Mode

    render(<AgendaHub />);

    const toggleBtn = screen.getByTestId('agenda-paper-theme-toggle');
    const container = screen.getByTestId('agenda-notebook-container');

    // Mesmo com o app no modo escuro, a folha respeita a preferência salva 'light'
    expect(toggleBtn).toHaveAttribute('data-paper-theme', 'light');
    expect(container).toHaveAttribute('data-agenda-paper', 'light');
    expect(container.className).toContain('bg-white');
  });

  it('alterna de volta para folha escura ao clicar novamente', async () => {
    localStorage.setItem(AGENDA_PAPER_THEME_KEY, JSON.stringify({ mode: 'light', forAppTheme: 'dark' }));
    mockResolvedTheme = 'dark';

    render(<AgendaHub />);

    const toggleBtn = screen.getByTestId('agenda-paper-theme-toggle');
    const container = screen.getByTestId('agenda-notebook-container');

    expect(container).toHaveAttribute('data-agenda-paper', 'light');

    // Clica para alternar para escura
    act(() => {
      fireEvent.click(toggleBtn);
    });

    expect(localStorage.getItem(AGENDA_PAPER_THEME_KEY)).toContain('dark');
    expect(toggleBtn).toHaveAttribute('data-paper-theme', 'dark');
    expect(container).toHaveAttribute('data-agenda-paper', 'dark');
    expect(container.className).toContain('bg-slate-900');
  });
});
