import React, { useState, useMemo } from 'react';
import { Layers, Building2 } from 'lucide-react';
import type { PortfolioAllocationSummary } from '../../../core/portfolio/portfolioTypes';
import { formatCurrencyBRL, formatPercent } from './portfolioViewUtils';

interface DonutSliceItem {
  id: string;
  label: string;
  value: number;
  percentage: number;
  color: string;
}

const DONUT_PALETTE = [
  '#2563eb', // blue-600
  '#059669', // emerald-600
  '#7c3aed', // violet-600
  '#d97706', // amber-600
  '#0891b2', // cyan-600
  '#db2777', // pink-600
  '#4f46e5', // indigo-600
  '#ea580c', // orange-600
  '#0d9488', // teal-600
  '#64748b', // slate-500
  '#0284c7', // sky-600
  '#16a34a', // green-600
];

export interface PortfolioAllocationDonutProps {
  summary: PortfolioAllocationSummary;
  className?: string;
}

export const PortfolioAllocationDonut: React.FC<PortfolioAllocationDonutProps> = ({
  summary,
  className = '',
}) => {
  const [viewMode, setViewMode] = useState<'class' | 'institution'>('class');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { consolidatedTotalBRL, totalPortfolioCashBRL, categories, assets } = summary;

  // Montagem dos itens do Donut conforme o modo ativo
  const items: DonutSliceItem[] = useMemo(() => {
    const totalRef = consolidatedTotalBRL > 0 ? consolidatedTotalBRL : 1;

    if (viewMode === 'class') {
      // 1. Visão por Classe de Ativos
      const list: Array<{ id: string; label: string; value: number }> = [];

      categories.forEach((cat) => {
        if (cat.currentValueBRL > 0) {
          list.push({
            id: `cat-${cat.category}`,
            label: cat.category,
            value: cat.currentValueBRL,
          });
        }
      });

      // Se houver caixa que não esteja como categoria formal
      const hasCashCategory = categories.some(
        (c) => c.category.toLowerCase().includes('caixa') || c.category.toLowerCase().includes('cash')
      );
      if (totalPortfolioCashBRL > 0 && !hasCashCategory) {
        list.push({
          id: 'cat-cash-opportunity',
          label: 'Caixa da Carteira',
          value: totalPortfolioCashBRL,
        });
      }

      list.sort((a, b) => b.value - a.value);

      return list.map((item, idx) => ({
        id: item.id,
        label: item.label,
        value: item.value,
        percentage: (item.value / totalRef) * 100,
        color: DONUT_PALETTE[idx % DONUT_PALETTE.length],
      }));
    } else {
      // 2. Visão por Instituição Custodiante (Corretora)
      const institutionMap: Record<string, number> = {};

      assets.forEach((ast) => {
        const val = ast.currentValueBRL ?? 0;
        if (val > 0) {
          const inst = ast.institution?.trim() || 'Outras / Não informada';
          institutionMap[inst] = (institutionMap[inst] || 0) + val;
        }
      });

      // Se houver saldo em caixa sem corretora específica vinculada em ativos
      const assetsTotal = assets.reduce((sum, a) => sum + (a.currentValueBRL ?? 0), 0);
      const remainingCash = Math.max(0, consolidatedTotalBRL - assetsTotal);
      if (remainingCash > 0 && Object.keys(institutionMap).length === 0) {
        institutionMap['Caixa Líquido'] = remainingCash;
      }

      const list = Object.entries(institutionMap)
        .map(([name, val]) => ({
          id: `inst-${name}`,
          label: name,
          value: val,
        }))
        .sort((a, b) => b.value - a.value);

      return list.map((item, idx) => ({
        id: item.id,
        label: item.label,
        value: item.value,
        percentage: (item.value / totalRef) * 100,
        color: DONUT_PALETTE[idx % DONUT_PALETTE.length],
      }));
    }
  }, [viewMode, categories, totalPortfolioCashBRL, assets, consolidatedTotalBRL]);

  // Cálculos de Geometria SVG Donut
  const size = 220;
  const center = size / 2;
  const radius = 76;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  // Cálculo cumulativo de offsets para cada arco
  let cumulativeLength = 0;
  const slices = items.map((item, idx) => {
    const fraction = items.reduce((acc, it) => acc + it.value, 0) > 0
      ? item.value / items.reduce((acc, it) => acc + it.value, 0)
      : 0;
    const arcLength = fraction * circumference;
    const gap = items.length > 1 ? 2 : 0;
    const dash = Math.max(0, arcLength - gap);
    const dashArray = `${dash} ${circumference - dash}`;
    const dashOffset = -cumulativeLength;
    cumulativeLength += arcLength;

    return {
      ...item,
      dashArray,
      dashOffset,
      isHovered: hoveredIndex === idx,
    };
  });

  const activeItem = hoveredIndex !== null && items[hoveredIndex] ? items[hoveredIndex] : null;

  return (
    <div
      data-testid="portfolio-allocation-donut"
      className={`bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border-2 border-slate-200 dark:border-slate-800 shadow-sm ${className}`}
    >
      {/* 1. Cabeçalho com Alternador de Visão */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="font-black text-slate-950 dark:text-white text-base md:text-lg tracking-tight">
            Distribuição da Carteira
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Composição patrimonial visualizada por {viewMode === 'class' ? 'classe de ativos' : 'corretora custodiante'}
          </p>
        </div>

        {/* Segmented Control */}
        <div
          role="tablist"
          aria-label="Modo de visualização da distribuição"
          className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 self-start sm:self-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'class'}
            data-testid="donut-mode-class"
            onClick={() => {
              setViewMode('class');
              setHoveredIndex(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'class'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Por Classe
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'institution'}
            data-testid="donut-mode-institution"
            onClick={() => {
              setViewMode('institution');
              setHoveredIndex(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'institution'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Por Corretora
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs italic">
          Nenhuma alocação com saldo registrado para gerar a visualização gráfica.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-center gap-6">
          {/* 2. Donut SVG Nativo com Centro Dinâmico */}
          <div className="relative flex-shrink-0 flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90"
              role="img"
              aria-label={`Gráfico de rosca da distribuição por ${viewMode === 'class' ? 'classe' : 'corretora'}`}
            >
              {/* Círculo de fundo suave */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-100 dark:text-slate-800/60"
              />

              {/* Fatias Interativas */}
              {slices.map((slice, idx) => (
                <circle
                  key={slice.id}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={slice.isHovered ? strokeWidth + 6 : strokeWidth}
                  strokeDasharray={slice.dashArray}
                  strokeDashoffset={slice.dashOffset}
                  strokeLinecap="butt"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer transition-all duration-300"
                  style={{
                    opacity: hoveredIndex !== null && !slice.isHovered ? 0.35 : 1,
                  }}
                  data-testid={`donut-slice-${idx}`}
                />
              ))}
            </svg>

            {/* Centro Informativo do Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
              {activeItem ? (
                <div className="animate-fadeIn space-y-0.5">
                  <span
                    data-testid="donut-center-label"
                    className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px] block"
                  >
                    {activeItem.label}
                  </span>
                  <span
                    data-testid="donut-center-value"
                    className="text-base font-black text-slate-950 dark:text-white block leading-tight"
                  >
                    {formatCurrencyBRL(activeItem.value)}
                  </span>
                  <span
                    data-testid="donut-center-pct"
                    className="text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 text-white"
                    style={{ backgroundColor: activeItem.color }}
                  >
                    {formatPercent(activeItem.percentage)}
                  </span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <span
                    data-testid="donut-center-label"
                    className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block"
                  >
                    Patrimônio
                  </span>
                  <span
                    data-testid="donut-center-value"
                    className="text-base font-black text-slate-950 dark:text-white block leading-tight"
                  >
                    {formatCurrencyBRL(consolidatedTotalBRL)}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    {items.length} {viewMode === 'class' ? (items.length === 1 ? 'classe' : 'classes') : (items.length === 1 ? 'corretora' : 'corretoras')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* 3. Legenda Interativa Bidirecional */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {items.map((item, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <div
                  key={item.id}
                  data-testid={`donut-legend-item-${idx}`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 shadow-xs scale-[1.01]'
                      : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                  style={{
                    opacity: hoveredIndex !== null && !isHovered ? 0.45 : 1,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className="w-3 h-3 rounded-md flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.label}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-black text-slate-900 dark:text-white">
                      {formatPercent(item.percentage)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {formatCurrencyBRL(item.value)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
