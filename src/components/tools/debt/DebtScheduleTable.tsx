import React from 'react';
import type { ScheduleRow } from '../../../services/debt/debt.math';
import { TableHorizontalScrollWrapper } from '../common/TableHorizontalScrollWrapper';

export type TableViewMode = 'milestones' | '24' | 'all';

export interface DebtScheduleTableProps {
  allRows: ScheduleRow[];
  displayRows: ScheduleRow[];
  tableViewMode: TableViewMode;
  onTableViewModeChange: (mode: TableViewMode) => void;
}

const fmtMoneyExact = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export const DebtScheduleTable: React.FC<DebtScheduleTableProps> = ({
  allRows,
  displayRows,
  tableViewMode,
  onTableViewModeChange,
}) => {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Cronograma Detalhado de Amortização
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhe como cada parcela abate o saldo devedor e os juros cobrados.
          </p>
        </div>

        {/* Seletor de Visualização da Tabela */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
          <button
            type="button"
            onClick={() => onTableViewModeChange('milestones')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tableViewMode === 'milestones'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Marcos Anuais
          </button>
          <button
            type="button"
            onClick={() => onTableViewModeChange('24')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tableViewMode === '24'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Primeiros 24 Meses
          </button>
          <button
            type="button"
            onClick={() => onTableViewModeChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              tableViewMode === 'all'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todas ({allRows.length})
          </button>
        </div>
      </div>

      <TableHorizontalScrollWrapper className="rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="py-3.5 px-4">Mês</th>
              <th className="py-3.5 px-4">Parcela Total</th>
              <th className="py-3.5 px-4">Juros</th>
              <th className="py-3.5 px-4">Amortização</th>
              <th className="py-3.5 px-4">Saldo Devedor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {displayRows.map((row) => {
              const isPayoff = row.balance <= 0.01;
              return (
                <tr
                  key={row.month}
                  className={`transition-colors ${
                    isPayoff ? 'bg-emerald-50/70 dark:bg-emerald-950/40 font-bold' : 'hover:bg-slate-50/80 dark:hover:bg-slate-700/40'
                  }`}
                >
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                    Mês {row.month}{' '}
                    {row.month % 12 === 0 && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                        (Ano {row.month / 12})
                      </span>
                    )}
                    {isPayoff && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[10px] uppercase font-black">
                        Quitado!
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">{fmtMoneyExact(row.payment)}</td>
                  <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-medium">{fmtMoneyExact(row.interest)}</td>
                  <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-medium">{fmtMoneyExact(row.amortization)}</td>
                  <td className="py-3 px-4 font-black text-slate-900 dark:text-white">{fmtMoneyExact(row.balance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableHorizontalScrollWrapper>
    </div>
  );
};
