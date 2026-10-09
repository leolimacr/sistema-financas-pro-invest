import {
  DerivedAssetPosition,
  PortfolioAllocationSummary,
  PortfolioAsset,
  PortfolioAssetClass,
  PortfolioMovement,
  PortfolioCashBalance,
} from '../../../core/portfolio/portfolioTypes';

export type QuoteStatus = 'UP_TO_DATE' | 'STALE' | 'MANUAL' | 'UNAVAILABLE';

export interface PortfolioQuoteMeta {
  quoteStatus: QuoteStatus;
  lastUpdateDate?: string;
  sourceLabel?: string;
}

export interface PortfolioInstitutionalMetrics {
  monthlyOrganicGrowthBRL?: number | null;
  monthlyExternalInflowBRL?: number | null;
  modifiedDietzReturnPercent?: number | null;
  cdiBenchmarkPercent?: number | null;
}

export interface PortfolioDashboardViewProps {
  summary?: PortfolioAllocationSummary | null;
  positions?: DerivedAssetPosition[];
  quoteMetaMap?: Record<string, PortfolioQuoteMeta>;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onStartSetup?: () => void;

  // Cotações e Métricas Institucionais (Etapa 3)
  onRefreshQuotes?: () => Promise<void>;
  isRefreshingQuotes?: boolean;
  lastQuotesUpdate?: string | null;
  metrics?: PortfolioInstitutionalMetrics | null;

  // IRPF e Nexus Copilot (Etapa 4)
  taxSummary?: import('../../../core/portfolio/taxEngine').PortfolioTaxSummary;
  nexusInsights?: import('../../../core/portfolio/nexusPortfolioAdvisor').PortfolioAdvisorInsight[];

  // Sinergia Soberana: Saldo Livre Real e Navegação Copilot (Etapa 6)
  availableFreeBalance?: number | null;
  onNavigateToReserve?: () => void;
  onNavigateToCentral?: () => void;

  // Dados e Ações Interativas da V1
  userId?: string;
  assets?: PortfolioAsset[];
  classes?: PortfolioAssetClass[];
  movements?: PortfolioMovement[];
  cashBalances?: Record<string, PortfolioCashBalance>;
  onSaveAsset?: (asset: PortfolioAsset) => Promise<void>;
  onSaveAllAssets?: (assets: PortfolioAsset[]) => Promise<void>;
  onDeleteAsset?: (assetId: string) => Promise<void>;
  onAddMovement?: (movement: PortfolioMovement) => Promise<void>;
  onVoidMovement?: (movementId: string, reason?: string) => Promise<void>;
  onSaveAllClasses?: (classes: PortfolioAssetClass[]) => Promise<void>;
  onImportBatch?: (newAssets: PortfolioAsset[], newMovements: PortfolioMovement[]) => Promise<void>;
  onSyncCashBalance?: (cashAssetId: string) => Promise<void>;
}

