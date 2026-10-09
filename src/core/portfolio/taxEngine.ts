/**
 * Finanças Pro Invest - Motor Fiscal & Apuração de Imposto de Renda (IRPF)
 * Legislação Tributária Brasileira (IN RFB):
 * - Isenção de R$ 20.000 em ações comuns (Swing Trade)
 * - Alíquota de 15% para Ações, ETFs e BDRs acima de R$ 20k
 * - Alíquota de 20% para Fundos Imobiliários (FIIs) sem faixa de isenção
 * - Compensação segregada e contínua de prejuízos passados
 * - Cálculo de DARF código 6015
 */

import type { PortfolioMovement, PortfolioAsset } from './portfolioTypes';
import { sortPortfolioMovements } from './portfolioMath';

export interface AssetSaleDetail {
  movementId: string;
  assetId: string;
  ticker: string;
  name: string;
  category: string;
  date: string;
  quantity: number;
  saleUnitPrice: number;
  avgCostUnitPrice: number;
  saleGrossAmountBRL: number;
  saleNetAmountBRL: number;
  costBRL: number;
  grossProfitLossBRL: number;
  feesBRL: number;
  netProfitLossBRL: number;
  isProfit: boolean;
}

export interface MonthlyTaxReport {
  yearMonth: string; // YYYY-MM
  monthName: string;
  
  // Ações, ETFs e BDRs (Swing Trade)
  stocksSalesTotalBRL: number;
  isStocksExempt: boolean; // True se vendas totais no mês <= R$ 20.000
  stocksRawProfitLossBRL: number;
  stocksExemptProfitBRL: number;
  stocksTaxableProfitBRL: number;
  stocksLossCarriedForwardBRL: number; // Prejuízo acumulado de meses anteriores usado neste mês
  stocksRemainingLossBRL: number;       // Prejuízo acumulado que sobrou para meses futuros
  stocksTaxDueBRL: number;             // 15%

  // Fundos Imobiliários (FIIs)
  fiisSalesTotalBRL: number;
  fiisRawProfitLossBRL: number;
  fiisTaxableProfitBRL: number;
  fiisLossCarriedForwardBRL: number;
  fiisRemainingLossBRL: number;
  fiisTaxDueBRL: number;               // 20%

  // DARF Consolidada
  totalTaxDueBRL: number;
  darfCode: string;                   // '6015'
  darfDueDate: string;                // YYYY-MM-DD (último dia do mês subsequente)
  isDarfPayable: boolean;             // True se totalTaxDueBRL >= 10.00
  sales: AssetSaleDetail[];
}

