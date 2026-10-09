import React, { useState } from 'react';
import { Table as TableIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CompoundYearlyRow, CompoundMonthlyRow } from './compoundTypes';
import { TableHorizontalScrollWrapper } from '../common/TableHorizontalScrollWrapper';

export interface CompoundInterestTableProps {
  yearlyData: CompoundYearlyRow[];
  monthlyData: CompoundMonthlyRow[];
  adjustInflation: boolean;
}

const fmtMoneyExact = (val: number) =>
  'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const CompoundInterestTable: React.FC<CompoundInterestTableProps> = ({
  yearlyData,
  monthlyData,
  adjustInflation,
}) => {
  const [tableGranularity, setTableGranularity] = useState<'anual' | 'mensal'>('anual');
  const [monthlyPage, setMonthlyPage] = useState<number>(1);
  const MONTHS_PER_PAGE = 12;

  const totalMonthlyPages = Math.ceil(monthlyData.length / MONTHS_PER_PAGE);
  const paginatedMonthlyData = monthlyData.slice(
    (monthlyPage - 1) * MONTHS_PER_PAGE,
    monthlyPage * MONTHS_PER_PAGE
  );

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
        <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
          <TableIcon className="text-emerald-500" size={18} />
          Detalhamento do Crescimento
        </h3>

        {/* Alternador Anual / Mensal */}
        <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl text-xs font-black self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTableGranularity('anual')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              tableGranularity === 'anual' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Visão Anual (Consolidada)
          </button>
          <button
            type="button"
            onClick={() => setTableGranularity('mensal')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              tableGranularity === 'mensal' ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Visão Mensal (Completa)
          </button>
        </div>
      </div>

      {/* Visão Anual */}
      {tableGranularity === 'anual' ? (
        <TableHorizontalScrollWrapper>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                <th className="text-left py-3 px-3">Ano</th>
                <th className="text-right py-3 px-3">Depósitos no Ano</th>
                <th className="text-right py-3 px-3">Total Investido</th>
                <th className="text-right py-3 px-3 text-emerald-700 dark:text-emerald-400">Juros do Ano</th>
                <th className="text-right py-3 px-3 text-emerald-700 dark:text-emerald-400">Total de Juros</th>
                <th className="text-right py-3 px-3 font-black text-slate-900 dark:text-white">Saldo Final</th>
                {adjustInflation && (
                  <th className="text-right py-3 px-3 text-slate-600 dark:text-slate-300">Poder Real (IPCA)</th>
                )}
              </tr>
            </thead>
            <tbody>
              {yearlyData.map((row) => (
                <tr key={row.year} className="border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="py-2.5 px-3 font-black text-slate-800 dark:text-slate-200">Ano {row.year}</td>
                  <td className="text-right py-2.5 px-3 text-slate-600 dark:text-slate-400">{fmtMoneyExact(row.aporteNoAno)}</td>
                  <td className="text-right py-2.5 px-3 text-blue-700 dark:text-blue-400 font-medium">{fmtMoneyExact(row.totalInvestido)}</td>
                  <td className="text-right py-2.5 px-3 text-emerald-600 dark:text-emerald-400 font-medium">+{fmtMoneyExact(row.jurosNoAno)}</td>
                  <td className="text-right py-2.5 px-3 text-emerald-700 dark:text-emerald-400 font-bold">{fmtMoneyExact(row.totalJuros)}</td>
                  <td className="text-right py-2.5 px-3 font-black text-slate-900 dark:text-white">{fmtMoneyExact(row.totalAcumulado)}</td>
                  {adjustInflation && (
                    <td className="text-right py-2.5 px-3 text-slate-600 dark:text-slate-300 font-medium">{fmtMoneyExact(row.poderCompraReal)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </TableHorizontalScrollWrapper>
      ) : (
        /* Visão Mensal Paginada */
        <div className="space-y-4">
          <TableHorizontalScrollWrapper>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold">
                  <th className="text-left py-3 px-3">Mês</th>
                  <th className="text-right py-3 px-3 text-emerald-700 dark:text-emerald-400">Juros do Mês</th>
                  <th className="text-right py-3 px-3">Total Investido</th>
                  <th className="text-right py-3 px-3 text-emerald-700 dark:text-emerald-400">Total de Juros</th>
                  <th className="text-right py-3 px-3 font-black text-slate-900 dark:text-white">Total Acumulado</th>
                  {adjustInflation && (
                    <th className="text-right py-3 px-3 text-slate-600 dark:text-slate-300">Poder Real</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedMonthlyData.map((row) => (
                  <tr key={row.month} className="border-b border-slate-100 dark:border-slate-700/60 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200">Mês {row.month} (Ano {row.year})</td>
                    <td className="text-right py-2 px-3 text-emerald-600 dark:text-emerald-400 font-medium">+{fmtMoneyExact(row.jurosPeriodo)}</td>
                    <td className="text-right py-2 px-3 text-blue-700 dark:text-blue-400">{fmtMoneyExact(row.totalInvestido)}</td>
                    <td className="text-right py-2 px-3 text-emerald-700 dark:text-emerald-400 font-medium">{fmtMoneyExact(row.totalJuros)}</td>
                    <td className="text-right py-2 px-3 font-black text-slate-900 dark:text-white">{fmtMoneyExact(row.totalAcumulado)}</td>
                    {adjustInflation && (
                      <td className="text-right py-2 px-3 text-slate-600 dark:text-slate-300">{fmtMoneyExact(row.poderCompraReal)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableHorizontalScrollWrapper>

          {/* Controles de Paginação */}
          {totalMonthlyPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Página {monthlyPage} de {totalMonthlyPages} ({monthlyData.length} meses)
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={monthlyPage === 1}
                  onClick={() => setMonthlyPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-700 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft size={14} /> Anterior
                </button>
                <button
                  type="button"
                  disabled={monthlyPage === totalMonthlyPages}
                  onClick={() => setMonthlyPage(p => Math.min(totalMonthlyPages, p + 1))}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-700 disabled:opacity-40 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 cursor-pointer flex items-center gap-1"
                >
                  Próxima <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
