import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Building,
  Calendar,
  AlertOctagon,
  ExternalLink,
  ArrowDownLeft,
} from 'lucide-react';
import {
  fetchPixAuditQueue,
  executePixAuditDecision,
  executeCompletePixRefund,
  type PixAuditItem,
} from '../../services/adminPixAuditService';
import { usePixAudit } from '../../contexts/PixAuditContext';
import { DocumentViewerModal } from './DocumentViewerModal';

interface PixAuditQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PixAuditQueueModal: React.FC<PixAuditQueueModalProps> = ({ isOpen, onClose }) => {
  const { refreshAudit } = usePixAudit();
  const [items, setItems] = useState<PixAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Visualizador com Zoom Soberano
  const [viewingDocument, setViewingDocument] = useState<{
    base64: string;
    mimeType: string;
    transactionId: string;
    title: string;
  } | null>(null);

  // Estado para diálogo de confirmação de revogação
  const [revokingItem, setRevokingItem] = useState<PixAuditItem | null>(null);
  const [revocationReason, setRevocationReason] = useState('Transferência Pix não identificada no extrato bancário.');

  // Estado para diálogo de confirmação de devolução Pix (valor menor)
  const [refundingItem, setRefundingItem] = useState<PixAuditItem | null>(null);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchPixAuditQueue();
      setItems(data);
    } catch (err: any) {
      console.error('Erro ao carregar fila de auditoria Pix:', err);
      setError(err?.message || 'Falha ao buscar fila de auditoria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadQueue();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async (item: PixAuditItem) => {
    try {
      setActionLoadingId(item.transactionId);
      await executePixAuditDecision({
        transactionId: item.transactionId,
        action: 'confirm',
      });

      // Atualiza o estado local imediatamente
      setItems((prev) =>
        prev.map((it) =>
          it.transactionId === item.transactionId
            ? { ...it, status: 'confirmed', effectiveStatus: 'confirmed' }
            : it
        )
      );
      refreshAudit();
    } catch (err: any) {
      alert(`Erro ao confirmar pagamento: ${err?.message || 'Tente novamente.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokingItem) return;
    try {
      setActionLoadingId(revokingItem.transactionId);
      await executePixAuditDecision({
        transactionId: revokingItem.transactionId,
        action: 'revoke',
        revocationReason,
      });

      // Atualiza o estado local imediatamente
      setItems((prev) =>
        prev.map((it) =>
          it.transactionId === revokingItem.transactionId
            ? {
                ...it,
                status: 'revoked',
                effectiveStatus: 'revoked',
                revocationReason,
              }
            : it
        )
      );
      setRevokingItem(null);
      refreshAudit();
    } catch (err: any) {
      alert(`Erro ao revogar assinatura: ${err?.message || 'Tente novamente.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmRefund = async () => {
    if (!refundingItem) return;
    try {
      setActionLoadingId(refundingItem.transactionId);
      await executeCompletePixRefund({
        transactionId: refundingItem.transactionId,
      });

      // Atualiza o estado local imediatamente
      setItems((prev) =>
        prev.map((it) =>
          it.transactionId === refundingItem.transactionId
            ? {
                ...it,
                status: 'refunded',
                effectiveStatus: 'refunded',
                refundStatus: 'refunded',
              }
            : it
        )
      );
      setRefundingItem(null);
      refreshAudit();
    } catch (err: any) {
      alert(`Erro ao registrar devolução: ${err?.message || 'Tente novamente.'}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const calculateTimeRemaining = (deadlineStr: string | null) => {
    if (!deadlineStr) return null;
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff <= 0) return 'Prazo de 3 dias expirado (auto-confirmado)';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
      return `${days}d ${remainingHours}h restantes`;
    }
    return `${hours}h restantes`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">
                  Auditoria Soberana Pix
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Tripla Via
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Conferência em 3 dias • Confirmar, Revogar ou Inércia (Auto-aprovação)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadQueue}
              disabled={loading}
              title="Recarregar lista"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Guia Rápido da Tripla Via */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-5 py-3 text-xs text-slate-600 dark:text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
            <span>Regras de Auditoria:</span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={13} /> <strong>1. Confirmar:</strong> Pagamento aprovado
            </span>
            <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400">
              <AlertTriangle size={13} /> <strong>2. Revogar:</strong> Rebaixa para Free
            </span>
            <span className="inline-flex items-center gap-1 text-sky-700 dark:text-sky-400">
              <Clock size={13} /> <strong>3. Inércia:</strong> Efetiva em 3 dias sem ação
            </span>
            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
              <ArrowDownLeft size={13} /> <strong>4. Devolução:</strong> Valor menor em até 2 dias
            </span>
          </div>
        </div>

        {/* Corpo com a Lista de Pagamentos */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {loading && items.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-emerald-600" />
              <p className="text-sm font-medium">Buscando comprovantes processados pelo Sistema Finanças Pro Invest...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-3">
              <AlertOctagon size={20} className="shrink-0 text-rose-600 dark:text-rose-400" />
              <div>
                <p className="font-bold">Erro ao carregar auditoria</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          )}

          {!loading && items.length === 0 && !error && (
            <div className="py-16 text-center text-slate-400">
              <FileText size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhum comprovante na fila</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Assim que algum usuário assinar via Pix e tiver o comprovante auditado pelo Sistema Finanças Pro Invest, a transação aparecerá aqui para você conferir.
              </p>
            </div>
          )}

          {items.map((item) => {
            const isPending = item.effectiveStatus === 'pending_review';
            const isAutoConfirmed = item.effectiveStatus === 'auto_confirmed';
            const isConfirmed = item.effectiveStatus === 'confirmed';
            const isRevoked = item.effectiveStatus === 'revoked';
            const isUnderpaid = item.effectiveStatus === 'underpaid';
            const isRefunded = item.effectiveStatus === 'refunded';
            const timeRemaining = calculateTimeRemaining(item.deadline);

            return (
              <div
                key={item.transactionId}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isUnderpaid
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-sm'
                    : isRefunded
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-300 dark:border-slate-700 opacity-90'
                    : isPending
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 shadow-sm'
                    : isRevoked
                    ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-90'
                    : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          R$ {item.amount.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {item.planName}
                        </span>
                        {item.requiredAmount && item.requiredAmount > item.amount && (
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2 py-0.5 rounded-md">
                            Esperado: R$ {item.requiredAmount.toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        Transação: <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-700 dark:text-slate-300">{item.transactionId}</code>
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isUnderpaid && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                        <AlertTriangle size={13} />
                        Valor Menor • Devolução Pendente (em 2 dias)
                      </span>
                    )}
                    {isRefunded && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 size={13} />
                        Pix de Devolução Concluído
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                        <Clock size={13} className="animate-pulse" />
                        Pendente ({timeRemaining})
                      </span>
                    )}
                    {isAutoConfirmed && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 size={13} />
                        Efetivado por Inércia (3 dias)
                      </span>
                    )}
                    {isConfirmed && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 size={13} />
                        Confirmado Manualmente
                      </span>
                    )}
                    {isRevoked && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                        <AlertTriangle size={13} />
                        Assinatura Revogada
                      </span>
                    )}
                  </div>
                </div>

                {/* Detalhes da transação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 py-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">
                      <strong>Usuário:</strong> {item.userEmail || item.userId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span className="truncate">
                      <strong>Pagador:</strong> {item.payerName || 'Não identificado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                    <span>
                      <strong>Origem:</strong> {item.bankOrigin || 'Não informado'}
                    </span>
                  </div>
                </div>

                {/* Box de Estorno de Valor Menor */}
                {(isUnderpaid || isRefunded) && (
                  <div className={`mb-3 p-3 rounded-xl border text-xs ${isRefunded ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'}`}>
                    <div className="flex items-start gap-2">
                      <ArrowDownLeft size={16} className={`shrink-0 mt-0.5 ${isRefunded ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`} />
                      <div className="flex-1">
                        <p className="font-bold">
                          {isRefunded ? 'Estorno Efetuado e Confirmado' : 'Estorno / Devolução de Valor Menor (Prazo: até 2 dias corridos)'}
                        </p>
                        <p className="mt-0.5">
                          <strong>Chave Pix para Devolução:</strong>{' '}
                          {item.refundPixKey ? (
                            <code className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono text-slate-800 dark:text-slate-100 font-bold">
                              {item.refundPixKey}
                            </code>
                          ) : (
                            <span className="italic text-slate-500 dark:text-slate-400">Aguardando usuário cadastrar a chave no aplicativo</span>
                          )}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                          ⚠️ A chave Pix deve pertencer a <strong>{item.payerName || 'mesmo titular da conta'}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Motivo de revogação caso exista */}
                {isRevoked && item.revocationReason && (
                  <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle size={14} className="shrink-0" />
                    <span>
                      <strong>Motivo da Revogação:</strong> {item.revocationReason}
                    </span>
                  </div>
                )}

                {/* Ações e Visualização do Comprovante */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    {item.receiptBase64 ? (
                      <button
                        onClick={() =>
                          setViewingDocument({
                            base64: item.receiptBase64!,
                            mimeType: item.mimeType || 'image/jpeg',
                            transactionId: item.transactionId,
                            title: `Comprovante R$ ${item.amount.toFixed(2)} - ${item.planName}`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-sm"
                      >
                        <ExternalLink size={13} /> Ver Comprovante com Zoom
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                        Comprovante não disponível inline
                      </span>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center gap-2">
                    {/* Botão de Devolução (para valor menor) */}
                    {isUnderpaid && item.refundPixKey && (
                      <button
                        disabled={actionLoadingId === item.transactionId}
                        onClick={() => setRefundingItem(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-amber-600 hover:bg-amber-500 shadow-sm shadow-amber-600/30 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <ArrowDownLeft size={14} /> Confirmar Pix de Devolução Realizado
                      </button>
                    )}

                    {/* Botão de Revogar (disponível se não estiver revogado e não for sob devolução concluída) */}
                    {!isRevoked && !isRefunded && !isUnderpaid && (
                      <button
                        disabled={actionLoadingId === item.transactionId}
                        onClick={() => setRevokingItem(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <X size={14} /> Revogar Assinatura
                      </button>
                    )}

                    {/* Botão de Confirmar (disponível se pendente) */}
                    {isPending && (
                      <button
                        disabled={actionLoadingId === item.transactionId}
                        onClick={() => handleConfirm(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} /> Confirmar Pagamento
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visualizador Soberano com Zoom, Rotação e PDF */}
      {viewingDocument && (
        <DocumentViewerModal
          isOpen={!!viewingDocument}
          onClose={() => setViewingDocument(null)}
          fileBase64={viewingDocument.base64}
          mimeType={viewingDocument.mimeType}
          transactionId={viewingDocument.transactionId}
          title={viewingDocument.title}
        />
      )}

      {/* Modal de Confirmação de Revogação */}
      {revokingItem && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4">
              <AlertOctagon size={26} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Revogar Assinatura Pix?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
              O plano do usuário (<code>{revokingItem.userEmail || revokingItem.userId}</code>) será imediatamente cancelado e rebaixado para <strong>Gratuito</strong>. O usuário receberá um aviso explicando o cancelamento.
            </p>

            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Motivo da Revogação
            </label>
            <input
              type="text"
              value={revocationReason}
              onChange={(e) => setRevocationReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-rose-500 mb-5"
              placeholder="Ex: Valor não caiu na conta Bradesco da favorecida"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRevokingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmRevoke}
                disabled={actionLoadingId === revokingItem.transactionId}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50"
              >
                Sim, Revogar Assinatura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Devolução Pix Realizada */}
      {refundingItem && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <ArrowDownLeft size={26} />
            </div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              Confirmar Pix de Devolução Realizado?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 mb-4 leading-relaxed">
              Você realizou a transferência de devolução no valor de <strong>R$ {refundingItem.amount.toFixed(2).replace('.', ',')}</strong> para a chave:
              <br />
              <code className="inline-block mt-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-800 dark:text-slate-100 font-bold font-mono border border-slate-200 dark:border-slate-700">
                {refundingItem.refundPixKey}
              </code>
              <br />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 block">
                Ao confirmar, o sistema enviará <strong>automaticamente um e-mail</strong> para <code>{refundingItem.userEmail}</code> informando que a devolução foi concluída.
              </span>
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRefundingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmRefund}
                disabled={actionLoadingId === refundingItem.transactionId}
                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 size={14} /> Sim, Pix Efetuado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
