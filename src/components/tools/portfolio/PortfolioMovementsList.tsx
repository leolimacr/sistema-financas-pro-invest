import React, { useState, useMemo } from 'react';
import { Ban, AlertTriangle, CheckCircle2, History, Search, X, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { PortfolioMovement, PortfolioAsset, MovementType } from '../../../core/portfolio/portfolioTypes';
import { formatCurrencyBRL, formatCurrencyOriginal, formatQuantity } from './portfolioViewUtils';

interface PortfolioMovementsListProps {
  movements: PortfolioMovement[];
  assets: PortfolioAsset[];
  onVoidMovement?: (movementId: string, reason?: string) => Promise<void>;
}

type MovementCategoryFilter = 'ALL' | 'BUY' | 'SELL' | 'PROVENTOS' | 'INITIAL' | 'OTHERS';

const TYPE_CONFIG: Record<MovementType, { label: string; color: string }> = {
  INITIAL_POSITION: { label: 'Posição Inicial', color: 'bg-amber-100 text-amber-900 border-amber-300' },
  BUY: { label: 'Compra', color: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  SELL: { label: 'Venda', color: 'bg-blue-100 text-blue-900 border-blue-300' },
  DIVIDEND: { label: 'Dividendo', color: 'bg-purple-100 text-purple-900 border-purple-300' },
  INTEREST: { label: 'JCP / Juros', color: 'bg-violet-100 text-violet-900 border-violet-300' },
  SPLIT_OR_BONUS: { label: 'Desdobr. / Bonif.', color: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  ADJUSTMENT: { label: 'Ajuste', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  FEE_OR_TAX: { label: 'Taxa / Imposto', color: 'bg-rose-100 text-rose-900 border-rose-300' },
  EXTERNAL_DEPOSIT: { label: 'Aporte Externo', color: 'bg-teal-100 text-teal-900 border-teal-300' },
  EXTERNAL_WITHDRAWAL: { label: 'Resgate Externo', color: 'bg-amber-100 text-amber-900 border-amber-300' },
};

const PAGE_SIZE = 15;

export const PortfolioMovementsList: React.FC<PortfolioMovementsListProps> = ({
  movements,
  assets,
  onVoidMovement,
}) => {
  const [movementToVoid, setMovementToVoid] = useState<PortfolioMovement | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de Filtros e Busca
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<MovementCategoryFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE_ONLY'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Mapeamento de ativo
  const assetMap = useMemo(() => {
    const map = new Map<string, PortfolioAsset>();
    assets.forEach((a) => map.set(a.id, a));
    return map;
  }, [assets]);

  // Ordenação decrescente de data
  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => b.date.localeCompare(a.date));
  }, [movements]);

  // Contadores por tipo de movimentação
  const typeCounts = useMemo(() => {
    const counts = {
      BUY: 0,
      SELL: 0,
      PROVENTOS: 0,
      INITIAL: 0,
      OTHERS: 0,
    };
    sortedMovements.forEach((m) => {
      if (m.type === 'BUY') counts.BUY++;
      else if (m.type === 'SELL') counts.SELL++;
      else if (m.type === 'DIVIDEND' || m.type === 'INTEREST') counts.PROVENTOS++;
      else if (m.type === 'INITIAL_POSITION') counts.INITIAL++;
      else counts.OTHERS++;
    });
    return counts;
  }, [sortedMovements]);

  // Filtragem
  const filteredMovements = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return sortedMovements.filter((m) => {
      // Filtro de Status
      if (statusFilter === 'ACTIVE_ONLY' && m.status === 'VOIDED') {
        return false;
      }

      // Filtro de Tipo
      if (selectedType === 'BUY' && m.type !== 'BUY') return false;
      if (selectedType === 'SELL' && m.type !== 'SELL') return false;
      if (selectedType === 'PROVENTOS' && m.type !== 'DIVIDEND' && m.type !== 'INTEREST') return false;
      if (selectedType === 'INITIAL' && m.type !== 'INITIAL_POSITION') return false;
      if (
        selectedType === 'OTHERS' &&
        ['BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'INITIAL_POSITION'].includes(m.type)
      ) {
        return false;
      }

      // Busca Textual
      if (term) {
        const asset = assetMap.get(m.assetId);
        const matchesTicker = asset?.ticker ? asset.ticker.toLowerCase().includes(term) : false;
        const matchesName = asset?.name ? asset.name.toLowerCase().includes(term) : false;
        const matchesDate = m.date.includes(term);
        const typeLabel = TYPE_CONFIG[m.type]?.label?.toLowerCase() || '';
        const matchesType = typeLabel.includes(term);

        if (!matchesTicker && !matchesName && !matchesDate && !matchesType) {
          return false;
        }
      }

      return true;
    });
  }, [sortedMovements, assetMap, selectedType, statusFilter, searchTerm]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(filteredMovements.length / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedMovements = useMemo(() => {
    const start = (effectivePage - 1) * PAGE_SIZE;
    return filteredMovements.slice(start, start + PAGE_SIZE);
  }, [filteredMovements, effectivePage]);

  // Reset de página ao alterar filtros
  const handleTypeChange = (type: MovementCategoryFilter) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleConfirmVoid = async () => {
    if (!movementToVoid || !onVoidMovement) return;
    try {
      setIsSubmitting(true);
      await onVoidMovement(movementToVoid.id, voidReason.trim() || 'Estornado pelo usuário');
      setMovementToVoid(null);
      setVoidReason('');
    } catch (err) {
      console.error('Erro ao anular movimentação:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (movements.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center mx-auto mb-3">
          <History className="w-6 h-6" />
        </div>
        <h4 className="font-bold text-slate-800 dark:text-white text-base">Livro Razão Sem Lançamentos</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
          Nenhuma movimentação foi registrada ainda. Utilize os botões de ação para cadastrar posições iniciais, compras ou importar planilhas.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
      {/* Cabeçalho do Livro Razão */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-950 dark:text-white text-base md:text-lg">
              Livro Razão Contábil (Movimentações)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {filteredMovements.length} de {movements.length}{' '}
              {movements.length === 1 ? 'registro' : 'registros'} auditáveis
            </p>
          </div>

          {/* Toggle de Lançamentos Anulados */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setStatusFilter((prev) => (prev === 'ALL' ? 'ACTIVE_ONLY' : 'ALL'));
                setCurrentPage(1);
              }}
              className={`text-xs font-bold px-3 py-1 rounded-xl border transition-all ${
                statusFilter === 'ACTIVE_ONLY'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {statusFilter === 'ACTIVE_ONLY' ? 'Ocultando Anulados' : 'Mostrando Todos (incl. Anulados)'}
            </button>
          </div>
        </div>

        {/* Barra de Busca e Filtros de Tipo */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por ativo, data (YYYY-MM-DD) ou tipo..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs md:text-sm font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtros em Pílulas de Tipo */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => handleTypeChange('ALL')}
              className={`px-3 py-1 rounded-lg font-bold border transition-all shrink-0 ${
                selectedType === 'ALL'
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              Todas ({movements.length})
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('BUY')}
              className={`px-3 py-1 rounded-lg font-bold border transition-all shrink-0 ${
                selectedType === 'BUY'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Compras ({typeCounts.BUY})
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('SELL')}
              className={`px-3 py-1 rounded-lg font-bold border transition-all shrink-0 ${
                selectedType === 'SELL'
                  ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Vendas ({typeCounts.SELL})
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('PROVENTOS')}
              className={`px-3 py-1 rounded-lg font-bold border transition-all shrink-0 ${
                selectedType === 'PROVENTOS'
                  ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Proventos ({typeCounts.PROVENTOS})
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('INITIAL')}
              className={`px-3 py-1 rounded-lg font-bold border transition-all shrink-0 ${
                selectedType === 'INITIAL'
                  ? 'bg-amber-700 text-white border-amber-700 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              Posição Inicial ({typeCounts.INITIAL})
            </button>
            {typeCounts.OTHERS > 0 && (
              <button
                type="button"
                onClick={() => handleTypeChange('OTHERS')}
                className={`px-3 py-1 rounded-lg font-bold border transition-all shrink-0 ${
                  selectedType === 'OTHERS'
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Outros ({typeCounts.OTHERS})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Estado Vazio de Busca */}
      {filteredMovements.length === 0 && (
        <div className="p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhuma movimentação encontrada para os filtros selecionados.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedType('ALL');
              setStatusFilter('ALL');
              setCurrentPage(1);
            }}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Limpar filtros e exibir todas as movimentações
          </button>
        </div>
      )}

      {/* Tabela Desktop */}
      {filteredMovements.length > 0 && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3.5 px-4">Data</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Ativo</th>
                <th className="py-3.5 px-4 text-right">Qtd</th>
                <th className="py-3.5 px-4 text-right">Preço Unit.</th>
                <th className="py-3.5 px-4 text-right">Valor Líquido (R$)</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedMovements.map((m) => {
                const asset = assetMap.get(m.assetId);
                const typeConfig = TYPE_CONFIG[m.type] || { label: m.type, color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' };
                const isVoided = m.status === 'VOIDED';

                return (
                  <tr
                    key={m.id}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${isVoided ? 'opacity-60 bg-slate-50/50 dark:bg-slate-800/30' : ''}`}
                    data-testid={`movement-row-${m.id}`}
                  >
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">{m.date}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded border ${typeConfig.color}`}
                      >
                        {typeConfig.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-slate-950 dark:text-white">
                        {asset?.ticker || 'Ativo Removido'}
                      </span>
                      {asset?.name && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 block truncate max-w-[180px]">
                          {asset.name}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                      {m.quantity !== null ? formatQuantity(m.quantity) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700 dark:text-slate-300">
                      {formatCurrencyOriginal(m.unitPrice, m.currency)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-950 dark:text-white">
                      <span className={isVoided ? 'line-through text-slate-400 dark:text-slate-500' : ''}>
                        {formatCurrencyBRL(m.netAmountBRL)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {isVoided ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 px-2 py-0.5 rounded">
                          <Ban className="w-3 h-3" /> Anulado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3" /> Ativo
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!isVoided && onVoidMovement && (
                        <button
                          type="button"
                          onClick={() => setMovementToVoid(m)}
                          className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-red-700 dark:hover:text-red-400 px-2.5 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 border border-transparent hover:border-red-200 dark:hover:border-red-900 transition-colors"
                          title="Anular lançamento mantendo rastro contábil"
                        >
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards Mobile (< 768px) */}
      {filteredMovements.length > 0 && (
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {paginatedMovements.map((m) => {
            const asset = assetMap.get(m.assetId);
            const typeConfig = TYPE_CONFIG[m.type] || { label: m.type, color: 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200' };
            const isVoided = m.status === 'VOIDED';

            return (
              <div
                key={m.id}
                className={`p-4 space-y-2.5 ${isVoided ? 'opacity-60 bg-slate-50/50 dark:bg-slate-800/30' : ''}`}
                data-testid={`movement-card-${m.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${typeConfig.color}`}>
                      {typeConfig.label}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{m.date}</span>
                  </div>
                  <div>
                    {isVoided ? (
                      <span className="text-[10px] font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900">
                        Anulado
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                        Ativo
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="font-black text-slate-950 dark:text-white text-base">
                      {asset?.ticker || 'Ativo Removido'}
                    </span>
                    {asset?.name && <span className="text-xs text-slate-500 dark:text-slate-400 block">{asset.name}</span>}
                  </div>
                  <div className="text-right">
                    <div
                      className={`font-black text-slate-950 dark:text-white text-base ${isVoided ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}
                    >
                      {formatCurrencyBRL(m.netAmountBRL)}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {m.quantity !== null && `${formatQuantity(m.quantity)} un. • `}
                      {formatCurrencyOriginal(m.unitPrice, m.currency)}
                    </div>
                  </div>
                </div>

                {!isVoided && onVoidMovement && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setMovementToVoid(m)}
                      className="text-xs font-bold text-red-700 dark:text-red-400 hover:text-red-800 px-3 py-1 rounded-lg bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                    >
                      Anular Lançamento
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Barra de Paginação Leve */}
      {totalPages > 1 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p data-testid="pagination-info" className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Página <span className="text-slate-900 dark:text-white font-bold">{effectivePage}</span> de{' '}
            <span className="text-slate-900 dark:text-white font-bold">{totalPages}</span> ({filteredMovements.length} registros)
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={effectivePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>
            <button
              type="button"
              disabled={effectivePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              Próxima
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Anulação */}
      {movementToVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl border-2 border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-700 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950 dark:text-white">Confirmar Estorno / Anulação</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Rigor contábil soberano</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              No Finanças Pro Invest, movimentações não são apagadas sem rastro. O lançamento será marcado como{' '}
              <strong>ANULADO</strong>, recalculando imediatamente a posição e o preço médio deste ativo.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Motivo da Anulação (Opcional):
              </label>
              <input
                type="text"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Ex: Erro de digitação na quantidade ou preço"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMovementToVoid(null)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmVoid}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-red-700 hover:bg-red-800 rounded-xl transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Anulando...' : 'Confirmar Anulação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
