import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { Transaction, UserMeta } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useCockpitData } from './Cockpit/useCockpitData';
import { useEntitlement } from '../../hooks/useEntitlement';
import { useDebts } from '../../services/debt/debt.hooks';
import { useWealthData } from '../../hooks/useWealthData';
import { useBudget } from '../../hooks/useBudget';
import { calcBudgetProgress, toBudgetInsightData } from '../../services/budgetMath';
import { buildUserContext, getCentralInsights } from '../../services/nexusInsightEngine';
import { isCommandMode } from '../../services/personaCalibrationService';
import { getCentralJourneyStage } from '../../theme/fpiVoiceGuide';
import { getConsecutiveDays } from '../../utils/streakUtils';
import { getLocalDateString } from '../../utils/dateHelpers';
import CockpitHero from './Cockpit/CockpitHero';
import CockpitInventory from './Cockpit/CockpitInventory';
import CockpitAnalytics from './Cockpit/CockpitAnalytics';
import SovereignBuckets from '../tools/finance/dashboard/SovereignBuckets';
import MarginTrajectoryPanel from '../tools/finance/dashboard/MarginTrajectoryPanel';
import CommandRitual from './CommandRitual';
import SovereignMapCard from './SovereignMapCard';
import FirstTransactionCTA from './FirstTransactionCTA';
import UrgentBillsSheet from './UrgentBillsSheet';
import ProtectionBar from '../tools/finance/dashboard/ProtectionBar';
import JornadaMetrics from './JornadaMetrics';
import DebtVictoryBanner from './Cockpit/DebtVictoryBanner';
import { RefreshCw, ChevronDown, Brain, Sparkles, ChevronRight, Lock, Crown, X, Target } from 'lucide-react';
import NexusActionButton from './NexusActionButton';
import { setActiveBehaviorUserId, traceNavigation } from '../../services/insightResponseObserver';
import { useExclusionAmount } from '../../contexts/ExclusionsContext';
import { useTheme } from '../../contexts/ThemeContext';

interface AppCockpitProps {
  transactions: Transaction[];
  isPrivacyMode: boolean;
  onNavigate: (tool: string, state?: any) => void;
  onOpenForm: (initialData?: any) => void;
  userMeta?: UserMeta | null;
  isSyncing?: boolean;
}

