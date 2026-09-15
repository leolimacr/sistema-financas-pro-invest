import React from 'react';
import { X, LayoutDashboard, BarChart3, CreditCard, Compass, Settings, Sparkles, LogOut, ChevronRight, Crown, Share2, TrendingUp } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useEntitlement } from '../hooks/useEntitlement';
import type { UserMeta } from '../types';

interface AppMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  userMeta: UserMeta | null | undefined;
  userDisplayName?: string | null;
  onLogout: () => void;
  onOpenCourse: (slug?: string) => void;
}

const AppMobileDrawer: React.FC<AppMobileDrawerProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  userMeta,
  userDisplayName,
  onLogout,
  onOpenCourse,
}) => {
  const { handleNavigate } = useNavigation();
  const { effectiveTier } = useEntitlement();
  const hasPremium = effectiveTier === 'premium';

  if (!isOpen) return null;

  const displayName = isAuthenticated
    ? userMeta?.nickname || userDisplayName || 'Investidor'
    : 'Visitante';

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

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-72 max-w-[85%] h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600 mb-1">
              Menu Principal
            </span>
            <span className="text-sm font-black text-slate-900 truncate max-w-[180px] uppercase tracking-tight">
              {displayName}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-surface-secondary rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 px-4 py-6 flex flex-col gap-4 overflow-y-auto">
          <button
            onClick={() => go('manager')}
            className="w-full group relative p-px rounded-2xl bg-gradient-to-b from-amber-500/40 to-transparent transition-all active:scale-95 shadow-lg shadow-amber-950/20"
          >
            <div className="bg-surface-primary rounded-[15px] p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg">
                <LayoutDashboard size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left leading-tight">
                <span className="block text-[9px] font-black text-amber-600 uppercase tracking-widest mb-0.5">
                  App Nativo
                </span>
                <span className="block text-[13px] font-bold text-slate-900 uppercase tracking-tight">
                  Controla
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-amber-600" />
            </div>
          </button>

          <button
            onClick={() => go('minhas-dividas')}
            className="w-full group relative p-px rounded-2xl bg-gradient-to-b from-rose-500/40 to-transparent transition-all active:scale-95 shadow-lg shadow-rose-950/20"
          >
            <div className="bg-surface-primary rounded-[15px] p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg">
                <CreditCard size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left leading-tight">
                <span className="block text-[9px] font-black text-rose-600 uppercase tracking-widest mb-0.5">
                  Gestão
                </span>
                <span className="block text-[13px] font-bold text-slate-900 uppercase tracking-tight">
                  Minhas Dívidas
                </span>
                {!hasPremium && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[8px] font-black uppercase tracking-widest text-amber-600">
                    <Crown size={10} /> Premium
                  </span>
                )}
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-rose-600" />
            </div>
          </button>

          {/* CURSOS DE FORMAÇÃO */}
          <button
            onClick={() => {
              onClose();
              if (isAuthenticated) onOpenCourse('investidor-iniciante');
              else handleNavigate('login');
            }}
            className="w-full group relative p-px rounded-2xl bg-gradient-to-b from-blue-500/40 to-transparent transition-all active:scale-95 shadow-lg shadow-blue-950/20 mb-3"
          >
            <div className="bg-surface-primary rounded-[15px] p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                <TrendingUp size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left leading-tight">
                <span className="block text-[9px] font-black text-blue-600 uppercase tracking-widest mb-0.5">
                  Curso Premium
                </span>
                <span className="block text-[13px] font-bold text-slate-900 uppercase tracking-tight">
                  Investidor Soberano
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-blue-600" />
            </div>
          </button>

          <button
            onClick={() => {
              onClose();
              if (isAuthenticated) onOpenCourse('dividas');
              else handleNavigate('login');
            }}
            className="w-full group relative p-px rounded-2xl bg-gradient-to-b from-emerald-500/40 to-transparent transition-all active:scale-95 shadow-lg shadow-emerald-950/20 mb-4"
          >
            <div className="bg-surface-primary rounded-[15px] p-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-lg">
                <Sparkles size={20} strokeWidth={2.5} />
              </div>
              <div className="flex-1 text-left leading-tight">
                <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5">
                  Curso Prático
                </span>
                <span className="block text-[13px] font-bold text-slate-900 uppercase tracking-tight">
                  Sair das Dívidas
                </span>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-emerald-600" />
            </div>
          </button>

          <button
            onClick={() => go('dashboard')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-surface-secondary border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 text-left group"
          >
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:text-emerald-600 transition-colors">
              <BarChart3 size={18} />
            </div>
            <span className="flex-1 text-[13px] font-bold text-slate-600 uppercase tracking-widest">
              Dashboard
            </span>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          <button
            onClick={() => go('settings')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-surface-secondary border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 text-left group"
          >
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:text-slate-900 transition-colors">
              <Settings size={18} />
            </div>
            <span className="flex-1 text-[13px] font-bold text-slate-600 uppercase tracking-widest">
              Configurações
            </span>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          <button
            onClick={() => go('explorar')}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-surface-secondary border border-slate-200 hover:bg-slate-100 transition-all active:scale-95 text-left group"
          >
            <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:text-emerald-600 transition-colors">
              <Compass size={18} />
            </div>
            <span className="flex-1 text-[13px] font-bold text-slate-600 uppercase tracking-widest">
              Explorar
            </span>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          <button
            onClick={() => {
              onClose();
              handleNavigate('download');
            }}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-sky-50 to-emerald-50 border border-sky-200/70 hover:border-sky-300 transition-all active:scale-95 text-left group"
          >
            <div className="p-2 bg-white rounded-lg text-sky-600 shadow-sm group-hover:scale-110 transition-transform">
              <Share2 size={18} />
            </div>
            <div className="flex-1">
              <span className="block text-[13px] font-black text-slate-800 uppercase tracking-wider">
                Indicar / Baixar App
              </span>
              <span className="block text-[10px] text-slate-500 font-medium">
                Compartilhe o app com amigos
              </span>
            </div>
            <ChevronRight size={16} className="text-sky-500" />
          </button>
        </div>

        {isAuthenticated && (
          <div className="p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all"
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
