import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react';
import type {
  PortfolioAsset,
  PortfolioMovement,
  PortfolioCashBalance,
} from '../../../../core/portfolio/portfolioTypes';
import {
  reconcileCashBalance,
} from '../../../../core/portfolio/portfolioMath';
import { formatCurrencyBRL } from '../portfolioViewUtils';

interface ReconcileCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  cashAssets: PortfolioAsset[];
  movements: PortfolioMovement[];
  cashBalances: Record<string, PortfolioCashBalance>;
  onConfirmSync: (cashAssetId: string) => Promise<void>;
}

export const ReconcileCashModal: React.FC<ReconcileCashModalProps> = ({
  isOpen,
  onClose,
  cashAssets,
  movements,
  cashBalances,
  onConfirmSync,
}) => {
  const [selectedCashId, setSelectedCashId] = useState<string>(() => {
    return cashAssets[0]?.id || '';
  });
  const [confirmedByUser, setConfirmedByUser] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const currentCashAsset = cashAssets.find((a) => a.id === selectedCashId) || cashAssets[0];
  const cashId = currentCashAsset?.id || '';

  const persisted = cashBalances[cashId] || null;
  const reconciliation = reconcileCashBalance(cashId, movements, persisted);
  const activeCount = movements.filter((m) => m.assetId === cashId && m.status === 'ACTIVE').length;

  const handleSync = async () => {
    if (!confirmedByUser || !cashId) return;

    setIsSyncing(true);
    setFeedbackMsg(null);
    try {
      await onConfirmSync(cashId);
      setFeedbackMsg({
        type: 'success',
        text: 'Caixa reconciliado com sucesso! O controle transacional foi alinhado ao livro-razão com registro de auditoria.',
      });
      setConfirmedByUser(false);
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Falha ao sincronizar saldo do caixa.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconcile-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 id="reconcile-modal-title" className="text-base font-bold">
                Auditoria e Reconciliação do Caixa
              </h3>
              <p className="text-xs text-slate-300 dark:text-slate-400">
                Confronto contábil entre Livro-Razão e Controle Transacional
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Fechar modal de reconciliação"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Seletor de conta de caixa (se houver mais de uma) */}
          {cashAssets.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Conta de Caixa Auditada
              </label>
              <select
                value={cashId}
                onChange={(e) => {
                  setSelectedCashId(e.target.value);
                  setConfirmedByUser(false);
                  setFeedbackMsg(null);
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                {cashAssets.map((ca) => (
                  <option key={ca.id} value={ca.id}>
                    {ca.name} ({ca.ticker})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Estado de Integridade */}
          {!reconciliation.isDivergent ? (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                  Caixa 100% Reconciliado e Íntegro
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  O saldo do livro-razão e o saldo transacional persistido estão em perfeita concordância.
                </p>
              </div>
            </div>
          ) : persisted === null ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/50 border-2 border-blue-300 dark:border-blue-800 rounded-xl flex items-center gap-3">
              <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-blue-950 dark:text-blue-200">
                  Controle Transacional Pendente de Inicialização
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  O livro-razão possui histórico, mas o documento de trava transacional ainda não foi inicializado.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 dark:bg-red-950/50 border-2 border-red-300 dark:border-red-800 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-red-950 dark:text-red-200">
                  Divergência Contábil Detectada
                </p>
                <p className="text-xs text-red-800 dark:text-red-300">
                  Há diferença entre os lançamentos do livro-razão e o saldo de trava. Novas operações estão bloqueadas até a reconciliação.
                </p>
              </div>
            </div>
          )}

          {/* Cards de Comparação */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Livro-Razão (Auditável)
              </span>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {formatCurrencyBRL(reconciliation.ledgerBalance)}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {activeCount} lançamentos ativos
              </span>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Controle Transacional
              </span>
              <p className="text-lg font-black text-slate-900 dark:text-white">
                {persisted !== null ? formatCurrencyBRL(persisted.availableBalanceBRL) : 'Não inicializado'}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {persisted ? `Versão ${persisted.version}` : 'Ausente no banco'}
              </span>
            </div>
          </div>

          {/* Linha da Diferença */}
          {reconciliation.difference !== 0 && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Divergência apurada:</span>
              <span className={`font-black ${reconciliation.difference > 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>
                {reconciliation.difference > 0 ? '+' : ''}
                {formatCurrencyBRL(reconciliation.difference)}
              </span>
            </div>
          )}

          {feedbackMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/50 text-red-900 dark:text-red-300 border border-red-300 dark:border-red-800'
              }`}
            >
              {feedbackMsg.text}
            </div>
          )}

          {/* Termo de Confirmação Explícita */}
          {reconciliation.isDivergent && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={confirmedByUser}
                  onChange={(e) => setConfirmedByUser(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-slate-900"
                />
                <span>
                  Confirmo a reconciliação e sincronização manual do controle transacional com base no saldo do livro-razão (<strong>{formatCurrencyBRL(reconciliation.ledgerBalance)}</strong>).
                </span>
              </label>

              <button
                type="button"
                onClick={handleSync}
                disabled={!confirmedByUser || isSyncing}
                className="w-full py-2.5 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl shadow transition-all flex items-center justify-center gap-2"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sincronizando com Trilha de Auditoria...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Sincronizar e Reconciliar Caixa</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
