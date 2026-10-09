/**
 * Finanças Pro Invest - Nexus Investment Copilot
 * Consciência Estratégica da Carteira de Investimentos
 * Postura: Autoridade Silenciosa, Rigor Matemático e Clareza Radical
 */

import type { DerivedAssetPosition, PortfolioAllocationSummary } from './portfolioTypes';
import type { PortfolioTaxSummary } from './taxEngine';

export type NexusInsightSeverity = 'positive' | 'info' | 'warning' | 'action';

export interface PortfolioAdvisorInsight {
  id: string;
  severity: NexusInsightSeverity;
  title: string;
  message: string;
  category: 'CONCENTRATION' | 'REBALANCE' | 'OPPORTUNITY_CASH' | 'TAX' | 'DISCIPLINE' | 'LIQUIDITY_SHIELD' | 'CALIBRATION';
  actionLabel?: string;
  actionPayload?: Record<string, unknown>;
}

export interface AssetCalibrationIssue {
  assetId: string;
  ticker: string;
  name: string;
  category: string;
  missingQuantity: boolean;
  missingInstitution: boolean;
  missingTarget: boolean;
  missingFixedIncomeParams: boolean;
  reasons: string[];
}

/**
 * Audita se uma posição possui pendências cadastrais fundamentais
 * (como ausência de cotas em renda variável, corretora ou meta de alocação)
 */
export function auditAssetCalibration(pos: DerivedAssetPosition): AssetCalibrationIssue | null {
  const reasons: string[] = [];
  const cat = (pos.category || '').toLowerCase();
  const isCash = pos.market === 'CASH' || cat.includes('caixa');
  if (isCash) return null;

  const isVariableIncome =
    pos.market === 'B3' ||
    pos.market === 'US' ||
    pos.market === 'CRYPTO' ||
    cat.includes('ação') ||
    cat.includes('ações') ||
    cat.includes('fii') ||
    cat.includes('imobil') ||
    cat.includes('etf') ||
    cat.includes('bdr') ||
    cat.includes('cripto');

  const isFixedIncome =
    pos.market === 'RF' ||
    cat.includes('renda fixa') ||
    cat.includes('tesouro') ||
    cat.includes('cdb') ||
    cat.includes('lci') ||
    cat.includes('lca');

  let missingQuantity = false;
  let missingInstitution = false;
  let missingTarget = false;
  let missingFixedIncomeParams = false;

  // 1. Quantidade de cotas necessária para renda variável
  if (isVariableIncome && (pos.isBalanceOnly || !pos.hasKnownQuantity || pos.quantity === null || pos.quantity <= 0)) {
    missingQuantity = true;
    reasons.push('Quantidade de cotas pendente');
  }

  // 2. Instituição / Corretora custodiante
  if (!pos.institution || pos.institution.trim() === '') {
    missingInstitution = true;
    reasons.push('Instituição custodiante não informada');
  }

  // 3. Meta percentual de alocação
  if (pos.targetPercentage === undefined || pos.targetPercentage === null || pos.targetPercentage <= 0) {
    missingTarget = true;
    reasons.push('Meta de alocação não definida');
  }

  // 4. Parâmetros de renda fixa (se for RF e não tiver detalhes de curva ou custo)
  if (isFixedIncome && !pos.fixedIncomeDetails && !pos.hasKnownCost) {
    missingFixedIncomeParams = true;
    reasons.push('Parâmetros de indexação e vencimento não configurados');
  }

  if (reasons.length > 0) {
    return {
      assetId: pos.assetId,
      ticker: pos.ticker,
      name: pos.name,
      category: pos.category,
      missingQuantity,
      missingInstitution,
      missingTarget,
      missingFixedIncomeParams,
      reasons,
    };
  }

  return null;
}

export interface SovereignProtectionSnapshotLike {
  totalProtectionTarget?: number;
  protectionBuffer?: number;
  reserveTarget?: number;
  reserveCoverage?: number;
  reserveShortfall?: number;
}

/**
 * Avalia se a Reserva de Emergência / Base de Proteção do investidor está vulnerável
 * para fins de blindagem de alocação no Nexus Copilot.
 * 
 * Regra Soberana:
 * - Se não houver snapshot ou metas configuradas (> 0), retorna false (autoridade silenciosa).
 * - Se houver meta configurada, calcula a razão real entre o montante coberto (R$) e a meta (R$).
 * - Se a cobertura for inferior a 50% (0.5), considera vulnerável.
 */
