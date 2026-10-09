import React from 'react';
import { Anchor, Check, Coffee } from 'lucide-react';
import type { CalculatedState } from './fireTypes';

const fmtMoney = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

export interface FireMilestonesPanelProps {
  result: CalculatedState;
  currentAgeNum: number | null;
}

export const FireMilestonesPanel: React.FC<FireMilestonesPanelProps> = ({
  result,
  currentAgeNum,
}) => {
  const retirementAge = 65;
  const yearsToRetirement =
    currentAgeNum && currentAgeNum < retirementAge
      ? Math.max(5, retirementAge - currentAgeNum)
      : 25;

  // Coast FIRE: valor que precisa estar investido hoje para render sozinho até cobrir os 65 anos
  const coastFireNumber = Math.round(
    result.fireNumber / Math.pow(1 + result.returnRate / 100, yearsToRetirement)
  );

  const isCoastFireAchieved = result.currentWealth >= coastFireNumber;
  const coastProgress = Math.min((result.currentWealth / Math.max(1, coastFireNumber)) * 100, 100);

  // Semi-Aposentadoria: caso cubra 50% das despesas com trabalho mais leve por escolha
  const semiFireNumber = Math.round(result.fireNumber * 0.5);
  const isSemiFireAchieved = result.currentWealth >= semiFireNumber;

  let semiFireMonths = 0;
  let semiBalance = result.currentWealth;
  if (!isSemiFireAchieved && result.monthlyInvestment > 0 && result.monthlyRate > 0) {
    while (semiBalance < semiFireNumber && semiFireMonths < 1200) {
      semiBalance = semiBalance * (1 + result.monthlyRate) + result.monthlyInvestment;
      semiFireMonths++;
    }
  }
  const semiFireYears =
    isSemiFireAchieved
      ? 0
      : semiBalance >= semiFireNumber
      ? semiFireMonths / 12
      : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Anchor size={18} className="text-orange-500" />
          <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight">
            Marcos Intermediários de Soberania (Vitórias no Caminho)
          </h4>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          A liberdade não é um abismo de "tudo ou nada". Conheça as etapas intermediárias consagradas que transformam sua qualidade de vida muito antes da aposentadoria integral.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Coast FIRE */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-100 dark:bg-orange-950/60 dark:text-orange-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Anchor size={12} />
                Marco 1 · Coast FIRE
              </span>
              {isCoastFireAchieved ? (
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Check size={12} /> Atingido!
                </span>
              ) : (
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                  {coastProgress.toFixed(0)}% da meta
                </span>
              )}
            </div>

            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {fmtMoney(coastFireNumber)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              O <strong>patrimônio semente autossuficiente</strong>. Atingindo esse valor hoje, ele cresce sozinho com juros compostos até cobrir toda a sua velhice ({retirementAge} anos).
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
            {isCoastFireAchieved ? (
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 leading-relaxed">
                🎉 Você já tem o Coast FIRE! Você tem a segurança de nunca mais precisar poupar 1 centavo para a velhice, podendo trabalhar apenas para cobrir as despesas do mês presente.
              </p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Patrimônio atual vs. Coast FIRE</span>
                  <span>{fmtMoney(result.currentWealth)} / {fmtMoney(coastFireNumber)}</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${coastProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Faltam {fmtMoney(Math.max(0, coastFireNumber - result.currentWealth))} para sua primeira grande libertação de estresse financeiro.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Barista FIRE / Semi-Aposentadoria */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Coffee size={12} />
                Marco 2 · Semi-Aposentadoria
              </span>
              {isSemiFireAchieved ? (
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Check size={12} /> Atingido!
                </span>
              ) : semiFireYears !== null ? (
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                  Em {semiFireYears.toFixed(1)} anos
                </span>
              ) : null}
            </div>

            <p className="text-2xl font-black text-slate-900 dark:text-white">
              {fmtMoney(semiFireNumber)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              E se você trabalhar meio período, como consultor ou em algo leve gerando <strong>{fmtMoney(result.monthlyExpense * 0.5)}/mês</strong>? O restante já é sustentado pelos investimentos.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
            {isSemiFireAchieved ? (
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 leading-relaxed">
                🎉 Você já tem o Barista FIRE! Seus rendimentos já pagam metade da sua vida. Qualquer trabalho leve cobre o restante com serenidade.
              </p>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Patrimônio atual vs. Semi-Aposentadoria</span>
                  <span>{fmtMoney(result.currentWealth)} / {fmtMoney(semiFireNumber)}</span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (result.currentWealth / Math.max(1, semiFireNumber)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {semiFireYears !== null
                    ? `Faltam apenas ${semiFireYears.toFixed(1)} anos de aportes para você ter o direito de trabalhar só pelo prazer.`
                    : 'Acelere seus aportes para antecipar essa liberdade parcial.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
