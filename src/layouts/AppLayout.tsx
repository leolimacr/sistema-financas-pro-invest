import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ref, get, orderByChild, startAt, endAt, query as rtdbQuery } from 'firebase/database';
import { db } from '../firebase';
import AppHeader from '../components/AppHeader';
import AppMobileDrawer from '../components/AppMobileDrawer';
import MobileBottomNav from '../components/MobileBottomNav';
import NotificationHub from '../components/NotificationHub';
import ContentModal from '../components/ContentModal';
import TransactionForm from '../components/tools/finance/TransactionForm';
import { ToastProvider, useToast } from '../contexts/ToastContext';
import { maskCurrency } from '../utils/calculations';
import type { useAppState } from '../hooks/useAppState';
import { useNavigation } from '../hooks/useNavigation';
import { useIsMobile } from '../hooks/useIsMobile';
import { useOnboarding } from '../hooks/useOnboarding';
import PageShell from './PageShell';
import OnboardingOverlay from '../components/Onboarding/OnboardingOverlay';
import { useSovereignSnapshot } from '../hooks/useSovereignSnapshot';
import { useEventSubscriptions } from '../hooks/useEventSubscriptions';
import { useNexusEventBridge } from '../hooks/useNexusEventBridge';
import { useInvoiceSync } from '../hooks/useInvoiceSync';
import { clearEventInsightStore } from '../services/eventInsightStore';
import type { NexusAdvisoryContext } from '../services/nexusInsightEngine';
import { addPaidRecurringBillTransaction } from '../services/transactionService';
import { PresenceEventService } from '../services/PresenceEventService';
import { loadControla } from '../services/routePreload';
import { useBills } from '../hooks/useBills';
import { PrefetchProvider, usePrefetchReady } from '../contexts/PrefetchContext';
import { usePresenceTriggers } from '../hooks/usePresenceTriggers';
import { useWealthPresenceTriggers } from '../hooks/useWealthPresenceTriggers';
import { useNexusAdvisorTriggers } from '../hooks/useNexusAdvisorTriggers';
import { useWealthData } from '../hooks/useWealthData';
import { useUpcomingCommitments } from '../hooks/useUpcomingCommitments';

import AppOnlyBlock from '../components/AppOnlyBlock';
import AppDesktopNav from '../components/AppDesktopNav';
import MobileAppGate from '../components/MobileAppGate';
import DownloadQrModal from '../components/DownloadQrModal';
import { ExclusionsProvider, useExclusionAmount } from '../contexts/ExclusionsContext';

interface AppLayoutProps {
  state: ReturnType<typeof useAppState>;
  children?: React.ReactNode;
}

