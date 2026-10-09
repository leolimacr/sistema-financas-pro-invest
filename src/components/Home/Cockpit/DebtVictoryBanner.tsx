import React, { useState, useEffect } from 'react';
import { Trophy, Sparkles, X, TrendingUp } from 'lucide-react';
import type { DebtItem } from '../../../services/debt/debt.types';

interface DebtVictoryBannerProps {
  debts: DebtItem[];
  formatCurrency: (val: number) => string;
  isPrivacyMode?: boolean;
}

export const DebtVictoryBanner: React.FC<DebtVictoryBannerProps> = ({
  debts,
  formatCurrency,
  isPrivacyMode = false,
}) => {
  const [dismissedMap, setDismissedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Carregar dismissals do localStorage
    try {
      const map: Record<string, boolean> = {};
      debts.forEach((d) => {
        const key = `fpi_victory_dismissed_${d.id || d.nome}`;
        if (localStorage.getItem(key) === 'true') {
          map[d.id || d.nome] = true;
        }
      });
      setDismissedMap(map);
    } catch {
      // Ignora erro de localStorage
    }
  }, [debts]);

  // Encontrar dívidas quitadas que ainda não foram dispensadas
  const activeVictories = debts.filter((d) => {
    const isPaid = (d.saldoDevedor <= 0 || d.parcelasRestantes === 0) && (d.valorParcela > 0 || (d.totalParcelas && d.totalParcelas > 0));
    const isDismissed = dismissedMap[d.id || d.nome];
    return isPaid && !isDismissed;
  });

  if (activeVictories.length === 0) return null;

  // Mostra a primeira vitória ativa
  const currentVictory = activeVictories[0];
  const debtKey = currentVictory.id || currentVictory.nome;
  const monthlyLiberated = currentVictory.valorParcela || 0;

  const handleDismiss = () => {
    try {
      localStorage.setItem(`fpi_victory_dismissed_${debtKey}`, 'true');
    } catch {
      // Ignora erro de localStorage
    }
    setDismissedMap((prev) => ({ ...prev, [debtKey]: true }));
  };

  return (
    <div
      role="region"
      aria-label="Celebração de quitação de dívida"
      className="relative overflow-hidden rounded-section bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-900 border border-emerald-500/40 p-5 md:p-6 text-white shadow-xl shadow-emerald-950/20 animate-in fade-in slide-in-from-top-3 duration-500"
    >
      {/* Glow de fundo */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-12 w-40 h-40 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/30 text-slate-950">
            <Trophy size={24} className="stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                <Sparkles size={11} className="text-amber-300" /> Vitória Soberana
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                100% Quitado
              </span>
            </div>

            <h3 className="text-base md:text-lg font-black text-white tracking-tight">
              {currentVictory.nome}: Dívida Liquidada!
            </h3>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Sua <strong className="text-emerald-400 font-bold">Disponibilidade Real mensal</strong> aumentou em{' '}
              <strong className="text-amber-300 font-black">
                +{isPrivacyMode ? '••••••' : formatCurrency(monthlyLiberated)}/mês
              </strong>{' '}
              pelo fim definitivo desta parcela. Mais fôlego livre para construir patrimônio e blindar sua estrutura.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
            title="Reconhecer conquista e dispensar aviso"
          >
            <span>Reconhecer</span>
            <X size={14} className="text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebtVictoryBanner;
