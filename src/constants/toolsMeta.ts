import React from 'react';
import {
  TrendingUp,
  Calculator,
  Target,
  Flame,
  Percent,
  Wallet,
  ShoppingCart,
} from 'lucide-react';

export interface ToolMetaItem {
  id: string;
  routeKey: string;
  publicPath: string;
  appPath: string;
  label: string;
  desc: string;
  badge: string;
  action: string;
  image: string;
  color: string;
  bg: string;
  iconName: string;
}

export const TOOLS_METADATA: ToolMetaItem[] = [
  {
    id: 'tool-juros',
    routeKey: 'tool-juros',
    publicPath: '/ferramentas/juros',
    appPath: '/app/ferramentas/juros',
    label: 'Juros Compostos',
    desc: 'Simule o crescimento exponencial do seu dinheiro no tempo com aportes mensais.',
    badge: 'Efeito Bola de Neve',
    action: 'Calcular Agora',
    image: '/assets/images/tools/juros-compostos-cover.jpg',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    iconName: 'TrendingUp',
  },
  {
    id: 'tool-dividas',
    routeKey: 'tool-dividas',
    publicPath: '/ferramentas/dividas',
    appPath: '/app/ferramentas/dividas',
    label: 'Calculadora de Dívidas',
    desc: 'Elimine anos de juros e descubra o caminho mais rápido para quitar seus débitos.',
    badge: 'Amortização Estratégica',
    action: 'Calcular Agora',
    image: '/assets/images/tools/calculadora-dividas-cover.jpg',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    iconName: 'Calculator',
  },
  {
    id: 'tool-alugar',
    routeKey: 'tool-alugar',
    publicPath: '/ferramentas/alugar',
    appPath: '/app/ferramentas/alugar',
    label: 'Alugar vs Comprar',
    desc: 'Compare o custo real entre morar de aluguel e investir a diferença ou financiar um imóvel.',
    badge: 'Decisão Imobiliária',
    action: 'Comparar Agora',
    image: '/assets/images/tools/alugar-vs-comprar-cover.jpg',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    iconName: 'Target',
  },
  {
    id: 'tool-fire',
    routeKey: 'tool-fire',
    publicPath: '/ferramentas/fire',
    appPath: '/app/ferramentas/fire',
    label: 'Calculadora de Independência Financeira',
    desc: 'Veja quanto tempo você ainda precisa trabalhar para conseguir a sua independência financeira.',
    badge: 'Tempo de Trabalho Real',
    action: 'Calcular Agora',
    image: '/assets/images/tools/calculadora-fire-cover.jpg',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    iconName: 'Flame',
  },
  {
    id: 'tool-inflacao',
    routeKey: 'tool-inflacao',
    publicPath: '/ferramentas/inflacao',
    appPath: '/app/ferramentas/inflacao',
    label: 'Impacto da Inflação',
    desc: 'Calcule a corrosão do poder de compra no tempo e descubra como blindar seu capital.',
    badge: 'Poder de Compra Real',
    action: 'Calcular Agora',
    image: '/assets/images/tools/impacto-inflacao-cover.jpg',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    iconName: 'Percent',
  },
  {
    id: 'tool-dividendos',
    routeKey: 'tool-dividendos',
    publicPath: '/ferramentas/dividendos',
    appPath: '/app/ferramentas/dividendos',
    label: 'Simulador de Dividendos',
    desc: 'Projete a renda passiva da sua carteira e o efeito multiplicador dos proventos mensais.',
    badge: 'Renda Passiva Mensal',
    action: 'Simular Agora',
    image: '/assets/images/tools/simulador-dividendos-cover.jpg',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    iconName: 'Wallet',
  },
  {
    id: 'tool-buy-cash-or-installments',
    routeKey: 'tool-buy-cash-or-installments',
    publicPath: '/ferramentas/compra-avista-parcelado',
    appPath: '/app/ferramentas/compra-avista-parcelado',
    label: 'À Vista ou Parcelado',
    desc: 'Compare pagar agora com desconto ou parcelar sem juros e investir o saldo no CDI.',
    badge: 'Decisão de Compra',
    action: 'Comparar Agora',
    image: '/assets/images/tools/a-vista-ou-parcelado-cover.jpg',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    iconName: 'ShoppingCart',
  },
];

export const TOOLS_BY_ID = Object.fromEntries(
  TOOLS_METADATA.map((tool) => [tool.id, tool])
);
