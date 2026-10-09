import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Wallet,
  CalendarCheck,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Lock,
  Calculator,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { TOOLS_METADATA } from '../constants/toolsMeta';

interface MobilePublicHomeProps {
  onLogin: () => void;
  onRegister: () => void;
}

interface Pillar {
  id: string;
  number: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  practicalExample: string;
  icon: React.FC<{ size?: number; className?: string; strokeWidth?: number }>;
  color: {
    bg: string;
    border: string;
    text: string;
    iconBg: string;
  };
}

const PILLARS: Pillar[] = [
  {
    id: 'caixa',
    number: '01',
    name: 'Caixa & Rotina',
    badge: 'Disponibilidade',
    tagline: 'O que entra e sai no seu dia a dia',
    description: 'Registro sem limite e sem complicações. O dinheiro da sua conta só é livre quando você sabe o destino de cada centavo.',
    practicalExample: 'Acompanhe seu fluxo diário no Controla sem limites de lançamentos no plano gratuito.',
    icon: Wallet,
    color: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-600',
      iconBg: 'bg-emerald-500 text-white',
    },
  },
  {
    id: 'compromissos',
    number: '02',
    name: 'Compromissos',
    badge: 'Obrigações',
    tagline: 'Contas fixas e faturas programadas',
    description: 'Seu dinheiro livre real só existe depois de garantir o que já está comprometido. Sem surpresas no final do mês.',
    practicalExample: 'Previsão de contas a vencer e faturas futuras já descontadas da sua folga do mês.',
    icon: CalendarCheck,
    color: {
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      text: 'text-sky-600',
      iconBg: 'bg-sky-500 text-white',
    },
  },
  {
    id: 'protecao',
    number: '03',
    name: 'Base de Proteção',
    badge: 'Segurança',
    tagline: 'Colchão emergencial e reserva de emergência',
    description: 'A tranquilidade que separa os imprevistos da sua paz mental. Um amortecedor construído passo a passo.',
    practicalExample: 'Metas graduais de colchão de segurança para nunca precisar recorrer a juros caros.',
    icon: ShieldCheck,
    color: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      text: 'text-indigo-600',
      iconBg: 'bg-indigo-500 text-white',
    },
  },
  {
    id: 'evolucao',
    number: '04',
    name: 'Evolução',
    badge: 'Trajetória',
    tagline: 'Multiplicação e independência financeira',
    description: 'Quando o caixa está organizado e a proteção construída, seu excedente trabalha para o seu futuro.',
    practicalExample: 'Diagnóstico contínuo do seu estágio financeiro pelo Nexus com visão integrada.',
    icon: TrendingUp,
    color: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-600',
      iconBg: 'bg-amber-500 text-white',
    },
  },
];

