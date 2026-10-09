import React from 'react';
import { History, Sparkles, ArrowRight, RotateCcw, ShieldCheck, Lock } from 'lucide-react';
import type { Transaction } from '../../../../types';

interface HistoryEducationalCardProps {
  currentDate: Date;
  periodLabel: string;
  allTransactions: Transaction[];
  onUnlockHistory: () => void;
  onReturnToCurrentMonth: () => void;
}

export const HistoryEducationalCard: React.FC<HistoryEducationalCardProps> = ({
  currentDate,
  periodLabel,
  allTransactions,
  onUnlockHistory,
  onReturnToCurrentMonth,
}) => {
  // Calcula os totais preservados desse mês específico para demonstrar que os dados existem e estão salvos
  const selectedYear = currentDate.getFullYear();
  const selectedMonth = currentDate.getMonth() + 1;

  const monthTransactions = (allTransactions || []).filter((t) => {
    if (!t.date) return false;
    const [y, m] = t.date.split('-').map(Number);
    return y === selectedYear && m === selectedMonth;
  });

  const income = monthTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const expenses = monthTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const count = monthTransactions.length;

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-panel p-6 sm:p-8 shadow-2xl border border-slate-700/80 animate-in fade-in zoom-in-95 duration-300">
      <div className="max-w-xl mx-auto flex flex-col items-center text-center">
        {/* Ícone Soberano */}
        <div className="relative mb-5">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-sky-400 shadow-inner">
            <History size={28} strokeWidth={2.2} />
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
            <Lock size={12} strokeWidth={2.5} />
          </div>
        </div>

        {/* Títulos e Explicação Sóbria */}
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400 mb-1">
          Visão Histórica & Médias no Plano Pro
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-3">
          Seus dados de {periodLabel} estão preservados
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 font-medium">
          O <strong className="text-white">Plano Gratuito</strong> garante lançamentos 100% ilimitados no mês vigente.
          A consulta retroativa detalhada, o drill-down de categorias passadas e relatórios de anos anteriores pertencem ao <strong className="text-sky-300">Plano Pro</strong>.
        </p>

        {/* Card de Prévia Consolidada dos Dados do Usuário */}
        {count > 0 ? (
          <div className="w-full bg-slate-950/60 rounded-2xl p-4 sm:p-5 border border-slate-700/60 mb-6 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Resumo Preservado no Servidor
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <ShieldCheck size={12} /> {count} registro{count !== 1 ? 's' : ''} seguro{count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Total de Entradas
                </span>
                <span className="text-sm sm:text-base font-black text-emerald-400">
                  {income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Total de Saídas
                </span>
                <span className="text-sm sm:text-base font-black text-rose-400">
                  {expenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full bg-slate-950/40 rounded-2xl p-4 border border-slate-800 mb-6 text-center">
            <span className="text-xs text-slate-400">
              Nenhum lançamento registrado neste período. No plano Pro você pode navegar por qualquer mês ou ano sem restrições.
            </span>
          </div>
        )}

        {/* CTAs de Ação Imediata */}
        <div className="w-full flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onUnlockHistory}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Sparkles size={16} /> Desbloquear Histórico Pro <ArrowRight size={16} />
          </button>

          <button
            type="button"
            onClick={onReturnToCurrentMonth}
            className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-white/10 active:scale-95 transition-all"
          >
            <RotateCcw size={14} /> Voltar ao Mês Atual
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryEducationalCard;
