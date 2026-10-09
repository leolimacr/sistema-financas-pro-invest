import type { DocumentData, DocumentReference } from 'firebase/firestore';
import {
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { firestore } from '../firebase';
import type { Budget, CategoryBudget } from '../types';

function getBudgetRef(userId: string, budgetId: string): DocumentReference<DocumentData> {
  return doc(firestore, `users/${userId}/budgets`, budgetId);
}

export async function getBudget(userId: string, budgetId: string): Promise<Budget | null> {
  const snap = await getDoc(getBudgetRef(userId, budgetId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Budget;
}

export async function setBudget(userId: string, budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const ref = getBudgetRef(userId, budget.month);
  const now = new Date().toISOString();
  await setDoc(ref, {
    ...budget,
    userId,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateBudget(
  userId: string,
  budgetId: string,
  data: Partial<Omit<Budget, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const ref = getBudgetRef(userId, budgetId);
  await updateDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateBudgetCategories(
  userId: string,
  budgetId: string,
  categories: CategoryBudget[]
): Promise<void> {
  const ref = getBudgetRef(userId, budgetId);
  await updateDoc(ref, {
    categories,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteBudget(userId: string, budgetId: string): Promise<void> {
  const ref = getBudgetRef(userId, budgetId);
  await deleteDoc(ref);
}
