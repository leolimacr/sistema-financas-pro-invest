/**
 * Tipos e Contratos Fundamentais do Módulo de Gestão de Carteira e Alocação
 * Finanças Pro Invest
 */

import type { FixedIncomeCurveResult, FixedIncomeIndexation } from './fixedIncomeMath';

export type CurrencyCode = 'BRL' | 'USD' | 'EUR';

export type QuoteMarket = 'B3' | 'US' | 'CRYPTO' | 'MANUAL' | 'CASH' | 'RF';

export type MovementType =
  | 'INITIAL_POSITION'    // Posição inicial cadastrada sem histórico retroativo
  | 'EXTERNAL_DEPOSIT'    // Aporte externo que entra no Caixa da Carteira (F_m > 0)
  | 'EXTERNAL_WITHDRAWAL' // Retirada externa do Caixa da Carteira para uso pessoal (F_m < 0)
  | 'BUY'                 // Compra de ativo ou aporte em título
  | 'SELL'                // Venda parcial ou total / resgate
  | 'DIVIDEND'            // Dividendo, JCP ou Rendimento recebido
  | 'INTEREST'            // Juros de Renda Fixa ou aplicação
  | 'FEE_OR_TAX'          // Taxa de corretagem, custódia ou imposto avulso
  | 'SPLIT_OR_BONUS'      // Desdobramento, grupamento ou bonificação de cotas
  | 'ADJUSTMENT';         // Ajuste manual de quantidade ou saldo (auditado)

export type FundingSource =
  | 'EXTERNAL_NEW_MONEY'  // Recurso novo vindo de fora da carteira (conta pessoal/salário) -> impacta F_m (+V)
  | 'PORTFOLIO_CASH';     // Recurso pago usando ativo de Caixa Interno da carteira -> impacto em F_m = 0

export type SettlementTarget =
  | 'EXTERNAL_OUTSIDE'    // Recurso sacado para fora da carteira -> impacta F_m (-V)
  | 'PORTFOLIO_CASH';     // Recurso creditado no Caixa Interno da carteira -> impacto em F_m = 0

export type FxRateSource =
  | 'COMMERCIAL_AWESOMEAPI'     // Cotação comercial de mercado interbancário (AwesomeAPI)
  | 'OFFICIAL_PTAX_BCB'         // Taxa oficial PTAX divulgada pelo Banco Central do Brasil
  | 'USER_EFFECTIVE_RATE'       // Taxa efetiva real com spread/IOF informada pelo usuário (VET)
  | 'FIXED_ONE';                // Para moedas idênticas (BRL -> BRL = 1.0)

export interface MovementRevision {
  editedAt: string;
  previousSnapshot: Record<string, unknown>;
  reason: string;
}

