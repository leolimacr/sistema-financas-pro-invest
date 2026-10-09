import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgendaSyncBillsModal } from '../AgendaSyncBillsModal';
import type { RecurringBill } from '../../../types';
import type { AgendaCommitment } from '../../../services/agendaService';

const mockRecurringBills: RecurringBill[] = [
  {
    id: 'bill-1',
    userId: 'user-1',
    name: 'Aluguel',
    amount: 1500,
    dueDay: 10,
    category: 'Moradia',
    isActive: true,
    paymentMethod: 'pix',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'bill-2',
    userId: 'user-1',
    name: 'Internet Fibra',
    amount: 120,
    dueDay: 15,
    category: 'Utilidades',
    isActive: true,
    paymentMethod: 'debit',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockAllMonths: Record<string, AgendaCommitment[]> = {
  '2026-8': [
    {
      id: 'c-1',
      title: 'Pagar Aluguel',
      date: { toDate: () => new Date(2026, 8, 10) } as any,
      completed: true,
      source: 'controla_bill',
      amount: 1500,
      createdAt: { toDate: () => new Date() } as any,
      updatedAt: { toDate: () => new Date() } as any,
    },
  ],
};

describe('AgendaSyncBillsModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 15, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('não renderiza quando open=false', () => {
    const { container } = render(
      <AgendaSyncBillsModal
        open={false}
        initialYear={2026}
        initialMonth={8}
        recurringBills={mockRecurringBills}
        allMonths={mockAllMonths}
        isSyncing={false}
        onClose={vi.fn()}
        onConfirmSync={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título e mês inicial selecionado', () => {
    render(
      <AgendaSyncBillsModal
        open={true}
        initialYear={2026}
        initialMonth={8}
        recurringBills={mockRecurringBills}
        allMonths={mockAllMonths}
        isSyncing={false}
        onClose={vi.fn()}
        onConfirmSync={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Sincronizar Contas')).toBeInTheDocument();
    expect(screen.getByTestId('sync-selected-month-label')).toHaveTextContent('Setembro 2026');
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 contas ativas
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 já sincronizada em Setembro
  });

  it('permite alternar para o próximo mês via atalho rápido e chamar onConfirmSync com Outubro', () => {
    const onConfirmSync = vi.fn();
    render(
      <AgendaSyncBillsModal
        open={true}
        initialYear={2026}
        initialMonth={8} // Setembro
        recurringBills={mockRecurringBills}
        allMonths={mockAllMonths}
        isSyncing={false}
        onClose={vi.fn()}
        onConfirmSync={onConfirmSync}
      />
    );

    // Clica no atalho Próximo Mês
    const nextMonthChip = screen.getByTestId('sync-select-next-month');
    fireEvent.click(nextMonthChip);

    expect(screen.getByTestId('sync-selected-month-label')).toHaveTextContent('Outubro 2026');

    // Clica no botão de sincronizar
    const confirmBtn = screen.getByTestId('sync-confirm-button');
    fireEvent.click(confirmBtn);

    expect(onConfirmSync).toHaveBeenCalledTimes(1);
    expect(onConfirmSync).toHaveBeenCalledWith(2026, 9); // Outubro (mês 9)
  });

  it('permite avançar e recuar mês com as setas < e >', () => {
    const onConfirmSync = vi.fn();
    render(
      <AgendaSyncBillsModal
        open={true}
        initialYear={2026}
        initialMonth={8}
        recurringBills={mockRecurringBills}
        allMonths={mockAllMonths}
        isSyncing={false}
        onClose={vi.fn()}
        onConfirmSync={onConfirmSync}
      />
    );

    // Avança 2 meses
    fireEvent.click(screen.getByTestId('sync-month-next'));
    expect(screen.getByTestId('sync-selected-month-label')).toHaveTextContent('Outubro 2026');
    fireEvent.click(screen.getByTestId('sync-month-next'));
    expect(screen.getByTestId('sync-selected-month-label')).toHaveTextContent('Novembro 2026');

    // Recua 1 mês
    fireEvent.click(screen.getByTestId('sync-month-prev'));
    expect(screen.getByTestId('sync-selected-month-label')).toHaveTextContent('Outubro 2026');

    fireEvent.click(screen.getByTestId('sync-confirm-button'));
    expect(onConfirmSync).toHaveBeenCalledWith(2026, 9);
  });

  it('chama onClose ao clicar em Cancelar', () => {
    const onClose = vi.fn();
    render(
      <AgendaSyncBillsModal
        open={true}
        initialYear={2026}
        initialMonth={8}
        recurringBills={mockRecurringBills}
        allMonths={mockAllMonths}
        isSyncing={false}
        onClose={onClose}
        onConfirmSync={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Cancelar'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
