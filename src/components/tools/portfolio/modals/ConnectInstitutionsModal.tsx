import React, { useEffect, useRef } from 'react';
import { X, Building2, FileSpreadsheet, PlusCircle, ShieldCheck } from 'lucide-react';

interface ConnectInstitutionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImport?: () => void;
  onOpenManual?: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal informativo de Conexão Automática de Instituições (Em desenvolvimento)
 * Apresenta a futura integração com linguagem honesta e sem garantias precipitadas:
 * recurso em desenvolvimento e instituições compatíveis ainda em definição.
 * Sem solicitar credenciais, sem promessas vazias e com foco acessível e contido.
 */
export const ConnectInstitutionsModal: React.FC<ConnectInstitutionsModalProps> = ({
  isOpen,
  onClose,
  onOpenImport,
  onOpenManual,
}) => {
  const modalCardRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);
  const isNavigatingAwayRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    // Reset flag ao abrir
    isNavigatingAwayRef.current = false;

    // 1. Memoriza o elemento que disparou a abertura para devolver o foco ao fechar
    triggerElementRef.current = document.activeElement as HTMLElement | null;

    // 2. Foco inicial no primeiro elemento focável do modal
    const focusTimer = setTimeout(() => {
      if (modalCardRef.current) {
        const focusable = modalCardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 0);

    // 3. Contenção de foco (Tab / Shift+Tab) e fechamento por Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        if (!modalCardRef.current) return;
        const focusables = Array.from(
          modalCardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !modalCardRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !modalCardRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);

      // 4. Retorno do foco ao elemento acionador original apenas se não estiver transicionando para outro modal
      if (!isNavigatingAwayRef.current && triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
        triggerElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleImportAction = () => {
    isNavigatingAwayRef.current = true;
    onClose();
    onOpenImport?.();
  };

  const handleManualAction = () => {
    isNavigatingAwayRef.current = true;
    onClose();
    onOpenManual?.();
  };

  return (
    <div
      data-testid="connect-institutions-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-institutions-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalCardRef}
        className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6 md:p-8 text-slate-900 dark:text-white shadow-2xl max-w-lg w-full relative"
      >
        {/* Botão Fechar */}
        <button
          type="button"
          data-testid="modal-close-button"
          onClick={onClose}
          aria-label="Fechar modal"
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 pr-6">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                Em desenvolvimento
              </span>
            </div>
            <h2
              id="connect-institutions-title"
              className="text-lg md:text-xl font-black text-slate-950 dark:text-white tracking-tight leading-snug"
            >
              Conexão automática em desenvolvimento
            </h2>
          </div>
        </div>

        {/* Corpo Informativo com Linguagem Simples e Direta */}
        <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium mb-6">
          <p>
            A sincronização automática com instituições financeiras e corretoras é um recurso em desenvolvimento. As instituições compatíveis ainda estão em definição.
          </p>
          <p>
            Enquanto essa funcionalidade não estiver disponível, você pode importar suas posições por planilha ou cadastrar seus ativos manualmente. No passo seguinte, você registra suas cotas, saldo atual ou compras.
          </p>

          {/* Destaque de Rigor Contábil e Autoridade Silenciosa */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              O Finanças Pro Invest nunca estima preço médio, quantidade ou resultado fiscal sem dados suficientes.
            </p>
          </div>
        </div>

        {/* Ações Disponíveis */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {onOpenImport && (
            <button
              type="button"
              data-testid="modal-import-button"
              onClick={handleImportAction}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importar arquivo</span>
            </button>
          )}

          {onOpenManual && (
            <button
              type="button"
              data-testid="modal-manual-button"
              onClick={handleManualAction}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>Cadastrar manualmente</span>
            </button>
          )}

          <button
            type="button"
            data-testid="modal-dismiss-button"
            onClick={onClose}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <span>Entendi</span>
          </button>
        </div>
      </div>
    </div>
  );
};
