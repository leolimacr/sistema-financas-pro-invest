import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore, auth } from '../firebase';
import { queryKeys } from '../core/query/queryKeys';
import type { Category } from '../types';
import { createCategoriesRealtimeBridge } from '../services/category.realtime';

export const useCategories = (userId?: string) => {
  const queryClient = useQueryClient();
  const key = queryKeys.categories.byUser(userId || 'anonymous');
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId) return;
    const bridge = createCategoriesRealtimeBridge(userId);
    unsubRef.current = bridge.subscribe(() => {});
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [userId, queryClient]);

  const { data: rawCategories = [], isLoading: loading, error } = useQuery<Category[], Error>({
    queryKey: key,
    queryFn: () => {
      const currentData = queryClient.getQueryData<Category[]>(key);
      return Promise.resolve(currentData ?? []);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60, // Categorias raramente mudam, cache de 1 hora
  });

  const categoriesRef = useRef(rawCategories);
  categoriesRef.current = rawCategories;

  const saveCategoryRef = useRef<(category: Omit<Category, 'userId'>) => Promise<void>>(async () => {});
  const deleteCategoryRef = useRef<(categoryId: string, usageCount: number) => Promise<void>>(async () => {});

  saveCategoryRef.current = async (category: Omit<Category, 'userId'>) => {
    if (!userId) {
      console.warn('[useCategories] saveCategory: userId ausente');
      return;
    }
    const currentUser = auth.currentUser;
    console.log('[useCategories] saveCategory: pre-setDoc', {
      authUid: currentUser?.uid,
      userId,
      match: currentUser?.uid === userId,
      docPath: `categories/${userId}`,
      hasAuth: !!currentUser,
    });
    const catDocRef = doc(firestore, 'categories', userId);
    const catSnap = await getDoc(catDocRef);
    const cats = (catSnap.exists() ? (catSnap.data() as any)?.list : []) ?? [];
    const newCategory = { ...category, userId };
    let newList;
    if (category.id) {
      newList = cats.map(c => c.id === category.id ? newCategory : c);
    } else {
      newCategory.id = crypto.randomUUID();
      newList = [...cats, newCategory];
    }
    try {
      await setDoc(catDocRef, { list: newList }, { merge: true });
    } catch (err: any) {
      console.error('[useCategories] saveCategory: setDoc FALHOU', {
        code: err?.code || (err as any)?.status || 'unknown',
        message: err?.message || String(err),
        path: catDocRef.path,
        userId,
      });
      throw err;
    }
    queryClient.invalidateQueries({ queryKey: key });
  };

  deleteCategoryRef.current = async (categoryId: string, usageCount: number) => {
    if (!userId) return;
    
    if (usageCount > 0) {
      alert(`⚠️ Não é possível excluir esta categoria pois ela está em uso.`);
      return;
    }
    
    const catDocRef = doc(firestore, 'categories', userId);
    const catSnap = await getDoc(catDocRef);
    const latest = (catSnap.exists() ? (catSnap.data() as any)?.list : []) ?? [];
    const newList = latest.filter(c => c.id !== categoryId);
    await setDoc(catDocRef, { list: newList }, { merge: true });
    queryClient.invalidateQueries({ queryKey: key });
  };

  const saveCategory = useCallback(
    async (category: Omit<Category, 'userId'>) => saveCategoryRef.current(category),
    []
  );
  const deleteCategory = useCallback(
    async (categoryId: string, usageCount: number) => deleteCategoryRef.current(categoryId, usageCount),
    []
  );

  const prevCategoriesRef = useRef<Category[]>([]);
  const categories = useMemo(() => {
    const next = rawCategories || [];
    const prev = prevCategoriesRef.current;
    if (next.length !== prev.length || !next.every((c, i) => c.id === prev[i]?.id && c.name === prev[i]?.name)) {
      prevCategoriesRef.current = next;
      return next;
    }
    return prev;
  }, [rawCategories]);

  return {
    categories,
    loading,
    error: error?.message || null,
    saveCategory,
    deleteCategory,
  };
};
