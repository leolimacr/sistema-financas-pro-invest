import React from 'react';
import { Table as TableIcon } from 'lucide-react';
import { TableHorizontalScrollWrapper } from '../common/TableHorizontalScrollWrapper';

export interface TimelineYearPoint {
  year: number;
  installment: number;
  outstandingDebt: number;
  rent: number;
  buyerNetWorth: number;
  renterNetWorth: number;
  difference: number;
  leader: 'buy' | 'rent';
}

export interface RentVsFinanceTimelineProps {
  timeline: TimelineYearPoint[];
  breakevenYear?: number | null;
  winnerLabel?: string;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

export const RentVsFinanceTimeline: React.FC<RentVsFinanceTimelineProps> = ({
  timeline,
  breakevenYear,
  winnerLabel,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Detalhe do Ponto de Equilíbrio (Breakeven) se fornecido */}
      {breakevenYear !== undefined && (
        <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl">
          {breakevenYear ? (
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
              ⚖️ <strong>Ponto de Equilíbrio:</strong> Até o <strong>{breakevenYear}º ano</strong>, a outra opção era mais vantajosa. Se você não pretende morar no mesmo imóvel por mais de {breakevenYear} anos, considere isso com atenção na sua decisão.
            </p>
          ) : (
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
              ⚖️ <strong>Trajetória Consistente:</strong> A opção de <strong>{winnerLabel || 'maior patrimônio'}</strong> mantém a liderança patrimonial do primeiro ao último ano da simulação.
            </p>
          )}
        </div>
      )}

      {/* Tabela de Marcos Temporais */}
      <div>
        <h3 className="text-base font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
          <TableIcon className="text-blue-600 dark:text-blue-400" size={18} />
          Detalhamento dos Marcos Financeiros
        </h3>

        <TableHorizontalScrollWrapper>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                <th className="text-left py-3 px-3 whitespace-nowrap">Ano</th>
                <th className="text-right py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">Parcela no Mês</th>
                <th className="text-right py-3 px-3 whitespace-nowrap text-rose-600 dark:text-rose-400">Saldo Devedor</th>
                <th className="text-right py-3 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300">Aluguel no Mês</th>
                <th className="text-right py-3 px-3 whitespace-nowrap text-indigo-700 dark:text-indigo-400 font-bold">Patrimônio Comprador</th>
                <th className="text-right py-3 px-3 whitespace-nowrap text-emerald-700 dark:text-emerald-400 font-bold">Patrimônio Inquilino</th>
                <th className="text-right py-3 px-3 whitespace-nowrap font-black text-slate-900 dark:text-white">Vantagem Líquida</th>
              </tr>
            </thead>
            <tbody>
              {timeline.map((row) => (
                <tr key={row.year} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-2.5 px-3 font-black text-slate-800 dark:text-white whitespace-nowrap">{row.year}º ano</td>
                  <td className="text-right py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatCurrency(row.installment)}</td>
                  <td className="text-right py-2.5 px-3 text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">{formatCurrency(row.outstandingDebt)}</td>
                  <td className="text-right py-2.5 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatCurrency(row.rent)}</td>
                  <td className="text-right py-2.5 px-3 text-indigo-700 dark:text-indigo-400 font-bold whitespace-nowrap">{formatCurrency(row.buyerNetWorth)}</td>
                  <td className="text-right py-2.5 px-3 text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">{formatCurrency(row.renterNetWorth)}</td>
                  <td className="text-right py-2.5 px-3 font-black whitespace-nowrap">
                    <span className={row.leader === 'buy' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'}>
                      +{formatCurrency(row.difference)} ({row.leader === 'buy' ? 'Compra' : 'Aluguel'})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableHorizontalScrollWrapper>
      </div>
    </div>
  );
};
