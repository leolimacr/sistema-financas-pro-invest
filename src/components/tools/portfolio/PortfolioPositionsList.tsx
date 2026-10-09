import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  Clock,
  AlertCircle,
  Search,
  X,
  Layers,
  Building2,
  ListFilter,
  MoreVertical,
  Pencil,
  PlusCircle,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileText,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DerivedAssetPosition, PortfolioAsset } from '../../../core/portfolio/portfolioTypes';
import { isFixedIncomeTaxExempt } from '../../../core/portfolio/fixedIncomeMath';
import { auditAssetCalibration } from '../../../core/portfolio/nexusPortfolioAdvisor';
import { PortfolioQuoteMeta } from './portfolioViewTypes';
import { formatCurrencyBRL, formatCurrencyOriginal, formatDateBR, formatPercent, formatQuantity } from './portfolioViewUtils';

export interface PortfolioPositionsListProps {
  positions: DerivedAssetPosition[];
  assets?: PortfolioAsset[];
  quoteMetaMap?: Record<string, PortfolioQuoteMeta>;
  onEditAsset?: (asset: PortfolioAsset) => void;
  onAddMovementForAsset?: (assetId: string) => void;
  onDeleteAsset?: (asset: PortfolioAsset) => void;
  onSelectAssetDetails?: (position: DerivedAssetPosition) => void;
  onCalibrateAsset?: (position: DerivedAssetPosition) => void;
  onOpenNewAsset?: () => void;
  onOpenImport?: () => void;
}

type ViewMode = 'FLAT' | 'BY_CLASS' | 'BY_INSTITUTION';
export type PositionSortField = 'ticker' | 'quantity' | 'avgCost' | 'currentPrice' | 'totalValue' | 'unrealizedPnL';
export type PositionSortDirection = 'asc' | 'desc';

