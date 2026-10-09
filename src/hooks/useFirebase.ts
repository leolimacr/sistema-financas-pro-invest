import { useState, useEffect } from 'react';
import {
  ref,
  remove
} from 'firebase/database';
import {
  db, firestore, auth
} from '../firebase'; // Adicionado 'auth' aqui
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'; // Novas importações
import type { FinancialProfile, Transaction, Category } from '../types';
import { useUserMeta } from './useUserMeta';
import { useCategories } from './useCategories';
import { useTransactions } from './useTransactions';
import { DEMO_USER_ID, DEMO_USER_META, DEMO_CATEGORIES, getDemoTransactions } from '../constants/demoDataset';

export const useFirebase = (userId?: string) => {
  const isDemo = userId === DEMO_USER_ID;
  const realUserId = isDemo ? undefined : userId;

  const [demoTransactions, setDemoTransactions] = useState<Transaction[]>(() => getDemoTransactions());
  const [demoCategories, setDemoCategories] = useState<Category[]>(() => DEMO_CATEGORIES);

  const [loading, setLoading] = useState(!isDemo);

  // Usa hooks dedicados migrados
  const { userMeta, loading: metaLoading } = useUserMeta(realUserId);
  const userMetaLoaded = isDemo ? true : !metaLoading;
  const { categories, loading: categoriesLoading, saveCategory, deleteCategory } = useCategories(realUserId);
  const { 
    transactions: lancamentos, 
    loading: transLoading, 
    isSyncing: transSyncing,
    saveLancamento, 
    deleteLancamento,
    fetchHistory,
    fetchMonth 
  } = useTransactions(realUserId);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
    } else {
      setLoading(metaLoading || categoriesLoading || transLoading);
    }
  }, [isDemo, metaLoading, categoriesLoading, transLoading]);

  // Funções de escrita mantidas para compatibilidade (delegam para os hooks novos)
  const saveFinancialProfile = async (profile: FinancialProfile) => {
    if (!userId) return;
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const userDocRef = doc(firestore, 'users', userId);
      await setDoc(userDocRef, { financialProfile: profile }, { merge: true });
    } catch (error) {
      console.error("Erro ao salvar perfil financeiro:", error);
      throw error;
    }
  };

  const wipeUserData = async () => {
    if (!userId) return;
    const { doc, deleteDoc } = await import('firebase/firestore');
    try {
      await remove(ref(db, `transactions/${userId}`));
      await deleteDoc(doc(firestore, 'users', userId));
      await deleteDoc(doc(firestore, 'categories', userId));
    } catch (error) {
      throw error;
    }
  };

  const isLimitReached = false;
  const usagePercentage = 0;

  const login = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
  const register = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);

  const effectiveLancamentos = isDemo ? demoTransactions : lancamentos;
  const effectiveCategories = isDemo ? demoCategories : categories;
  const effectiveUserMeta = isDemo ? DEMO_USER_META : userMeta;

  const effectiveSaveLancamento = isDemo
    ? async (t: Omit<Transaction, 'id'>, id?: string) => {
        const txId = id || `demo-tx-${Date.now()}`;
        const newTx = { ...t, id: txId, userId: DEMO_USER_ID } as Transaction;
        setDemoTransactions((prev) => [newTx, ...prev.filter((item) => item.id !== txId)]);
        return txId;
      }
    : saveLancamento;

  const effectiveDeleteLancamento = isDemo
    ? async (txId: string) => {
        setDemoTransactions((prev) => prev.filter((t) => t.id !== txId));
      }
    : deleteLancamento;

  const effectiveSaveCategory = isDemo
    ? async (cat: Category) => {
        const catId = cat.id || `demo-cat-${Date.now()}`;
        setDemoCategories((prev) => [...prev.filter((c) => c.id !== catId), { ...cat, id: catId }]);
      }
    : saveCategory;

  const effectiveDeleteCategory = isDemo
    ? async (catId: string) => {
        setDemoCategories((prev) => prev.filter((c) => c.id !== catId));
      }
    : deleteCategory;

  return {
    lancamentos: effectiveLancamentos,
    categories: effectiveCategories,
    userMeta: effectiveUserMeta,
    userMetaLoaded,
    loading,
    isSyncing: isDemo ? false : transSyncing,
    saveLancamento: effectiveSaveLancamento,
    deleteLancamento: effectiveDeleteLancamento,
    fetchHistory,
    fetchMonth,
    saveCategory: effectiveSaveCategory,
    deleteCategory: effectiveDeleteCategory,
    saveFinancialProfile,
    wipeUserData, 
    isLimitReached,
    usagePercentage,
    login,
    register
  };
};
