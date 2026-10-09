import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, TrendingUp } from 'lucide-react';
import { useRotativoInterestAggregate } from '../../../hooks/useRotativoInterestHistory';

interface RotativoInterestReportProps {
  userId: string | undefined;
}

function formatCompetenceLabel(competence: string): string {
  const [year, month] = competence.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(month, 10) - 1]}/${year}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function RotativoInterestReport({ userId }: RotativoInterestReportProps) {
  const [expanded, setExpanded] = useState(false);

  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const yearStart = `${currentYear}-01`;
  const yearEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  const yearAgo = new Date(now);
  yearAgo.setFullYear(currentYear - 1);
  const rangeStart = `${yearAgo.getFullYear()}-${String(yearAgo.getMonth() + 1).padStart(2, '0')}`;

  const { data: yearAggregate, isLoading: yearLoading } = useRotativoInterestAggregate(
    userId,
    yearStart,
    yearEnd,
  );

  const { data: fullHistory, isLoading: historyLoading } = useRotativoInterestAggregate(
    userId,
    rangeStart,
    yearEnd,
  );

  const ytdTotal = useMemo(() => {
    if (!yearAggregate) return 0;
    return yearAggregate.reduce((sum, p) => sum + p.totalInterest, 0);
  }, [yearAggregate]);

  const last12 = useMemo(() => {
    if (!fullHistory) return [];
    return fullHistory.slice(-12);
  }, [fullHistory]);

  if (!userId) return null;

  return (
    <div className="mt-8 rounded-[2rem] bg-white border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-slate-50/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <TrendingUp size={20} className="text-slate-500" />
          <div>
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
              Histórico de Juros
            </span>
            {!yearLoading && ytdTotal > 0 && (
              <span className="ml-3 text-xs font-semibold text-amber-600">
                Total em {currentYear}: {formatCurrency(ytdTotal)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {yearLoading && (
            <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
          )}
          {expanded ? (
            <ChevronDown size={18} className="text-slate-500" />
          ) : (
            <ChevronRight size={18} className="text-slate-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          {historyLoading ? (
            <div className="flex items-center justify-center py-10 gap-3">
              <span className="w-5 h-5 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
              <span className="text-sm text-slate-500 font-medium">Carregando histórico...</span>
            </div>
          ) : last12.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-slate-500 font-medium">
                Nenhum registro de juros rotativo encontrado nos últimos 12 meses.
              </p>
            </div>
          ) : (
            <div className="p-6 pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 pr-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        Mês
                      </th>
                      <th className="text-right py-3 px-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        Juros
                      </th>
                      <th className="text-right py-3 pl-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                        Dívidas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {last12.map((period) => (
                      <tr key={period.competence} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 pr-4 font-bold text-slate-700">
                          {formatCompetenceLabel(period.competence)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-amber-600">
                          {formatCurrency(period.totalInterest)}
                        </td>
                        <td className="py-3 pl-4 text-right text-slate-500">
                          {period.debtCount} {period.debtCount === 1 ? 'dívida' : 'dívidas'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
