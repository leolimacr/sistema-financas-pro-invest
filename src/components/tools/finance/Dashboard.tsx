import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Plus, ChevronUp, ChevronDown, PiggyBank, X, CreditCard, List, CalendarDays } from 'lucide-react';
import { useExclusions } from '../../../contexts/ExclusionsContext';

// Hooks e Componentes Originais Reutilizados
import FilterBar from './FilterBar';
import CategoryManager from './CategoryManager';
import RecurringBillManager from './RecurringBillManager';
import CardManager from './CardManager';
import BudgetSetupSheet from './BudgetSetupSheet';
import BudgetStatusCard from './BudgetStatusCard';
import BudgetExceededBanner from './BudgetExceededBanner';
import { calcBudgetProgress } from '../../../services/budgetMath';
import { formatBudgetMonthName } from '../../../utils/budgetUtils';
import { calculateWalletStatementSummary, getVoucherCardAvailableBalance } from '../../../utils/calculations';

// Subcomponentes Refatorados
import { useDashboardState } from './dashboard/useDashboardState';
import DashboardSkeleton from './dashboard/DashboardSkeleton';
import DashboardHeader from './dashboard/DashboardHeader';
import { useRefresh } from '../../../hooks/useRefresh';
import BalanceCards from './dashboard/BalanceCards';
import SaldoAjustavelCard from './dashboard/SaldoAjustavelCard';
import PendingObligations from './dashboard/PendingObligations';
import DashboardCharts from './dashboard/DashboardCharts';
import TransactionList from './dashboard/TransactionList';
import MonthlyExpenseCalendar from './calendar/MonthlyExpenseCalendar';
import CategorySummaryPanel from './dashboard/CategorySummaryPanel';
import AveragesAnalysisPanel from './dashboard/AveragesAnalysisPanel';
import RecurringIntroModal from './dashboard/RecurringIntroModal';
import FutureExpenseForm from './dashboard/FutureExpenseForm';
import CalibrationInviteBanner from './dashboard/CalibrationInviteBanner';
import CommandCalibration from '../nexus/CommandCalibration';
import { seedPersonaFromIntent } from '../../../services/personaService';
import { getFlowLabels } from '../../../theme/fpiVoiceGuide';
import PaywallModal from '../../PaywallModal';
import CategoryRecoveryDialog from './dashboard/CategoryRecoveryDialog';
import HistoryEducationalCard from './dashboard/HistoryEducationalCard';

