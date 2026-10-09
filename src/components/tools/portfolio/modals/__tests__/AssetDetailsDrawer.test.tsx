import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetDetailsDrawer } from '../AssetDetailsDrawer';
import type {
  DerivedAssetPosition,
  PortfolioAsset,
  PortfolioMovement,
} from '../../../../../core/portfolio/portfolioTypes';

const mockPosition: DerivedAssetPosition = {
  assetId: 'ast-petr4',
  ticker: 'PETR4',
  name: 'Petrobras PN',
  category: 'Ações Brasil',
  currency: 'BRL',
  market: 'B3',
  targetPercentage: 20,
  institution: 'XP Investimentos',
  quantity: 100,
  hasKnownQuantity: true,
  isBalanceOnly: false,
  hasKnownCost: true,
  avgCostOriginal: 30.0,
  avgCostBRL: 30.0,
  totalInvestedBRL: 3000.0,
  realizedPnLOriginal: 200.0,
  realizedPnLBRL: 200.0,
  totalDividendsOriginal: 350.0,
  totalDividendsBRL: 350.0,
  currentPriceOriginal: 38.0,
  currentFxRateToBRL: 1.0,
  currentPriceBRL: 38.0,
  currentValueOriginal: 3800.0,
  currentValueBRL: 3800.0,
  unrealizedPnLBRL: 800.0,
  unrealizedPnLPercent: 26.67,
  assetReturnPercentOriginal: 26.67,
  fxReturnPercent: 0,
  movementCount: 3,
  ledgerChecksum: 'chk-petr4',
  lastMovementDate: '2026-03-15',
};

