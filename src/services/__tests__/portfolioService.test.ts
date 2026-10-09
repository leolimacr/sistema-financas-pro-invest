import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPortfolioClasses,
  savePortfolioClass,
  saveAllPortfolioClasses,
  savePortfolioAsset,
  deletePortfolioAsset,
  savePortfolioMovement,
  voidPortfolioMovement,
  importMovementsBatch,
  DEFAULT_PORTFOLIO_CLASSES,
  sanitizeForFirestore,
} from '../portfolioService';
import { setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { PortfolioAsset, PortfolioAssetClass, PortfolioMovement } from '../../core/portfolio/portfolioTypes';

describe('portfolioService (Operações Soberanas do Firestore)', () => {
  const TEST_UID = 'user-test-portfolio-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Deve retornar classes padrão quando a consulta não retornar documentos', async () => {
    const classes = await getPortfolioClasses(TEST_UID);
    expect(classes).toEqual(DEFAULT_PORTFOLIO_CLASSES);
  });

  it('2. Deve salvar classe de ativos no caminho users/{userId}/portfolio_classes/{classId}', async () => {
    const customClass: PortfolioAssetClass = {
      id: 'class-crypto',
      name: 'Criptoativos',
      targetPercentage: 10,
    };

    await savePortfolioClass(TEST_UID, customClass);
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      customClass,
      { merge: true }
    );
  });

  it('3. Deve salvar ativo no caminho users/{userId}/portfolio_assets/{assetId}', async () => {
    const asset: PortfolioAsset = {
      id: 'asset-petr4',
      userId: TEST_UID,
      ticker: 'PETR4',
      name: 'Petrobras PN',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    };

    await savePortfolioAsset(TEST_UID, asset);
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      asset,
      { merge: true }
    );
  });

  it('4. Deve salvar movimentação no caminho users/{userId}/portfolio_movements/{movementId}', async () => {
    const mov: PortfolioMovement = {
      id: 'mov-1',
      userId: TEST_UID,
      assetId: 'asset-1',
      type: 'BUY',
      date: '2026-09-10',
      quantity: 100,
      unitPrice: 30,
      fees: 5,
      grossAmount: 3000,
      netAmount: 3005,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 3005,
      status: 'ACTIVE',
      createdAt: '2026-09-10T10:00:00Z',
      updatedAt: '2026-09-10T10:00:00Z',
    };

    await savePortfolioMovement(TEST_UID, mov);
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      mov,
      { merge: true }
    );
  });

  it('5. Deve estornar movimentação marcando status como VOIDED com trilha de auditoria', async () => {
    const mov: PortfolioMovement = {
      id: 'mov-void-test',
      userId: TEST_UID,
      assetId: 'asset-1',
      type: 'BUY',
      date: '2026-09-20',
      quantity: 50,
      unitPrice: 20,
      fees: 0,
      grossAmount: 1000,
      netAmount: 1000,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 1000,
      status: 'ACTIVE',
      createdAt: '2026-09-20T10:00:00Z',
      updatedAt: '2026-09-20T10:00:00Z',
    };

    await voidPortfolioMovement(TEST_UID, mov, 'Lançamento duplicado');
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'VOIDED',
        revisions: expect.arrayContaining([
          expect.objectContaining({ reason: 'Lançamento duplicado' }),
        ]),
      }),
      { merge: true }
    );
  });

  it('6. Deve importar lote de ativos e movimentações via writeBatch', async () => {
    const newAssets: PortfolioAsset[] = [
      {
        id: 'asset-vale3',
        userId: TEST_UID,
        ticker: 'VALE3',
        name: 'Vale ON',
        category: 'Ações Brasil',
        currency: 'BRL',
        market: 'B3',
        createdAt: '2026-09-25T10:00:00Z',
        updatedAt: '2026-09-25T10:00:00Z',
      },
    ];

    const newMovements: PortfolioMovement[] = [
      {
        id: 'mov-import-1',
        userId: TEST_UID,
        assetId: 'asset-vale3',
        type: 'INITIAL_POSITION',
        date: '2026-01-15',
        quantity: 100,
        unitPrice: 60,
        fees: 0,
        grossAmount: 6000,
        netAmount: 6000,
        currency: 'BRL',
        fxRateToBRL: 1.0,
        fxSource: 'FIXED_ONE',
        netAmountBRL: 6000,
        status: 'ACTIVE',
        notes: 'CSV_IMPORT',
        createdAt: '2026-09-25T10:00:00Z',
        updatedAt: '2026-09-25T10:00:00Z',
      },
    ];

    await importMovementsBatch(TEST_UID, newAssets, newMovements);
    expect(writeBatch).toHaveBeenCalled();
  });

  it('7. Deve salvar lista de classes consolidadas via writeBatch', async () => {
    const updatedClasses: PortfolioAssetClass[] = [
      { id: 'c1', name: 'Ações BR', targetPercentage: 50 },
      { id: 'c2', name: 'Renda Fixa', targetPercentage: 50 },
    ];

    await saveAllPortfolioClasses(TEST_UID, updatedClasses);
    expect(writeBatch).toHaveBeenCalled();
  });

  it('8. Deve excluir ativo e movimentações associadas via writeBatch ou deleteDoc', async () => {
    await deletePortfolioAsset(TEST_UID, 'asset-petr4', []);
    expect(deleteDoc).toHaveBeenCalled();

    const movements: PortfolioMovement[] = [
      {
        id: 'm-1',
        userId: TEST_UID,
        assetId: 'asset-petr4',
        type: 'BUY',
        date: '2026-09-01',
        quantity: 10,
        unitPrice: 30,
        fees: 0,
        grossAmount: 300,
        netAmount: 300,
        currency: 'BRL',
        fxRateToBRL: 1,
        fxSource: 'FIXED_ONE',
        netAmountBRL: 300,
        status: 'ACTIVE',
        createdAt: '2026-09-01T00:00:00Z',
        updatedAt: '2026-09-01T00:00:00Z',
      },
    ];

    await deletePortfolioAsset(TEST_UID, 'asset-petr4', movements);
    expect(writeBatch).toHaveBeenCalled();
  });

  it('9. Deve sanitizar objetos removendo recursivamente propriedades undefined para proteção contra erros do Firestore', () => {
    const rawData = {
      ticker: 'VT',
      institution: undefined,
      manualPrice: null,
      subData: {
        a: 1,
        b: undefined,
      },
      list: [10, undefined, { c: undefined, d: 20 }],
    };

    const sanitized = sanitizeForFirestore(rawData);
    expect(sanitized).toEqual({
      ticker: 'VT',
      manualPrice: null,
      subData: { a: 1 },
      list: [10, { d: 20 }],
    });
    expect('institution' in sanitized).toBe(false);
  });

  it('10. Deve salvar ativo no Firestore sem campos undefined quando properties opcionais não forem fornecidas', async () => {
    const assetWithUndefined: PortfolioAsset = {
      id: 'asset-vt',
      userId: TEST_UID,
      ticker: 'VT',
      name: 'Vanguard Total World Stock',
      category: 'Internacional',
      currency: 'USD',
      market: 'US',
      institution: undefined,
      notes: undefined,
      fixedIncomeIndexation: undefined,
      createdAt: '2026-10-01T10:00:00Z',
      updatedAt: '2026-10-01T10:00:00Z',
    };

    await savePortfolioAsset(TEST_UID, assetWithUndefined);
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.not.objectContaining({
        institution: undefined,
        notes: undefined,
        fixedIncomeIndexation: undefined,
      }),
      { merge: true }
    );
    const passedPayload = (setDoc as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect('institution' in passedPayload).toBe(false);
    expect('notes' in passedPayload).toBe(false);
    expect('fixedIncomeIndexation' in passedPayload).toBe(false);
  });
});
