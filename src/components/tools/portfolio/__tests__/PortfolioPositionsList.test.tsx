import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioPositionsList } from '../PortfolioPositionsList';
import type { DerivedAssetPosition, PortfolioAsset } from '../../../../core/portfolio/portfolioTypes';

const mockPositions: DerivedAssetPosition[] = [
  {
    assetId: 'a1',
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
    realizedPnLOriginal: 0,
    realizedPnLBRL: 0,
    totalDividendsOriginal: 150,
    totalDividendsBRL: 150,
    currentPriceOriginal: 38.0,
    currentFxRateToBRL: 1.0,
    currentPriceBRL: 38.0,
    currentValueOriginal: 3800.0,
    currentValueBRL: 3800.0,
    unrealizedPnLBRL: 800.0,
    unrealizedPnLPercent: 26.67,
    assetReturnPercentOriginal: 26.67,
    fxReturnPercent: 0,
    movementCount: 1,
    ledgerChecksum: 'chk1',
    lastMovementDate: '2026-01-10',
  },
  {
    assetId: 'a2',
    ticker: 'KNCR11',
    name: 'Kinea Rendimentos FII',
    category: 'Fundos Imobiliários',
    currency: 'BRL',
    market: 'B3',
    targetPercentage: 25,
    institution: 'BTG Pactual',
    quantity: 50,
    hasKnownQuantity: true,
    isBalanceOnly: false,
    hasKnownCost: true,
    avgCostOriginal: 100.0,
    avgCostBRL: 100.0,
    totalInvestedBRL: 5000.0,
    realizedPnLOriginal: 0,
    realizedPnLBRL: 0,
    totalDividendsOriginal: 200,
    totalDividendsBRL: 200,
    currentPriceOriginal: 105.0,
    currentFxRateToBRL: 1.0,
    currentPriceBRL: 105.0,
    currentValueOriginal: 5250.0,
    currentValueBRL: 5250.0,
    unrealizedPnLBRL: 250.0,
    unrealizedPnLPercent: 5.0,
    assetReturnPercentOriginal: 5.0,
    fxReturnPercent: 0,
    movementCount: 2,
    ledgerChecksum: 'chk2',
    lastMovementDate: '2026-02-15',
  },
  {
    assetId: 'a3',
    ticker: 'CDB-INTER',
    name: 'CDB Liquidez Diária',
    category: 'Caixa de Oportunidade',
    currency: 'BRL',
    market: 'CASH',
    targetPercentage: 10,
    institution: 'Banco Inter',
    quantity: null,
    hasKnownQuantity: false,
    isBalanceOnly: true,
    hasKnownCost: true,
    avgCostOriginal: null,
    avgCostBRL: null,
    totalInvestedBRL: 10000.0,
    realizedPnLOriginal: 0,
    realizedPnLBRL: 0,
    totalDividendsOriginal: 0,
    totalDividendsBRL: 0,
    currentPriceOriginal: null,
    currentFxRateToBRL: 1.0,
    currentPriceBRL: null,
    currentValueOriginal: 10450.0,
    currentValueBRL: 10450.0,
    unrealizedPnLBRL: null,
    unrealizedPnLPercent: null,
    assetReturnPercentOriginal: null,
    fxReturnPercent: null,
    movementCount: 1,
    ledgerChecksum: 'chk3',
    lastMovementDate: '2026-03-01',
  },
];

