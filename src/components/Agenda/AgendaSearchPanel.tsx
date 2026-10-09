import React from 'react';
import { Search, X, RefreshCw, Check, ChevronRight, Trash2 } from 'lucide-react';
import type { AgendaCommitment } from '../../services/agendaService';
import {
  DAYS_SHORT,
  MONTHS,
  tsToDate,
  commitmentTimeLabel,
} from '../../agenda/agendaTypes';

interface AgendaSearchPanelProps {
  show: boolean;
  searchQuery: string;
  isSearching: boolean;
  searchResults: AgendaCommitment[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onChangeQuery: (query: string) => void;
  onClearQuery: () => void;
  onSelectResult: (c: AgendaCommitment) => void;
  onToggleCommitment: (id: string, completed: boolean) => void;
  onOpenDeleteConfirm: (id: string, title: string) => void;
}

export const AgendaSearchPanel: React.FC<AgendaSearchPanelProps> = ({
  show,
  searchQuery,
  isSearching,
  searchResults,
  searchInputRef,
  onClose,
  onChangeQuery,
  onClearQuery,
  onSelectResult,
  onToggleCommitment,
  onOpenDeleteConfirm,
}) => {
  if (!show) return null;

  return (
    <section data-testid="agenda-search-panel" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-card dark:shadow-none p-4 sm:p-5 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Search size={16} className="text-sky-600 dark:text-sky-400" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-300">
            Pesquisar na Agenda
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 -mr-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Fechar pesquisa"
          data-testid="agenda-search-close"
        >
          <X size={16} />
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="Digite palavras-chave (ex: catequese, médico, condomínio)..."
          data-testid="agenda-search-input"
          autoFocus
          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/30 outline-none transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onClearQuery}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg"
            aria-label="Limpar pesquisa"
            data-testid="agenda-search-clear"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isSearching ? (
        <div className="flex items-center justify-center py-8 text-slate-400 dark:text-slate-500 gap-2 text-xs font-semibold">
          <RefreshCw size={15} className="animate-spin text-sky-600 dark:text-sky-400" />
          <span>Buscando compromissos...</span>
        </div>
      ) : !searchQuery.trim() ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 space-y-1">
          <Search size={24} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Busque por qualquer compromisso</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Digite palavras-chave para encontrar compromissos em qualquer data.</p>
        </div>
      ) : searchResults.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 space-y-1">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Nenhum compromisso encontrado para &quot;{searchQuery.trim()}&quot;.</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Tente buscar por termos mais simples ou palavras sem pontuação.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {searchResults.length} {searchResults.length === 1 ? 'compromisso encontrado' : 'compromissos encontrados'}:
          </p>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[60vh] overflow-y-auto">
            {searchResults.map((c) => {
              const d = tsToDate(c.date);
              const dayLabel = `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
              return (
                <div
                  key={c.id || `${c.title}_${d.getTime()}`}
                  className="flex items-center gap-3 py-3 px-2 rounded-xl hover:bg-sky-50/50 dark:hover:bg-slate-800/60 group transition cursor-pointer"
                  onClick={() => onSelectResult(c)}
                  title="Clique para ir até este dia no caderno"
                  data-testid={`agenda-search-result-${c.id}`}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (c.id) onToggleCommitment(c.id, !c.completed);
                    }}
                    className={`shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                      c.completed
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-sky-400'
                    }`}
                    aria-label="Marcar/desmarcar"
                  >
                    {c.completed && <Check size={10} strokeWidth={3} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-tight text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-md">
                        {dayLabel}
                      </span>
                      {commitmentTimeLabel(c) && (
                        <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400">
                          {commitmentTimeLabel(c)}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-bold mt-0.5 break-words ${c.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                      {c.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs font-black text-sky-600 dark:text-sky-400 group-hover:underline flex items-center gap-1">
                      Ver no caderno
                      <ChevronRight size={14} />
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (c.id) onOpenDeleteConfirm(c.id, c.title);
                      }}
                      className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg p-1.5 transition-all"
                      title="Excluir"
                      aria-label="Excluir compromisso"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default AgendaSearchPanel;
