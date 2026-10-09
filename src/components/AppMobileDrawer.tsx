import React, { useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  BarChart3,
  CreditCard,
  Compass,
  Settings,
  Sparkles,
  LogOut,
  ChevronRight,
  Crown,
  Share2,
  TrendingUp,
  ShieldCheck,
  Users,
  House,
  CalendarDays,
  Target,
  Layers,
  Brain,
  Sun,
  Moon,
} from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useEntitlement } from '../hooks/useEntitlement';
import { useTheme } from '../contexts/ThemeContext';
import type { UserMeta } from '../types';
import { usePixAudit } from '../contexts/PixAuditContext';
import { isSystemAdmin } from '../utils/adminCheck';

interface AppMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  userMeta: UserMeta | null | undefined;
  userDisplayName?: string | null;
  onLogout: () => void;
  onOpenCourse: (slug?: string) => void;
  onOpenPixAudit?: () => void;
  onOpenUsersManagement?: () => void;
}

const AppMobileDrawer: React.FC<AppMobileDrawerProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  userMeta,
  userDisplayName,
  onLogout,
  onOpenCourse,
  onOpenPixAudit,
  onOpenUsersManagement,
}) => {
  const { handleNavigate } = useNavigation();
  const { effectiveTier } = useEntitlement();
  const { pendingCount: pendingPixCount } = usePixAudit();
  const { resolvedTheme, toggleTheme } = useTheme();
  const hasPremium = effectiveTier === 'premium';

  if (!isOpen) return null;

  const displayName = isAuthenticated
    ? userMeta?.nickname || userDisplayName || 'Investidor'
    : 'Visitante';

  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'FP';

  const PREMIUM_TOOLS = new Set(['minhas-dividas', 'investimentos', 'passivos']);

  const go = (tool: string) => {
    onClose();
    if (!isAuthenticated) {
      handleNavigate('login');
      return;
    }
    if (PREMIUM_TOOLS.has(tool) && !hasPremium) {
      handleNavigate('pricing');
      return;
    }
    handleNavigate(tool);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Menu Soberano"
    >
      {/* Backdrop clicável (fecha a prateleira ao clicar fora / na lateral esquerda) */}
      <div
        data-testid="app-mobile-drawer-backdrop"
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Prateleira / Drawer alinhada à direita */}
      <div
        data-testid="app-mobile-drawer-content"
        className="relative z-10 w-80 max-w-[88%] h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* BLOCO 1: IDENTIDADE & BADGE DO PLANO */}
        <div className="px-6 pt-[max(1.75rem,calc(env(safe-area-inset-top)+1rem))] pb-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              Menu Soberano
            </span>
            <button
              onClick={onClose}
              className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors shadow-xs active:scale-95"
              title="Fechar Menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-black text-sm flex items-center justify-center shadow-md border-2 border-white dark:border-slate-700 shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-black text-slate-900 dark:text-white truncate uppercase tracking-tight">
                {displayName}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {effectiveTier === 'premium' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 text-[10px] font-black uppercase tracking-wider">
                    <Crown size={11} className="text-amber-600" /> Premium
                  </span>
                ) : effectiveTier === 'pro' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-700 text-[10px] font-black uppercase tracking-wider">
                    <Sparkles size={11} className="text-sky-600" /> Pro
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200/80 border border-slate-300 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                    Plano Gratuito
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ÁREA DE ROLAGEM COM OS BLOCOS 2, 3, 4 E 5 */}
        <div className="flex-1 px-4 py-5 flex flex-col gap-6 overflow-y-auto">
          
          {/* BLOCO 2: OPERAÇÃO DIÁRIA */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 px-2">
              Operação Diária
            </p>
            <div className="space-y-1.5">
              <button
                onClick={() => go('central')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <House size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    Central
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Soberania & Saldo Livre Real
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
              </button>

              <button
                onClick={() => go('manager')}
                className="w-full group relative p-px rounded-2xl bg-gradient-to-b from-amber-500/40 to-transparent transition-all active:scale-95 shadow-sm"
              >
                <div className="bg-white dark:bg-slate-800 rounded-[15px] p-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-sm">
                    <LayoutDashboard size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 text-left leading-tight">
                    <span className="block text-[8px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-0.5">
                      Rotina & Caixa
                    </span>
                    <span className="block text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Controla
                    </span>
                  </div>
                  <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-amber-600 dark:group-hover:text-amber-400" />
                </div>
              </button>

              <button
                onClick={() => go('agenda')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                  <CalendarDays size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    Agenda
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Compromissos & Vencimentos
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-sky-600 dark:group-hover:text-sky-400" />
              </button>

              <button
                onClick={() => go('dashboard')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:scale-105 transition-transform">
                  <BarChart3 size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    Dashboard do Mês
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Visão analítica mensal
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
              </button>
            </div>
          </div>

          {/* BLOCO 3: PATRIMÔNIO & DECISÕES */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 px-2">
              Patrimônio & Decisões
            </p>
            <div className="space-y-1.5">
              <button
                onClick={() => go('portfolio')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-slate-950 dark:bg-slate-800 text-emerald-400 group-hover:scale-105 transition-transform">
                  <Layers size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      Carteira Soberana
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 text-[8px] font-black uppercase tracking-wider">
                      V1
                    </span>
                  </div>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Alocação, Custódia & Livro Razão
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
              </button>

              <button
                onClick={() => go('investimentos')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <TrendingUp size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      Investimentos
                    </span>
                    {!hasPremium && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[8px] font-black uppercase tracking-wider">
                        <Crown size={9} /> Premium
                      </span>
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Carteira & Renda Passiva
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
              </button>

              <button
                onClick={() => go('passivos')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                  <Layers size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      Patrimônio & Passivos
                    </span>
                    {!hasPremium && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[8px] font-black uppercase tracking-wider">
                        <Crown size={9} /> Premium
                      </span>
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Balanço Patrimonial Líquido
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
              </button>

              <button
                onClick={() => go('minhas-dividas')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                  <CreditCard size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1 leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      Minhas Dívidas
                    </span>
                    {!hasPremium && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[8px] font-black uppercase tracking-wider">
                        <Crown size={9} /> Premium
                      </span>
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    Quitação & Amortização
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-rose-600 dark:group-hover:text-rose-400" />
              </button>

              <button
                onClick={() => go('metas')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform">
                  <Target size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    Metas
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Planejamento & Conquistas
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-teal-600 dark:group-hover:text-teal-400" />
              </button>
            </div>
          </div>

          {/* BLOCO 4: INTELIGÊNCIA & DESCOBERTA */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 px-2">
              Inteligência & Descoberta
            </p>
            <div className="space-y-1.5">
              <button
                onClick={() => go('chat')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50/50 dark:from-violet-950/40 dark:to-indigo-950/40 border border-violet-100 dark:border-violet-900/40 hover:border-violet-200 dark:hover:border-violet-800 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-violet-500 text-white shadow-sm group-hover:scale-105 transition-transform">
                  <Brain size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-black text-violet-900 dark:text-violet-200 uppercase tracking-tight">
                    Nexus AI
                  </span>
                  <span className="block text-[10px] text-violet-700 dark:text-violet-300 font-medium">
                    Conselheiro Estratégico
                  </span>
                </div>
                <ChevronRight size={15} className="text-violet-400 dark:text-violet-500 group-hover:text-violet-600 dark:group-hover:text-violet-300" />
              </button>

              <button
                onClick={() => go('explorar')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                  <Compass size={18} strokeWidth={2.5} />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    Explorar
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    7 Ferramentas & Simuladores
                  </span>
                </div>
                <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-sky-600 dark:group-hover:text-sky-400" />
              </button>

              {/* CURSOS DE FORMAÇÃO */}
              <div className="pt-1 space-y-1">
                <button
                  onClick={() => {
                    onClose();
                    if (isAuthenticated) onOpenCourse('investidor-iniciante');
                    else handleNavigate('login');
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-50/50 dark:hover:bg-blue-950/40 transition-all active:scale-95 text-left group"
                >
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 group-hover:scale-105 transition-transform">
                    <TrendingUp size={15} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 leading-tight">
                    <span className="block text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      Curso: Investidor Soberano
                    </span>
                    <span className="block text-[9px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                      Trilha CFP® de Investimentos
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                </button>

                <button
                  onClick={() => {
                    onClose();
                    if (isAuthenticated) onOpenCourse('dividas');
                    else handleNavigate('login');
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-50/50 dark:hover:bg-emerald-950/40 transition-all active:scale-95 text-left group"
                >
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <Sparkles size={15} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 leading-tight">
                    <span className="block text-[11px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                      Curso: Sair das Dívidas
                    </span>
                    <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                      Método Prático de Quitação
                    </span>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
                </button>
              </div>
            </div>
          </div>

          {/* BLOCO 5: SISTEMA & ADMIN */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">
              Sistema
            </p>
            <div className="space-y-1.5">
              {/* TEMA CLARO / ESCURO */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {resolvedTheme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    {resolvedTheme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    {resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                  {resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}
                </span>
              </button>

              <button
                onClick={() => go('settings')}
                className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  <Settings size={18} />
                </div>
                <span className="flex-1 text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight">
                  Configurações
                </span>
                <ChevronRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
              </button>

              <button
                onClick={() => {
                  onClose();
                  handleNavigate('download');
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-sky-950/40 dark:to-emerald-950/40 border border-sky-200/70 dark:border-sky-800/60 hover:border-sky-300 dark:hover:border-sky-700 transition-all active:scale-95 text-left group"
              >
                <div className="p-2 bg-white dark:bg-slate-800 rounded-xl text-sky-600 dark:text-sky-400 shadow-xs group-hover:scale-105 transition-transform">
                  <Share2 size={18} />
                </div>
                <div className="flex-1">
                  <span className="block text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                    Indicar / Baixar App
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Compartilhe o ecossistema
                  </span>
                </div>
                <ChevronRight size={15} className="text-sky-500 dark:text-sky-400" />
              </button>

              {/* OPÇÕES ADMIN CONDICIONAIS */}
              {isAuthenticated && isSystemAdmin(userMeta) && (
                <>
                  {onOpenPixAudit && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenPixAudit();
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/60 hover:border-amber-400 dark:hover:border-amber-600 transition-all active:scale-95 text-left group"
                    >
                      <div className="relative p-2 bg-white dark:bg-slate-800 rounded-xl text-amber-600 dark:text-amber-400 shadow-xs group-hover:scale-105 transition-transform">
                        <ShieldCheck size={18} />
                        {pendingPixCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[1.125rem] h-4.5 px-1 bg-amber-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-in zoom-in duration-300 shadow-xs">
                            {pendingPixCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="block text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                            Auditoria Pix (Admin)
                          </span>
                          {pendingPixCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-800/80 text-amber-900 dark:text-amber-100 text-[9px] font-black">
                              {pendingPixCount}
                            </span>
                          )}
                        </div>
                        <span className="block text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                          Tripla via Pix
                        </span>
                      </div>
                      <ChevronRight size={15} className="text-amber-500 dark:text-amber-400" />
                    </button>
                  )}

                  {onOpenUsersManagement && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenUsersManagement();
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-300/80 dark:border-sky-700/60 hover:border-sky-400 dark:hover:border-sky-600 transition-all active:scale-95 text-left group"
                    >
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-xl text-sky-600 dark:text-sky-400 shadow-xs group-hover:scale-105 transition-transform">
                        <Users size={18} />
                      </div>
                      <div className="flex-1">
                        <span className="block text-xs font-black text-sky-900 dark:text-sky-200 uppercase tracking-wider">
                          Gestão de Usuários
                        </span>
                        <span className="block text-[10px] text-sky-700 dark:text-sky-300 font-medium">
                          Tiers & Engajamento
                        </span>
                      </div>
                      <ChevronRight size={15} className="text-sky-500 dark:text-sky-400" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* RODAPÉ DO MENU: SAIR DA CONTA */}
        {isAuthenticated && (
          <div className="px-6 pt-3 pb-[max(3rem,calc(env(safe-area-inset-bottom)+1.25rem))] border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 text-red-600 dark:text-red-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all active:scale-95 shadow-xs"
            >
              <LogOut size={16} /> Sair da Conta
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppMobileDrawer;
