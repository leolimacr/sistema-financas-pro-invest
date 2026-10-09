import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../firebase';
import type { Category, Transaction } from '../types';

export interface RecoveryPreviewItem {
  name: string;
  inferredType: 'income' | 'expense';
  confidence: number;
  sampleTxCount: number;
  ambiguous: boolean;
}

export interface RecoveryPreview {
  existing: Category[];
  foundInTx: number;
  missing: RecoveryPreviewItem[];
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function inferCategoryType(
  txList: Transaction[],
  categoryName: string,
): { income: number; expense: number } {
  const key = normalize(categoryName);
  let income = 0;
  let expense = 0;
  for (const tx of txList) {
    if (!tx.category) continue;
    if (normalize(tx.category) !== key) continue;
    if (tx.type === 'income') income++;
    else expense++;
  }
  return { income, expense };
}

export function previewCategoryRecovery(
  categories: Category[],
  transactions: Transaction[],
): RecoveryPreview {
  const existing = categories || [];
  const txs = transactions || [];

  const existingNorm = new Map<string, string>();
  for (const cat of existing) {
    if (!cat.name) continue;
    existingNorm.set(normalize(cat.name), cat.name);
  }

  const seen = new Set<string>();
  const missing: RecoveryPreviewItem[] = [];

  for (const tx of txs) {
    if (!tx.category) continue;
    const n = normalize(tx.category);
    if (existingNorm.has(n)) continue;
    if (seen.has(n)) continue;
    seen.add(n);

    const counts = inferCategoryType(txs, tx.category);
    const total = counts.income + counts.expense;
    const ambiguous = counts.income > 0 && counts.expense > 0;
    const inferredType: 'income' | 'expense' =
      counts.expense >= counts.income ? 'expense' : 'income';
    const confidence = ambiguous
      ? Math.max(counts.income, counts.expense) / total
      : 1;

    missing.push({
      name: tx.category.trim(),
      inferredType,
      confidence: Math.round(confidence * 100) / 100,
      sampleTxCount: total,
      ambiguous,
    });
  }

  return {
    existing,
    foundInTx: txs.reduce((acc, tx) => (tx.category ? acc.add(normalize(tx.category)) : acc), new Set<string>()).size,
    missing,
  };
}

export async function commitCategoryRecovery(
  userId: string,
  items: RecoveryPreviewItem[],
): Promise<void> {
  if (!userId || items.length === 0) return;

  const docRef = doc(firestore, 'categories', userId);

  await runTransaction(firestore, async (transaction) => {
    const snap = await transaction.get(docRef);
    const currentList: Category[] = snap.exists()
      ? ((snap.data() as Record<string, unknown>)?.list as Category[] | undefined) ?? []
      : [];

    const currentNorm = new Set(currentList.map((c) => normalize(c.name || '')));

    const newCategories: Category[] = [];
    for (const item of items) {
      if (!currentNorm.has(normalize(item.name))) {
        newCategories.push({
          id: crypto.randomUUID(),
          name: item.name.trim(),
          type: item.inferredType,
          userId,
        });
        currentNorm.add(normalize(item.name));
      }
    }

    if (newCategories.length === 0) return;

    const merged = [...currentList, ...newCategories];
    transaction.set(docRef, { list: merged, recoveredAt: serverTimestamp() }, { merge: true });
  });
}
