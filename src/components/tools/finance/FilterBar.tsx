import React, { useRef, useState } from 'react';
import { getFlowLabels } from '../../../theme/fpiVoiceGuide';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  FileText,
  FolderOpen,
  Search,
  X,
  Lock,
  Download,
} from 'lucide-react';
import type { HistoryViewMode } from '../../../utils/historyTimeGate';

interface FilterBarProps {
  selectedCategories: string[];
  setSelectedCategories: (cats: string[]) => void;
  typeFilter: 'all' | 'income' | 'expense';
  setTypeFilter: (type: 'all' | 'income' | 'expense') => void;
  categories: string[];
  viewMode: 'day' | 'month' | 'year' | 'all' | 'period';
  setViewMode: (mode: 'day' | 'month' | 'year' | 'all' | 'period') => void;
  changeDate: (offset: number) => void;
  periodLabel: string;
  onExportPDF: () => void;
  onExportCSV?: () => void;
  startDate: string;
  endDate: string;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  onOpenCategoryManager: () => void;
  onDateSelect: (date: string) => void;
  sortMode: 'date-desc' | 'date-asc' | 'category-asc' | 'category-desc';
  setSortMode: (mode: 'date-desc' | 'date-asc' | 'category-asc' | 'category-desc') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  commandMode?: boolean;
  historyLocked?: boolean;
  currentMonthStartIso?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({ 
  selectedCategories, 
  setSelectedCategories, 
  typeFilter,
  setTypeFilter,
  categories,
  viewMode,
  setViewMode,
  changeDate,
  periodLabel,
  onExportPDF,
  onExportCSV,
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  onOpenCategoryManager,
  onDateSelect,
  sortMode,
  setSortMode,
  searchQuery,
  setSearchQuery,
  commandMode,
  historyLocked,
  currentMonthStartIso,
}) => {
  const voice = getFlowLabels(commandMode);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [showCategories, setShowCategories] = useState(false);
  const handleLabelClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker();
    }
  };

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      const updated = selectedCategories.filter(c => c !== cat);
      setSelectedCategories(updated.length === 0 ? [] : updated);
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const isAllCategories = selectedCategories.length === 0;

  return (
    <div className="flex flex-col gap-4 bg-surface-primary dark:bg-slate-900 p-4 md:p-5 rounded-panel border border-slate-200 dark:border-slate-800 mb-4 shadow-panel">
      
      {/* BUSCA GLOBAL */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted dark:text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Pesquisar por descrição ou categoria..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-secondary dark:bg-slate-800/80 border border-surface-elevated dark:border-slate-700 rounded-3xl pl-10 pr-10 py-3 text-sm text-text-primary dark:text-white placeholder-text-muted dark:placeholder-slate-400 outline-none focus:border-brand-primary dark:focus:border-emerald-500 focus:bg-surface-primary dark:focus:bg-slate-900 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
      {searchQuery && (
        <p className="text-xxs text-brand-accent font-black uppercase tracking-ultra-wide -mt-2 px-1">
          {historyLocked
            ? 'Pesquisando no mês atual e futuro — histórico anterior no Pro'
            : 'Pesquisando em todos os períodos — filtro de data desativado'}
        </p>
      )}

      {/* SEÇÃO 1: CONTROLES DE DATA E PDF */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
             
             {/* 1.1 Modos de Visualização */}
             <div className="flex bg-surface-secondary dark:bg-slate-800 rounded-full p-1.5 w-full sm:w-auto justify-between border border-surface-elevated dark:border-slate-700 shadow-soft">
                {(['day', 'month', 'year', 'period', 'all'] as HistoryViewMode[]).map((mode) => {
                  const isRestricted = historyLocked && (mode === 'year' || mode === 'period' || mode === 'all');
                  return (
                    <button 
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`flex-1 sm:flex-none px-3 py-2 rounded-full text-xxs font-black uppercase transition-all duration-200 flex items-center justify-center gap-1 ${
                            viewMode === mode 
                            ? 'bg-emerald-700 text-text-onBrand shadow-panel scale-105' 
                            : isRestricted
                              ? 'text-text-muted dark:text-slate-400 hover:text-brand-secondary dark:hover:text-cyan-400'
                              : 'text-text-secondary dark:text-slate-300 hover:text-text-primary dark:hover:text-white'
                        }`}
                    >
                        {mode === 'day' ? 'Dia' : mode === 'month' ? 'Mês' : mode === 'year' ? 'Ano' : mode === 'period' ? 'Período' : 'Tudo'}
                        {isRestricted && <Lock size={10} className="opacity-70" />}
                    </button>
                  );
                })}
             </div>

             {/* 1.2 Navegação Rápida com Calendário ao Clicar */}
             {viewMode !== 'all' && viewMode !== 'period' && (
                                <div className="flex items-center justify-between w-full sm:w-auto bg-surface-subtle dark:bg-slate-800/60 p-1.5 rounded-section border border-slate-200 dark:border-slate-700 px-3 relative">
                                        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-surface-secondary dark:hover:bg-slate-700 rounded-2xl text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white transition-colors z-10">
                        <ChevronLeft size={20}/>
                    </button>
                    
                    <div 
                      onClick={handleLabelClick}
                      className="flex-1 min-w-[110px] text-center cursor-pointer hover:bg-surface-secondary dark:hover:bg-slate-700 rounded-xl py-1 transition-colors mx-1"
                    >
                        <span className="text-sm font-black text-text-primary dark:text-white capitalize tracking-tight">
                            {periodLabel}
                        </span>
                        <input 
                          ref={dateInputRef}
                          type="date"
                          min={historyLocked ? currentMonthStartIso : undefined}
                          className="absolute inset-0 opacity-0 w-full pointer-events-none"
                          onChange={(e) => onDateSelect(e.target.value)}
                        />
                    </div>

                    <button onClick={() => changeDate(1)} className="p-2 hover:bg-surface-secondary dark:hover:bg-slate-700 rounded-2xl text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white transition-colors z-10">
                        <ChevronRight size={20}/>
                    </button>
                </div>
             )}
          </div>

          {/* 1.3 Inputs Período */}
          {viewMode === 'period' && (
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto bg-surface-secondary dark:bg-slate-800 p-2 rounded-3xl border border-surface-elevated dark:border-slate-700 animate-in fade-in zoom-in duration-300">
                <div className="flex items-center justify-between w-full sm:w-auto gap-3 px-3">
                    <span className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase">De</span>
                    <input type="date" value={startDate} min={historyLocked ? currentMonthStartIso : undefined} onChange={(e) => setStartDate(e.target.value)} className="bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-700 rounded-2xl px-3 py-2 text-xs text-text-primary dark:text-white focus:outline-none focus:border-brand-primary h-10 shadow-soft" />
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto gap-3 px-3 border-t sm:border-t-0 sm:border-l border-surface-elevated dark:border-slate-700 pt-2 sm:pt-0 sm:pl-3">
                    <span className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase">Até</span>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-700 rounded-2xl px-3 py-2 text-xs text-text-primary dark:text-white focus:outline-none focus:border-brand-primary h-10 shadow-soft" />
                </div>
            </div>
          )}

          {/* 1.4 Botões de Exportação Soberana (PDF e CSV/Planilha) */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <button 
              type="button"
              onClick={onExportPDF}
              className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-3 rounded-3xl font-black bg-surface-primary dark:bg-slate-800 text-text-secondary dark:text-slate-200 hover:text-text-primary dark:hover:text-white hover:bg-surface-secondary dark:hover:bg-slate-700 border border-surface-elevated dark:border-slate-700 transition-all active:scale-95 shadow-soft"
              title="Gerar Relatório PDF"
            >
              <FileText size={15} className="text-action-primaryDark dark:text-emerald-400 shrink-0" />
              <span className="text-xxs uppercase tracking-ultra-wide">PDF</span>
              {historyLocked && <Lock size={10} className="text-amber-500 opacity-80" />}
            </button>

            {onExportCSV && (
              <button 
                type="button"
                onClick={onExportCSV}
                className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 px-4 py-3 rounded-3xl font-black bg-surface-primary dark:bg-slate-800 text-text-secondary dark:text-slate-200 hover:text-text-primary dark:hover:text-white hover:bg-surface-secondary dark:hover:bg-slate-700 border border-surface-elevated dark:border-slate-700 transition-all active:scale-95 shadow-soft"
                title="Exportar Planilha CSV (Excel)"
              >
                <Download size={15} className="text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="text-xxs uppercase tracking-ultra-wide">CSV</span>
                {historyLocked && <Lock size={10} className="text-amber-500 opacity-80" />}
              </button>
            )}
          </div>
      </div>

      {/* SEÇÃO 2: FILTRO POR TIPO (TUDO / RECEITAS / DESPESAS) */}
      <div className="w-full border-t border-surface-elevated dark:border-slate-800 pt-4 mt-1">
        <p className="text-[8px] font-bold text-text-muted dark:text-slate-400 uppercase tracking-widest mb-2 px-1">Tipo de lançamento</p>
        <div className="flex flex-col gap-3 px-1 mb-3">
            <div className="flex flex-wrap gap-2 justify-start">
                <button 
                    onClick={() => setTypeFilter('all')} 
                    className={`px-5 py-3 rounded-2xl text-xs font-black uppercase whitespace-nowrap border-2 transition-all duration-200 ${
                        typeFilter === 'all' 
                        ? 'bg-brand-secondary/10 dark:bg-brand-secondary/20 border-brand-secondary/30 text-sky-700 dark:text-sky-300 shadow-panel' 
                        : 'bg-surface-primary dark:bg-slate-800 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:border-text-muted'
                    }`}
                >
                    Tudo
                </button>
                <button 
                    onClick={() => setTypeFilter('income')} 
                    className={`px-5 py-3 rounded-2xl text-xs font-black uppercase whitespace-nowrap border-2 transition-all duration-200 ${
                        typeFilter === 'income' 
                        ? 'bg-status-success/10 dark:bg-emerald-950/30 border-brand-primary/30 text-action-primaryDark dark:text-emerald-400 shadow-panel' 
                        : 'bg-surface-elevated/50 dark:bg-slate-800/50 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700 hover:text-text-primary dark:hover:text-white'
                    }`}
                >
                    {voice.incomeFilter}
                </button>
                <button 
                    onClick={() => setTypeFilter('expense')} 
                    className={`px-5 py-3 rounded-2xl text-xs font-black uppercase whitespace-nowrap border-2 transition-all duration-200 ${
                        typeFilter === 'expense' 
                        ? 'bg-status-danger/10 dark:bg-red-950/30 border-status-danger/30 text-action-dangerDark dark:text-red-400 shadow-panel' 
                        : 'bg-surface-elevated/50 dark:bg-slate-800/50 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700 hover:text-text-primary dark:hover:text-white'
                    }`}
                >
                    {voice.expenseFilter}
                </button>
            </div>

            <p className="text-[8px] font-bold text-text-muted dark:text-slate-400 uppercase tracking-widest mb-2 px-1">Ordenar por</p>
            <div className="flex flex-wrap gap-2 justify-start">
                {[
                  { key: 'date-desc', label: 'Mais Recentes' },
                  { key: 'date-asc', label: 'Mais Antigos' },
                  { key: 'category-asc', label: 'Categoria A-Z' },
                  { key: 'category-desc', label: 'Categoria Z-A' }
                ].map(opt => (
                  <button
                      key={opt.key}
                      onClick={() => setSortMode(opt.key as any)}
                      className={`px-4 py-2.5 rounded-2xl text-xxs font-black uppercase whitespace-nowrap border transition-all duration-200 ${
                          sortMode === opt.key
                          ? 'bg-brand-accent/10 dark:bg-amber-950/30 border-brand-accent/30 text-action-amber dark:text-amber-400 shadow-soft'
                          : 'bg-surface-elevated/50 dark:bg-slate-800/50 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700 hover:text-text-primary dark:hover:text-white'
                      }`}
                  >
                      {opt.label}
                  </button>
                ))}
            </div>
        </div>
        
        {/* SEÇÃO 3: CATEGORIAS (multi-select) */}
        <div className="flex flex-col gap-3 justify-start px-1">
            <div className="flex flex-wrap items-center gap-2">
                <button 
                    onClick={onOpenCategoryManager}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xxs font-black uppercase bg-surface-primary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 text-action-primaryDark dark:text-emerald-400 hover:bg-brand-primary/10 dark:hover:bg-emerald-950/30 transition-all"
                >
                    <FolderOpen size={16} />
                    <span>Categorias</span>
                </button>

                <button
                    onClick={() => setShowCategories(!showCategories)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xxs font-black uppercase bg-surface-primary dark:bg-slate-800 border border-text-muted/30 dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:border-text-muted hover:text-text-primary dark:hover:text-white transition-all"
                >
                    {showCategories ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    <span>{showCategories ? 'Ocultar filtro' : 'Filtrar por categoria'}</span>
                </button>
                {!isAllCategories && (
                    <span className="px-3 py-2 rounded-2xl text-xxs font-black uppercase border border-brand-primary/20 dark:border-emerald-800/40 bg-brand-primary/10 dark:bg-emerald-950/30 text-action-primaryDark dark:text-emerald-400">
                        {selectedCategories.length} selecionada{selectedCategories.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {showCategories && (
                <div className="flex flex-wrap gap-2 justify-start animate-in fade-in duration-200">
                    <button 
                        onClick={() => setSelectedCategories([])} 
                        className={`px-4 py-2.5 rounded-2xl text-xxs font-black uppercase whitespace-nowrap border transition-all duration-200 ${
                            isAllCategories ? 'bg-brand-primary/10 dark:bg-emerald-950/30 border-brand-primary/30 text-action-primaryDark dark:text-emerald-400 shadow-soft' : 'bg-surface-elevated/50 dark:bg-slate-800/50 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700 hover:text-text-primary dark:hover:text-white'
                        }`}
                    >
                        Todas
                    </button>

                    {categories.map((cat: string) => (
                        <button 
                            key={cat} 
                            onClick={() => toggleCategory(cat)} 
                            className={`px-4 py-2.5 rounded-2xl text-xxs font-black uppercase whitespace-nowrap border transition-all duration-200 ${
                                selectedCategories.includes(cat) ? 'bg-brand-primary/10 dark:bg-emerald-950/30 border-brand-primary/30 text-action-primaryDark dark:text-emerald-400 shadow-soft' : 'bg-surface-elevated/50 dark:bg-slate-800/50 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700 hover:text-text-primary dark:hover:text-white'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
