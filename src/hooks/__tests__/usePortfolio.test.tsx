import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePortfolio } from '../usePortfolio';
import type { PortfolioAsset, PortfolioMovement } from '../../core/portfolio/portfolioTypes';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Mock com estado em memória para portfolioService
let memoryClasses = [
  { id: 'c1', name: 'Ações Brasil', targetPercentage: 40 },
  { id: 'c2', name: 'Renda Fixa', targetPercentage: 60 },
];
let memoryAssets: PortfolioAsset[] = [];
let memoryMovements: PortfolioMovement[] = [];
let memoryCashBalances: Record<string, import('../../core/portfolio/portfolioTypes').PortfolioCashBalance> = {};

vi.mock('../../services/portfolioService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/portfolioService')>();
  return {
    ...actual,
    loadPortfolioData: vi.fn(async () => ({
      classes: memoryClasses,
      assets: memoryAssets,
      movements: memoryMovements,
      cashBalances: memoryCashBalances,
    })),
    savePortfolioClass: vi.fn(async (_uid, c) => {
      memoryClasses = [...memoryClasses.filter((item) => item.id !== c.id), c];
    }),
    saveAllPortfolioClasses: vi.fn(async (_uid, classes) => {
      memoryClasses = classes;
    }),
    savePortfolioAsset: vi.fn(async (_uid, asset) => {
      memoryAssets = [...memoryAssets.filter((a) => a.id !== asset.id), asset];
    }),
    saveAllPortfolioAssets: vi.fn(async (_uid, updatedAssets: PortfolioAsset[]) => {
      const updatedMap = new Map(updatedAssets.map((a) => [a.id, a]));
      memoryAssets = memoryAssets.map((a) => updatedMap.get(a.id) || a);
      updatedAssets.forEach((a) => {
        if (!memoryAssets.some((m) => m.id === a.id)) {
          memoryAssets.push(a);
        }
      });
    }),
    deletePortfolioAsset: vi.fn(async (_uid, assetId) => {
      memoryAssets = memoryAssets.filter((a) => a.id !== assetId);
      memoryMovements = memoryMovements.filter((m) => m.assetId !== assetId);
    }),
    savePortfolioMovement: vi.fn(async (_uid, mov) => {
      memoryMovements = [...memoryMovements.filter((m) => m.id !== mov.id), mov];
    }),
    voidPortfolioMovement: vi.fn(async (_uid, mov) => {
      memoryMovements = memoryMovements.map((m) => (m.id === mov.id ? { ...m, status: 'VOIDED' } : m));
    }),
    clearAllPortfolioData: vi.fn(async () => {
      memoryAssets = [];
      memoryMovements = [];
      memoryCashBalances = {};
    }),
  };
});

