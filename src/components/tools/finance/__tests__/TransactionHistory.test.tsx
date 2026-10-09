import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionHistory from '../TransactionHistory';

vi.mock('../../../../hooks/useCards', () => ({
  useCards: () => ({
    cards: [
      { id: 'card-santander', name: 'Santander' },
      { id: 'card-mp', name: 'Mercado Pago' },
    ],
  }),
}));

vi.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'user-1' },
  }),
}));

describe('TransactionHistory - Compras Parceladas e Faturas Previstas', () => {
  const onDeleteMock = vi.fn();
  const onEditMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockTransactions = [
    // Parcela 4/6 de compra antiga (feita em julho) com data contábil futura no mês atual (outubro)
    {
      id: 'tx-parcela-4',
      description: 'Condicionador Tina (4/6)',
      amount: 21.5,
      date: '2026-10-23',
      purchaseDate: '2026-07-23',
      paymentMethod: 'credit',
      cardId: 'card-santander',
      installments: 6,
      currentInstallment: 4,
      category: 'Supermercado',
      type: 'expense',
    },
    // Parcela 2/2 de compra antiga (feita em setembro) com data contábil futura
    {
      id: 'tx-parcela-2',
      description: 'Manitol 20% (2/2)',
      amount: 45.0,
      date: '2026-10-29',
      paymentMethod: 'credit',
      cardId: 'card-santander',
      installments: 2,
      currentInstallment: 2,
      category: 'Saúde',
      type: 'expense',
    },
    // Despesa legítima agendada manualmente para o final do mês
    {
      id: 'tx-agendada-real',
      description: 'Pagar IPVA',
      amount: 350.0,
      date: '2026-10-30',
      paymentMethod: 'money',
      category: 'Transporte',
      type: 'expense',
    },
    // Compra comum do dia a dia feita hoje
    {
      id: 'tx-hoje',
      description: 'Hortifruti',
      amount: 29.11,
      date: '2026-10-08',
      paymentMethod: 'credit',
      cardId: 'card-santander',
      category: 'Supermercado',
      type: 'expense',
    },
    // Fatura prevista virtual do Santander
    {
      id: 'virtual-inv-card-santander',
      description: 'Lançamento futuro - Fatura Santander',
      amount: 95.61,
      date: '2026-10-08',
      dueDate: '2026-10-25',
      category: 'Lançamento futuro - Cartão Santander',
      type: 'expense',
      paymentMethod: 'money',
      isVirtual: true,
      isFutureLaunch: true,
      cardId: 'card-santander',
      linkedCardId: 'card-santander',
      linkedInvoicePeriodEnd: '2026-10-20',
    },
  ];

  const invoiceLookupMock = new Map([
    [
      'card-santander-2026-10-20',
      {
        transacoes: [
          {
            id: 'tx-parcela-4',
            description: 'Condicionador Tina (4/6)',
            amount: 21.5,
            date: '2026-10-23',
            purchaseDate: '2026-07-23',
            installments: 6,
            currentInstallment: 4,
          },
          {
            id: 'tx-parcela-2',
            description: 'Manitol 20% (2/2)',
            amount: 45.0,
            date: '2026-10-29',
            installments: 2,
            currentInstallment: 2,
          },
          {
            id: 'tx-hoje',
            description: 'Hortifruti',
            amount: 29.11,
            date: '2026-10-08',
          },
        ],
        total: 95.61,
      },
    ],
  ]);

  it('não exibe parcelas antigas (currentInstallment > 1) em Despesas Agendadas nem no extrato de despesas correntes', () => {
    render(
      <TransactionHistory
        transactions={mockTransactions}
        onDelete={onDeleteMock}
        onEdit={onEditMock}
        isPrivacyMode={false}
        invoiceLookup={invoiceLookupMock}
      />
    );

    // Despesa agendada legítima deve aparecer em Despesas agendadas
    expect(screen.getByText('Pagar IPVA')).toBeInTheDocument();
    expect(screen.getByText('Despesas agendadas (1)')).toBeInTheDocument();

    // Condicionador Tina e Manitol NÃO devem aparecer soltos como despesas agendadas nem no extrato principal
    expect(screen.queryByText('Condicionador Tina (4/6)')).not.toBeInTheDocument();
    expect(screen.queryByText('Manitol 20% (2/2)')).not.toBeInTheDocument();

    // Compra realizada de hoje deve aparecer normalmente
    expect(screen.getByText('Hortifruti')).toBeInTheDocument();
  });

  it('permite abrir Faturas Previstas e expandir a fatura para ver as parcelas com data de compra original', () => {
    render(
      <TransactionHistory
        transactions={mockTransactions}
        allTransactions={mockTransactions}
        onDelete={onDeleteMock}
        onEdit={onEditMock}
        isPrivacyMode={false}
        invoiceLookup={invoiceLookupMock}
      />
    );

    // Clica para abrir as Faturas Previstas
    const btnFaturas = screen.getByText(/Faturas previstas/i);
    fireEvent.click(btnFaturas);

    // A fatura do Santander aparece
    expect(screen.getByText('Fatura Santander')).toBeInTheDocument();

    // Clica na linha da fatura para expandir a composição
    const faturaRow = screen.getByText('Fatura Santander').closest('tr');
    expect(faturaRow).toBeTruthy();
    fireEvent.click(faturaRow!);

    // Agora sim: dentro da fatura, as parcelas aparecem!
    expect(screen.getByText('Condicionador Tina (4/6)')).toBeInTheDocument();
    expect(screen.getByText('Manitol 20% (2/2)')).toBeInTheDocument();

    // A data original da compra é exibida (23/07/2026 e 29/09/2026)
    expect(screen.getByText(/Compra original: 23\/07\/2026/i)).toBeInTheDocument();
    expect(screen.getByText(/Compra original: 29\/09\/2026/i)).toBeInTheDocument();
  });

  it('permite acionar edição ou exclusão de um item de dentro da composição da fatura prevista', () => {
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <TransactionHistory
        transactions={mockTransactions}
        allTransactions={mockTransactions}
        onDelete={onDeleteMock}
        onEdit={onEditMock}
        isPrivacyMode={false}
        invoiceLookup={invoiceLookupMock}
      />
    );

    // Abre faturas previstas e expande
    fireEvent.click(screen.getByText(/Faturas previstas/i));
    fireEvent.click(screen.getByText('Fatura Santander').closest('tr')!);

    // Clica no botão de excluir da parcela do Condicionador Tina
    const deleteBtns = screen.getAllByTitle('Excluir lançamento');
    fireEvent.click(deleteBtns[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(onDeleteMock).toHaveBeenCalledWith('tx-parcela-4');
  });
});
