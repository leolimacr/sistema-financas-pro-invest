import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, ArrowRight, Shield, Crown, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ToastContext } from '../../contexts/ToastContext';
import { registerVipInterest } from '../../services/purchaseService';
import type { BillingTier } from '../../types/billing';

interface VipWaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: BillingTier;
  cycle: 'monthly' | 'yearly';
}

export const VipWaitlistModal: React.FC<VipWaitlistModalProps> = ({
  isOpen,
  onClose,
  tier,
  cycle,
}) => {
  const { user } = useAuth();
  const toastCtx = React.useContext(ToastContext);
  const addToast = toastCtx?.addToast ?? (() => {});

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (user?.email) setEmail(user.email);
      if (user?.displayName) setName(user.displayName);
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, user?.email, user?.displayName]);

  if (!isOpen) return null;

  const isPremium = tier === 'premium';
  const tierLabel = isPremium ? 'Premium' : 'Pro';
  const cycleLabel = cycle === 'yearly' ? 'Anual' : 'Mensal';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Por favor, informe um e-mail válido.');
      return;
    }

    if (!user) {
      setError('Faça login para registrar sua vaga.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await registerVipInterest({
        userId: user.uid,
        email,
        name,
        whatsapp,
        tier: isPremium ? 'premium' : 'pro',
        cycle,
      });

      setSuccess(true);
      addToast('Vaga garantida na Lista VIP!', 'success');
    } catch (err) {
      if (import.meta.env.DEV) console.error('[VipWaitlist] Erro ao registrar:', err);
      setError('Não foi possível salvar seu registro. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vip-modal-title"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900 text-slate-100 shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fundo */}
        <div
          className={`absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
            isPremium ? 'bg-emerald-500' : 'bg-sky-500'
          }`}
        />

        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar modal"
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100 focus:outline-none"
        >
          <X size={18} />
        </button>

        <div className="p-6 md:p-8">
          {success ? (
            <div className="flex flex-col items-center text-center py-4 space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Check size={32} strokeWidth={2.5} />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">Vaga Garantida na Lista VIP!</h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Registramos seu interesse no plano <strong className="text-slate-200">{tierLabel} ({cycleLabel})</strong>.
                  Você receberá condições exclusivas e acesso prioritário diretamente no seu e-mail e no Sininho.
                </p>
              </div>

              <div className="w-full rounded-2xl bg-slate-800/60 border border-slate-700/50 p-3.5 text-left text-xs space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plano Selecionado:</span>
                  <span className="font-bold text-white">{tierLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ciclo:</span>
                  <span className="font-bold text-white">{cycleLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">E-mail:</span>
                  <span className="font-mono text-slate-200 truncate max-w-[200px]">{email}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full mt-2 inline-flex justify-center items-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-700 px-5 py-3 text-sm font-bold text-white transition active:scale-[0.98]"
              >
                Concluído
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Cabeçalho */}
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300">
                  <Crown size={13} className="text-amber-400" />
                  <span>Acesso Antecipado • Lista VIP</span>
                </div>

                <h2 id="vip-modal-title" className="text-xl font-black tracking-tight text-white">
                  Liberando em Primeira Mão
                </h2>

                <p className="text-xs text-slate-400 leading-relaxed">
                  As assinaturas do Finanças Pro Invest estão em liberação gradual para garantir a máxima soberania e precisão aos usuários. Entre na Lista VIP para receber o convite com condição especial.
                </p>
              </div>

              {/* Tag do Plano */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-800/70 border border-slate-700/60 p-3.5">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isPremium
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    }`}
                  >
                    {isPremium ? <Shield size={20} /> : <Sparkles size={20} />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Plano {tierLabel}</span>
                    <span className="text-[11px] text-slate-400 block">Faturamento {cycleLabel}</span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/40">
                  Sem cobrança agora
                </span>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                  {error}
                </div>
              )}

              {/* Campos do Formulário */}
              <div className="space-y-3">
                <div>
                  <label htmlFor="vip-email" className="block text-xs font-bold text-slate-300 mb-1">
                    Seu E-mail <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="vip-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label htmlFor="vip-name" className="block text-xs font-bold text-slate-300 mb-1">
                    Nome Completo <span className="text-slate-500 font-normal">(opcional)</span>
                  </label>
                  <input
                    id="vip-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como prefere ser chamado"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>

                <div>
                  <label htmlFor="vip-whatsapp" className="block text-xs font-bold text-slate-300 mb-1">
                    WhatsApp para aviso prioritário <span className="text-slate-500 font-normal">(opcional)</span>
                  </label>
                  <input
                    id="vip-whatsapp"
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(XX) 9XXXX-XXXX"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  />
                </div>
              </div>

              {/* Botão de Envio */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full inline-flex justify-center items-center gap-2 rounded-2xl py-3.5 px-5 text-sm font-bold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50 ${
                  isPremium
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50'
                    : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 shadow-sky-950/50'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Garantindo vaga...</span>
                  </>
                ) : (
                  <>
                    <span>Garantir Vaga na Lista VIP</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default VipWaitlistModal;
