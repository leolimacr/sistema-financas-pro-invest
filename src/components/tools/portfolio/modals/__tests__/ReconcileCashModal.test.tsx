import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ReconcileCashModal } from '../ReconcileCashModal';
import type { PortfolioAsset, PortfolioMovement, PortfolioCashBalance } from '../../../../../core/portfolio/portfolioTypes';

describe('ReconcileCashModal - Auditoria e Reconciliação do Caixa', () => {
  const mockCashAsset: PortfolioAsset = {
    id: 'asset-caixa-1',
    userId: 'user-123',
    ticker: 'CAIXA',
    name: 'Caixa de Oportunidade',
    category: 'Caixa de Oportunidade',
    currency: 'BRL',
    market: 'CASH',
    isBalanceOnly: true,
    isOpportunityCash: true,
    createdAt: '2026-09-25T10:00:00Z',
    updatedAt: '2026-09-25T10:00:00Z',
  };

  const mockMovements: PortfolioMovement[] = [
    {
      id: 'mov-cash-init',
      userId: 'user-123',
      assetId: 'asset-caixa-1',
      type: 'INITIAL_POSITION',
      date: '2026-09-01',
      quantity: null,
      unitPrice: 0,
      fees: 0,
      grossAmount: 5000,
      netAmount: 5000,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 5000,
      status: 'ACTIVE',
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    },
  ];

  it('1. Não deve renderizar nada quando isOpen for false', () => {
    const { container } = render(
      <ReconcileCashModal
        isOpen={false}
        onClose={vi.fn()}
        cashAssets={[mockCashAsset]}
        movements={mockMovements}
        cashBalances={{}}
        onConfirmSync={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('2. Deve exibir status de 100% íntegro quando ledger e saldo persistido forem iguais', () => {
    const cashBalances: Record<string, PortfolioCashBalance> = {
      'asset-caixa-1': {
        userId: 'user-123',
        cashAssetId: 'asset-caixa-1',
        availableBalanceBRL: 5000,
        version: 1,
        updatedAt: '2026-09-01T10:00:00Z',
      },
    };

    render(
      <ReconcileCashModal
        isOpen={true}
        onClose={vi.fn()}
        cashAssets={[mockCashAsset]}
        movements={mockMovements}
        cashBalances={cashBalances}
        onConfirmSync={vi.fn()}
      />
    );

    expect(screen.getByText(/Caixa 100% Reconciliado e Íntegro/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sincronizar e Reconciliar Caixa/i })).not.toBeInTheDocument();
  });

  it('3. Quando houver divergência, deve exigir confirmação explícita via checkbox antes de liberar o botão de sincronização', async () => {
    // Saldo persistido de R$ 4.000 vs Ledger de R$ 5.000 (Divergência de R$ 1.000)
    const divergentBalances: Record<string, PortfolioCashBalance> = {
      'asset-caixa-1': {
        userId: 'user-123',
        cashAssetId: 'asset-caixa-1',
        availableBalanceBRL: 4000,
        version: 1,
        updatedAt: '2026-09-01T10:00:00Z',
      },
    };

    const handleConfirmSync = vi.fn().mockResolvedValue(undefined);

    render(
      <ReconcileCashModal
        isOpen={true}
        onClose={vi.fn()}
        cashAssets={[mockCashAsset]}
        movements={mockMovements}
        cashBalances={divergentBalances}
        onConfirmSync={handleConfirmSync}
      />
    );

    // Deve exibir alerta de divergência
    expect(screen.getByText(/Divergência Contábil Detectada/i)).toBeInTheDocument();
    expect(screen.getByText(/Divergência apurada:/i)).toBeInTheDocument();

    // Botão de sincronização deve existir mas estar DESABILITADO
    const syncButton = screen.getByRole('button', { name: /Sincronizar e Reconciliar Caixa/i });
    expect(syncButton).toBeDisabled();

    // Clicar no botão desabilitado não deve disparar sincronização
    fireEvent.click(syncButton);
    expect(handleConfirmSync).not.toHaveBeenCalled();

    // Usuário marca a caixa de confirmação explícita
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Agora o botão de sincronização deve estar HABILITADO
    expect(syncButton).not.toBeDisabled();

    // Ao clicar, chama onConfirmSync com o id correto
    fireEvent.click(syncButton);

    await waitFor(() => {
      expect(handleConfirmSync).toHaveBeenCalledTimes(1);
      expect(handleConfirmSync).toHaveBeenCalledWith('asset-caixa-1');
    });

    // Mensagem de sucesso deve ser exibida
    await waitFor(() => {
      expect(screen.getByText(/Caixa reconciliado com sucesso!/i)).toBeInTheDocument();
    });
  });
});
