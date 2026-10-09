import React, { useState, useEffect, useCallback } from 'react';
import {
  Check,
  CheckCircle,
  Zap,
  Shield,
  BarChart3,
  Target,
  ArrowRight,
  Crown,
  Loader2,
  Sparkles,
  QrCode,
  ShieldCheck,
  TrendingUp,
  History,
  Lock,
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useEntitlement } from '../hooks/useEntitlement';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../hooks/useNavigation';
import { PLANS } from '../../config/stripePlans';
import VipWaitlistModal from './Billing/VipWaitlistModal';
import AsaasPixCheckoutModal from './Billing/AsaasPixCheckoutModal';
import PixReceiptCheckoutModal from './Billing/PixReceiptCheckoutModal';
import type { BillingTier, BillingStatus } from '../types/billing';

const TIER_ORDER: Record<BillingTier, number> = { free: 0, pro: 1, premium: 2 };

interface ButtonConfig {
  label: string;
  action: 'checkout' | 'portal' | 'none';
  disabled: boolean;
}

function getButtonConfig(
  columnTier: BillingTier,
  effectiveTier: BillingTier,
  billingStatus: BillingStatus,
): ButtonConfig {
  const userOrder = TIER_ORDER[effectiveTier] ?? 0;
  const colOrder = TIER_ORDER[columnTier] ?? 0;

  if (columnTier === 'free') {
    return { label: effectiveTier === 'free' ? 'Plano Atual' : 'Incluso', action: 'none', disabled: true };
  }

  if (effectiveTier !== 'free' && userOrder >= colOrder) {
    if (effectiveTier === columnTier) {
      if (billingStatus === 'past_due') return { label: 'Regularizar', action: 'portal', disabled: false };
      if (billingStatus === 'canceled') return { label: 'Reativar', action: 'portal', disabled: false };
      return { label: 'Gerenciar', action: 'portal', disabled: false };
    }
    return { label: 'Incluso', action: 'none', disabled: true };
  }

  if (effectiveTier !== 'free' && userOrder < colOrder) {
    return { label: 'Fazer Upgrade', action: 'checkout', disabled: false };
  }

  return { label: `Assinar ${columnTier === 'pro' ? 'Pro' : 'Premium'}`, action: 'checkout', disabled: false };
}

function getStatusBadge(billingStatus: BillingStatus): { label: string; color: string } | null {
  switch (billingStatus) {
    case 'trialing': return { label: 'Teste Gratuito', color: 'text-sky-600' };
    case 'active':   return null;
    case 'past_due': return { label: 'Pagamento Pendente', color: 'text-amber-600' };
    case 'canceled': return { label: 'Cancelado', color: 'text-slate-500' };
    default:         return null;
  }
}