export const PortfolioPositionsList: React.FC<PortfolioPositionsListProps> = ({
  positions,
  assets = [],
  quoteMetaMap = {},
  onEditAsset,
  onAddMovementForAsset,
  onDeleteAsset,
  onSelectAssetDetails,
  onCalibrateAsset,
  onOpenNewAsset,
  onOpenImport,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('FLAT');
  const [sortField, setSortField] = useState<PositionSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<PositionSortDirection>('asc');
  const [openMenuAssetId, setOpenMenuAssetId] = useState<string | null>(null);
  const [expandedAssetIds, setExpandedAssetIds] = useState<Set<string>>(new Set());

  const handleToggleExpand = (assetId: string) => {
    setExpandedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const assetMap = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  // Contagem de ativos que necessitam de calibração
  const uncalibratedCount = useMemo(() => {
    return positions.filter((p) => auditAssetCalibration(p) !== null).length;
  }, [positions]);

  const handleToggleSort = (field: PositionSortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getAssetForAction = (pos: DerivedAssetPosition): PortfolioAsset => {
    const existing = assetMap.get(pos.assetId);
    if (existing) return existing;
    return {
      id: pos.assetId,
      userId: '',
      ticker: pos.ticker,
      name: pos.name,
      category: pos.category,
      currency: pos.currency,
      market: pos.market,
      targetPercentage: pos.targetPercentage,
      isBalanceOnly: pos.isBalanceOnly,
      institution: pos.institution,
      fixedIncomeCertificates: pos.fixedIncomeCertificates,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Categorias presentes na carteira com contagem
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    positions.forEach((p) => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
  }, [positions]);

  const categories = useMemo(() => Object.keys(categoryCounts).sort(), [categoryCounts]);

  // Filtragem combinada (texto + categoria / pendentes)
  const filteredPositions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return positions.filter((pos) => {
      if (selectedCategory === 'PENDING_CALIBRATION') {
        if (auditAssetCalibration(pos) === null) return false;
      } else if (selectedCategory !== 'ALL' && pos.category !== selectedCategory) {
        return false;
      }
      if (!term) return true;

      const matchesTicker = pos.ticker.toLowerCase().includes(term);
      const matchesName = pos.name.toLowerCase().includes(term);
      const matchesCategory = pos.category.toLowerCase().includes(term);
      const matchesInstitution = pos.institution ? pos.institution.toLowerCase().includes(term) : false;

      return matchesTicker || matchesName || matchesCategory || matchesInstitution;
    });
  }, [positions, selectedCategory, searchTerm]);

  // Ordenação das posições filtradas
  const sortedPositions = useMemo(() => {
    if (!sortField) return filteredPositions;
    return [...filteredPositions].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'ticker':
          cmp = a.ticker.localeCompare(b.ticker);
          break;
        case 'quantity':
          cmp = (a.quantity ?? 0) - (b.quantity ?? 0);
          break;
        case 'avgCost':
          cmp = (a.avgCostBRL ?? 0) - (b.avgCostBRL ?? 0);
          break;
        case 'currentPrice': {
          const priceA = a.currentPriceBRL ?? a.avgCostBRL ?? 0;
          const priceB = b.currentPriceBRL ?? b.avgCostBRL ?? 0;
          cmp = priceA - priceB;
          break;
        }
        case 'totalValue': {
          const valA = a.currentValueBRL ?? a.totalInvestedBRL ?? 0;
          const valB = b.currentValueBRL ?? b.totalInvestedBRL ?? 0;
          cmp = valA - valB;
          break;
        }
        case 'unrealizedPnL': {
          const pnlA = a.unrealizedPnLBRL ?? -Infinity;
          const pnlB = b.unrealizedPnLBRL ?? -Infinity;
          cmp = pnlA - pnlB;
          break;
        }
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [filteredPositions, sortField, sortDirection]);

  // Agrupamento conforme o modo de visão selecionado
  const groupedPositions = useMemo(() => {
    if (viewMode === 'FLAT') {
      return [{ groupName: 'Todos os Ativos', items: sortedPositions }];
    }

    const groups: Record<string, DerivedAssetPosition[]> = {};

    sortedPositions.forEach((pos) => {
      const key =
        viewMode === 'BY_CLASS'
          ? pos.category || 'Sem Classe'
          : pos.institution || 'Não especificada';

      if (!groups[key]) groups[key] = [];
      groups[key].push(pos);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([groupName, items]) => ({
        groupName,
        items,
        totalValueBRL: items.reduce(
          (sum, i) => sum + (i.currentValueBRL ?? i.totalInvestedBRL ?? 0),
          0
        ),
      }));
  }, [sortedPositions, viewMode]);

  // Totais consolidados para as posições atualmente filtradas
  const totalFilteredValueBRL = useMemo(() => {
    return filteredPositions.reduce(
      (sum, p) => sum + (p.currentValueBRL ?? p.totalInvestedBRL ?? 0),
      0
    );
  }, [filteredPositions]);

  const { totalFilteredPnLBRL, totalFilteredPnLPercent } = useMemo(() => {
    let totalCost = 0;
    let totalVal = 0;
    let countValid = 0;

    for (const p of filteredPositions) {
      if (p.hasKnownCost && !p.isBalanceOnly && p.totalInvestedBRL !== null && p.totalInvestedBRL > 0) {
        totalCost += p.totalInvestedBRL;
        totalVal += p.currentValueBRL ?? p.totalInvestedBRL ?? 0;
        countValid++;
      }
    }

    if (countValid === 0 || totalCost === 0) {
      return { totalFilteredPnLBRL: null, totalFilteredPnLPercent: null };
    }

    const pnl = totalVal - totalCost;
    const pct = (pnl / totalCost) * 100;
    return { totalFilteredPnLBRL: pnl, totalFilteredPnLPercent: pct };
  }, [filteredPositions]);

  if (positions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Cabeçalho Principal com Controles */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-950 dark:text-white text-base md:text-lg">
              Posições em Custódia
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {filteredPositions.length} de {positions.length}{' '}
              {positions.length === 1 ? 'ativo' : 'ativos'}
              {searchTerm && ` encontrados para "${searchTerm}"`}
            </p>
          </div>

          {/* Seletor de Modo de Visão */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('FLAT')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'FLAT'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode('BY_CLASS')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'BY_CLASS'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Por Classe
            </button>
            <button
              type="button"
              onClick={() => setViewMode('BY_INSTITUTION')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                viewMode === 'BY_INSTITUTION'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Por Corretora
            </button>
          </div>
        </div>

        {/* Barra de Pesquisa e Filtro por Categoria */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ticker, nome ou corretora..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs md:text-sm font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros em Pílula de Categoria */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-lg font-bold border transition-all shrink-0 ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              Todas ({positions.length})
            </button>
            {uncalibratedCount > 0 && (
              <button
                type="button"
                data-testid="filter-pill-pending-calibration"
                onClick={() => setSelectedCategory('PENDING_CALIBRATION')}
                className={`px-3 py-1 rounded-lg font-bold border transition-all shrink-0 inline-flex items-center gap-1 ${
                  selectedCategory === 'PENDING_CALIBRATION'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                }`}
              >
                <span>⚠️ Pendentes ({uncalibratedCount})</span>
              </button>
            )}
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-bold border transition-all shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                {cat} ({categoryCounts[cat]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Estado Vazio de Busca */}
      {filteredPositions.length === 0 && (
        <div className="p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhum ativo encontrado para os filtros selecionados.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
            }}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Limpar filtros e exibir todas as posições
          </button>
        </div>
      )}

      {/* Visão em Tabela para Desktop (>= 768px) */}
      {filteredPositions.length > 0 && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <th
                  className="py-3.5 px-4 cursor-pointer select-none group hover:text-slate-950 dark:hover:text-white transition-colors"
                  onClick={() => handleToggleSort('ticker')}
                  data-testid="sort-header-ticker"
                  title="Clique para ordenar por ticker ou nome"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Ativo / Classe</span>
                    {sortField === 'ticker' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer select-none group hover:text-slate-950 dark:hover:text-white transition-colors"
                  onClick={() => handleToggleSort('quantity')}
                  data-testid="sort-header-quantity"
                  title="Clique para ordenar por quantidade de cotas"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Quantidade</span>
                    {sortField === 'quantity' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer select-none group hover:text-slate-950 dark:hover:text-white transition-colors"
                  onClick={() => handleToggleSort('avgCost')}
                  data-testid="sort-header-avgCost"
                  title="Clique para ordenar por preço médio"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Preço Médio</span>
                    {sortField === 'avgCost' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer select-none group hover:text-slate-950 dark:hover:text-white transition-colors"
                  onClick={() => handleToggleSort('currentPrice')}
                  data-testid="sort-header-currentPrice"
                  title="Clique para ordenar por cotação atual"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Cotação Atual</span>
                    {sortField === 'currentPrice' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer select-none group hover:text-slate-950 dark:hover:text-white transition-colors"
                  onClick={() => handleToggleSort('totalValue')}
                  data-testid="sort-header-totalValue"
                  title="Clique para ordenar por valor total"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Valor Total (R$)</span>
                    {sortField === 'totalValue' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th
                  className="py-3.5 px-4 text-right cursor-pointer select-none group hover:text-slate-950 dark:hover:text-white transition-colors"
                  onClick={() => handleToggleSort('unrealizedPnL')}
                  data-testid="sort-header-unrealizedPnL"
                  title="Clique para ordenar por ganho ou perda não realizado"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Ganho/perda</span>
                    {sortField === 'unrealizedPnL' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-3 text-center w-12 font-bold">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {groupedPositions.map((group) => (
                <React.Fragment key={group.groupName}>
                  {viewMode !== 'FLAT' && (
                    <tr className="bg-slate-100/70 dark:bg-slate-800/80 font-bold text-xs text-slate-800 dark:text-slate-200 border-y border-slate-200 dark:border-slate-700">
                      <td colSpan={4} className="py-2.5 px-4">
                        <span className="uppercase tracking-wider">{group.groupName}</span>
                        <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">
                          ({group.items.length} {group.items.length === 1 ? 'ativo' : 'ativos'})
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-slate-950 dark:text-white">
                        {group.totalValueBRL !== undefined ? formatCurrencyBRL(group.totalValueBRL) : ''}
                      </td>
                      <td className="py-2.5 px-4" colSpan={2} />
                    </tr>
                  )}
                  {group.items.map((pos) => {
                    const meta = quoteMetaMap[pos.assetId];
                    const isBalanceOnly = pos.isBalanceOnly || !pos.hasKnownQuantity || pos.quantity === null;
                    const hasUnknownCost = !pos.hasKnownCost || pos.avgCostBRL === null;
                    const hasRentability = !hasUnknownCost && pos.unrealizedPnLBRL !== null && pos.unrealizedPnLPercent !== null;
                    const isExpanded = expandedAssetIds.has(pos.assetId);
                    const hasCertificates = Boolean(pos.fixedIncomeCertificates && pos.fixedIncomeCertificates.length > 0);

                    return (
                      <React.Fragment key={pos.assetId}>
                        <tr
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          data-testid={`position-row-${pos.ticker}`}
                        >
                          {/* 1. Ativo / Classe / Moeda / Corretora */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                data-testid={`btn-open-details-${pos.ticker}`}
                                onClick={() => onSelectAssetDetails && onSelectAssetDetails(pos)}
                                className="font-black text-slate-950 dark:text-white text-base hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition-colors text-left focus:outline-none"
                                title="Ver Raio-X do ativo"
                              >
                                {pos.ticker}
                              </button>
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                                {pos.market}
                              </span>
                              {hasCertificates && (
                                <button
                                  type="button"
                                  data-testid={`btn-expand-certificates-${pos.ticker}`}
                                  onClick={() => handleToggleExpand(pos.assetId)}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors cursor-pointer"
                                  title="Clique para ver os CDBs/títulos cadastrados sob esta mesma meta"
                                >
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  <span>{pos.fixedIncomeCertificates?.length} {pos.fixedIncomeCertificates?.length === 1 ? 'título' : 'títulos'}</span>
                                </button>
                              )}
                            {pos.currency !== 'BRL' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 uppercase">
                                {pos.currency}
                              </span>
                            )}
                            {pos.institution && (
                              <span
                                data-testid={`badge-institution-${pos.ticker}`}
                                className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              >
                                {pos.institution}
                              </span>
                            )}
                            {(isFixedIncomeTaxExempt(pos.ticker) || isFixedIncomeTaxExempt(pos.name)) && (
                              <span
                                data-testid={`badge-tax-exempt-${pos.ticker}`}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                title="Ativo de Renda Fixa com Isenção de IRPF para Pessoa Física"
                              >
                                Isento IR
                              </span>
                            )}
                            {auditAssetCalibration(pos) !== null && onCalibrateAsset && (
                              <button
                                type="button"
                                data-testid={`badge-calibrate-${pos.ticker}`}
                                onClick={() => onCalibrateAsset(pos)}
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors cursor-pointer"
                                title="Ativo com dados pendentes. Clique para calibrar."
                              >
                                ⚠️ Calibrar
                              </button>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-xs">
                            {pos.name} • <span className="text-slate-600 dark:text-slate-300">{pos.category}</span>
                          </div>
                        </td>

                        {/* 2. Quantidade */}
                        <td className="py-3.5 px-4 text-right font-medium">
                          {isBalanceOnly ? (
                            <span
                              data-testid="badge-balance-only"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              title="Ativo cadastrado puramente por saldo financeiro (sem cotas conhecidas)"
                            >
                              <HelpCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                              Apenas Saldo
                            </span>
                          ) : (
                            <span className="text-slate-900 dark:text-white font-semibold">{formatQuantity(pos.quantity)}</span>
                          )}
                        </td>

                        {/* 3. Preço Médio */}
                        <td className="py-3.5 px-4 text-right font-medium">
                          {hasUnknownCost ? (
                            <span
                              data-testid="badge-unknown-cost"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              title="Preço médio desconhecido; posição inicial informada sem histórico de aquisição"
                            >
                              Desconhecido
                            </span>
                          ) : (
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {formatCurrencyBRL(pos.avgCostBRL)}
                              </div>
                              {pos.currency !== 'BRL' && pos.avgCostOriginal !== null && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {formatCurrencyOriginal(pos.avgCostOriginal, pos.currency)}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 4. Cotação Atual */}
                        <td className="py-3.5 px-4 text-right font-medium">
                          {isBalanceOnly ? (
                            <span className="text-slate-400 dark:text-slate-500 font-normal italic text-xs">— (Apenas Saldo)</span>
                          ) : pos.currentPriceOriginal !== null ? (
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {formatCurrencyOriginal(pos.currentPriceOriginal, pos.currency)}
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 font-normal italic text-xs">— (Sem cotação)</span>
                          )}
                          {meta && (
                            <div className="text-[10px] mt-0.5">
                              {meta.quoteStatus === 'STALE' && (
                                <span
                                  data-testid="badge-stale-quote"
                                  className="inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-bold"
                                >
                                  <Clock className="w-2.5 h-2.5" /> Desatualizada
                                </span>
                              )}
                              {meta.quoteStatus === 'UNAVAILABLE' && (
                                <span
                                  data-testid="badge-unavailable-quote"
                                  className="inline-flex items-center gap-0.5 text-red-600 dark:text-red-400 font-bold"
                                >
                                  <AlertCircle className="w-2.5 h-2.5" /> Indisponível
                                </span>
                              )}
                              {meta.quoteStatus === 'MANUAL' && (
                                <span className="text-slate-500 dark:text-slate-400 font-medium">Manual</span>
                              )}
                            </div>
                          )}
                          {pos.currency !== 'BRL' && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              Câmbio: {formatCurrencyBRL(pos.currentFxRateToBRL)}
                            </div>
                          )}
                        </td>

                        {/* 5. Valor Total (R$) */}
                        <td className="py-3.5 px-4 text-right font-black text-slate-950 dark:text-white text-base">
                          {isBalanceOnly ? (
                            <div>
                              <div>{formatCurrencyBRL(pos.currentValueBRL)}</div>
                              {pos.fixedIncomeIsNetBalance ? (
                                <span
                                  data-testid={`badge-net-balance-${pos.ticker}`}
                                  className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 block"
                                  title="Saldo líquido pós-IR informado pelo investidor"
                                >
                                  Líquido
                                </span>
                              ) : pos.fixedIncomeDetails && pos.fixedIncomeDetails.taxAmountBRL > 0 ? (
                                <span
                                  data-testid={`badge-gross-balance-${pos.ticker}`}
                                  className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block"
                                  title={`Provisão IR: -${formatCurrencyBRL(pos.fixedIncomeDetails.taxAmountBRL)} | Saldo Líquido estimado: ${formatCurrencyBRL(pos.fixedIncomeDetails.netValueBRL)}`}
                                >
                                  Bruto (Líq: {formatCurrencyBRL(pos.fixedIncomeDetails.netValueBRL)})
                                </span>
                              ) : null}
                            </div>
                          ) : pos.currentValueBRL !== null ? (
                            formatCurrencyBRL(pos.currentValueBRL)
                          ) : (
                            <div>
                              <span className="text-slate-400 dark:text-slate-500 font-normal italic text-xs block">— (Sem cotação)</span>
                              {pos.totalInvestedBRL !== null && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold block">
                                  Custo: {formatCurrencyBRL(pos.totalInvestedBRL)}
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 6. Rentabilidade Não Realizada */}
                        <td className="py-3.5 px-4 text-right font-semibold">
                          {hasRentability && pos.unrealizedPnLBRL !== null && pos.unrealizedPnLPercent !== null ? (
                            <div>
                              <div
                                className={
                                  pos.unrealizedPnLBRL >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-red-700 dark:text-red-400 font-bold'
                                }
                              >
                                {pos.unrealizedPnLBRL >= 0 ? '+' : ''}
                                {formatCurrencyBRL(pos.unrealizedPnLBRL)}
                              </div>
                              <div
                                className={`text-xs ${
                                  pos.unrealizedPnLPercent >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'
                                }`}
                              >
                                Retorno: {formatPercent(pos.unrealizedPnLPercent, true)}
                              </div>
                            </div>
                          ) : (
                            <span
                              data-testid="badge-no-rentability"
                              className="text-xs text-slate-400 dark:text-slate-500 font-normal italic"
                            >
                              {isBalanceOnly || hasUnknownCost ? '— (Sem PM)' : '— (Sem cotação)'}
                            </span>
                          )}
                        </td>

                        {/* 7. Menu de Ações (Desktop) */}
                        <td className="py-3.5 px-3 text-center relative">
                          <button
                            type="button"
                            data-testid={`asset-action-menu-btn-${pos.ticker}`}
                            onClick={() => setOpenMenuAssetId(openMenuAssetId === pos.assetId ? null : pos.assetId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Opções do ativo"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuAssetId === pos.assetId && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setOpenMenuAssetId(null)}
                              />
                              <div
                                data-testid={`asset-dropdown-${pos.ticker}`}
                                className="absolute right-4 top-10 z-30 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-1.5 text-left text-xs space-y-0.5"
                              >
                                {onCalibrateAsset && (auditAssetCalibration(pos) !== null || (pos.market === 'RF' || pos.category.toLowerCase().includes('renda fixa') || Boolean(pos.fixedIncomeCertificates?.length))) && (
                                  <button
                                    type="button"
                                    data-testid={`btn-calibrate-asset-${pos.ticker}`}
                                    onClick={() => {
                                      setOpenMenuAssetId(null);
                                      onCalibrateAsset(pos);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold transition-colors"
                                  >
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{pos.fixedIncomeCertificates && pos.fixedIncomeCertificates.length > 0 ? 'Gerenciar Títulos' : 'Calibrar Ativo'}</span>
                                  </button>
                                )}
                                {onSelectAssetDetails && (
                                  <button
                                    type="button"
                                    data-testid={`btn-details-asset-${pos.ticker}`}
                                    onClick={() => {
                                      setOpenMenuAssetId(null);
                                      onSelectAssetDetails(pos);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Raio-X do Ativo</span>
                                  </button>
                                )}
                                {onEditAsset && (
                                  <button
                                    type="button"
                                    data-testid={`btn-edit-asset-${pos.ticker}`}
                                    onClick={() => {
                                      setOpenMenuAssetId(null);
                                      onEditAsset(getAssetForAction(pos));
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    <span>Editar Ativo</span>
                                  </button>
                                )}
                                {onAddMovementForAsset && (
                                  <button
                                    type="button"
                                    data-testid={`btn-movement-asset-${pos.ticker}`}
                                    onClick={() => {
                                      setOpenMenuAssetId(null);
                                      onAddMovementForAsset(pos.assetId);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
                                  >
                                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Novo Lançamento</span>
                                  </button>
                                )}
                                {onDeleteAsset && (
                                  <button
                                    type="button"
                                    data-testid={`btn-delete-asset-${pos.ticker}`}
                                    onClick={() => {
                                      setOpenMenuAssetId(null);
                                      onDeleteAsset(getAssetForAction(pos));
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Excluir Ativo</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </td>
                      </tr>

                      {/* Linha expansível com a lista de certificados/títulos da mesma meta */}
                      {hasCertificates && isExpanded && (
                        <tr
                          data-testid={`expanded-certificates-row-${pos.ticker}`}
                          className="bg-slate-50/75 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800"
                        >
                          <td colSpan={7} className="px-6 py-3">
                            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/80 p-3 shadow-inner">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                  Títulos cadastrados sob esta meta ({pos.fixedIncomeCertificates?.length})
                                </span>
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                  Total consolidado: {formatCurrencyBRL(pos.currentValueBRL)}
                                </span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 text-left">
                                      <th className="pb-1.5 font-medium">Nome / Identificação</th>
                                      <th className="pb-1.5 font-medium">Instituição</th>
                                      <th className="pb-1.5 font-medium">Taxa / Indexador</th>
                                      <th className="pb-1.5 font-medium">Aplicação</th>
                                      <th className="pb-1.5 font-medium">Vencimento</th>
                                      <th className="pb-1.5 font-medium text-right">Saldo</th>
                                      <th className="pb-1.5 font-medium text-right">Participação</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {pos.fixedIncomeCertificates?.map((cert) => {
                                      const sharePercent = pos.currentValueBRL > 0
                                        ? ((cert.balance / pos.currentValueBRL) * 100).toFixed(1)
                                        : '0.0';
                                      return (
                                        <tr key={cert.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                          <td className="py-1.5 font-semibold text-slate-800 dark:text-slate-200">
                                            {cert.name}
                                          </td>
                                          <td className="py-1.5 text-slate-600 dark:text-slate-400">
                                            {cert.institution || '—'}
                                          </td>
                                          <td className="py-1.5 text-slate-600 dark:text-slate-400">
                                            {cert.indexation || 'CDI'}{' '}
                                            {cert.ratePercent !== undefined ? `${cert.ratePercent}%` : ''}
                                          </td>
                                          <td className="py-1.5 text-slate-600 dark:text-slate-400">
                                            {cert.startDate ? formatDateBR(cert.startDate) : '—'}
                                          </td>
                                          <td className="py-1.5 text-slate-600 dark:text-slate-400">
                                            {cert.maturityDate ? formatDateBR(cert.maturityDate) : '—'}
                                          </td>
                                          <td className="py-1.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                            {formatCurrencyBRL(cert.balance)}
                                            {cert.quantity !== undefined && cert.quantity > 0 && (
                                              <span className="text-[10px] ml-1 text-slate-400 font-normal">
                                                ({cert.quantity} tit.)
                                              </span>
                                            )}
                                            <span className="text-[10px] ml-1 text-slate-400 font-normal">
                                              ({cert.isNetBalance ? 'Líq' : 'Bruto'})
                                            </span>
                                          </td>
                                          <td className="py-1.5 text-right font-mono text-slate-600 dark:text-slate-400">
                                            {sharePercent}%
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
            </tbody>
            <tfoot>
              <tr
                data-testid="positions-table-footer"
                className="bg-slate-50/90 dark:bg-slate-800/60 border-t-2 border-slate-200 dark:border-slate-700/80 font-bold text-xs text-slate-700 dark:text-slate-300"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">
                      Total Custódia
                    </span>
                    <span
                      data-testid="badge-footer-count"
                      className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold"
                    >
                      {filteredPositions.length} {filteredPositions.length === 1 ? 'ativo' : 'ativos'}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right text-slate-400 dark:text-slate-500 font-normal italic">—</td>
                <td className="py-4 px-4 text-right text-slate-400 dark:text-slate-500 font-normal italic">—</td>
                <td className="py-4 px-4 text-right text-slate-400 dark:text-slate-500 font-normal italic">—</td>
                <td
                  data-testid="footer-total-value"
                  className="py-4 px-4 text-right font-black text-slate-950 dark:text-white text-base"
                >
                  {formatCurrencyBRL(totalFilteredValueBRL)}
                </td>
                <td data-testid="footer-total-pnl" className="py-4 px-4 text-right font-semibold">
                  {totalFilteredPnLBRL !== null ? (
                    <div>
                      <div
                        className={`font-black text-sm ${
                          totalFilteredPnLBRL >= 0
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                        }`}
                      >
                        {totalFilteredPnLBRL >= 0 ? '+' : ''}
                        {formatCurrencyBRL(totalFilteredPnLBRL)}
                      </div>
                      {totalFilteredPnLPercent !== null && (
                        <div
                          className={`text-xs ${
                            totalFilteredPnLPercent >= 0
                              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                              : 'text-red-600 dark:text-red-400 font-bold'
                          }`}
                        >
                          Retorno: {formatPercent(totalFilteredPnLPercent, true)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">—</span>
                  )}
                </td>
                <td className="py-4 px-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Visão em Cards para Mobile (< 768px) */}
      {filteredPositions.length > 0 && (
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {groupedPositions.map((group) => (
            <div key={group.groupName}>
              {viewMode !== 'FLAT' && (
                <div className="p-3 bg-slate-100/80 dark:bg-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white border-y border-slate-200 dark:border-slate-700">
                  <span>{group.groupName}</span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {group.totalValueBRL !== undefined ? formatCurrencyBRL(group.totalValueBRL) : ''}
                  </span>
                </div>
              )}
              {group.items.map((pos) => {
                const meta = quoteMetaMap[pos.assetId];
                const isBalanceOnly = pos.isBalanceOnly || !pos.hasKnownQuantity || pos.quantity === null;
                const hasUnknownCost = !pos.hasKnownCost || pos.avgCostBRL === null;
                const hasRentability = !hasUnknownCost && pos.unrealizedPnLBRL !== null && pos.unrealizedPnLPercent !== null;
                const isExpanded = expandedAssetIds.has(pos.assetId);
                const hasCertificates = Boolean(pos.fixedIncomeCertificates && pos.fixedIncomeCertificates.length > 0);

                return (
                  <div key={pos.assetId} className="p-4 space-y-3" data-testid={`position-card-${pos.ticker}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            data-testid={`btn-mobile-open-details-${pos.ticker}`}
                            onClick={() => onSelectAssetDetails && onSelectAssetDetails(pos)}
                            className="font-black text-slate-950 dark:text-white text-base hover:text-emerald-600 dark:hover:text-emerald-400 text-left"
                            title="Ver Raio-X do ativo"
                          >
                            {pos.ticker}
                          </button>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                            {pos.market}
                          </span>
                          {hasCertificates && (
                            <button
                              type="button"
                              data-testid={`btn-mobile-expand-certificates-${pos.ticker}`}
                              onClick={() => handleToggleExpand(pos.assetId)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-200 dark:hover:bg-emerald-900 transition-colors cursor-pointer"
                              title="Clique para ver os títulos sob esta meta"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              <span>{pos.fixedIncomeCertificates?.length} {pos.fixedIncomeCertificates?.length === 1 ? 'título' : 'títulos'}</span>
                            </button>
                          )}
                          {pos.currency !== 'BRL' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 uppercase">
                              {pos.currency}
                            </span>
                          )}
                          {pos.institution && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {pos.institution}
                            </span>
                          )}
                          {(isFixedIncomeTaxExempt(pos.ticker) || isFixedIncomeTaxExempt(pos.name)) && (
                            <span
                              data-testid={`badge-tax-exempt-mobile-${pos.ticker}`}
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              title="Ativo de Renda Fixa com Isenção de IRPF para Pessoa Física"
                            >
                              Isento IR
                            </span>
                          )}
                          {auditAssetCalibration(pos) !== null && onCalibrateAsset && (
                            <button
                              type="button"
                              data-testid={`badge-calibrate-mobile-${pos.ticker}`}
                              onClick={() => onCalibrateAsset(pos)}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors"
                              title="Clique para calibrar dados pendentes"
                            >
                              ⚠️ Calibrar
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                          {pos.name} • {pos.category}
                        </div>
                      </div>
                      <div className="flex items-start gap-1 shrink-0">
                        <div className="text-right">
                          <div className="text-base font-black text-slate-950 dark:text-white">
                            {isBalanceOnly ? (
                              formatCurrencyBRL(pos.currentValueBRL)
                            ) : pos.currentValueBRL !== null ? (
                              formatCurrencyBRL(pos.currentValueBRL)
                            ) : (
                              <div>
                                <span className="text-slate-400 dark:text-slate-500 font-normal italic text-xs block">— (Sem cotação)</span>
                                {pos.totalInvestedBRL !== null && (
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold block">
                                    Custo: {formatCurrencyBRL(pos.totalInvestedBRL)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {isBalanceOnly ? (
                              pos.fixedIncomeIsNetBalance ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                  Saldo Líquido
                                </span>
                              ) : pos.fixedIncomeDetails && pos.fixedIncomeDetails.taxAmountBRL > 0 ? (
                                <span title={`Líquido estimado: ${formatCurrencyBRL(pos.fixedIncomeDetails.netValueBRL)}`}>
                                  Saldo Bruto (Líq: {formatCurrencyBRL(pos.fixedIncomeDetails.netValueBRL)})
                                </span>
                              ) : (
                                'Saldo'
                              )
                            ) : pos.currentPriceOriginal !== null ? (
                              `Cotação: ${formatCurrencyOriginal(pos.currentPriceOriginal, pos.currency)}`
                            ) : (
                              'Sem cotação'
                            )}
                          </div>
                        </div>

                        {/* Botão e Dropdown de Ações Mobile */}
                        <div className="relative">
                          <button
                            type="button"
                            data-testid={`asset-action-menu-mobile-btn-${pos.ticker}`}
                            onClick={() => setOpenMenuAssetId(openMenuAssetId === pos.assetId ? null : pos.assetId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Opções do ativo"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuAssetId === pos.assetId && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setOpenMenuAssetId(null)}
                              />
                              <div
                                data-testid={`asset-mobile-dropdown-${pos.ticker}`}
                                className="absolute right-0 top-8 z-30 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-1.5 text-left text-xs space-y-0.5"
                              >
                                {onCalibrateAsset && (auditAssetCalibration(pos) !== null || (pos.market === 'RF' || pos.category.toLowerCase().includes('renda fixa') || Boolean(pos.fixedIncomeCertificates?.length))) && (
                                  <button
                                    type="button"
                                    data-testid={`btn-mobile-calibrate-asset-${pos.ticker}`}
                                    onClick={() => {
                                      setOpenMenuAssetId(null);
                                      onCalibrateAsset(pos);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-bold transition-colors"
                                  >
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                                    <span>{pos.fixedIncomeCertificates && pos.fixedIncomeCertificates.length > 0 ? 'Gerenciar Títulos' : 'Calibrar Ativo'}</span>
                                  </button>
                                )}
                                {onSelectAssetDetails && (
                                  <button
                                    type="button"
                                    data-testid={`btn-mobile-details-asset-${pos.ticker}`}
                                    onClick={() => {
                                      setOpenMenuAssetId(null);
                                      onSelectAssetDetails(pos);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Raio-X do Ativo</span>
                                  </button>
                                )}
                                {onEditAsset && (
                                  <button
                                    type="button"
                                    data-testid={`btn-mobile-edit-asset-${pos.ticker}`}
                                    onClick={() => {
                                      setOpenMenuAssetId(null);
                                      onEditAsset(getAssetForAction(pos));
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                    <span>Editar Ativo</span>
                                  </button>
                                )}
                                {onAddMovementForAsset && (
                                  <button
                                    type="button"
                                    data-testid={`btn-mobile-movement-asset-${pos.ticker}`}
                                    onClick={() => {
                                      setOpenMenuAssetId(null);
                                      onAddMovementForAsset(pos.assetId);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors"
                                  >
                                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                    <span>Novo Lançamento</span>
                                  </button>
                                )}
                                {onDeleteAsset && (
                                  <button
                                    type="button"
                                    data-testid={`btn-mobile-delete-asset-${pos.ticker}`}
                                    onClick={() => {
                                      setOpenMenuAssetId(null);
                                      onDeleteAsset(getAssetForAction(pos));
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Excluir Ativo</span>
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Quantidade</span>
                        {isBalanceOnly ? (
                          <span className="text-amber-800 dark:text-amber-300 font-medium bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded text-[11px]">
                            Apenas Saldo
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-900 dark:text-white">{formatQuantity(pos.quantity)}</span>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Preço Médio</span>
                        {hasUnknownCost ? (
                          <span className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">Desconhecido</span>
                        ) : (
                          <span className="font-semibold text-slate-900 dark:text-white">{formatCurrencyBRL(pos.avgCostBRL)}</span>
                        )}
                      </div>
                    </div>

                    {meta && meta.quoteStatus !== 'UP_TO_DATE' && (
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Cotação {meta.quoteStatus === 'STALE' ? 'desatualizada' : meta.quoteStatus.toLowerCase()}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Ganho/perda não realizado</span>
                      {hasRentability && pos.unrealizedPnLBRL !== null && pos.unrealizedPnLPercent !== null ? (
                        <span
                          className={`font-bold ${
                            pos.unrealizedPnLBRL >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                          }`}
                        >
                          {pos.unrealizedPnLBRL >= 0 ? '+' : ''}{formatCurrencyBRL(pos.unrealizedPnLBRL)} (Retorno: {formatPercent(pos.unrealizedPnLPercent, true)})
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">
                          {isBalanceOnly || hasUnknownCost ? '— (Sem PM)' : '— (Sem cotação)'}
                        </span>
                      )}
                    </div>

                    {/* Acordeão Mobile com títulos da mesma meta */}
                    {hasCertificates && isExpanded && (
                      <div
                        data-testid={`mobile-expanded-certificates-${pos.ticker}`}
                        className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2 animate-fade-in"
                      >
                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <span>Títulos sob esta meta ({pos.fixedIncomeCertificates?.length})</span>
                          <span>Consolidado</span>
                        </div>
                        <div className="space-y-1.5">
                          {pos.fixedIncomeCertificates?.map((cert) => {
                            const sharePercent = pos.currentValueBRL > 0
                              ? ((cert.balance / pos.currentValueBRL) * 100).toFixed(1)
                              : '0.0';
                            return (
                              <div
                                key={cert.id}
                                className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                                  <span className="truncate">{cert.name}</span>
                                  <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                                    {formatCurrencyBRL(cert.balance)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                  <span>
                                    {cert.institution || '—'} • {cert.indexation || 'CDI'}{' '}
                                    {cert.ratePercent !== undefined ? `${cert.ratePercent}%` : ''}
                                  </span>
                                  <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                                    {sharePercent}% da meta
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                                  <span>
                                    {cert.startDate ? `Apl: ${formatDateBR(cert.startDate)} • ` : ''}
                                    Venc: {cert.maturityDate ? formatDateBR(cert.maturityDate) : '—'}
                                  </span>
                                  <span>
                                    {cert.quantity !== undefined && cert.quantity > 0 ? `${cert.quantity} tit. • ` : ''}
                                    {cert.isNetBalance ? 'Saldo Líquido' : 'Saldo Bruto'}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Rodapé e Barra de Ações Rápidas da Custódia */}
      <div
        data-testid="positions-card-footer"
        className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
          <span>Custódia ativa:</span>
          <span className="font-bold text-slate-950 dark:text-white">
            {formatCurrencyBRL(totalFilteredValueBRL)}
          </span>
          <span>•</span>
          <span>
            {filteredPositions.length} {filteredPositions.length === 1 ? 'posição' : 'posições'}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onOpenImport && (
            <button
              type="button"
              data-testid="btn-custody-import-b3"
              onClick={onOpenImport}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Importar B3</span>
            </button>
          )}
          {onOpenNewAsset && (
            <button
              type="button"
              data-testid="btn-custody-add-asset"
              onClick={onOpenNewAsset}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-950 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white transition-colors shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400 dark:text-white" />
              <span>Novo Ativo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
