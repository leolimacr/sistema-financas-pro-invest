import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgendaHub } from '../AgendaHub';
import type { AgendaCommitment } from '../../services/agendaService';

let mockSearchParams = new URLSearchParams();

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useSearchParams: () => [mockSearchParams, vi.fn()],
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

const testSeedCommitments: AgendaCommitment[] = [
  {
    id: 'c-today',
    title: 'Roça à noite',
    date: new Date() as any,
    completed: false,
    order: 0,
  },
  {
    id: 'c-tomorrow',
    title: 'Reunião de Planejamento',
    date: new Date(Date.now() + 24 * 3600 * 1000) as any,
    completed: false,
    order: 1,
  },
];

vi.mock('../../services/agendaService', () => ({
  fetchMonthCommitments: vi.fn().mockResolvedValue([]),
  fetchUpcomingCommitments: vi.fn().mockResolvedValue([]),
  addCommitment: vi.fn().mockResolvedValue('c-new'),
  updateCommitment: vi.fn().mockResolvedValue(undefined),
  deleteCommitment: vi.fn().mockResolvedValue(undefined),
  toggleCommitment: vi.fn().mockResolvedValue(undefined),
  reorderDayCommitments: vi.fn().mockResolvedValue(undefined),
  searchCommitments: vi.fn().mockResolvedValue([]),
  isSyncedBill: (c: any) => Boolean(c?.linkedBillId || c?.source === 'controla_bill'),
  extractBillAmount: (c: any) => c?.amount || 0,
}));

describe('AgendaHub — Sua Semana em Foco (Deep Link & Painel dos Próximos 7 Dias)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('renderiza o botão "Semana" no cabeçalho e abre o painel ao clicar', async () => {
    render(<AgendaHub seedCommitments={testSeedCommitments} />);

    const weekBtn = screen.getByTestId('agenda-week-toggle');
    expect(weekBtn).toBeInTheDocument();

    // Painel da semana fechado inicialmente
    expect(screen.queryByTestId('agenda-week-panel')).not.toBeInTheDocument();

    // Clica para abrir
    fireEvent.click(weekBtn);

    expect(screen.getByTestId('agenda-week-panel')).toBeInTheDocument();
    expect(screen.getByText(/Sua Semana em Foco/i)).toBeInTheDocument();
    expect(screen.getByText('Roça à noite')).toBeInTheDocument();
    expect(screen.getByText('Reunião de Planejamento')).toBeInTheDocument();

    // Fecha ao clicar no botão X
    const closeBtn = screen.getByTestId('agenda-week-close');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('agenda-week-panel')).not.toBeInTheDocument();
  });

  it('abre automaticamente quando a URL contém view=week e destaca o compromisso citado', async () => {
    mockSearchParams = new URLSearchParams({
      view: 'week',
      highlight: 'c-today',
      date: new Date().toISOString().split('T')[0],
    });

    render(<AgendaHub seedCommitments={testSeedCommitments} />);

    // Deve abrir o painel automaticamente
    expect(screen.getByTestId('agenda-week-panel')).toBeInTheDocument();
    expect(screen.getByText('Roça à noite')).toBeInTheDocument();

    // Deve exibir a badge Citado na Notificação no item destacado
    expect(screen.getByText('Citado na Notificação')).toBeInTheDocument();
  });

  it('ao clicar em "Ver no Caderno", rola até a data correspondente e fecha o painel', async () => {
    mockSearchParams = new URLSearchParams({
      view: 'week',
      highlight: 'c-today',
    });

    render(<AgendaHub seedCommitments={testSeedCommitments} />);

    expect(screen.getByTestId('agenda-week-panel')).toBeInTheDocument();

    const focusBtn = screen.getByTestId('agenda-week-focus-btn-c-today');
    expect(focusBtn).toBeInTheDocument();

    fireEvent.click(focusBtn);

    // O painel deve fechar para levar o usuário diretamente ao caderno
    expect(screen.queryByTestId('agenda-week-panel')).not.toBeInTheDocument();
  });
});
