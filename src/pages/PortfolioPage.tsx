import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { useTransactions } from '../hooks/useTransactions';
import { useSovereignSnapshot } from '../hooks/useSovereignSnapshot';
import { PortfolioDashboardView } from '../components/tools/portfolio';
import { isEmergencyReserveVulnerable } from '../core/portfolio/nexusPortfolioAdvisor';
import type { UserMeta } from '../types';

interface PortfolioPageProps {
  /** Sobrescreve o uid do Auth (usado em testes/preview) */
  userId?: string;
  onNavigate?: (route: string, state?: Record<string, unknown>) => void;
  userMeta?: UserMeta | null;
}

/**
 * Página Soberana da Carteira de Investimentos
 * Montada em /app/carteira com coexistência 100% isolada em relação a /app/investimentos
 */
export const PortfolioPage: React.FC<PortfolioPageProps> = ({
  userId: propUserId,
  onNavigate: propOnNavigate,
  userMeta: propUserMeta,
}) => {
  const navigate = useNavigate();
  const { user, userMeta: authUserMeta } = useAuth();
  const effectiveUserId = propUserId || user?.uid || '';
  const effectiveUserMeta = propUserMeta !== undefined ? propUserMeta : authUserMeta;

  const handleNavigateToReserve = () => {
    if (propOnNavigate) {
      propOnNavigate('/app/central', { focusSection: 'base-protecao' });
    } else {
      navigate('/app/central#base-protecao', { state: { focusSection: 'base-protecao' } });
    }
  };

  const handleNavigateToCentral = () => {
    if (propOnNavigate) {
      propOnNavigate('/app/central');
    } else {
      navigate('/app/central');
    }
  };

  // Sinergia Soberana: Saldo Livre Real e Blindagem de Liquidez (Etapa 6)
  const { transactions = [] } = useTransactions(effectiveUserId);
  const sovereign = useSovereignSnapshot(transactions, effectiveUserMeta);
  const availableFreeBalance = sovereign?.sovereignFreeBalance ?? null;
  const hasEmergencyReserveAlert = isEmergencyReserveVulnerable(sovereign);

  const {
    classes,
    assets,
    movements,
    positions,
    summary,
    cashBalances,
    isLoading,
    error,
    quoteMetaMap,
    refreshQuotes,
    isRefreshingQuotes,
    lastQuotesUpdate,
    institutionalMetrics,
    taxSummary,
    nexusInsights,
    saveAllClasses,
    saveAsset,
    saveAllAssets,
    deleteAsset,
    addMovement,
    voidMovement,
    importBatch,
    syncCashBalance,
  } = usePortfolio(effectiveUserId, { availableFreeBalance, hasEmergencyReserveAlert });

  return (
    <PortfolioDashboardView
      userId={effectiveUserId}
      summary={summary}
      positions={positions}
      quoteMetaMap={quoteMetaMap}
      isLoading={isLoading}
      errorMessage={error ? error.message : null}
      assets={assets}
      classes={classes}
      movements={movements}
      cashBalances={cashBalances}
      onRefreshQuotes={refreshQuotes}
      isRefreshingQuotes={isRefreshingQuotes}
      lastQuotesUpdate={lastQuotesUpdate}
      metrics={institutionalMetrics}
      taxSummary={taxSummary}
      nexusInsights={nexusInsights}
      availableFreeBalance={availableFreeBalance}
      onNavigateToReserve={handleNavigateToReserve}
      onNavigateToCentral={handleNavigateToCentral}
      onSaveAsset={saveAsset}
      onSaveAllAssets={saveAllAssets}
      onDeleteAsset={deleteAsset}
      onAddMovement={addMovement}
      onVoidMovement={voidMovement}
      onSaveAllClasses={saveAllClasses}
      onImportBatch={importBatch}
      onSyncCashBalance={syncCashBalance}
    />
  );
};

export default PortfolioPage;