describe('usePortfolio Hook', () => {
  const TEST_UID = 'test-user-hook-123';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    memoryAssets = [];
    memoryMovements = [];
    memoryCashBalances = {};
    vi.clearAllMocks();
  });

  it('1. Deve inicializar com classes padrão e listas vazias de ativos e movimentações', () => {
    const { result } = renderHook(() => usePortfolio(TEST_UID), {
      wrapper: createWrapper(),
    });

    expect(result.current.classes.length).toBeGreaterThan(0);
    expect(result.current.assets).toEqual([]);
    expect(result.current.movements).toEqual([]);
    expect(result.current.positions).toEqual([]);
    expect(result.current.summary).toBeNull();
  });

  it('2. Deve adicionar um ativo e calcular a posição derivada com precisão ao registrar uma movimentação', async () => {
    const { result } = renderHook(() => usePortfolio(TEST_UID), {
      wrapper: createWrapper(),
    });

    const newAsset: PortfolioAsset = {
      id: 'asset-itub4',
      userId: TEST_UID,
      ticker: 'ITUB4',
      name: 'Itaú Unibanco PN',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      targetPercentage: 15,
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    };

    await act(async () => {
      await result.current.saveAsset(newAsset);
    });

    await waitFor(() => {
      expect(result.current.assets).toHaveLength(1);
    });
    expect(result.current.assets[0].ticker).toBe('ITUB4');

    // Registrar posição inicial
    const movement: PortfolioMovement = {
      id: 'mov-itub4-init',
      userId: TEST_UID,
      assetId: 'asset-itub4',
      type: 'INITIAL_POSITION',
      date: '2026-01-10',
      quantity: 100,
      unitPrice: 32.5,
      fees: 0,
      grossAmount: 3250,
      netAmount: 3250,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 3250,
      status: 'ACTIVE',
      createdAt: '2026-01-10T10:00:00Z',
      updatedAt: '2026-01-10T10:00:00Z',
    };

    await act(async () => {
      await result.current.addMovement(movement);
    });

    await waitFor(() => {
      expect(result.current.movements).toHaveLength(1);
      expect(result.current.positions).toHaveLength(1);
    });

    const pos = result.current.positions[0];
    expect(pos.ticker).toBe('ITUB4');
    expect(pos.quantity).toBe(100);
    expect(pos.avgCostBRL).toBe(32.5);
    expect(pos.totalInvestedBRL).toBe(3250);
    expect(result.current.summary).not.toBeNull();
  });

  it('3. Deve suportar exclusão de ativo e estorno de movimentações', async () => {
    const { result } = renderHook(() => usePortfolio(TEST_UID), {
      wrapper: createWrapper(),
    });

    const asset: PortfolioAsset = {
      id: 'asset-delete-test',
      userId: TEST_UID,
      ticker: 'TEST3',
      name: 'Teste',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    };

    await act(async () => {
      await result.current.saveAsset(asset);
    });
    await waitFor(() => {
      expect(result.current.assets).toHaveLength(1);
    });

    await act(async () => {
      await result.current.deleteAsset('asset-delete-test');
    });
    await waitFor(() => {
      expect(result.current.assets).toHaveLength(0);
    });
  });

  it('4. Deve rejeitar compra com PORTFOLIO_CASH quando saldo em caixa for insuficiente', async () => {
    const { result } = renderHook(() => usePortfolio(TEST_UID), {
      wrapper: createWrapper(),
    });

    // 1. Cadastra ativo de caixa com saldo R$ 5.000
    const cashAsset: PortfolioAsset = {
      id: 'asset-caixa-1',
      userId: TEST_UID,
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
    await act(async () => {
      await result.current.saveAsset(cashAsset);
      await result.current.addMovement({
        id: 'mov-cash-init',
        userId: TEST_UID,
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
      });
    });

    // 2. Cadastra ativo PETR4
    const petr4: PortfolioAsset = {
      id: 'asset-petr4',
      userId: TEST_UID,
      ticker: 'PETR4',
      name: 'Petrobras',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    };
    await act(async () => {
      await result.current.saveAsset(petr4);
    });

    // 3. Tenta comprar R$ 7.000 usando PORTFOLIO_CASH (disponível é apenas R$ 5.000)
    await expect(
      result.current.addMovement({
        id: 'mov-buy-overdraft',
        userId: TEST_UID,
        assetId: 'asset-petr4',
        type: 'BUY',
        date: '2026-09-10',
        quantity: 200,
        unitPrice: 35,
        fees: 0,
        grossAmount: 7000,
        netAmount: 7000,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fxSource: 'FIXED_ONE',
        netAmountBRL: 7000,
        fundingSource: 'PORTFOLIO_CASH',
        status: 'ACTIVE',
        createdAt: '2026-09-10T10:00:00Z',
        updatedAt: '2026-09-10T10:00:00Z',
      })
    ).rejects.toThrow(/saldo insuficiente no caixa/i);
  });

  it('5. Deve estornar ambas as pernas vinculadas quando uma compra com contrapartida em caixa for anulada', async () => {
    const { result } = renderHook(() => usePortfolio(TEST_UID), {
      wrapper: createWrapper(),
    });

    // 1. Cadastra caixa com R$ 10.000
    const cashAsset: PortfolioAsset = {
      id: 'asset-caixa-unique',
      userId: TEST_UID,
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
    const petr4: PortfolioAsset = {
      id: 'asset-petr4-link',
      userId: TEST_UID,
      ticker: 'PETR4',
      name: 'Petrobras',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    };

    await act(async () => {
      await result.current.saveAsset(cashAsset);
      await result.current.saveAsset(petr4);
      await result.current.addMovement({
        id: 'mov-cash-base',
        userId: TEST_UID,
        assetId: 'asset-caixa-unique',
        type: 'INITIAL_POSITION',
        date: '2026-09-01',
        quantity: null,
        unitPrice: 0,
        fees: 0,
        grossAmount: 10000,
        netAmount: 10000,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fxSource: 'FIXED_ONE',
        netAmountBRL: 10000,
        status: 'ACTIVE',
        createdAt: '2026-09-01T10:00:00Z',
        updatedAt: '2026-09-01T10:00:00Z',
      });
    });

    // 2. Compra de R$ 3.850 via PORTFOLIO_CASH
    const buyMovId = 'mov-buy-petr4-linked';
    await act(async () => {
      await result.current.addMovement({
        id: buyMovId,
        userId: TEST_UID,
        assetId: 'asset-petr4-link',
        type: 'BUY',
        date: '2026-09-15',
        quantity: 100,
        unitPrice: 38.5,
        fees: 0,
        grossAmount: 3850,
        netAmount: 3850,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fxSource: 'FIXED_ONE',
        netAmountBRL: 3850,
        fundingSource: 'PORTFOLIO_CASH',
        status: 'ACTIVE',
        createdAt: '2026-09-15T10:00:00Z',
        updatedAt: '2026-09-15T10:00:00Z',
      });
    });

    // Confirma que foram criadas 2 movimentações ativas: a compra e o débito no caixa
    const movementsBefore = result.current.movements.filter((m) => m.status === 'ACTIVE');
    expect(movementsBefore).toHaveLength(3); // base + compra + debito caixa

    // 3. Anula a compra
    await act(async () => {
      await result.current.voidMovement(buyMovId, 'Cancelamento da ordem');
    });

    // Ambas as pernas devem estar com status VOIDED
    const buyMov = result.current.movements.find((m) => m.id === buyMovId);
    expect(buyMov?.status).toBe('VOIDED');

    const counterpartMov = result.current.movements.find((m) => m.id === buyMov?.counterpartMovementId);
    expect(counterpartMov).toBeDefined();
    expect(counterpartMov?.status).toBe('VOIDED');

    // Saldo do caixa deve voltar para R$ 10.000
    const cashPos = result.current.positions.find((p) => p.assetId === 'asset-caixa-unique');
    expect(cashPos?.currentValueBRL).toBe(10000);
  });

  it('6. Deve bloquear compra com PORTFOLIO_CASH quando houver divergência entre o livro-razão e o saldo persistido de caixa', async () => {
    const cashAsset: PortfolioAsset = {
      id: 'asset-caixa-div',
      userId: TEST_UID,
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
    const petr4: PortfolioAsset = {
      id: 'asset-petr4-div',
      userId: TEST_UID,
      ticker: 'PETR4',
      name: 'Petrobras',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    };

    memoryAssets = [cashAsset, petr4];
    // Livro razão tem R$ 5.000
    memoryMovements = [
      {
        id: 'mov-cash-5000',
        userId: TEST_UID,
        assetId: 'asset-caixa-div',
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
    // Controle transacional persistido diverge (R$ 3.000)
    memoryCashBalances = {
      'asset-caixa-div': {
        userId: TEST_UID,
        cashAssetId: 'asset-caixa-div',
        availableBalanceBRL: 3000,
        version: 2,
        updatedAt: '2026-09-01T10:00:00Z',
      },
    };

    const { result } = renderHook(() => usePortfolio(TEST_UID), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.assets).toHaveLength(2);
      expect(result.current.hasCashDivergence).toBe(true);
    });

    // Tentar comprar usando PORTFOLIO_CASH deve ser bloqueado com erro explícito de divergência
    await expect(
      result.current.addMovement({
        id: 'mov-buy-blocked',
        userId: TEST_UID,
        assetId: 'asset-petr4-div',
        type: 'BUY',
        date: '2026-09-10',
        quantity: 10,
        unitPrice: 35,
        fees: 0,
        grossAmount: 350,
        netAmount: 350,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fxSource: 'FIXED_ONE',
        netAmountBRL: 350,
        fundingSource: 'PORTFOLIO_CASH',
        cashAssetId: 'asset-caixa-div',
        status: 'ACTIVE',
        createdAt: '2026-09-10T10:00:00Z',
        updatedAt: '2026-09-10T10:00:00Z',
      })
    ).rejects.toThrow(/Operação com Caixa bloqueada: Divergência detectada/i);
  });

  it('7. Deve expor quotesMap, quoteMetaMap, refreshQuotes e institutionalMetrics (Etapa 3)', async () => {
    const { result } = renderHook(() => usePortfolio(TEST_UID), {
      wrapper: createWrapper(),
    });

    expect(result.current.quotesMap).toBeDefined();
    expect(result.current.quoteMetaMap).toBeDefined();
    expect(typeof result.current.refreshQuotes).toBe('function');
    expect(result.current.isRefreshingQuotes).toBe(false);
    expect(result.current.lastQuotesUpdate).toBeNull();
    // institutionalMetrics é null quando não há posições
    expect(result.current.institutionalMetrics).toBeNull();
  });

  it('8. Deve expor taxSummary e nexusInsights no retorno do hook (Etapa 4)', async () => {
    const { result } = renderHook(() => usePortfolio(TEST_UID), {
      wrapper: createWrapper(),
    });

    expect(result.current.taxSummary).toBeDefined();
    expect(result.current.taxSummary.reports).toEqual([]);
    expect(result.current.taxSummary.accumulatedStocksLossBRL).toBe(0);
    expect(result.current.nexusInsights).toBeDefined();
    expect(Array.isArray(result.current.nexusInsights)).toBe(true);
  });

  it('9. Deve harmonizar e validar soma de metas em 100% quando houver ativo de caixa com meta percentual', async () => {
    const { result } = renderHook(() => usePortfolio(TEST_UID), {
      wrapper: createWrapper(),
    });

    // 1. Cadastra ativo de risco (PETR4) com meta de 99%
    const petr4: PortfolioAsset = {
      id: 'asset-petr4',
      userId: TEST_UID,
      ticker: 'PETR4',
      name: 'Petrobras',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      targetPercentage: 99,
      createdAt: '2026-10-08T10:00:00Z',
      updatedAt: '2026-10-08T10:00:00Z',
    };

    // 2. Cadastra ativo de caixa (Caixa de Oportunidade) com meta de 1%
    const cashAsset: PortfolioAsset = {
      id: 'asset-caixa-1',
      userId: TEST_UID,
      ticker: 'CAIXA',
      name: 'Caixa de Oportunidade',
      category: 'Caixa de Oportunidade',
      currency: 'BRL',
      market: 'CASH',
      isBalanceOnly: true,
      isOpportunityCash: true,
      targetPercentage: 1,
      createdAt: '2026-10-08T10:00:00Z',
      updatedAt: '2026-10-08T10:00:00Z',
    };

    await act(async () => {
      await result.current.saveAsset(petr4);
      await result.current.saveAsset(cashAsset);
      await result.current.addMovement({
        id: 'mov-init-petr4',
        userId: TEST_UID,
        assetId: 'asset-petr4',
        type: 'INITIAL_POSITION',
        date: '2026-10-01',
        quantity: 100,
        unitPrice: 30,
        fees: 0,
        grossAmount: 3000,
        netAmount: 3000,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fxSource: 'FIXED_ONE',
        netAmountBRL: 3000,
        status: 'ACTIVE',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
      });
      await result.current.addMovement({
        id: 'mov-init-cash',
        userId: TEST_UID,
        assetId: 'asset-caixa-1',
        type: 'INITIAL_POSITION',
        date: '2026-10-01',
        quantity: null,
        unitPrice: 0,
        fees: 0,
        grossAmount: 1000,
        netAmount: 1000,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fxSource: 'FIXED_ONE',
        netAmountBRL: 1000,
        status: 'ACTIVE',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-01T10:00:00Z',
      });
    });

    await waitFor(() => {
      expect(result.current.summary).not.toBeNull();
    });

    const summary = result.current.summary!;
    // O summary agora inclui o caixa nas metas (99% risco + 1% caixa = 100%)
    expect(summary.includeCashInTargets).toBe(true);
    expect(summary.sumTargetsPercentage).toBe(100);
    expect(summary.isTargetSumValid).toBe(true);
    expect(summary.targetDiscrepancyPercent).toBe(0);
  });
});


