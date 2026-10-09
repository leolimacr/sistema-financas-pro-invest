import React from 'react';

export interface FireTrinityModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const FireTrinityModal: React.FC<FireTrinityModalProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="text-xs text-slate-600 dark:text-slate-300 bg-orange-50/90 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800/70 rounded-2xl p-4 space-y-2.5 leading-relaxed animate-in fade-in duration-200 shadow-2xs">
      <p className="font-black text-orange-950 dark:text-orange-200 flex items-center gap-1.5">
        <span>💡</span> O que é e como funciona a Retirada Segura?
      </p>
      <p>
        Quando você atinge a independência financeira, seu patrimônio continua aplicado gerando rendimentos reais (acima da inflação). A <strong>Taxa de Retirada Segura</strong> define qual porcentagem você pode sacar todo ano para pagar todas as suas contas, sem que o dinheiro acabe ao longo das décadas:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        <div className="bg-white/90 dark:bg-slate-900/90 border border-orange-200/70 dark:border-orange-800/70 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-black text-slate-900 dark:text-white text-xs">Conservador · 3%</span>
            <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">33×</span>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug">
            Você precisará acumular <strong>33 anos</strong> do seu custo de vida. Ideal para quem planeja parar muito jovem (40+ anos de aposentadoria) ou tem perfil muito cauteloso.
          </p>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 border border-orange-300 dark:border-orange-700 rounded-xl p-3 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-black text-orange-950 dark:text-orange-300 text-xs">Padrão · 4% (Trinity)</span>
            <span className="text-[9px] font-black bg-orange-100 dark:bg-orange-950 text-orange-900 dark:text-orange-200 px-1.5 py-0.5 rounded">25×</span>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug">
            A referência mundial mais consagrada. Você precisará de <strong>25 anos</strong> de gastos (ou 300 meses). Oferece equilíbrio ótimo entre tempo de trabalho e segurança patrimonial.
          </p>
        </div>

        <div className="bg-white/90 dark:bg-slate-900/90 border border-orange-200/70 dark:border-orange-800/70 rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-black text-slate-900 dark:text-white text-xs">Dinâmico · 5%</span>
            <span className="text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">20×</span>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug">
            Você precisará de <strong>20 anos</strong> de gastos (ou 240 meses). Você atinge a meta bem mais rápido, mas exige flexibilidade para cortar gastos temporariamente em anos de crise econômica.
          </p>
        </div>
      </div>
    </div>
  );
};
