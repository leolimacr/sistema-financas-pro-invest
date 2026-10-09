import React, { useCallback, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import OnboardingWizard from '../components/OnboardingWizard';
import AuthLogin from '../components/Auth/AuthLogin';
import AuthRegister from '../components/Auth/AuthRegister';
import PublicHome from '../components/PublicHome';
import SecurityLock from '../components/SecurityLock';
import { getArticleById } from '../components/Public/Articles';
import AppLoadingScreen from '../components/AppLoadingScreen';
import DashboardSkeleton from '../components/tools/finance/dashboard/DashboardSkeleton';
import PublicLayout from '../layouts/PublicLayout';
import FeatureGate from '../components/FeatureGate';
import PremiumUpgradePrompt from '../components/PremiumUpgradePrompt';
import { useNavigation } from '../hooks/useNavigation';
import { useEntitlement } from '../hooks/useEntitlement';
import { courseRoutes, CourseRoutesShell } from './courseRoutes';
import { useTransactionsContext } from '../contexts/TransactionsContext';
import { useDebtContext } from '../contexts/DebtContext';
import { useFinanceContext } from '../contexts/FinanceContext';
import { useWealthData } from '../hooks/useWealthData';
import { Capacitor } from '@capacitor/core';
import { lazy } from 'react';
import MobileAppGate from '../components/MobileAppGate';

const MobilePublicHome = lazy(() => import('../components/MobilePublicHome'));
const AppLayout = lazy(() => import('../layouts/AppLayout'));
const AppCockpit = lazy(() => import('../components/Home/AppCockpit'));
const DashboardPage = lazy(() => import('../pages/Dashboard'));
const ExplorarHub = lazy(() => import('../components/ExplorarHub').then((mod) => ({ default: mod.ExplorarHub })));
const AgendaHub = lazy(() => import('../components/AgendaHub').then((mod) => ({ default: mod.AgendaHub })));
import { ControlaPage } from '../components/tools/finance/ControlaPage';
const AiAdvisor = lazy(() => import('../components/tools/nexus/AiAdvisor'));
const PricingPage = lazy(() => import('../components/PricingPage'));
const SettingsPage = lazy(() => import('../components/SettingsPage'));
const ActiveWealthManager = lazy(() => import('../components/tools/wealth/ActiveWealthManager').then((mod) => ({ default: mod.ActiveWealthManager })));
const PassiveWealthManager = lazy(() => import('../components/tools/wealth/PassiveWealthManager').then((mod) => ({ default: mod.PassiveWealthManager })));
const DebtManager = lazy(() => import('../components/tools/wealth/DebtManager').then((mod) => ({ default: mod.DebtManager })));
const GoalManager = lazy(() => import('../components/tools/goals/GoalManager'));
const FireCalculatorTool = lazy(() => import('../components/tools/FireCalculatorTool').then((mod) => ({ default: mod.FireCalculatorTool })));
const CompoundInterestTool = lazy(() => import('../components/tools/CompoundInterestTool').then((mod) => ({ default: mod.CompoundInterestTool })));
const InflationTool = lazy(() => import('../components/tools/InflationTool').then((mod) => ({ default: mod.InflationTool })));
const RentVsFinanceTool = lazy(() => import('../components/tools/RentVsFinanceTool').then((mod) => ({ default: mod.RentVsFinanceTool })));
const DebtOptimizerTool = lazy(() => import('../components/tools/DebtOptimizerTool').then((mod) => ({ default: mod.DebtOptimizerTool })));
const DividendsTool = lazy(() => import('../components/tools/DividendsTool').then((mod) => ({ default: mod.DividendsTool })));
const BuyCashOrInstallInvestTool = lazy(() => import('../components/tools/buy-cash-or-installments/BuyCashOrInstallInvestTool'));
const TermsPage = lazy(() => import('../components/TermsPage').then((mod) => ({ default: mod.TermsPage })));
const PrivacyPage = lazy(() => import('../components/PrivacyPage').then((mod) => ({ default: mod.PrivacyPage })));
const DownloadPage = lazy(() => import('../pages/DownloadPage'));
const PortfolioPage = lazy(() => import('../pages/PortfolioPage'));

interface AppRoutesProps {
  state: ReturnType<typeof useAppState>;
}

const ProtectedRoute = ({ 
  isAuthenticated, 
  children 
}: { 
  isAuthenticated: boolean; 
  children: React.ReactNode 
}) => {
  const location = useLocation();
  if (!isAuthenticated) {
    const redirectParam = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
    return <Navigate to={`/login?redirect=${redirectParam}`} replace />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC<AppRoutesProps> = ({ state }) => {
  const { bridgeReady, hasConnectedAtLeastOnce: txConnected } = useTransactionsContext();
  const { debtBridgeReady, hasConnectedAtLeastOnce: debtConnected } = useDebtContext();
  const { financeBridgeReady, hasConnectedAtLeastOnce: financeConnected } = useFinanceContext();
  const wealthData = useWealthData();

  const allReady = bridgeReady && debtBridgeReady && financeBridgeReady;

  const anyConnected = txConnected || debtConnected || financeConnected;

  // Debounce de 2s para o banner "Modo Offline" — evita flicker em atrasos transitórios
  const [showStale, setShowStale] = React.useState(false);
  React.useEffect(() => {
    if (allReady || !anyConnected) {
      setShowStale(false);
      return;
    }
    const id = setTimeout(() => setShowStale(true), 2000);
    return () => clearTimeout(id);
  }, [allReady, anyConnected]);

  const showFullLoading = false;

  const { effectiveTier } = useEntitlement();
  const isPro = effectiveTier !== 'free';
  const isPremium = effectiveTier === 'premium';

  const {
    handleNavigate,
    handleAuthSuccess,
    homeKey,
    currentTool
  } = useNavigation();

  const handleTogglePrivacy = useCallback(() => {
    state.setIsPrivacyMode((prev: boolean) => !prev);
  }, [state.setIsPrivacyMode]);

  const {
    user,
    isAuthenticated,
    lancamentos,
    categories,
    deleteLancamento,
    saveCategory,
    deleteCategory,
    userMeta,
    userMetaLoaded,
    isAppLocked,
    storedPin,
    handleUnlockSuccess,
    isPrivacyMode,
    setActiveModal,
    setOnboardingDismissed,
    routerNavigate,
    handleEditTransaction,
    getAiContextTransactions,
  } = state;

  // Hook moved above to maintain consistent order

  if (isAppLocked && isAuthenticated && storedPin) {
    return (
      <SecurityLock storedPin={storedPin} useBiometrics={false} onSuccess={handleUnlockSuccess} />
    );
  }

  return (
    <>
      <MobileAppGate isMobileBrowser={state.isMobileBrowser} isAuthenticated={isAuthenticated} />
      <Routes>
        {/* REDIRECT LEGADO — Etapa 8 (E8-01): /dashboard agora é o Dashboard Principal */}
        <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />

      {/* ROTAS PÚBLICAS (COM HEADER) */}
      <Route element={<PublicLayout />}>
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <Navigate to="/app/central" replace />
            ) : Capacitor.isNativePlatform() ? (
              <React.Suspense fallback={<AppLoadingScreen />}>
                <MobilePublicHome
                  onLogin={() => handleNavigate('login')}
                  onRegister={() => handleNavigate('register')}
                />
              </React.Suspense>
            ) : (
              <React.Suspense fallback={<AppLoadingScreen />}>
                <PublicHome
                  key={homeKey}
                  onNavigate={handleNavigate}
                  onStartNow={() => handleNavigate('register')}
                  isAuthenticated={isAuthenticated}
                  userEmail={user?.email}
                  userMeta={userMeta}
                  isPrivacyMode={isPrivacyMode}
                />
              </React.Suspense>
            )
          } 
        />

        <Route 
          path="/login" 
          element={<AuthLogin
              onSuccess={handleAuthSuccess}
              onSwitchToRegister={() => handleNavigate('register')}
            />} 
        />

        <Route 
          path="/register" 
          element={<AuthRegister
              onSuccess={handleAuthSuccess}
              onSwitchToLogin={() => handleNavigate('login')}
            />} 
        />

        <Route path="/termos" element={<React.Suspense fallback={<AppLoadingScreen />}><TermsPage /></React.Suspense>} />
        <Route path="/privacidade" element={<React.Suspense fallback={<AppLoadingScreen />}><PrivacyPage /></React.Suspense>} />
        <Route path="/download" element={<React.Suspense fallback={<AppLoadingScreen />}><DownloadPage /></React.Suspense>} />

        {/* FERRAMENTAS PÚBLICAS (ACESSO ABERTO SEM LOGIN) */}
        <Route path="/ferramentas/fire" element={<React.Suspense fallback={<DashboardSkeleton />}><FireCalculatorTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} isPro={isPro} isPremium={isPremium} /></React.Suspense>} />
        <Route path="/ferramentas/juros" element={<React.Suspense fallback={<DashboardSkeleton />}><CompoundInterestTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} /></React.Suspense>} />
        <Route path="/ferramentas/inflacao" element={<React.Suspense fallback={<DashboardSkeleton />}><InflationTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} /></React.Suspense>} />
        <Route path="/ferramentas/alugar" element={<React.Suspense fallback={<DashboardSkeleton />}><RentVsFinanceTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} /></React.Suspense>} />
        <Route path="/ferramentas/dividas" element={<React.Suspense fallback={<DashboardSkeleton />}><DebtOptimizerTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} /></React.Suspense>} />
        <Route path="/ferramentas/dividendos" element={<React.Suspense fallback={<DashboardSkeleton />}><DividendsTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} /></React.Suspense>} />
        <Route path="/ferramentas/compra-avista-parcelado" element={<React.Suspense fallback={<DashboardSkeleton />}><BuyCashOrInstallInvestTool onNavigate={handleNavigate} /></React.Suspense>} />

        {/* ARTIGOS */}
        <Route path="/artigos/investir-2026" element={(() => {
            const article = getArticleById('investir-2026');
            if (!article) return <Navigate to="/" />;
            const ArticleComponent = article.component;
            return <ArticleComponent onNavigate={handleNavigate} />;
        })()} />
      </Route>

      {/* CURSOS */}
      <Route 
        path="/curso/*" 
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <CourseRoutesShell>
              <Routes>{courseRoutes}</Routes>
            </CourseRoutesShell>
          </ProtectedRoute>
        } 
      />

      {/* APP SHELL (ROTAS AUTENTICADAS COM LAYOUT COMPLETO) */}
      <Route 
        path="/app" 
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <React.Suspense fallback={<AppLoadingScreen />}>
              <AppLayout state={state}>
                <Outlet />
              </AppLayout>
            </React.Suspense>
          </ProtectedRoute>
        }
      >
        <Route 
          path="central" 
          element={
            isAuthenticated && userMetaLoaded && userMeta?.onboardingCompleted === false ? (
              <div className="min-h-screen bg-surface-primary flex items-center justify-center px-4">
                <OnboardingWizard userId={user!.uid} onComplete={() => setOnboardingDismissed(true)} />
              </div>
            ) : (
              <React.Suspense fallback={<DashboardSkeleton />}>
                <AppCockpit
                  transactions={state.lancamentos}
                  isPrivacyMode={state.isPrivacyMode}
                  onNavigate={(tool, state) => handleNavigate(tool, state)}
                  onOpenForm={state.openTransactionForm}
                  userMeta={userMeta}
                  isSyncing={state.isSyncing}
                />
              </React.Suspense>
            )
          } 
        />

        <Route path="home" element={<Navigate to="/app/central" replace />} />

        {/* Etapa 8 (E8-01): Dashboard Principal — visão geral do mês */}
        <Route path="dashboard" element={<React.Suspense fallback={<DashboardSkeleton />}><DashboardPage /></React.Suspense>} />

        <Route
          path="controla"
          element={
            <ControlaPage
              transactions={lancamentos}
              isLoading={state.isLoading || (lancamentos.length === 0 && !txConnected)}
              userMetaLoading={state.userMetaLoading}
              isSyncing={state.isSyncing}
              isStale={showStale}
              categories={categories}
              onDeleteTransaction={deleteLancamento}
              onNavigate={handleNavigate}
              onOpenForm={state.openTransactionForm}
              onSaveCategory={saveCategory}
              onDeleteCategory={deleteCategory}
              userMeta={userMeta}
              isPremium={isPro || isPremium}
              isPrivacyMode={isPrivacyMode}
              onTogglePrivacy={handleTogglePrivacy}
              onEditTransaction={handleEditTransaction}
              fetchMonth={state.fetchMonth}
            />
          }
        />

        <Route path="agenda" element={<React.Suspense fallback={<DashboardSkeleton />}><AgendaHub onNavigate={handleNavigate} /></React.Suspense>} />

        <Route path="explorar" element={<React.Suspense fallback={<DashboardSkeleton />}><ExplorarHub onNavigate={handleNavigate} routerNavigate={routerNavigate} /></React.Suspense>} />

        <Route 
          path="ia" 
          element={
            <React.Suspense fallback={<DashboardSkeleton />}>
              <AiAdvisor
                transactions={state.getAiContextTransactions()}
                currentCalcResult={[]}
                goals={wealthData.goals}
                assets={wealthData.assets}
                passives={wealthData.passives}
                debts={wealthData.debts}
                currentTool={currentTool}
              />
            </React.Suspense>
          } 
        />

        <Route path="mais" element={<React.Suspense fallback={<DashboardSkeleton />}><SettingsPage onBack={() => handleNavigate('central')} /></React.Suspense>} />
        
        <Route path="mais/pricing" element={<React.Suspense fallback={<DashboardSkeleton />}><PricingPage /></React.Suspense>} />

        <Route 
          path="investimentos" 
          element={
            <FeatureGate
              featureKey="investments"
              fallback={
                <PremiumUpgradePrompt
                  title="Investimentos"
                  description="Acompanhe sua carteira, alocação e evolução patrimonial com o módulo de investimentos do Premium."
                  onNavigate={handleNavigate}
                />
              }
            >
              <ActiveWealthManager 
                userId={user?.uid}
                onNavigate={handleNavigate} 
              />
            </FeatureGate>
          } 
        />
        <Route 
          path="carteira" 
          element={
            <React.Suspense fallback={<DashboardSkeleton />}>
              <PortfolioPage />
            </React.Suspense>
          } 
        />
        <Route
          path="passivos"
          element={
            <FeatureGate
              featureKey="passives"
              fallback={
                <PremiumUpgradePrompt
                  title="Patrimônio e Passivos"
                  description="Organize bens, passivos e visão patrimonial completa — recurso exclusivo do Premium."
                  onNavigate={handleNavigate}
                />
              }
            >
              <PassiveWealthManager userId={user?.uid} />
            </FeatureGate>
          }
        />
        <Route 
          path="minhas-dividas" 
          element={
            <FeatureGate
              featureKey="debts"
              fallback={
                <PremiumUpgradePrompt
                  title="Minhas Dívidas"
                  description="Estratégia de quitação, projeções e acompanhamento inteligente das suas dívidas — disponível no Premium."
                  onNavigate={handleNavigate}
                />
              }
            >
              <DebtManager
                userId={user?.uid}
                userMeta={userMeta}
                lancamentos={lancamentos}
                onNavigate={handleNavigate}
                isSyncing={state.isSyncing}
              />
            </FeatureGate>
          } 
        />
        <Route path="metas" element={<React.Suspense fallback={<DashboardSkeleton />}><GoalManager userId={user?.uid} userMeta={userMeta} isPrivacyMode={isPrivacyMode} /></React.Suspense>} />

        {/* FERRAMENTAS */}
        <Route path="ferramentas/fire" element={<React.Suspense fallback={<DashboardSkeleton />}><FireCalculatorTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} isPro={isPro} isPremium={isPremium} /></React.Suspense>} />
        <Route path="ferramentas/juros" element={<React.Suspense fallback={<DashboardSkeleton />}><CompoundInterestTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} /></React.Suspense>} />
        <Route path="ferramentas/inflacao" element={<React.Suspense fallback={<DashboardSkeleton />}><InflationTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} /></React.Suspense>} />
        <Route path="ferramentas/alugar" element={<React.Suspense fallback={<DashboardSkeleton />}><RentVsFinanceTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} /></React.Suspense>} />
        <Route path="ferramentas/dividas" element={<React.Suspense fallback={<DashboardSkeleton />}><DebtOptimizerTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} /></React.Suspense>} />
        <Route path="ferramentas/dividendos" element={<React.Suspense fallback={<DashboardSkeleton />}><DividendsTool onNavigate={handleNavigate} isAuthenticated={isAuthenticated} /></React.Suspense>} />
        <Route 
          path="ferramentas/compra-avista-parcelado" 
          element={
            <React.Suspense fallback={<DashboardSkeleton />}><BuyCashOrInstallInvestTool onNavigate={handleNavigate} /></React.Suspense>
          } 
        />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
};

export default React.memo(AppRoutes);
