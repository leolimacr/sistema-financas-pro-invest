import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioDividendsPanel } from '../PortfolioDividendsPanel';
import type {
  PortfolioMovement,
  PortfolioAsset,
  DerivedAssetPosition,
} from '../../../../core/portfolio/portfolioTypes';

describe('PortfolioDividendsPanel - Painel Soberano de Renda Passiva e Proventos', () => {
  const mockAssets: PortfolioAsset[] = [
    {
      id: 'ast-petr4',
      userId: 'user-1',
      ticker: 'PETR4',
      name: 'Petrobras PN',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    {
      id: 'ast-knri11',
      userId: 'user-1',
      ticker: 'KNRI11',
      name: 'Kinea Renda Imobiliária',
      category: 'Fundos Imobiliários',
      currency: 'BRL',
      market: 'B3',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ];

  const mockPositions: DerivedAssetPosition[] = [
    {
      assetId: 'ast-petr4',
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
      totalDividendsOriginal: 300,
      totalDividendsBRL: 300,
      currentPriceOriginal: 35,
      currentFxRateToBRL: 1,
      currentPriceBRL: 35,
      currentValueOriginal: 3500,
      currentValueBRL: 3500,
      unrealizedPnLBRL: 500,
      unrealizedPnLPercent: 16.67,
      assetReturnPercentOriginal: 16.67,
      fxReturnPercent: 0,
      movementCount: 2,
      ledgerChecksum: 'chk1',
      lastMovementDate: '2026-06-01',
    },
    {
      assetId: 'ast-knri11',
      ticker: 'KNRI11',
      name: 'Kinea Renda Imobiliária',
      category: 'Fundos Imobiliários',
      currency: 'BRL',
      market: 'B3',
      targetPercentage: 20,
      quantity: 50,
      hasKnownQuantity: true,
      isBalanceOnly: false,
      hasKnownCost: true,
      avgCostOriginal: 140,
      avgCostBRL: 140,
      totalInvestedBRL: 7000,
      realizedPnLOriginal: 0,
      realizedPnLBRL: 0,
      totalDividendsOriginal: 700,
      totalDividendsBRL: 700,
      currentPriceOriginal: 150,
      currentFxRateToBRL: 1,
      currentPriceBRL: 150,
      currentValueOriginal: 7500,
      currentValueBRL: 7500,
      unrealizedPnLBRL: 500,
      unrealizedPnLPercent: 7.14,
      assetReturnPercentOriginal: 7.14,
      fxReturnPercent: 0,
      movementCount: 2,
      ledgerChecksum: 'chk2',
      lastMovementDate: '2026-06-01',
    },
  ];

  const currentYear = new Date().getFullYear();

  const mockMovements: PortfolioMovement[] = [
    {
      id: 'mov-div-1',
      userId: 'user-1',
      assetId: 'ast-petr4',
      type: 'DIVIDEND',
      date: `${currentYear}-02-15`,
      quantity: null,
      hasKnownQuantity: false,
      unitPrice: 0,
      fees: 0,
      grossAmount: 300,
      netAmount: 300,
      currency: 'BRL',
      fxRateToBRL: 1,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 300,
      hasKnownCost: false,
      status: 'ACTIVE',
      notes: 'Dividendos Petrobras 4T',
      createdAt: `${currentYear}-02-15`,
      updatedAt: `${currentYear}-02-15`,
    },
    {
      id: 'mov-div-2',
      userId: 'user-1',
      assetId: 'ast-knri11',
      type: 'INTEREST', // JCP / Rendimento
      date: `${currentYear}-03-10`,
      quantity: null,
      hasKnownQuantity: false,
      unitPrice: 0,
      fees: 0,
      grossAmount: 700,
      netAmount: 700,
      currency: 'BRL',
      fxRateToBRL: 1,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 700,
      hasKnownCost: false,
      status: 'ACTIVE',
      notes: 'Rendimento Mensal KNRI11',
      createdAt: `${currentYear}-03-10`,
      updatedAt: `${currentYear}-03-10`,
    },
    {
      id: 'mov-div-voided',
      userId: 'user-1',
      assetId: 'ast-petr4',
      type: 'DIVIDEND',
      date: `${currentYear}-01-10`,
      quantity: null,
      hasKnownQuantity: false,
      unitPrice: 0,
      fees: 0,
      grossAmount: 999,
      netAmount: 999,
      currency: 'BRL',
      fxRateToBRL: 1,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 999,
      hasKnownCost: false,
      status: 'VOIDED', // Estornado - não deve entrar nas contas
      createdAt: `${currentYear}-01-10`,
      updatedAt: `${currentYear}-01-10`,
    },
  ];

  it('deve exibir o estado vazio pedagógico quando não houver lançamentos de proventos ativos', () => {
    const handleAdd = vi.fn();
    render(
      <PortfolioDividendsPanel
        movements={[]}
        assets={mockAssets}
        positions={mockPositions}
        onAddDividendMovement={handleAdd}
      />
    );

    expect(screen.getByTestId('dividends-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum Provento Registrado/i)).toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /Lançar Primeiro Provento/i });
    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it('deve consolidar corretamente o total de proventos, ano corrente e Yield on Cost (YoC)', () => {
    render(
      <PortfolioDividendsPanel
        movements={mockMovements}
        assets={mockAssets}
        positions={mockPositions}
      />
    );

    // Total: 300 + 700 = 1000 (o estornado de 999 é ignorado)
    const totalElem = screen.getByTestId('metric-total-dividends');
    expect(totalElem).toHaveTextContent('R$ 1.000,00');

    // Ano corrente: 1000
    const yearElem = screen.getByTestId('metric-year-dividends');
    expect(yearElem).toHaveTextContent('R$ 1.000,00');

    // Custo total investido: 3000 + 7000 = 10000. YoC Geral = 1000 / 10000 = 10,0%
    const yocElem = screen.getByTestId('metric-overall-yoc');
    expect(yocElem).toHaveTextContent('10,0%');
  });

  it('deve exibir a tabela de Yield on Cost por ativo com valores e percentuais fiéis', () => {
    render(
      <PortfolioDividendsPanel
        movements={mockMovements}
        assets={mockAssets}
        positions={mockPositions}
      />
    );

    // PETR4: 300 / 3000 = 10,0%
    // KNRI11: 700 / 7000 = 10,0%
    expect(screen.getAllByText(/KNRI11/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/PETR4/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 700,00').length).toBeGreaterThan(0);
    expect(screen.getAllByText('R$ 300,00').length).toBeGreaterThan(0);
  });

  it('deve permitir filtrar lançamentos cronológicos por ativo específico', () => {
    render(
      <PortfolioDividendsPanel
        movements={mockMovements}
        assets={mockAssets}
        positions={mockPositions}
      />
    );

    // Inicialmente mostra ambos os proventos ativos
    expect(screen.getByText(/Dividendos Petrobras 4T/)).toBeInTheDocument();
    expect(screen.getByText(/Rendimento Mensal KNRI11/)).toBeInTheDocument();

    // Filtra por PETR4
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'ast-petr4' } });

    expect(screen.getByText(/Dividendos Petrobras 4T/)).toBeInTheDocument();
    expect(screen.queryByText(/Rendimento Mensal KNRI11/)).not.toBeInTheDocument();
  });

  it('deve renderizar a badge apropriada para JCP/Juros e Dividendos', () => {
    render(
      <PortfolioDividendsPanel
        movements={mockMovements}
        assets={mockAssets}
        positions={mockPositions}
      />
    );

    expect(screen.getByText('Dividendo')).toBeInTheDocument();
    expect(screen.getByText('JCP / Juros')).toBeInTheDocument();
  });

  it('deve permitir navegar para a aba de proventos provisionados e exibir previsões', () => {
    const futureDate = '2099-12-15';
    const futureMovements: PortfolioMovement[] = [
      ...mockMovements,
      {
        id: 'mov-future-1',
        userId: 'user-1',
        assetId: 'ast-petr4',
        type: 'DIVIDEND',
        date: futureDate,
        quantity: null,
        hasKnownQuantity: false,
        unitPrice: 0,
        fees: 0,
        grossAmount: 450,
        netAmount: 450,
        currency: 'BRL',
        fxRateToBRL: 1,
        fxSource: 'FIXED_ONE',
        netAmountBRL: 450,
        hasKnownCost: false,
        status: 'ACTIVE',
        notes: 'Previsão Dividendo Extraordinário PETR4',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      },
    ];

    render(
      <PortfolioDividendsPanel
        movements={futureMovements}
        assets={mockAssets}
        positions={mockPositions}
      />
    );

    // Na aba de recebidos, o banner de alerta de provisionados deve estar visível
    expect(screen.getByTestId('banner-provisioned-alert')).toBeInTheDocument();
    expect(screen.getByText(/1 provento provisionado/i)).toBeInTheDocument();

    // Clica na aba de Provisionados
    const provisionedTab = screen.getByTestId('tab-dividends-provisioned');
    fireEvent.click(provisionedTab);

    // Agora está na visualização de provisionados
    expect(screen.getByTestId('dividends-provisioned-view')).toBeInTheDocument();
    expect(screen.getByTestId('metric-provisioned-total')).toHaveTextContent('R$ 450,00');
    expect(screen.getByText(/Previsão Dividendo Extraordinário PETR4/i)).toBeInTheDocument();
  });

  it('deve exibir o estado vazio pedagógico de provisionados quando não houver agendamentos futuros', () => {
    render(
      <PortfolioDividendsPanel
        movements={mockMovements}
        assets={mockAssets}
        positions={mockPositions}
      />
    );

    const provisionedTab = screen.getByTestId('tab-dividends-provisioned');
    fireEvent.click(provisionedTab);

    expect(screen.getByTestId('provisioned-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/Nenhum Provento Provisionado no Momento/i)).toBeInTheDocument();
  });

  it('deve exibir o card da ponte soberana de saque de proventos para gastos pessoais', () => {
    render(
      <PortfolioDividendsPanel
        movements={mockMovements}
        assets={mockAssets}
        positions={mockPositions}
      />
    );

    expect(screen.getByTestId('dividends-sovereign-bridge-card')).toBeInTheDocument();
    expect(screen.getByText(/Ponte de Saque de Proventos para Gastos Pessoais/i)).toBeInTheDocument();
    expect(screen.getByText(/EXTERNAL_WITHDRAWAL/i)).toBeInTheDocument();
  });
});

