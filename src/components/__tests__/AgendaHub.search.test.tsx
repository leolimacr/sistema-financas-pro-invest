import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgendaHub } from '../AgendaHub';

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('../../hooks/useBills', () => ({
  useBills: () => ({ bills: [] }),
}));

const mockSearchCommitments = vi.fn();

vi.mock('../../services/agendaService', () => ({
  fetchMonthCommitments: vi.fn().mockResolvedValue([]),
  fetchUpcomingCommitments: vi.fn().mockResolvedValue([]),
  addCommitment: vi.fn().mockResolvedValue('c-new'),
  updateCommitment: vi.fn().mockResolvedValue(undefined),
  deleteCommitment: vi.fn().mockResolvedValue(undefined),
  toggleCommitment: vi.fn().mockResolvedValue(undefined),
  reorderDayCommitments: vi.fn().mockResolvedValue(undefined),
  searchCommitments: (...args: any[]) => mockSearchCommitments(...args),
  isSyncedBill: (c: any) => Boolean(c?.linkedBillId || c?.source === 'controla_bill'),
  extractBillAmount: (c: any) => c?.amount || 0,
}));

describe('AgendaHub — Pesquisa por Palavras-Chave', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renderiza o botão de pesquisa no cabeçalho e abre o painel ao clicar', async () => {
    render(<AgendaHub />);

    const searchBtn = screen.getByTestId('agenda-search-trigger');
    expect(searchBtn).toBeInTheDocument();

    // Painel fechado inicialmente
    expect(screen.queryByTestId('agenda-search-panel')).not.toBeInTheDocument();

    // Clica para abrir
    fireEvent.click(searchBtn);

    expect(screen.getByTestId('agenda-search-panel')).toBeInTheDocument();
    expect(screen.getByTestId('agenda-search-input')).toBeInTheDocument();
    expect(screen.getByText('Pesquisar na Agenda')).toBeInTheDocument();

    // Fecha ao clicar no X do painel
    const closeBtn = screen.getByTestId('agenda-search-close');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('agenda-search-panel')).not.toBeInTheDocument();
  });

  it('fecha o painel de pesquisa ao pressionar a tecla Escape', async () => {
    render(<AgendaHub />);

    fireEvent.click(screen.getByTestId('agenda-search-trigger'));
    expect(screen.getByTestId('agenda-search-panel')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('agenda-search-panel')).not.toBeInTheDocument();
  });

  it('digita termo de busca, aciona searchCommitments e exibe resultados com botão para ir até a data', async () => {
    const mockResults = [
      {
        id: 'c10',
        title: 'Catequese 19h',
        date: { toDate: () => new Date('2026-09-21T19:00:00.000Z') },
        completed: false,
        time: '19:00',
      },
    ];
    mockSearchCommitments.mockResolvedValue(mockResults);

    render(<AgendaHub />);

    fireEvent.click(screen.getByTestId('agenda-search-trigger'));
    const input = screen.getByTestId('agenda-search-input');

    // Digita no input
    fireEvent.change(input, { target: { value: 'catequese' } });
    expect(input).toHaveValue('catequese');

    // Aguarda debounce de 250ms e resposta da busca
    await waitFor(() => {
      expect(mockSearchCommitments).toHaveBeenCalledWith('u1', 'catequese', expect.any(Object));
    });

    await waitFor(() => {
      expect(screen.getByText('1 compromisso encontrado:')).toBeInTheDocument();
      expect(screen.getByText('Catequese 19h')).toBeInTheDocument();
      expect(screen.getByText('Ver no caderno')).toBeInTheDocument();
    });

    // Ao clicar no resultado, fecha o painel de busca
    const resultItem = screen.getByTestId('agenda-search-result-c10');
    fireEvent.click(resultItem);

    expect(screen.queryByTestId('agenda-search-panel')).not.toBeInTheDocument();
  });

  it('exibe mensagem quando nenhum compromisso for encontrado', async () => {
    mockSearchCommitments.mockResolvedValue([]);

    render(<AgendaHub />);

    fireEvent.click(screen.getByTestId('agenda-search-trigger'));
    const input = screen.getByTestId('agenda-search-input');

    fireEvent.change(input, { target: { value: 'viagem marte' } });

    await waitFor(() => {
      expect(screen.getByText('Nenhum compromisso encontrado para "viagem marte".')).toBeInTheDocument();
    });
  });
});
