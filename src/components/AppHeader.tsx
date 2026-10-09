import React, { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { LogOut, Settings, Eye, EyeOff, Menu, Globe, ArrowLeft, Crown, Bell, Smartphone, ShieldCheck, Users, Sun, Moon } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEntitlement } from '../hooks/useEntitlement';
import type { UserMeta } from '../types';
import { useNotifications } from '../contexts/NotificationContext';
import { usePixAudit } from '../contexts/PixAuditContext';
import { useTheme } from '../contexts/ThemeContext';
import { isSystemAdmin } from '../utils/adminCheck';

interface AppHeaderProps {
  isAuthenticated: boolean;
  userMeta: UserMeta | null | undefined;
  userDisplayName?: string;
  isPrivacyMode: boolean;
  onTogglePrivacy: () => void;
  onLogout: () => void;
  onOpenMobileMenu: () => void;
  isNotificationsOpen: boolean;
  onOpenNotifications: (open: boolean) => void;
  showDesktopNav?: boolean;
  onOpenDownloadQr?: () => void;
  onOpenPixAudit?: () => void;
  onOpenUsersManagement?: () => void;
}

const MAIN_ROUTES = ['/app/central', '/app/controla', '/app/dashboard', '/app/mais', '/app/explorar', '/app/agenda', '/'];

