import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { firestore } from '../firebase';
import type {
  PortfolioAsset,
  PortfolioAssetClass,
  PortfolioMovement,
  PortfolioUserData,
  PortfolioCashBalance,
  CashReconciliationResult,
} from '../core/portfolio/portfolioTypes';
import {
  calculateLedgerCashBalance,
  reconcileCashBalance,
} from '../core/portfolio/portfolioMath';

/**
 * Remove recursivamente todas as propriedades com valor `undefined` de um objeto ou array
 * para evitar rejeição do Firestore (Firestore não aceita valores `undefined` em nenhum campo).
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value !== undefined) {
      cleaned[key] = typeof value === 'object' && value !== null ? sanitizeForFirestore(value) : value;
    }
  }
  return cleaned as T;
}

/**
 * Classes de ativos padrão pré-configuradas para inicialização soberana
 */
export const DEFAULT_PORTFOLIO_CLASSES: PortfolioAssetClass[] = [
  { id: 'class-acoes-br', name: 'Ações Brasil', targetPercentage: 30, color: '#2563eb' },
  { id: 'class-fiis', name: 'Fundos Imobiliários', targetPercentage: 20, color: '#0d9488' },
  { id: 'class-renda-fixa', name: 'Renda Fixa', targetPercentage: 30, color: '#16a34a' },
  { id: 'class-internacional', name: 'Internacional', targetPercentage: 15, color: '#7c3aed' },
  { id: 'class-caixa', name: 'Caixa de Oportunidade', targetPercentage: 5, color: '#ca8a04' },
];

/**
 * Carrega todas as classes de ativos do Firestore
 */
export async function getPortfolioClasses(userId: string): Promise<PortfolioAssetClass[]> {
  const colRef = collection(firestore, `users/${userId}/portfolio_classes`);
  const snap = await getDocs(colRef);
  const classes: PortfolioAssetClass[] = [];
  snap.forEach((d) => classes.push(d.data() as PortfolioAssetClass));
  return classes.length > 0 ? classes : DEFAULT_PORTFOLIO_CLASSES;
}

/**
 * Carrega todos os ativos de custódia do Firestore
 */
export async function getPortfolioAssets(userId: string): Promise<PortfolioAsset[]> {
  const colRef = collection(firestore, `users/${userId}/portfolio_assets`);
  const snap = await getDocs(colRef);
  const assets: PortfolioAsset[] = [];
  snap.forEach((d) => assets.push(d.data() as PortfolioAsset));
  return assets;
}

/**
 * Carrega todas as movimentações do Firestore ordenadas cronologicamente
 */
export async function getPortfolioMovements(userId: string): Promise<PortfolioMovement[]> {
  const colRef = collection(firestore, `users/${userId}/portfolio_movements`);
  const q = query(colRef, orderBy('date', 'asc'));
  const snap = await getDocs(q);
  const movements: PortfolioMovement[] = [];
  snap.forEach((d) => movements.push(d.data() as PortfolioMovement));
  return movements;
}

/**
 * Carrega o saldo persistido de uma conta de caixa específica
 */