export function isEmergencyReserveVulnerable(
  snapshot?: SovereignProtectionSnapshotLike | null,
  vulnerabilityThreshold = 0.5
): boolean {
  if (!snapshot) return false;

  const target = (snapshot.totalProtectionTarget && snapshot.totalProtectionTarget > 0)
    ? snapshot.totalProtectionTarget
    : (snapshot.reserveTarget || 0);

  if (target <= 0) return false;

  const covered = (snapshot.totalProtectionTarget && snapshot.totalProtectionTarget > 0)
    ? (snapshot.protectionBuffer ?? 0)
    : (snapshot.reserveCoverage ?? 0);

  const coverageRatio = covered / target;
  return coverageRatio < vulnerabilityThreshold;
}

export interface NexusPortfolioAdvisorParams {
  summary: PortfolioAllocationSummary | null;
  positions: DerivedAssetPosition[];
  taxSummary?: PortfolioTaxSummary | null;
  availableFreeBalance?: number | null;
  hasEmergencyReserveAlert?: boolean;
  sovereignSnapshot?: SovereignProtectionSnapshotLike | null;
}

/**
 * Avalia o estado geral da carteira e gera orientações estratégicas de alto nível
 */
export function evaluatePortfolioInsights(
  params: NexusPortfolioAdvisorParams
): PortfolioAdvisorInsight[] {
  const { summary, positions, taxSummary } = params;
  const insights: PortfolioAdvisorInsight[] = [];

  if (!summary || positions.length === 0) {
    return insights;
  }

  const consolidatedTotal = summary.consolidatedTotalBRL;
  const portfolioCash = summary.totalPortfolioCashBRL;

  const isReserveVulnerable = params.hasEmergencyReserveAlert !== undefined
    ? params.hasEmergencyReserveAlert
    : isEmergencyReserveVulnerable(params.sovereignSnapshot);

  // 0. Sinergia Soberana: Blindagem de Liquidez (Saldo Livre Real e Reserva)
  if (params.availableFreeBalance !== null && params.availableFreeBalance !== undefined && params.availableFreeBalance < 0) {
    const def = Math.abs(params.availableFreeBalance);
    insights.push({
      id: 'insight-liquidity-shield-negative',
      severity: 'warning',
      category: 'LIQUIDITY_SHIELD',
      title: 'Blindagem de Liquidez: Saldo Livre Deficitário',
      message: `Seu Saldo Livre Real do mês está deficitário em R$ ${def.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Aportes em renda variável e novos investimentos devem ser suspensos até que suas contas e obrigações fixas estejam cobertas.`,
      actionLabel: 'Ver Central',
    });
  } else if (isReserveVulnerable) {
    insights.push({
      id: 'insight-liquidity-shield-reserve',
      severity: 'warning',
      category: 'LIQUIDITY_SHIELD',
      title: 'Reserva de Emergência Vulnerável',
      message: 'Identificamos que sua proteção de emergência ainda está abaixo da margem recomendada. Recomendamos focar recursos em ativos de alta liquidez e Renda Fixa pós-fixada antes de expandir posições de risco.',
      actionLabel: 'Ver Reserva',
    });
  } else if (
    params.availableFreeBalance !== null &&
    params.availableFreeBalance !== undefined &&
    params.availableFreeBalance >= 100
  ) {
    const hasUnderweight = summary.categories.some((c) => c.differenceBRL < -50);
    if (hasUnderweight) {
      insights.push({
        id: 'insight-free-balance-available',
        severity: 'action',
        category: 'REBALANCE',
        title: 'Saldo Livre Real Disponível para Aporte',
        message: `Você possui R$ ${params.availableFreeBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de dinheiro verdadeiramente livre apurado na Central. Você pode utilizá-lo para rebalancear ativos que estão abaixo da meta.`,
        actionLabel: 'Simular Aporte',
      });
    }
  }

  // 0.1 Diagnóstico de Calibração Cadastral de Ativos (Pós-Importação / Dados Pendentes)
  const calibrationIssues: AssetCalibrationIssue[] = [];
  for (const pos of positions) {
    const issue = auditAssetCalibration(pos);
    if (issue) calibrationIssues.push(issue);
  }

  if (calibrationIssues.length > 0) {
    const count = calibrationIssues.length;
    const withMissingQty = calibrationIssues.filter((i) => i.missingQuantity).length;
    const sampleTickers = calibrationIssues.slice(0, 3).map((i) => i.ticker).join(', ');
    const moreCount = count > 3 ? ` e mais ${count - 3}` : '';

    let detailsMsg = `${count} ${count === 1 ? 'ativo possui' : 'ativos possuem'} pendências cadastrais (${sampleTickers}${moreCount}).`;
    if (withMissingQty > 0) {
      detailsMsg += ` ${withMissingQty} ${withMissingQty === 1 ? 'está' : 'estão'} sem quantidade de cotas definida.`;
    }

    insights.push({
      id: 'insight-calibration-needed',
      severity: 'action',
      category: 'CALIBRATION',
      title: `${count} ${count === 1 ? 'Ativo Requer Calibração' : 'Ativos Requerem Calibração'}`,
      message: `${detailsMsg} Complete os dados para habilitar apuração real de rentabilidade, cotações automáticas e rebalanceamento inteligente.`,
      actionLabel: 'Calibrar Ativos',
      actionPayload: {
        issues: calibrationIssues,
        uncalibratedAssetIds: calibrationIssues.map((i) => i.assetId),
      },
    });
  }

  // 1. Alerta de Concentração Excessiva em Ativo Individual (> 25% do patrimônio)
  if (consolidatedTotal > 0) {
    for (const pos of positions) {
      if (pos.isBalanceOnly || pos.market === 'CASH') continue;
      const val = pos.currentValueBRL ?? pos.totalInvestedBRL ?? 0;
      const pct = (val / consolidatedTotal) * 100;

      if (pct > 25.0) {
        insights.push({
          id: `insight-concentration-${pos.assetId}`,
          severity: 'warning',
          category: 'CONCENTRATION',
          title: `Concentração Elevada em ${pos.ticker}`,
          message: `${pos.ticker} representa ${pct.toFixed(1)}% do seu patrimônio consolidado. Uma exposição individual acima de 25% amplia a vulnerabilidade a choques idiossincráticos. Considere priorizar outras classes nos próximos aportes.`,
          actionLabel: 'Ver Posição',
          actionPayload: { assetId: pos.assetId },
        });
      }
    }
  }

  // 2. Alerta de Desvio de Alocação por Classe de Ativo (|diff| > 15%)
  for (const cat of summary.categories) {
    const diffPct = Math.abs(cat.currentPercentage - cat.targetPercentage);
    if (diffPct > 15.0 && cat.targetPercentage > 0) {
      const isUnder = cat.differenceBRL < 0;
      insights.push({
        id: `insight-imbalance-${cat.category}`,
        severity: 'info',
        category: 'REBALANCE',
        title: `Desvio de Meta: ${cat.category}`,
        message: `A classe ${cat.category} está em ${cat.currentPercentage.toFixed(1)}% da carteira (meta: ${cat.targetPercentage.toFixed(1)}%). O distanciamento é de ${diffPct.toFixed(1)} pontos percentuais.`,
        actionLabel: isUnder ? 'Simular Aporte' : undefined,
      });
    }
  }

  // 3. Caixa de Oportunidade Disponível para Rebalanceamento
  if (portfolioCash > 0) {
    const underweightCategories = summary.categories.filter((c) => c.differenceBRL < -100);
    if (underweightCategories.length > 0) {
      insights.push({
        id: 'insight-opportunity-cash',
        severity: 'action',
        category: 'OPPORTUNITY_CASH',
        title: 'Caixa Estratégico Disponível',
        message: `Você possui R$ ${portfolioCash.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} alocados em Caixa de Oportunidade. Existem classes abaixo da meta que podem absorver esse capital sem necessidade de aportes externos.`,
        actionLabel: 'Simular Rebalanceamento',
      });
    }
  }

  // 4. Limite de Isenção de R$ 20.000 em Vendas de Ações no Mês Vigente
  if (taxSummary && taxSummary.reports.length > 0) {
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const currentReport = taxSummary.reports.find((r) => r.yearMonth === currentMonthKey);

    if (currentReport && currentReport.stocksSalesTotalBRL > 0) {
      const sales = currentReport.stocksSalesTotalBRL;
      if (sales >= 15000.0 && sales <= 20000.0) {
        const remaining = 20000.0 - sales;
        insights.push({
          id: 'insight-tax-threshold',
          severity: 'warning',
          category: 'TAX',
          title: 'Atenção ao Limite de Isenção (R$ 20.000)',
          message: `Suas vendas de ações neste mês somam R$ ${sales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Você está a R$ ${remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de atingir o teto de isenção de IRPF.`,
          actionLabel: 'Ver Apuração Fiscal',
        });
      } else if (sales > 20000.0 && currentReport.stocksTaxDueBRL > 0) {
        insights.push({
          id: 'insight-tax-darf-due',
          severity: 'info',
          category: 'TAX',
          title: `DARF 6015 Apurada (${currentReport.monthName})`,
          message: `Vendas acima de R$ 20.000 geraram imposto devido de R$ ${currentReport.totalTaxDueBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com vencimento em ${currentReport.darfDueDate}.`,
          actionLabel: 'Ver DARF',
        });
      }
    }
  }

  // 5. Se tudo estiver rigorosamente calibrado e equilibrado
  if (insights.length === 0 && summary.isTargetSumValid) {
    insights.push({
      id: 'insight-portfolio-calibrated',
      severity: 'positive',
      category: 'DISCIPLINE',
      title: 'Carteira Soberana Calibrada',
      message: 'Sua estrutura de investimentos está alinhada às metas percentuais estipuladas. Nenhuma intervenção corretiva é necessária neste momento.',
    });
  }

  return insights;
}
