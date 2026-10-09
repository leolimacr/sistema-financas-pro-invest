import React, { useState } from 'react';
import { getFlowLabels } from '../../../../theme/fpiVoiceGuide';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface CategorySummaryPanelProps {
  categorySummary: any[];
  categoryTransactionsMap: Map<string, any[]>;
  isPrivacyMode: boolean;
  commandMode?: boolean;
}

const CategorySummaryPanel: React.FC<CategorySummaryPanelProps> = ({
  categorySummary,
  categoryTransactionsMap,
  isPrivacyMode,
  commandMode,
}) => {
  const voice = getFlowLabels(commandMode);
  const [showCategorySummary, setShowCategorySummary] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  if (categorySummary.length === 0) return null;

  return (
    <div className="bg-surface-primary dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-section p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-text-primary dark:text-white font-black text-sm tracking-tight">Resumo por Categoria</h3>
          <p className="text-text-muted dark:text-slate-400 text-xxs font-bold uppercase tracking-ultra-wide mt-1">
            Visão consolidada dos lançamentos filtrados
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xxs text-text-muted dark:text-slate-400">
            {categorySummary.length} categoria{categorySummary.length !== 1 ? 's' : ''}
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCategorySummary(prev => {
                const next = !prev;
                if (!next) setOpenCategory(null);
                return next;
              });
            }}
            className={`px-4 py-2.5 rounded-2xl text-xxs font-black uppercase border transition-all ${
              showCategorySummary
                ? 'bg-surface-elevated dark:bg-slate-800 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700'
                : 'bg-status-success/10 border-brand-primary/30 text-action-primaryDark hover:bg-status-success/20'
            }`}
          >
            {showCategorySummary ? 'Ocultar Resumo por Categoria' : 'Mostrar Resumo por Categoria'}
          </button>
        </div>
      </div>

      {showCategorySummary && (
        <>
          <div className="space-y-3 mt-4">
            {categorySummary.map((cat) => {
              const isOpen = openCategory === cat.name;
              const catTransactions = categoryTransactionsMap.get(cat.name) || [];

              return (
                <div
                  key={cat.name}
                  className="bg-surface-secondary dark:bg-slate-800/60 border border-surface-elevated dark:border-slate-700 rounded-3xl overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenCategory(prev => (prev === cat.name ? null : cat.name))}
                    className="w-full p-4 text-left hover:bg-surface-elevated dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-text-primary dark:text-white">{cat.name}</p>
                        <p className="text-xxs font-bold uppercase tracking-ultra-wide text-text-muted dark:text-slate-400 mt-1">
                          {cat.count} lançamento{cat.count !== 1 ? 's' : ''}
                        </p>
                        <p className="text-xxs font-bold uppercase tracking-ultra-wide text-action-primaryDark mt-2">
                          {isOpen ? 'Toque para ocultar lançamentos' : 'Toque para visualizar lançamentos'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                        <div className="text-left sm:text-center">
                          <p className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase mb-1">{voice.income}</p>
                          <p className="text-sm font-black text-action-primaryDark">
                            {isPrivacyMode ? '••••' : `R$ ${cat.income.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </p>
                        </div>

                        <div className="text-left sm:text-center">
                          <p className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase mb-1">{voice.expense}</p>
                          <p className="text-sm font-black text-action-dangerDark">
                            {isPrivacyMode ? '••••' : `R$ ${cat.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </p>
                        </div>

                        <div className="text-left sm:text-center sm:border-l sm:border-surface-elevated dark:sm:border-slate-700 sm:pl-6">
                          <p className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase mb-1">Dinheiro que sobra</p>
                          <p className={`text-sm font-black ${cat.total >= 0 ? 'text-action-primaryDark' : 'text-action-dangerDark'}`}>
                            {isPrivacyMode ? '••••' : `R$ ${cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-surface-elevated dark:border-slate-700 bg-surface-primary dark:bg-slate-900 px-4 py-3">
                      {catTransactions.length === 0 ? (
                        <p className="text-xxs text-text-muted dark:text-slate-400 italic">Nenhum lançamento encontrado nesta categoria.</p>
                      ) : (
                        <div className="space-y-3">
                          {catTransactions.map((t: any) => (
                            <div
                              key={t.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-surface-elevated dark:border-slate-800 bg-surface-secondary dark:bg-slate-800/80 px-3 py-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-black text-text-primary dark:text-white break-words">
                                  {t.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-xxs font-bold uppercase tracking-ultra-wide text-text-muted dark:text-slate-400">
                                    {new Date(t.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                                  </span>
                                  <span className={`text-xxs font-black uppercase tracking-ultra-wide ${
                                    t.type === 'income' ? 'text-action-primaryDark' : 'text-action-dangerDark'
                                  }`}>
                                    {t.type === 'income' ? 'Entrada' : 'Saída'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-left sm:text-right">
                                <p className={`text-sm font-black ${
                                  t.type === 'income' ? 'text-action-primaryDark' : 'text-action-dangerDark'
                                }`}>
                                  {isPrivacyMode
                                    ? '••••'
                                    : `R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* BOTÃO OCULTAR NO RODAPÉ DO RESUMO */}
          <button
            type="button"
            onClick={() => {
              setShowCategorySummary(false);
              setOpenCategory(null);
            }}
            className="mt-2 flex items-center justify-center gap-2 px-5 py-3 rounded-3xl text-xxs font-black uppercase tracking-ultra-wide border transition-all active:scale-95 w-full sm:w-auto bg-surface-elevated dark:bg-slate-800 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700"
          >
            Ocultar Resumo por Categoria <ChevronUp size={16} />
          </button>
        </>
      )}
    </div>
  );
};

export default CategorySummaryPanel;
