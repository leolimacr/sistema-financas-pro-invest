import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

vi.unmock('firebase/firestore');

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';

const OWNER_UID = 'user-sovereign-owner';
const OTHER_UID = 'user-intruder';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const rules = readFileSync(resolve(root, 'firestore.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-portfolio-rules',
    firestore: {
      rules,
      host: 'localhost',
      port: 8080,
    },
  });

  // Seed inicial seguro com regras desabilitadas
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, `users/${OWNER_UID}/portfolio_assets/asset-petr4`), {
      userId: OWNER_UID,
      ticker: 'PETR4',
      name: 'Petrobras PN',
      category: 'Ações Brasil',
    });

    await setDoc(doc(db, `users/${OWNER_UID}/portfolio_movements/mov-active-1`), {
      userId: OWNER_UID,
      assetId: 'asset-petr4',
      type: 'BUY',
      date: '2026-03-01',
      unitPrice: 38.5,
      fxRateToBRL: 1.0,
      quantity: 100,
      netAmountBRL: 3850.0,
      status: 'ACTIVE',
      revisions: [],
    });
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

describe('Regras de Segurança Firestore — Carteira Soberana', () => {
  it('1. Usuário intruso NÃO acessa dados de outro usuário (leitura negada)', async () => {
    const intruderDb = testEnv.authenticatedContext(OTHER_UID).firestore();
    const targetDoc = doc(intruderDb, `users/${OWNER_UID}/portfolio_assets/asset-petr4`);
    await assertFails(getDoc(targetDoc));
  });

  it('2. Movimentação com dados inválidos é rejeitada (unitPrice negativo ou netAmountBRL negativo)', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const invalidDoc = doc(ownerDb, `users/${OWNER_UID}/portfolio_movements/mov-invalid`);
    await assertFails(
      setDoc(invalidDoc, {
        userId: OWNER_UID,
        assetId: 'asset-petr4',
        type: 'BUY',
        unitPrice: -10, // Inválido: negativo
        fxRateToBRL: 1.0,
        status: 'ACTIVE',
        netAmountBRL: -1000,
      })
    );
  });

  it('3. Delete físico de movimentação é rigorosamente negado', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const movRef = doc(ownerDb, `users/${OWNER_UID}/portfolio_movements/mov-active-1`);
    await assertFails(deleteDoc(movRef));
  });

  it('4. Criação válida de movimentação é autorizada para o proprietário', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const validDoc = doc(ownerDb, `users/${OWNER_UID}/portfolio_movements/mov-new-valid`);
    await assertSucceeds(
      setDoc(validDoc, {
        userId: OWNER_UID,
        assetId: 'asset-petr4',
        type: 'BUY',
        date: '2026-03-02',
        unitPrice: 40.0,
        fxRateToBRL: 1.0,
        quantity: 50,
        netAmountBRL: 2000.0,
        status: 'ACTIVE',
        revisions: [],
      })
    );
  });

  it('5. Anulação auditável (transição ACTIVE -> VOIDED com revisions) é autorizada', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const movRef = doc(ownerDb, `users/${OWNER_UID}/portfolio_movements/mov-active-1`);
    await assertSucceeds(
      updateDoc(movRef, {
        status: 'VOIDED',
        revisions: [
          {
            editedAt: '2026-03-02T10:00:00Z',
            reason: 'Lançamento duplicado',
          },
        ],
      })
    );
  });

  it('6. Tentativa de reativar movimento anulado ou adulterar valor contábil é negada', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const movRef = doc(ownerDb, `users/${OWNER_UID}/portfolio_movements/mov-active-1`);
    // Tenta reativar o movimento recém-anulado
    await assertFails(
      updateDoc(movRef, {
        status: 'ACTIVE',
      })
    );
  });

  it('7. Usuário intruso NÃO acessa e nem altera portfolio_cash_balances de outro usuário', async () => {
    const intruderDb = testEnv.authenticatedContext(OTHER_UID).firestore();
    const targetDoc = doc(intruderDb, `users/${OWNER_UID}/portfolio_cash_balances/asset-caixa-1`);
    await assertFails(getDoc(targetDoc));
    await assertFails(
      setDoc(targetDoc, {
        userId: OWNER_UID,
        cashAssetId: 'asset-caixa-1',
        availableBalanceBRL: 5000,
        version: 1,
      })
    );
  });

  it('8. Tentativa de gravar saldo negativo em portfolio_cash_balances é negada pelas regras', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const cashRef = doc(ownerDb, `users/${OWNER_UID}/portfolio_cash_balances/asset-caixa-negative`);
    await assertFails(
      setDoc(cashRef, {
        userId: OWNER_UID,
        cashAssetId: 'asset-caixa-negative',
        availableBalanceBRL: -50.0, // Negativo: proibido pelo banco!
        version: 1,
      })
    );
  });

  it('9. Criação válida de saldo de caixa com availableBalanceBRL >= 0 e version >= 1 é autorizada', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const cashRef = doc(ownerDb, `users/${OWNER_UID}/portfolio_cash_balances/asset-caixa-valid`);
    await assertSucceeds(
      setDoc(cashRef, {
        userId: OWNER_UID,
        cashAssetId: 'asset-caixa-valid',
        availableBalanceBRL: 10000.0,
        version: 1,
        updatedAt: new Date().toISOString(),
      })
    );
  });

  it('10. Atualização de saldo com versão monotonicamente crescente é autorizada', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const cashRef = doc(ownerDb, `users/${OWNER_UID}/portfolio_cash_balances/asset-caixa-valid`);
    await assertSucceeds(
      updateDoc(cashRef, {
        availableBalanceBRL: 6150.0,
        version: 2,
        updatedAt: new Date().toISOString(),
      })
    );
  });

  it('11. Tentativa de regressão de versão no saldo é negada pelas regras', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const cashRef = doc(ownerDb, `users/${OWNER_UID}/portfolio_cash_balances/asset-caixa-valid`);
    // Tenta atualizar para version 1 (igual à anterior) ou 0
    await assertFails(
      updateDoc(cashRef, {
        availableBalanceBRL: 5000.0,
        version: 2, // Deve ser > resource.data.version (que já é 2)
      })
    );
  });

  it('12. Concorrência: 2 abas simuladas com caixa de R$ 10.000 tentam comprar R$ 6.000 cada via runTransaction — exatamente uma confirma e saldo nunca fica negativo', async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).firestore();
    const cashRef = doc(ownerDb, `users/${OWNER_UID}/portfolio_cash_balances/asset-caixa-concurrency`);

    // 1. Inicializa caixa com R$ 10.000 e version: 1
    await setDoc(cashRef, {
      userId: OWNER_UID,
      cashAssetId: 'asset-caixa-concurrency',
      availableBalanceBRL: 10000.0,
      version: 1,
      updatedAt: new Date().toISOString(),
    });

    // Função que simula uma aba tentando executar uma compra de R$ 6.000 via runTransaction
    const executePurchase = async (tabName: string, movId: string) => {
      await runTransaction(ownerDb, async (transaction) => {
        const snap = await transaction.get(cashRef);
        if (!snap.exists()) throw new Error('Caixa inexistente');
        const data = snap.data();
        const currentBalance = data.availableBalanceBRL as number;
        const currentVersion = data.version as number;

        if (currentBalance < 6000.0) {
          throw new Error(`[${tabName}] Saldo insuficiente no caixa: R$ ${currentBalance}`);
        }

        const newBalance = Number((currentBalance - 6000.0).toFixed(2));
        const movDoc = doc(ownerDb, `users/${OWNER_UID}/portfolio_movements/${movId}`);
        transaction.set(movDoc, {
          userId: OWNER_UID,
          assetId: 'asset-petr4',
          type: 'BUY',
          date: '2026-03-03',
          unitPrice: 30.0,
          fxRateToBRL: 1.0,
          quantity: 200,
          netAmountBRL: 6000.0,
          status: 'ACTIVE',
          revisions: [],
        });

        transaction.set(cashRef, {
          userId: OWNER_UID,
          cashAssetId: 'asset-caixa-concurrency',
          availableBalanceBRL: newBalance,
          version: currentVersion + 1,
          updatedAt: new Date().toISOString(),
        });
      });
    };

    // 2. Dispara simultaneamente as duas compras em abas concorrentes
    const results = await Promise.allSettled([
      executePurchase('Aba 1', 'mov-buy-tab-1'),
      executePurchase('Aba 2', 'mov-buy-tab-2'),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    // Exatamente UMA compra deve ser confirmada e a outra deve falhar
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    // O saldo final deve ser exatamente R$ 4.000 (10.000 - 6.000), JAMAIS negativo!
    const finalSnap = await getDoc(cashRef);
    expect(finalSnap.data()?.availableBalanceBRL).toBe(4000.0);
    expect(finalSnap.data()?.version).toBe(2);
  });
});

