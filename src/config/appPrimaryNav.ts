import type { LucideIcon } from 'lucide-react';
import { House, LayoutDashboard, Compass, CalendarDays } from 'lucide-react';

export interface PrimaryNavItem {
  /** Chave em TOOL_ROUTES (ex.: manager → /app/controla) */
  toolId: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconSrc?: string;
}

export const PRIMARY_NAV_ITEMS: PrimaryNavItem[] = [
  {
    toolId: 'central',
    label: 'Central',
    description: 'Painel central e estratégia',
    icon: House,
  },
  {
    toolId: 'manager',
    label: 'Controla',
    description: 'Lançamentos e fluxo',
    icon: LayoutDashboard,
    iconSrc: '/assets/images/brand/icone_controla210726.png',
  },
  {
    toolId: 'explorar',
    label: 'Explorar',
    description: 'Ferramentas e conteúdo',
    icon: Compass,
  },
  {
    toolId: 'agenda',
    label: 'Agenda',
    description: 'Compromissos e alarmes',
    icon: CalendarDays,
  },
];