export interface PortfolioTaxSummary {
  reports: MonthlyTaxReport[];
  accumulatedStocksLossBRL: number;
  accumulatedFiisLossBRL: number;
  totalTaxPaidOrDueBRL: number;
  totalExemptProfitBRL: number;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Calcula a data de vencimento da DARF: último dia do mês subsequente à competência
 */
export function calculateDarfDueDate(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Mês subsequente: month (que no Date JS é o índice do mês seguinte, pois é 0-indexed)
  // Ano e mês do próximo mês:
  const nextMonthDate = new Date(year, month + 1, 0); // dia 0 do mês month+1 dá o último dia do mês subsequente
  const yyyy = nextMonthDate.getFullYear();
  const mm = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
  const dd = String(nextMonthDate.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Motor Principal: Processa o histórico cronológico de compras e vendas e apura o IRPF
 */
export function computePortfolioTaxes(
  assets: PortfolioAsset[],
  movements: PortfolioMovement[]
): PortfolioTaxSummary {
  const assetMap = new Map<string, PortfolioAsset>();
  assets.forEach((a) => assetMap.set(a.id, a));

  // Ordena movimentações ativas por data crescente
  const activeMovements = sortPortfolioMovements(
    movements.filter((m) => m.status === 'ACTIVE')
  );

  // Estados acumuladores por ativo para apuração de Preço Médio contábil
  const runningAssetPositions: Record<
    string,
    { quantity: number; totalCostBRL: number; avgCostBRL: number }
  > = {};

  // Detalhes de todas as vendas
  const allSales: AssetSaleDetail[] = [];

  for (const mov of activeMovements) {
    const asset = assetMap.get(mov.assetId);
    if (!asset) continue;

    if (!runningAssetPositions[mov.assetId]) {
      runningAssetPositions[mov.assetId] = { quantity: 0, totalCostBRL: 0, avgCostBRL: 0 };
    }
    const state = runningAssetPositions[mov.assetId];

    if (mov.type === 'INITIAL_POSITION' || mov.type === 'BUY') {
      const q = mov.quantity ?? 0;
      const netBRL = mov.netAmountBRL;
      if (q > 0) {
        state.quantity += q;
        state.totalCostBRL += netBRL;
        state.avgCostBRL = state.quantity > 0 ? state.totalCostBRL / state.quantity : 0;
      }
    } else if (mov.type === 'SELL') {
      const q = mov.quantity ?? 0;
      if (q > 0) {
        const avgCost = state.avgCostBRL;
        const costBRL = Number((q * avgCost).toFixed(2));
        const saleGrossAmountBRL = mov.grossAmount * (mov.fxRateToBRL || 1.0);
        const feesBRL = mov.fees * (mov.fxRateToBRL || 1.0);
        const saleNetAmountBRL = mov.netAmountBRL;

        // Lucro líquido = Valor Líquido Recebido - Custo de Aquisição
        const netProfitLossBRL = Number((saleNetAmountBRL - costBRL).toFixed(2));

        allSales.push({
          movementId: mov.id,
          assetId: mov.assetId,
          ticker: asset.ticker,
          name: asset.name,
          category: asset.category,
          date: mov.date,
          quantity: q,
          saleUnitPrice: mov.unitPrice,
          avgCostUnitPrice: Number(avgCost.toFixed(4)),
          saleGrossAmountBRL: Number(saleGrossAmountBRL.toFixed(2)),
          saleNetAmountBRL: Number(saleNetAmountBRL.toFixed(2)),
          costBRL,
          grossProfitLossBRL: Number((saleGrossAmountBRL - costBRL).toFixed(2)),
          feesBRL: Number(feesBRL.toFixed(2)),
          netProfitLossBRL,
          isProfit: netProfitLossBRL > 0,
        });

        // Abate cotas vendidas do controle de posição
        state.quantity = Math.max(0, state.quantity - q);
        state.totalCostBRL = Math.max(0, state.quantity * avgCost);
      }
    }
  }

  // Agrupa vendas por competência YYYY-MM
  const salesByMonth = new Map<string, AssetSaleDetail[]>();
  for (const sale of allSales) {
    const ym = sale.date.slice(0, 7);
    const list = salesByMonth.get(ym) || [];
    list.push(sale);
    salesByMonth.set(ym, list);
  }

  // Ordena competências cronologicamente
  const sortedMonths = Array.from(salesByMonth.keys()).sort();

  let accumulatedStocksLoss = 0;
  let accumulatedFiisLoss = 0;
  let totalTaxPaidOrDue = 0;
  let totalExemptProfit = 0;
  const reports: MonthlyTaxReport[] = [];

  for (const ym of sortedMonths) {
    const salesInMonth = salesByMonth.get(ym) || [];
    const [yStr, mStr] = ym.split('-');
    const monthIndex = parseInt(mStr, 10) - 1;
    const monthName = `${MONTH_NAMES[monthIndex]} de ${yStr}`;

    let stocksSalesTotal = 0;
    let stocksRawProfit = 0;
    let fiisSalesTotal = 0;
    let fiisRawProfit = 0;

    for (const sale of salesInMonth) {
      const isFii =
        sale.category.toLowerCase().includes('imobili') ||
        sale.category.toLowerCase().includes('fii') ||
        sale.ticker.endsWith('11') && !sale.ticker.startsWith('BOVA');

      if (isFii) {
        fiisSalesTotal += sale.saleNetAmountBRL;
        fiisRawProfit += sale.netProfitLossBRL;
      } else {
        stocksSalesTotal += sale.saleNetAmountBRL;
        stocksRawProfit += sale.netProfitLossBRL;
      }
    }

    stocksSalesTotal = Number(stocksSalesTotal.toFixed(2));
    stocksRawProfit = Number(stocksRawProfit.toFixed(2));
    fiisSalesTotal = Number(fiisSalesTotal.toFixed(2));
    fiisRawProfit = Number(fiisRawProfit.toFixed(2));

    // Regra dos R$ 20.000 em ações normais (Swing Trade)
    const isStocksExempt = stocksSalesTotal <= 20000.0;
    let stocksExemptProfit = 0;
    let stocksTaxableProfit = 0;
    let stocksLossCarriedForward = 0;
    let stocksTaxDue = 0;

    if (stocksRawProfit > 0) {
      if (isStocksExempt) {
        stocksExemptProfit = stocksRawProfit;
        totalExemptProfit += stocksExemptProfit;
      } else {
        // Tributável: compensa prejuízos acumulados anteriores
        if (accumulatedStocksLoss > 0) {
          const usedLoss = Math.min(accumulatedStocksLoss, stocksRawProfit);
          stocksLossCarriedForward = Number(usedLoss.toFixed(2));
          accumulatedStocksLoss = Number((accumulatedStocksLoss - usedLoss).toFixed(2));
          stocksTaxableProfit = Number((stocksRawProfit - usedLoss).toFixed(2));
        } else {
          stocksTaxableProfit = stocksRawProfit;
        }
        stocksTaxDue = Number(((stocksTaxableProfit * 15) / 100).toFixed(2));
      }
    } else if (stocksRawProfit < 0) {
      // Prejuízo apurado no mês é acumulado para o futuro (mesmo em mês com vendas <= 20k)
      accumulatedStocksLoss = Number((accumulatedStocksLoss + Math.abs(stocksRawProfit)).toFixed(2));
    }

    // FIIs (Alíquota de 20%, sem isenção de R$ 20k)
    let fiisTaxableProfit = 0;
    let fiisLossCarriedForward = 0;
    let fiisTaxDue = 0;

    if (fiisRawProfit > 0) {
      if (accumulatedFiisLoss > 0) {
        const usedLoss = Math.min(accumulatedFiisLoss, fiisRawProfit);
        fiisLossCarriedForward = Number(usedLoss.toFixed(2));
        accumulatedFiisLoss = Number((accumulatedFiisLoss - usedLoss).toFixed(2));
        fiisTaxableProfit = Number((fiisRawProfit - usedLoss).toFixed(2));
      } else {
        fiisTaxableProfit = fiisRawProfit;
      }
      fiisTaxDue = Number(((fiisTaxableProfit * 20) / 100).toFixed(2));
    } else if (fiisRawProfit < 0) {
      accumulatedFiisLoss = Number((accumulatedFiisLoss + Math.abs(fiisRawProfit)).toFixed(2));
    }

    const totalTaxDue = Number((stocksTaxDue + fiisTaxDue).toFixed(2));
    totalTaxPaidOrDue += totalTaxDue;

    reports.push({
      yearMonth: ym,
      monthName,
      stocksSalesTotalBRL: stocksSalesTotal,
      isStocksExempt,
      stocksRawProfitLossBRL: stocksRawProfit,
      stocksExemptProfitBRL: stocksExemptProfit,
      stocksTaxableProfitBRL: stocksTaxableProfit,
      stocksLossCarriedForwardBRL: stocksLossCarriedForward,
      stocksRemainingLossBRL: accumulatedStocksLoss,
      stocksTaxDueBRL: stocksTaxDue,
      fiisSalesTotalBRL: fiisSalesTotal,
      fiisRawProfitLossBRL: fiisRawProfit,
      fiisTaxableProfitBRL: fiisTaxableProfit,
      fiisLossCarriedForwardBRL: fiisLossCarriedForward,
      fiisRemainingLossBRL: accumulatedFiisLoss,
      fiisTaxDueBRL: fiisTaxDue,
      totalTaxDueBRL: totalTaxDue,
      darfCode: '6015',
      darfDueDate: calculateDarfDueDate(ym),
      isDarfPayable: totalTaxDue >= 10.0,
      sales: salesInMonth,
    });
  }

  return {
    reports: reports.reverse(), // Mais recentes primeiro
    accumulatedStocksLossBRL: accumulatedStocksLoss,
    accumulatedFiisLossBRL: accumulatedFiisLoss,
    totalTaxPaidOrDueBRL: Number(totalTaxPaidOrDue.toFixed(2)),
    totalExemptProfitBRL: Number(totalExemptProfit.toFixed(2)),
  };
}