export const MobilePublicHome: React.FC<MobilePublicHomeProps> = ({ onLogin, onRegister }) => {
  const [activeTab, setActiveTab] = useState(0);
  const activePillar = PILLARS[activeTab];
  const IconComponent = activePillar.icon;
  const navigate = useNavigate();
  const { enterDemoMode } = useAuth();

  const handleStartDemo = () => {
    enterDemoMode();
    navigate('/app/central');
  };

  return (
    <div className="min-h-screen bg-surface-secondary dark:bg-slate-950 flex flex-col justify-between font-sans pt-[max(5rem,calc(env(safe-area-inset-top)+1.5rem))] pb-[max(2rem,env(safe-area-inset-bottom))] px-5">
      {/* Top Section: Sober Brand & Positioning */}
      <div className="flex flex-col items-center text-center space-y-3 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
          <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400" />
          <span>Controle Financeiro Soberano</span>
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug max-w-xs">
          Saiba exatamente quanto <span className="text-emerald-600 dark:text-emerald-400">sobra de verdade</span> no seu mês
        </h1>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
          O Finanças Pro Invest analisa seu caixa, antecipa compromissos e ajuda você a construir segurança e tranquilidade com sobriedade.
        </p>
      </div>

      {/* Interactive 4 Pillars Carousel / Tab Selector */}
      <div className="my-5 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
            A Arquitetura da Liberdade
          </span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            Pilar {activePillar.number} de 04
          </span>
        </div>

        {/* Pillar Pills */}
        <div className="grid grid-cols-4 gap-2">
          {PILLARS.map((p, idx) => {
            const isSelected = activeTab === idx;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`py-2 px-1 rounded-xl text-center transition-all flex flex-col items-center gap-1 border cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-sm ring-2 ring-slate-950/5 dark:ring-white/5'
                    : 'bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800'
                }`}
              >
                <span className={`text-[10px] font-mono font-black ${isSelected ? p.color.text : 'text-slate-500 dark:text-slate-400'}`}>
                  {p.number}
                </span>
                <span className={`text-[10px] font-black uppercase tracking-tight truncate max-w-full ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                  {p.name.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Pillar Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-soft transition-all space-y-3 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${activePillar.color.iconBg}`}>
                <IconComponent size={20} strokeWidth={2.2} />
              </div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest block ${activePillar.color.text}`}>
                  {activePillar.badge}
                </span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                  {activePillar.name}
                </h3>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-slate-300 dark:text-slate-600">
              #{activePillar.number}
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {activePillar.tagline}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {activePillar.description}
            </p>
          </div>

          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 bg-slate-50/80 dark:bg-slate-800/50 -mx-5 -mb-5 p-3 rounded-b-3xl">
            <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 mt-0.5 shrink-0">
              <ChevronRight size={12} strokeWidth={3} />
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
              {activePillar.practicalExample}
            </p>
          </div>
        </div>
      </div>

      {/* [F2.1.2] Direct Access to 7 Public Simulation Tools */}
      <div className="space-y-2 my-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Calculator size={13} className="text-emerald-600 dark:text-emerald-400" />
            Simuladores & Ferramentas Abertas
          </span>
          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            Acesso Livre
          </span>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x -mx-5 px-5">
          {TOOLS_METADATA.map((tool) => (
            <div
              key={tool.id}
              onClick={() => navigate(tool.publicPath)}
              className="min-w-[190px] w-[190px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between cursor-pointer group active:scale-[0.97] transition-all snap-start"
            >
              <div className="relative h-24 overflow-hidden bg-slate-100 dark:bg-slate-800">
                <img
                  src={tool.image}
                  alt={tool.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-xs text-[8px] font-black text-white uppercase tracking-wider">
                  {tool.badge}
                </span>
              </div>
              <div className="p-3 space-y-1">
                <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug line-clamp-1">
                  {tool.label}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                  {tool.desc}
                </p>
                <div className="pt-2 flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase">
                  <span>{tool.action}</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Actions: Clear Direct CTAs & Sandbox Demo */}
      <div className="space-y-2.5 pt-2">
        <button
          type="button"
          onClick={onRegister}
          className="w-full py-3.5 px-6 rounded-2xl bg-slate-950 dark:bg-emerald-500 text-white dark:text-slate-950 font-black text-xs uppercase tracking-widest shadow-floating hover:bg-slate-900 dark:hover:bg-emerald-400 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Criar Conta Gratuita</span>
          <ArrowRight size={16} />
        </button>

        <button
          type="button"
          onClick={onLogin}
          className="w-full py-2.5 px-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Lock size={14} className="text-slate-500 dark:text-slate-400" />
          <span>Já tenho conta • Entrar</span>
        </button>

        {/* [F2.1.1] Modo Conhecer / Sandbox Interativo */}
        <button
          type="button"
          onClick={handleStartDemo}
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
          <span>⚡ Experimentar demonstração sem cadastro</span>
        </button>

        <p className="text-center text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
          Gratuito para organizar sua rotina diária. Sem necessidade de cartão.
        </p>
      </div>
    </div>
  );
};

export default MobilePublicHome;
