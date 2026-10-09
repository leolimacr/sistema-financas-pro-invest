import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Info, RefreshCw, Plus, CalendarPlus, CalendarClock } from 'lucide-react';

interface DashboardHeaderProps {
  showBackToTools: boolean;
  onNavigate?: (page: string) => void;
  periodLabel: string;
  streak: number;
  monthlyConsistency: { current: number; total: number };
  isMobile: boolean;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  onOpenForm: () => void;
  handleRecurringButtonClick: () => void;
  onFutureExpenseClick?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  showBackToTools,
  onNavigate,
  periodLabel,
  streak,
  monthlyConsistency,
  isMobile,
  isPrivacyMode,
  onTogglePrivacy,
  onOpenForm,
  handleRecurringButtonClick,
  onFutureExpenseClick,
  onRefresh,
  isRefreshing,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showFutureTooltip, setShowFutureTooltip] = useState(false);
  const [showRefreshTooltip, setShowRefreshTooltip] = useState(false);
  const [showPrivacyTooltip, setShowPrivacyTooltip] = useState(false);
  const [showStreakTooltip, setShowStreakTooltip] = useState(false);
  const [showMonthlyTooltip, setShowMonthlyTooltip] = useState(false);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const handleScroll = () => {
      setIsScrolled(main.scrollTop > 20);
    };
    main.addEventListener('scroll', handleScroll, { passive: true });
    return () => main.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Barra Fixa Invisível para Título CONTROLA (Mobile Only) */}
      <div className={`fixed top-[calc(4rem+env(safe-area-inset-top))] left-0 z-[100] md:hidden h-14 w-full px-4 flex items-center bg-transparent pointer-events-none transition-all duration-300 ${isScrolled ? 'opacity-5' : 'opacity-100'}`}>
        <div className="flex items-center gap-3 pointer-events-auto">
          <img
            src="/assets/images/brand/icone_controla210726.png"            alt="Ícone do Controla"
            className="w-9 h-9 rounded-xl shadow-md border border-emerald-200/50 bg-white object-cover"
          />
          <h2 className="text-3xl font-black tracking-tight uppercase leading-tight bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)]">
            Controla
          </h2>
        </div>
      </div>

      {/* HEADER DO GERENCIADOR */}
      {showBackToTools && onNavigate && (
        <button
          onClick={() => {
            onNavigate('home');
            setTimeout(() => {
              document.getElementById('secao-ferramentas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }}
          className="hidden md:flex mb-4 items-center gap-2 text-text-muted dark:text-slate-400 hover:text-brand-secondary transition-all font-black uppercase text-xxs tracking-ultra-wide"
        >
          ← Voltar
        </button>
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/assets/images/brand/icone_controla210726.png"            alt="Ícone do Controla"
            className="hidden md:block w-8 h-8 md:w-9 md:h-9 rounded-xl shadow-soft border border-surface-elevated dark:border-slate-700 bg-surface-primary dark:bg-slate-800 object-cover"
          />
          <div className="flex flex-col">
            <h2 className="hidden md:block text-lg md:text-2xl font-black text-text-primary dark:text-white tracking-tight uppercase leading-tight">
              Controla
            </h2>
            <div className="flex items-center gap-2">
              <p className="text-text-muted dark:text-slate-400 text-xxs md:text-xs font-bold uppercase tracking-ultra-wide">
                {periodLabel}
              </p>
              <div className="flex items-center gap-2">
                {streak > 1 && (
                  <div className="relative">
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-0.5 bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 rounded-full animate-in fade-in slide-in-from-top-1 cursor-help"
                      onMouseEnter={() => !isMobile && setShowStreakTooltip(true)}
                      onMouseLeave={() => setShowStreakTooltip(false)}
                      onFocus={() => setShowStreakTooltip(true)}
                      onBlur={() => setShowStreakTooltip(false)}
                      tabIndex={0}
                      role="tooltip"
                      aria-label="Dias de consistência: dias consecutivos com registro"
                    >
                      <span className="text-text-muted dark:text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none">
                        {streak} dias · consistência
                      </span>
                    </div>
                    {!isMobile && showStreakTooltip && (
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[110] w-64 p-4 bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 pointer-events-none">
                        <p className="text-[11px] leading-relaxed text-text-secondary dark:text-slate-300 font-medium">
                          Dias de consistência: quantidade de dias consecutivos, incluindo hoje, em que você registrou pelo menos um lançamento no Controla.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="relative">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-0.5 bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 rounded-full animate-in fade-in slide-in-from-top-1 cursor-help"
                    onMouseEnter={() => !isMobile && setShowMonthlyTooltip(true)}
                    onMouseLeave={() => setShowMonthlyTooltip(false)}
                    onFocus={() => setShowMonthlyTooltip(true)}
                    onBlur={() => setShowMonthlyTooltip(false)}
                    tabIndex={0}
                    role="tooltip"
                    aria-label="Dias lançados no mês"
                  >
                    <span className="text-text-muted dark:text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest leading-none">
                      {monthlyConsistency.current}/{monthlyConsistency.total} no mês
                    </span>
                  </div>
                  {!isMobile && showMonthlyTooltip && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[110] w-64 p-4 bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 pointer-events-none">
                      <p className="text-[11px] leading-relaxed text-text-secondary dark:text-slate-300 font-medium">
                        Dias lançados no mês: quantidade de dias corridos deste mês em que houve pelo menos um lançamento. Ex.: {monthlyConsistency.current}/{monthlyConsistency.total} significa {monthlyConsistency.current} dias com registro em {monthlyConsistency.total} dias já decorridos no mês.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 self-start md:self-auto">
          {/* BOTÃO RECORRÊNCIAS */}
          <div className="relative">
            <button
              onClick={handleRecurringButtonClick}
              onMouseEnter={() => !isMobile && setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="p-2.5 md:p-3 rounded-3xl bg-surface-primary dark:bg-slate-800 border border-brand-accent/30 dark:border-amber-500/40 text-brand-accent dark:text-amber-400 hover:bg-brand-accent/10 dark:hover:bg-amber-950/30 hover:border-brand-accent/60 transition-all active:scale-95 shadow-soft"
              aria-label="Contas fixas e assinaturas"
            >
              <CalendarPlus size={18} />
            </button>

            {/* Tooltip Desktop */}
            {!isMobile && showTooltip && (
              <div className="absolute top-full mt-3 right-0 z-[110] w-64 p-4 bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 pointer-events-none">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-brand-secondary/10 rounded-lg text-brand-secondary">
                    <Info size={14} />
                  </div>
                  <span className="text-[10px] font-black text-text-primary dark:text-white uppercase tracking-widest">Planejamento Estratégico</span>
                </div>
                <p className="text-[11px] leading-relaxed text-text-secondary dark:text-slate-300 font-medium">
                  Este botão organiza seu futuro. Ao cadastrar contas fixas e assinaturas, o Controla projeta sua folga do mês para o fim do mês, evitando surpresas.
                </p>
              </div>
            )}
          </div>

          {/* BOTÃO AGENDAR DESPESA FUTURA */}
          {onFutureExpenseClick && (
            <div className="relative">
              <button
                onClick={onFutureExpenseClick}
                onMouseEnter={() => !isMobile && setShowFutureTooltip(true)}
                onMouseLeave={() => setShowFutureTooltip(false)}
                className="p-2.5 md:p-3 rounded-3xl bg-surface-primary dark:bg-slate-800 border border-blue-300/50 dark:border-blue-700/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:border-blue-400 transition-all active:scale-95 shadow-soft"
                aria-label="Agendar despesa futura"
              >
                <CalendarClock size={18} />
              </button>

              {!isMobile && showFutureTooltip && (
                <div className="absolute top-full mt-3 right-0 z-[110] w-64 p-4 bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 pointer-events-none">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1 bg-blue-100 dark:bg-blue-950/60 rounded-lg text-blue-700 dark:text-blue-400">
                      <Info size={14} />
                    </div>
                    <span className="text-[10px] font-black text-text-primary dark:text-white uppercase tracking-widest">Despesas Futuras</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-text-secondary dark:text-slate-300 font-medium">
                    Despesas pontuais que você sabe que vão acontecer, mas ainda não ocorreram. <strong className="text-text-primary dark:text-white">Não é para despesa recorrente</strong> — esse cadastro fica no botão <span className="text-brand-secondary font-bold">Contas recorrentes</span> ao lado.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* BOTÃO ATUALIZAR */}
          <div className="relative">
            <button
              onClick={onRefresh}
              onMouseEnter={() => !isMobile && setShowRefreshTooltip(true)}
              onMouseLeave={() => setShowRefreshTooltip(false)}
              disabled={isRefreshing}
              className="p-2.5 md:p-3 rounded-3xl bg-surface-primary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 text-text-muted dark:text-slate-400 hover:text-brand-secondary hover:border-brand-secondary transition-all active:scale-95 shadow-soft disabled:opacity-50"
              aria-label="Atualizar dados"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            {!isMobile && showRefreshTooltip && (
              <div className="absolute top-full mt-3 right-0 z-[110] w-64 p-4 bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 pointer-events-none">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-brand-secondary/10 rounded-lg text-brand-secondary">
                    <Info size={14} />
                  </div>
                  <span className="text-[10px] font-black text-text-primary dark:text-white uppercase tracking-widest">Atualizar</span>
                </div>
                <p className="text-[11px] leading-relaxed text-text-secondary dark:text-slate-300 font-medium">
                  Seus dados já sincronizam sozinhos, mas se algo parecer desatualizado, clique aqui para recarregar cartões, contas e faturas na hora.
                </p>
              </div>
            )}
          </div>

          {/* BOTÃO OLHINHO */}
          <div className="relative">
            <button
              onClick={onTogglePrivacy}
              onMouseEnter={() => !isMobile && setShowPrivacyTooltip(true)}
              onMouseLeave={() => setShowPrivacyTooltip(false)}
              className="p-2.5 md:p-3 rounded-3xl bg-surface-primary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white hover:border-text-muted transition-all active:scale-95 shadow-soft"
              aria-label={isPrivacyMode ? 'Desativar modo privado' : 'Ativar modo privado'}
            >
              {isPrivacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>

            {!isMobile && showPrivacyTooltip && (
              <div className="absolute top-full mt-3 right-0 z-[110] w-64 p-4 bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200 pointer-events-none">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1 bg-surface-tertiary dark:bg-slate-800 rounded-lg text-text-muted dark:text-slate-400">
                    <Info size={14} />
                  </div>
                  <span className="text-[10px] font-black text-text-primary dark:text-white uppercase tracking-widest">
                    {isPrivacyMode ? 'Mostrar valores' : 'Ocultar valores'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-text-secondary dark:text-slate-300 font-medium">
                  Útil se você está em um local público.
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onOpenForm}
            className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 rounded-3xl font-black text-xxs md:text-xs uppercase tracking-ultra-wide shadow-soft transition-transform active:scale-95 bg-brand-primary text-text-onBrand hover:bg-brand-primary/90 shadow-brand-glow"
          >
            <Plus size={16} />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default DashboardHeader;
