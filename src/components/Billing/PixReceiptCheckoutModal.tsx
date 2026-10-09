import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  UploadCloud,
  FileText,
  AlertCircle,
  QrCode,
  ArrowRight,
  Loader2,
  Building2,
  UserCheck,
  AlertTriangle,
  ArrowDownLeft,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext';
import { useEntitlement } from '../../hooks/useEntitlement';
import { fileToBase64, verifyPixReceipt, type VerifyPixReceiptResponse } from '../../services/pixReceiptService';
import { requestPixRefund } from '../../services/adminPixAuditService';
import type { BillingTier } from '../../types/billing';

interface PixReceiptCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: BillingTier;
  cycle: 'monthly' | 'yearly';
}

const RECIPIENT_NAME = (import.meta.env.VITE_PIX_RECIPIENT_NAME as string) || 'Finanças Pro Invest';
const BANK_NAME = (import.meta.env.VITE_PIX_BANK_NAME as string) || 'Instituição Autorizada';
const PIX_KEY = (import.meta.env.VITE_PIX_KEY as string) || 'pix@financasproinvest.com.br';

export const PixReceiptCheckoutModal: React.FC<PixReceiptCheckoutModalProps> = ({
  isOpen,
  onClose,
  tier,
  cycle,
}) => {
  const { user } = useAuth();
  const { effectiveTier } = useEntitlement();

  const [step, setStep] = useState<'details' | 'upload' | 'auditing' | 'success' | 'underpaid_refund'>('details');
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditStepIndex, setAuditStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [verifiedData, setVerifiedData] = useState<VerifyPixReceiptResponse['verifiedData'] | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);

  // Estados de Devolução para Valor Inferior (Underpaid)
  const [underpaidData, setUnderpaidData] = useState<{
    amountPaid: number;
    requiredAmount: number;
    transactionId: string;
    payerName: string | null;
    planName: string;
  } | null>(null);
  const [refundPixKey, setRefundPixKey] = useState('');
  const [refundPixKeyType, setRefundPixKeyType] = useState<'cpf' | 'email' | 'phone' | 'random'>('cpf');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  const [refundSubmitted, setRefundSubmitted] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset de estado ao abrir
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCopied(false);
      setSelectedFile(null);
      setFilePreview(null);
      setIsAuditing(false);
      setAuditStepIndex(0);
      setShowQrCode(false);
      setUnderpaidData(null);
      setRefundPixKey('');
      setRefundPixKeyType('cpf');
      setIsSubmittingRefund(false);
      setRefundSubmitted(false);
      setRefundError(null);

      if (effectiveTier === tier && tier !== 'free') {
        setStep('success');
      } else {
        setStep('details');
      }
    }
  }, [isOpen, effectiveTier, tier]);

  // Listener reativo se o Firestore ativar o plano
  useEffect(() => {
    if (isOpen && effectiveTier === tier && tier !== 'free') {
      setStep('success');
    }
  }, [isOpen, effectiveTier, tier]);

  // Fechar com Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isAuditing) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAuditing, onClose]);

  if (!isOpen) return null;

  const isPremium = tier === 'premium';
  const planId = `${tier}_${cycle === 'yearly' ? 'annual' : 'monthly'}` as const;
  const planName = isPremium ? 'Finanças Premium' : 'Finanças Pro';
  const planPriceNumber = cycle === 'yearly'
    ? (isPremium ? 399.00 : 199.00)
    : (isPremium ? 39.90 : 19.90);
  const planPriceFormatted = planPriceNumber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleCopyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 5MB.');
      return;
    }

    setError(null);
    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const handleAuditReceipt = async () => {
    if (!selectedFile) {
      setError('Por favor, anexe o comprovante antes de solicitar a validação.');
      return;
    }

    setError(null);
    setIsAuditing(true);
    setStep('auditing');
    setAuditStepIndex(0);

    // Animação de progresso da auditoria da IA
    const t1 = setTimeout(() => setAuditStepIndex(1), 800);
    const t2 = setTimeout(() => setAuditStepIndex(2), 1800);

    try {
      const { base64, mimeType } = await fileToBase64(selectedFile);

      const response = await verifyPixReceipt({
        base64File: base64,
        mimeType,
        planId,
      });

      clearTimeout(t1);
      clearTimeout(t2);

      if (response.success && response.verifiedData) {
        setVerifiedData(response.verifiedData);
        setStep('success');
      } else {
        throw new Error('Não foi possível confirmar o pagamento.');
      }
    } catch (err: any) {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsAuditing(false);

      // Tratamento especial para Valor Inferior (Underpaid)
      let underpaidPayload: any = null;
      try {
        if (typeof err?.message === 'string' && err.message.includes('UNDERPAID')) {
          underpaidPayload = JSON.parse(err.message);
        } else if (err?.details && typeof err.details === 'object' && err.details.code === 'UNDERPAID') {
          underpaidPayload = err.details;
        } else if (typeof err?.details === 'string' && err.details.includes('UNDERPAID')) {
          underpaidPayload = JSON.parse(err.details);
        }
      } catch {
        // parsing fallback
      }

      if (underpaidPayload && underpaidPayload.code === 'UNDERPAID') {
        setUnderpaidData({
          amountPaid: Number(underpaidPayload.amountPaid) || 0,
          requiredAmount: Number(underpaidPayload.requiredAmount) || 0,
          transactionId: String(underpaidPayload.transactionId || ''),
          payerName: underpaidPayload.payerName || null,
          planName: String(underpaidPayload.planName || planName),
        });
        setStep('underpaid_refund');
        return;
      }

      setStep('upload');
      let message = err?.details || err?.message || 'Erro ao auditar comprovante. Verifique o arquivo e tente novamente.';
      if (typeof message === 'string') {
        const lower = message.toLowerCase();
        if (lower === 'internal' || lower.includes('not-found') || lower.includes('failed to fetch') || lower.includes('network')) {
          message = 'Não foi possível processar o comprovante automaticamente no momento. Verifique sua conexão e tente novamente em instantes.';
        }
      }
      setError(message);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleSubmitRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!underpaidData) return;
    if (!refundPixKey.trim()) {
      setRefundError('Por favor, informe sua chave Pix para estorno.');
      return;
    }

    setRefundError(null);
    setIsSubmittingRefund(true);
    try {
      await requestPixRefund({
        transactionId: underpaidData.transactionId,
        pixKey: refundPixKey.trim(),
        pixKeyType: refundPixKeyType,
      });
      setRefundSubmitted(true);
    } catch (err: any) {
      setRefundError(err?.message || 'Falha ao registrar a chave Pix para devolução. Tente novamente.');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => !isAuditing && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isPremium ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400'}`}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Assinatura com Chave Pix
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {planName} • <span className="font-bold text-slate-800 dark:text-slate-200">{planPriceFormatted} / {cycle === 'yearly' ? 'ano' : 'mês'}</span>
              </p>
            </div>
          </div>
          {!isAuditing && (
            <button
              onClick={onClose}
              aria-label="Fechar modal"
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Mensagem de Erro Geral */}
        {error && (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 p-4 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-rose-900 dark:text-rose-200">Atenção ao Comprovante</p>
              <p className="text-rose-700 dark:text-rose-400 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* PASSO 1: Detalhes do Pix para Transferência */}
        {step === 'details' && (
          <div className="space-y-4">
            {/* Caixa de Valor e Favorecida */}
            <div className="rounded-2xl border border-sky-100 dark:border-sky-900/40 bg-gradient-to-br from-sky-50/70 to-slate-50 dark:from-sky-950/30 dark:to-slate-800/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Valor a Transferir</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{planPriceFormatted}</span>
              </div>

              <div className="border-t border-sky-100/80 dark:border-sky-900/40 pt-2.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <UserCheck size={14} className="text-sky-600 dark:text-sky-400" /> Favorecida:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{RECIPIENT_NAME}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Building2 size={14} className="text-sky-600 dark:text-sky-400" /> Banco:
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">{BANK_NAME}</span>
                </div>
              </div>
            </div>

            {/* Chave Pix e Botão Copiar */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Chave Pix (Aleatória)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={PIX_KEY}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 pr-28 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyPixKey}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-sky-600 hover:bg-sky-700 text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check size={13} strokeWidth={3} />
                      <span>Copiada!</span>
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

            {/* Alternar exibição do QR Code */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 inline-flex items-center gap-1 transition"
              >
                <QrCode size={13} />
                <span>{showQrCode ? 'Ocultar QR Code' : 'Escanear QR Code com o Celular'}</span>
              </button>

              {showQrCode && (
                <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center animate-in fade-in">
                  <QRCodeSVG value={PIX_KEY} size={160} level="M" className="p-2 bg-white rounded-xl shadow-xs border border-slate-200" />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">Chave Pix: {PIX_KEY}</p>
                </div>
              )}
            </div>

            {/* Instruções de 3 passos */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p className="font-bold text-slate-800 dark:text-slate-200">Como funciona a liberação instantânea:</p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                <li>Abra o app do seu banco e transfira <strong>{planPriceFormatted}</strong> para a chave acima.</li>
                <li>Salve o comprovante ou tire um print nítido da confirmação.</li>
                <li>Clique no botão abaixo para anexar e o <strong>Sistema Finanças Pro Invest liberará seu acesso na hora</strong>.</li>
              </ol>
            </div>

            {/* Botão para Avançar para Upload */}
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition active:scale-95 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700"
            >
              <span>Já fiz o Pix — Enviar Comprovante</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* PASSO 2: Upload do Comprovante */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="text-center space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Auditoria Automática do Sistema
              </p>
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                Anexe o Comprovante do Pix
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                O Sistema Finanças Pro Invest analisará os dados bancários em segundos para liberar seu acesso.
              </p>
            </div>

            {/* Input de arquivo oculto */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,application/pdf"
              className="hidden"
            />

            {/* Área de Arrastar e Soltar / Selecionar */}
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-sky-300 dark:border-sky-800 hover:border-sky-500 dark:hover:border-sky-600 bg-sky-50/40 dark:bg-sky-950/20 hover:bg-sky-50/70 dark:hover:bg-sky-950/40 p-6 sm:p-8 text-center transition space-y-2 flex flex-col items-center justify-center"
              >
                <div className="p-3 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                  <UploadCloud size={28} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Toque para selecionar imagem ou PDF
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    PNG, JPG, WEBP ou PDF (máx. 5MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {filePreview ? (
                    <img
                      src={filePreview}
                      alt="Prévia do comprovante"
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <FileText size={24} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {(selectedFile.size / 1024).toFixed(0)} KB • Pronto para auditoria
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700 transition"
                    title="Remover arquivo"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="py-3.5 px-4 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={!selectedFile}
                onClick={handleAuditReceipt}
                className="flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition active:scale-95 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={16} />
                <span>Validar Comprovante no Sistema</span>
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: Auditoria em Andamento */}
        {step === 'auditing' && (
          <div className="py-8 text-center space-y-5">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-sky-100 dark:border-sky-950 border-t-sky-600 animate-spin" />
              <Sparkles size={28} className="text-sky-600 dark:text-sky-400 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-base font-black text-slate-900 dark:text-white">
                O Sistema Finanças Pro Invest está auditando seu comprovante...
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Analisando dados do Banco Central e autenticidade da transferência.
              </p>
            </div>

            {/* Checklist de Etapas */}
            <div className="max-w-xs mx-auto rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 p-4 text-xs space-y-2 text-left">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                <Check size={14} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400" />
                <span>Arquivo bancário recebido</span>
              </div>
              <div className={`flex items-center gap-2 transition ${auditStepIndex >= 1 ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                {auditStepIndex >= 1 ? (
                  <Check size={14} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Loader2 size={14} className="animate-spin text-sky-600 dark:text-sky-400" />
                )}
                <span>Auditando código de autenticação...</span>
              </div>
              <div className={`flex items-center gap-2 transition ${auditStepIndex >= 2 ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>
                {auditStepIndex >= 2 ? (
                  <Check size={14} strokeWidth={3} className="text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Loader2 size={14} className="animate-spin text-sky-600 dark:text-sky-400" />
                )}
                <span>Validando favorecido e valor...</span>
              </div>
            </div>
          </div>
        )}

        {/* PASSO 4: Sucesso e Ativação Imediata */}
        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-md animate-in zoom-in-50">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-black text-slate-900 dark:text-white">
                Plano {planName} Ativado!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                Seu comprovante foi auditado e aprovado com sucesso pelo Sistema Finanças Pro Invest. Seu acesso soberano já está 100% liberado!
              </p>
            </div>

            {verifiedData && (
              <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 text-xs space-y-1.5 text-left max-w-sm mx-auto">
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Valor Confirmado:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {verifiedData.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Favorecida:</span>
                  <span className="font-bold text-slate-900 dark:text-white truncate ml-2">
                    {verifiedData.recipientName}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-300">
                  <span>Autenticação:</span>
                  <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate ml-2">
                    {verifiedData.transactionId}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition active:scale-95"
            >
              Começar a Usar Agora
            </button>
          </div>
        )}

        {/* PASSO 5: Tratamento de Valor Inferior & Devolução com Chave Pix */}
        {step === 'underpaid_refund' && underpaidData && (
          <div className="space-y-4">
            {!refundSubmitted ? (
              <form onSubmit={handleSubmitRefund} className="space-y-4">
                <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold text-sm">
                    <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Valor menor que o plano contratado</span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    Identificamos que o valor transferido (<strong>{underpaidData.amountPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>) é inferior ao valor do plano {underpaidData.planName} (<strong>{underpaidData.requiredAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>).
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                    Por segurança e transparência soberana, o valor transferido será <strong>devolvido integralmente para a sua conta via Pix</strong>.
                  </p>
                </div>

                {/* Resumo do comprovante */}
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Valor a ser estornado:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {underpaidData.amountPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Titular no Comprovante:</span>
                    <span className="font-bold text-slate-900 dark:text-white truncate ml-2">
                      {underpaidData.payerName || 'Identificado no Comprovante'}
                    </span>
                  </div>
                </div>

                {/* Regra de Titularidade e Prazo */}
                <div className="rounded-2xl border border-sky-100 dark:border-sky-900/40 bg-sky-50/60 dark:bg-sky-950/30 p-3.5 text-xs space-y-2 text-sky-900 dark:text-sky-200">
                  <div className="flex items-start gap-2">
                    <ShieldCheck size={16} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      <strong>Regra de Estorno:</strong> A chave Pix informada abaixo deve ser, obrigatoriamente, em nome do <strong>mesmo titular que realizou a transferência</strong> ({underpaidData.payerName || 'mesmo titular'}).
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <ArrowDownLeft size={16} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      <strong>Prazo Garantido:</strong> O estorno será realizado em <strong>até 2 dias úteis</strong> após a conferência bancária.
                    </p>
                  </div>
                </div>

                {/* Formulário da Chave Pix */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Sua Chave Pix para Devolução
                  </label>

                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                    {(['cpf', 'email', 'phone', 'random'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRefundPixKeyType(t)}
                        className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                          refundPixKeyType === t
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        {t === 'cpf' ? 'CPF' : t === 'email' ? 'E-mail' : t === 'phone' ? 'Celular' : 'Aleatória'}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={refundPixKey}
                    onChange={(e) => setRefundPixKey(e.target.value)}
                    placeholder={
                      refundPixKeyType === 'cpf'
                        ? 'Digite seu CPF (mesmo titular)'
                        : refundPixKeyType === 'email'
                        ? 'Digite seu e-mail'
                        : refundPixKeyType === 'phone'
                        ? 'Digite seu celular com DDD'
                        : 'Cole sua chave Pix aleatória'
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                {refundError && (
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-3 text-xs text-rose-700 dark:text-rose-400">
                    {refundError}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUnderpaidData(null);
                      setStep('upload');
                    }}
                    className="py-3 px-4 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Novo Envio
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRefund || !refundPixKey.trim()}
                    className="flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-md transition active:scale-95 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingRefund ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownLeft size={16} />
                        <span>Confirmar Chave de Devolução</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4 animate-in fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-md">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    Chave Pix Registrada com Sucesso!
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto leading-relaxed">
                    Sua solicitação de estorno no valor de <strong>{underpaidData.amountPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> foi registrada no sistema.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4 text-xs space-y-2 text-left max-w-sm mx-auto">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Chave Informada:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">
                      {refundPixKey}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Prazo de Devolução:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      Em até 2 dias úteis
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                    Um e-mail de confirmação será enviado para <strong>{user?.email || 'seu e-mail'}</strong> assim que o estorno for processado.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-md transition active:scale-95"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PixReceiptCheckoutModal;