const Dashboard: React.FC<any> = (props) => {
  const state = useDashboardState(props);
  const queryClient = useQueryClient();
  const { refresh, isRefreshing } = useRefresh(state.user?.uid);

  const voice = getFlowLabels(state.commandMode);
  const [showCategoryRecovery, setShowCategoryRecovery] = useState(true);
  const [viewType, setViewTypeState] = useState<'list' | 'calendar'>(() => {
    try {
      return (localStorage.getItem('fpi_controla_view_type') as 'list' | 'calendar') || 'list';
    } catch {
      return 'list';
    }
  });

  const setViewType = useCallback((type: 'list' | 'calendar') => {
    setViewTypeState(type);
    try {
      localStorage.setItem('fpi_controla_view_type', type);
    } catch {
      // ignore
    }
  }, []);

  const voucherCards = useMemo(() => {
    return (state.userCards || [])
      .filter((c: any) => c.type === 'voucher')
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        balance: getVoucherCardAvailableBalance(c, state.safeTransactions),
        voucherType: c.voucherType,
      }));
  }, [state.userCards, state.safeTransactions]);

  const budgetProgress = useMemo(
    () => (state.currentBudget ? calcBudgetProgress(state.currentBudget, state.safeTransactions) : null),
    [state.currentBudget, state.safeTransactions],
  );

  const invoiceLookup = useMemo(() => {
    const map = new Map<string, { transacoes: Array<{ id: string; description: string; amount: number; date: string }>; total: number }>();
    const safeTxs: any[] = state.safeTransactions || [];
    const userCardsArr: any[] = state.userCards || [];

    const allCards = new Map<string, any>();
    for (const c of userCardsArr) allCards.set(c.id, c);

    for (const inv of (state.activeInvoices || [])) {
      const key = `${inv.cardId}-${inv.periodEnd}`;
      map.set(key, {
        transacoes: (inv.transactions || []).map((t: any) => ({
          id: t.id,
          description: t.description || 'Sem descrição',
          amount: Number(t.amount) || 0,
          date: t.date,
          purchaseDate: t.purchaseDate,
          installments: t.installments,
          currentInstallment: t.currentInstallment,
        })),
        total: inv.total || 0,
      });
    }

    for (const t of safeTxs) {
      if (!t.isBillPayment || !t.linkedCardId || !t.linkedInvoicePeriodEnd) continue;
      const key = `${t.linkedCardId}-${t.linkedInvoicePeriodEnd}`;
      if (map.has(key)) continue;
      const card = allCards.get(t.linkedCardId);
      if (!card || !card.closingDay) continue;

      const [peY, peM, peD] = t.linkedInvoicePeriodEnd.split('-').map(Number);
      const peDate = new Date(peY, peM - 1, peD);
      const psDate = new Date(peDate);
      psDate.setMonth(psDate.getMonth() - 1);
      psDate.setDate((card.closingDay) + 1);
      const periodStart = `${psDate.getFullYear()}-${String(psDate.getMonth() + 1).padStart(2, '0')}-${String(psDate.getDate()).padStart(2, '0')}`;

      const txList = safeTxs.filter(
        (tx: any) => tx.cardId === t.linkedCardId && tx.date >= periodStart && tx.date <= t.linkedInvoicePeriodEnd && tx.type === 'expense'
      );
      map.set(key, {
        transacoes: txList.map((tx: any) => ({
          id: tx.id,
          description: tx.description || 'Sem descrição',
          amount: Number(tx.amount) || 0,
          date: tx.date,
          purchaseDate: tx.purchaseDate,
          installments: tx.installments,
          currentInstallment: tx.currentInstallment,
        })),
        total: txList.reduce((s: number, tx: any) => s + (Number(tx.amount) || 0), 0),
      });
    }

    return map;
  }, [state.activeInvoices, state.safeTransactions, state.userCards]);

  if (state.showSkeleton) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard-root">
      {state.user?.uid && (
        <div style={{ display: showCategoryRecovery ? 'block' : 'none' }}>
          <CategoryRecoveryDialog
            userId={state.user?.uid}
            categories={state.categories}
            transactions={state.safeTransactions}
            isReady={state.isReady}
            onDone={() => setShowCategoryRecovery(false)}
          />
        </div>
      )}

      <CategoryManager 
        isOpen={state.isCategoryModalOpen} 
        onClose={() => state.setIsCategoryModalOpen(false)} 
        categories={state.categories} 
        onSave={state.onSaveCategory} 
        onDelete={state.onDeleteCategory}
        commandMode={state.commandMode}
      />

      {/* SYNC BANNER */}
      {state.isStale && (
        <div className="flex items-center justify-between gap-4 px-6 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 rounded-3xl animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/60 rounded-xl text-amber-600 dark:text-amber-300">
              <RefreshCw size={16} className="animate-spin" />
            </div>
            <p className="text-[10px] font-black text-amber-800 dark:text-amber-300 uppercase tracking-widest">
              Modo Offline / Sincronizando: Alguns dados podem estar desatualizados
            </p>
          </div>
          <span className="text-[8px] font-bold text-amber-500 dark:text-amber-400 uppercase px-2 py-1 bg-white dark:bg-slate-800 rounded-lg border border-amber-100 dark:border-amber-800">
            Somente Leitura
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-14 md:pt-6 pb-32 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
        
        {/* Cabeçalho superior */}
        <DashboardHeader
          showBackToTools={state.showBackToTools}
          onNavigate={state.onNavigate}
          periodLabel={state.periodLabel}
          streak={state.streak}
          monthlyConsistency={state.monthlyConsistency}
          isMobile={state.isMobile}
          isPrivacyMode={state.isPrivacyMode}
          onTogglePrivacy={state.onTogglePrivacy}
          onOpenForm={state.onOpenForm}
          handleRecurringButtonClick={state.handleRecurringButtonClick}
          onFutureExpenseClick={state.handleFutureExpenseClick}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
        />

        {/* Cartões de saldo de topo */}
        {state.showCalibrationOffer && (
          <CalibrationInviteBanner
            title={state.calibrationInviteCopy.title}
            body={state.calibrationInviteCopy.body}
            onStart={state.handleStartCalibration}
            onDefer={state.handleDeferCalibration}
            onDismiss={state.handleDismissCalibrationInvite}
          />
        )}

        <BalanceCards
          isPrivacyMode={state.isPrivacyMode}
          saldoReal={state.realCashData?.saldoReal ?? null}
          receitasMes={state.realCashData?.receitasMes ?? null}
          despesasMes={state.realCashData?.despesasMes ?? null}
          reserveTarget={state.reserveTarget}
          colchaoTarget={state.colchaoTarget}
          voucherCards={voucherCards}
          transactions={state.safeTransactions}
          onOpenCardManager={(cardId) => {
            if (cardId) state.setFocusedCardId(cardId);
            state.setIsCardModalOpen(true);
          }}
        />

        <SaldoAjustavelCard
          isPrivacyMode={state.isPrivacyMode}
          saldoReal={state.realCashData?.saldoReal ?? null}
          faturasFechadas={state.realCashData?.faturasFechadas ?? []}
          faturasAbertas={state.realCashData?.faturasAbertas ?? []}
          gastosFuturosMes={state.realCashData?.gastosFuturosMes ?? []}
          contasFuturasMes={state.realCashData?.contasFuturasMes ?? []}
          userId={state.user?.uid || ''}
          queryClient={queryClient}
          reserveTarget={state.reserveTarget}
          colchaoTarget={state.colchaoTarget}
          voucherCards={voucherCards}
        />

        {/* Obrigações pendentes (Contas fixas e faturas ativas) */}
        <PendingObligations
          userId={state.user?.uid || ''}
          activeInvoices={state.activeInvoices}
          pendingBills={state.pendingBills}
          recurringBills={state.recurringBills}
          safeTransactions={state.safeTransactions}
          isPrivacyMode={state.isPrivacyMode}
          onOpenForm={state.onOpenForm}
          onNavigate={state.onNavigate}
        />

        {/* Orçamento do Mês — Card de progresso ou CTA de criação */}
        {!state.isFirstAccess && !state.budgetLoading && state.currentBudget && (
          <>
            <BudgetStatusCard
              budget={state.currentBudget}
              transactions={state.safeTransactions}
              onEdit={() => state.setIsBudgetSetupOpen(true)}
              onDelete={state.deleteBudget}
            />
            <BudgetExceededBanner
              progress={budgetProgress}
              onEdit={() => state.setIsBudgetSetupOpen(true)}
            />
          </>
        )}
        {!state.isFirstAccess && !state.budgetLoading && !state.currentBudget && (
          <div className="bg-surface-primary dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-panel p-5 shadow-panel">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-secondary/10 dark:bg-emerald-950/40 rounded-2xl text-brand-secondary dark:text-emerald-400 flex-shrink-0">
                <PiggyBank size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-text-primary dark:text-white uppercase tracking-ultra-wide mb-0.5">
                  Orçamento de {formatBudgetMonthName(state.activeMonthKey)}
                </p>
                <p className="text-xxs text-text-secondary dark:text-slate-400 font-medium leading-relaxed">
                  Defina limites de gastos por categoria e acompanhe seu progresso em tempo real.
                </p>
              </div>
              <button
                onClick={() => state.setIsBudgetSetupOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-3xl font-black text-xxs uppercase tracking-ultra-wide bg-brand-primary text-text-onBrand hover:bg-brand-primary/90 transition-all active:scale-95 shadow-brand-glow flex-shrink-0"
              >
                <Plus size={14} />
                Criar
              </button>
            </div>
          </div>
        )}

        {/* Painel educativo ou Estado de primeiro acesso */}
        {state.isFirstAccess ? (
          state.userMetaLoading && state.userMeta == null ? (
            <div className="py-16 px-6 bg-surface-primary dark:bg-slate-900 border border-dashed border-brand-primary/30 dark:border-emerald-500/40 rounded-4xl text-center animate-pulse">
              <div className="w-16 h-16 bg-surface-secondary dark:bg-slate-800 rounded-3xl border border-surface-elevated dark:border-slate-700 mx-auto mb-5" />
              <div className="h-5 w-56 bg-surface-secondary dark:bg-slate-800 rounded-full mx-auto mb-3" />
              <div className="h-4 w-72 max-w-full bg-surface-secondary dark:bg-slate-800 rounded-full mx-auto mb-2" />
              <div className="h-4 w-64 max-w-full bg-surface-secondary dark:bg-slate-800 rounded-full mx-auto mb-6" />
              <div className="h-12 w-40 bg-surface-secondary dark:bg-slate-800 rounded-3xl mx-auto" />
            </div>
          ) : (
            <div className="py-16 px-6 bg-surface-primary dark:bg-slate-900 border border-dashed border-brand-primary/30 dark:border-emerald-500/40 rounded-4xl text-center">
              <div className="w-16 h-16 bg-surface-secondary dark:bg-slate-800 rounded-3xl border border-surface-elevated dark:border-slate-700 flex items-center justify-center mx-auto mb-5">
                <Plus size={28} className="text-brand-primary dark:text-emerald-400" />
              </div>
              <p className="text-text-primary dark:text-white font-black text-lg mb-2">
                {state.userMeta?.isFirstSession ? 'Aqui você não olha só o saldo da conta.' : 'Seu painel está em branco'}
              </p>
              <p className="text-text-secondary dark:text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-6">
                {state.userMeta?.isFirstSession ? voice.firstLaunchHint : voice.emptyLaunchHint}
              </p>
              <button
                onClick={state.onOpenForm}
                className="inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-text-onBrand font-black text-xxs uppercase tracking-ultra-wide px-6 py-3 rounded-3xl transition-all active:scale-95 shadow-brand-glow"
              >
                <Plus size={14} /> {voice.registerCta}
              </button>
            </div>
          )
        ) : (
          /* Seção de Gráficos */
          <DashboardCharts
            categoryStats={state.categoryStats}
            stats={state.stats}
            commandMode={state.commandMode}
          />
        )}

        {/* Filtros e Lista Histórica de Lançamentos */}
        {!state.isFirstAccess && (
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted dark:text-slate-400 px-1">
                Filtros e controles
              </p>
              <FilterBar 
                selectedCategories={state.selectedCategories} 
                setSelectedCategories={state.setSelectedCategories}
                typeFilter={state.typeFilter}
                setTypeFilter={state.setTypeFilter}
                categories={state.categoryNames}
                viewMode={state.viewMode}
                setViewMode={state.setViewMode}
                changeDate={state.changeDate}
                periodLabel={state.periodLabel}
                onExportPDF={state.handleExportPDF}
                onExportCSV={state.handleExportCSV}
                startDate={state.startDate}
                endDate={state.endDate}
                setStartDate={state.setStartDate}
                setEndDate={state.setEndDate}
                onOpenCategoryManager={() => state.setIsCategoryModalOpen(true)}
                onDateSelect={state.handleDateSelect}
                sortMode={state.sortMode}
                setSortMode={state.setSortMode}
                searchQuery={state.searchQuery}
                setSearchQuery={state.setSearchQuery}
                commandMode={state.commandMode}
                historyLocked={state.historyLocked}
                currentMonthStartIso={state.currentMonthStartIso}
              />

              {/* Banner de filtro ativo por cartão */}
              {state.filterCardId && (
                <div className="flex items-center justify-between gap-3 px-5 py-3 bg-brand-secondary/10 dark:bg-slate-800/80 border border-brand-secondary/20 dark:border-slate-700 rounded-3xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-brand-secondary/20 dark:bg-slate-700 rounded-xl text-brand-secondary dark:text-emerald-400 shrink-0">
                      <CreditCard size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide">
                        Fatura
                      </p>
                      <p className="text-sm font-black text-text-primary dark:text-white truncate">
                        {state.filterCardName}
                      </p>
                      {state.filterPeriodStart && state.filterPeriodEnd && (
                        <p className="text-xxs font-bold text-text-muted dark:text-slate-400 mt-0.5">
                          {new Date(state.filterPeriodStart.replace(/-/g, '/')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {new Date(state.filterPeriodEnd.replace(/-/g, '/')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={state.handleClearCardFilter}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-700 hover:bg-white dark:hover:bg-slate-600 text-text-muted dark:text-slate-300 hover:text-status-danger font-black text-[10px] uppercase tracking-widest border border-surface-elevated dark:border-slate-600 transition-all active:scale-95 shrink-0"
                  >
                    <X size={14} />
                    Limpar filtro
                  </button>
                </div>
              )}

              {/* Toggle de exibição */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
                <button
                  type="button"
                  onClick={() => state.setShowTransactions(!state.showTransactions)}
                  className={`flex items-center justify-center gap-2 px-5 py-3 rounded-3xl text-xxs font-black uppercase tracking-ultra-wide border transition-all active:scale-95 w-full sm:w-auto ${
                    state.showTransactions
                      ? 'bg-surface-elevated dark:bg-slate-800 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700'
                      : 'bg-status-success/10 border-brand-primary/30 text-action-primaryDark dark:text-emerald-400 hover:bg-status-success/20'
                  }`}
                >
                  {state.showTransactions ? 'Recolher lançamentos' : 'Mostrar lançamentos'}
                  {state.showTransactions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                <div className="text-xxs font-bold text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide text-center sm:text-right">
                  {state.filtered.length} lançamento{state.filtered.length !== 1 ? 's' : ''}{state.showTransactions ? '' : ' oculto(s)'}
                </div>
              </div>

            {/* Lista ou Calendário de Lançamentos */}
            <section className="bg-surface-primary dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-panel shadow-panel p-4 md:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-black text-text-primary dark:text-white tracking-tight">Lançamentos</h2>
                  <span className="text-xxs font-bold text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide">
                    {state.filtered.length} no período
                  </span>
                </div>

                {/* Seletor Executivo de Modo de Visualização: [ 📋 Lista ] [ 📅 Calendário de Gastos ] */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border-2 border-slate-300 dark:border-slate-700 self-start sm:self-auto shadow-xs">
                  <button
                    type="button"
                    onClick={() => setViewType('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xxs font-black uppercase tracking-wider transition-all active:scale-95 ${
                      viewType === 'list'
                        ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    <List size={13} />
                    Lista
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewType('calendar')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xxs font-black uppercase tracking-wider transition-all active:scale-95 ${
                      viewType === 'calendar'
                        ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    <CalendarDays size={13} />
                    Calendário de Gastos
                  </button>
                </div>
              </div>

              {state.isHistoryLockedMonth ? (
                <HistoryEducationalCard
                  currentDate={state.currentDate}
                  periodLabel={state.periodLabel}
                  allTransactions={state.safeTransactions}
                  onUnlockHistory={() => state.setShowHistoryPaywall(true)}
                  onReturnToCurrentMonth={state.handleReturnToCurrentMonth}
                />
              ) : viewType === 'calendar' ? (
                <MonthlyExpenseCalendar
                  transactions={state.safeTransactions}
                  initialMonthKey={`${state.currentDate.getFullYear()}-${String(state.currentDate.getMonth() + 1).padStart(2, '0')}`}
                  onEditTransaction={state.onEditTransaction}
                  onOpenForm={state.onOpenForm}
                  isPrivacyMode={state.isPrivacyMode}
                  userCardNames={(state.userCards || []).map((c: any) => c.name)}
                />
              ) : (
                <TransactionList
                  transactions={state.filtered}
                  visibleCount={state.visibleCount}
                  setVisibleCount={state.setVisibleCount}
                  showTransactions={state.showTransactions}
                  setShowTransactions={state.setShowTransactions}
                  onDelete={state.onDeleteTransaction}
                  onEdit={state.onEditTransaction}
                  isPrivacyMode={state.isPrivacyMode}
                  isStale={state.isStale}
                  invoiceLookup={invoiceLookup}
                  periodLabel={state.periodLabel}
                />
              )}
            </section>
            </div>

            {/* Resumos e análises complementares */}
            <section className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted dark:text-slate-400 px-1">
                Resumos e análises
              </p>
              {/* Painel de Resumo por Categoria */}
              <CategorySummaryPanel 
                categorySummary={state.categorySummary} 
                categoryTransactionsMap={state.categoryTransactionsMap} 
                isPrivacyMode={state.isPrivacyMode}
                commandMode={state.commandMode}
              />

              {/* Painel de Análise de Médias */}
              <AveragesAnalysisPanel 
                userUid={state.user?.uid} 
                isReady={state.isReady} 
                safeTransactions={state.historyVisibleTransactions} 
                isPrivacyMode={state.isPrivacyMode} 
                hasHistoryAccess={state.hasHistoryAccess}
                onHistoryBlocked={() => state.setShowHistoryPaywall(true)}
              />
            </section>


          </div>
        )}
      </div>

      {/* Modais de Gerenciamento secundários */}
      <RecurringBillManager 
        isOpen={state.isRecurringBillModalOpen} 
        onClose={() => {
          state.setIsRecurringBillModalOpen(false);
        }} 
        userId={state.user?.uid || ''} 
        categories={state.categories}
      />

      <CardManager
        isOpen={state.isCardModalOpen}
        onClose={() => {
          state.setIsCardModalOpen(false);
          state.setFocusedCardId(null);
        }}
        userId={state.user?.uid || ''}
        transactions={state.safeTransactions}
        onEditTransaction={state.onEditTransaction}
        focusedCardId={state.focusedCardId}
        contextualReason={state.cardManagerReason ?? undefined}
      />

      {/* Modal Educativo Mobile */}
      <RecurringIntroModal
        isOpen={state.showIntro}
        dontShowFor15Days={state.dontShowFor15Days}
        setDontShowFor15Days={state.setDontShowFor15Days}
        onConfirm={state.handleConfirmIntro}
      />

      {state.showFutureExpenseForm && state.user?.uid && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => state.setShowFutureExpenseForm(false)}
          />
          <div className="relative z-10 w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
            <FutureExpenseForm
              userId={state.user.uid}
              categories={state.categories}
              queryClient={queryClient}
              onClose={() => state.setShowFutureExpenseForm(false)}
            />
          </div>
        </div>
      )}

      {state.showCalibrationModal && state.user?.uid && (
        <CommandCalibration
          userId={state.user.uid}
          initialAnswers={seedPersonaFromIntent(state.userMeta?.onboardingPersona || 'geral')}
          onComplete={state.handleCalibrationComplete}
          onClose={() => state.setShowCalibrationModal(false)}
        />
      )}

      <PaywallModal
        open={state.showHistoryPaywall}
        onClose={() => state.setShowHistoryPaywall(false)}
        feature="historico completo"
      />

      <BudgetSetupSheet
        isOpen={state.isBudgetSetupOpen}
        onClose={() => state.setIsBudgetSetupOpen(false)}
        userId={state.user?.uid || ''}
        categories={state.categories}
        transactions={state.safeTransactions}
        monthlyIncome={state.userMeta?.financialProfile?.monthlyIncome || state.stats.income || 0}
        currentBudget={state.currentBudget}
        targetMonthKey={state.activeMonthKey}
        previousBudget={state.previousBudget}
        fixedObligationsTotal={state.fixedObligationsTotal}
        creditInvoicesTotal={state.creditInvoicesTotal}
        onSaved={() => state.setIsBudgetSetupOpen(false)}
        onDelete={state.deleteBudget}
      />
    </div>
);
};

export default React.memo(Dashboard);
