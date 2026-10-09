import React from 'react';
import {
  Trash2, ExternalLink, ChevronRight, AlertTriangle, Loader2, Crown
} from 'lucide-react';

interface SettingsDangerZoneProps {
  onClearCache: () => void;
  onLogout: () => void;
  deleteStep: 'idle' | 'checking' | 'blocked_subscription' | 'confirming' | 'deleting' | 'error';
  deleteError: string | null;
  portalLoading: boolean;
  portalError: string | null;
  billingLoading: boolean;
  onDeleteAccount: () => void;
  onConfirmDelete: () => void;
  onOpenPortal: () => void;
  onResetDeleteFlow: () => void;
}

export const SettingsDangerZone: React.FC<SettingsDangerZoneProps> = ({
  onClearCache,
  onLogout,
  deleteStep,
  deleteError,
  portalLoading,
  portalError,
  billingLoading,
  onDeleteAccount,
  onConfirmDelete,
  onOpenPortal,
  onResetDeleteFlow,
}) => {
  return (
    <>
      {/* Dados & Sessão */}
      <div className="space-y-6 mb-6">
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={onClearCache}
            className="p-8 rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center justify-between group transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-5">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                <Trash2 size={24} />
              </div>
              <div>
                <p className="text-slate-900 dark:text-white font-bold text-base leading-none">Limpar Cache</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Resolve instabilidades visuais e de sincronia
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-500 dark:text-slate-400" />
          </button>

          <button
            onClick={onLogout}
            className="p-8 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-[2rem] text-left flex items-center justify-between group transition-all shadow-card active:scale-[0.98]"
          >
            <div className="flex items-center gap-5">
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                <ExternalLink size={24} className="rotate-180" />
              </div>
              <div>
                <p className="text-slate-900 dark:text-white font-bold text-base leading-none">Sair da Conta</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                  Encerrar sua sessão atual com segurança
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Zona de Risco — Excluir Conta */}
        <div className="rounded-[2rem] border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-8">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="text-red-500 dark:text-red-400" size={20} />
            <h3 className="text-red-700 dark:text-red-400 font-black text-xs uppercase tracking-[0.2em]">
              Zona de Risco
            </h3>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div>
              <p className="text-red-800 dark:text-red-200 font-bold text-sm">Excluir minha conta</p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-1 max-w-md">
                A exclusão da conta é irreversível e remove todos os seus registros e histórico com o Nexus.
              </p>
            </div>
            <button
              onClick={onDeleteAccount}
              disabled={deleteStep === 'deleting' || deleteStep === 'checking' || billingLoading}
              className="w-full md:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-red-900/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {deleteStep === 'deleting' ? (
                <><Loader2 size={16} className="animate-spin" /> EXCLUINDO...</>
              ) : (
                'Excluir Minha Conta'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── MODAL: ASSINATURA ATIVA BLOQUEIA EXCLUSÃO ── */}
      {deleteStep === 'blocked_subscription' && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 bg-amber-50 dark:bg-amber-950/20 blur-3xl"></div>

            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-200 dark:border-amber-800">
              <Crown size={28} className="text-amber-600 dark:text-amber-400" />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">
              Você tem uma assinatura ativa
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs text-center leading-relaxed mb-6">
              Para excluir sua conta, você precisa primeiro cancelar sua assinatura. 
              O cancelamento não é feito automaticamente ao excluir a conta.
            </p>

            {portalError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium text-center">
                {portalError}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={onOpenPortal}
                disabled={portalLoading}
                className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20"
              >
                {portalLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> ABRINDO PORTAL...</>
                ) : (
                  <><ExternalLink size={16} /> Gerenciar assinatura</>
                )}
              </button>
              <button
                onClick={onResetDeleteFlow}
                className="w-full py-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-xs uppercase tracking-widest transition-colors"
              >
                Voltar
              </button>
            </div>

            <p className="mt-4 text-[10px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
              Após cancelar no Portal Stripe, volte a esta tela. Se o estado da assinatura ainda não tiver atualizado, aguarde alguns instantes e tente novamente.
            </p>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMAÇÃO FINAL ── */}
      {(deleteStep === 'confirming' || deleteStep === 'deleting') && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 bg-red-50 dark:bg-red-950/20 blur-3xl"></div>

            <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-200 dark:border-red-800">
              <AlertTriangle size={28} className="text-red-600 dark:text-red-400" />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">
              Excluir conta permanentemente?
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs text-center leading-relaxed mb-6">
              Esta ação é irreversível. Todos os seus lançamentos, metas, histórico com o Nexus e configurações serão apagados para sempre.
            </p>

            <div className="space-y-3">
              <button
                onClick={onConfirmDelete}
                disabled={deleteStep === 'deleting'}
                className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                {deleteStep === 'deleting' ? (
                  <><Loader2 size={16} className="animate-spin" /> EXCLUINDO...</>
                ) : (
                  'Sim, excluir minha conta'
                )}
              </button>
              <button
                onClick={onResetDeleteFlow}
                className="w-full py-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-xs uppercase tracking-widest transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: ERRO NA EXCLUSÃO ── */}
      {deleteStep === 'error' && deleteError && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 bg-red-50 dark:bg-red-950/20 blur-3xl"></div>

            <div className="w-14 h-14 bg-red-100 dark:bg-red-950/60 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-200 dark:border-red-800">
              <AlertTriangle size={28} className="text-red-600 dark:text-red-400" />
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white text-center mb-2">
              Erro ao excluir conta
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs text-center leading-relaxed mb-6">
              {deleteError}
            </p>

            <div className="space-y-3">
              <button
                onClick={onDeleteAccount}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Tentar novamente
              </button>
              <button
                onClick={onResetDeleteFlow}
                className="w-full py-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold text-xs uppercase tracking-widest transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsDangerZone;