describe('PortfolioPositionsList', () => {
  it('1. Renderiza lista de posições com dados básicos e badges de instituição', () => {
    render(<PortfolioPositionsList positions={mockPositions} />);

    expect(screen.getByText('Posições em Custódia')).toBeInTheDocument();
    expect(screen.getByText('3 de 3 ativos')).toBeInTheDocument();

    // Tickers
    expect(screen.getAllByText('PETR4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('KNCR11').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CDB-INTER').length).toBeGreaterThan(0);

    // Badges de Instituição
    expect(screen.getByTestId('badge-institution-PETR4')).toHaveTextContent('XP Investimentos');
    expect(screen.getByTestId('badge-institution-KNCR11')).toHaveTextContent('BTG Pactual');
  });

  it('2. Filtra ativos em tempo real pelo campo de busca (ticker e nome)', () => {
    render(<PortfolioPositionsList positions={mockPositions} />);

    const searchInput = screen.getByPlaceholderText(/Buscar por ticker, nome ou corretora/i);
    fireEvent.change(searchInput, { target: { value: 'PETR' } });

    // Apenas PETR4 visível
    expect(screen.getAllByText('PETR4').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('position-row-KNCR11')).not.toBeInTheDocument();
  });

  it('3. Filtra ativos por corretora através do campo de busca', () => {
    render(<PortfolioPositionsList positions={mockPositions} />);

    const searchInput = screen.getByPlaceholderText(/Buscar por ticker, nome ou corretora/i);
    fireEvent.change(searchInput, { target: { value: 'BTG Pactual' } });

    expect(screen.getAllByText('KNCR11').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('position-row-PETR4')).not.toBeInTheDocument();
  });

  it('4. Filtra por pílula de categoria', () => {
    render(<PortfolioPositionsList positions={mockPositions} />);

    const fiiPill = screen.getByRole('button', { name: /Fundos Imobiliários \(1\)/i });
    fireEvent.click(fiiPill);

    expect(screen.getAllByText('KNCR11').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('position-row-PETR4')).not.toBeInTheDocument();
    expect(screen.queryByTestId('position-row-CDB-INTER')).not.toBeInTheDocument();
  });

  it('5. Exibe estado amigável quando a busca não retorna resultados e permite limpar', () => {
    render(<PortfolioPositionsList positions={mockPositions} />);

    const searchInput = screen.getByPlaceholderText(/Buscar por ticker, nome ou corretora/i);
    fireEvent.change(searchInput, { target: { value: 'INEXISTENTE_XYZ' } });

    expect(screen.getByText(/Nenhum ativo encontrado para os filtros selecionados/i)).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /Limpar filtros/i });
    fireEvent.click(clearBtn);

    // Todos voltam
    expect(screen.getAllByText('PETR4').length).toBeGreaterThan(0);
  });

  it('6. Altera modo de visualização para "Por Classe" e "Por Corretora"', () => {
    render(<PortfolioPositionsList positions={mockPositions} />);

    const byClassBtn = screen.getByRole('button', { name: /Por Classe/i });
    fireEvent.click(byClassBtn);

    // Agrupamento por classe presente
    expect(screen.getAllByText(/Ações Brasil/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fundos Imobiliários/i).length).toBeGreaterThan(0);

    const byInstBtn = screen.getByRole('button', { name: /Por Corretora/i });
    fireEvent.click(byInstBtn);

    // Agrupamento por corretora presente
    expect(screen.getAllByText(/XP Investimentos/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BTG Pactual/i).length).toBeGreaterThan(0);
  });

  it('7. Exibe badge "Isento IR" em ativos de Renda Fixa isentos (LCI/LCA/CRI/CRA)', () => {
    const positionsWithLci: DerivedAssetPosition[] = [
      ...mockPositions,
      {
        assetId: 'a4',
        ticker: 'LCI-ITAU',
        name: 'LCI DI 95% Banco Itaú',
        category: 'Renda Fixa Pós-Fixada',
        currency: 'BRL',
        market: 'RF',
        targetPercentage: 15,
        institution: 'Íon Itaú',
        quantity: null,
        hasKnownQuantity: false,
        isBalanceOnly: true,
        hasKnownCost: true,
        avgCostOriginal: null,
        avgCostBRL: null,
        totalInvestedBRL: 15000.0,
        realizedPnLOriginal: 0,
        realizedPnLBRL: 0,
        totalDividendsOriginal: 0,
        totalDividendsBRL: 0,
        currentPriceOriginal: null,
        currentFxRateToBRL: 1.0,
        currentPriceBRL: null,
        currentValueOriginal: 15450.0,
        currentValueBRL: 15450.0,
        unrealizedPnLBRL: null,
        unrealizedPnLPercent: null,
        assetReturnPercentOriginal: null,
        fxReturnPercent: null,
        movementCount: 1,
        ledgerChecksum: 'chk4',
        lastMovementDate: '2026-03-01',
      },
    ];

    render(<PortfolioPositionsList positions={positionsWithLci} />);

    expect(screen.getByTestId('badge-tax-exempt-LCI-ITAU')).toHaveTextContent('Isento IR');
    expect(screen.getByTestId('badge-tax-exempt-mobile-LCI-ITAU')).toHaveTextContent('Isento IR');
  });

  it('8. Ordena posições por coluna interativa (ex: Ticker asc/desc)', () => {
    render(<PortfolioPositionsList positions={mockPositions} />);

    const sortTickerBtn = screen.getByTestId('sort-header-ticker');

    // 1º clique: Ordenação Ascendente (CDB-INTER, KNCR11, PETR4)
    fireEvent.click(sortTickerBtn);
    let rows = screen.getAllByTestId(/^position-row-/);
    expect(rows[0]).toHaveAttribute('data-testid', 'position-row-CDB-INTER');
    expect(rows[1]).toHaveAttribute('data-testid', 'position-row-KNCR11');
    expect(rows[2]).toHaveAttribute('data-testid', 'position-row-PETR4');

    // 2º clique: Ordenação Descendente (PETR4, KNCR11, CDB-INTER)
    fireEvent.click(sortTickerBtn);
    rows = screen.getAllByTestId(/^position-row-/);
    expect(rows[0]).toHaveAttribute('data-testid', 'position-row-PETR4');
    expect(rows[1]).toHaveAttribute('data-testid', 'position-row-KNCR11');
    expect(rows[2]).toHaveAttribute('data-testid', 'position-row-CDB-INTER');
  });

  it('9. Abre menu [...] no desktop e dispara callbacks de Editar, Novo Lançamento e Excluir', () => {
    const handleEdit = vi.fn();
    const handleAddMovement = vi.fn();
    const handleDelete = vi.fn();

    const mockAssets: PortfolioAsset[] = [
      {
        id: 'a1',
        userId: 'u1',
        ticker: 'PETR4',
        name: 'Petrobras PN',
        category: 'Ações Brasil',
        currency: 'BRL',
        market: 'B3',
        targetPercentage: 20,
        isBalanceOnly: false,
        institution: 'XP Investimentos',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    render(
      <PortfolioPositionsList
        positions={mockPositions}
        assets={mockAssets}
        onEditAsset={handleEdit}
        onAddMovementForAsset={handleAddMovement}
        onDeleteAsset={handleDelete}
      />
    );

    // 1. Testar Editar
    const menuBtn = screen.getByTestId('asset-action-menu-btn-PETR4');
    fireEvent.click(menuBtn);
    expect(screen.getByTestId('asset-dropdown-PETR4')).toBeInTheDocument();

    const editBtn = screen.getByTestId('btn-edit-asset-PETR4');
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'PETR4', id: 'a1' }));

    // 2. Testar Novo Lançamento
    fireEvent.click(menuBtn);
    const addMovementBtn = screen.getByTestId('btn-movement-asset-PETR4');
    fireEvent.click(addMovementBtn);
    expect(handleAddMovement).toHaveBeenCalledTimes(1);
    expect(handleAddMovement).toHaveBeenCalledWith('a1');

    // 3. Testar Excluir
    fireEvent.click(menuBtn);
    const deleteBtn = screen.getByTestId('btn-delete-asset-PETR4');
    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'PETR4', id: 'a1' }));
  });

  it('10. Abre menu [...] no card mobile e aciona callbacks de ação', () => {
    const handleEdit = vi.fn();
    const handleAddMovement = vi.fn();
    const handleDelete = vi.fn();

    render(
      <PortfolioPositionsList
        positions={mockPositions}
        onEditAsset={handleEdit}
        onAddMovementForAsset={handleAddMovement}
        onDeleteAsset={handleDelete}
      />
    );

    const mobileMenuBtn = screen.getByTestId('asset-action-menu-mobile-btn-KNCR11');
    fireEvent.click(mobileMenuBtn);
    expect(screen.getByTestId('asset-mobile-dropdown-KNCR11')).toBeInTheDocument();

    const mobileEditBtn = screen.getByTestId('btn-mobile-edit-asset-KNCR11');
    fireEvent.click(mobileEditBtn);
    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'KNCR11', id: 'a2' }));
  });

  it('11. Clicar no ticker desktop ou na opção Raio-X do menu abre os detalhes do ativo', () => {
    const handleSelectDetails = vi.fn();

    render(
      <PortfolioPositionsList
        positions={mockPositions}
        onSelectAssetDetails={handleSelectDetails}
      />
    );

    // 1. Clicar no botão do ticker PETR4
    const tickerBtn = screen.getByTestId('btn-open-details-PETR4');
    fireEvent.click(tickerBtn);
    expect(handleSelectDetails).toHaveBeenCalledTimes(1);
    expect(handleSelectDetails).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'PETR4' }));

    // 2. Clicar no menu [...] e selecionar Raio-X do Ativo
    const menuBtn = screen.getByTestId('asset-action-menu-btn-KNCR11');
    fireEvent.click(menuBtn);
    const detailsMenuBtn = screen.getByTestId('btn-details-asset-KNCR11');
    fireEvent.click(detailsMenuBtn);
    expect(handleSelectDetails).toHaveBeenCalledTimes(2);
    expect(handleSelectDetails).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'KNCR11' }));
  });

  it('12. Clicar no ticker mobile ou na opção Raio-X do menu mobile abre os detalhes do ativo', () => {
    const handleSelectDetails = vi.fn();

    render(
      <PortfolioPositionsList
        positions={mockPositions}
        onSelectAssetDetails={handleSelectDetails}
      />
    );

    // 1. Clicar no ticker mobile
    const mobileTickerBtn = screen.getByTestId('btn-mobile-open-details-PETR4');
    fireEvent.click(mobileTickerBtn);
    expect(handleSelectDetails).toHaveBeenCalledTimes(1);
    expect(handleSelectDetails).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'PETR4' }));

    // 2. Clicar no menu mobile e selecionar Raio-X
    const mobileMenuBtn = screen.getByTestId('asset-action-menu-mobile-btn-KNCR11');
    fireEvent.click(mobileMenuBtn);
    const mobileDetailsMenuBtn = screen.getByTestId('btn-mobile-details-asset-KNCR11');
    fireEvent.click(mobileDetailsMenuBtn);
    expect(handleSelectDetails).toHaveBeenCalledTimes(2);
    expect(handleSelectDetails).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'KNCR11' }));
  });

  it('13. Renderiza o rodapé tfoot da tabela desktop com total consolidado e rentabilidade', () => {
    render(<PortfolioPositionsList positions={mockPositions} />);

    const footer = screen.getByTestId('positions-table-footer');
    expect(footer).toBeInTheDocument();
    expect(screen.getByText('Total Custódia')).toBeInTheDocument();
    expect(screen.getByTestId('badge-footer-count')).toHaveTextContent('3 ativos');

    // Total de R$ 3.800 + R$ 5.250 + R$ 10.450 = R$ 19.500,00
    const totalValueCell = screen.getByTestId('footer-total-value');
    expect(totalValueCell).toHaveTextContent('19.500,00');

    // Rentabilidade total do mock
    const totalPnlCell = screen.getByTestId('footer-total-pnl');
    expect(totalPnlCell).toBeInTheDocument();
  });

  it('14. Renderiza o rodapé do card com resumo e aciona onOpenNewAsset e onOpenImport', () => {
    const handleNewAsset = vi.fn();
    const handleImport = vi.fn();

    render(
      <PortfolioPositionsList
        positions={mockPositions}
        onOpenNewAsset={handleNewAsset}
        onOpenImport={handleImport}
      />
    );

    const cardFooter = screen.getByTestId('positions-card-footer');
    expect(cardFooter).toBeInTheDocument();
    expect(cardFooter).toHaveTextContent('3 posições');

    const btnNewAsset = screen.getByTestId('btn-custody-add-asset');
    fireEvent.click(btnNewAsset);
    expect(handleNewAsset).toHaveBeenCalledTimes(1);

    const btnImport = screen.getByTestId('btn-custody-import-b3');
    fireEvent.click(btnImport);
    expect(handleImport).toHaveBeenCalledTimes(1);
  });

  it('15. Renderiza badge e filtro de calibração quando houver ativos pendentes e dispara onCalibrateAsset', () => {
    const handleCalibrate = vi.fn();
    const uncalibratedAsset: DerivedAssetPosition = {
      ...mockPositions[0],
      assetId: 'ast-uncalibrated',
      ticker: 'BBDC4',
      quantity: null,
      hasKnownQuantity: false,
      isBalanceOnly: true,
      institution: undefined,
      targetPercentage: 0,
    };

    render(
      <PortfolioPositionsList
        positions={[...mockPositions, uncalibratedAsset]}
        onCalibrateAsset={handleCalibrate}
      />
    );

    // 1. Pílula de filtro para pendentes deve aparecer
    const pendingPill = screen.getByTestId('filter-pill-pending-calibration');
    expect(pendingPill).toBeInTheDocument();
    expect(pendingPill).toHaveTextContent('Pendentes (1)');

    // 2. Badge de calibração no ativo desktop
    const badgeCalibrate = screen.getByTestId('badge-calibrate-BBDC4');
    expect(badgeCalibrate).toBeInTheDocument();
    fireEvent.click(badgeCalibrate);
    expect(handleCalibrate).toHaveBeenCalledTimes(1);
    expect(handleCalibrate).toHaveBeenCalledWith(expect.objectContaining({ ticker: 'BBDC4' }));

    // 3. Opção no menu [...]
    const menuBtn = screen.getByTestId('asset-action-menu-btn-BBDC4');
    fireEvent.click(menuBtn);
    const actionCalibrate = screen.getByTestId('btn-calibrate-asset-BBDC4');
    expect(actionCalibrate).toBeInTheDocument();
    fireEvent.click(actionCalibrate);
    expect(handleCalibrate).toHaveBeenCalledTimes(2);
  });

  it('16. Renderiza botão de expansão e acordeão de títulos quando houver certificados sob a mesma meta (fixedIncomeCertificates)', () => {
    const multiTitleCdbPosition: DerivedAssetPosition = {
      ...mockPositions[0],
      assetId: 'ast-cdb-multi',
      ticker: 'Z CDB',
      name: 'CDB Daycoval e Inter Consolidado',
      category: 'Renda Fixa',
      market: 'RF',
      isBalanceOnly: true,
      quantity: null,
      hasKnownQuantity: false,
      currentValueBRL: 10000.0,
      totalInvestedBRL: 10000.0,
      targetPercentage: 6.5,
      fixedIncomeCertificates: [
        {
          id: 'c1',
          name: 'CDB Daycoval 110%',
          institution: 'Banco Daycoval',
          balance: 6000.0,
          isNetBalance: false,
          indexation: 'CDI',
          ratePercent: 110,
          maturityDate: '2027-10-03',
          createdAt: '2026-06-01T10:00:00Z',
        },
        {
          id: 'c2',
          name: 'CDB Banco Inter 102%',
          institution: 'Banco Inter',
          balance: 4000.0,
          isNetBalance: true,
          indexation: 'CDI',
          ratePercent: 102,
          maturityDate: '2026-12-15',
          createdAt: '2026-06-01T10:00:00Z',
        },
      ],
    };

    render(
      <PortfolioPositionsList
        positions={[multiTitleCdbPosition]}
      />
    );

    // Botão de expandir títulos deve estar visível com contagem
    const expandBtn = screen.getByTestId('btn-expand-certificates-Z CDB');
    expect(expandBtn).toBeInTheDocument();
    expect(expandBtn).toHaveTextContent('2 títulos');

    // Inicialmente a linha de detalhes não está expandida
    expect(screen.queryByTestId('expanded-certificates-row-Z CDB')).not.toBeInTheDocument();

    // Clica para expandir o acordeão
    fireEvent.click(expandBtn);

    // Linha expandida deve aparecer com os dados de ambos os certificados
    const expandedRow = screen.getByTestId('expanded-certificates-row-Z CDB');
    expect(expandedRow).toBeInTheDocument();
    expect(expandedRow).toHaveTextContent('CDB Daycoval 110%');
    expect(expandedRow).toHaveTextContent('Banco Daycoval');
    expect(expandedRow).toHaveTextContent('R$ 6.000,00');
    expect(expandedRow).toHaveTextContent('60.0%');

    expect(expandedRow).toHaveTextContent('CDB Banco Inter 102%');
    expect(expandedRow).toHaveTextContent('Banco Inter');
    expect(expandedRow).toHaveTextContent('R$ 4.000,00');
    expect(expandedRow).toHaveTextContent('40.0%');

    // Clica novamente para recolher o acordeão
    fireEvent.click(expandBtn);
    expect(screen.queryByTestId('expanded-certificates-row-Z CDB')).not.toBeInTheDocument();
  });
});

