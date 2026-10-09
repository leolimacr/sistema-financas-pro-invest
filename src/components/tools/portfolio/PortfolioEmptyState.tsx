import React from 'react';
import {
  Wallet,
  ShieldCheck,
  BookOpen,
  Layers,
  FileSpreadsheet,
  PlusCircle,
  Building2,
  ArrowRight,
} from 'lucide-react';

interface PortfolioEmptyStateProps {
  /** Inicia fluxo de estruturação / cadastro manual */
  onStartSetup?: () => void;
  /** Abre o importador de planilhas XLSX / CSV */
  onOpenImport?: () => void;
  /** Abre o modal informativo de conexão automática */
  onOpenConnect?: () => void;
}

export const PortfolioEmptyState: React.FC<PortfolioEmptyStateProps> = ({
  onStartSetup,
  onOpenImport,
  onOpenConnect,
}) => {
  return (
    <div
      data-testid="portfolio-empty-state"
      className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-800 p-6 md:p-10 text-slate-900 dark:text-white shadow-sm max-w-4xl mx-auto"
    >
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 dark:bg-slate-800 text-emerald-400 flex items-center justify-center mx-auto mb-5 shadow-inner">
          <Layers className="w-8 h-8" />
        </div>
        <h2 className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white tracking-tight mb-3">
          Sua Carteira Soberana de Investimentos
        </h2>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-8">
          Nenhum ativo ou caixa foi cadastrado ainda. O Finanças Pro Invest adota a filosofia de soberania e
          rigor contábil: clareza real sobre cada alocação, sem aproximações fictícias ou maquiagem financeira.
        </p>
      </div>

      {/* 3 Pilares da Estrutura */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-black text-sm mb-3">
              1
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Caixa de Oportunidade
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
              Defina o saldo disponível em corretoras para compras estratégicas, isolado dos gastos pessoais do dia a dia.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center font-black text-sm mb-3">
              2
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Posições Iniciais
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
              Cadastre suas custódias atuais. Se você não souber o preço médio ou a quantidade de cotas de um fundo, cadastre apenas o saldo total sem cotas fictícias.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 flex items-center justify-center font-black text-sm mb-3">
              3
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-2 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Livro Razão e Rebalanceamento
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
              Registre aportes, compras e proventos. O motor calcula o preço médio ponderado móvel e guia os aportes para as classes mais defasadas.
            </p>
          </div>
        </div>
      </div>

      {/* Três Portas de Entrada Claras e Transparentes */}
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <p className="text-center text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Escolha como deseja estruturar sua carteira
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Porta 1: Importar arquivo */}
          <div className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 hover:shadow-sm transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Disponível
                </span>
              </div>
              <h4 className="font-black text-sm text-slate-950 dark:text-white mb-1">
                Importar arquivo
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 font-medium">
                Envie uma planilha Excel (.xlsx) ou arquivo .csv com suas posições ou movimentações.
              </p>
            </div>
            <button
              type="button"
              data-testid="empty-state-import-button"
              onClick={onOpenImport}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Importar arquivo</span>
            </button>
          </div>

          {/* Porta 2: Cadastrar manualmente */}
          <div className="p-4 rounded-xl border-2 border-slate-950 dark:border-slate-800 bg-slate-950 text-white shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                  Manual
                </span>
              </div>
              <h4 className="font-black text-sm text-white mb-1">
                Cadastrar manualmente
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4 font-medium">
                Cadastre seus ativos e metas na carteira. O registro de cotas, saldo ou lançamentos no livro-razão é feito no passo seguinte.
              </p>
            </div>
            <button
              type="button"
              data-testid="empty-state-manual-button"
              onClick={onStartSetup}
              aria-label="Cadastrar manualmente (Iniciar Estruturação da Carteira)"
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <span>Cadastrar manualmente</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Porta 3: Conectar instituições (Em desenvolvimento) */}
          <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 hover:border-blue-400 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Em desenvolvimento
                </span>
              </div>
              <h4 className="font-black text-sm text-slate-950 dark:text-white mb-1">
                Conectar instituições
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 font-medium">
                Recurso em desenvolvimento. As instituições compatíveis ainda estão em definição.
              </p>
            </div>
            <button
              type="button"
              data-testid="empty-state-connect-button"
              onClick={onOpenConnect}
              className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Conectar instituições</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
