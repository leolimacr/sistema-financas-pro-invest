import React, { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../../../../firebase';
import { previewCategoryRecovery, commitCategoryRecovery } from '../../../../services/recoverCategories';
import type { RecoveryPreview, RecoveryPreviewItem } from '../../../../services/recoverCategories';
import type { Category, Transaction } from '../../../../types';
import { RotateCcw, ArrowRight } from 'lucide-react';

interface Props {
  userId: string;
  categories: Category[];
  transactions: Transaction[];
  isReady: boolean;
  onDone: () => void;
}

// Estado no MÓDULO — sobrevive a remontagens do componente
const store = {
  userId: null as string | null,
  phase: 'loading' as 'loading' | 'preview' | 'committing' | 'success' | 'skipped',
  preview: null as RecoveryPreview | null,
  error: null as string | null,
  started: false,
};

let rerender: (() => void) | null = null;

function useForceUpdate() {
  const [, setTick] = useState(0);
  const cb = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    rerender = cb;
    return () => {
      if (rerender === cb) rerender = null;
    };
  }, [cb]);
}

function runCheck(userId: string, categories: Category[], transactions: Transaction[]) {
  if (store.userId !== userId) {
    store.userId = userId;
    store.started = false;
    store.preview = null;
    store.error = null;
  }
  if (store.started) return;
  store.started = true;
  store.phase = 'loading';

  (async () => {
    try {
      const catDocRef = doc(firestore, 'categories', userId);
      const catSnap = await getDoc(catDocRef);
      if (catSnap.exists() && catSnap.data()?.recoveredAt) {
        store.phase = 'skipped';
        rerender?.();
        return;
      }

      const p = previewCategoryRecovery(categories, transactions);
      if (p.missing.length === 0) {
        await setDoc(catDocRef, { recoveredAt: serverTimestamp() }, { merge: true });
        store.phase = 'skipped';
        rerender?.();
        return;
      }

      store.preview = p;
      store.phase = 'preview';
      rerender?.();
    } catch (err) {
      console.warn('[CategoryRecovery] Erro na verificação:', err);
      store.phase = 'skipped';
      store.error = 'Não foi possível verificar categorias pendentes.';
      rerender?.();
    }
  })();
}

const CategoryRecoveryDialog: React.FC<Props> = ({ userId, categories, transactions, isReady, onDone }) => {
  useForceUpdate();
  const [busy, setBusy] = useState(false);

  // Só executa a verificação quando os dados estiverem totalmente carregados
  useEffect(() => {
    if (!userId || !isReady) return;
    runCheck(userId, categories, transactions);
  }, [userId, isReady]);

  const handleRecover = async () => {
    if (!store.preview) return;
    store.phase = 'committing';
    setBusy(true);
    rerender?.();

    try {
      await commitCategoryRecovery(userId, store.preview.missing);
      store.phase = 'success';
      rerender?.();
      setTimeout(() => {
        store.phase = 'skipped';
        onDone();
      }, 2000);
    } catch (err: any) {
      console.error('[CategoryRecovery] Erro ao recuperar:', err);
      store.error = err?.message || 'Erro ao recuperar categorias.';
      store.phase = 'preview';
      setBusy(false);
      rerender?.();
    }
  };

  const handleSkip = async () => {
    store.phase = 'skipped';
    rerender?.();
    try {
      const catDocRef = doc(firestore, 'categories', userId);
      await setDoc(catDocRef, { recoveredAt: serverTimestamp() }, { merge: true });
    } catch {
      // Non-blocking
    }
    onDone();
  };

  const phase = store.phase;
  const preview = store.preview;
  const error = store.error;

  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-surface-deep/40 backdrop-blur-sm p-4">
        <div className="bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 w-full max-w-md rounded-4xl overflow-hidden shadow-card p-6 text-center">
          <p className="text-text-muted dark:text-slate-400 text-sm">Verificando categorias pendentes...</p>
        </div>
      </div>
    );
  }

  if (phase === 'skipped') return null;

  if (phase === 'success') {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-surface-deep/40 backdrop-blur-sm p-4">
        <div className="bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 w-full max-w-md rounded-4xl overflow-hidden shadow-card p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-status-success/20 flex items-center justify-center">
            <ArrowRight className="text-status-success" size={28} />
          </div>
          <h3 className="text-text-primary dark:text-white font-black text-lg mb-2">Categorias recuperadas!</h3>
          <p className="text-text-muted dark:text-slate-400 text-sm">
            As categorias antigas já estão disponíveis no cadastro.
          </p>
        </div>
      </div>
    );
  }

  const missing = preview?.missing || [];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-surface-deep/40 backdrop-blur-sm p-4">
      <div className="bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 w-full max-w-md rounded-4xl overflow-hidden shadow-card flex flex-col max-h-[90vh]">

        {/* HEADER */}
        <div className="p-6 border-b border-surface-elevated dark:border-slate-800 flex justify-between items-center bg-surface-secondary dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl">
              <RotateCcw className="text-brand-primary" size={24} />
            </div>
            <div>
              <h3 className="text-text-primary dark:text-white font-black text-lg leading-none">
                Recuperar Categorias
              </h3>
              <p className="text-text-muted dark:text-slate-400 text-xxs mt-1 font-bold uppercase tracking-ultra-wide">
                Sincronização de categorias antigas
              </p>
            </div>
          </div>
          <button onClick={handleSkip} className="p-2 hover:bg-surface-elevated dark:hover:bg-slate-800 rounded-full text-text-muted dark:text-slate-400 transition-colors">
            <span className="sr-only">Fechar</span>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          <p className="text-text-primary dark:text-slate-200 text-sm leading-relaxed">
            Foram encontradas <strong className="font-black dark:text-white">{missing.length} categorias</strong> usadas em lançamentos que ainda não estão cadastradas:
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {missing.map((item: RecoveryPreviewItem, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-3xl bg-surface-secondary dark:bg-slate-800/50 border border-surface-elevated dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.inferredType === 'income' ? 'bg-brand-primary' : 'bg-status-danger'}`} />
                  <span className="text-sm font-bold text-text-primary dark:text-white">{item.name}</span>
                </div>
                <span className="text-xxs font-bold uppercase tracking-wider text-text-muted dark:text-slate-400">
                  {item.inferredType === 'income' ? 'Receita' : 'Despesa'}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-2xl bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs font-bold">
              {error}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-surface-elevated dark:border-slate-800 space-y-3">
          <button
            onClick={handleRecover}
            disabled={busy}
            className="w-full py-3 rounded-2xl font-black text-sm bg-brand-primary text-text-onBrand hover:bg-brand-primary/90 transition-all shadow-soft flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? (
              <>Recuperando...</>
            ) : (
              <>RECUPERAR {missing.length} CATEGORIA{missing.length !== 1 ? 'S' : ''}</>
            )}
          </button>
          <button
            onClick={handleSkip}
            disabled={busy}
            className="w-full py-2 text-xs font-bold uppercase tracking-wider text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white transition-colors disabled:opacity-50"
          >
            PULAR — não recuperar agora
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryRecoveryDialog;
