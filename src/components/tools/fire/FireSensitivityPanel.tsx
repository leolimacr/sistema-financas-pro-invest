import React, { useState } from 'react';
import { Clock, Sparkles } from 'lucide-react';
import type { CalculatedState } from './fireTypes';

const fmtMoney = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export interface FireSensitivityPanelProps {
  result: CalculatedState;
}

export const FireSensitivityPanel: React.FC<FireSensitivityPanelProps> = ({ result }) => {
  const [selectedCut, setSelectedCut] = useState<number>(300);

  if (result.alreadyFire) return null;

  const cutOptions = [100, 200, 300, 500, 1000];

  // Cálculo de impacto do corte
  const newExpense = Math.max(500, result.monthlyExpense - selectedCut);
  const newFireNumber = newExpense * (12 / result.withdrawalRate);
  const fireNumberReduction = result.fireNumber - newFireNumber;
  const newMonthlyInvestment = result.monthlyInvestment + selectedCut;
  const monthlyRate = result.monthlyRate;

  let balance = result.currentWealth;
  let monthsNovo = 0;
  if (balance < newFireNumber && newMonthlyInvestment > 0 && monthlyRate > 0) {
    while (balance < newFireNumber && monthsNovo < 1200) {
      balance = balance * (1 + monthlyRate) + newMonthlyInvestment;
      monthsNovo++;
    }
  }

  const newYears = balance >= newFireNumber ? monthsNovo / 12 : null;
  const yearsSaved =
    result.yearsToFire !== null && newYears !== null
      ? Math.max(0, result.yearsToFire - newYears)
      : null;

  const fullYearsSaved = yearsSaved !== null ? Math.floor(yearsSaved) : 0;
  const monthsSaved = yearsSaved !== null ? Math.round((yearsSaved % 1) * 12) : 0;

  return (
    <div className="bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20 border-2 border-emerald-200/90 dark:border-emerald-800/80 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
      <div className="border-b border-emerald-100 dark:border-emerald-900/60 pb-4">
        <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full uppercase tracking-widest inline-flex items-center gap-1.5 mb-2">
          <Clock size={12} className="text-emerald-700 dark:text-emerald-400" />
          Alavanca do Tempo de Trabalho
        </span>
        <h4 className="text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          Quanto tempo de vida você ganha ao enxugar gastos?
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
          Na matemática FIRE, cortar despesas produz um benefício duplo imediato: diminui a meta que você precisa acumular e aumenta a sobra do seu salário para investir todo mês.
        </p>
      </div>

      {/* Seletor de Corte */}
      <div className="space-y-2">
        <p className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
          Simule um corte consciente no seu custo mensal:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {cutOptions.map((c) => {
            const isSelected = selectedCut === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCut(c)}
                className={`py-3 px-3 rounded-2xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-600 text-white font-black shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-bold'
                }`}
              >
                <span className="text-xs block">- {fmtMoney(c)}/mês</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cartão de Destaque da Conquista de Tempo */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-emerald-200/90 dark:border-emerald-800/80 p-5 md:p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center justify-center md:justify-start gap-1.5">
            <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
            Tempo de trabalho economizado da sua vida
          </p>
          <div className="text-2xl md:text-4xl font-black text-emerald-900 dark:text-emerald-200 tracking-tight">
            {yearsSaved !== null && yearsSaved > 0 ? (
              <>
                {fullYearsSaved > 0 && `${fullYearsSaved} ${fullYearsSaved === 1 ? 'ano' : 'anos'}`}
                {fullYearsSaved > 0 && monthsSaved > 0 && ' e '}
                {monthsSaved > 0 && `${monthsSaved} ${monthsSaved === 1 ? 'mês' : 'meses'}`}
                {fullYearsSaved === 0 && monthsSaved === 0 && `${yearsSaved.toFixed(1)} anos`}
                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 ml-2 block sm:inline">a menos de trabalho!</span>
              </>
            ) : newYears !== null ? (
              <>
                <span>Viabiliza a liberdade em {newYears.toFixed(1)} anos</span>
              </>
            ) : (
              <span>Acelera significativamente sua liberdade</span>
            )}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
            Reduzindo seu custo para <strong className="text-slate-900 dark:text-white">{fmtMoney(newExpense)}/mês</strong> e aportando a sobra de <strong className="text-emerald-700 dark:text-emerald-400">+{fmtMoney(selectedCut)}/mês</strong>, você alcança a independência em <strong className="text-slate-900 dark:text-white">{newYears ? newYears.toFixed(1) + ' anos' : 'prazo hábil'}</strong> (em vez de {result.yearsToFire ? result.yearsToFire.toFixed(1) + ' anos' : 'inviável no ritmo atual'}).
          </p>
        </div>

        <div className="shrink-0 w-full md:w-auto bg-emerald-50/70 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-4 text-center md:text-right space-y-1">
          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Alívio no Patrimônio Alvo
          </p>
          <p className="text-xl font-black text-emerald-800 dark:text-emerald-300">
            - {fmtMoney(fireNumberReduction)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Você precisa juntar menos dinheiro
          </p>
        </div>
      </div>
    </div>
  );
};
