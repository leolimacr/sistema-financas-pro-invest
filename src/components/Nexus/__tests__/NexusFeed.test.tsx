import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NexusFeed } from '../NexusFeed';
import {
  setEventInsight,
  clearEventInsightStore,
  acknowledgeFeedEntry,
} from '../../../services/eventInsightStore';

const mockInsight1 = {
  id: 'feed-test-001',
  message: { title: 'Gasto alto', body: 'Sua fatura subiu.', ctaLabel: 'Ver' },
  deepLink: '/app/cartoes',
  priority: 'alta' as const,
};

const mockInsight2 = {
  id: 'feed-test-002',
  message: { title: 'Receita grande', body: 'Depósito de R$ 5.000.', ctaLabel: '' },
  deepLink: '/app/controla',
  priority: 'media' as const,
};

beforeEach(() => {
  clearEventInsightStore();
  try { localStorage.clear(); } catch { /* noop */ }
});

describe('NexusFeed — desktop (compact=false)', () => {
  it('retorna null quando o feed está vazio', () => {
    const { container } = render(<NexusFeed onNavigate={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renderiza divider e itens quando há insights', () => {
    act(() => { setEventInsight(mockInsight1); });
    render(<NexusFeed onNavigate={vi.fn()} />);
    expect(screen.getByText('Atividade Nexus')).toBeInTheDocument();
    expect(screen.getByText('Gasto alto')).toBeInTheDocument();
    expect(screen.getByText('Sua fatura subiu.')).toBeInTheDocument();
  });

  it('renderiza múltiplos insights quando há histórico', () => {
    act(() => { setEventInsight(mockInsight1); });
    act(() => { setEventInsight(mockInsight2); });
    render(<NexusFeed onNavigate={vi.fn()} />);
    expect(screen.getByText('Gasto alto')).toBeInTheDocument();
    expect(screen.getByText('Receita grande')).toBeInTheDocument();
  });
});

describe('NexusFeed — compact (mobile)', () => {
  it('retorna null quando o feed está vazio', () => {
    const { container } = render(<NexusFeed onNavigate={vi.fn()} compact />);
    expect(container.innerHTML).toBe('');
  });

  it('renderiza cabeçalho colapsável quando há insights', () => {
    act(() => { setEventInsight(mockInsight1); });
    render(<NexusFeed onNavigate={vi.fn()} compact />);
    expect(screen.getByText('Atividade Nexus')).toBeInTheDocument();
    // Itens não devem estar visíveis quando colapsado
    expect(screen.queryByText('Gasto alto')).not.toBeInTheDocument();
  });

  it('expande ao clicar no cabeçalho e mostra itens', () => {
    act(() => { setEventInsight(mockInsight1); });
    render(<NexusFeed onNavigate={vi.fn()} compact />);
    fireEvent.click(screen.getByText('Atividade Nexus'));
    expect(screen.getByText('Gasto alto')).toBeInTheDocument();
    expect(screen.getByText('Sua fatura subiu.')).toBeInTheDocument();
  });

  it('recolhe ao clicar novamente no cabeçalho', () => {
    act(() => { setEventInsight(mockInsight1); });
    render(<NexusFeed onNavigate={vi.fn()} compact />);
    fireEvent.click(screen.getByText('Atividade Nexus'));
    expect(screen.getByText('Gasto alto')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Atividade Nexus'));
    expect(screen.queryByText('Gasto alto')).not.toBeInTheDocument();
  });

  it('mostra badge com contagem de não reconhecidos', () => {
    act(() => { setEventInsight(mockInsight1); });
    render(<NexusFeed onNavigate={vi.fn()} compact />);
    // O badge "1" deve aparecer
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('badge some quando todos os insights são reconhecidos', () => {
    act(() => { setEventInsight(mockInsight1); });
    render(<NexusFeed onNavigate={vi.fn()} compact />);
    expect(screen.getByText('1')).toBeInTheDocument();
    act(() => { acknowledgeFeedEntry('feed-test-001'); });
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('chama onNavigate ao clicar em deep link de item expandido', () => {
    const onNavigate = vi.fn();
    act(() => { setEventInsight(mockInsight1); });
    render(<NexusFeed onNavigate={onNavigate} compact />);
    fireEvent.click(screen.getByText('Atividade Nexus'));
    fireEvent.click(screen.getByText('Ver'));
    expect(onNavigate).toHaveBeenCalledWith('/app/cartoes');
  });
});
