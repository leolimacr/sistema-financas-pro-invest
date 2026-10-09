import React from 'react';
import { Shield, Compass, BookmarkCheck } from 'lucide-react';

interface Props {
  title?: string;
  statement: string;
  context?: string;
  practicalRule?: string;
}

export const PrincipleBlock: React.FC<Props> = ({
  title = 'Princípio Soberano FPI',
  statement,
  context,
  practicalRule,
}) => {
  return (
    <div className="my-6 rounded-2xl border-2 border-slate-900/10 dark:border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white p-6 md:p-8 shadow-md relative overflow-hidden">
      {/* Detalhe de fundo sutil */}
      <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
      <div className="absolute right-6 top-6 opacity-10 pointer-events-none">
        <Compass className="w-24 h-24 text-white" />
      </div>

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4">
          <Shield className="w-3.5 h-3.5 text-blue-400" />
          {title}
        </div>

        <blockquote className="text-lg md:text-xl font-bold text-white leading-relaxed tracking-tight mb-4">
          “{statement}”
        </blockquote>

        {context && (
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-4 border-l-2 border-blue-400/50 pl-3">
            {context}
          </p>
        )}

        {practicalRule && (
          <div className="mt-4 pt-4 border-t border-slate-700/80 flex items-start gap-2.5 text-xs md:text-sm text-slate-200">
            <BookmarkCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-emerald-300 font-semibold">Regra Prática de Ação: </strong>
              {practicalRule}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrincipleBlock;
