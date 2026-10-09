import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { TrendingUp, Target, X, ChevronRight, Sparkles, LayoutGrid, Brain, Crown, BarChart3, FileText, Shield } from 'lucide-react';
import { useEntitlement } from '../hooks/useEntitlement';

/* ───────── TIPOS ───────── */

type LockType = 'history' | 'premium_module' | 'ia' | 'fallback';

interface PaywallContent {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  cta: string;
  secondaryCta: string;
  benefits: Array<{ icon: React.ReactNode; text: string }>;
}

/* ───────── MAPEAR FEATURE → TIPO DE BLOQUEIO ───────── */

function getLockType(feature?: string): LockType {
  const n = (feature || '').toLowerCase();

  if (
    n.includes('histor') ||
    n.includes('retrovisor') ||
    n.includes('mês anterior') ||
    n.includes('mes anterior')
  ) return 'history';

  if (
    n.includes('divida') ||
    n.includes('invest') ||
    n.includes('passivo') ||
    n.includes('patrim') ||
    n.includes('premium')
  ) return 'premium_module';

  if (
    n.includes('nexus') ||
    n.includes('ia') ||
    n.includes('chat')
  ) return 'ia';

  return 'fallback';
}

/* ───────── TIPO DE BLOQUEIO → PLANO DESTINO ───────── */

function getTargetTier(lockType: LockType): 'pro' | 'premium' {
  if (lockType === 'premium_module') return 'premium';
  return 'pro';
}

/* ───────── CONTEÚDO POR (PLANO ATUAL, TIPO) ───────── */

function getPaywallContent(currentTier: string, lockType: LockType, targetTier: string): PaywallContent {
  const benefitsHistory = [
    { icon: <LayoutGrid size={14} className="text-sky-500" />, text: 'Histórico completo — todos os meses e anos' },
    { icon: <BarChart3 size={14} className="text-emerald-500" />, text: 'Compare períodos e veja suas médias reais' },
    { icon: <FileText size={14} className="text-indigo-500" />, text: 'Exporte relatórios de qualquer período' },
  ];

  const benefitsIA = [
    { icon: <Brain size={14} className="text-indigo-500" />, text: 'Nexus com acesso ao seu histórico completo' },
    { icon: <BarChart3 size={14} className="text-emerald-500" />, text: 'Análises e comparações entre períodos' },
    { icon: <TrendingUp size={14} className="text-sky-500" />, text: 'Padrões que o mês atual sozinho não mostra' },
  ];

  const benefitsPremium = [
    { icon: <Target size={14} className="text-rose-500" />, text: 'Gestão de Dívidas com projeções e estratégia' },
    { icon: <TrendingUp size={14} className="text-emerald-500" />, text: 'Acompanhamento de investimentos e carteira' },
    { icon: <LayoutGrid size={14} className="text-sky-500" />, text: 'Patrimônio líquido consolidado' },
    { icon: <Shield size={14} className="text-indigo-500" />, text: 'Central completa com visão estratégica' },
  ];

  const benefitsFallback = [
    { icon: <LayoutGrid size={14} className="text-sky-500" />, text: 'Histórico completo de todos os meses' },
    { icon: <BarChart3 size={14} className="text-emerald-500" />, text: 'Comparações e médias ao longo do tempo' },
    { icon: <FileText size={14} className="text-indigo-500" />, text: 'Relatórios e exportação de períodos anteriores' },
    { icon: <Brain size={14} className="text-violet-500" />, text: 'Nexus com contexto do seu histórico' },
  ];

  /* ── DEFENSIVO: Premium nunca vê upgrade ── */
  if (currentTier === 'premium') {
    return {
      title: 'Recurso disponível no seu plano',
      subtitle:
        'Este recurso faz parte do Premium. Se não estiver acessível agora, pode ser uma instabilidade temporária. Tente novamente ou gerencie sua assinatura.',
      icon: <Crown size={22} className="text-amber-400" />,
      cta: 'Gerenciar assinatura',
      secondaryCta: 'Fechar',
      benefits: [],
    };
  }

  /* ── FREE → PRO (history/IA) ── */
  if (currentTier === 'free' && targetTier === 'pro') {
    if (lockType === 'history') {
      return {
        title: 'Seu passado revela sua proteção real',
        subtitle:
          'Sua rotina no Free segue sem limites. No Pro, você acessa meses e anos anteriores para comparar períodos, ver padrões e entender sua verdadeira margem de segurança.',
        icon: <TrendingUp size={22} className="text-sky-400" />,
        cta: 'Liberar histórico completo',
        secondaryCta: 'Seguir registrando minha rotina',
        benefits: benefitsHistory,
      };
    }
    if (lockType === 'ia') {
      return {
        title: 'Análises mais profundas no Pro',
        subtitle:
          'O Nexus já funciona no seu Free com o mês atual. No Pro, ele enxerga seu histórico completo para análises mais precisas, padrões sazonais e comparações entre períodos.',
        icon: <Sparkles size={22} className="text-violet-400" />,
        cta: 'Liberar análises completas',
        secondaryCta: 'Seguir registrando minha rotina',
        benefits: benefitsIA,
      };
    }
    // fallback Free → Pro
    return {
      title: 'Seu passado revela mais',
      subtitle:
        'Continue usando o Free para sua rotina. No Pro, você acessa seu histórico completo para comparar períodos, ver padrões e basear decisões em dados reais.',
      icon: <TrendingUp size={22} className="text-emerald-400" />,
      cta: 'Conhecer o Pro',
      secondaryCta: 'Seguir registrando minha rotina',
      benefits: benefitsFallback,
    };
  }

  /* ── FREE → PREMIUM ── */
  if (currentTier === 'free' && targetTier === 'premium') {
    return {
      title: 'Sua soberania conecta tudo',
      subtitle:
        'No Premium, sua rotina, dívidas, investimentos e patrimônio se encontram num só comando. Decisões conectadas, visão completa do seu ecossistema financeiro.',
      icon: <Crown size={22} className="text-amber-400" />,
      cta: 'Conhecer o Premium',
      secondaryCta: 'Seguir registrando minha rotina',
      benefits: benefitsPremium,
    };
  }

  /* ── PRO → PREMIUM ── */
  if (currentTier === 'pro' && targetTier === 'premium') {
    return {
      title: 'Você já enxerga seu passado. Agora conecte seu patrimônio.',
      subtitle:
        'No Premium, o Pro evolui para visão completa: dívidas, investimentos e patrimônio conectados à sua rotina. Decisões estratégicas com base no seu ecossistema financeiro real.',
      icon: <Crown size={22} className="text-amber-400" />,
      cta: 'Fazer upgrade para Premium',
      secondaryCta: 'Continuar no Pro',
      benefits: benefitsPremium,
    };
  }

  /* ── PRO → PRO (não deveria acontecer — FeatureGate já libera) ── */
  if (currentTier === 'pro') {
    return {
      title: 'Funcionalidade disponível no seu plano',
      subtitle:
        'Este recurso já está incluso no Pro. Se não estiver acessível, tente novamente ou entre em contato.',
      icon: <TrendingUp size={22} className="text-sky-400" />,
      cta: 'Ir para o Pro',
      secondaryCta: 'Fechar',
      benefits: [],
    };
  }

  /* ── FALLBACK GENÉRICO (nunca deve cair aqui) ── */
  return {
    title: 'Desbloqueie mais recursos',
    subtitle:
      'Continue usando o Free para sua rotina. Nos planos pagos você acessa histórico completo, análises avançadas e visão estratégica.',
    icon: <TrendingUp size={22} className="text-emerald-400" />,
    cta: 'Ver planos',
    secondaryCta: 'Fechar',
    benefits: benefitsFallback,
  };
}

