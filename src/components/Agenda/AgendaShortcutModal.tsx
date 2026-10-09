import React from 'react';
import { Smartphone, X } from 'lucide-react';
import { AgendaShortcutService } from '../../services/agendaShortcutService';

interface AgendaShortcutModalProps {
  open: boolean;
  isPinning: boolean;
  onClose: () => void;
  onRequestShortcut: () => void;
}

export const AgendaShortcutModal: React.FC<AgendaShortcutModalProps> = ({
  open,
  isPinning,
  onClose,
  onRequestShortcut,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-in fade-in duration-200"
      onClick={onClose}
      data-testid="agenda-shortcut-modal"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Smartphone size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">Atalho da Agenda</h3>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Acesso instantâneo com 1 toque</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Card com o Ícone da Agenda */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-sky-50/70 to-blue-50/40 dark:from-sky-950/40 dark:to-slate-800/40 border border-sky-100 dark:border-sky-900/40 flex items-center gap-4">
          <div className="relative shrink-0">
            <img
              src="/assets/images/brand/agenda-icon.png"
              alt="Ícone Agenda Finanças Pro Invest"
              className="w-16 h-16 rounded-2xl shadow-lg border-2 border-white dark:border-slate-800 object-cover"
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px] text-white font-black">
              ✓
            </span>
          </div>
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 text-[10px] font-black uppercase tracking-wider mb-1">
              Finanças Pro Invest
            </div>
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-snug">Agenda de Compromissos</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              Acesse suas tarefas e compromissos diretamente da tela inicial do celular com um único toque.
            </p>
          </div>
        </div>

        {/* Explicação Pedagógica: Por que criar o atalho? */}
        <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-black">
              1
            </div>
            <p>
              <strong className="text-slate-800 dark:text-slate-200 font-bold">Sem passos intermediários:</strong> Toque no ícone da Agenda na sua tela inicial e você será levado diretamente aos seus compromissos, sem precisar carregar a tela principal primeiro.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <div className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-black">
              2
            </div>
            <p>
              <strong className="text-slate-800 dark:text-slate-200 font-bold">Funciona Offline:</strong> Mesmo sem internet, o atalho abre imediatamente o caderno com os dados já salvos no seu aparelho.
            </p>
          </div>
        </div>

        {/* Ação Dinâmica Principal */}
        {AgendaShortcutService.isNativeAndroid() ? (
          <button
            type="button"
            onClick={onRequestShortcut}
            disabled={isPinning}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-sm shadow-md hover:shadow-lg hover:brightness-105 active:scale-98 transition flex items-center justify-center gap-2"
          >
            <Smartphone size={18} />
            <span>{isPinning ? 'Solicitando ao Android...' : 'Adicionar Atalho à Tela Inicial'}</span>
          </button>
        ) : null}

        {/* Passo a Passo Pedagógico */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            Outras Formas Práticas de Acessar:
          </span>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <span className="font-black text-slate-700 dark:text-slate-200 shrink-0">Opção A (Toque Longo):</span>
              <span>
                Na tela inicial do celular, <strong>pressione e segure o ícone do Finanças Pro Invest</strong> por 1 segundo. No menu que surgir, segure a opção <strong>&quot;Agenda&quot;</strong> e arraste para sua tela inicial.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-black text-slate-700 dark:text-slate-200 shrink-0">Opção B (Navegador/PWA):</span>
              <span>
                No Chrome/Safari, toque no menu <strong className="text-slate-800 dark:text-slate-200">⋮</strong> (ou Compartilhar no iPhone) e selecione <strong className="text-slate-800 dark:text-slate-200">&quot;Adicionar à tela de início&quot;</strong>.
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          data-testid="agenda-shortcut-close"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};

export default AgendaShortcutModal;
