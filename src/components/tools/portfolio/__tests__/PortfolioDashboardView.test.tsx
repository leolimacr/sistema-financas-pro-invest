import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PortfolioDashboardView } from '../PortfolioDashboardView';
import { DerivedAssetPosition, PortfolioAllocationSummary } from '../../../../core/portfolio/portfolioTypes';

describe('PortfolioDashboardView - Interface de Leitura da Carteira de Investimentos', () => {
  describe('1. Estados de Carregamento e Erro', () => {
    it('deve exibir o esqueleto de carregamento com acessibilidade quando isLoading for true', () => {
      render(<PortfolioDashboardView isLoading={true} />);

      const skeleton = screen.getByTestId('portfolio-loading-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveAttribute('role', 'status');
      expect(skeleton).toHaveAttribute('aria-label', 'Carregando carteira de investimentos...');
    });

    it('deve exibir o card de erro e acionar o botão de retry quando errorMessage for informado', () => {
      const handleRetry = vi.fn();
      render(
        <PortfolioDashboardView
          errorMessage="Falha de conexão com a rede."
          onRetry={handleRetry}
        />
      );

      const errorBox = screen.getByTestId('portfolio-error-state');
      expect(errorBox).toBeInTheDocument();
      expect(screen.getByText('Falha de conexão com a rede.')).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
      fireEvent.click(retryButton);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Estado Vazio (Sem Ativos Pré-cadastrados)', () => {
    it('deve exibir o estado vazio explicando a estruturação inicial e não apresentar ativos fictícios', () => {
      const handleStartSetup = vi.fn();
      render(<PortfolioDashboardView positions={[]} onStartSetup={handleStartSetup} />);

      const emptyState = screen.getByTestId('portfolio-empty-state');
      expect(emptyState).toBeInTheDocument();
      expect(screen.getByText(/sua carteira soberana de investimentos/i)).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /caixa de oportunidade/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /posições iniciais/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /livro razão e rebalanceamento/i })).toBeInTheDocument();

      // Confirma que não há tickers inventados ou dados simulados
      expect(screen.queryByText('PETR4')).not.toBeInTheDocument();
      expect(screen.queryByText('VALE3')).not.toBeInTheDocument();

      const startButton = screen.getByRole('button', { name: /iniciar estruturação da carteira/i });
      fireEvent.click(startButton);
      expect(handleStartSetup).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Resumo de Patrimônio, Caixa e Alocação vs Meta', () => {
    const mockSummary: PortfolioAllocationSummary = {
      consolidatedTotalBRL: 50000.0,
      totalInvestedAssetsBRL: 45000.0,
      totalPortfolioCashBRL: 5000.0,
      denominatorUsedBRL: 50000.0,
      includeCashInTargets: true,
      sumTargetsPercentage: 100.0,
      isTargetSumValid: true,
      targetDiscrepancyPercent: 0.0,
      categories: [
        {
          category: 'Ações Brasil',
          targetPercentage: 40.0,
          currentValueBRL: 25000.0,
          currentPercentage: 50.0,
          differenceBRL: 5000.0,
          allocationRatio: 1.25,
        },
        {
          category: 'Renda Fixa',
          targetPercentage: 60.0,
          currentValueBRL: 20000.0,
          currentPercentage: 40.0,
          differenceBRL: -10000.0,
          allocationRatio: 0.67,
        },
      ],
      assets: [],
    };

    it('deve exibir os valores de patrimônio, caixa e classes de ativos usando apenas dados recebidos', () => {
      const mockPosition: DerivedAssetPosition = {
        assetId: 'ast-1',
        ticker: 'VALE3',
        name: 'Vale S.A.',
        category: 'Ações Brasil',
        currency: 'BRL',
        market: 'B3',
        targetPercentage: 20.0,
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
        currentPriceOriginal: 65.0,
        currentFxRateToBRL: 1.0,
        currentPriceBRL: 65.0,
        currentValueOriginal: 6500.0,
        currentValueBRL: 6500.0,
        unrealizedPnLBRL: 500.0,
        unrealizedPnLPercent: 8.33,
        assetReturnPercentOriginal: 8.33,
        fxReturnPercent: 0,
        movementCount: 1,
        ledgerChecksum: 'chk1',
        lastMovementDate: '2026-06-15',
      };

      render(
        <PortfolioDashboardView
          summary={mockSummary}
          positions={[mockPosition]}
        />
      );

      // Patrimônio Consolidado (aparece no card e no centro do donut)
      expect(screen.getAllByText('R$ 50.000,00').length).toBeGreaterThan(0);
      // Ativos Investidos
      expect(screen.getAllByText('R$ 45.000,00').length).toBeGreaterThan(0);
      // Caixa da Carteira
      expect(screen.getAllByText('R$ 5.000,00').length).toBeGreaterThan(0);

      // Categorias
      expect(screen.getByTestId('category-row-Ações Brasil')).toBeInTheDocument();
      expect(screen.getByTestId('category-row-Renda Fixa')).toBeInTheDocument();

      // Não deve exibir alerta de discrepância quando as metas somam 100%
      expect(screen.queryByTestId('target-discrepancy-warning')).not.toBeInTheDocument();
    });

    it('deve exibir aviso quando a soma das metas não totalizar 100% e abrir o modal panorâmico de metas ao clicar', () => {
      const summaryWithDiscrepancy: PortfolioAllocationSummary = {
        ...mockSummary,
        sumTargetsPercentage: 90.0,
        isTargetSumValid: false,
        targetDiscrepancyPercent: -10.0,
      };

      const mockPosition: DerivedAssetPosition = {
        assetId: 'ast-1',
        ticker: 'VALE3',
        name: 'Vale S.A.',
        category: 'Ações Brasil',
        currency: 'BRL',
        market: 'B3',
        targetPercentage: 20.0,
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
        currentPriceOriginal: 65.0,
        currentFxRateToBRL: 1.0,
        currentPriceBRL: 65.0,
        currentValueOriginal: 6500.0,
        currentValueBRL: 6500.0,
        unrealizedPnLBRL: 500.0,
        unrealizedPnLPercent: 8.33,
        assetReturnPercentOriginal: 8.33,
        fxReturnPercent: 0,
        movementCount: 1,
        ledgerChecksum: 'chk1',
        lastMovementDate: '2026-06-15',
      };

      render(
        <PortfolioDashboardView
          summary={summaryWithDiscrepancy}
          positions={[mockPosition]}
          assets={[
            {
              id: 'ast-1',
              userId: 'user-1',
              ticker: 'VALE3',
              name: 'Vale S.A.',
              category: 'Ações Brasil',
              currency: 'BRL',
              market: 'B3',
              targetPercentage: 20.0,
              createdAt: '2026-06-15T00:00:00Z',
              updatedAt: '2026-06-15T00:00:00Z',
            },
          ]}
        />
      );

      const warning = screen.getByTestId('target-discrepancy-warning');
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveTextContent('90,0%');
      expect(warning).toHaveTextContent('-10,0%');

      // Botão de ação direta dentro do banner
      const adjustBtn = screen.getByTestId('btn-adjust-targets-from-warning');
      expect(adjustBtn).toBeInTheDocument();
      fireEvent.click(adjustBtn);

      // Deve abrir o modal unificado de metas
      expect(screen.getByText('Metas de Alocação da Carteira')).toBeInTheDocument();
    });
  });

  describe('4. Lista de Posições e Rigor Contábil em Dados Incompletos', () => {
    it('deve indicar claramente ativos cadastrados apenas por saldo sem cotas conhecidas', () => {
      const balanceOnlyPosition: DerivedAssetPosition = {
        assetId: 'ast-porq',
        ticker: 'PORQ_INTER',
        name: 'Porquinho Inter',
        category: 'Renda Fixa',
        currency: 'BRL',
        market: 'MANUAL',
        targetPercentage: 5.0,
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
        currentValueOriginal: 1618.67,
        currentValueBRL: 1618.67,
        unrealizedPnLBRL: null,
        unrealizedPnLPercent: null,
        assetReturnPercentOriginal: null,
        fxReturnPercent: null,
        movementCount: 1,
        ledgerChecksum: 'chk-porq',
        lastMovementDate: '2026-01-01',
      };

      render(<PortfolioDashboardView positions={[balanceOnlyPosition]} />);

      // Verifica exibição do badge Apenas Saldo
      const badges = screen.getAllByTestId('badge-balance-only');
      expect(badges.length).toBeGreaterThan(0);
      expect(badges[0]).toHaveTextContent(/apenas saldo/i);

      // Quantidade de cotas fictícia NÃO deve ser renderizada
      expect(screen.queryByText('1 cota')).not.toBeInTheDocument();

      // Rentabilidade deve ser suprimida (sem inventar 0,00%)
      const noRentabilityBadges = screen.getAllByTestId('badge-no-rentability');
      expect(noRentabilityBadges[0]).toHaveTextContent(/sem pm/i);
    });

    it('deve indicar custo desconhecido e suprimir métricas de rentabilidade quando faltar o preço médio', () => {
      const unknownCostPosition: DerivedAssetPosition = {
        assetId: 'ast-unknown-pm',
        ticker: 'PETR4',
        name: 'Petrobras PN',
        category: 'Ações Brasil',
        currency: 'BRL',
        market: 'B3',
        targetPercentage: 10.0,
        quantity: 200,
        hasKnownQuantity: true,
        isBalanceOnly: false,
        hasKnownCost: false, // PM desconhecido
        avgCostOriginal: null,
        avgCostBRL: null,
        totalInvestedBRL: null,
        realizedPnLOriginal: 0,
        realizedPnLBRL: 0,
        totalDividendsOriginal: 0,
        totalDividendsBRL: 0,
        currentPriceOriginal: 38.5,
        currentFxRateToBRL: 1.0,
        currentPriceBRL: 38.5,
        currentValueOriginal: 7700.0,
        currentValueBRL: 7700.0,
        unrealizedPnLBRL: null,
        unrealizedPnLPercent: null,
        assetReturnPercentOriginal: null,
        fxReturnPercent: null,
        movementCount: 1,
        ledgerChecksum: 'chk-petr',
        lastMovementDate: '2026-03-10',
      };

      render(<PortfolioDashboardView positions={[unknownCostPosition]} />);

      const unknownCostBadges = screen.getAllByTestId('badge-unknown-cost');
      expect(unknownCostBadges.length).toBeGreaterThan(0);
      expect(unknownCostBadges[0]).toHaveTextContent(/desconhecido/i);

      // Não calcula rentabilidade fictícia
      const rentabilityBadges = screen.getAllByTestId('badge-no-rentability');
      expect(rentabilityBadges[0]).toHaveTextContent(/sem pm/i);
    });

    it('deve exibir status de cotação desatualizada quando informado no quoteMetaMap', () => {
      const positionWithStaleQuote: DerivedAssetPosition = {
        assetId: 'ast-stale',
        ticker: 'BBAS3',
        name: 'Banco do Brasil',
        category: 'Ações Brasil',
        currency: 'BRL',
        market: 'B3',
        targetPercentage: 10.0,
        quantity: 100,
        hasKnownQuantity: true,
        isBalanceOnly: false,
        hasKnownCost: true,
        avgCostOriginal: 25.0,
        avgCostBRL: 25.0,
        totalInvestedBRL: 2500.0,
        realizedPnLOriginal: 0,
        realizedPnLBRL: 0,
        totalDividendsOriginal: 0,
        totalDividendsBRL: 0,
        currentPriceOriginal: 28.0,
        currentFxRateToBRL: 1.0,
        currentPriceBRL: 28.0,
        currentValueOriginal: 2800.0,
        currentValueBRL: 2800.0,
        unrealizedPnLBRL: 300.0,
        unrealizedPnLPercent: 12.0,
        assetReturnPercentOriginal: 12.0,
        fxReturnPercent: 0,
        movementCount: 1,
        ledgerChecksum: 'chk-bbas',
        lastMovementDate: '2026-01-10',
      };

      render(
        <PortfolioDashboardView
          positions={[positionWithStaleQuote]}
          quoteMetaMap={{
            'ast-stale': {
              quoteStatus: 'STALE',
              lastUpdateDate: '2026-09-20',
            },
          }}
        />
      );

      const staleBadges = screen.getAllByTestId('badge-stale-quote');
      expect(staleBadges.length).toBeGreaterThan(0);
      expect(staleBadges[0]).toHaveTextContent(/desatualizada/i);
    });

    it('deve exibir ganho/perda não realizado e variação sobre o custo reais quando quantidade e preço médio forem conhecidos', () => {
      const completePosition: DerivedAssetPosition = {
        assetId: 'ast-complete',
        ticker: 'WEGE3',
        name: 'WEG S.A.',
        category: 'Ações Brasil',
        currency: 'BRL',
        market: 'B3',
        targetPercentage: 15.0,
        quantity: 100,
        hasKnownQuantity: true,
        isBalanceOnly: false,
        hasKnownCost: true,
        avgCostOriginal: 40.0,
        avgCostBRL: 40.0,
        totalInvestedBRL: 4000.0,
        realizedPnLOriginal: 0,
        realizedPnLBRL: 0,
        totalDividendsOriginal: 0,
        totalDividendsBRL: 0,
        currentPriceOriginal: 50.0,
        currentFxRateToBRL: 1.0,
        currentPriceBRL: 50.0,
        currentValueOriginal: 5000.0,
        currentValueBRL: 5000.0,
        unrealizedPnLBRL: 1000.0,
        unrealizedPnLPercent: 25.0,
        assetReturnPercentOriginal: 25.0,
        fxReturnPercent: 0,
        movementCount: 1,
        ledgerChecksum: 'chk-wege',
        lastMovementDate: '2026-02-15',
      };

      render(
        <PortfolioDashboardView
          positions={[completePosition]}
          quoteMetaMap={{
            'ast-complete': {
              quoteStatus: 'UP_TO_DATE',
            },
          }}
        />
      );

      // Deve exibir rótulo fiel de ganho/perda não realizado
      expect(screen.getAllByText('Ganho/perda não realizado').length).toBeGreaterThan(0);

      // Deve exibir ganho positivo em R$ e variação sobre o custo formatados
      expect(screen.getAllByText(/\+R\$\s*1\.000,00/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/\+25,0%/i).length).toBeGreaterThan(0);
    });
  });

  describe('5. Portas de Entrada da Carteira e Conexão de Instituições (UX Honestidade & Sem Credenciais)', () => {
    it('no estado vazio, deve apresentar com clareza as três portas de entrada', () => {
      render(
        <PortfolioDashboardView
          positions={[]}
          movements={[]}
          onStartSetup={vi.fn()}
          onImportBatch={vi.fn()}
        />
      );

      // Três opções visíveis e identificáveis
      expect(screen.getByRole('heading', { name: /importar arquivo/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /cadastrar manualmente/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /conectar instituições/i })).toBeInTheDocument();
      expect(screen.getAllByText(/em desenvolvimento/i).length).toBeGreaterThan(0);
    });

    it('no estado vazio, clicar em "Importar arquivo" abre o modal de importação XLSX/CSV', () => {
      render(
        <PortfolioDashboardView
          positions={[]}
          movements={[]}
          onImportBatch={vi.fn()}
        />
      );

      const importBtn = screen.getByTestId('empty-state-import-button');
      fireEvent.click(importBtn);

      // Confirma que o modal de importação de planilha abriu
      expect(screen.getByTestId('import-spreadsheet-modal')).toBeInTheDocument();
      expect(screen.getByText(/importar planilha \(csv ou xlsx\)/i)).toBeInTheDocument();
    });

    it('no estado vazio, clicar em "Conectar instituições" abre o modal informativo de desenvolvimento', () => {
      render(
        <PortfolioDashboardView
          positions={[]}
          movements={[]}
        />
      );

      const connectBtn = screen.getByTestId('empty-state-connect-button');
      fireEvent.click(connectBtn);

      // Abre o modal informativo com título e mensagem honesta
      expect(screen.getByTestId('connect-institutions-modal')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /conexão automática em desenvolvimento/i })).toBeInTheDocument();
      expect(screen.getByText(/o finanças pro invest nunca estima preço médio/i)).toBeInTheDocument();
    });

    it('na barra superior, o botão Conectar com badge "Em breve" abre o modal e permite navegar para importação ou cadastro', () => {
      const handleSaveAsset = vi.fn();
      const handleImportBatch = vi.fn();

      render(
        <PortfolioDashboardView
          positions={[]}
          movements={[]}
          onSaveAsset={handleSaveAsset}
          onImportBatch={handleImportBatch}
        />
      );

      // Clica no botão Conectar da barra de ações superior
      const topConnectBtn = screen.getByTestId('top-bar-connect-button');
      fireEvent.click(topConnectBtn);

      expect(screen.getByTestId('connect-institutions-modal')).toBeInTheDocument();

      // Clicar em "Importar arquivo" dentro do modal informativo deve abrir o importador
      const modalImportBtn = screen.getByTestId('modal-import-button');
      fireEvent.click(modalImportBtn);

      expect(screen.queryByTestId('connect-institutions-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('import-spreadsheet-modal')).toBeInTheDocument();
      expect(screen.getByText(/importar planilha \(csv ou xlsx\)/i)).toBeInTheDocument();
    });

    it('dentro do modal informativo, clicar em "Cadastrar manualmente" abre o AssetModal', () => {
      const handleSaveAsset = vi.fn();

      render(
        <PortfolioDashboardView
          positions={[]}
          movements={[]}
          onSaveAsset={handleSaveAsset}
        />
      );

      const topConnectBtn = screen.getByTestId('top-bar-connect-button');
      fireEvent.click(topConnectBtn);

      const modalManualBtn = screen.getByTestId('modal-manual-button');
      fireEvent.click(modalManualBtn);

      expect(screen.queryByTestId('connect-institutions-modal')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /novo ativo/i })).toBeInTheDocument();
    });

    it('GARANTIA DE INOCUIDADE CONTÁBIL: interagir com o modal de conexão não altera nenhum dado da carteira', () => {
      const handleSaveAsset = vi.fn();
      const handleAddMovement = vi.fn();
      const handleVoidMovement = vi.fn();
      const handleSyncCash = vi.fn();

      render(
        <PortfolioDashboardView
          positions={[]}
          movements={[]}
          onSaveAsset={handleSaveAsset}
          onAddMovement={handleAddMovement}
          onVoidMovement={handleVoidMovement}
          onSyncCashBalance={handleSyncCash}
        />
      );

      // Abre e fecha o modal informativo
      const topConnectBtn = screen.getByTestId('top-bar-connect-button');
      fireEvent.click(topConnectBtn);

      const entendiBtn = screen.getByTestId('modal-dismiss-button');
      fireEvent.click(entendiBtn);

      // Nenhuma mutação ou persistência deve ter sido acionada
      expect(handleSaveAsset).not.toHaveBeenCalled();
      expect(handleAddMovement).not.toHaveBeenCalled();
      expect(handleVoidMovement).not.toHaveBeenCalled();
      expect(handleSyncCash).not.toHaveBeenCalled();
    });

    it('transição pelo teclado: ao ir de Conectar Instituições para Importar Arquivo, o foco vai para o modal de destino e não para o botão ao fundo', () => {
      vi.useFakeTimers();
      render(
        <PortfolioDashboardView
          positions={[]}
          movements={[]}
          onImportBatch={vi.fn()}
        />
      );

      const triggerBtn = screen.getByTestId('empty-state-connect-button');
      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      // Abre modal de conexão
      fireEvent.click(triggerBtn);
      vi.runAllTimers();

      expect(screen.getByTestId('connect-institutions-modal')).toBeInTheDocument();

      // Clica em Importar Arquivo dentro do modal de conexão
      const modalImportBtn = screen.getByTestId('modal-import-button');
      fireEvent.click(modalImportBtn);
      vi.runAllTimers();

      const importModal = screen.getByTestId('import-spreadsheet-modal');
      expect(importModal).toBeInTheDocument();

      // Confirma que o foco está DENTRO do modal de importação e NÃO no botão trigger de fundo
      expect(document.activeElement).not.toBe(triggerBtn);
      expect(importModal.contains(document.activeElement)).toBe(true);

      vi.useRealTimers();
    });

    it('transição pelo teclado: ao ir de Conectar Instituições para Cadastrar Manualmente, o foco vai para o modal de destino e não para o botão ao fundo', () => {
      vi.useFakeTimers();
      render(
        <PortfolioDashboardView
          positions={[]}
          movements={[]}
          onSaveAsset={vi.fn()}
        />
      );

      const triggerBtn = screen.getByTestId('empty-state-connect-button');
      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      // Abre modal de conexão
      fireEvent.click(triggerBtn);
      vi.runAllTimers();

      expect(screen.getByTestId('connect-institutions-modal')).toBeInTheDocument();

      // Clica em Cadastrar Manualmente dentro do modal de conexão
      const modalManualBtn = screen.getByTestId('modal-manual-button');
      fireEvent.click(modalManualBtn);
      vi.runAllTimers();

      const assetModal = screen.getByTestId('asset-modal');
      expect(assetModal).toBeInTheDocument();

      // Confirma que o foco está DENTRO do AssetModal (no input de ticker) e NÃO no botão trigger de fundo
      expect(document.activeElement).not.toBe(triggerBtn);
      expect(assetModal.contains(document.activeElement)).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('6. Etapa 3: Proventos, Atualização de Cotações e Métricas Institucionais', () => {
    const sampleAsset = {
      id: 'ast-petr4',
      userId: 'user-1',
      ticker: 'PETR4',
      name: 'Petrobras PN',
      category: 'Ações Brasil',
      currency: 'BRL' as const,
      market: 'B3' as const,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    const samplePosition: DerivedAssetPosition = {
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
      totalDividendsOriginal: 150,
      totalDividendsBRL: 150,
      currentPriceOriginal: 36,
      currentFxRateToBRL: 1,
      currentPriceBRL: 36,
      currentValueOriginal: 3600,
      currentValueBRL: 3600,
      unrealizedPnLBRL: 600,
      unrealizedPnLPercent: 20,
      assetReturnPercentOriginal: 20,
      fxReturnPercent: 0,
      movementCount: 2,
      ledgerChecksum: 'chk3',
      lastMovementDate: '2026-06-01',
    };

    const sampleSummary: PortfolioAllocationSummary = {
      consolidatedTotalBRL: 3600,
      totalInvestedAssetsBRL: 3600,
      totalPortfolioCashBRL: 0,
      denominatorUsedBRL: 3600,
      includeCashInTargets: true,
      sumTargetsPercentage: 100,
      isTargetSumValid: true,
      targetDiscrepancyPercent: 0,
      categories: [
        {
          category: 'Ações Brasil',
          targetPercentage: 100,
          currentValueBRL: 3600,
          currentPercentage: 100,
          differenceBRL: 0,
          allocationRatio: 1,
        },
      ],
      assets: [],
    };

    it('deve disparar onRefreshQuotes ao clicar no botão Cotações', () => {
      const handleRefresh = vi.fn().mockResolvedValue(undefined);

      render(
        <PortfolioDashboardView
          assets={[sampleAsset]}
          positions={[samplePosition]}
          onRefreshQuotes={handleRefresh}
        />
      );

      const refreshBtn = screen.getByTestId('refresh-quotes-button');
      expect(refreshBtn).toBeInTheDocument();
      fireEvent.click(refreshBtn);
      expect(handleRefresh).toHaveBeenCalledTimes(1);
    });

    it('deve alternar para a aba de Proventos e exibir o painel ao clicar na aba', () => {
      render(
        <PortfolioDashboardView
          assets={[sampleAsset]}
          positions={[samplePosition]}
          movements={[
            {
              id: 'mov-div-1',
              userId: 'user-1',
              assetId: 'ast-petr4',
              type: 'DIVIDEND',
              date: '2026-05-10',
              quantity: null,
              hasKnownQuantity: false,
              unitPrice: 0,
              fees: 0,
              grossAmount: 150,
              netAmount: 150,
              currency: 'BRL',
              fxRateToBRL: 1,
              fxSource: 'FIXED_ONE',
              netAmountBRL: 150,
              hasKnownCost: false,
              status: 'ACTIVE',
              createdAt: '2026-05-10',
              updatedAt: '2026-05-10',
            },
          ]}
        />
      );

      const tabDividends = screen.getByTestId('tab-dividends');
      fireEvent.click(tabDividends);

      expect(screen.getByTestId('portfolio-dividends-panel')).toBeInTheDocument();
      expect(screen.getByTestId('metric-total-dividends')).toHaveTextContent('R$ 150,00');
    });

    it('deve repassar métricas institucionais ao PortfolioSummaryCard quando fornecidas', () => {
      render(
        <PortfolioDashboardView
          summary={sampleSummary}
          positions={[samplePosition]}
          metrics={{
            modifiedDietzReturnPercent: 2.45,
            cdiBenchmarkPercent: 0.85,
            monthlyOrganicGrowthBRL: 350.0,
            monthlyExternalInflowBRL: 1000.0,
          }}
        />
      );

      expect(screen.getByTestId('portfolio-institutional-metrics')).toBeInTheDocument();
      expect(screen.getByText(/\+2,45%/i)).toBeInTheDocument();
      expect(screen.getByText(/288% CDI/i)).toBeInTheDocument();
      expect(screen.getByText(/\+R\$\s*350,00/i)).toBeInTheDocument();
      expect(screen.getByText(/R\$\s*1\.000,00/i)).toBeInTheDocument();
    });
  });

  describe('7. Etapa 4: Apuração Fiscal IRPF / DARF e Nexus Copilot', () => {
    const sampleAsset = {
      id: 'ast-vale3',
      userId: 'user-1',
      ticker: 'VALE3',
      name: 'Vale S.A.',
      category: 'Ações Brasil',
      currency: 'BRL' as const,
      market: 'B3' as const,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    };

    const samplePosition: DerivedAssetPosition = {
      assetId: 'ast-vale3',
      ticker: 'VALE3',
      name: 'Vale S.A.',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      targetPercentage: 20,
      quantity: 100,
      hasKnownQuantity: true,
      isBalanceOnly: false,
      hasKnownCost: true,
      avgCostOriginal: 60,
      avgCostBRL: 60,
      totalInvestedBRL: 6000,
      realizedPnLOriginal: 0,
      realizedPnLBRL: 0,
      totalDividendsOriginal: 0,
      totalDividendsBRL: 0,
      currentPriceOriginal: 65,
      currentFxRateToBRL: 1,
      currentPriceBRL: 65,
      currentValueOriginal: 6500,
      currentValueBRL: 6500,
      unrealizedPnLBRL: 500,
      unrealizedPnLPercent: 8.33,
      assetReturnPercentOriginal: 8.33,
      fxReturnPercent: 0,
      movementCount: 1,
      ledgerChecksum: 'chk-tax-1',
      lastMovementDate: '2026-06-01',
    };

    it('deve abrir o modal de IRPF ao clicar no botão da barra superior', () => {
      render(
        <PortfolioDashboardView
          assets={[sampleAsset]}
          positions={[samplePosition]}
          taxSummary={{
            accumulatedStocksLossBRL: 0,
            accumulatedFiisLossBRL: 0,
            totalTaxPaidOrDueBRL: 0,
            totalExemptProfitBRL: 1200,
            reports: [],
          }}
        />
      );

      const taxBtn = screen.getByTestId('top-bar-tax-button');
      expect(taxBtn).toBeInTheDocument();
      fireEvent.click(taxBtn);

      expect(screen.getByTestId('portfolio-tax-modal')).toBeInTheDocument();
      expect(screen.getByText(/Apuração Fiscal & Imposto de Renda/i)).toBeInTheDocument();
    });

    it('deve renderizar o PortfolioNexusCard quando houver recomendações estratégicas', () => {
      render(
        <PortfolioDashboardView
          assets={[sampleAsset]}
          positions={[samplePosition]}
          nexusInsights={[
            {
              id: 'ins-1',
              severity: 'warning',
              category: 'CONCENTRATION',
              title: 'Concentração em VALE3',
              message: 'VALE3 ultrapassou 30% do patrimônio.',
            },
          ]}
        />
      );

      expect(screen.getByTestId('portfolio-nexus-card')).toBeInTheDocument();
      expect(screen.getByText('Concentração em VALE3')).toBeInTheDocument();
    });

    it('deve acionar onNavigateToReserve ao clicar no botão Ver Reserva do Copilot Nexus', () => {
      const handleNavigateReserve = vi.fn();
      render(
        <PortfolioDashboardView
          assets={[sampleAsset]}
          positions={[samplePosition]}
          onNavigateToReserve={handleNavigateReserve}
          nexusInsights={[
            {
              id: 'insight-liquidity-shield-reserve',
              severity: 'warning',
              category: 'LIQUIDITY_SHIELD',
              title: 'Reserva de Emergência Vulnerável',
              message: 'Identificamos que sua proteção está abaixo da margem.',
              actionLabel: 'Ver Reserva',
            },
          ]}
        />
      );

      const btn = screen.getByRole('button', { name: /ver reserva/i });
      fireEvent.click(btn);
      expect(handleNavigateReserve).toHaveBeenCalledTimes(1);
    });

    it('deve exibir o badge com o status oficial do pregão B3 no cabeçalho executivo', () => {
      render(
        <PortfolioDashboardView
          assets={[sampleAsset]}
          positions={[samplePosition]}
        />
      );

      const b3Badge = screen.getByTestId('b3-market-status-badge');
      expect(b3Badge).toBeInTheDocument();
      expect(b3Badge.textContent).toMatch(/Pregão B3:/i);
    });

    it('deve abrir o modal defensivo de exclusão de ativo e invocar onDeleteAsset ao confirmar', async () => {
      const handleDeleteAsset = vi.fn().mockResolvedValue(undefined);

      render(
        <PortfolioDashboardView
          assets={[sampleAsset]}
          positions={[samplePosition]}
          movements={[
            {
              id: 'mov-1',
              userId: 'user-1',
              assetId: 'ast-vale3',
              type: 'BUY',
              date: '2026-01-01',
              quantity: 100,
              unitPrice: 60,
              grossAmount: 6000,
              netAmountBRL: 6000,
              fxRateToBRL: 1,
              fundingSource: 'EXTERNAL_NEW_MONEY',
              settlementTarget: 'PORTFOLIO_CASH',
              hasKnownCost: true,
              isVoided: false,
              createdAt: '2026-01-01',
              updatedAt: '2026-01-01',
            },
          ]}
          onDeleteAsset={handleDeleteAsset}
        />
      );

      // Abre o menu de ações do ativo VALE3
      const menuBtn = screen.getByTestId('asset-action-menu-btn-VALE3');
      fireEvent.click(menuBtn);

      // Clica em Excluir Ativo
      const deleteRowBtn = screen.getByTestId('btn-delete-asset-VALE3');
      fireEvent.click(deleteRowBtn);

      // Modal defensivo deve estar visível com aviso de 1 movimentação vinculada
      expect(screen.getByTestId('delete-asset-modal')).toBeInTheDocument();
      expect(screen.getByText(/Existem 1 movimentação\(ões\) associada\(s\) a este ativo no livro-razão/i)).toBeInTheDocument();

      // Clica em Cancelar
      const cancelBtn = screen.getByTestId('cancel-delete-asset-btn');
      fireEvent.click(cancelBtn);
      expect(screen.queryByTestId('delete-asset-modal')).not.toBeInTheDocument();
      expect(handleDeleteAsset).not.toHaveBeenCalled();

      // Abre novamente e confirma a exclusão
      fireEvent.click(menuBtn);
      fireEvent.click(screen.getByTestId('btn-delete-asset-VALE3'));
      expect(screen.getByTestId('delete-asset-modal')).toBeInTheDocument();

      const confirmBtn = screen.getByTestId('confirm-delete-asset-btn');
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      expect(handleDeleteAsset).toHaveBeenCalledTimes(1);
      expect(handleDeleteAsset).toHaveBeenCalledWith('ast-vale3');
    });

    it('deve abrir o AssetModal com dados do ativo preenchidos ao clicar em Editar Ativo', () => {
      const handleSaveAsset = vi.fn();

      render(
        <PortfolioDashboardView
          assets={[sampleAsset]}
          positions={[samplePosition]}
          classes={[{ id: 'cls-1', name: 'Ações Brasil', targetPercentage: 100, color: '#10b981' }]}
          onSaveAsset={handleSaveAsset}
        />
      );

      const menuBtn = screen.getByTestId('asset-action-menu-btn-VALE3');
      fireEvent.click(menuBtn);

      const editBtn = screen.getByTestId('btn-edit-asset-VALE3');
      fireEvent.click(editBtn);

      expect(screen.getByTestId('asset-modal')).toBeInTheDocument();
      expect(screen.getByText('Editar Ativo de Custódia')).toBeInTheDocument();
      expect(screen.getByDisplayValue('VALE3')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Vale S.A.')).toBeInTheDocument();
    });

    it('deve abrir o AssetDetailsDrawer (Raio-X) ao clicar no ticker do ativo', () => {
      render(
        <PortfolioDashboardView
          assets={[sampleAsset]}
          positions={[samplePosition]}
        />
      );

      const tickerBtn = screen.getByTestId('btn-open-details-VALE3');
      fireEvent.click(tickerBtn);

      expect(screen.getByTestId('asset-details-drawer')).toBeInTheDocument();
      expect(screen.getByTestId('drawer-asset-ticker')).toHaveTextContent('VALE3');
      expect(screen.getByTestId('drawer-asset-name')).toHaveTextContent('Vale S.A.');
    });

    it('deve renderizar os widgets de Últimas Movimentações, Radar de Proventos e Guia de Diversificação na aba de custódia', () => {
      const mockMovements = [
        {
          id: 'mov-1',
          userId: 'usr-1',
          assetId: 'ast-vale3',
          type: 'BUY' as const,
          date: '2026-03-01',
          quantity: 100,
          unitPriceBRL: 60,
          totalNetAmountBRL: 6000,
          totalGrossAmountBRL: 6000,
          currency: 'BRL' as const,
          createdAt: '2026-03-01T10:00:00Z',
        },
        {
          id: 'mov-2',
          userId: 'usr-1',
          assetId: 'ast-vale3',
          type: 'DIVIDEND' as const,
          date: '2026-03-15',
          totalNetAmountBRL: 250,
          totalGrossAmountBRL: 250,
          currency: 'BRL' as const,
          createdAt: '2026-03-15T10:00:00Z',
        },
      ];

      render(
        <PortfolioDashboardView
          assets={[sampleAsset]}
          positions={[samplePosition]}
          movements={mockMovements}
          classes={[{ id: 'cls-rf', name: 'Renda Fixa', targetPercentage: 50, color: '#10b981' }]}
          onSaveAsset={vi.fn()}
        />
      );

      // 1. Widget de Últimas Movimentações
      expect(screen.getByTestId('widget-recent-movements')).toBeInTheDocument();
      expect(screen.getByText('Últimas Movimentações')).toBeInTheDocument();
      expect(screen.getByText('Compra')).toBeInTheDocument();

      // Clicar em Ver Livro Razão deve alternar para a aba de movimentações
      const viewAllMovBtn = screen.getByTestId('btn-view-all-movements');
      fireEvent.click(viewAllMovBtn);
      expect(screen.getByText(/Livro Razão Contábil/)).toBeInTheDocument();

      // Volta para a aba de custódia
      fireEvent.click(screen.getByText(/Custódia & Metas/));

      // 2. Widget de Radar de Proventos
      const radarWidget = screen.getByTestId('widget-dividends-radar');
      expect(radarWidget).toBeInTheDocument();
      expect(radarWidget).toHaveTextContent('Radar de Proventos');
      expect(radarWidget).toHaveTextContent('R$ 250,00');

      // Clicar em Ver Painel Completo deve alternar para a aba de proventos
      const viewAllDivBtn = screen.getByTestId('btn-view-all-dividends');
      fireEvent.click(viewAllDivBtn);
      expect(screen.getByText('Proventos & Renda Passiva')).toBeInTheDocument();

      // Volta para a aba de custódia
      fireEvent.click(screen.getByText(/Custódia & Metas/));

      // 3. Guia de Diversificação Soberana (ativado pois positions.length = 1 <= 4)
      expect(screen.getByTestId('widget-portfolio-expansion-guide')).toBeInTheDocument();
      expect(screen.getByText(/Carteira em Construção: Expanda sua Diversificação/)).toBeInTheDocument();

      // Clicar em "+ Adicionar Renda Fixa" abre AssetModal pré-selecionado
      const addRfBtn = screen.getByTestId('btn-add-fixed-income');
      fireEvent.click(addRfBtn);
      expect(screen.getByTestId('asset-modal')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Renda Fixa')).toBeInTheDocument();
    });

    it('deve abrir o modal de calibração quando acionado via Nexus Copilot', () => {
      const mockPos: DerivedAssetPosition = {
        assetId: 'ast-1',
        ticker: 'VALE3',
        name: 'Vale S.A.',
        category: 'Ações Brasil',
        currency: 'BRL',
        market: 'B3',
        targetPercentage: 20.0,
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
        currentPriceOriginal: 65.0,
        currentFxRateToBRL: 1.0,
        currentPriceBRL: 65.0,
        currentValueOriginal: 6500.0,
        currentValueBRL: 6500.0,
        unrealizedPnLBRL: 500.0,
        unrealizedPnLPercent: 8.33,
        assetReturnPercentOriginal: 8.33,
        fxReturnPercent: 0,
        movementCount: 1,
        ledgerChecksum: 'c1',
        lastMovementDate: '2026-06-01',
      };

      render(
        <PortfolioDashboardView
          positions={[mockPos]}
          nexusInsights={[
            {
              id: 'insight-calibration-needed',
              severity: 'action',
              category: 'CALIBRATION',
              title: '1 Ativo Requer Calibração',
              message: 'Ativo importado sem quantidade de cotas',
              actionLabel: 'Calibrar Ativos',
            },
          ]}
        />
      );

      const calibrateBtn = screen.getByText('Calibrar Ativos');
      expect(calibrateBtn).toBeInTheDocument();
      fireEvent.click(calibrateBtn);

      expect(screen.getByTestId('asset-calibration-modal')).toBeInTheDocument();
    });
  });
});



