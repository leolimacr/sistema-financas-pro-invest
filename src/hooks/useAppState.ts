import type React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useLocation, useNavigate } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from './useFirebase';
import { useEntitlement } from './useEntitlement';
import { useAppSecurity } from './useAppSecurity';
import { useNavigation } from './useNavigation';
import { useReengagementTrigger } from './useReengagementTrigger';
import { NotificationService } from '../services/NotificationService';
import { addPaidRecurringBillTransaction } from '../services/transactionService';
import { getLocalDateString } from '../utils/dateHelpers';
import { resolveAppRoute } from '../utils/deepLinkRouter';
import { PresenceEventService } from '../services/PresenceEventService';
import { reconcileVoucherBalances, migrateVoucherPaymentMethod } from '../services/voucherReconciliation';
import type { UserContext, NexusInsight } from '../services/nexusInsightEngine';
import { getPrioritizedInsight } from '../services/nexusInsightEngine';
import { clearEventInsightStore } from '../services/eventInsightStore';
import type { Transaction, Category, UserMeta } from '../types';
import type { DebtItem } from '../services/debt/debt.types';
import { getConsecutiveDays } from '../utils/streakUtils';
import { useDebts } from './useDebts';
import { useBills } from './useBills';

export interface AppState {
  user: ReturnType<typeof useAuth>['user'];
  isAuthenticated: boolean;
  authLoading: boolean;
  userMetaLoading: boolean;
  lancamentos: Transaction[];
  categories: Category[];
  debts: DebtItem[];
  saveLancamento: ReturnType<typeof useFirebase>['saveLancamento'];
  deleteLancamento: ReturnType<typeof useFirebase>['deleteLancamento'];
  saveCategory: ReturnType<typeof useFirebase>['saveCategory'];
  deleteCategory: ReturnType<typeof useFirebase>['deleteCategory'];
  fetchHistory: ReturnType<typeof useFirebase>['fetchHistory'];
  fetchMonth: ReturnType<typeof useFirebase>['fetchMonth'];
  userMeta: UserMeta | null | undefined;
  userMetaLoaded: boolean;
  usagePercentage: number;
  isLimitReached: boolean;
  isPro: boolean;
  isPremium: boolean;
  isAppLocked: boolean;
  storedPin: string | null;
  handleUnlockSuccess: () => void;
  isNative: boolean;
  isMobileBrowser: boolean;
  isLoading: boolean;
  isPrivacyMode: boolean;
  setIsPrivacyMode: React.Dispatch<React.SetStateAction<boolean>>;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isSyncing: boolean;
  activeModal: string | null;
  setActiveModal: React.Dispatch<React.SetStateAction<string | null>>;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingTransaction: Partial<Transaction> | null;
  setEditingTransaction: React.Dispatch<React.SetStateAction<Partial<Transaction> | null>>;
  onboardingDismissed: boolean;
  setOnboardingDismissed: React.Dispatch<React.SetStateAction<boolean>>;
  handleLogout: () => Promise<void>;
  handleEditTransaction: (t: Transaction) => void;
  handleCloseModal: () => void;
  getAiContextTransactions: () => Transaction[];
  openTransactionForm: (initialData?: Partial<Transaction>) => void;
  routerNavigate: ReturnType<typeof useNavigate>;
  location: ReturnType<typeof useLocation>;
  scheduleDailyReminder?: (insight?: NexusInsight | null) => Promise<void>;
}