export async function getCashBalance(
  userId: string,
  cashAssetId: string
): Promise<PortfolioCashBalance | null> {
  const ref = doc(firestore, `users/${userId}/portfolio_cash_balances`, cashAssetId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as PortfolioCashBalance;
}

/**
 * Carrega todos os saldos de caixa persistidos do usuário
 */
export async function getAllCashBalances(
  userId: string
): Promise<Record<string, PortfolioCashBalance>> {
  const colRef = collection(firestore, `users/${userId}/portfolio_cash_balances`);
  const snap = await getDocs(colRef);
  const balances: Record<string, PortfolioCashBalance> = {};
  snap.forEach((d) => {
    const data = d.data() as PortfolioCashBalance;
    balances[data.cashAssetId] = data;
  });
  return balances;
}

/**
 * Reconcilia e sincroniza o saldo persistido com o livro-razão auditável
 */
export async function reconcileAndSyncCashBalance(
  userId: string,
  cashAssetId: string,
  movements: PortfolioMovement[],
  forceOverride = false
): Promise<{ reconciliation: CashReconciliationResult; balanceDoc: PortfolioCashBalance }> {
  const balanceRef = doc(firestore, `users/${userId}/portfolio_cash_balances`, cashAssetId);
  const snap = await getDoc(balanceRef);
  const existingBalance = snap.exists() ? (snap.data() as PortfolioCashBalance) : null;

  const reconciliation = reconcileCashBalance(cashAssetId, movements, existingBalance);

  if (reconciliation.isDivergent && !forceOverride && existingBalance !== null) {
    throw new Error(
      `Divergência detectada entre saldo persistido (R$ ${reconciliation.persistedBalance}) e o livro-razão (R$ ${reconciliation.ledgerBalance}). Reconciliação explícita necessária.`
    );
  }

  const now = new Date().toISOString();
  const balanceDoc: PortfolioCashBalance = {
    userId,
    cashAssetId,
    availableBalanceBRL: reconciliation.ledgerBalance,
    version: (existingBalance?.version || 0) + 1,
    updatedAt: now,
  };

  await setDoc(balanceRef, sanitizeForFirestore(balanceDoc), { merge: true });
  return { reconciliation, balanceDoc };
}

/**
 * Carrega o conjunto completo de dados da carteira
 */
export async function loadPortfolioData(userId: string): Promise<PortfolioUserData> {
  const [classes, assets, movements, cashBalances] = await Promise.all([
    getPortfolioClasses(userId),
    getPortfolioAssets(userId),
    getPortfolioMovements(userId),
    getAllCashBalances(userId),
  ]);

  return { classes, assets, movements, cashBalances };
}

/**
 * Salva ou atualiza uma Classe de Ativos
 */
export async function savePortfolioClass(userId: string, assetClass: PortfolioAssetClass): Promise<void> {
  const ref = doc(firestore, `users/${userId}/portfolio_classes`, assetClass.id);
  await setDoc(ref, sanitizeForFirestore(assetClass), { merge: true });
}

/**
 * Salva ou atualiza a lista consolidada de Classes de Ativos (para ajuste de metas)
 */
export async function saveAllPortfolioClasses(userId: string, classes: PortfolioAssetClass[]): Promise<void> {
  const batch = writeBatch(firestore);
  classes.forEach((c) => {
    const ref = doc(firestore, `users/${userId}/portfolio_classes`, c.id);
    batch.set(ref, sanitizeForFirestore(c), { merge: true });
  });
  await batch.commit();
}

/**
 * Salva ou atualiza um Ativo da Carteira
 */
export async function savePortfolioAsset(userId: string, asset: PortfolioAsset): Promise<void> {
  const ref = doc(firestore, `users/${userId}/portfolio_assets`, asset.id);
  await setDoc(ref, sanitizeForFirestore(asset), { merge: true });
}

/**
 * Salva ou atualiza múltiplos Ativos da Carteira em lote atômico (ex: calibração unificada de metas)
 */
export async function saveAllPortfolioAssets(
  userId: string,
  assets: PortfolioAsset[]
): Promise<void> {
  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];
  assets.forEach((asset) => {
    const ref = doc(firestore, `users/${userId}/portfolio_assets`, asset.id);
    operations.push((batch) => batch.set(ref, sanitizeForFirestore(asset), { merge: true }));
  });

  const BATCH_SIZE = 200;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const chunk = operations.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(firestore);
    chunk.forEach((op) => op(batch));
    await batch.commit();
  }
}

/**
 * Remove um Ativo e suas movimentações vinculadas
 */
export async function deletePortfolioAsset(
  userId: string,
  assetId: string,
  associatedMovements?: PortfolioMovement[]
): Promise<void> {
  const assetRef = doc(firestore, `users/${userId}/portfolio_assets`, assetId);
  if (!associatedMovements || associatedMovements.length === 0) {
    await deleteDoc(assetRef);
    return;
  }

  const batch = writeBatch(firestore);
  batch.delete(assetRef);
  associatedMovements.forEach((m) => {
    if (m.assetId === assetId) {
      const mRef = doc(firestore, `users/${userId}/portfolio_movements`, m.id);
      batch.delete(mRef);
    }
  });
  await batch.commit();
}