export const PricingPage: React.FC = () => {
  const { loading, effectiveTier, billingStatus } = useEntitlement();
  const { user } = useAuth();
  const { handleNavigate } = useNavigation();
  const isNative = Capacitor.isNativePlatform();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [selectedVipTier, setSelectedVipTier] = useState<BillingTier>('pro');
  const [asaasModalOpen, setAsaasModalOpen] = useState(false);
  const [selectedAsaasTier, setSelectedAsaasTier] = useState<BillingTier>('pro');
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [selectedPixTier, setSelectedPixTier] = useState<BillingTier>('pro');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') {
      setCheckoutSuccess(true);
      window.history.replaceState({}, '', window.location.pathname);
      const timer = setTimeout(() => setCheckoutSuccess(false), 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCheckout = useCallback((_planId: string, tier: BillingTier) => {
    if (!user) {
      handleNavigate('login');
      return;
    }

    // Modo Acesso Antecipado / Lista VIP (Zero transação financeira ou dados bancários)
    setSelectedVipTier(tier);
    setVipModalOpen(true);
  }, [user, handleNavigate]);

  const handlePortal = useCallback(async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const fn = httpsCallable(functions, 'createPortalSession');
      const result = await fn({ returnUrl: window.location.href });
      const data = result.data as { url: string };
      if (isNative) {
        await Browser.open({ url: data.url });
      } else {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao abrir gerenciamento';
      setActionError(msg);
    } finally {
      setActionLoading(false);
    }
  }, [isNative]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 animate-in fade-in duration-500">
        <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-3" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full mb-6" />
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-6" />
                <div className="space-y-2 mb-8">
                  {[1, 2, 3, 4, 5].map((j) => (
                    <div key={j} className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                  ))}
                </div>
                <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-xl w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Preços dinâmicos baseados no ciclo selecionado
  const proPrice = billingCycle === 'yearly' ? 199.00 : 19.90;
  const proFormattedPrice = proPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const proEquivalentMonthly = (199 / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const premiumPrice = billingCycle === 'yearly' ? 399.00 : 39.90;
  const premiumFormattedPrice = premiumPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const premiumEquivalentMonthly = (399 / 12).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 animate-in fade-in duration-500 pb-20 transition-colors">
      {/* Cabeçalho da Página */}
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-4 text-center">
        <button
          onClick={() => handleNavigate('central')}
          className="mb-8 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-full shadow-xs"
        >
          ← Voltar ao App
        </button>

        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 px-4 py-1.5 text-xs font-black text-sky-800 dark:text-sky-300 shadow-xs mb-4">
          <Sparkles size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
          <span>Ativação Instantânea via Pix • Liberação Automática pelo Sistema Finanças Pro Invest</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight mb-4 tracking-tight">
          Assuma o Comando da Sua <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-sky-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Liberdade Financeira.
          </span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          No <strong>Free</strong>, construa sua base de proteção. No <strong>Pro</strong>, audite seu histórico e trajetória. No <strong>Premium</strong>, conecte rotina, dívidas e patrimônio em um único comando soberano.
        </p>

        {/* Seletor de Ciclo Unificado (Mensal vs Anual) */}
        <div className="mt-8 inline-flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              billingCycle === 'monthly'
                ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              billingCycle === 'yearly'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>Anual</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${billingCycle === 'yearly' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'}`}>
              2 meses grátis
            </span>
          </button>
        </div>
      </div>

      {checkoutSuccess && (
        <div className="max-w-3xl mx-auto px-4 my-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-sm font-bold text-emerald-700 flex items-center justify-center gap-2">
            <CheckCircle size={18} />
            <span>Assinatura ativada com sucesso! Bem-vindo ao {effectiveTier === 'premium' ? 'Premium' : effectiveTier === 'pro' ? 'Pro' : 'novo plano'}.</span>
          </div>
        </div>
      )}

      {actionError && (
        <div className="max-w-3xl mx-auto px-4 my-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center text-sm font-bold text-red-600">
            {actionError}
          </div>
        </div>
      )}

      {/* Grade de 3 Planos */}
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        
        {/* CARD 1: FREE */}
        <div className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-all">
          <div>
            <div className="mb-4">
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                Gratuito
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-3">Plano Free</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                Para organizar o dia a dia e criar o hábito financeiro sem custos.
              </p>
            </div>

            <div className="my-6 pb-6 border-b border-slate-100 dark:border-slate-800">
              <span className="text-4xl font-black text-slate-900 dark:text-white">R$ 0</span>
              <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold ml-1">/ sempre</span>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">Sem necessidade de cartão ou Pix</p>
            </div>

            <ul className="space-y-3 mb-8">
              {PLANS.FREE.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 leading-snug">
                  <Check size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {(() => {
              const btn = getButtonConfig('free', effectiveTier, billingStatus);
              return (
                <button
                  disabled
                  className="w-full py-3.5 rounded-xl font-bold uppercase text-[11px] tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-default"
                >
                  {btn.label}
                </button>
              );
            })()}
          </div>
        </div>

        {/* CARD 2: PRO */}
        <div className={`relative rounded-3xl border ${effectiveTier === 'pro' ? 'border-sky-500 ring-2 ring-sky-200 dark:ring-sky-900/40' : 'border-sky-200 dark:border-sky-900/60'} bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-md flex flex-col justify-between transition-all hover:border-sky-400`}>
          <div>
            <div className="mb-4">
              <span className="text-[11px] font-black uppercase tracking-widest text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 px-3 py-1 rounded-full">
                Seu Passado & Histórico
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-3">Finanças Pro</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
                Consulte todos os meses passados e entenda a evolução da sua proteção.
              </p>
            </div>

            <div className="my-6 pb-6 border-b border-sky-100 dark:border-sky-900/40">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 dark:text-white">{proFormattedPrice}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
                  /{billingCycle === 'yearly' ? 'ano' : 'mês'}
                </span>
              </div>
              {billingCycle === 'yearly' ? (
                <p className="text-[11px] text-sky-600 dark:text-sky-400 font-bold mt-1">
                  Equivalente a {proEquivalentMonthly}/mês (Economia de R$ 39,80)
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">Renovação simples via Pix</p>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {PLANS.PRO.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-snug font-medium">
                  <Check size={16} className="text-sky-600 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {(() => {
              const btn = getButtonConfig('pro', effectiveTier, billingStatus);
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (btn.disabled) return;
                    if (btn.action === 'checkout') {
                      handleCheckout(billingCycle === 'yearly' ? 'pro_annual' : 'pro_monthly', 'pro');
                    } else if (btn.action === 'portal') {
                      handlePortal();
                    }
                  }}
                  disabled={btn.disabled || actionLoading}
                  className={`w-full py-3.5 rounded-xl font-black uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-2 ${
                    btn.disabled
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-default'
                      : 'bg-sky-600 hover:bg-sky-700 text-white shadow-md active:scale-95'
                  }`}
                >
                  {btn.label === 'Assinar Pro' ? 'Assinar Pro via Pix' : btn.label}
                  {!btn.disabled && btn.action === 'checkout' && <ArrowRight size={14} />}
                </button>
              );
            })()}
          </div>
        </div>

        {/* CARD 3: PREMIUM (DESTAQUE MÁXIMO / MAIS ESCOLHIDO) */}
        <div className={`relative rounded-3xl border-2 ${effectiveTier === 'premium' ? 'border-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/40' : 'border-emerald-500'} bg-gradient-to-b from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 p-6 sm:p-7 shadow-xl shadow-emerald-500/10 flex flex-col justify-between transition-all transform md:-translate-y-2`}>
          
          {/* Badge Mais Escolhido */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-1.5 whitespace-nowrap">
            <Crown size={12} />
            <span>Mais Escolhido • Comando Soberano</span>
          </div>

          <div>
            <div className="mb-4 pt-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-3 py-1 rounded-full">
                Soberania Patrimonial Total
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-3">Finanças Premium</h3>
              <p className="text-slate-600 dark:text-slate-300 text-xs mt-1 leading-relaxed font-medium">
                O ecossistema definitivo: rotina, dívidas, metas e patrimônio conectados em um só comando.
              </p>
            </div>

            <div className="my-6 pb-6 border-b border-emerald-100 dark:border-emerald-900/40">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 dark:text-white">{premiumFormattedPrice}</span>
                <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold">
                  /{billingCycle === 'yearly' ? 'ano' : 'mês'}
                </span>
              </div>
              {billingCycle === 'yearly' ? (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">
                  Equivalente a {premiumEquivalentMonthly}/mês (Economia de R$ 79,80)
                </p>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">Renovação simples via Pix</p>
              )}
            </div>

            <ul className="space-y-3 mb-8">
              {PLANS.PREMIUM.features.map((feature, idx) => (
                <li key={feature} className="flex items-start gap-2.5 text-xs text-slate-800 dark:text-slate-200 leading-snug font-semibold">
                  <CheckCircle size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            {(() => {
              const btn = getButtonConfig('premium', effectiveTier, billingStatus);
              return (
                <button
                  type="button"
                  onClick={() => {
                    if (btn.disabled) return;
                    if (btn.action === 'checkout') {
                      handleCheckout(billingCycle === 'yearly' ? 'premium_annual' : 'premium_monthly', 'premium');
                    } else if (btn.action === 'portal') {
                      handlePortal();
                    }
                  }}
                  disabled={btn.disabled || actionLoading}
                  className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 ${
                    btn.disabled
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-default'
                      : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/30 active:scale-95'
                  }`}
                >
                  <Sparkles size={15} />
                  <span>{btn.label === 'Assinar Premium' ? 'Assinar Premium via Pix' : btn.label}</span>
                  {!btn.disabled && btn.action === 'checkout' && <ArrowRight size={15} />}
                </button>
              );
            })()}
          </div>
        </div>

      </div>

      {/* Caixa de Confiança e Metodologia Pix */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="text-center max-w-xl mx-auto space-y-1 mb-6">
            <h4 className="text-base font-black text-slate-900 dark:text-white">Como funciona a sua ativação via Pix</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sem burocracia, sem intermediários e com validação 100% automatizada.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-center">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
                <QrCode size={20} />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">1. Escolha e Pague</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Copie a chave Pix da favorecida ou escaneie o QR Code no seu aplicativo bancário.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <Sparkles size={20} />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">2. Envie o Comprovante</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Anexe o print ou PDF da transferência direto no modal de checkout do app.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
              <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                <ShieldCheck size={20} />
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">3. Liberação em 2s</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                O Sistema Finanças Pro Invest audita o comprovante e ativa seus recursos instantaneamente na sua conta.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center space-y-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
            <Lock size={13} className="text-slate-400 dark:text-slate-500" />
            <span>Pagamento direto e seguro via Banco Central do Brasil</span>
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Dúvidas ou suporte? <a href="mailto:contato@financasproinvest.com.br" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">contato@financasproinvest.com.br</a>
          </p>
        </div>
      </div>

      {/* Modais de Checkout */}
      <VipWaitlistModal
        isOpen={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
        tier={selectedVipTier}
        cycle={billingCycle}
      />

      <AsaasPixCheckoutModal
        isOpen={asaasModalOpen}
        onClose={() => setAsaasModalOpen(false)}
        tier={selectedAsaasTier}
        cycle={billingCycle}
      />

      <PixReceiptCheckoutModal
        isOpen={pixModalOpen}
        onClose={() => setPixModalOpen(false)}
        tier={selectedPixTier}
        cycle={billingCycle}
      />
    </div>
  );
};

export default PricingPage;