export function useAppState(): AppState {
  const { user, isAuthenticated, loading: authLoading, logout, userMeta, userMetaLoading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user?.uid) {
      const updateHeartbeat = async () => {
        try {
          const STORAGE_KEY = `financas-pro-invest_last_heartbeat_${user.uid}`;
          const LEGACY_KEY = `fpi_last_heartbeat_${user.uid}`;
          const today = getLocalDateString();
          const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY);
          if (stored !== today) {
            const userRef = doc(firestore, 'users', user.uid);
            await setDoc(userRef, { 
              lastActiveAt: serverTimestamp() 
            }, { merge: true });
            
            localStorage.setItem(STORAGE_KEY, today);
            try { localStorage.removeItem(LEGACY_KEY); } catch {}
          }
        } catch (error) {
          console.warn('[FinOps] Heartbeat bypass:', error);
        }
      };
      updateHeartbeat();
      reconcileVoucherBalances(user.uid).catch(console.warn);
      migrateVoucherPaymentMethod(user.uid).catch(console.warn);
    }
  }, [isAuthenticated, user?.uid]);

  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const {
    lancamentos,
    categories,
    saveLancamento,
    deleteLancamento,
    saveCategory,
    deleteCategory,
    usagePercentage,
    isLimitReached,
    isSyncing,
    fetchHistory,
    fetchMonth,
  } = useFirebase(user?.uid);
  
  const { debts } = useDebts(user?.uid);
  const { bills: recurringBills } = useBills(user?.uid);

  const userMetaLoaded = !userMetaLoading;
  const { effectiveTier } = useEntitlement();
  const isPro = effectiveTier !== 'free';
  const isPremium = effectiveTier === 'premium';
  const { isAppLocked, storedPin, handleUnlockSuccess } = useAppSecurity(user?.uid, isAuthenticated);
  const { resetNavigation } = useNavigation();
  
  useReengagementTrigger({ userId: user?.uid, isLoading: authLoading });

  const routerNavigate = useNavigate();
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Partial<Transaction> | null>(null);

  const isMobileBrowser =
    !isNative &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  const getAiContextTransactions = useCallback((): Transaction[] => {
    const days = isPremium ? 1460 : isPro ? 120 : 10;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return lancamentos.filter((t) => new Date(t.date) >= cutoff);
  }, [isPremium, isPro, lancamentos]);

  useEffect(() => {
    if (isAuthenticated && isNative) {
      const setupNotifications = async () => {
        const granted = await NotificationService.requestPermission();
        if (granted) {
          // 1. Prepara contexto para o motor de insights
          const todayStr = getLocalDateString();
          const txToday = lancamentos.filter((t: any) => t.date === todayStr).length;

          let daysSince = 0;
          if (lancamentos.length > 0) {
            const lastDate = new Date([...lancamentos].sort((a: any, b: any) => b.date.localeCompare(a.date))[0].date);
            daysSince = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
          }

          const currentMonth = new Date().getMonth() + 1;
          const currentYear = new Date().getFullYear();
          const monthTx = lancamentos.filter((t: any) => {
            const [y, m] = t.date.split('-').map(Number);
            return y === currentYear && m === currentMonth;
          });
          const balance = monthTx.reduce((acc: number, t: any) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);

          const ctx: UserContext = {
            hasFinancialProfile: !!userMeta?.financialProfile,
            hasPaidAccess: isPro || isPremium,
            isPremium: isPremium,
            transactionsToday: txToday,
            daysSinceLastTransaction: daysSince,
            launchCount: lancamentos.length,
            launchLimit: userMeta?.launchLimit || 30,
            monthBalance: balance,
            hasFirstInvestment: lancamentos.some((t: any) => t.category?.toLowerCase().includes('investimento')),
            streak: getConsecutiveDays(lancamentos)
          };

          // 2. Obtém insight para a notificação
          const dailyInsight = getPrioritizedInsight(ctx);
          await NotificationService.scheduleDailyReminder(dailyInsight);

          // 3. Lógica de reengajamento (3 dias)
          if (daysSince >= 3) {
            await NotificationService.scheduleReengagementReminder(balance);
          } else {
            await NotificationService.cancelCategory('reengagement');
          }
        }
      };
      setupNotifications();
    }
  }, [isAuthenticated, isNative, lancamentos, userMeta, isPro, isPremium]);

  useEffect(() => {
    if (!isAuthenticated || !isNative || !user?.uid) return;

    let cancelled = false;
    let listener: { remove: () => Promise<void> | void } | null = null;

    const handleBillPaidAction = async (billId: string) => {
      const bill = recurringBills.find((item) => item.id === billId && item.isActive);
      if (!bill) return;

      const now = new Date();
      if (bill.lastPaidDate) {
        const lastPaid = new Date(bill.lastPaidDate);
        if (lastPaid.getFullYear() === now.getFullYear() && lastPaid.getMonth() === now.getMonth()) {
          window.alert(`A conta ${bill.name} já foi marcada como paga neste mês.`);
          return;
        }
      }

      const confirmed = window.confirm(
        `Você tem certeza que este lançamento pode ser registrado como pago? Se confirmar, você pode alterar a qualquer momento.`
      );
      if (!confirmed) return;

      await addPaidRecurringBillTransaction(user.uid, bill);
      await PresenceEventService.markRecurringBillActioned(user.uid, bill.id);
      routerNavigate('/app/controla');
    };

    const setupNotificationTapListener = async () => {
      try {
        // Listener nativo universal de ação na notificação local/push.
        listener = await LocalNotifications.addListener('localNotificationActionPerformed', async (event: any) => {
          if (cancelled) return;

          const notification = event?.notification;
          const extra = notification?.extra || {};
          const deepLink = (extra?.deepLink || extra?.targetRoute) as string | undefined;

          // 1. Ação expressa de marcar conta recorrente como paga
          if (deepLink?.startsWith('app://mark-bill-paid/')) {
            const billId = deepLink.split('/').pop();
            if (billId) {
              await handleBillPaidAction(billId);
              return;
            }
          }

          // 2. Resolução soberana e direcionamento cirúrgico de rota
          const targetRoute = resolveAppRoute(deepLink, extra?.eventType || notification?.title);

          // 3. Executa navegação para a tela exata
          routerNavigate(targetRoute);

          // 4. Se a rota indicar ação de criação de lançamento, abre o modal
          if (targetRoute.includes('action=new-transaction')) {
            openTransactionForm();
          }
        });
      } catch (error) {
        console.warn('[useAppState] Falha ao registrar listener de notificação:', error);
      }
    };

    setupNotificationTapListener();

    return () => {
      cancelled = true;
      if (listener) {
        try {
          const result = listener.remove();
          void result;
        } catch {}
      }
    };
  }, [isAuthenticated, isNative, user?.uid, recurringBills, routerNavigate]);

  // Agenda notificações para contas recorrentes ativas
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;
    const scheduleBills = async () => {
      const today = new Date();
      const isBillDueToday = (bill: { dueDay: number; lastPaidDate?: string }) => {
        if (bill.lastPaidDate) {
          const lastPaid = new Date(bill.lastPaidDate);
          if (lastPaid.getMonth() === today.getMonth() && lastPaid.getFullYear() === today.getFullYear()) {
            return false;
          }
        }

        const dueDay = Math.min(Math.max(1, bill.dueDay), new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate());
        return today.getDate() === dueDay;
      };

      const canScheduleNativePush = isNative ? await NotificationService.requestPermission() : false;

      for (const bill of recurringBills) {
        if (!bill.isActive) continue;

        if (isBillDueToday(bill)) {
          await PresenceEventService.createRecurringBillDue(user.uid, bill);
        }

        if (isNative && canScheduleNativePush) {
          await NotificationService.scheduleRecurringBillDueNotification(bill, user.uid);
        }
      }
    };
    scheduleBills();
  }, [isAuthenticated, isNative, user?.uid, recurringBills]);

  const handleLogout = useCallback(async () => {
    await NotificationService.cancelAll();
    clearEventInsightStore();
    await logout();
    resetNavigation();
    setMobileMenuOpen(false);
  }, [logout, resetNavigation]);

  const handleEditTransaction = useCallback((t: Transaction) => {
    setEditingTransaction(t);
    setActiveModal('transaction');
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
    setEditingTransaction(null);
  }, []);

  const openTransactionForm = useCallback((initialData?: Partial<Transaction>) => {
    setEditingTransaction(initialData || null);
    setActiveModal('transaction');
  }, []);

  // Intercepta deep links nativos (ex: financaspro://agenda) via @capacitor/app
  useEffect(() => {
    if (!isNative) return;

    let cancelled = false;
    let urlListener: { remove: () => Promise<void> | void } | null = null;

    const handleOpenUrl = (urlStr: string) => {
      if (!urlStr || cancelled) return;
      try {
        const targetRoute = resolveAppRoute(urlStr);
        if (targetRoute) {
          routerNavigate(targetRoute);
          if (targetRoute.includes('action=new-transaction')) {
            openTransactionForm();
          }
        }
      } catch (err) {
        console.warn('[useAppState] Erro ao resolver URL de abertura:', err);
      }
    };

    const setupAppUrlOpen = async () => {
      try {
        const launchUrl = await App.getLaunchUrl();
        if (launchUrl?.url) {
          handleOpenUrl(launchUrl.url);
        }

        urlListener = await App.addListener('appUrlOpen', (data: { url: string }) => {
          handleOpenUrl(data.url);
        });
      } catch (err) {
        console.warn('[useAppState] Falha ao registrar appUrlOpen:', err);
      }
    };

    setupAppUrlOpen();

    return () => {
      cancelled = true;
      if (urlListener) {
        try {
          urlListener.remove();
        } catch {}
      }
    };
  }, [isNative, routerNavigate, openTransactionForm]);

  const isLoading = authLoading;

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    authLoading,
    userMetaLoading,
    lancamentos,
    categories,
    debts,
    saveLancamento,
    deleteLancamento,
    fetchHistory,
    fetchMonth,
    saveCategory,
    deleteCategory,
    userMeta,
    userMetaLoaded,
    usagePercentage,
    isLimitReached,
    isPro,
    isPremium,
    isAppLocked,
    storedPin,
    handleUnlockSuccess,
    isNative,
    isMobileBrowser,
    isLoading,
    isPrivacyMode,
    setIsPrivacyMode,
    isNotificationsOpen,
    setIsNotificationsOpen,
    isSyncing,
    activeModal,
    setActiveModal,
    mobileMenuOpen,
    setMobileMenuOpen,
    editingTransaction,
    setEditingTransaction,
    onboardingDismissed,
    setOnboardingDismissed,
    handleLogout,
    handleEditTransaction,
    handleCloseModal,
    getAiContextTransactions,
    openTransactionForm,
    routerNavigate,
    location,
    scheduleDailyReminder: NotificationService.scheduleDailyReminder
  }), [
    user, isAuthenticated, authLoading, userMetaLoading,
    lancamentos, categories, debts,
    saveLancamento, deleteLancamento, fetchHistory, fetchMonth,
    saveCategory, deleteCategory,
    userMeta, userMetaLoaded, usagePercentage, isLimitReached,
    isPro, isPremium, isAppLocked, storedPin,
    handleUnlockSuccess, isNative, isMobileBrowser, isLoading,
    isPrivacyMode, isNotificationsOpen, isSyncing,
    activeModal, mobileMenuOpen,
    editingTransaction, onboardingDismissed,
    handleLogout, handleEditTransaction, handleCloseModal,
    getAiContextTransactions, openTransactionForm,
    routerNavigate, location
  ]);

  return value;
}
