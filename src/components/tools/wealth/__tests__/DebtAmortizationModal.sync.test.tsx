import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DebtAmortizationModal } from '../DebtAmortizationModal';
import type { DebtItem } from '../../../../services/debt/debt.types';

// Mocks
const mockAmortize = vi.fn().mockResolvedValue({});
vi.mock('../../../../services/debt/debt.hooks', () => ({
  useAmortizeDebt: () => ({
    mutateAsync: mockAmortize,
    isPending: false,
  }),
}));

const mockAddToast = vi.fn();
vi.mock('../../../../contexts/ToastContext', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

const mockAddTransaction = vi.fn().mockResolvedValue('tx-123');
vi.mock('../../../../services/transactionService', () => ({
  addTransaction: (...args: any[]) => mockAddTransaction(...args),
}));

describe('DebtAmortizationModal — Sincronia Automática com o Controla (F4.3.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDebt: DebtItem = {
    id: 'debt-consignado',
    nome: 'Crédito Consignado',
    tipo: 'emprestimo',
    saldoDevedor: 5000,
    taxaMensal: 1.5,
    parcelasRestantes: 10,
    valorParcela: 500,
    dataVencimento: '2026-10-05',
    totalParcelas: 20,
    parcelasPagas: 10,
    historicoPagamentos: [],
  };

  it('exibe checkbox de sincronia com o Controla marcado por padrão', () => {
    render(
      <DebtAmortizationModal
        debt={mockDebt}
        userId="user-soberano"
        isOpen={true}
        onClose={vi.fn()}
      />
    );

    const checkbox = screen.getByRole('checkbox', {
      name: /registrar despesa no controla automaticamente/i,
    });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toBeChecked();
  });

  it('registra despesa no Controla e amortiza dívida ao confirmar com checkbox marcado', async () => {
    const handleClose = vi.fn();
    render(
      <DebtAmortizationModal
        debt={mockDebt}
        userId="user-soberano"
        isOpen={true}
        onClose={handleClose}
      />
    );

    const confirmBtn = screen.getByRole('button', { name: /confirmar abate/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockAmortize).toHaveBeenCalledWith({
        debtId: 'debt-consignado',
        options: {
          tipo: 'normal',
          valorExtra: undefined,
        },
      });
      expect(mockAddTransaction).toHaveBeenCalledWith('user-soberano', expect.objectContaining({
        type: 'expense',
        category: 'Dívidas',
        amount: 500,
        description: expect.stringContaining('Crédito Consignado'),
      }));
      expect(mockAddToast).toHaveBeenCalledWith(
        expect.stringContaining('registrada no Controla'),
        'success'
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it('não cria despesa no Controla se o usuário desmarcar o checkbox', async () => {
    const handleClose = vi.fn();
    render(
      <DebtAmortizationModal
        debt={mockDebt}
        userId="user-soberano"
        isOpen={true}
        onClose={handleClose}
      />
    );

    const checkbox = screen.getByRole('checkbox', {
      name: /registrar despesa no controla automaticamente/i,
    });
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    const confirmBtn = screen.getByRole('button', { name: /confirmar abate/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockAmortize).toHaveBeenCalled();
      expect(mockAddTransaction).not.toHaveBeenCalled();
      expect(handleClose).toHaveBeenCalled();
    });
  });
});
