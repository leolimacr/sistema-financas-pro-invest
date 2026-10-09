import { ref, get as rtdbGet, child, update as rtdbUpdate } from 'firebase/database';
import { doc, getDoc as fsGetDoc, updateDoc } from 'firebase/firestore';
import { db, firestore } from '../firebase';
import type { Transaction, CreditCard } from '../types';

const STORAGE_KEY_PREFIX = 'fpi-voucher-reconciled-v2_';
const MIGRATION_KEY_PREFIX = 'fpi-voucher-payment-method-migration-v1_';

export async function reconcileVoucherBalances(userId: string): Promise<{ cardId: string; oldBalance: number; newBalance: number }[]> {
  if (!userId) return [];

  const storageKey = STORAGE_KEY_PREFIX + userId;
  if (localStorage.getItem(storageKey) === 'done') {
    return [];
  }

  const results: { cardId: string; oldBalance: number; newBalance: number }[] = [];

  try {
    const snapshot = await rtdbGet(child(ref(db), `transactions/${userId}`));
    if (!snapshot.exists()) {
      localStorage.setItem(storageKey, 'done');
      return [];
    }

    const allTxns: Transaction[] = [];
    snapshot.forEach((childSnap) => {
      const tx = { id: childSnap.key, ...childSnap.val() } as Transaction;
      allTxns.push(tx);
    });

    const voucherTxns = allTxns.filter(t => t.paymentMethod === 'voucher' && t.cardId);
    if (voucherTxns.length === 0) {
      localStorage.setItem(storageKey, 'done');
      return [];
    }

    const cardIds = [...new Set(voucherTxns.map(t => t.cardId!))];

    for (const cardId of cardIds) {
      try {
        const cardSnap = await fsGetDoc(doc(firestore, 'users', userId, 'cartoes', cardId));
        if (!cardSnap.exists()) continue;

        const card = { id: cardSnap.id, ...cardSnap.data() } as CreditCard;
        if (card.type !== 'voucher') continue;

        const expenses = voucherTxns
          .filter(t => t.cardId === cardId && t.type === 'expense')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const oldBalance = card.voucherBalance || 0;
        const newBalance = Math.max(0, oldBalance - expenses);

        if (oldBalance !== newBalance) {
          await updateDoc(doc(firestore, 'users', userId, 'cartoes', cardId), {
            voucherBalance: newBalance,
          });
          results.push({ cardId, oldBalance, newBalance });
          console.log(`[VoucherReconciliation] Cartão ${card.name}: R$ ${oldBalance.toFixed(2)} → R$ ${newBalance.toFixed(2)} (${expenses} em despesas não debitadas)`);
        }
      } catch (e) {
        console.warn(`[VoucherReconciliation] Erro no cartão ${cardId}:`, e);
      }
    }

    localStorage.setItem(storageKey, 'done');
  } catch (e) {
    console.warn('[VoucherReconciliation] Erro geral:', e);
  }

  return results;
}

export async function migrateVoucherPaymentMethod(userId: string): Promise<number> {
  if (!userId) return 0;

  const storageKey = MIGRATION_KEY_PREFIX + userId;
  if (localStorage.getItem(storageKey) === 'done') {
    return 0;
  }

  let updatedCount = 0;

  try {
    const snapshot = await rtdbGet(child(ref(db), `transactions/${userId}`));
    if (!snapshot.exists()) {
      localStorage.setItem(storageKey, 'done');
      return 0;
    }

    const allTxns: Transaction[] = [];
    snapshot.forEach((childSnap) => {
      const tx = { id: childSnap.key, ...childSnap.val() } as Transaction;
      allTxns.push(tx);
    });

    const cardIds = [...new Set(allTxns.map(t => t.cardId).filter((c): c is string => Boolean(c)))];
    if (cardIds.length === 0) {
      localStorage.setItem(storageKey, 'done');
      return 0;
    }

    const voucherCardIds = new Set<string>();
    for (const cardId of cardIds) {
      try {
        const cardSnap = await fsGetDoc(doc(firestore, 'users', userId, 'cartoes', cardId));
        if (!cardSnap.exists()) continue;
        const card = { id: cardSnap.id, ...cardSnap.data() } as CreditCard;
        if (card.type === 'voucher') {
          voucherCardIds.add(cardId);
        }
      } catch (e) {
        console.warn(`[VoucherMigration] Erro ao ler cartão ${cardId}:`, e);
      }
    }

    if (voucherCardIds.size === 0) {
      localStorage.setItem(storageKey, 'done');
      return 0;
    }

    const transactionsToFix = allTxns.filter(
      t => t.type === 'income' && t.cardId && voucherCardIds.has(t.cardId) && t.paymentMethod !== 'voucher'
    );

    for (const tx of transactionsToFix) {
      try {
        const txRef = ref(db, `transactions/${userId}/${tx.id}`);
        await rtdbUpdate(txRef, { paymentMethod: 'voucher' });
        updatedCount++;
        console.log(`[VoucherMigration] Corrigido paymentMethod de transação ${tx.id} (${tx.description}) para 'voucher'`);
      } catch (e) {
        console.warn(`[VoucherMigration] Erro ao atualizar transação ${tx.id}:`, e);
      }
    }

    localStorage.setItem(storageKey, 'done');
  } catch (e) {
    console.warn('[VoucherMigration] Erro geral:', e);
  }

  return updatedCount;
}
