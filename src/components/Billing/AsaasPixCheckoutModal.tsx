import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, Copy, Check, ShieldCheck, Clock, CheckCircle2, ArrowRight, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEntitlement } from '../../hooks/useEntitlement';
import { createAsaasPixSubscription, type AsaasPixSubscriptionResponse } from '../../services/asaasService';
import type { BillingTier } from '../../types/billing';

interface AsaasPixCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: BillingTier;
  cycle: 'monthly' | 'yearly';
}

export const AsaasPixCheckoutModal: React.FC<AsaasPixCheckoutModalProps> = ({
  isOpen,
  onClose,
  tier,
  cycle,
}) => {
  const { user } = useAuth();
  const { effectiveTier } = useEntitlement();

  const [step, setStep] = useState<'form' | 'pix' | 'success'>('form');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixData, setPixData] = useState<AsaasPixSubscriptionResponse | null>(null);

  // Preenche dados do usuário
  useEffect(() => {
    if (isOpen) {
      if (user?.displayName) setName(user.displayName);
      setError(null);
      setCopied(false);
      // Se o usuário já tiver o tier ativo
      if (effectiveTier === tier && tier !== 'free') {
        setStep('success');
      } else {
        setStep('form');
        setPixData(null);
      }
    }
  }, [isOpen, user, effectiveTier, tier]);

  // Listener reativo: se o usuário estiver na tela de PIX e o webhook confirmar no Firestore
  useEffect(() => {
    if (isOpen && step === 'pix' && effectiveTier === tier && tier !== 'free') {
      setStep('success');
    }
  }, [isOpen, step, effectiveTier, tier]);

  // Fechar com Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPremium = tier === 'premium';
  const planId = `${tier}_${cycle === 'yearly' ? 'annual' : 'monthly'}` as const;
  const planName = isPremium ? 'Finanças Premium' : 'Finanças Pro';
  const planPrice = cycle === 'yearly'
    ? (isPremium ? 'R$ 399,00 / ano' : 'R$ 199,00 / ano')
    : (isPremium ? 'R$ 39,90 / mês' : 'R$ 19,90 / mês');

  // Máscaras de input
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d)/, '$1.$2');
    v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    setCpf(v);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    v = v.replace(/^(\d{2})(\d)/g, '($1) $2');
    v = v.replace(/(\d)(\d{4})$/, '$1-$2');
    setPhone(v);
  };

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setError('Por favor, informe um CPF válido com 11 dígitos.');
      return;
    }
    if (!name.trim()) {
      setError('Por favor, informe seu nome completo.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await createAsaasPixSubscription({
        planId,
        customer: {
          name: name.trim(),
          cpfCnpj: cleanCpf,
          phone: phone.trim() || undefined,
        },
      });

      setPixData(response);
      setStep('pix');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível gerar a chave Pix. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixData?.pixPayload) return;
    try {
      await navigator.clipboard.writeText(pixData.pixPayload);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do modal */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isPremium ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'}`}>
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Assinatura via Pix Recorrente
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {planName} • <span className="font-bold text-slate-800 dark:text-slate-200">{planPrice}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* PASSO 1: Formulário com dados do pagador */}
        {step === 'form' && (
          <form onSubmit={handleGeneratePix} className="space-y-4">
            <div className="rounded-2xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/30 p-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-sky-600 dark:text-sky-400 shrink-0" />
                Pagamento seguro e ativação automática
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                O Banco Central exige nome e CPF para emissão de QR Code Pix dinâmico. O sistema identifica seu pagamento em segundos e libera seu acesso na hora.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs font-bold text-rose-700 dark:text-rose-400">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome como no banco"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  CPF
                </label>
                <input
                  type="text"
                  required
                  value={cpf}
                  onChange={handleCpfChange}
                  placeholder="000.000.000-00"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  WhatsApp / Celular <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-mono text-slate-900 dark:text-white outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition active:scale-95 flex items-center justify-center gap-2 ${
                isPremium
                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                  : 'bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Gerando Pix Seguro...</span>
                </>
              ) : (
                <>
                  <span>Gerar Pix de Pagamento</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* PASSO 2: QR Code e Código Pix Copia e Cola */}
        {step === 'pix' && pixData && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Valor do Pix
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {pixData.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </div>

            {/* Imagem do QR Code Pix */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              {pixData.pixQrCodeImage ? (
                <img
                  src={`data:image/png;base64,${pixData.pixQrCodeImage}`}
                  alt="QR Code Pix"
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-xl shadow-xs border border-white bg-white p-2"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-white rounded-xl border border-slate-200">
                  <QrCode size={64} className="text-slate-400" />
                </div>
              )}

              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1 rounded-full">
                <Clock size={13} />
                <span>Validade: 30 minutos</span>
              </div>
            </div>

            {/* Código Pix Copia e Cola */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Pix Copia e Cola
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={pixData.pixPayload}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 pr-28 text-xs font-mono text-slate-600 dark:text-slate-300 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-sky-600 hover:bg-sky-700 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={13} strokeWidth={3} />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Como pagar */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-bold text-slate-800 dark:text-slate-200">Como pagar:</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <li>Abra o aplicativo do seu banco no celular.</li>
                <li>Acesse a área **Pix** e escolha **Pix Copia e Cola** (ou ler QR Code).</li>
                <li>Cole o código acima e confirme o pagamento.</li>
              </ol>
            </div>

            {/* Status de espera em tempo real */}
            <div className="flex items-center justify-center gap-2.5 py-2 text-xs font-bold text-sky-700 dark:text-sky-400">
              <RefreshCw size={15} className="animate-spin text-sky-600 dark:text-sky-400 shrink-0" />
              <span>Aguardando confirmação do banco...</span>
            </div>
          </div>
        )}

        {/* PASSO 3: Sucesso e Ativação Imediata */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-md">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">
                Plano {planName} Ativado!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                Seu pagamento foi confirmado com sucesso. Todas as funcionalidades e limites soberanos já estão liberados na sua conta.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition active:scale-95"
            >
              Começar a Usar Agora
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AsaasPixCheckoutModal;