const mockAsset: PortfolioAsset = {
  id: 'ast-petr4',
  userId: 'user-1',
  ticker: 'PETR4',
  name: 'Petrobras PN',
  category: 'Ações Brasil',
  currency: 'BRL',
  market: 'B3',
  targetPercentage: 20,
  institution: 'XP Investimentos',
  isBalanceOnly: false,
  notes: 'Tese focada em pagamento recorrente de dividendos e governança sólida.',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockMovements: PortfolioMovement[] = [
  {
    id: 'mov-1',
    userId: 'user-1',
    assetId: 'ast-petr4',
    type: 'BUY',
    date: '2026-01-10',
    quantity: 100,
    unitPrice: 30.0,
    grossAmount: 3000.0,
    netAmountBRL: 3000.0,
    fxRateToBRL: 1.0,
    fundingSource: 'EXTERNAL_NEW_MONEY',
    settlementTarget: 'PORTFOLIO_CASH',
    hasKnownCost: true,
    isVoided: false,
    createdAt: '2026-01-10',
    updatedAt: '2026-01-10',
  },
  {
    id: 'mov-2',
    userId: 'user-1',
    assetId: 'ast-petr4',
    type: 'DIVIDEND',
    date: '2026-02-15',
    quantity: 100,
    unitPrice: 3.5,
    grossAmount: 350.0,
    netAmountBRL: 350.0,
    fxRateToBRL: 1.0,
    fundingSource: 'EXTERNAL_NEW_MONEY',
    settlementTarget: 'PORTFOLIO_CASH',
    hasKnownCost: true,
    notes: 'Dividendo intermediário exercício 2026',
    isVoided: false,
    createdAt: '2026-02-15',
    updatedAt: '2026-02-15',
  },
];

describe('AssetDetailsDrawer - Raio-X Individual do Ativo', () => {
  it('1. Não renderiza nada quando isOpen=false ou position=null', () => {
    const { container: c1 } = render(
      <AssetDetailsDrawer
        isOpen={false}
        position={mockPosition}
        movements={mockMovements}
        onClose={vi.fn()}
      />
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <AssetDetailsDrawer
        isOpen={true}
        position={null}
        movements={mockMovements}
        onClose={vi.fn()}
      />
    );
    expect(c2.firstChild).toBeNull();
  });

  it('2. Renderiza cabeçalho executivo, ticker, mercado, instituição e nome', () => {
    render(
      <AssetDetailsDrawer
        isOpen={true}
        position={mockPosition}
        asset={mockAsset}
        movements={mockMovements}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-asset-ticker')).toHaveTextContent('PETR4');
    expect(screen.getByTestId('drawer-asset-name')).toHaveTextContent('Petrobras PN');
    expect(screen.getByTestId('drawer-badge-institution')).toHaveTextContent('XP Investimentos');
  });

  it('3. Exibe cards de métricas principais (Valor Total, Preço Médio, Ganho de Capital)', () => {
    render(
      <AssetDetailsDrawer
        isOpen={true}
        position={mockPosition}
        asset={mockAsset}
        movements={mockMovements}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByTestId('drawer-total-value')).toHaveTextContent('R$ 3.800,00');
    expect(screen.getByTestId('drawer-unrealized-pnl')).toHaveTextContent('+R$ 800,00');
  });

  it('4. Exibe decomposição do retorno com Ganho de Capital, Proventos e YoC', () => {
    render(
      <AssetDetailsDrawer
        isOpen={true}
        position={mockPosition}
        asset={mockAsset}
        movements={mockMovements}
        onClose={vi.fn()}
      />
    );

    const decompCard = screen.getByTestId('drawer-return-decomposition-card');
    expect(decompCard).toBeInTheDocument();

    // Proventos Recebidos: 350
    expect(screen.getByTestId('drawer-total-dividends')).toHaveTextContent('+R$ 350,00');

    // YoC: (350 / 3000) * 100 = 11,67%
    expect(screen.getByTestId('drawer-yoc-metric')).toHaveTextContent('11,67%');

    // Total Return Consolidado: 800 (não realizado) + 350 (dividendos) + 200 (realizado) = 1350
    expect(screen.getByTestId('drawer-total-return-brl')).toHaveTextContent('+R$ 1.350,00');
  });

  it('5. Alterna entre abas Negociações, Proventos e Metas/Info', () => {
    render(
      <AssetDetailsDrawer
        isOpen={true}
        position={mockPosition}
        asset={mockAsset}
        movements={mockMovements}
        onClose={vi.fn()}
      />
    );

    // Aba inicial: Negociações
    expect(screen.getByTestId('drawer-tab-content-negotiations')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-movement-row-mov-1')).toBeInTheDocument();
    expect(screen.getByText('10/01/2026')).toBeInTheDocument();

    // Clica na aba Proventos
    const divTabBtn = screen.getByTestId('drawer-tab-dividends');
    fireEvent.click(divTabBtn);
    expect(screen.getByTestId('drawer-tab-content-dividends')).toBeInTheDocument();
    expect(screen.getByTestId('drawer-dividend-row-mov-2')).toBeInTheDocument();
    expect(screen.getByText('Dividendo intermediário exercício 2026')).toBeInTheDocument();

    // Clica na aba Metas & Info
    const targetsTabBtn = screen.getByTestId('drawer-tab-targets');
    fireEvent.click(targetsTabBtn);
    expect(screen.getByTestId('drawer-tab-content-targets')).toBeInTheDocument();
    expect(screen.getByText('Meta Alocada no Ativo')).toBeInTheDocument();
    expect(screen.getByText('Tese focada em pagamento recorrente de dividendos e governança sólida.')).toBeInTheDocument();
  });

  it('6. Dispara onClose ao clicar no botão fechar ou pressionar Escape', () => {
    const handleClose = vi.fn();
    render(
      <AssetDetailsDrawer
        isOpen={true}
        position={mockPosition}
        asset={mockAsset}
        movements={mockMovements}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByTestId('drawer-close-btn');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('7. Dispara onAddMovement ao clicar no botão de novo lançamento', () => {
    const handleAddMovement = vi.fn();
    render(
      <AssetDetailsDrawer
        isOpen={true}
        position={mockPosition}
        asset={mockAsset}
        movements={mockMovements}
        onClose={vi.fn()}
        onAddMovement={handleAddMovement}
      />
    );

    const addBtn = screen.getByTestId('drawer-btn-add-movement');
    fireEvent.click(addBtn);
    expect(handleAddMovement).toHaveBeenCalledTimes(1);
    expect(handleAddMovement).toHaveBeenCalledWith('ast-petr4');
  });

  it('8. Dispara onEditAsset ao clicar no botão de editar', () => {
    const handleEditAsset = vi.fn();
    render(
      <AssetDetailsDrawer
        isOpen={true}
        position={mockPosition}
        asset={mockAsset}
        movements={mockMovements}
        onClose={vi.fn()}
        onEditAsset={handleEditAsset}
      />
    );

    const editBtn = screen.getByTestId('drawer-btn-edit-asset');
    fireEvent.click(editBtn);
    expect(handleEditAsset).toHaveBeenCalledTimes(1);
    expect(handleEditAsset).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'PETR4' }));
  });

  it('9. Renderiza o card analítico de marcação na curva de Renda Fixa quando fixedIncomeDetails estiver presente', () => {
    const rfPosition: DerivedAssetPosition = {
      ...mockPosition,
      ticker: 'CDB-INTER',
      name: 'CDB Inter 110% CDI',
      market: 'RF',
      fixedIncomeDetails: {
        calendarDaysElapsed: 180,
        businessDaysElapsed: 124,
        daysToMaturity: 185,
        isMatured: false,
        effectiveAnnualRatePercent: 11.55,
        grossYieldBRL: 577.5,
        grossValueBRL: 10577.5,
        iofRatePercent: 0,
        iofAmountBRL: 0,
        taxRatePercent: 20.0,
        taxAmountBRL: 115.5,
        netYieldBRL: 462.0,
        netValueBRL: 10462.0,
        netReturnPercent: 4.62,
        isTaxExempt: false,
      },
    };

    render(
      <AssetDetailsDrawer
        isOpen={true}
        position={rfPosition}
        asset={mockAsset}
        movements={mockMovements}
        onClose={vi.fn()}
      />
    );

    const rfCard = screen.getByTestId('drawer-rf-curve-card');
    expect(rfCard).toBeInTheDocument();
    expect(rfCard).toHaveTextContent('Marcação na Curva');
    expect(rfCard).toHaveTextContent('11.55% a.a.');
    expect(rfCard).toHaveTextContent('10.577,50');
    expect(rfCard).toHaveTextContent('10.462,00');
  });
});