/**
 * Salva uma nova Movimentação no livro-razão.
 * Se a movimentação utilizar Caixa da Carteira (PORTFOLIO_CASH) ou for lançada diretamente no Caixa,
 * executa em transação atômica (runTransaction) com leitura e bloqueio do saldo persistido,
 * impedindo saldo negativo em concorrência multi-aba ou multi-dispositivo.
 */
export async function savePortfolioMovement(
  userId: string,
  movement: PortfolioMovement,
  options?: {
    cashAsset?: PortfolioAsset;
    counterpartMovement?: PortfolioMovement;
    currentLedgerBalance?: number;
    isCashAssetDirect?: boolean;
  }
): Promise<{ updatedCashBalance?: PortfolioCashBalance }> {
  const needsCashTransaction = !!options?.counterpartMovement || !!options?.isCashAssetDirect;

  if (needsCashTransaction) {
    const cashAssetId = options?.counterpartMovement
      ? options.counterpartMovement.assetId
      : movement.assetId;

    let updatedBalanceDoc: PortfolioCashBalance | undefined = undefined;

    await runTransaction(firestore, async (transaction) => {
      // 1. Leituras (todas no início)
      const balanceRef = doc(firestore, `users/${userId}/portfolio_cash_balances`, cashAssetId);
      const balanceSnap = await transaction.get(balanceRef);

      let currentBalance = 0;
      let currentVersion = 0;

      if (balanceSnap.exists()) {
        const data = balanceSnap.data() as PortfolioCashBalance;
        currentBalance = data.availableBalanceBRL;
        currentVersion = data.version;

        if (
          options?.currentLedgerBalance !== undefined &&
          Math.abs(data.availableBalanceBRL - options.currentLedgerBalance) > 0.005
        ) {
          throw new Error(
            `Operação rejeitada por divergência contábil no Caixa: Saldo transacional persistido (R$ ${data.availableBalanceBRL.toFixed(2)}) difere do livro-razão (R$ ${options.currentLedgerBalance.toFixed(2)}). Reconcilie o caixa antes de realizar novas operações.`
          );
        }
      } else if (options?.currentLedgerBalance !== undefined) {
        currentBalance = options.currentLedgerBalance;
        currentVersion = 0;
      } else {
        currentBalance = 0;
        currentVersion = 0;
      }

      // 2. Determina o delta para o saldo de caixa
      let delta = 0;
      if (options?.counterpartMovement) {
        if (options.counterpartMovement.type === 'SELL' || options.counterpartMovement.type === 'FEE_OR_TAX') {
          // Débito no caixa (para pagar compra ou taxa)
          delta = -options.counterpartMovement.netAmountBRL;
        } else {
          // Crédito no caixa (recebimento de venda ou provento)
          delta = options.counterpartMovement.netAmountBRL;
        }
      } else if (options?.isCashAssetDirect) {
        if (
          movement.type === 'INITIAL_POSITION' ||
          movement.type === 'EXTERNAL_DEPOSIT' ||
          movement.type === 'BUY' ||
          movement.type === 'INTEREST' ||
          movement.type === 'DIVIDEND'
        ) {
          const val =
            movement.type === 'INITIAL_POSITION'
              ? (typeof movement.grossAmount === 'number' && Number.isFinite(movement.grossAmount)
                  ? movement.grossAmount
                  : movement.netAmountBRL)
              : movement.netAmountBRL;
          delta = val;
        } else if (
          movement.type === 'EXTERNAL_WITHDRAWAL' ||
          movement.type === 'SELL' ||
          movement.type === 'FEE_OR_TAX'
        ) {
          delta = -movement.netAmountBRL;
        } else if (movement.type === 'ADJUSTMENT') {
          delta = (movement.grossAmount || movement.netAmountBRL || 0) - currentBalance;
        }
      }

      const nextBalance = Number((currentBalance + delta).toFixed(2));
      if (nextBalance < 0) {
        throw new Error(
          `Saldo insuficiente no caixa (${options?.cashAsset?.name || 'Caixa'}). Saldo disponível: R$ ${currentBalance.toFixed(2)}. Valor da operação: R$ ${Math.abs(delta).toFixed(2)}.`
        );
      }

      const now = new Date().toISOString();
      updatedBalanceDoc = {
        userId,
        cashAssetId,
        availableBalanceBRL: nextBalance,
        version: currentVersion + 1,
        lastMovementId: movement.id,
        updatedAt: now,
      };

      // 3. Escritas atômicas dentro da transação
      if (options?.cashAsset) {
        const assetRef = doc(firestore, `users/${userId}/portfolio_assets`, options.cashAsset.id);
        transaction.set(assetRef, sanitizeForFirestore(options.cashAsset), { merge: true });
      }

      const movRef = doc(firestore, `users/${userId}/portfolio_movements`, movement.id);
      if (options?.counterpartMovement) {
        movement.counterpartMovementId = options.counterpartMovement.id;
        options.counterpartMovement.counterpartMovementId = movement.id;
        const cashMovRef = doc(firestore, `users/${userId}/portfolio_movements`, options.counterpartMovement.id);
        transaction.set(cashMovRef, sanitizeForFirestore(options.counterpartMovement), { merge: true });
      }
      transaction.set(movRef, sanitizeForFirestore(movement), { merge: true });
      transaction.set(balanceRef, sanitizeForFirestore(updatedBalanceDoc), { merge: true });
    });

    return { updatedCashBalance: updatedBalanceDoc };
  }

  const ref = doc(firestore, `users/${userId}/portfolio_movements`, movement.id);
  await setDoc(ref, sanitizeForFirestore(movement), { merge: true });
  return {};
}

