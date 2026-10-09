import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HistoryEducationalCard } from '../HistoryEducationalCard';
import type { Transaction } from '../../../../../types';

describe('HistoryEducationalCard (Fase 3 — Limites Saudáveis no Free & Card Educativo)', () => {
  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      date: '2026-05-15',
      amount: 3500,
      description: 'Salário',
      type: 'income',
      category: 'Salário',
    },
    {
      id: 'tx-2',
      date: '2026-05-20',
      amount: 1200,
      description: 'Aluguel',
      type: 'expense',
      category: 'Moradia',
    },
    {
      id: 'tx-3',
      date: '2026-06-01',
      amount: 500,
      description: 'Supermercado de outro mês',
      type: 'expense',
      category: 'Alimentação',
    },
  ];

  const targetDate = new Date(2026, 4, 15); // Maio de 2026 (mês 4 zero-indexed = mês 5)

  it('renderiza título soberano e mensagem educativa sobre o plano Pro', () => {
    render(
      <HistoryEducationalCard
        currentDate={targetDate}
        periodLabel="Maio de 2026"
        allTransactions={mockTransactions}
        onUnlockHistory={vi.fn()}
        onReturnToCurrentMonth={vi.fn()}
      />
    );

    expect(screen.getByText('Visão Histórica & Médias no Plano Pro')).toBeInTheDocument();
    expect(screen.getByText(/Seus dados de Maio de 2026 estão preservados/i)).toBeInTheDocument();
    expect(screen.getByText(/Plano Gratuito/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Plano Pro/i).length).toBeGreaterThan(0);
  });

  it('calcula e exibe a prévia consolidada de dados preservados do mês selecionado', () => {
    render(
      <HistoryEducationalCard
        currentDate={targetDate}
        periodLabel="Maio de 2026"
        allTransactions={mockTransactions}
        onUnlockHistory={vi.fn()}
        onReturnToCurrentMonth={vi.fn()}
      />
    );

    expect(screen.getByText(/2 registros seguros/i)).toBeInTheDocument();
    expect(screen.getByText('Total de Entradas')).toBeInTheDocument();
    expect(screen.getByText('Total de Saídas')).toBeInTheDocument();
  });

  it('aciona onUnlockHistory ao clicar no botão de desbloqueio Pro', () => {
    const onUnlock = vi.fn();
    render(
      <HistoryEducationalCard
        currentDate={targetDate}
        periodLabel="Maio de 2026"
        allTransactions={mockTransactions}
        onUnlockHistory={onUnlock}
        onReturnToCurrentMonth={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(/Desbloquear Histórico Pro/i));
    expect(onUnlock).toHaveBeenCalledTimes(1);
  });

  it('aciona onReturnToCurrentMonth ao clicar em Voltar ao Mês Atual', () => {
    const onReturn = vi.fn();
    render(
      <HistoryEducationalCard
        currentDate={targetDate}
        periodLabel="Maio de 2026"
        allTransactions={mockTransactions}
        onUnlockHistory={vi.fn()}
        onReturnToCurrentMonth={onReturn}
      />
    );

    fireEvent.click(screen.getByText(/Voltar ao Mês Atual/i));
    expect(onReturn).toHaveBeenCalledTimes(1);
  });
});
