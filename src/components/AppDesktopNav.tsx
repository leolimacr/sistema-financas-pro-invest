import React, { useCallback, useEffect, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, Plus, Layers } from 'lucide-react';
import { useNavigation } from '../hooks/useNavigation';
import { PRIMARY_NAV_ITEMS } from '../config/appPrimaryNav';
import type { PrimaryNavItem } from '../config/appPrimaryNav';
import type { Transaction } from '../types';
const SESSION_KEY = 'financas-pro-invest-desktop-nav-expanded';

function readExpandedPreference(): boolean {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored === '0') return false;
    if (stored === '1') return true;
  } catch {
    /* sessionStorage indisponível */
  }
  return true;
}

function persistExpandedPreference(expanded: boolean) {
  try {
    sessionStorage.setItem(SESSION_KEY, expanded ? '1' : '0');
  } catch {
    /* ignora */
  }
}

interface NavItemProps {
  item: PrimaryNavItem;
  isActive: boolean;
  showLabels: boolean;
  onNavigate: (toolId: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, isActive, showLabels, onNavigate }) => {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.toolId)}
      title={!showLabels ? item.label : undefined}
      className={`w-full flex items-center rounded-xl text-left transition-all active:scale-[0.98] ${
        showLabels ? 'items-start gap-3 px-3 py-2.5' : 'justify-center p-2.5'
      } ${
        isActive
          ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 shadow-sm'
          : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-100 dark:hover:border-slate-700'
      }`}
      aria-current={isActive ? 'page' : undefined}
      aria-label={!showLabels ? item.label : undefined}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          showLabels ? 'mt-0.5' : ''
        } ${
          isActive
            ? 'bg-emerald-600 border-emerald-600 text-white'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'
        }`}
      >
        {item.iconSrc ? (
          <img
            src={item.iconSrc}
            alt=""
            className="w-full h-full rounded-lg object-cover block"
          />
        ) : (
          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
        )}
      </div>
      {showLabels && (
        <div className="min-w-0 flex-1">
          <span
            className={`block text-sm font-black tracking-tight ${
              isActive ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100'
            }`}
          >
            {item.label}
          </span>
          <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{item.description}</span>
        </div>
      )}
    </button>
  );
};

interface AppDesktopNavProps {
  onAdd?: (initialData?: Partial<Transaction>) => void;
}

const AppDesktopNav: React.FC<AppDesktopNavProps> = ({ onAdd }) => {
  const { currentTool, handleNavigate } = useNavigation();
  const [expanded, setExpanded] = useState(readExpandedPreference);
  const [isPeeking, setIsPeeking] = useState(false);

  const showLabels = expanded || isPeeking;
  const isPortfolioActive = currentTool === 'portfolio';

  const centralTools = new Set([
    'central',
    'chat',
    'minhas-dividas',
    'passivos',
    'investimentos',
    'metas',
  ]);

  function isNavItemActive(toolId: string): boolean {
    if (toolId === currentTool) return true;
    if (toolId === 'central' && (currentTool === 'home' || centralTools.has(currentTool))) return true;
    if (toolId === 'explorar' && currentTool.startsWith('tool-')) return true;
    return false;
  }

  useEffect(() => {
    persistExpandedPreference(expanded);
  }, [expanded]);

  const toggleExpanded = useCallback(() => {
    setIsPeeking(false);
    setExpanded((prev) => !prev);
  }, []);

  const handleMouseEnter = () => {
    if (!expanded) setIsPeeking(true);
  };

  const handleMouseLeave = () => {
    setIsPeeking(false);
  };

  const navList = (
    <nav className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-none">
      {showLabels && (
        <p className="px-3 pt-1 pb-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 shrink-0">
          Navegação
        </p>
      )}
      <div className={`flex flex-col gap-0.5 shrink-0 ${showLabels ? 'px-3' : 'px-2'}`}>
        <NavItem
          item={PRIMARY_NAV_ITEMS[0]}
          isActive={isNavItemActive(PRIMARY_NAV_ITEMS[0].toolId)}
          showLabels={showLabels}
          onNavigate={handleNavigate}
        />
        <button
          type="button"
          onClick={() => onAdd?.()}
          title={!showLabels ? 'Lançar' : undefined}
          className={`w-full flex items-center rounded-xl text-left transition-all active:scale-[0.98] ${
            showLabels ? 'items-start gap-3 px-3 py-2.5' : 'justify-center p-2.5'
          } border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-100 dark:hover:border-slate-700`}
          aria-label={!showLabels ? 'Lançar' : undefined}
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            showLabels ? 'mt-0.5' : ''
          } bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-sm shadow-emerald-500/20`}>
            <Plus size={18} strokeWidth={2.5} />
          </div>
          {showLabels && (
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-black tracking-tight text-emerald-700 dark:text-emerald-400">
                Lançar
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">Novo lançamento</span>
            </div>
          )}
        </button>
        <NavItem
          item={PRIMARY_NAV_ITEMS[1]}
          isActive={isNavItemActive(PRIMARY_NAV_ITEMS[1].toolId)}
          showLabels={showLabels}
          onNavigate={handleNavigate}
        />
        <NavItem
          item={PRIMARY_NAV_ITEMS[2]}
          isActive={isNavItemActive(PRIMARY_NAV_ITEMS[2].toolId)}
          showLabels={showLabels}
          onNavigate={handleNavigate}
        />
        <NavItem
          item={PRIMARY_NAV_ITEMS[3]}
          isActive={isNavItemActive(PRIMARY_NAV_ITEMS[3].toolId)}
          showLabels={showLabels}
          onNavigate={handleNavigate}
        />
      </div>

      {/* Seção Secundária: Patrimônio */}
      <div className={`pt-2 border-t border-slate-100 dark:border-slate-800 mt-1.5 shrink-0 ${showLabels ? 'px-3' : 'px-2'}`}>
        {showLabels && (
          <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 shrink-0">
            Patrimônio
          </p>
        )}
        <button
          type="button"
          onClick={() => handleNavigate('portfolio')}
          title={!showLabels ? 'Carteira Soberana' : undefined}
          data-testid="desktop-nav-portfolio"
          className={`w-full flex items-center rounded-xl text-left transition-all active:scale-[0.98] ${
            showLabels ? 'items-start gap-3 px-3 py-2.5' : 'justify-center p-2.5'
          } ${
            isPortfolioActive
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 shadow-sm'
              : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-100 dark:hover:border-slate-700'
          }`}
          aria-current={isPortfolioActive ? 'page' : undefined}
          aria-label={!showLabels ? 'Carteira Soberana' : undefined}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
              showLabels ? 'mt-0.5' : ''
            } ${
              isPortfolioActive
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Layers size={18} strokeWidth={isPortfolioActive ? 2.5 : 2} />
          </div>
          {showLabels && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`block text-[13px] font-black tracking-tight truncate ${
                    isPortfolioActive ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100'
                  }`}
                  title="Carteira Soberana"
                >
                  Carteira Soberana
                </span>
                <span className="text-[9px] font-black bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded shrink-0">
                  V1
                </span>
              </div>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 truncate">
                Custódia e metas
              </span>
            </div>
          )}
        </button>
      </div>
    </nav>
  );

  return (
    <div
      className="hidden lg:flex shrink-0 relative h-full self-stretch z-[90]"
      onMouseLeave={handleMouseLeave}
    >
      <aside
        className={`flex flex-col h-full border-r border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm transition-[width] duration-200 ease-out ${
          expanded ? 'w-56' : 'w-[4.25rem]'
        }`}
        aria-label="Navegação principal"
        onMouseEnter={handleMouseEnter}
      >
        <div className="flex flex-col flex-1 min-h-0 py-2.5 overflow-hidden">
          {expanded ? navList : (
            <nav className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-none px-2">
              <NavItem
                item={PRIMARY_NAV_ITEMS[0]}
                isActive={isNavItemActive(PRIMARY_NAV_ITEMS[0].toolId)}
                showLabels={false}
                onNavigate={handleNavigate}
              />
              <button
                type="button"
                onClick={() => onAdd?.()}
                title="Lançar"
                className="w-full flex items-center justify-center p-2.5 rounded-xl border border-transparent transition-all active:scale-[0.98] hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-100 dark:hover:border-slate-700"
                aria-label="Lançar"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 text-white shadow-sm shadow-emerald-500/20">
                  <Plus size={18} strokeWidth={2.5} />
                </div>
              </button>
              <NavItem
                item={PRIMARY_NAV_ITEMS[1]}
                isActive={isNavItemActive(PRIMARY_NAV_ITEMS[1].toolId)}
                showLabels={false}
                onNavigate={handleNavigate}
              />
              <NavItem
                item={PRIMARY_NAV_ITEMS[2]}
                isActive={isNavItemActive(PRIMARY_NAV_ITEMS[2].toolId)}
                showLabels={false}
                onNavigate={handleNavigate}
              />
              <NavItem
                item={PRIMARY_NAV_ITEMS[3]}
                isActive={isNavItemActive(PRIMARY_NAV_ITEMS[3].toolId)}
                showLabels={false}
                onNavigate={handleNavigate}
              />

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                <button
                  type="button"
                  onClick={() => handleNavigate('portfolio')}
                  title="Carteira Soberana"
                  data-testid="desktop-nav-portfolio-collapsed"
                  className={`w-full flex items-center justify-center p-2.5 rounded-xl border transition-all active:scale-[0.98] ${
                    isPortfolioActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 shadow-sm'
                      : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:border-slate-100 dark:hover:border-slate-700'
                  }`}
                  aria-current={isPortfolioActive ? 'page' : undefined}
                  aria-label="Carteira Soberana"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                      isPortfolioActive
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Layers size={18} strokeWidth={isPortfolioActive ? 2.5 : 2} />
                  </div>
                </button>
              </div>
            </nav>
          )}

          <div className={`shrink-0 pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto bg-white/95 dark:bg-slate-900/95 ${expanded ? 'px-3' : 'px-2'}`}>
            <button
              type="button"
              onClick={toggleExpanded}
              className={`w-full flex items-center gap-2 rounded-xl py-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                expanded ? 'justify-start px-3' : 'justify-center'
              }`}
              aria-expanded={expanded}
              aria-label={expanded ? 'Recolher navegação' : 'Expandir navegação'}
              title={expanded ? 'Recolher' : 'Expandir'}
            >
              {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
              {expanded && (
                <span className="text-[11px] font-bold uppercase tracking-wider">Recolher</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {!expanded && isPeeking && (
        <aside
          className="absolute left-full top-0 h-full w-56 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-slate-950/50 backdrop-blur-sm flex flex-col py-3 z-[95]"
          aria-hidden="true"
          onMouseEnter={handleMouseEnter}
        >
          {navList}
        </aside>
      )}
    </div>
  );
};

export default AppDesktopNav;