const AppHeader: React.FC<AppHeaderProps> = ({
  isAuthenticated,
  userMeta,
  userDisplayName,
  isPrivacyMode,
  onTogglePrivacy,
  onLogout,
  onOpenMobileMenu,
  onOpenNotifications,
  showDesktopNav = false,
  onOpenDownloadQr,
  onOpenPixAudit,
  onOpenUsersManagement,
}) => {
  const isNative = Capacitor.isNativePlatform();
  const { currentTool, handleNavigate } = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { pendingCount: pendingPixCount } = usePixAudit();
  const { resolvedTheme, toggleTheme } = useTheme();
  const isMainRoute = MAIN_ROUTES.includes(location.pathname);

  const { effectiveTier } = useEntitlement();
  const hasProAccess = effectiveTier !== 'free';
  const hasPremiumAccess = effectiveTier === 'premium';
  const isProOnly = hasProAccess && !hasPremiumAccess;

  const handleSmartBack = useCallback(() => {
    // Se houver histórico de navegação na sessão atual, volta. 
    // Senão, vai para a home adequada ao estado de autenticação.
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(isAuthenticated ? '/app/central' : '/');
    }
  }, [navigate, isAuthenticated]);

  // @ts-ignore - nickname pode existir no objeto vindo do firestore
  const rawName = userMeta?.nickname || userDisplayName || 'Investidor';
  const firstName = rawName.split(' ')[0]; 

  const handleOpenWebsite = async () => {
	 await Browser.open({ url: 'https://www.financasproinvest.com.br', windowName: '_system' });
  };

  return (
    <header className={`fixed top-0 left-0 w-full z-[100] bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/80 h-[calc(4rem+env(safe-area-inset-top))] shadow-soft transition-all duration-300 font-sans ${showDesktopNav ? 'lg:pl-4' : ''}`}>
      <div className="h-[env(safe-area-inset-top)]" aria-hidden="true" />
      <div className="flex items-center h-16 px-4 md:px-8">
      
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {!isMainRoute ? (
          <button 
            onClick={handleSmartBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all font-black text-[10px] uppercase tracking-widest border border-slate-200 dark:border-slate-700 active:scale-95"
          >
            <ArrowLeft size={16} />
            <span>Voltar</span>
          </button>
        ) : (
          <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => handleNavigate('central')}>
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200/30 group-hover:shadow-emerald-300/50 group-hover:scale-105 transition-all duration-300 overflow-hidden ring-1 ring-white/20">
              <div className="absolute inset-0 bg-gradient-to-tl from-white/0 via-white/5 to-white/20" />
              <img src="/assets/images/brand/logo.png" alt="Finanças Pro Invest" className="w-full h-full object-cover relative z-10" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm md:text-base font-black text-slate-950 dark:text-white tracking-tight leading-none">
                  Finanças Pro
                </span>
                <span className="text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 tracking-tight leading-none">
                  Invest
                </span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] leading-none mt-1">
                Controle financeiro inteligente
              </span>
            </div>
          </div>
        )}

            {currentTool === 'manager' && isMainRoute && (
              <div className={`max-lg:hidden flex flex-col items-start ml-8 md:ml-12 lg:ml-16 mr-2 leading-none animate-in fade-in slide-in-from-right-2 duration-500 ${showDesktopNav ? 'lg:hidden' : ''}`}>
                <span className="text-[11px] md:text-sm font-black text-slate-950 dark:text-white tracking-tight uppercase whitespace-nowrap">
                  Controla
                </span>

                {isNative && (
                  <button
                    onClick={handleOpenWebsite}
                    className="mt-1 flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 font-bold text-[9px] uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-700"
                  >
                    <Globe size={10} className="text-emerald-600 dark:text-emerald-400" /> Abrir Site
                  </button>
                )}
              </div>
            )}
        
      </div>

      <div className="flex items-center justify-end gap-2 md:gap-4 flex-1">
        
        {isAuthenticated && (
            <button 
                onClick={() => onOpenNotifications(true)}
                className="relative p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all active:scale-95"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-in zoom-in duration-300">
                        {unreadCount}
                    </span>
                )}
            </button>
        )}

        {!isAuthenticated && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all active:scale-95"
              aria-label={resolvedTheme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
              title={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {resolvedTheme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-700" />}
            </button>
            {!isNative && (
              <button
                onClick={() => {
                  const isMobileDevice = window.innerWidth < 768;
                  if (isMobileDevice) {
                    handleNavigate('download');
                  } else if (onOpenDownloadQr) {
                    onOpenDownloadQr();
                  } else {
                    handleNavigate('download');
                  }
                }}
                className="hidden sm:inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 uppercase tracking-wider transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:focus-visible:ring-emerald-400/50"
              >
                <Smartphone size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Baixar App</span>
              </button>
            )}
            <button 
              onClick={() => handleNavigate('login')} 
              className="text-[10px] md:text-xs font-black text-white bg-slate-950 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-xl px-5 md:px-6 py-2.5 uppercase tracking-wider shadow-floating active:scale-95 transition-all"
            >
              Entrar
            </button>
          </div>
        )}

        {isAuthenticated && (
          <>
            {!isNative && (
              <button
                onClick={() => {
                  const isMobileDevice = window.innerWidth < 768;
                  if (isMobileDevice) {
                    handleNavigate('download');
                  } else if (onOpenDownloadQr) {
                    onOpenDownloadQr();
                  } else {
                    handleNavigate('download');
                  }
                }}
                className="hidden lg:inline-flex items-center gap-1.5 text-[10px] md:text-xs font-bold text-slate-700 hover:text-slate-950 dark:text-emerald-300 dark:hover:text-emerald-100 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 dark:hover:border-emerald-700/80 rounded-xl px-3 py-2 uppercase tracking-wider transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:focus-visible:ring-emerald-400/50 mr-2"
                title="Instale no seu celular"
              >
                <Smartphone size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Baixar App</span>
              </button>
            )}

            {hasPremiumAccess && (
              <div 
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300 mr-4 animate-in fade-in zoom-in duration-300 shadow-[0_0_10px_rgba(16,185,129,0.1)] dark:shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                role="status"
                aria-label="Plano Premium"
              >
                <Crown size={12} className="fill-emerald-600 dark:fill-emerald-400 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider">Premium</span>
              </div>
            )}
            {isProOnly && (
              <div 
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 mr-4 animate-in fade-in zoom-in duration-300 dark:shadow-[0_0_12px_rgba(14,165,233,0.15)]"
                role="status"
                aria-label="Plano Pro"
              >
                <Crown size={12} className="text-sky-600 dark:text-sky-400 shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider">Pro</span>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-3 mr-2 text-sm border-r border-slate-100 dark:border-slate-800 pr-4">
              <div className="flex flex-col text-right leading-none">
                <span className="text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase mb-1 tracking-wider">Seja bem vindo,</span>
                <span className="text-[12px] font-black text-slate-950 dark:text-white uppercase tracking-tight truncate max-w-[120px] xl:max-w-[180px]">
                  {rawName}!
                </span>
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors border border-slate-100 dark:border-slate-700 active:scale-95"
                aria-label={resolvedTheme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
                title={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                {resolvedTheme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-slate-600 dark:text-slate-300" />}
              </button>
              <button onClick={onTogglePrivacy} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors border border-slate-100 dark:border-slate-700 active:scale-95">
                {isPrivacyMode ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>

            {hasPremiumAccess && (
              <div 
                className="lg:hidden flex items-center justify-center w-6 h-6 rounded-lg bg-emerald-600 text-white shadow-lg shadow-emerald-200/50 dark:shadow-none dark:ring-1 dark:ring-emerald-500/40 mr-2"
                role="status"
                aria-label="Plano Premium"
              >
                <Crown size={12} />
              </div>
            )}
            {isProOnly && (
              <div 
                className="lg:hidden flex items-center justify-center w-6 h-6 rounded-lg bg-sky-600 text-white shadow-lg shadow-sky-200/50 dark:shadow-none dark:ring-1 dark:ring-sky-500/40 mr-2"
                role="status"
                aria-label="Plano Pro"
              >
                <Crown size={12} />
              </div>
            )}

            <div className="lg:hidden flex flex-col items-end text-right mr-1 leading-none animate-in fade-in">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Seja bem vindo,</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {firstName}!
              </span>
            </div>

            {isAuthenticated && isSystemAdmin(userMeta) && (
              <div className="hidden md:flex items-center gap-1.5 mr-1">
                {onOpenPixAudit && (
                  <button
                    onClick={onOpenPixAudit}
                    className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-600/50 font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                    title="Auditoria Soberana Pix (Admin)"
                  >
                    <ShieldCheck size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="hidden sm:inline">Auditoria Pix</span>
                    {pendingPixCount > 0 && (
                      <span className="ml-1 min-w-[1.125rem] h-4.5 px-1 bg-amber-600 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-in zoom-in duration-300 shadow-sm">
                        {pendingPixCount}
                      </span>
                    )}
                  </button>
                )}

                {onOpenUsersManagement && (
                  <button
                    onClick={onOpenUsersManagement}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-800 dark:text-sky-300 border border-sky-300/80 dark:border-sky-600/50 font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                    title="Gestão Soberana de Usuários (Admin)"
                  >
                    <Users size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
                    <span className="hidden sm:inline">Usuários</span>
                  </button>
                )}
              </div>
            )}

            <div className="hidden md:flex items-center gap-2">
              <button onClick={() => handleNavigate('settings')} className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors" title="Configurações"><Settings size={18} /></button>
              <button onClick={onLogout} className="p-2 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors" title="Sair"><LogOut size={18} /></button>
            </div>

            <div className="lg:hidden flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 transition-all"
                aria-label={resolvedTheme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
                title={resolvedTheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
              >
                {resolvedTheme === 'dark' ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
              </button>
              <button
                onClick={onOpenMobileMenu}
                className="relative text-slate-600 dark:text-slate-300 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 transition-all"
                aria-label="Menu"
              >
                <Menu size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
    </header>
  );
};

export default AppHeader;