/**
 * Estorna uma Movimentação (marca status como 'VOIDED', preservando trilha de auditoria).
 * Se houver contrapartida vinculada ou envolver caixa, estorna ambas as pernas e atualiza
 * o saldo de caixa em uma única transação atômica (runTransaction).
 */
export async function voidPortfolioMovement(
  userId: string,
  currentMovement: PortfolioMovement,
  reason = 'Estorno solicitado pelo usuário',
  counterpartMovement?: PortfolioMovement,
  options?: {
    cashAssetId?: string;
    currentLedgerBalance?: number;
  }
): Promise<{ updatedCashBalance?: PortfolioCashBalance }> {
  const hasLinkedCounterpart = !!currentMovement.counterpartMovementId || !!counterpartMovement;
  const isDirectCash = options?.cashAssetId === currentMovement.assetId;

  if (hasLinkedCounterpart || isDirectCash) {
    let updatedBalanceDoc: PortfolioCashBalance | undefined = undefined;

    await runTransaction(firestore, async (transaction) => {
      // 1. Leituras
      const currentRef = doc(firestore, `users/${userId}/portfolio_movements`, currentMovement.id);
      const currentSnap = await transaction.get(currentRef);
      if (!currentSnap.exists()) {
        throw new Error('Movimentação original não encontrada para estorno.');
      }
      const freshCurrent = currentSnap.data() as PortfolioMovement;
      if (freshCurrent.status === 'VOIDED') {
        throw new Error('Esta movimentação já se encontra estornada.');
      }

      let freshCounterpart: PortfolioMovement | undefined = undefined;
      const counterpartId = freshCurrent.counterpartMovementId || counterpartMovement?.id;

      if (counterpartId) {
        const cpRef = doc(firestore, `users/${userId}/portfolio_movements`, counterpartId);
        const cpSnap = await transaction.get(cpRef);
        if (!cpSnap.exists()) {
          throw new Error('Não é permitido anular uma operação vinculada sem sua contrapartida correspondente.');
        }
        freshCounterpart = cpSnap.data() as PortfolioMovement;
        if (freshCounterpart.status === 'VOIDED') {
          throw new Error('A contrapartida vinculada já foi estornada anteriormente de forma inconsistente.');
        }
      }

      // Identifica se há perna de caixa
      const cashAssetId = options?.cashAssetId || (
        freshCounterpart ? freshCounterpart.assetId : (isDirectCash ? currentMovement.assetId : undefined)
      );

      let balanceRef;
      let currentBalance = 0;
      let currentVersion = 0;

      if (cashAssetId) {
        balanceRef = doc(firestore, `users/${userId}/portfolio_cash_balances`, cashAssetId);
        const balanceSnap = await transaction.get(balanceRef);
        if (balanceSnap.exists()) {
          const bData = balanceSnap.data() as PortfolioCashBalance;
          currentBalance = bData.availableBalanceBRL;
          currentVersion = bData.version;

          if (
            options?.currentLedgerBalance !== undefined &&
            Math.abs(bData.availableBalanceBRL - options.currentLedgerBalance) > 0.005
          ) {
            throw new Error(
              `Estorno rejeitado por divergência contábil no Caixa: Saldo transacional persistido (R$ ${bData.availableBalanceBRL.toFixed(2)}) difere do livro-razão (R$ ${options.currentLedgerBalance.toFixed(2)}). Reconcilie o caixa antes de estornar.`
            );
          }
        }
      }

      // Calcula reversão no caixa
      let delta = 0;
      if (cashAssetId) {
        const cashLeg = (freshCounterpart && freshCounterpart.assetId === cashAssetId)
          ? freshCounterpart
          : (freshCurrent.assetId === cashAssetId ? freshCurrent : undefined);

        if (cashLeg) {
          // Se foi débito (SELL / WITHDRAWAL / FEE), o estorno DEVOLVE ao caixa (+amount)
          if (cashLeg.type === 'SELL' || cashLeg.type === 'EXTERNAL_WITHDRAWAL' || cashLeg.type === 'FEE_OR_TAX') {
            delta = cashLeg.netAmountBRL;
          }
          // Se foi crédito (BUY / DEPOSIT / INTEREST / DIVIDEND), o estorno RETIRA do caixa (-amount)
          else if (
            cashLeg.type === 'BUY' ||
            cashLeg.type === 'EXTERNAL_DEPOSIT' ||
            cashLeg.type === 'INTEREST' ||
            cashLeg.type === 'DIVIDEND' ||
            cashLeg.type === 'INITIAL_POSITION'
          ) {
            const val =
              cashLeg.type === 'INITIAL_POSITION'
                ? (typeof cashLeg.grossAmount === 'number' && Number.isFinite(cashLeg.grossAmount)
                    ? cashLeg.grossAmount
                    : cashLeg.netAmountBRL)
                : cashLeg.netAmountBRL;
            delta = -val;
          }
        }

        const nextBalance = Number((currentBalance + delta).toFixed(2));
        if (nextBalance < 0) {
          throw new Error(
            `Saldo insuficiente no caixa para estornar a operação de crédito. Saldo atual: R$ ${currentBalance.toFixed(2)}. Valor a deduzir: R$ ${Math.abs(delta).toFixed(2)}.`
          );
        }

        const now = new Date().toISOString();
        updatedBalanceDoc = {
          userId,
          cashAssetId,
          availableBalanceBRL: nextBalance,
          version: currentVersion + 1,
          lastMovementId: freshCurrent.id,
          updatedAt: now,
        };
      }

      // 2. Escritas
      const now = new Date().toISOString();
      const updatedCurrent: PortfolioMovement = {
        ...freshCurrent,
        status: 'VOIDED',
        updatedAt: now,
        revisions: [
          ...(freshCurrent.revisions || []),
          {
            editedAt: now,
            previousSnapshot: { status: freshCurrent.status },
            reason,
          },
        ],
      };

      transaction.set(currentRef, sanitizeForFirestore(updatedCurrent), { merge: true });

      if (freshCounterpart) {
        const cpRef = doc(firestore, `users/${userId}/portfolio_movements`, freshCounterpart.id);
        const updatedCounterpart: PortfolioMovement = {
          ...freshCounterpart,
          status: 'VOIDED',
          updatedAt: now,
          revisions: [
            ...(freshCounterpart.revisions || []),
            {
              editedAt: now,
              previousSnapshot: { status: freshCounterpart.status },
              reason: `Estorno vinculado: ${reason}`,
            },
          ],
        };
        transaction.set(cpRef, sanitizeForFirestore(updatedCounterpart), { merge: true });
      }

      if (balanceRef && updatedBalanceDoc) {
        transaction.set(balanceRef, sanitizeForFirestore(updatedBalanceDoc), { merge: true });
      }
    });

    return { updatedCashBalance: updatedBalanceDoc };
  }

  const now = new Date().toISOString();
  const updatedCurrent: PortfolioMovement = {
    ...currentMovement,
    status: 'VOIDED',
    updatedAt: now,
    revisions: [
      ...(currentMovement.revisions || []),
      {
        editedAt: now,
        previousSnapshot: { status: currentMovement.status },
        reason,
      },
    ],
  };

  const ref = doc(firestore, `users/${userId}/portfolio_movements`, currentMovement.id);
  await setDoc(ref, sanitizeForFirestore(updatedCurrent), { merge: true });
  return {};
}