const AppCockpitInner: React.FC<AppCockpitProps> = ({
  transactions,
  isPrivacyMode,
  onNavigate,
  onOpenForm,
  userMeta,
  isSyncing
}) => {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const { effectiveTier } = useEntitlement();
  const { budget } = useBudget(user?.uid);
  const cockpit = useCockpitData(user, transactions, userMeta);
  const [showUrgentBills, setShowUrgentBills] = useState(false);
  const [showEvolucao, setShowEvolucao] = useState(false);
  const [lockedModule, setLockedModule] = useState<string | null>(null);
  const [expandedTraceInsightId, setExpandedTraceInsightId] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('view') === 'urgent-bills') {
      setShowUrgentBills(true);
    }

    const focusTarget =
      (location.state as any)?.focusSection ||
      searchParams.get('focus') ||
      (location.hash ? location.hash.replace('#', '') : null);

    if (focusTarget) {
      const timer = setTimeout(() => {
        const el = document.getElementById(focusTarget);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [location.search, location.hash, location.state]);

  useEffect(() => {
    setActiveBehaviorUserId(user?.uid || null);
  }, [user?.uid]);

  const { data: debts = [] } = useDebts(user?.uid || undefined);
  const { assets = [], passives = [], patrimonioLiquido = 0 } = useWealthData();

  const showSyncBanner = !!isSyncing;
  const hasTransactions = transactions.length > 0;
  const hasPremiumAccess = effectiveTier === 'premium';
  const hasProAccess = effectiveTier === 'pro' || effectiveTier === 'premium';

  const formatCurrency = (val?: number | null) =>
    (val ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const activeDebtsCount = debts.filter((d: any) => (d.saldoDevedor ?? 0) > 0).length;
  const hasFinancialProfile = Boolean(userMeta?.financialProfile);
  const colchaoInicialTarget = userMeta?.financialProfile?.colchaoInicialTarget || 0;
  const reserveTarget = userMeta?.financialProfile?.emergencyReserveTarget;

  const exclusionAmount = useExclusionAmount(reserveTarget ?? 0, colchaoInicialTarget);
  const adjustedBalance = cockpit.sovereign.accumulatedBalance - exclusionAmount;

  const userId = user?.uid || null;

  const now = useMemo(() => new Date(), []);

  const validTransactionDates = useMemo(
    () => transactions
      .map((t) => new Date(t.date))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime()),
    [transactions]
  );

  const lastTransactionDate = validTransactionDates[0] ?? null;
  const daysSinceLastTransaction = lastTransactionDate
    ? Math.floor((now.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const streak = useMemo(() => getConsecutiveDays(transactions), [transactions]);

  // Central insights + recommendation
  const nexusInsights = useMemo(() => {
    const todayStr = getLocalDateString();
    const txToday = transactions.filter((t) => t.date === todayStr).length;
    const hasRealEstate = passives.some((p) => p.category === 'Imóveis');
    const hasVehicles = passives.some((p) => p.category === 'Veículos');
    const debtJustPaidOff = debts.some((d) => d.saldoDevedor === 0);
    const budgetProgress = budget
      ? toBudgetInsightData(calcBudgetProgress(budget, transactions))
      : undefined;

    const ctx = buildUserContext({
      hasFinancialProfile,
      financialProfile: userMeta?.financialProfile,
      hasPaidAccess: hasProAccess,
      isPremium: hasPremiumAccess,
      transactionsToday: txToday,
      daysSinceLastTransaction: daysSinceLastTransaction ?? 999,
      launchCount: transactions.length,
      launchLimit: userMeta?.launchLimit || 30,
      monthBalance: cockpit.sovereign.monthBalance,
      monthIncome: cockpit.sovereign.income,
      monthExpenses: cockpit.sovereign.expenses,
      sovereignFreeBalance: cockpit.sovereign.sovereignFreeBalance,
      freedomDeficit: cockpit.sovereign.freedomDeficit,
      obligationsDeduction: cockpit.sovereign.obligationsDeduction,
      commandMode: isCommandMode(userMeta),
      persona: userMeta?.persona,
      transactions,
      hasFirstInvestment: transactions.some((t) => t.category?.toLowerCase().includes('investimento')),
      streak,
      hasDebts: debts.length > 0,
      hasRealEstate,
      hasVehicles,
      totalAssetsValue: cockpit.totalInvestments + cockpit.totalProperty,
      marcoZero: cockpit.marcoZero,
      reserveCurrent: cockpit.reserveCurrent,
      reserveTarget,
      reserveGoalMet: false,
      debtJustPaidOff,
      assets,
      passives,
      debts,
      budgetProgress,
    });

    return getCentralInsights(ctx);
  }, [
    transactions, userMeta, hasProAccess, hasPremiumAccess,
    cockpit.sovereign, daysSinceLastTransaction, hasFinancialProfile,
    debts, passives, assets, streak, cockpit.marcoZero,
    cockpit.reserveCurrent, reserveTarget, cockpit.totalInvestments, cockpit.totalProperty,
    budget,
  ]);

  const journeyStage = getCentralJourneyStage({
    hasLaunches: transactions.length > 0,
    hasFinancialProfile,
    hasPremium: hasPremiumAccess,
  });

  const centralRecommendation = (() => {
    if (transactions.length === 0) {
      return {
        eyebrow: 'Prontidão dos dados',
        title: 'Inicie sua leitura financeira',
        description:
          'Sem rotina registrada, a leitura estratégica fica limitada. Registre sua primeira movimentação no Controla.',
        cta: 'Ir para o Controla',
        action: () => onNavigate('manager'),
        tone: 'amber' as const,
      };
    }

    if ((daysSinceLastTransaction ?? 0) >= 7) {
      return {
        eyebrow: 'Prontidão dos dados',
        title: 'Atualize seus registros recentes',
        description: `Há ${daysSinceLastTransaction} dias sem novas movimentações. Dados recentes garantem que sua Disponibilidade Real reflita o momento atual.`,
        cta: 'Atualizar no Controla',
        action: () => onNavigate('manager'),
        tone: 'amber' as const,
      };
    }

    if (!hasFinancialProfile) {
      return {
        eyebrow: 'Prontidão dos dados',
        title: 'Configure suas metas de proteção',
        description:
          'Defina suas metas de Colchão Emergencial e Reserva de Emergência para calibrar sua Disponibilidade Real com maior precisão.',
        cta: 'Configurar metas',
        action: () => {
          const el = document.getElementById('base-protecao');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          } else {
            onNavigate('central', { focusSection: 'base-protecao' });
          }
        },
        tone: 'sky' as const,
      };
    }

    return null;
  })();

  const recommendationToneMap = {
    amber: {
      wrapper: 'border-amber-200/80 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20',
      button: 'bg-white dark:bg-slate-900 hover:bg-amber-100/60 dark:hover:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-300',
      eyebrow: 'text-amber-800 dark:text-amber-400',
    },
    sky: {
      wrapper: 'border-sky-200/80 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20',
      button: 'bg-white dark:bg-slate-900 hover:bg-sky-100/60 dark:hover:bg-sky-950/40 border border-sky-300 dark:border-sky-700 text-sky-900 dark:text-sky-300',
      eyebrow: 'text-sky-800 dark:text-sky-400',
    },
  } as const;

  const recTone = centralRecommendation ? recommendationToneMap[centralRecommendation.tone] : null;

  // FIRST-USE STATE
  if (!hasTransactions) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-14 md:pt-6 pb-28 space-y-5 md:space-y-8 animate-in fade-in duration-500">
        {showSyncBanner && (
          <div className="flex items-center justify-center gap-3 px-6 py-2 bg-sky-500/10 border border-sky-500/20 rounded-2xl animate-in slide-in-from-top-4">
            <RefreshCw size={12} className="text-sky-500 animate-spin" />
            <span className="text-[9px] font-black text-sky-600 uppercase tracking-widest">
              Sincronizando dados em tempo real...
            </span>
          </div>
        )}
        <FirstTransactionCTA onOpenForm={onOpenForm} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-14 md:pt-6 pb-28 space-y-8 animate-in fade-in duration-500">

      {/* SYNC BANNER */}
      {showSyncBanner && (
        <div className="flex items-center justify-center gap-3 px-6 py-2 bg-sky-500/10 border border-sky-500/20 rounded-2xl animate-in slide-in-from-top-4">
          <RefreshCw size={12} className="text-sky-500 animate-spin" />
          <span className="text-[9px] font-black text-sky-600 uppercase tracking-widest">
            Sincronizando dados em tempo real...
          </span>
        </div>
      )}

      {/* CELEBRAÇÃO DE QUITAÇÃO DE DÍVIDA (F4.3.2) */}
      <DebtVictoryBanner
        debts={debts}
        formatCurrency={formatCurrency}
        isPrivacyMode={isPrivacyMode}
      />

      {/* N1 — Situação financeira atual (Largura Total Panorâmica) */}
      <CockpitHero
        urgentBills={cockpit.urgentBills}
        userMeta={userMeta}
        isPrivacyMode={isPrivacyMode}
        sovereign={cockpit.sovereign}
        marcoZero={cockpit.colchaoCurrent ?? cockpit.marcoZero}
        reserveCurrent={cockpit.reserveCurrent}
        transactions={transactions}
        formatCurrency={formatCurrency}
        onNavigate={onNavigate}
        onOpenForm={onOpenForm}
        onShowUrgentBills={() => setShowUrgentBills(true)}
        exclusionAmount={exclusionAmount}
      />

      {/* N1 — Comando & Mapa da Jornada (Grade de 2 Colunas Balanceadas) */}
      {cockpit.stage && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <CommandRitual
            stage={cockpit.stage}
            event={cockpit.contextualEvent}
            onNavigate={onNavigate}
            freeBalance={cockpit.sovereign.sovereignFreeBalance}
            shortfall={cockpit.sovereign.protectionShortfall}
            launchCount={transactions.length}
            urgentCount={cockpit.urgentBills.length}
            projectedBalance={cockpit.sovereign.projectedBalance}
          />
          <SovereignMapCard
            stage={cockpit.stage}
            onNavigate={onNavigate}
          />
        </div>
      )}

      {/* N2 — Base de Proteção e Métricas de Evolução */}
      <section id="base-protecao" className="space-y-6" aria-label="Base de Proteção e Métricas">
        <ProtectionBar
          saldoRealTotal={cockpit.sovereign.accumulatedBalance}
          colchaoTarget={colchaoInicialTarget}
          reserveTarget={reserveTarget ?? 0}
          isPrivacyMode={isPrivacyMode}
          userId={user?.uid}
          userMeta={userMeta}
          onOpenForm={onOpenForm}
        />

        <JornadaMetrics
          stageName={journeyStage.stage}
          effectiveTier={effectiveTier}
          saldoRealTotal={cockpit.sovereign.accumulatedBalance}
          colchaoTarget={colchaoInicialTarget}
          patrimonioLiquido={patrimonioLiquido}
          activeDebtsCount={activeDebtsCount}
          reserveTarget={reserveTarget}
          formatCurrency={formatCurrency}
          onNavigate={onNavigate}
          isPrivacyMode={isPrivacyMode}
        />
      </section>

      {/* Lembretes operacionais secundários — somente quando aplicáveis */}
      {centralRecommendation && recTone && (
        <section
          id="prontidao-dados"
          aria-label="Prontidão dos dados"
          className={`rounded-section border p-5 md:p-6 ${recTone.wrapper}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${recTone.eyebrow}`}>
                {centralRecommendation.eyebrow}
              </span>
              <h3 className="text-sm md:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {centralRecommendation.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {centralRecommendation.description}
              </p>
            </div>
            <button
              type="button"
              onClick={centralRecommendation.action}
              className={`shrink-0 px-5 py-2.5 rounded-xl text-[11px] font-bold transition-all shadow-sm ${recTone.button}`}
            >
              {centralRecommendation.cta}
            </button>
          </div>
        </section>
      )}

      {/* N3 — O que seus dados indicam — Nexus insights */}
      {nexusInsights.length > 0 && (
        <section className="space-y-4" aria-label="Nexus insights">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 dark:bg-violet-900/40 rounded-xl text-violet-600 dark:text-violet-300">
              <Brain size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Leitura conectada</p>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-1">O que seus dados indicam</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {nexusInsights.slice(0, 3).map((insight) => (
              <div
                key={insight.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-section p-6 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm"
              >
                <div>
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${
                      insight.priority === 'alta'
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50'
                        : insight.priority === 'media'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'
                          : 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50'
                    }`}
                  >
                    <Sparkles size={16} />
                  </div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1.5 leading-tight">{insight.message.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">{insight.message.body}</p>

                  {insight.traceability && (
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedTraceInsightId((prev) => (prev === insight.id ? null : insight.id))
                        }
                        className="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-1 py-1"
                        aria-expanded={expandedTraceInsightId === insight.id}
                      >
                        <span>Por que o Nexus disse isso?</span>
                        <ChevronDown
                          size={12}
                          className={`transition-transform duration-200 ${
                            expandedTraceInsightId === insight.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {expandedTraceInsightId === insight.id && (
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] space-y-2 animate-in fade-in duration-200">
                          <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            {insight.traceability.reason}
                          </p>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                            {insight.traceability.metrics.map((metric, mIdx) => (
                              <div
                                key={mIdx}
                                className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800"
                              >
                                <span className="block text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                  {metric.label}
                                </span>
                                <span className="block text-[11px] font-black text-slate-900 dark:text-white font-mono mt-0.5">
                                  {metric.value}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 pt-1">
                            <span>Recorte: {insight.traceability.period}</span>
                            <span>Fontes: {insight.traceability.sources.join(', ')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      traceNavigation(insight.id, user?.uid);
                      if (insight.id.startsWith('budget-')) {
                        onNavigate(insight.deepLink, { openBudgetSetup: true });
                      } else {
                        onNavigate(insight.deepLink);
                      }
                    }}
                    className="w-full py-2.5 rounded-xl bg-surface-subtle dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase tracking-wider hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-center gap-1.5"
                  >
                    {insight.message.ctaLabel} <ChevronRight size={14} />
                  </button>
                  {insight.action && (
                    <div className="mt-2">
                      <NexusActionButton
                        insight={insight}
                        userId={userId || 'unknown'}
                        onActionExecuted={() => {}}
                        onNavigate={(route) => {
                          if (insight.id.startsWith('budget-')) {
                            onNavigate(route, { openBudgetSetup: true });
                          } else {
                            onNavigate(route);
                          }
                        }}
                        variant="secondary"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* N4 — Comando Patrimonial */}
      <CockpitInventory
        totals={cockpit.totals}
        detailedCards={cockpit.detailedCards}
        isPrivacyMode={isPrivacyMode}
        onNavigate={onNavigate}
        formatCurrency={formatCurrency}
      />

      {/* N5 — Composição do saldo e trajetória */}
      {cockpit.sovereign.commandMode && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <SovereignBuckets
            snapshot={cockpit.sovereign}
            marcoZero={cockpit.colchaoCurrent ?? cockpit.marcoZero}
            reserveCurrent={cockpit.reserveCurrent}
            isPrivacyMode={isPrivacyMode}
            variant={resolvedTheme === 'dark' ? 'dark' : 'light'}
          />
          <MarginTrajectoryPanel
            transactions={transactions}
            financialProfile={userMeta?.financialProfile}
            currentMargin={cockpit.sovereign.sovereignFreeBalance}
            isPrivacyMode={isPrivacyMode}
            variant={resolvedTheme === 'dark' ? 'dark' : 'light'}
            months={6}
          />
        </div>
      )}

      {/* N6 — Evolução Patrimonial (recolhida por padrão) */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => setShowEvolucao(!showEvolucao)}
          className="w-full flex items-center justify-between p-4 md:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-section hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
              <Target size={18} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Aprofundamento</p>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight mt-0.5">Evolução Patrimonial</h3>
            </div>
          </div>
          <ChevronDown
            size={18}
            className={`text-slate-500 dark:text-slate-400 transition-transform duration-200 ${showEvolucao ? 'rotate-180' : ''}`}
          />
        </button>

        {showEvolucao && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <CockpitAnalytics
              evolutionData={cockpit.evolutionData}
              investmentComposition={cockpit.investmentComposition}
              propertyComposition={cockpit.propertyComposition}
              debtComposition={cockpit.debtComposition}
              isPrivacyMode={isPrivacyMode}
              validatedModules={cockpit.totals.validatedModules}
              totalInvestments={cockpit.totalInvestments}
              totalProperty={cockpit.totalProperty}
              totalDebts={cockpit.totalDebts}
              onNavigate={onNavigate}
              formatCurrency={formatCurrency}
            />
          </div>
        )}
      </div>

      {/* Urgent Bills Sheet */}
      <UrgentBillsSheet
        bills={cockpit.urgentBills}
        isOpen={showUrgentBills}
        onClose={() => setShowUrgentBills(false)}
        onOpenForm={onOpenForm}
      />

      {/* Locked Module Modal */}
      {lockedModule && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className="p-4 bg-sky-50 dark:bg-sky-950/40 rounded-2xl text-sky-600 dark:text-sky-400">
                  <Lock size={32} />
                </div>
                <button
                  type="button"
                  onClick={() => setLockedModule(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight mb-3">{lockedModule}</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 text-sm">Recurso estratégico disponível no Premium.</p>
              <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 mb-8">
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">No Premium você ganha:</p>
                <ul className="space-y-2.5">
                  {(lockedModule === 'Gestão de Dívidas'
                    ? ['Projeção de quitação e economia de juros', 'Acompanhamento de vencimentos', 'Priorização entre dívidas']
                    : lockedModule === 'Investimentos'
                      ? ['Carteira consolidada', 'Visão de alocação', 'Evolução dos ativos']
                      : ['Patrimônio líquido unificado', 'Bens e passivos organizados', 'Reserva e colchão de proteção']
                  ).map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 font-medium leading-tight">
                      <Crown size={12} className="text-emerald-500 fill-emerald-500 shrink-0 mt-0.5" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => { setLockedModule(null); onNavigate('pricing'); }}
                  className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20"
                >
                  Conhecer o Premium
                </button>
                <button
                  type="button"
                  onClick={() => setLockedModule(null)}
                  className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 text-xs font-black uppercase tracking-widest transition-all"
                >
                  Voltar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AppCockpit: React.FC<AppCockpitProps> = (props) => (
  <AppCockpitInner {...props} />
);

export default AppCockpit;
