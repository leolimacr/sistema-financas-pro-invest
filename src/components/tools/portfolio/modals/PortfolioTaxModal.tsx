import React, { useState } from 'react';
import { X, ShieldCheck, AlertCircle, FileText, CheckCircle2, Copy, Calendar, TrendingDown, Layers } from 'lucide-react';
import type { PortfolioTaxSummary, MonthlyTaxReport } from '../../../../core/portfolio/taxEngine';
import { formatCurrencyBRL } from '../portfolioViewUtils';

interface PortfolioTaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  taxSummary: PortfolioTaxSummary;
}

export const PortfolioTaxModal: React.FC<PortfolioTaxModalProps> = ({
  isOpen,
  onClose,
  taxSummary,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return taxSummary.reports[0]?.yearMonth || '';
  });
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const currentReport: MonthlyTaxReport | undefined =
    taxSummary.reports.find((r) => r.yearMonth === selectedMonth) || taxSummary.reports[0];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div
      data-testid="portfolio-tax-modal"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tax-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Cabeçalho */}
        <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 dark:bg-slate-800 text-blue-400 flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 id="tax-modal-title" className="text-base md:text-lg font-black text-slate-950 dark:text-white">
                Apuração Fiscal & Imposto de Renda (IRPF)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Memória de cálculo de ganho de capital, isenção de R$ 20k em ações e DARF 6015
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-5 md:p-6 space-y-6 flex-1">
          {/* 1. Cards de Resumo Geral Acumulado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Lucro Isento Acumulado
              </span>
              <span
                data-testid="tax-summary-exempt-profit"
                className="text-lg md:text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 block"
              >
                {formatCurrencyBRL(taxSummary.totalExemptProfitBRL)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Vendas sob isenção de R$ 20.000/mês
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Prejuízo a Compensar (Ações)
              </span>
              <span
                data-testid="tax-summary-stocks-loss"
                className="text-lg md:text-xl font-black text-amber-700 dark:text-amber-400 mt-1 block"
              >
                {formatCurrencyBRL(taxSummary.accumulatedStocksLossBRL)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Compensável em meses futuros
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Prejuízo a Compensar (FIIs)
              </span>
              <span
                data-testid="tax-summary-fiis-loss"
                className="text-lg md:text-xl font-black text-purple-700 dark:text-purple-400 mt-1 block"
              >
                {formatCurrencyBRL(taxSummary.accumulatedFiisLossBRL)}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Segregado exclusivamente para FIIs
              </span>
            </div>
          </div>

          {taxSummary.reports.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-sm">Nenhuma alienação registrada</p>
              <p className="text-xs max-w-sm mx-auto">
                Quando você registrar operações de venda (`SELL`), o motor calculará o lucro ou prejuízo e verificará se há imposto a recolher.
              </p>
            </div>
          ) : (
            <>
              {/* Seletor de Competência */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500 mr-2 shrink-0">Competência:</span>
                {taxSummary.reports.map((rep) => (
                  <button
                    key={rep.yearMonth}
                    type="button"
                    onClick={() => setSelectedMonth(rep.yearMonth)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                      (currentReport?.yearMonth === rep.yearMonth)
                        ? 'bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {rep.monthName}
                  </button>
                ))}
              </div>

              {currentReport && (
                <div className="space-y-4">
                  {/* Banner de Status da Competência */}
                  <div
                    className={`p-4 rounded-2xl border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      currentReport.totalTaxDueBRL > 0
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {currentReport.totalTaxDueBRL > 0 ? (
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-black text-sm">
                          {currentReport.totalTaxDueBRL > 0
                            ? `Imposto Devido Apurado: ${formatCurrencyBRL(currentReport.totalTaxDueBRL)}`
                            : 'Nenhum Imposto Devido neste Mês'}
                        </span>
                        <p className="text-xs opacity-90 mt-0.5">
                          {currentReport.isStocksExempt
                            ? 'Vendas totais de ações abaixo de R$ 20.000 garantem isenção de IRPF sobre os ganhos de capital em ações.'
                            : 'Vendas de ações superiores a R$ 20.000 geram tributação de 15% sobre o ganho líquido.'}
                        </p>
                      </div>
                    </div>

                    {currentReport.isDarfPayable && (
                      <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-amber-300 dark:border-amber-700 shadow-xs">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block">Código DARF</span>
                          <span className="font-mono font-black text-xs text-slate-900 dark:text-white">6015</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyCode('6015')}
                          className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 hover:bg-amber-200 transition-colors"
                          title="Copiar código DARF"
                        >
                          {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Detalhes da Competência */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Painel Ações */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                        <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Ações / ETFs / BDRs
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            currentReport.isStocksExempt
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {currentReport.isStocksExempt ? 'Isento (≤ R$ 20k)' : 'Tributável (> R$ 20k)'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs py-1">
                        <span className="text-slate-500">Volume Total Vendido:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrencyBRL(currentReport.stocksSalesTotalBRL)}</span>
                      </div>
                      <div className="flex justify-between text-xs py-1">
                        <span className="text-slate-500">Resultado Apurado:</span>
                        <span className={`font-bold ${currentReport.stocksRawProfitLossBRL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatCurrencyBRL(currentReport.stocksRawProfitLossBRL)}
                        </span>
                      </div>
                      {currentReport.stocksLossCarriedForwardBRL > 0 && (
                        <div className="flex justify-between text-xs py-1 text-amber-600 dark:text-amber-400">
                          <span>Prejuízo Compensado:</span>
                          <span className="font-bold">-{formatCurrencyBRL(currentReport.stocksLossCarriedForwardBRL)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs py-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Imposto Devido (15%):</span>
                        <span className="font-black text-slate-900 dark:text-white">{formatCurrencyBRL(currentReport.stocksTaxDueBRL)}</span>
                      </div>
                    </div>

                    {/* Painel Fundos Imobiliários */}
                    <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                        <span className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          Fundos Imobiliários (FIIs)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          Alíquota Fixa 20%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs py-1">
                        <span className="text-slate-500">Volume Total Vendido:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrencyBRL(currentReport.fiisSalesTotalBRL)}</span>
                      </div>
                      <div className="flex justify-between text-xs py-1">
                        <span className="text-slate-500">Resultado Apurado:</span>
                        <span className={`font-bold ${currentReport.fiisRawProfitLossBRL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {formatCurrencyBRL(currentReport.fiisRawProfitLossBRL)}
                        </span>
                      </div>
                      {currentReport.fiisLossCarriedForwardBRL > 0 && (
                        <div className="flex justify-between text-xs py-1 text-purple-600 dark:text-purple-400">
                          <span>Prejuízo Compensado:</span>
                          <span className="font-bold">-{formatCurrencyBRL(currentReport.fiisLossCarriedForwardBRL)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs py-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Imposto Devido (20%):</span>
                        <span className="font-black text-slate-900 dark:text-white">{formatCurrencyBRL(currentReport.fiisTaxDueBRL)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Vendas do Mês */}
                  {currentReport.sales.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Vendas Realizadas na Competência ({currentReport.sales.length})
                      </span>
                      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300">
                            <tr>
                              <th className="p-3">Data</th>
                              <th className="p-3">Ativo</th>
                              <th className="p-3 text-right">Qtd</th>
                              <th className="p-3 text-right">Preço Médio</th>
                              <th className="p-3 text-right">Preço Venda</th>
                              <th className="p-3 text-right">Resultado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {currentReport.sales.map((s) => (
                              <tr key={s.movementId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                <td className="p-3 font-mono">{s.date}</td>
                                <td className="p-3 font-black">{s.ticker}</td>
                                <td className="p-3 text-right">{s.quantity}</td>
                                <td className="p-3 text-right text-slate-500">{formatCurrencyBRL(s.avgCostUnitPrice)}</td>
                                <td className="p-3 text-right font-medium">{formatCurrencyBRL(s.saleUnitPrice)}</td>
                                <td className={`p-3 text-right font-bold ${s.netProfitLossBRL >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {s.netProfitLossBRL >= 0 ? '+' : ''}{formatCurrencyBRL(s.netProfitLossBRL)}
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
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-4 md:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-sm"
          >
            Fechar Relatório Fiscal
          </button>
        </div>
      </div>
    </div>
  );
};