/**
 * Importa um lote de movimentações e novos ativos fatiando em blocos seguros (<= 200 operações por batch)
 */
export async function importMovementsBatch(
  userId: string,
  newAssets: PortfolioAsset[],
  newMovements: PortfolioMovement[]
): Promise<void> {
  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  newAssets.forEach((asset) => {
    const ref = doc(firestore, `users/${userId}/portfolio_assets`, asset.id);
    operations.push((batch) => batch.set(ref, sanitizeForFirestore(asset), { merge: true }));
  });

  newMovements.forEach((movement) => {
    const ref = doc(firestore, `users/${userId}/portfolio_movements`, movement.id);
    operations.push((batch) => batch.set(ref, sanitizeForFirestore(movement), { merge: true }));
  });

  // Reconcilia e atualiza saldo persistido de qualquer ativo de caixa importado
  const cashAssets = newAssets.filter(
    (a) => a.isOpportunityCash || a.category === 'Caixa de Oportunidade' || a.category === 'Caixa' || a.market === 'CASH'
  );
  cashAssets.forEach((cashAsset) => {
    const ledgerBal = calculateLedgerCashBalance(newMovements, cashAsset.id);
    const balanceDoc: PortfolioCashBalance = {
      userId,
      cashAssetId: cashAsset.id,
      availableBalanceBRL: ledgerBal,
      version: 1,
      updatedAt: new Date().toISOString(),
    };
    const bRef = doc(firestore, `users/${userId}/portfolio_cash_balances`, cashAsset.id);
    operations.push((batch) => batch.set(bRef, sanitizeForFirestore(balanceDoc), { merge: true }));
  });

  const BATCH_SIZE = 200;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const chunk = operations.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(firestore);
    chunk.forEach((op) => op(batch));
    await batch.commit();
  }
}

/**
 * Limpa todos os dados da carteira do usuário (Reset total para reiniciar)
 */
export async function clearAllPortfolioData(
  userId: string,
  currentAssets: PortfolioAsset[],
  currentMovements: PortfolioMovement[],
  currentCashAssetIds?: string[]
): Promise<void> {
  const operations: Array<(batch: ReturnType<typeof writeBatch>) => void> = [];

  currentAssets.forEach((a) => {
    const ref = doc(firestore, `users/${userId}/portfolio_assets`, a.id);
    operations.push((batch) => batch.delete(ref));
  });

  currentMovements.forEach((m) => {
    const ref = doc(firestore, `users/${userId}/portfolio_movements`, m.id);
    operations.push((batch) => batch.delete(ref));
  });

  if (currentCashAssetIds) {
    currentCashAssetIds.forEach((cashId) => {
      const ref = doc(firestore, `users/${userId}/portfolio_cash_balances`, cashId);
      operations.push((batch) => batch.delete(ref));
    });
  }

  const BATCH_SIZE = 200;
  for (let i = 0; i < operations.length; i += BATCH_SIZE) {
    const chunk = operations.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(firestore);
    chunk.forEach((op) => op(batch));
    await batch.commit();
  }
}

