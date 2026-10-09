import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioAllocationDonut } from '../PortfolioAllocationDonut';
import type { PortfolioAllocationSummary } from '../../../../core/portfolio/portfolioTypes';

describe('PortfolioAllocationDonut - Gráfico Circular Interativo', () => {
  const mockSummary: PortfolioAllocationSummary = {
    totalInvestedAssetsBRL: 8000,
    totalPortfolioCashBRL: 2000,
    consolidatedTotalBRL: 10000,
    denominatorUsedBRL: 10000,
    includeCashInTargets: true,
    sumTargetsPercentage: 100,
    isTargetSumValid: true,
    targetDiscrepancyPercent: 0,
    categories: [
      {
        category: 'Ações Brasil',
        targetPercentage: 50,
        currentValueBRL: 5000,
        currentPercentage: 50,
        differenceBRL: 0,
        allocationRatio: 1,
      },
      {
        category: 'Fundos Imobiliários',
        targetPercentage: 30,
        currentValueBRL: 3000,
        currentPercentage: 30,
        differenceBRL: 0,
        allocationRatio: 1,
      },
    ],
    assets: [
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
        currentPriceOriginal: 50,
        currentFxRateToBRL: 1,
        currentPriceBRL: 50,
        currentValueOriginal: 5000,
        currentValueBRL: 5000,
        unrealizedPnLBRL: 2000,
        unrealizedPnLPercent: 66.7,
        assetReturnPercentOriginal: 66.7,
        fxReturnPercent: 0,
        movementCount: 1,
        ledgerChecksum: 'c1',
        lastMovementDate: '2026-01-01',
        institution: 'XP Investimentos',
      },
      {
        assetId: 'ast-2',
        ticker: 'KNRI11',
        name: 'Kinea RI',
        category: 'Fundos Imobiliários',
        currency: 'BRL',
        market: 'B3',
        targetPercentage: 30,
        quantity: 30,
        hasKnownQuantity: true,
        isBalanceOnly: false,
        hasKnownCost: true,
        avgCostOriginal: 100,
        avgCostBRL: 100,
        totalInvestedBRL: 3000,
        realizedPnLOriginal: 0,
        realizedPnLBRL: 0,
        totalDividendsOriginal: 0,
        totalDividendsBRL: 0,
        currentPriceOriginal: 100,
        currentFxRateToBRL: 1,
        currentPriceBRL: 100,
        currentValueOriginal: 3000,
        currentValueBRL: 3000,
        unrealizedPnLBRL: 0,
        unrealizedPnLPercent: 0,
        assetReturnPercentOriginal: 0,
        fxReturnPercent: 0,
        movementCount: 1,
        ledgerChecksum: 'c2',
        lastMovementDate: '2026-01-01',
        institution: 'BTG Pactual',
      },
    ],
  };

  it('deve renderizar o gráfico donut com visão por classe por padrão', () => {
    render(<PortfolioAllocationDonut summary={mockSummary} />);

    expect(screen.getByTestId('portfolio-allocation-donut')).toBeInTheDocument();
    expect(screen.getByText('Distribuição da Carteira')).toBeInTheDocument();
    expect(screen.getByText('Ações Brasil')).toBeInTheDocument();
    expect(screen.getByText('Fundos Imobiliários')).toBeInTheDocument();
    expect(screen.getByText('Caixa da Carteira')).toBeInTheDocument();

    const classTab = screen.getByTestId('donut-mode-class');
    expect(classTab).toHaveAttribute('aria-selected', 'true');
  });

  it('deve permitir alternar para visualização por corretora custodiante', () => {
    render(<PortfolioAllocationDonut summary={mockSummary} />);

    const instTab = screen.getByTestId('donut-mode-institution');
    fireEvent.click(instTab);

    expect(instTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('XP Investimentos')).toBeInTheDocument();
    expect(screen.getByText('BTG Pactual')).toBeInTheDocument();
  });

  it('deve exibir detalhes no centro do donut ao passar o mouse sobre um item da legenda', () => {
    render(<PortfolioAllocationDonut summary={mockSummary} />);

    const legendItem = screen.getByTestId('donut-legend-item-0');
    fireEvent.mouseEnter(legendItem);

    // O centro do donut agora exibe o valor da fatia focada
    expect(screen.getByTestId('donut-center-value')).toHaveTextContent('R$ 5.000,00');
    expect(screen.getByTestId('donut-center-label')).toHaveTextContent('Ações Brasil');

    fireEvent.mouseLeave(legendItem);
    // Retorna ao valor consolidado total
    expect(screen.getByTestId('donut-center-value')).toHaveTextContent('R$ 10.000,00');
    expect(screen.getByTestId('donut-center-label')).toHaveTextContent('Patrimônio');
  });

  it('deve lidar com carteira vazia exibindo mensagem pedagógica', () => {
    const emptySummary: PortfolioAllocationSummary = {
      ...mockSummary,
      consolidatedTotalBRL: 0,
      totalInvestedAssetsBRL: 0,
      totalPortfolioCashBRL: 0,
      categories: [],
      assets: [],
    };

    render(<PortfolioAllocationDonut summary={emptySummary} />);
    expect(
      screen.getByText(/Nenhuma alocação com saldo registrado para gerar a visualização gráfica/i)
    ).toBeInTheDocument();
  });
});
