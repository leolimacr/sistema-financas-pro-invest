import React from 'react';

interface DeleteConfirmTarget {
  id: string;
  title: string;
}

interface AgendaDeleteModalProps {
  target: DeleteConfirmTarget | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const AgendaDeleteModal: React.FC<AgendaDeleteModalProps> = ({
  target,
  onClose,
  onConfirm,
}) => {
  if (!target) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-in fade-in duration-300">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col relative z-10">
        <div className="p-6 md:p-8 flex flex-col gap-4 max-h-[95vh]">
          <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 text-center">Excluir compromisso?</h3>
          <p className="text-slate-600 dark:text-slate-300 text-center leading-relaxed">
            Tem certeza que deseja excluir o compromisso &ldquo;<strong className="font-black text-slate-900 dark:text-white">
              {(target.title.length > 60
                ? target.title.substring(0, 60) + '...'
                : target.title)}
            </strong>&rdquo;? Esta ação é irreversível.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-[11px] font-black uppercase tracking-widest hover:brightness-110 transition-all"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgendaDeleteModal;
