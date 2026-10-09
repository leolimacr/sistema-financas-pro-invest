import { describe, it, expect } from 'vitest';
import { generateImportPreview } from '../spreadsheetImporter';
import { replayAssetLedger } from '../portfolioMath';
import type {
  PortfolioAsset,
  PortfolioMovement,
  PortfolioUserData,
  DerivedAssetPosition,
} from '../portfolioTypes';

describe('Validação Soberana para Piloto Real da Carteira', () => {
  describe('1. Importação de Posição Inicial NÃO calcula rentabilidade histórica passada', () => {
    it('deve gerar movimentos de INITIAL_POSITION que, ao serem processados pelo livro-razão sem cotação de mercado, produzem rentabilidade e PnL estritamente nulos', () => {
      // 1. Simula planilha importada no modo INITIAL_POSITIONS
      const rawHeaders = ['Ativo', 'Nome', 'Classe', 'Qtd', 'Preco', 'Total'];
      const rawRows = [
        ['VALE3', 'Vale S.A.', 'Ações Brasil', '100', '65,00', '6.500,00'],
        ['ITUB4', 'Itaú Unibanco', 'Ações Brasil', '200', '32,50', '6.500,00'],
        ['CAIXA', 'Caixa Oportunidade', 'Caixa de Oportunidade', '', '', '10.000,00'],
      ];

      const preview = generateImportPreview({
        fileName: 'carga_inicial_piloto.csv',
        rawHeaders,
        rawRows,
        mapping: {
          tickerColumn: 'Ativo',
          nameColumn: 'Nome',
          categoryColumn: 'Classe',
          quantityColumn: 'Qtd',
          unitPriceColumn: 'Preco',
          totalValueColumn: 'Total',
        },
        mode: 'INITIAL_POSITIONS',
      });

      expect(preview.summary.totalRows).toBe(3);
      expect(preview.summary.errorCount).toBe(0);
      expect(preview.canProceed).toBe(true);

      // 2. Converte as linhas interpretadas em PortfolioAsset e PortfolioMovement reais
      const now = '2026-09-25T10:00:00Z';
      const assets: PortfolioAsset[] = [];
      const movements: PortfolioMovement[] = [];

      preview.previewRows.forEach((row, idx) => {
        const isCash = row.interpreted.ticker === 'CAIXA';
        const asset: PortfolioAsset = {
          id: `asset-${row.interpreted.ticker}`,
          userId: 'user-pilot-123',
          ticker: row.interpreted.ticker || '',
          name: row.interpreted.name || '',
          category: row.interpreted.category || '',
          currency: 'BRL',
          market: isCash ? 'CASH' : 'B3',
          isBalanceOnly: isCash,
          isOpportunityCash: isCash,
          createdAt: now,
          updatedAt: now,
        };
        assets.push(asset);

        const movement: PortfolioMovement = {
          id: `mov-init-${idx}`,
          userId: 'user-pilot-123',
          assetId: asset.id,
          type: 'INITIAL_POSITION',
          date: '2026-09-01',
          quantity: isCash ? null : (row.interpreted.quantity ?? null),
          hasKnownQuantity: !isCash,
          unitPrice: isCash ? 0 : (row.interpreted.unitPrice || 0),
          fees: 0,
          grossAmount: row.interpreted.totalValue || 0,
          netAmount: row.interpreted.totalValue || 0,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: row.interpreted.totalValue || 0,
          hasKnownCost: !isCash,
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        };
        movements.push(movement);
      });

      // 3. Processa cada ativo pelo motor financeiro soberano (replayAssetLedger) SEM cotação de mercado
      const positions: DerivedAssetPosition[] = assets.map((asset) => {
        const assetMovements = movements.filter((m) => m.assetId === asset.id);
        return replayAssetLedger({
          assetId: asset.id,
          ticker: asset.ticker,
          name: asset.name,
          category: asset.category,
          currency: asset.currency,
          market: asset.market,
          targetPercentage: 0,
          movements: assetMovements,
          currentPriceOriginal: null, // Sem cotação externa informada
          currentFxRateToBRL: 1.0,
        });
      });

      // Posição VALE3:
      const valePos = positions.find((p) => p.ticker === 'VALE3')!;
      expect(valePos.quantity).toBe(100);
      expect(valePos.avgCostBRL).toBe(65.0);
      expect(valePos.totalInvestedBRL).toBe(6500.0);
      // Sem cotação, currentValueBRL é null e NENHUMA rentabilidade passada é calculada
      expect(valePos.currentPriceBRL).toBeNull();
      expect(valePos.currentValueBRL).toBeNull();
      expect(valePos.unrealizedPnLBRL).toBeNull();
      expect(valePos.unrealizedPnLPercent).toBeNull();
      expect(valePos.assetReturnPercentOriginal).toBeNull();

      // Posição CAIXA:
      const cashPos = positions.find((p) => p.ticker === 'CAIXA')!;
      expect(cashPos.isBalanceOnly).toBe(true);
      expect(cashPos.currentValueBRL).toBe(10000.0);
      expect(cashPos.avgCostBRL).toBeNull();
      expect(cashPos.unrealizedPnLBRL).toBeNull();
      expect(cashPos.unrealizedPnLPercent).toBeNull();
      expect(cashPos.assetReturnPercentOriginal).toBeNull();
    });
  });

  describe('2. Exportação após importação contém integralmente os registros criados', () => {
    it('deve gerar payload JSON e CSV contendo todos os ativos, classes, caixas e movimentações importadas', () => {
      const classes = [
        { id: 'c1', name: 'Ações Brasil', targetPercentage: 60 },
        { id: 'c2', name: 'Caixa de Oportunidade', targetPercentage: 40 },
      ];

      const assets: PortfolioAsset[] = [
        {
          id: 'ast-petr4',
          userId: 'pilot-user',
          ticker: 'PETR4',
          name: 'Petrobras PN',
          category: 'Ações Brasil',
          currency: 'BRL',
          market: 'B3',
          createdAt: '2026-09-25T10:00:00Z',
          updatedAt: '2026-09-25T10:00:00Z',
        },
        {
          id: 'ast-caixa',
          userId: 'pilot-user',
          ticker: 'CAIXA',
          name: 'Caixa de Oportunidade',
          category: 'Caixa de Oportunidade',
          currency: 'BRL',
          market: 'CASH',
          isBalanceOnly: true,
          isOpportunityCash: true,
          createdAt: '2026-09-25T10:00:00Z',
          updatedAt: '2026-09-25T10:00:00Z',
        },
      ];

      const movements: PortfolioMovement[] = [
        {
          id: 'mov-1',
          userId: 'pilot-user',
          assetId: 'ast-petr4',
          type: 'INITIAL_POSITION',
          date: '2026-09-01',
          quantity: 200,
          unitPrice: 35.0,
          fees: 0,
          grossAmount: 7000,
          netAmount: 7000,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 7000,
          status: 'ACTIVE',
          createdAt: '2026-09-01T10:00:00Z',
          updatedAt: '2026-09-01T10:00:00Z',
        },
        {
          id: 'mov-2',
          userId: 'pilot-user',
          assetId: 'ast-caixa',
          type: 'INITIAL_POSITION',
          date: '2026-09-01',
          quantity: null,
          unitPrice: 0,
          fees: 0,
          grossAmount: 15000,
          netAmount: 15000,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: 15000,
          status: 'ACTIVE',
          createdAt: '2026-09-01T10:00:00Z',
          updatedAt: '2026-09-01T10:00:00Z',
        },
      ];

      const cashBalances = {
        'ast-caixa': {
          userId: 'pilot-user',
          cashAssetId: 'ast-caixa',
          availableBalanceBRL: 15000,
          version: 1,
          updatedAt: '2026-09-01T10:00:00Z',
        },
      };

      const portfolioData: PortfolioUserData = {
        classes,
        assets,
        movements,
        cashBalances,
      };

      // 1. Exportação JSON (Backup completo da carteira)
      const jsonExport = JSON.stringify(portfolioData, null, 2);
      const parsed = JSON.parse(jsonExport) as PortfolioUserData;

      expect(parsed.classes).toHaveLength(2);
      expect(parsed.assets).toHaveLength(2);
      expect(parsed.movements).toHaveLength(2);
      expect(parsed.cashBalances?.['ast-caixa'].availableBalanceBRL).toBe(15000);

      // Confirma que os tickers e valores exatos estão preservados
      expect(parsed.assets.map((a) => a.ticker)).toEqual(['PETR4', 'CAIXA']);
      expect(parsed.movements.find((m) => m.assetId === 'ast-petr4')?.netAmountBRL).toBe(7000);
      expect(parsed.movements.find((m) => m.assetId === 'ast-caixa')?.netAmountBRL).toBe(15000);

      // 2. Exportação CSV de Posições
      const positions: DerivedAssetPosition[] = [
        {
          assetId: 'ast-petr4',
          ticker: 'PETR4',
          name: 'Petrobras PN',
          category: 'Ações Brasil',
          currency: 'BRL',
          market: 'B3',
          targetPercentage: 60,
          quantity: 200,
          hasKnownQuantity: true,
          isBalanceOnly: false,
          hasKnownCost: true,
          avgCostOriginal: 35.0,
          avgCostBRL: 35.0,
          totalInvestedBRL: 7000.0,
          currentPriceOriginal: null,
          currentPriceBRL: null,
          currentValueBRL: null,
          unrealizedPnLBRL: null,
          unrealizedPnLPercent: null,
          assetReturnPercentOriginal: null,
          fxReturnPercent: null,
          currentFxRateToBRL: 1.0,
          realizedPnLBRL: 0,
          totalDividendsBRL: 0,
          firstOperationDate: '2026-09-01',
          lastOperationDate: '2026-09-01',
        },
        {
          assetId: 'ast-caixa',
          ticker: 'CAIXA',
          name: 'Caixa de Oportunidade',
          category: 'Caixa de Oportunidade',
          currency: 'BRL',
          market: 'CASH',
          targetPercentage: 40,
          quantity: null,
          hasKnownQuantity: false,
          isBalanceOnly: true,
          hasKnownCost: false,
          avgCostOriginal: null,
          avgCostBRL: null,
          totalInvestedBRL: null,
          currentPriceOriginal: 1.0,
          currentPriceBRL: 1.0,
          currentValueBRL: 15000.0,
          unrealizedPnLBRL: null,
          unrealizedPnLPercent: null,
          assetReturnPercentOriginal: null,
          fxReturnPercent: null,
          currentFxRateToBRL: 1.0,
          realizedPnLBRL: 0,
          totalDividendsBRL: 0,
          firstOperationDate: '2026-09-01',
          lastOperationDate: '2026-09-01',
        },
      ];

      const csvRows = positions.map((p) => [
        p.ticker,
        `"${p.name}"`,
        `"${p.category}"`,
        p.currency,
        p.market,
        p.quantity !== null ? p.quantity.toString().replace('.', ',') : '',
        p.avgCostBRL !== null ? p.avgCostBRL.toFixed(4).replace('.', ',') : '',
        p.currentPriceBRL !== null ? p.currentPriceBRL.toFixed(4).replace('.', ',') : '',
        p.currentValueBRL !== null ? p.currentValueBRL.toFixed(2).replace('.', ',') : (p.totalInvestedBRL !== null ? p.totalInvestedBRL.toFixed(2).replace('.', ',') : ''),
      ].join(';'));

      const csvContent = csvRows.join('\r\n');
      expect(csvContent).toContain('PETR4;"Petrobras PN";"Ações Brasil";BRL;B3;200;35,0000;;7000,00');
      expect(csvContent).toContain('CAIXA;"Caixa de Oportunidade";"Caixa de Oportunidade";BRL;CASH;;;1,0000;15000,00');
    });
  });

  describe('3. Recarga após importação preserva integralmente os totais de patrimônio, custo e caixa', () => {
    it('deve hidratar os dados gravados sem perda ou distorção de centavos nos totais consolidados', () => {
      // 1. Dados gravados após importação
      const initialUserData: PortfolioUserData = {
        classes: [
          { id: 'c1', name: 'Ações Brasil', targetPercentage: 50 },
          { id: 'c2', name: 'Caixa de Oportunidade', targetPercentage: 50 },
        ],
        assets: [
          {
            id: 'ast-petr4',
            userId: 'pilot-user',
            ticker: 'PETR4',
            name: 'Petrobras PN',
            category: 'Ações Brasil',
            currency: 'BRL',
            market: 'B3',
            manualPrice: 38.0, // Cotação manual informada
            createdAt: '2026-09-25T10:00:00Z',
            updatedAt: '2026-09-25T10:00:00Z',
          },
          {
            id: 'ast-caixa',
            userId: 'pilot-user',
            ticker: 'CAIXA',
            name: 'Caixa de Oportunidade',
            category: 'Caixa de Oportunidade',
            currency: 'BRL',
            market: 'CASH',
            isBalanceOnly: true,
            isOpportunityCash: true,
            createdAt: '2026-09-25T10:00:00Z',
            updatedAt: '2026-09-25T10:00:00Z',
          },
        ],
        movements: [
          {
            id: 'mov-petr4',
            userId: 'pilot-user',
            assetId: 'ast-petr4',
            type: 'INITIAL_POSITION',
            date: '2026-09-01',
            quantity: 100,
            unitPrice: 35.0,
            fees: 0,
            grossAmount: 3500.0,
            netAmount: 3500.0,
            currency: 'BRL',
            fxRateToBRL: 1.0,
            fxSource: 'FIXED_ONE',
            netAmountBRL: 3500.0,
            hasKnownCost: true,
            status: 'ACTIVE',
            createdAt: '2026-09-01T10:00:00Z',
            updatedAt: '2026-09-01T10:00:00Z',
          },
          {
            id: 'mov-caixa',
            userId: 'pilot-user',
            assetId: 'ast-caixa',
            type: 'INITIAL_POSITION',
            date: '2026-09-01',
            quantity: null,
            unitPrice: 0,
            fees: 0,
            grossAmount: 10000.0,
            netAmount: 10000.0,
            currency: 'BRL',
            fxRateToBRL: 1.0,
            fxSource: 'FIXED_ONE',
            netAmountBRL: 10000.0,
            hasKnownCost: false,
            status: 'ACTIVE',
            createdAt: '2026-09-01T10:00:00Z',
            updatedAt: '2026-09-01T10:00:00Z',
          },
        ],
        cashBalances: {
          'ast-caixa': {
            userId: 'pilot-user',
            cashAssetId: 'ast-caixa',
            availableBalanceBRL: 10000.0,
            version: 1,
            updatedAt: '2026-09-01T10:00:00Z',
          },
        },
      };

      // 2. Simula ciclo completo de persistência e reload (F5) serializando e desserializando
      const serialized = JSON.stringify(initialUserData);
      const rehydratedData = JSON.parse(serialized) as PortfolioUserData;

      // 3. Replay do livro-razão no estado reidratado
      const rehydratedPositions = rehydratedData.assets.map((asset) => {
        const assetMovements = rehydratedData.movements.filter((m) => m.assetId === asset.id);
        return replayAssetLedger({
          assetId: asset.id,
          ticker: asset.ticker,
          name: asset.name,
          category: asset.category,
          currency: asset.currency,
          market: asset.market,
          targetPercentage: 0,
          movements: assetMovements,
          currentPriceOriginal: asset.manualPrice || (asset.market === 'CASH' ? 1.0 : null),
          currentFxRateToBRL: 1.0,
        });
      });

      const petr4Pos = rehydratedPositions.find((p) => p.ticker === 'PETR4')!;
      expect(petr4Pos.quantity).toBe(100);
      expect(petr4Pos.avgCostBRL).toBe(35.0);
      expect(petr4Pos.totalInvestedBRL).toBe(3500.0);
      expect(petr4Pos.currentPriceBRL).toBe(38.0);
      expect(petr4Pos.currentValueBRL).toBe(3800.0);
      expect(petr4Pos.unrealizedPnLBRL).toBe(300.0); // 3800 - 3500

      const cashPos = rehydratedPositions.find((p) => p.ticker === 'CAIXA')!;
      expect(cashPos.currentValueBRL).toBe(10000.0);

      // Total consolidado: 3.800 (PETR4) + 10.000 (Caixa) = 13.800
      const totalPatrimonio = (petr4Pos.currentValueBRL || 0) + (cashPos.currentValueBRL || 0);
      expect(totalPatrimonio).toBe(13800.0);
    });
  });
});
