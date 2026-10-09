import React, { useState, useMemo } from 'react';
import { DollarSign, TrendingUp, Calendar, Filter, HelpCircle, BarChart3, Clock, ArrowRight, Info } from 'lucide-react';
import type {
  PortfolioMovement,
  PortfolioAsset,
  DerivedAssetPosition,
} from '../../../core/portfolio/portfolioTypes';
import { formatCurrencyBRL, formatCurrencyOriginal, formatPercent, formatDateBR } from './portfolioViewUtils';

interface PortfolioDividendsPanelProps {
  movements: PortfolioMovement[];
  assets: PortfolioAsset[];
  positions: DerivedAssetPosition[];
  onAddDividendMovement?: () => void;
}

export const PortfolioDividendsPanel: React.FC<PortfolioDividendsPanelProps> = ({
  movements,
  assets,
  positions,
  onAddDividendMovement,
}) => {
  const [activeTab, setActiveTab] = useState<'RECEIVED' | 'PROVISIONED'>('RECEIVED');
  const [selectedAssetFilter, setSelectedAssetFilter] = useState<string>('ALL');

  // Mapa de ativos por ID
  const assetMap = useMemo(() => {
    const map = new Map<string, PortfolioAsset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  // Mapa de posições por assetId para cálculo de YoC
  const positionMap = useMemo(() => {
    const map = new Map<string, DerivedAssetPosition>();
    positions.forEach((p) => map.set(p.assetId, p));
    return map;
  }, [positions]);

  // Todos os lançamentos ativos de proventos
  const allDividendMovements = useMemo(() => {
    return movements
      .filter(
        (m) =>
          m.status === 'ACTIVE' &&
          (m.type === 'DIVIDEND' || m.type === 'INTEREST')
      );
  }, [movements]);

  // Data de hoje em formato YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Segregação entre Proventos Recebidos (<= hoje) e Proventos Provisionados (> hoje)
  const { receivedDividends, provisionedDividends } = useMemo(() => {
    const received: PortfolioMovement[] = [];
    const provisioned: PortfolioMovement[] = [];

    allDividendMovements.forEach((m) => {
      if (m.date > todayStr) {
        provisioned.push(m);
      } else {
        received.push(m);
      }
    });

    // Recebidos ordenados por data desc (mais recentes primeiro)
    received.sort((a, b) => b.date.localeCompare(a.date));
    // Provisionados ordenados por data asc (próximos a vencer primeiro)
    provisioned.sort((a, b) => a.date.localeCompare(b.date));

    return { receivedDividends: received, provisionedDividends: provisioned };
  }, [allDividendMovements, todayStr]);

  // Métricas Consolidadas dos Proventos Recebidos
  const receivedMetrics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear().toString();

    let totalBRL = 0;
    let currentYearTotalBRL = 0;
    const monthlyMap: Record<string, number> = {};

    receivedDividends.forEach((m) => {
      totalBRL += m.netAmountBRL;
      if (m.date.startsWith(currentYear)) {
        currentYearTotalBRL += m.netAmountBRL;
      }

      // Agrupamento mensal YYYY-MM
      const monthKey = m.date.slice(0, 7);
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + m.netAmountBRL;
    });

    // Média mensal dos últimos 12 meses
    const last12MonthsKeys = Object.keys(monthlyMap)
      .sort()
      .slice(-12);
    const sumLast12 = last12MonthsKeys.reduce((acc, k) => acc + monthlyMap[k], 0);
    const avgMonthly = last12MonthsKeys.length > 0 ? sumLast12 / Math.max(1, last12MonthsKeys.length) : 0;

    // Yield on Cost (YoC) Geral
    const totalInvestedBRL = positions.reduce(
      (sum, p) => sum + (p.totalInvestedBRL ?? 0),
      0
    );
    const overallYoC = totalInvestedBRL > 0 ? (totalBRL / totalInvestedBRL) * 100 : null;

    return {
      totalBRL,
      currentYearTotalBRL,
      avgMonthly,
      overallYoC,
      monthlyMap,
    };
  }, [receivedDividends, positions]);

  // Métricas de Proventos Provisionados / Futuros
  const provisionedMetrics = useMemo(() => {
    let totalBRL = 0;
    let next30DaysBRL = 0;

    const in30DaysDate = new Date();
    in30DaysDate.setDate(in30DaysDate.getDate() + 30);
    const in30DaysStr = in30DaysDate.toISOString().split('T')[0];

    provisionedDividends.forEach((m) => {
      totalBRL += m.netAmountBRL;
      if (m.date <= in30DaysStr) {
        next30DaysBRL += m.netAmountBRL;
      }
    });

    const nextUpcoming = provisionedDividends.length > 0 ? provisionedDividends[0] : null;

    return {
      totalBRL,
      next30DaysBRL,
      count: provisionedDividends.length,
      nextUpcoming,
    };
  }, [provisionedDividends]);

  // Tabela de Proventos Agrupados por Ativo (YoC por ativo sobre recebidos)
  const assetDividendBreakdown = useMemo(() => {
    const breakdownMap: Record<
      string,
      {
        assetId: string;
        ticker: string;
        name: string;
        category: string;
        totalBRL: number;
        count: number;
        costBRL: number | null;
        yoc: number | null;
      }
    > = {};

    receivedDividends.forEach((m) => {
      const asset = assetMap.get(m.assetId);
      const pos = positionMap.get(m.assetId);
      const ticker = asset?.ticker || 'Ativo';
      const name = asset?.name || 'Desconhecido';
      const category = asset?.category || 'Outros';

      if (!breakdownMap[m.assetId]) {
        const cost = pos?.totalInvestedBRL ?? null;
        breakdownMap[m.assetId] = {
          assetId: m.assetId,
          ticker,
          name,
          category,
          totalBRL: 0,
          count: 0,
          costBRL: cost,
          yoc: null,
        };
      }

      breakdownMap[m.assetId].totalBRL += m.netAmountBRL;
      breakdownMap[m.assetId].count += 1;
    });

    return Object.values(breakdownMap)
      .map((item) => {
        const yoc =
          item.costBRL !== null && item.costBRL > 0
            ? (item.totalBRL / item.costBRL) * 100
            : null;
        return { ...item, yoc };
      })
      .sort((a, b) => b.totalBRL - a.totalBRL);
  }, [receivedDividends, assetMap, positionMap]);

  // Movimentações filtradas pelo seletor de ativo (aba Recebidos)
  const filteredReceivedDividends = useMemo(() => {
    if (selectedAssetFilter === 'ALL') return receivedDividends;
    return receivedDividends.filter((m) => m.assetId === selectedAssetFilter);
  }, [receivedDividends, selectedAssetFilter]);

  // Barras dos últimos 6 meses para visualização gráfica
  const recentMonthlyData = useMemo(() => {
    const months: Array<{ monthLabel: string; value: number }> = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${yyyy}-${mm}`;
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthLabel = `${monthNames[d.getMonth()]}/${String(yyyy).slice(2)}`;
      months.push({
        monthLabel,
        value: receivedMetrics.monthlyMap[key] || 0,
      });
    }

    const maxValue = Math.max(...months.map((m) => m.value), 1);
    return months.map((m) => ({
      ...m,
      heightPercent: Math.min(100, Math.round((m.value / maxValue) * 100)),
    }));
  }, [receivedMetrics.monthlyMap]);

  // Utilitário para contagem regressiva de dias restantes
  const getRemainingDaysBadge = (dateStr: string) => {
    try {
      const dTarget = new Date(`${dateStr}T12:00:00Z`).getTime();
      const dNow = new Date(`${todayStr}T12:00:00Z`).getTime();
      const diffDays = Math.round((dTarget - dNow) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        return { label: 'Hoje', className: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300' };
      }
      if (diffDays === 1) {
        return { label: 'Amanhã', className: 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300' };
      }
      return {
        label: `Em ${diffDays} dias`,
        className: diffDays <= 7
          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
      };
    } catch {
      return { label: 'Previsto', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200' };
    }
  };

  // Estado Vazio Geral (se não houver nenhum provento cadastrado, nem recebido nem provisionado)
  if (allDividendMovements.length === 0) {
    return (
      <div
        data-testid="dividends-empty-state"
        className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-8 text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 flex items-center justify-center mx-auto">
          <DollarSign className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-slate-950 dark:text-white text-base">
          Nenhum Provento Registrado
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          Quando suas ações, fundos imobiliários ou títulos pagarem dividendos, juros sobre capital próprio (JCP) ou rendimentos, registre-os para acompanhar sua renda passiva e o Yield on Cost (YoC).
        </p>
        {onAddDividendMovement && (
          <button
            type="button"
            onClick={onAddDividendMovement}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <DollarSign className="w-4 h-4" />
            Lançar Primeiro Provento
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="portfolio-dividends-panel">
      {/* 0. Barra Superior com Alternador de Abas (Recebidos vs Provisionados) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="font-black text-slate-950 dark:text-white text-base md:text-lg">
            Proventos & Renda Passiva
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Fluxo consolidado de dividendos, JCP e proventos provisionados
          </p>
        </div>

        {/* Abas Segmentadas */}
        <div
          role="tablist"
          aria-label="Abas de proventos"
          className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'RECEIVED'}
            data-testid="tab-dividends-received"
            onClick={() => setActiveTab('RECEIVED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'RECEIVED'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Recebidos ({receivedDividends.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'PROVISIONED'}
            data-testid="tab-dividends-provisioned"
            onClick={() => setActiveTab('PROVISIONED')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'PROVISIONED'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Provisionados ({provisionedDividends.length})
          </button>
        </div>
      </div>

      {/* 0.1 Banner de Aviso na Aba de Recebidos se houver Proventos Provisionados */}
      {activeTab === 'RECEIVED' && provisionedDividends.length > 0 && (
        <div
          data-testid="banner-provisioned-alert"
          className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"
        >
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <span className="text-xs font-semibold">
              Você tem <strong>{provisionedDividends.length} {provisionedDividends.length === 1 ? 'provento provisionado' : 'proventos provisionados'}</strong> totalizando{' '}
              <strong>{formatCurrencyBRL(provisionedMetrics.totalBRL)}</strong> previstos para os próximos meses.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('PROVISIONED')}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline flex-shrink-0 ml-2"
          >
            Ver Previsões
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: PROVENTOS RECEBIDOS (HISTÓRICO E YOC)                               */}
      {/* ========================================================================= */}
      {activeTab === 'RECEIVED' && (
        <div className="space-y-6">
          {/* 1. Cards de Métricas Consolidadas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Histórico */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Total em Proventos</span>
                <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-950 dark:text-white" data-testid="metric-total-dividends">
                {formatCurrencyBRL(receivedMetrics.totalBRL)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {receivedDividends.length} {receivedDividends.length === 1 ? 'pagamento recebido' : 'pagamentos recebidos'}
              </p>
            </div>

            {/* Proventos no Ano Corrente */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Recebido em {new Date().getFullYear()}</span>
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-950 dark:text-white" data-testid="metric-year-dividends">
                {formatCurrencyBRL(receivedMetrics.currentYearTotalBRL)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Exercício fiscal atual
              </p>
            </div>

            {/* Média Mensal */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Média Mensal (12m)</span>
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-950 dark:text-white" data-testid="metric-avg-monthly-dividends">
                {formatCurrencyBRL(receivedMetrics.avgMonthly)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Renda passiva média recorrente
              </p>
            </div>

            {/* Yield on Cost Geral */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Yield On Cost (YoC)</span>
                <HelpCircle
                  className="w-4 h-4 text-slate-400"
                  title="Retorno acumulado de proventos em relação ao custo original total investido"
                />
              </div>
              <div className="text-xl md:text-2xl font-black text-emerald-700 dark:text-emerald-400" data-testid="metric-overall-yoc">
                {receivedMetrics.overallYoC !== null ? formatPercent(receivedMetrics.overallYoC, true) : '—'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Proventos sobre custo total
              </p>
            </div>
          </div>

          {/* 2. Gráfico Mensal de Barras (Últimos 6 Meses) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                <h4 className="font-bold text-slate-950 dark:text-white text-sm md:text-base">
                  Evolução Mensal de Proventos
                </h4>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Últimos 6 meses
              </span>
            </div>

            {/* Grade de Barras */}
            <div className="h-36 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
              {recentMonthlyData.map((m) => (
                <div key={m.monthLabel} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-full">
                    {m.value > 0 ? formatCurrencyBRL(m.value) : '—'}
                  </span>
                  <div className="w-full max-w-[48px] bg-slate-100 dark:bg-slate-800 rounded-t-lg h-full flex items-end overflow-hidden">
                    <div
                      style={{ height: `${m.value > 0 ? Math.max(m.heightPercent, 8) : 0}%` }}
                      className="w-full bg-purple-600 dark:bg-purple-500 rounded-t-lg transition-all duration-500 hover:brightness-110"
                      title={`${m.monthLabel}: ${formatCurrencyBRL(m.value)}`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                    {m.monthLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Tabela de Yield on Cost por Ativo */}
          {assetDividendBreakdown.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="font-bold text-slate-950 dark:text-white text-sm md:text-base">
                  Yield on Cost por Ativo Pagador
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {assetDividendBreakdown.length} {assetDividendBreakdown.length === 1 ? 'ativo pagador' : 'ativos pagadores'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                      <th className="py-3 px-4">Ativo</th>
                      <th className="py-3 px-4 text-center">Pagamentos</th>
                      <th className="py-3 px-4 text-right">Custo Investido</th>
                      <th className="py-3 px-4 text-right">Total Recebido</th>
                      <th className="py-3 px-4 text-right">Yield on Cost (YoC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {assetDividendBreakdown.map((item) => (
                      <tr key={item.assetId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4">
                          <span className="font-black text-slate-950 dark:text-white mr-1.5">{item.ticker}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{item.name}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700 dark:text-slate-300">
                          {item.count}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                          {item.costBRL !== null ? formatCurrencyBRL(item.costBRL) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-purple-700 dark:text-purple-400">
                          {formatCurrencyBRL(item.totalBRL)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400">
                          {item.yoc !== null ? formatPercent(item.yoc, true) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 4. Lista Cronológica Detalhada de Lançamentos de Proventos */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h4 className="font-bold text-slate-950 dark:text-white text-sm md:text-base">
                Histórico Detalhado de Proventos
              </h4>

              {/* Filtro por Ativo */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedAssetFilter}
                  onChange={(e) => setSelectedAssetFilter(e.target.value)}
                  className="text-xs px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl focus:outline-none"
                >
                  <option value="ALL">Todos os Ativos ({receivedDividends.length})</option>
                  {assetDividendBreakdown.map((a) => (
                    <option key={a.assetId} value={a.assetId}>
                      {a.ticker} ({a.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredReceivedDividends.map((m) => {
                const asset = assetMap.get(m.assetId);
                const isJcp = m.type === 'INTEREST';

                return (
                  <div key={m.id} className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-950 dark:text-white text-sm">
                          {asset?.ticker || 'Ativo'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isJcp
                              ? 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800'
                              : 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                          }`}
                        >
                          {isJcp ? 'JCP / Juros' : 'Dividendo'}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                          {formatDateBR(m.date)}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {asset?.name || ''}
                        {m.notes ? ` • ${m.notes}` : ''}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-slate-950 dark:text-white text-sm">
                        {formatCurrencyBRL(m.netAmountBRL)}
                      </div>
                      {m.currency !== 'BRL' && (
                        <div className="text-[10px] text-slate-400">
                          {formatCurrencyOriginal(m.netAmount, m.currency)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Ponte Soberana: Saque de Proventos para o Orçamento Pessoal */}
          <div
            data-testid="dividends-sovereign-bridge-card"
            className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-slate-50 dark:from-purple-950/30 dark:to-slate-900 border border-purple-200 dark:border-purple-900/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                <DollarSign className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="font-bold text-xs md:text-sm text-slate-900 dark:text-white">
                  Ponte de Saque de Proventos para Gastos Pessoais
                </h5>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Os dividendos caem no <strong>Caixa da Carteira</strong>. Se você deseja transferir esses recursos para sua conta corrente pessoal para pagar contas da rotina, registre uma <strong>Retirada Externa (EXTERNAL_WITHDRAWAL)</strong> no Livro Razão.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: PROVENTOS PROVISIONADOS / FUTUROS                                   */}
      {/* ========================================================================= */}
      {activeTab === 'PROVISIONED' && (
        <div className="space-y-6" data-testid="dividends-provisioned-view">
          {/* 1. Cards de Métricas Provisionadas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Provisionado */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Total a Receber</span>
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-950 dark:text-white" data-testid="metric-provisioned-total">
                {formatCurrencyBRL(provisionedMetrics.totalBRL)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {provisionedMetrics.count} {provisionedMetrics.count === 1 ? 'pagamento agendado' : 'pagamentos agendados'}
              </p>
            </div>

            {/* Próximos 30 dias */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Próximos 30 Dias</span>
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-xl md:text-2xl font-black text-emerald-700 dark:text-emerald-400" data-testid="metric-provisioned-next30">
                {formatCurrencyBRL(provisionedMetrics.next30DaysBRL)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Liquidação no curto prazo
              </p>
            </div>

            {/* Próximo Pagamento */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider">Próxima Liquidação</span>
                <TrendingUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-xl md:text-2xl font-black text-slate-950 dark:text-white" data-testid="metric-provisioned-upcoming">
                {provisionedMetrics.nextUpcoming
                  ? assetMap.get(provisionedMetrics.nextUpcoming.assetId)?.ticker || 'Ativo'
                  : '—'}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {provisionedMetrics.nextUpcoming
                  ? `${formatDateBR(provisionedMetrics.nextUpcoming.date)} • ${formatCurrencyBRL(provisionedMetrics.nextUpcoming.netAmountBRL)}`
                  : 'Sem pagamentos previstos'}
              </p>
            </div>
          </div>

          {/* 2. Card Educativo / Pedagógico */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong>Como funcionam os Proventos Provisionados? </strong>
              Quando companhias da B3 ou Fundos Imobiliários anunciam proventos aprovados com <strong>Data COM</strong> definida e pagamento futuro,
              registre-os com a data prevista. O Finanças Pro Invest calculará sua renda passiva projetada sem misturá-la com o saldo já realizado.
            </div>
          </div>

          {/* 3. Lista de Proventos Provisionados */}
          {provisionedDividends.length === 0 ? (
            <div
              data-testid="provisioned-empty-state"
              className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-8 text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-950 dark:text-white text-base">
                Nenhum Provento Provisionado no Momento
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Você não possui nenhum dividendo ou JCP futuro com data agendada. Ao cadastrar um provento com data futura, ele aparecerá aqui com contagem regressiva para a liquidação.
              </p>
              {onAddDividendMovement && (
                <button
                  type="button"
                  onClick={onAddDividendMovement}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 transition-colors shadow-sm"
                >
                  <Clock className="w-4 h-4" />
                  Agendar Provento Futuro
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h4 className="font-bold text-slate-950 dark:text-white text-sm md:text-base">
                  Cronograma de Pagamentos Futuros
                </h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {provisionedDividends.length} {provisionedDividends.length === 1 ? 'previsão' : 'previsões'}
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {provisionedDividends.map((m) => {
                  const asset = assetMap.get(m.assetId);
                  const isJcp = m.type === 'INTEREST';
                  const countdown = getRemainingDaysBadge(m.date);

                  return (
                    <div
                      key={m.id}
                      className="p-4 flex items-center justify-between text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-950 dark:text-white text-sm">
                            {asset?.ticker || 'Ativo'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              isJcp
                                ? 'bg-violet-50 text-violet-800 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800'
                                : 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                            }`}
                          >
                            {isJcp ? 'JCP / Juros' : 'Dividendo'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${countdown.className}`}
                          >
                            {countdown.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>{asset?.name || ''}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Previsão: {formatDateBR(m.date)}
                          </span>
                          {m.notes && <span>• {m.notes}</span>}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                          +{formatCurrencyBRL(m.netAmountBRL)}
                        </div>
                        {m.currency !== 'BRL' && (
                          <div className="text-[10px] text-slate-400">
                            {formatCurrencyOriginal(m.netAmount, m.currency)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
