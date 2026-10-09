import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgendaSyncedBillsPanel } from '../AgendaSyncedBillsPanel';
import type { AgendaCommitment } from '../../../services/agendaService';
import type { RecurringBill } from '../../../types';
import { Timestamp } from 'firebase/firestore';

const mockSyncedCommitments: AgendaCommitment[] = [
  {
    id: 'commit-1',
    title: 'Pagar Aluguel',
    date: { toDate: () => new Date(2026, 8, 10, 9, 0, 0) } as any,
    time: '09:00',
    completed: false,
    source: 'controla_bill',
    linkedBillId: 'bill-1',
    amount: 1500,
    category: 'Moradia',
    notes: 'Conta do Controla no valor de R$ 1.500,00.',
  },
  {
    id: 'commit-2',
    title: 'Pagar Internet',
    date: { toDate: () => new Date(2026, 8, 15, 9, 0, 0) } as any,
    time: '09:00',
    completed: true,
    source: 'controla_bill',
    linkedBillId: 'bill-2',
    amount: 120,
    category: 'Serviços',
    notes: 'Conta do Controla no valor de R$ 120,00.',
  },
  {
    id: 'commit-3',
    title: 'Consulta Médica',
    date: { toDate: () => new Date(2026, 8, 18, 14, 0, 0) } as any,
    time: '14:00',
    completed: false,
    notes: 'Levar exames anteriores.',
  },
];

const mockRecurringBills: RecurringBill[] = [
  {
    id: 'bill-1',
    name: 'Aluguel',
    amount: 1500,
    dueDay: 10,
    category: 'Moradia',
    type: 'fixed',
    isActive: true,
    userId: 'user-1',
  },
  {
    id: 'bill-2',
    name: 'Internet',
    amount: 120,
    dueDay: 15,
    category: 'Serviços',
    type: 'fixed',
    isActive: true,
    userId: 'user-1',
  },
  {
    id: 'bill-3',
    name: 'Academia',
    amount: 90,
    dueDay: 20,
    category: 'Saúde',
    type: 'subscription',
    isActive: true,
    userId: 'user-1',
  },
];

