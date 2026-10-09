import React from 'react';
import { X, Download, FileText, FileSpreadsheet, Database } from 'lucide-react';
import type {
  DerivedAssetPosition,
  PortfolioMovement,
  PortfolioUserData,
} from '../../../../core/portfolio/portfolioTypes';

interface ExportPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: DerivedAssetPosition[];
  movements: PortfolioMovement[];
  portfolioData: PortfolioUserData;
}

export const ExportPortfolioModal: React.FC<ExportPortfolioModalProps> = ({
  isOpen,
  onClose,
  positions,
  movements,
  portfolioData,
}) => {
  if (!isOpen) return null;

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPositionsCSV = () => {
    const headers = [
      'Ticker',
      'Nome',
      'Classe',
      'Moeda',
      'Mercado',
      'Quantidade',
      'Preco_Medio_BRL',
      'Cotacao_Atual_BRL',
      'Valor_Total_BRL',
      'Ganho_Perda_Nao_Realizado_BRL',
      'Rentabilidade_Percent',
    ];

    const rows = positions.map((p) => [
      p.ticker,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category.replace(/"/g, '""')}"`,
      p.currency,
      p.market,
      p.quantity !== null ? p.quantity.toString().replace('.', ',') : '',
      p.avgCostBRL !== null ? p.avgCostBRL.toFixed(4).replace('.', ',') : '',
      p.currentPriceBRL !== null ? p.currentPriceBRL.toFixed(4).replace('.', ',') : '',
      p.currentValueBRL !== null ? p.currentValueBRL.toFixed(2).replace('.', ',') : (p.totalInvestedBRL !== null ? p.totalInvestedBRL.toFixed(2).replace('.', ',') : ''),
      p.unrealizedPnLBRL !== null ? p.unrealizedPnLBRL.toFixed(2).replace('.', ',') : '',
      p.unrealizedPnLPercent !== null ? p.unrealizedPnLPercent.toFixed(2).replace('.', ',') : '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    downloadFile(
      csvContent,
      `financas_pro_posicoes_${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportMovementsCSV = () => {
    const headers = [
      'ID',
      'Data',
      'ID_Ativo',
      'Tipo_Operacao',
      'Quantidade',
      'Preco_Unitario',
      'Taxas',
      'Valor_Bruto',
      'Valor_Liquido_BRL',
      'Moeda',
      'Cambio_BRL',
      'Status',
      'Origem_Recursos',
      'Destino_Recursos',
      'Observacoes',
    ];

    const rows = movements.map((m) => [
      m.id,
      m.date,
      m.assetId,
      m.type,
      m.quantity !== null ? m.quantity.toString().replace('.', ',') : '',
      m.unitPrice.toFixed(4).replace('.', ','),
      m.fees.toFixed(2).replace('.', ','),
      m.grossAmount.toFixed(2).replace('.', ','),
      m.netAmountBRL.toFixed(2).replace('.', ','),
      m.currency,
      m.fxRateToBRL.toFixed(4).replace('.', ','),
      m.status,
      m.fundingSource || '',
      m.settlementTarget || '',
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    downloadFile(
      csvContent,
      `financas_pro_movimentacoes_${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportJSON = () => {
    const jsonContent = JSON.stringify(portfolioData, null, 2);
    downloadFile(
      jsonContent,
      `financas_pro_backup_carteira_${new Date().toISOString().slice(0, 10)}.json`,
      'application/json;charset=utf-8;'
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold">Exportar Dados da Carteira</h3>
              <p className="text-xs text-slate-300 dark:text-slate-400">
                Baixe seus dados em formatos abertos (CSV brasileiro ou JSON)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          <button
            type="button"
            onClick={handleExportPositionsCSV}
            className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-left transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block group-hover:text-blue-700 dark:group-hover:text-blue-400">
                  Posições em Custódia (CSV)
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  {positions.length} ativos atuais com quantidade, preço médio e valor total
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-700 dark:group-hover:text-blue-400" />
          </button>

          <button
            type="button"
            onClick={handleExportMovementsCSV}
            className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-left transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                  Histórico de Movimentações (CSV)
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  {movements.length} lançamentos com datas, tipos, taxas e fluxo financeiro
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400" />
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="w-full p-4 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-left transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block group-hover:text-purple-700 dark:group-hover:text-purple-400">
                  Backup Completo Soberano (JSON)
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                  Classes, ativos e livro-razão completo em formato estruturado
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-purple-700 dark:group-hover:text-purple-400" />
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
