import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { NexusFeedItem } from '../NexusFeedItem';
import type { NexusInsight } from '../../../services/nexusInsightEngine';

const baseInsight: NexusInsight = {
  id: 'test-insight-001',
  message: { title: 'Gasto alto detectado', body: 'Sua fatura subiu 40% este mês.', ctaLabel: 'Ver Fatura' },
  deepLink: '/app/cartoes',
  priority: 'alta',
};

const renderItem = (overrides?: Partial<NexusInsight>, isNew = true) => {
  const insight = { ...baseInsight, ...overrides };
  const onAcknowledge = vi.fn();
  const onDismiss = vi.fn();
  const onNavigate = vi.fn();

  const result = render(
    <NexusFeedItem
      insight={insight}
      isNew={isNew}
      onAcknowledge={onAcknowledge}
      onDismiss={onDismiss}
      onNavigate={onNavigate}
    />
  );

  return { insight, onAcknowledge, onDismiss, onNavigate, ...result };
};

describe('NexusFeedItem', () => {
  it('renderiza título e corpo do insight', () => {
    renderItem();
    expect(screen.getByText('Gasto alto detectado')).toBeInTheDocument();
    expect(screen.getByText('Sua fatura subiu 40% este mês.')).toBeInTheDocument();
  });

  it('mostra ícone sparkle quando é novo', () => {
    renderItem({}, true);
    const sparkle = document.querySelector('.lucide-sparkles');
    expect(sparkle).toBeInTheDocument();
  });

  it('não mostra sparkle quando não é novo', () => {
    renderItem({}, false);
    expect(document.querySelector('.lucide-sparkles')).not.toBeInTheDocument();
  });

  it('chama onAcknowledge ao clicar em reconhecer (✓)', () => {
    const { onAcknowledge } = renderItem();
    const checkBtn = screen.getByTitle('Reconhecer');
    fireEvent.click(checkBtn);
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
    expect(onAcknowledge).toHaveBeenCalledWith('test-insight-001');
  });

  it('chama onDismiss ao clicar em descartar (✕)', () => {
    const { onDismiss } = renderItem();
    const dismissBtn = screen.getByTitle('Descartar');
    fireEvent.click(dismissBtn);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledWith('test-insight-001');
  });

  it('mostra botão de deep link quando insight tem deepLink', () => {
    renderItem();
    expect(screen.getByText('Ver Fatura')).toBeInTheDocument();
  });

  it('chama onNavigate com deepLink ao clicar no link', () => {
    const { onNavigate } = renderItem();
    fireEvent.click(screen.getByText('Ver Fatura'));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith('/app/cartoes');
  });

  it('não mostra deep link quando insight não tem deepLink', () => {
    renderItem({ deepLink: '' });
    expect(screen.queryByText('Ver Fatura')).not.toBeInTheDocument();
  });

  it('usa ctaLabel padrão "Ver" quando ctaLabel está vazio', () => {
    renderItem({ message: { title: 'Teste', body: 'Corpo', ctaLabel: '' }, deepLink: '/test' });
    expect(screen.getByText('Ver')).toBeInTheDocument();
  });

  it('aplica borda colorida correta por prioridade', () => {
    const { container } = renderItem({ priority: 'alta' });
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('border-l-red-500');
  });

  it('aplica fundo diferente para insight reconhecido', () => {
    const { container } = renderItem({}, false);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain('bg-slate-50/60');
  });
});