describe('AgendaSyncedBillsPanel', () => {
  it('não renderiza nada quando show for falso', () => {
    const { container } = render(
      <AgendaSyncedBillsPanel
        show={false}
        activeYear={2026}
        activeMonth={8}
        commitments={mockSyncedCommitments}
        recurringBills={mockRecurringBills}
        isSyncing={false}
        onClose={vi.fn()}
        onToggleCommitment={vi.fn()}
        onFocusCommitment={vi.fn()}
        onSyncAgain={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza apenas as contas sincronizadas, excluindo compromissos comuns', () => {
    render(
      <AgendaSyncedBillsPanel
        show={true}
        activeYear={2026}
        activeMonth={8}
        commitments={mockSyncedCommitments}
        recurringBills={mockRecurringBills}
        isSyncing={false}
        onClose={vi.fn()}
        onToggleCommitment={vi.fn()}
        onFocusCommitment={vi.fn()}
        onSyncAgain={vi.fn()}
      />
    );

    expect(screen.getByText('Contas Sincronizadas do Controla')).toBeInTheDocument();
    expect(screen.getByText('Pagar Aluguel')).toBeInTheDocument();
    expect(screen.getByText('Pagar Internet')).toBeInTheDocument();
    // Consulta médica NÃO é conta sincronizada e não deve aparecer
    expect(screen.queryByText('Consulta Médica')).not.toBeInTheDocument();
  });

  it('calcula e exibe corretamente os totais consolidados', () => {
    render(
      <AgendaSyncedBillsPanel
        show={true}
        activeYear={2026}
        activeMonth={8}
        commitments={mockSyncedCommitments}
        recurringBills={mockRecurringBills}
        isSyncing={false}
        onClose={vi.fn()}
        onToggleCommitment={vi.fn()}
        onFocusCommitment={vi.fn()}
        onSyncAgain={vi.fn()}
      />
    );

    // Total: 1500 + 120 = 1620
    expect(screen.getByText(/1\.620,00/)).toBeInTheDocument();
    // Quitadas: 120 (aparece no banner e no item da lista)
    expect(screen.getAllByText(/120,00/).length).toBe(2);
    // Pendentes: 1500 (aparece no banner e no item da lista)
    expect(screen.getAllByText(/1\.500,00/).length).toBe(2);
  });

  it('filtra corretamente por Pendentes e Pagas', () => {
    render(
      <AgendaSyncedBillsPanel
        show={true}
        activeYear={2026}
        activeMonth={8}
        commitments={mockSyncedCommitments}
        recurringBills={mockRecurringBills}
        isSyncing={false}
        onClose={vi.fn()}
        onToggleCommitment={vi.fn()}
        onFocusCommitment={vi.fn()}
        onSyncAgain={vi.fn()}
      />
    );

    // Clica em 'Pendentes'
    fireEvent.click(screen.getByTestId('synced-filter-pending'));
    expect(screen.getByText('Pagar Aluguel')).toBeInTheDocument();
    expect(screen.queryByText('Pagar Internet')).not.toBeInTheDocument();

    // Clica em 'Pagas'
    fireEvent.click(screen.getByTestId('synced-filter-paid'));
    expect(screen.queryByText('Pagar Aluguel')).not.toBeInTheDocument();
    expect(screen.getByText('Pagar Internet')).toBeInTheDocument();

    // Retorna para 'Todas'
    fireEvent.click(screen.getByTestId('synced-filter-all'));
    expect(screen.getByText('Pagar Aluguel')).toBeInTheDocument();
    expect(screen.getByText('Pagar Internet')).toBeInTheDocument();
  });

  it('chama onToggleCommitment ao clicar no checkbox de quitação', () => {
    const onToggleMock = vi.fn();
    render(
      <AgendaSyncedBillsPanel
        show={true}
        activeYear={2026}
        activeMonth={8}
        commitments={mockSyncedCommitments}
        recurringBills={mockRecurringBills}
        isSyncing={false}
        onClose={vi.fn()}
        onToggleCommitment={onToggleMock}
        onFocusCommitment={vi.fn()}
        onSyncAgain={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('synced-bill-toggle-commit-1'));
    // Estava false, deve alternar para true
    expect(onToggleMock).toHaveBeenCalledWith('commit-1', true);
  });

  it('chama onFocusCommitment ao clicar em "Ver"', () => {
    const onFocusMock = vi.fn();
    render(
      <AgendaSyncedBillsPanel
        show={true}
        activeYear={2026}
        activeMonth={8}
        commitments={mockSyncedCommitments}
        recurringBills={mockRecurringBills}
        isSyncing={false}
        onClose={vi.fn()}
        onToggleCommitment={vi.fn()}
        onFocusCommitment={onFocusMock}
        onSyncAgain={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('synced-bill-focus-commit-1'));
    expect(onFocusMock).toHaveBeenCalledWith(mockSyncedCommitments[0]);
  });

  it('chama onClose ao clicar no botão de fechar [X]', () => {
    const onCloseMock = vi.fn();
    render(
      <AgendaSyncedBillsPanel
        show={true}
        activeYear={2026}
        activeMonth={8}
        commitments={mockSyncedCommitments}
        recurringBills={mockRecurringBills}
        isSyncing={false}
        onClose={onCloseMock}
        onToggleCommitment={vi.fn()}
        onFocusCommitment={vi.fn()}
        onSyncAgain={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('synced-panel-close'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('exibe estado vazio quando não há contas sincronizadas', () => {
    const onSyncAgainMock = vi.fn();
    render(
      <AgendaSyncedBillsPanel
        show={true}
        activeYear={2026}
        activeMonth={8}
        commitments={[]}
        recurringBills={mockRecurringBills}
        isSyncing={false}
        onClose={vi.fn()}
        onToggleCommitment={vi.fn()}
        onFocusCommitment={vi.fn()}
        onSyncAgain={onSyncAgainMock}
      />
    );

    expect(screen.getByText(/Nenhuma conta sincronizada em/)).toBeInTheDocument();
    const btn = screen.getByTestId('synced-panel-empty-sync');
    fireEvent.click(btn);
    expect(onSyncAgainMock).toHaveBeenCalledTimes(1);
  });
});
