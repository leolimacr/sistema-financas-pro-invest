import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortfolioTargetsModal } from '../PortfolioTargetsModal';
import type { PortfolioAsset, DerivedAssetPosition } from '../../../../../core/portfolio/portfolioTypes';

const mockAssets: PortfolioAsset[] = [
  {
    id: 'ast-cdb',
    userId: 'user-1',
    ticker: 'CDB-DAYCOVAL-01',
    name: 'CDB Daycoval IPCA+',
    category: 'Renda Fixa',
    currency: 'BRL',
    market: 'MANUAL',
    targetPercentage: 49.69,
    institution: 'Daycoval',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ast-petr',
    userId: 'user-1',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    category: 'Ações Brasil',
    currency: 'BRL',
    market: 'B3',
    targetPercentage: 25.0,
    institution: 'XP Investimentos',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ast-vale',
    userId: 'user-1',
    ticker: 'VALE3',
    name: 'Vale ON',
    category: 'Ações Brasil',
    currency: 'BRL',
    market: 'B3',
    targetPercentage: 25.0,
    institution: 'XP Investimentos',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

const mockPositions: DerivedAssetPosition[] = [
  {
    assetId: 'ast-cdb',
    ticker: 'CDB-DAYCOVAL-01',
    name: 'CDB Daycoval IPCA+',
    category: 'Renda Fixa',
    currency: 'BRL',
    market: 'MANUAL',
    targetPercentage: 49.69,
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
    currentValueOriginal: 10000.0,
    currentValueBRL: 10000.0,
    unrealizedPnLBRL: null,
    unrealizedPnLPercent: null,
    assetReturnPercentOriginal: 0,
    fxReturnPercent: null,
    movementCount: 1,
    ledgerChecksum: 'c1',
    lastMovementDate: '2026-01-01',
  },
  {
    assetId: 'ast-petr',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    category: 'Ações Brasil',
    currency: 'BRL',
    market: 'B3',
    targetPercentage: 25.0,
    quantity: 100,
    hasKnownQuantity: true,
    isBalanceOnly: false,
    hasKnownCost: true,
    avgCostOriginal: 35.0,
    avgCostBRL: 35.0,
    totalInvestedBRL: 3500.0,
    realizedPnLOriginal: 0,
    realizedPnLBRL: 0,
    totalDividendsOriginal: 0,
    totalDividendsBRL: 0,
    currentPriceOriginal: 40.0,
    currentFxRateToBRL: 1.0,
    currentPriceBRL: 40.0,
    currentValueOriginal: 4000.0,
    currentValueBRL: 4000.0,
    unrealizedPnLBRL: 500.0,
    unrealizedPnLPercent: 14.28,
    assetReturnPercentOriginal: 14.28,
    fxReturnPercent: null,
    movementCount: 1,
    ledgerChecksum: 'c2',
    lastMovementDate: '2026-01-01',
  },
  {
    assetId: 'ast-vale',
    ticker: 'VALE3',
    name: 'Vale ON',
    category: 'Ações Brasil',
    currency: 'BRL',
    market: 'B3',
    targetPercentage: 25.0,
    quantity: 100,
    hasKnownQuantity: true,
    isBalanceOnly: false,
    hasKnownCost: true,
    avgCostOriginal: 60.0,
    avgCostBRL: 60.0,
    totalInvestedBRL: 6000.0,
    realizedPnLOriginal: 0,
    realizedPnLBRL: 0,
    totalDividendsOriginal: 0,
    totalDividendsBRL: 0,
    currentPriceOriginal: 60.0,
    currentFxRateToBRL: 1.0,
    currentPriceBRL: 60.0,
    currentValueOriginal: 6000.0,
    currentValueBRL: 6000.0,
    unrealizedPnLBRL: 0,
    unrealizedPnLPercent: 0,
    assetReturnPercentOriginal: 0,
    fxReturnPercent: null,
    movementCount: 1,
    ledgerChecksum: 'c3',
    lastMovementDate: '2026-01-01',
  },
];

describe('PortfolioTargetsModal - Calibração Panorâmica de Metas da Carteira', () => {
  it('1. Renderiza todos os ativos em uma única tela com soma em tempo real', () => {
    render(
      <PortfolioTargetsModal
        isOpen={true}
        onClose={vi.fn()}
        assets={mockAssets}
        positions={mockPositions}
        onSaveTargets={vi.fn()}
      />
    );

    // Título e subtítulo
    expect(screen.getByText('Metas de Alocação da Carteira')).toBeInTheDocument();

    // Ativos renderizados
    expect(screen.getByText('CDB-DAYCOVAL-01')).toBeInTheDocument();
    expect(screen.getByText('PETR4')).toBeInTheDocument();
    expect(screen.getByText('VALE3')).toBeInTheDocument();

    // Classes / Categorias
    expect(screen.getByText('Renda Fixa')).toBeInTheDocument();
    expect(screen.getByText('Ações Brasil')).toBeInTheDocument();

    // Régua de status com divergência de 99,69% (-0,31%)
    expect(screen.getByTestId('live-total-targets')).toHaveTextContent('99,69%');
    expect(screen.getByText(/Falta 0,31%/i)).toBeInTheDocument();
  });

  it('2. Atualiza imediatamente o total ao alterar qualquer ativo individual sem trocar de tela', () => {
    render(
      <PortfolioTargetsModal
        isOpen={true}
        onClose={vi.fn()}
        assets={mockAssets}
        positions={mockPositions}
        onSaveTargets={vi.fn()}
      />
    );

    const cdbInput = screen.getByTestId('input-target-CDB-DAYCOVAL-01');
    expect(cdbInput).toHaveValue(49.69);

    // Altera o CDB de 49.69 para 50.00
    fireEvent.change(cdbInput, { target: { value: '50' } });

    // A soma deve atualizar IMEDIATAMENTE para 100,00%
    expect(screen.getByTestId('live-total-targets')).toHaveTextContent('100,00%');
    expect(screen.getByText(/Distribuição Equilibrada Concluída \(100,00%\)/i)).toBeInTheDocument();
  });

  it('3. Atalho inline de 1 clique adiciona a diferença residual diretamente no ativo', () => {
    render(
      <PortfolioTargetsModal
        isOpen={true}
        onClose={vi.fn()}
        assets={mockAssets}
        positions={mockPositions}
        onSaveTargets={vi.fn()}
      />
    );

    // Botão inline de +0,31% no CDB
    const addDiffBtn = screen.getByTestId('btn-add-diff-inline-CDB-DAYCOVAL-01');
    expect(addDiffBtn).toBeInTheDocument();
    expect(addDiffBtn).toHaveTextContent('+0,31%');

    // Clica no botão inline
    fireEvent.click(addDiffBtn);

    // Verifica que o valor do input foi para 50 e o total foi para 100%
    const cdbInput = screen.getByTestId('input-target-CDB-DAYCOVAL-01');
    expect(cdbInput).toHaveValue(50);
    expect(screen.getByTestId('live-total-targets')).toHaveTextContent('100,00%');
  });

  it('4. Atalho do cabeçalho completa os 100% no maior ativo com 1 clique', () => {
    render(
      <PortfolioTargetsModal
        isOpen={true}
        onClose={vi.fn()}
        assets={mockAssets}
        positions={mockPositions}
        onSaveTargets={vi.fn()}
      />
    );

    // Botão rápido no topo (CDB é o maior com R$ 10.000)
    const topAutoBtn = screen.getByTestId('btn-auto-complete-largest');
    expect(topAutoBtn).toBeInTheDocument();
    expect(topAutoBtn).toHaveTextContent('Completar no CDB-DAYCOVAL-01');

    fireEvent.click(topAutoBtn);

    expect(screen.getByTestId('live-total-targets')).toHaveTextContent('100,00%');
  });

  it('5. Salva todas as metas atualizadas atomicamente e fecha o modal', async () => {
    const onSaveTargetsMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <PortfolioTargetsModal
        isOpen={true}
        onClose={onCloseMock}
        assets={mockAssets}
        positions={mockPositions}
        onSaveTargets={onSaveTargetsMock}
      />
    );

    // Ajusta o CDB para 50
    const addDiffBtn = screen.getByTestId('btn-add-diff-inline-CDB-DAYCOVAL-01');
    fireEvent.click(addDiffBtn);

    // Clica em salvar
    const saveBtn = screen.getByTestId('btn-save-all-targets');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSaveTargetsMock).toHaveBeenCalledTimes(1);
    });

    const savedAssets = onSaveTargetsMock.mock.calls[0][0] as PortfolioAsset[];
    expect(savedAssets).toHaveLength(3);
    const savedCdb = savedAssets.find((a) => a.ticker === 'CDB-DAYCOVAL-01');
    expect(savedCdb?.targetPercentage).toBe(50);
    expect(onCloseMock).toHaveBeenCalled();
  });
});
