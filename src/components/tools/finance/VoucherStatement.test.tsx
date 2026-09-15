import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VoucherStatement from './VoucherStatement';
import type { CreditCard, Transaction } from '../../../types';

describe('VoucherStatement Component', () => {
  const mockCard: CreditCard = {
    id: 'card-voucher-1',
    name: 'Alelo Alimentação',
    type: 'voucher',
    voucherType: 'alimentacao',
    voucherBalance: 350.75,
  };

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      userId: 'user-1',
      type: 'expense',
      amount: 45.5,
      date: '2026-09-10',
      description: 'Supermercado Extra',
      category: 'Alimentação',
      cardId: 'card-voucher-1',
      paymentMethod: 'voucher',
    },
    {
      id: 'tx-2',
      userId: 'user-1',
      type: 'income',
      amount: 500.0,
      date: '2026-09-01',
      description: 'Recarga Alelo Empresa',
      category: 'Benefício',
      cardId: 'card-voucher-1',
      paymentMethod: 'voucher',
    },
    {
      id: 'tx-3',
      userId: 'user-1',
      type: 'expense',
      amount: 120.0,
      date: '2026-08-20',
      description: 'Atacadão Compras',
      category: 'Alimentação',
      cardId: 'card-voucher-1',
      paymentMethod: 'voucher',
    },
    {
      id: 'tx-unrelated',
      userId: 'user-1',
      type: 'expense',
      amount: 99.0,
      date: '2026-09-05',
      description: 'Farmácia Outro Cartão',
      category: 'Saúde',
      cardId: 'card-other',
      paymentMethod: 'credit',
    },
  ];

  it('renders current balance, total incomes, and total expenses accurately', () => {
    render(
      <VoucherStatement
        card={mockCard}
        transactions={mockTransactions}
        onEditTransaction={vi.fn()}
      />
    );

    // Saldo atual disponível derivado da fórmula soberana: 500,00 - 165,50 = 334,50
    expect(screen.getByText('R$ 334,50')).toBeInTheDocument();
    // Total em recargas (500.00 aparece no card de resumo e na lista)
    expect(screen.getAllByText(/\+\s*R\$\s*500,00/).length).toBe(2);
    // Total em despesas (45.50 + 120.00 = 165.50)
    expect(screen.getByText('− R$ 165,50')).toBeInTheDocument();
    // Contador de movimentações
    expect(screen.getByText('Histórico de Movimentações (3)')).toBeInTheDocument();
  });

  it('calcula e exibe corretamente o saldo no cenário 4.276,89 - 999,56 = 3.277,33 mesmo quando card.voucherBalance é 0', () => {
    const cardWithZeroBalance: CreditCard = {
      id: 'card-zero-1',
      name: 'Refeição VR',
      type: 'voucher',
      voucherType: 'refeicao',
      voucherBalance: 0, // Campo desatualizado no banco não deve zerar o saldo disponível
    };

    const reproductionTransactions: Transaction[] = [
      {
        id: 'rep-in-1',
        userId: 'user-1',
        type: 'income',
        amount: 4276.89,
        date: '2026-09-01',
        description: 'Recarga Benefício',
        cardId: 'card-zero-1',
      },
      {
        id: 'rep-exp-1',
        userId: 'user-1',
        type: 'expense',
        amount: 999.56,
        date: '2026-09-05',
        description: 'Despesas Restaurante',
        cardId: 'card-zero-1',
      },
    ];

    render(
      <VoucherStatement
        card={cardWithZeroBalance}
        transactions={reproductionTransactions}
        onEditTransaction={vi.fn()}
      />
    );

    // Saldo disponível: 4.276,89 - 999,56 = 3.277,33
    expect(screen.getByText('R$ 3.277,33')).toBeInTheDocument();
    expect(screen.getAllByText(/\+\s*R\$\s*4\.276,89/).length).toBe(2);
    expect(screen.getAllByText(/−\s*R\$\s*999,56/).length).toBe(2);
  });

  it('groups transactions by month in descending order', () => {
    render(
      <VoucherStatement
        card={mockCard}
        transactions={mockTransactions}
        onEditTransaction={vi.fn()}
      />
    );

    expect(screen.getByText(/Setembro de 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Agosto de 2026/i)).toBeInTheDocument();

    // Transactions inside September
    expect(screen.getByText('Supermercado Extra')).toBeInTheDocument();
    expect(screen.getByText('Recarga Alelo Empresa')).toBeInTheDocument();
    // Transaction inside August
    expect(screen.getByText('Atacadão Compras')).toBeInTheDocument();

    // Unrelated card transaction should not be present
    expect(screen.queryByText('Farmácia Outro Cartão')).not.toBeInTheDocument();
  });

  it('triggers quick action to launch expense with voucher preset', () => {
    const handleEdit = vi.fn();
    const handleClose = vi.fn();

    render(
      <VoucherStatement
        card={mockCard}
        transactions={mockTransactions}
        onEditTransaction={handleEdit}
        onCloseParent={handleClose}
      />
    );

    const expenseBtn = screen.getByRole('button', { name: /Registrar Gasto/i });
    fireEvent.click(expenseBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith({
      paymentMethod: 'voucher',
      cardId: 'card-voucher-1',
      type: 'expense',
    });
  });

  it('triggers quick action to launch recharge/income with voucher preset', () => {
    const handleEdit = vi.fn();
    const handleClose = vi.fn();

    render(
      <VoucherStatement
        card={mockCard}
        transactions={mockTransactions}
        onEditTransaction={handleEdit}
        onCloseParent={handleClose}
      />
    );

    const incomeBtn = screen.getByRole('button', { name: /Registrar Recarga/i });
    fireEvent.click(incomeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith({
      paymentMethod: 'voucher',
      cardId: 'card-voucher-1',
      type: 'income',
    });
  });

  it('triggers edit transaction callback when clicking edit icon on an item', () => {
    const handleEdit = vi.fn();
    const handleClose = vi.fn();

    render(
      <VoucherStatement
        card={mockCard}
        transactions={mockTransactions}
        onEditTransaction={handleEdit}
        onCloseParent={handleClose}
      />
    );

    const editButtons = screen.getAllByRole('button', { name: /Editar lançamento/i });
    expect(editButtons.length).toBe(3);

    fireEvent.click(editButtons[0]);
    expect(handleClose).toHaveBeenCalled();
    expect(handleEdit).toHaveBeenCalledWith(mockTransactions[0]);
  });

  it('renders empty state when there are no transactions for the card', () => {
    render(
      <VoucherStatement
        card={mockCard}
        transactions={[]}
        onEditTransaction={vi.fn()}
      />
    );

    expect(
      screen.getByText('Nenhuma movimentação registrada neste cartão voucher.')
    ).toBeInTheDocument();
    expect(screen.getByText('Histórico de Movimentações (0)')).toBeInTheDocument();
  });
});