export interface PortfolioMovement {
  id: string;                      // Identificador único (idempotencyKey)
  userId: string;
  assetId: string;                 // Ativo alvo do lançamento
  cashAssetId?: string;            // Obrigatório quando fundingSource ou settlementTarget for 'PORTFOLIO_CASH'
  type: MovementType;
  date: string;                    // Formato YYYY-MM-DD
  quantity: number | null;         // Quantidade de cotas/unidades (null quando for posição puramente em saldo)
  hasKnownQuantity?: boolean;      // False se for posição inicial baseada estritamente em saldo monetário
  unitPrice: number;               // Preço unitário na moeda do ativo (>= 0)
  fees: number;                    // Taxas e emolumentos na moeda do ativo (>= 0)
  grossAmount: number;             // Para cotas: quantity * unitPrice | Para saldo: valor bruto
  netAmount: number;               // Compras: gross + fees | Vendas/Proventos: gross - fees
  currency: CurrencyCode;
  fxRateToBRL: number;             // Taxa de conversão para BRL (se BRL = 1.0; se USD/EUR > 0)
  fxSource: FxRateSource;
  netAmountBRL: number;            // netAmount * fxRateToBRL
  fundingSource?: FundingSource;   // Obrigatório em BUY e FEE_OR_TAX
  settlementTarget?: SettlementTarget; // Obrigatório em SELL e DIVIDEND
  hasKnownCost?: boolean;          // Usado em INITIAL_POSITION (false se o usuário desconhece o PM)
  counterpartMovementId?: string;  // ID da perna vinculada de contrapartida em caixa
  status: 'ACTIVE' | 'VOIDED';     // VOIDED indica lançamento estornado preservando histórico
  notes?: string;
  isNetBalance?: boolean;          // True se a posição/saldo foi informada como valor líquido pós-IR
  revisions?: MovementRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface DerivedAssetPosition {
  assetId: string;
  ticker: string;
  name: string;
  category: string;
  currency: CurrencyCode;
  market: QuoteMarket;
  targetPercentage: number;        // Meta definida pelo usuário (ex: 5.0 = 5%)
  
  // Posição apurada do livro
  quantity: number | null;         // Null se for ativo baseado estritamente em saldo monetário
  hasKnownQuantity: boolean;       // False se não possui quantidade de cotas conhecida
  isBalanceOnly: boolean;          // True quando o ativo representa saldo financeiro puro (sem cotas)
  hasKnownCost: boolean;           // False se veio de INITIAL_POSITION sem custo informado
  avgCostOriginal: number | null;  // Preço Médio na moeda original (null se hasKnownCost = false ou isBalanceOnly = true)
  avgCostBRL: number | null;       // Preço Médio em BRL (null se hasKnownCost = false ou isBalanceOnly = true)
  totalInvestedBRL: number | null; // Custo de aquisição total em BRL (null se hasKnownCost = false)
  
  // Realização e proventos acumulados
  realizedPnLOriginal: number;     // Lucro/prejuízo já realizado em vendas parciais/totais
  realizedPnLBRL: number;
  totalDividendsOriginal: number;
  totalDividendsBRL: number;

  // Cotação e Mercado Atual
  currentPriceOriginal: number | null;    // Cotação atual na moeda do ativo (null se sem cotação)
  currentFxRateToBRL: number;             // Cotação atual do câmbio para BRL (1.0 para BRL)
  currentPriceBRL: number | null;         // currentPriceOriginal * currentFxRateToBRL
  currentValueOriginal: number | null;    // Valor atual na moeda original (null se sem cotação e não for saldo)
  currentValueBRL: number | null;         // currentValueOriginal * currentFxRateToBRL
  hasMarketQuote?: boolean;
  
  // Ganhos não realizados (apenas se hasKnownCost = true e hasKnownQuantity = true)
  unrealizedPnLBRL: number | null;
  unrealizedPnLPercent: number | null;
  assetReturnPercentOriginal: number | null;
  fxReturnPercent: number | null;  // Efeito da oscilação cambial sobre o custo
  
  // Integridade e concorrência
  movementCount: number;
  ledgerChecksum: string;
  lastMovementDate: string | null;
  hasIndeterminateIntradayOrder?: boolean;
  calculationWarnings?: string[];
  institution?: string;
  fixedIncomeDetails?: FixedIncomeCurveResult;
  fixedIncomeIsNetBalance?: boolean;
  netCurrentValueBRL?: number | null;
  fixedIncomeCertificates?: FixedIncomeCertificate[];
}

export interface FixedIncomeCertificate {
  id: string;
  name: string;
  ticker?: string;
  institution?: string;
  balance: number;
  isNetBalance?: boolean;
  indexation?: FixedIncomeIndexation;
  ratePercent?: number;
  startDate?: string;
  maturityDate?: string;
  quantity?: number;
  unitPrice?: number;
  createdAt?: string;
}

export interface PortfolioCategoryTarget {
  category: string;
  targetPercentage: number;
  currentValueBRL: number;
  currentPercentage: number;
  differenceBRL: number;           // currentValueBRL - targetValueBRL
  allocationRatio: number;         // currentPercentage / targetPercentage (ex: 1.05 = 105% da meta)
}

export interface PortfolioAllocationSummary {
  totalInvestedAssetsBRL: number;  // Soma dos ativos de risco/investimento
  totalPortfolioCashBRL: number;    // Soma dos ativos classificados como Caixa da Carteira
  consolidatedTotalBRL: number;    // Total geral
  denominatorUsedBRL: number;      // Base usada no cálculo das metas conforme preferência
  includeCashInTargets: boolean;   // Se o caixa entra ou não no denominador das metas
  sumTargetsPercentage: number;    // Soma das metas (ex: 100.0)
  isTargetSumValid: boolean;       // True se Math.abs(sum - 100) <= 0.01
  targetDiscrepancyPercent: number; // Diferença em relação a 100%
  categories: PortfolioCategoryTarget[];
  assets: DerivedAssetPosition[];
}

export interface PortfolioAssetClass {
  id: string;
  name: string;
  targetPercentage: number;
  color?: string;
  order?: number;
}

export interface PortfolioAsset {
  id: string;
  userId: string;
  ticker: string;
  name: string;
  category: string;
  currency: CurrencyCode;
  market: QuoteMarket;
  targetPercentage?: number;
  isBalanceOnly?: boolean;
  isOpportunityCash?: boolean;
  institution?: string;
  manualPrice?: number | null;
  manualPriceUpdatedAt?: string;
  notes?: string;
  // Configurações de Renda Fixa (Marcação na Curva Automática Anbima)
  fixedIncomeIndexation?: FixedIncomeIndexation;
  fixedIncomeRatePercent?: number;
  fixedIncomeStartDate?: string;
  fixedIncomeMaturityDate?: string;
  fixedIncomeBenchmarkCdi?: number;
  fixedIncomeIsNetBalance?: boolean;
  fixedIncomeCertificates?: FixedIncomeCertificate[];
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioCashBalance {
  userId: string;
  cashAssetId: string;
  availableBalanceBRL: number;
  version: number;
  lastMovementId?: string;
  updatedAt: string;
}

export interface CashReconciliationResult {
  cashAssetId: string;
  isDivergent: boolean;
  persistedBalance: number | null;
  ledgerBalance: number;
  difference: number;
  activeMovementCount: number;
  voidedMovementCount: number;
}

export interface PortfolioUserData {
  classes: PortfolioAssetClass[];
  assets: PortfolioAsset[];
  movements: PortfolioMovement[];
  cashBalances?: Record<string, PortfolioCashBalance>;
}

