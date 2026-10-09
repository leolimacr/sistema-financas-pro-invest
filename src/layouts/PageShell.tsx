import React from 'react';

const LIGHT_BG_TOOLS = new Set([
  'home',
  'manager',
  'settings',
  'pricing',
  'chat',
  'central',
  'minhas-dividas',
  'passivos',
  'investimentos',
  'portfolio',
  'metas',
]);

export function usesLightBackground(currentTool: string): boolean {
  return LIGHT_BG_TOOLS.has(currentTool) || currentTool.startsWith('tool-');
}

interface PageShellProps {
  currentTool: string;
  isAuthRoute?: boolean;
  withMobileNav?: boolean;
  children: React.ReactNode;
}

// Hierarquia de superfícies Soberana: Central, Controla, Explorar, Agenda e Carteira
// utilizam o canvas com contraste para destacar cartões e a folha de pauta.
const CANVAS_TOOLS = new Set(['central', 'home', 'manager', 'explorar', 'agenda', 'portfolio']);

const PageShell: React.FC<PageShellProps> = ({
  currentTool,
  isAuthRoute = false,
  withMobileNav = false,
  children,
}) => (
  <div
    className={`${
      isAuthRoute
        ? 'pt-0 pb-0'
        : withMobileNav
          ? 'pb-28'
          : 'pb-6'
    } min-h-full ${CANVAS_TOOLS.has(currentTool) ? 'bg-surface-canvas dark:bg-slate-950' : 'bg-slate-50 dark:bg-slate-950'}`}
  >
    {children}
  </div>
);

export default PageShell;
