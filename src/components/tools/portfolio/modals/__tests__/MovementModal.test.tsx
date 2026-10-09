import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MovementModal } from '../MovementModal';
import type {
  PortfolioAsset,
  DerivedAssetPosition,
  PortfolioMovement,
} from '../../../../../core/portfolio/portfolioTypes';

const mockAssets: PortfolioAsset[] = [
  {
    id: 'asset-petr4',
    userId: 'user-1',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    category: 'Ações Brasil',
    currency: 'BRL',
    market: 'B3',
    targetPercentage: 20,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'asset-caixa',
    userId: 'user-1',
    ticker: 'CAIXA',
    name: 'Caixa de Oportunidade',
    category: 'Caixa de Oportunidade',
    currency: 'BRL',
    market: 'CASH',
    isBalanceOnly: true,
    isOpportunityCash: true,
    targetPercentage: 5,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
];

const mockPositions: DerivedAssetPosition[] = [
  {
    assetId: 'asset-petr4',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    category: 'Ações Brasil',
    currency: 'BRL',
    market: 'B3',
    targetPercentage: 20,
    quantity: 100,
    hasKnownQuantity: true,
    isBalanceOnly: false,
    hasKnownCost: true,
    avgCostOriginal: 30,
    avgCostBRL: 30,
    totalInvestedBRL: 3000,
    realizedPnLOriginal: 0,
    realizedPnLBRL: 0,
    totalDividendsOriginal: 0,
    totalDividendsBRL: 0,
    currentPriceOriginal: 35,
    currentFxRateToBRL: 1.0,
    currentPriceBRL: 35,
    currentValueOriginal: 3500,
    currentValueBRL: 3500,
    unrealizedPnLBRL: 500,
    unrealizedPnLPercent: 16.67,
    assetReturnPercentOriginal: 16.67,
    fxReturnPercent: 0,
    movementCount: 1,
    ledgerChecksum: '12345678',
    lastMovementDate: '2026-09-01',
  },
  {
    assetId: 'asset-caixa',
    ticker: 'CAIXA',
    name: 'Caixa de Oportunidade',
    category: 'Caixa de Oportunidade',
    currency: 'BRL',
    market: 'CASH',
    targetPercentage: 5,
    quantity: null,
    hasKnownQuantity: false,
    isBalanceOnly: true,
    hasKnownCost: false,
    avgCostOriginal: null,
    avgCostBRL: null,
    totalInvestedBRL: null,
    realizedPnLOriginal: 0,
    realizedPnLBRL: 0,
    totalDividendsOriginal: 0,
    totalDividendsBRL: 0,
    currentPriceOriginal: 1.0,
    currentFxRateToBRL: 1.0,
    currentPriceBRL: 1.0,
    currentValueOriginal: 1000,
    currentValueBRL: 1000,
    unrealizedPnLBRL: null,
    unrealizedPnLPercent: null,
    assetReturnPercentOriginal: null,
    fxReturnPercent: null,
    movementCount: 1,
    ledgerChecksum: '87654321',
    lastMovementDate: '2026-09-01',
  },
];

describe('MovementModal', () => {
  it('1. Renderiza o modal corretamente quando aberto', () => {
    render(
      <MovementModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        assets={mockAssets}
        positions={mockPositions}
        userId="user-1"
      />
    );

    expect(screen.getByText('Novo Lançamento na Carteira')).toBeInTheDocument();
    expect(screen.getByText('Ativo Alvo *')).toBeInTheDocument();
    expect(screen.getByText('Tipo de Operação *')).toBeInTheDocument();
  });

  it('2. Não renderiza nada quando isOpen é false', () => {
    const { container } = render(
      <MovementModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
        assets={mockAssets}
        positions={mockPositions}
        userId="user-1"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('3. Selecionar Caixa da Carteira (PORTFOLIO_CASH) renderiza saldo disponível e alerta reativo sem crashes de runtime', () => {
    render(
      <MovementModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        assets={mockAssets}
        positions={mockPositions}
        userId="user-1"
      />
    );

    // Muda a fonte de recursos para PORTFOLIO_CASH
    const fundingSelect = screen.getByLabelText(/Origem dos Recursos/i);
    fireEvent.change(fundingSelect, { target: { value: 'PORTFOLIO_CASH' } });

    // Saldo disponível em caixa deve ser exibido (R$ 1000.00)
    expect(screen.getByText(/Saldo disponível em caixa:/i)).toBeInTheDocument();
    expect(screen.getByText('R$ 1000.00')).toBeInTheDocument();

    // Digita quantidade e preço que superam o saldo disponível (ex: 50 cotas a R$ 30 = R$ 1500 > R$ 1000)
    const qtyInput = screen.getByPlaceholderText(/Ex: 100/i);
    const priceInput = screen.getByPlaceholderText(/Ex: 35\.50/i);

    fireEvent.change(qtyInput, { target: { value: '50' } });
    fireEvent.change(priceInput, { target: { value: '30' } });

    // Deve exibir o aviso de saldo insuficiente reativo
    expect(
      screen.getByText(/Saldo insuficiente no caixa para cobrir o valor de R\$ 1500\.00\./i)
    ).toBeInTheDocument();
  });

  it('4. Salva a movimentação com sucesso e chama onSave com payload completo', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <MovementModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        assets={mockAssets}
        positions={mockPositions}
        userId="user-1"
      />
    );

    const qtyInput = screen.getByPlaceholderText(/Ex: 100/i);
    const priceInput = screen.getByPlaceholderText(/Ex: 35\.50/i);

    fireEvent.change(qtyInput, { target: { value: '10' } });
    fireEvent.change(priceInput, { target: { value: '25' } });

    const submitBtn = screen.getByRole('button', { name: /Registrar Lançamento/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    const savedMovement: PortfolioMovement = onSaveMock.mock.calls[0][0];
    expect(savedMovement.assetId).toBe('asset-petr4');
    expect(savedMovement.type).toBe('BUY');
    expect(savedMovement.quantity).toBe(10);
    expect(savedMovement.unitPrice).toBe(25);
    expect(savedMovement.grossAmount).toBe(250);
    expect(savedMovement.netAmountBRL).toBe(250);
    expect(savedMovement.status).toBe('ACTIVE');
    expect(savedMovement.createdAt).toBeDefined();
    expect(savedMovement.updatedAt).toBeDefined();
    expect(onCloseMock).toHaveBeenCalled();
  });
});