const AppLayoutInner: React.FC<AppLayoutProps> = ({ state }) => {
  const isMobile = useIsMobile();
  const { handleNavigate, currentTool } = useNavigation();
  const { addToast } = useToast();

  const {
    user,
    isAuthenticated,
    userMeta,
    lancamentos,
    isPrivacyMode,
    setIsPrivacyMode,
    isNotificationsOpen,
    setIsNotificationsOpen,
    mobileMenuOpen,
    setMobileMenuOpen,
    isPremium,
    isAppLocked,
    activeModal,
    editingTransaction,
    categories,
    handleLogout,
    handleCloseModal,
    saveLancamento,
    saveCategory,
    deleteCategory,
    openTransactionForm,
    routerNavigate,
    isMobileBrowser,
  } = state;

  const [isDownloadQrOpen, setIsDownloadQrOpen] = React.useState(false);

  useEventSubscriptions(user?.uid);
  useNexusEventBridge(user?.uid, userMeta?.persona?.archetype);
  useInvoiceSync(lancamentos);

  const { setReady } = usePrefetchReady();

  // Prefetch queries + preload Controla bundle — UMA ÚNICA VEZ por uid
  const queryClient = useQueryClient();
  const prefetchedUid = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!user?.uid) return;
    if (prefetchedUid.current === user.uid) return;
    prefetchedUid.current = user.uid;

    // Libera a UI imediatamente; o prefetch fica em segundo plano.
    setReady();

    const preload = async () => {
      const uid = user.uid;

      try {
        // Preload do bundle do Controla (aquece cache do navegador)
        loadControla();

        // Prefetch dos últimos 6 meses via RTDB (mesma queryKey que useTransactions.fetchMonth usa)
        const extraKey = ['transactions_extra', uid];
        const registryKey = ['transactions_fetched_months', uid];
        const allTxs: import('../types').Transaction[] = [];
        const months: string[] = [];
        const today = new Date();
        const MONTHS_TO_PREFETCH = 6;

        for (let i = 0; i < MONTHS_TO_PREFETCH; i++) {
          const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const y = targetDate.getFullYear();
          const m = String(targetDate.getMonth() + 1).padStart(2, '0');
          months.push(`${y}-${m}`);
        }

        const results = await Promise.allSettled(
          months.map((monthKey) => {
            const transactionsRef = ref(db, `transactions/${uid}`);
            const q = rtdbQuery(transactionsRef, orderByChild('date'), startAt(`${monthKey}-01`), endAt(`${monthKey}-31`));
            return get(q).then((snap) => ({ monthKey, snap }));
          })
        );

        for (const result of results) {
          if (result.status === 'rejected') continue;
          const { monthKey, snap } = result.value;
          if (!snap.exists()) continue;
          snap.forEach((child) => {
            const val = child.val();
            if (val?.date?.startsWith(monthKey)) {
              allTxs.push({ id: child.key, ...val } as import('../types').Transaction);
            }
          });
        }

        if (allTxs.length > 0) {
          const existing = queryClient.getQueryData<import('../types').Transaction[]>(extraKey) || [];
          const merged = Array.from(new Map([...existing, ...allTxs].map(t => [t.id, t])).values());
          queryClient.setQueryData(extraKey, merged);
        }
        queryClient.setQueryData(registryKey, new Set(months));
      } catch {
        // Prefetch é otimização — falha silenciosa
      }
    };

    const schedule =
      typeof window !== 'undefined' && 'requestIdleCallback' in window
        ? window.requestIdleCallback.bind(window)
        : (cb: () => void) => window.setTimeout(cb, 0) as unknown as number;

    const cancel =
      typeof window !== 'undefined' && 'cancelIdleCallback' in window
        ? window.cancelIdleCallback.bind(window)
        : (handle: number) => window.clearTimeout(handle);

    const handle = schedule(() => {
      void preload();
    });

    return () => {
      cancel(handle);
    };
  }, [user?.uid, queryClient, setReady]);

  const { bills: recurringBills } = useBills(user?.uid);

  // Clean event insight store when session is lost (logout, token expiry, account switch)
  React.useEffect(() => {
    if (!isAuthenticated) {
      clearEventInsightStore();
    }
  }, [isAuthenticated]);

  const reserveTarget = userMeta?.financialProfile?.emergencyReserveTarget || 0;
  const colchaoTarget = userMeta?.financialProfile?.colchaoInicialTarget || 0;
  const exclusionAmount = useExclusionAmount(reserveTarget, colchaoTarget);

  const sovereign = useSovereignSnapshot(lancamentos, userMeta, false, undefined, exclusionAmount);

  const wealthData = useWealthData();

  usePresenceTriggers({
    userId: user?.uid,
    debts: wealthData.debts,
    debtsLoading: wealthData.loading,
  });

  useWealthPresenceTriggers({
    userId: user?.uid,
    goals: wealthData.goals,
    assets: wealthData.assets,
    goalsLoading: wealthData.loading,
    assetsLoading: wealthData.loading,
  });

  const { commitments: upcomingCommitments } = useUpcomingCommitments(user?.uid, 10);

  useNexusAdvisorTriggers({
    userId: user?.uid,
    sovereign,
    debts: wealthData.debts,
    assets: wealthData.assets,
    bills: recurringBills,
    commitments: upcomingCommitments,
    userMeta,
    launchCount: lancamentos.length,
  });

  const nexusAdvisoryContext = React.useMemo((): NexusAdvisoryContext | undefined => {
    if (!lancamentos) return undefined;

    const now = new Date();

    const categorySpending = lancamentos
      .filter((t) => {
        const [y, m] = t.date.split('-').map(Number);
        return y === now.getFullYear() && m === now.getMonth() + 1 && t.type === 'expense';
      })
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);

    return {
      snapshot: sovereign,
      commandMode: sovereign.commandMode,
      categorySpending,
      isPremium,
    };
  }, [lancamentos, sovereign, isPremium]);

  const location = useLocation();

  const filterCardId = (location.state as Record<string, unknown> | null)?.filterCardId as string | undefined;

  const handleBackToCards = React.useCallback(() => {
    handleCloseModal();
    routerNavigate('/app/controla', { state: { clearCardFilter: true }, replace: true });
  }, [handleCloseModal, routerNavigate]);

  const { step, nextStep, skip, finish } = useOnboarding(lancamentos.length);

  const showDesktopNav = isAuthenticated && !isAppLocked;

  const handleOnboardingLaunch = () => {
    handleNavigate('controla');
    setTimeout(() => {
      openTransactionForm();
    }, 100);
  };

  const handleOnboardingNext = () => {
    nextStep();
  };

  const handleMarkBillAsPaid = React.useCallback(async (billId: string) => {
    if (!user) return;

    const bill = recurringBills.find((item) => item.id === billId && item.isActive);
    if (!bill) return;

    const now = new Date();
    if (bill.lastPaidDate) {
      const lastPaid = new Date(bill.lastPaidDate);
      if (lastPaid.getFullYear() === now.getFullYear() && lastPaid.getMonth() === now.getMonth()) {
        addToast(`A conta ${bill.name} já foi marcada como paga neste mês.`, 'warning');
        return;
      }
    }

    await addPaidRecurringBillTransaction(user.uid, bill);
    await PresenceEventService.markRecurringBillActioned(user.uid, bill.id);
    handleNavigate('manager');
  }, [user, recurringBills, addToast, handleNavigate]);

  return (
    <div className="h-screen h-[100dvh] overflow-hidden bg-surface-secondary text-text-primary flex flex-col font-sans animate-in fade-in duration-300">
      <AppHeader
        isAuthenticated={isAuthenticated}
        userMeta={userMeta}
        userDisplayName={user?.displayName?.split(' ')[0]}
        isPrivacyMode={isPrivacyMode}
        onTogglePrivacy={() => setIsPrivacyMode(!isPrivacyMode)}
        onLogout={handleLogout}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
        isNotificationsOpen={isNotificationsOpen}
        onOpenNotifications={setIsNotificationsOpen}
        showDesktopNav={showDesktopNav}
        onOpenDownloadQr={() => setIsDownloadQrOpen(true)}
      />

      <div className="flex flex-1 min-h-0 pt-[calc(4rem+env(safe-area-inset-top))]">
        {showDesktopNav && <AppDesktopNav onAdd={openTransactionForm} />}

        <main className="flex-1 min-w-0 overflow-y-auto">
          <PageShell
            currentTool={currentTool}
            withMobileNav={isAuthenticated && !isAppLocked && isMobile}
          >
            <Outlet />
          </PageShell>
        </main>
      </div>

      <AppMobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        isAuthenticated={isAuthenticated}
        userMeta={userMeta}
        userDisplayName={user?.displayName}
        onLogout={handleLogout}
        onOpenCourse={(slug = 'investidor-iniciante') => routerNavigate(`/curso/${slug}`)}
      />

      {isAuthenticated && !isAppLocked && isMobile && (
        <MobileBottomNav
          onOpenMore={() => setMobileMenuOpen(true)}
          onAdd={openTransactionForm}
        />
      )}

      <MobileAppGate isMobileBrowser={isMobileBrowser} isAuthenticated={isAuthenticated} />

      <DownloadQrModal
        isOpen={isDownloadQrOpen}
        onClose={() => setIsDownloadQrOpen(false)}
      />

      <AppOnlyBlock isMobileBrowser={isMobileBrowser} hasBottomNav={isAuthenticated && !isAppLocked && isMobile} />

      <NotificationHub
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigate={handleNavigate}
        onMarkBillAsPaid={handleMarkBillAsPaid}
      />

      <ContentModal
        isOpen={activeModal === 'transaction'}
        onClose={handleCloseModal}
        title={editingTransaction?.id ? 'Editar Lançamento' : 'Novo Lançamento'}
      >
        {filterCardId && (
          <div className="flex items-center justify-end mb-4">
            <button
              type="button"
              onClick={handleBackToCards}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-secondary font-black text-[9px] uppercase tracking-widest border border-brand-secondary/20 transition-all active:scale-95"
            >
              Voltar aos cartões
            </button>
          </div>
        )}
        <TransactionForm
          initialData={editingTransaction}
          onDelete={state.deleteLancamento}
          onSave={async (t: { id?: string; amount: number; linkedDebtId?: string; type?: string; [key: string]: any }) => {
            const { id, ...rest } = t;
            const amount = Number(t.amount);
            const cleanData = { ...rest, amount } as Parameters<typeof saveLancamento>[0];
            if (id) cleanData.id = id;

            const wasFirstTransaction = lancamentos.length === 0;
            const freeBalance = sovereign.sovereignFreeBalance;

            handleCloseModal();

            saveLancamento(cleanData).then(() => {
              try {
                if (wasFirstTransaction && !t.type?.includes('expense') && amount > 0) {
                  addToast(
                    'Pronto. Agora você vê quanto sobra de verdade no seu mês.',
                    'success'
                  );
                } else if (t.type === 'expense' && freeBalance < 0) {
                  addToast(
                    `Suas despesas consumiram a liberdade. Seu saldo livre é ${maskCurrency(freeBalance)}.`,
                    'warning'
                  );
                } else if (t.type === 'expense' && freeBalance >= 0 && freeBalance < 500) {
                  addToast(
                    `Atenção: sua liberdade real é de ${maskCurrency(freeBalance)}.`,
                    'info'
                  );
                } else if (!t.type?.includes('expense') && amount > 0) {
                  addToast(
                    `Receita registrada. Sua liberdade real agora é ${maskCurrency(freeBalance)}.`,
                    'success'
                  );
                }
              } catch (e) {
                console.error('[AppLayout] Erro no toast de sucesso:', e);
              }
            }).catch((err) => {
              console.error('[AppLayout] Erro ao salvar lançamento:', err);
              addToast('Erro ao salvar lançamento. Sua transação foi removida.', 'error');
            });
          }}
          onCancel={handleCloseModal}
          categories={categories}
          onSaveCategory={saveCategory}
          onDeleteCategory={async (id: string) => {
            const catName = categories.find(c => c.id === id)?.name;
            const usageCount = lancamentos.filter((t: any) => t.category === catName).length;
            await deleteCategory(id, usageCount);
          }}
          nexusAdvisoryContext={nexusAdvisoryContext}
          transactions={lancamentos}
        />
      </ContentModal>

      <OnboardingOverlay
        step={step}
        onNext={handleOnboardingNext}
        onSkip={skip}
        onFinish={finish}
        onLaunch={handleOnboardingLaunch}
      />
    </div>
  );
};

const AppLayout: React.FC<AppLayoutProps> = (props) => (
  <ToastProvider>
    <PrefetchProvider>
      <ExclusionsProvider>
        <AppLayoutInner {...props} />
      </ExclusionsProvider>
    </PrefetchProvider>
  </ToastProvider>
);

export default AppLayout;