/* ───────── COMPONENTE ───────── */

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: string;
}

export default function PaywallModal({ open, onClose, feature }: PaywallModalProps) {
  const navigate = useNavigate();
  const { effectiveTier } = useEntitlement();
  const [portalLoading, setPortalLoading] = useState(false);

  // E7-09: premium com pendência vai ao portal Stripe (regularizar),
  // não à página de venda.
  const handlePrimary = async () => {
    if (effectiveTier !== 'premium') {
      navigate('/app/mais/pricing');
      return;
    }
    setPortalLoading(true);
    try {
      const fn = httpsCallable(functions, 'createPortalSession');
      const result = await fn({ returnUrl: window.location.href });
      const url = (result.data as { url: string }).url;
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url });
      } else {
        window.open(url, '_blank');
      }
    } finally {
      setPortalLoading(false);
    }
  };

  if (!open) return null;

  const lockType = getLockType(feature);
  const targetTier = getTargetTier(lockType);
  const context = getPaywallContent(effectiveTier, lockType, targetTier);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 px-6 pt-8 pb-6 text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X size={16} />
          </button>
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {context.icon}
          </div>
          <h2 className="text-white text-lg font-black tracking-tight mb-1">
            {context.title}
          </h2>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto font-medium">
            {context.subtitle}
          </p>
        </div>

        {context.benefits.length > 0 && (
          <div className="px-6 py-5 space-y-3">
            {context.benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center shrink-0">
                  {b.icon}
                </div>
                <span className="text-slate-700 dark:text-slate-200 text-sm font-bold tracking-tight">{b.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={() => void handlePrimary()}
            disabled={portalLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black py-3.5 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 uppercase text-xs tracking-widest disabled:opacity-70"
          >
            {portalLoading ? 'Abrindo...' : <>{context.cta} <ChevronRight size={16} /></>}
          </button>
          <button
            onClick={onClose}
            className="w-full text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-[10px] uppercase tracking-widest py-2 transition-colors"
          >
            {context.secondaryCta}
          </button>
        </div>
      </div>
    </div>
  );
}
