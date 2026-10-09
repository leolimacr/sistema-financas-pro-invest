import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RebalanceSimulatorModal } from '../RebalanceSimulatorModal';
import type { DerivedAssetPosition, PortfolioAllocationSummary } from '../../../../../core/portfolio/portfolioTypes';

const mockPositions: DerivedAssetPosition[] = [
  {
    assetId: 'ast-1',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    category: 'Ações Brasil',
    currency: 'BRL',
    market: 'B3',
    targetPercentage: 50,
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
    currentPriceOriginal: 30,
    currentFxRateToBRL: 1.0,
    currentPriceBRL: 30,
    currentValueOriginal: 3000,
    currentValueBRL: 3000,
    unrealizedPnLBRL: 0,
    unrealizedPnLPercent: 0,
    assetReturnPercentOriginal: 0,
    fxReturnPercent: 0,
    movementCount: 1,
    ledgerChecksum: '11111111',
    lastMovementDate: '2026-09-01',
  },
  {
    assetId: 'ast-2',
    ticker: 'KNCR11',
    name: 'Kinea Rendimentos Imobiliários',
    category: 'Fundos Imobiliários',
    currency: 'BRL',
    market: 'B3',
    targetPercentage: 50,
    quantity: 10,
    hasKnownQuantity: true,
    isBalanceOnly: false,
    hasKnownCost: true,
    avgCostOriginal: 100,
    avgCostBRL: 100,
    totalInvestedBRL: 1000,
    realizedPnLOriginal: 0,
    realizedPnLBRL: 0,
    totalDividendsOriginal: 0,
    totalDividendsBRL: 0,
    currentPriceOriginal: 100,
    currentFxRateToBRL: 1.0,
    currentPriceBRL: 100,
    currentValueOriginal: 1000,
    currentValueBRL: 1000,
    unrealizedPnLBRL: 0,
    unrealizedPnLPercent: 0,
    assetReturnPercentOriginal: 0,
    fxReturnPercent: 0,
    movementCount: 1,
    ledgerChecksum: '22222222',
    lastMovementDate: '2026-09-01',
  },
];

const mockSummary: PortfolioAllocationSummary = {
  totalInvestedAssetsBRL: 4000,
  totalPortfolioCashBRL: 500,
  consolidatedTotalBRL: 4500,
  denominatorUsedBRL: 4000,
  includeCashInTargets: false,
  sumTargetsPercentage: 100,
  isTargetSumValid: true,
  targetDiscrepancyPercent: 0,
  categories: [],
  assets: mockPositions,
};

describe('RebalanceSimulatorModal', () => {
  it('1. Renderiza o modal com sugestões de aporte para os ativos mais distantes da meta', () => {
    render(
      <RebalanceSimulatorModal
        isOpen={true}
        onClose={vi.fn()}
        positions={mockPositions}
        summary={mockSummary}
      />
    );

    expect(screen.getByText('Simulador de Aportes Inteligentes')).toBeInTheDocument();
    expect(screen.getByText('Valor do Novo Aporte (R$)')).toBeInTheDocument();
    expect(screen.getByText(/Plano de Compras Sugerido para Rebalanceamento/i)).toBeInTheDocument();
    expect(screen.getByText('PETR4')).toBeInTheDocument();
    expect(screen.getByText('KNCR11')).toBeInTheDocument();
  });

  it('2. Exibe o checkbox para somar o Caixa de Oportunidade quando disponível', () => {
    render(
      <RebalanceSimulatorModal
        isOpen={true}
        onClose={vi.fn()}
        positions={mockPositions}
        summary={mockSummary}
      />
    );

    const checkbox = screen.getByRole('checkbox', {
      name: /Somar Caixa de Oportunidade ao Aporte/i,
    });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('3. Exibe barra de Saldo Livre Real e permite preencher o aporte com 1 clique', () => {
    render(
      <RebalanceSimulatorModal
        isOpen={true}
        onClose={vi.fn()}
        positions={mockPositions}
        summary={mockSummary}
        availableFreeBalance={3200}
      />
    );

    expect(screen.getByTestId('rebalance-free-balance-bar')).toBeInTheDocument();
    expect(screen.getByText(/3.200,00/)).toBeInTheDocument();

    const useBtn = screen.getByTestId('btn-use-free-balance');
    fireEvent.click(useBtn);

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(3200);
  });

  it('4. Exibe aviso defensivo de liquidez quando Saldo Livre Real for negativo ou zero', () => {
    render(
      <RebalanceSimulatorModal
        isOpen={true}
        onClose={vi.fn()}
        positions={mockPositions}
        summary={mockSummary}
        availableFreeBalance={-500}
      />
    );

    expect(screen.getByTestId('rebalance-free-balance-warning')).toBeInTheDocument();
    expect(screen.getByText(/Atenção de Liquidez/i)).toBeInTheDocument();
  });
});
