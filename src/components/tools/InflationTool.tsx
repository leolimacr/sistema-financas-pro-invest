import React, { useState, useMemo, useRef } from 'react';
import { ToolLayout, ToolGate } from './ToolComponents';
import {
  Percent,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Zap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Table as TableIcon,
  BarChart3,
  BookOpen,
  Calendar,
  Wallet,
  ArrowRight,
  Info,
  Scale,
  DollarSign,
  Layers,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';
import { useWealthData } from '../../hooks/useWealthData';
import { useTransactions } from '../../hooks/useTransactions';
import { useAuth } from '../../contexts/AuthContext';

// ─── Helpers de Formatação ──────────────────────────────────────────────────

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtMoney = (n: number) => `R$ ${formatCurrency(n)}`;

const fmtCompactMoney = (value: number) => {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
};

const formatMoneyInputDisplay = (value: number | string) => {
  if (value === '' || value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseMoneyInput = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits) / 100;
};

// ─── Presets Macroeconômicos do Brasil ───────────────────────────────────────

interface InflationPreset {
  id: string;
  label: string;
  rate: number;
  badge: string;
  desc: string;
}

const INFLATION_PRESETS: InflationPreset[] = [
  {
    id: 'meta_bc',
    label: 'Meta do BC',
    rate: 3.0,
    badge: 'Meta Otimista',
    desc: 'Cenário de convergência para o centro da meta do Banco Central',
  },
  {
    id: 'ipca_medio',
    label: 'IPCA Médio Histórico',
    rate: 5.5,
    badge: 'Média 20 Anos',
    desc: 'Média histórica oficial do IPCA no Brasil das últimas duas décadas',
  },
  {
    id: 'inflacao_pessoal',
    label: 'Custo Familiar Real',
    rate: 8.0,
    badge: 'Supermercado & Saúde',
    desc: 'Inflação sentida na prática em alimentação, plano de saúde e moradia',
  },
  {
    id: 'crise',
    label: 'Cenário de Crise',
    rate: 12.0,
    badge: 'Estagflação',
    desc: 'Choques econômicos e descontrole inflacionário severo',
  },
];

// ─── Tipos de Dados da Simulação ────────────────────────────────────────────

export type InflationMode = 'poder_compra' | 'custo_vida';

export interface TimelineDataPoint {
  year: number;
  poderCompraReal: number;
  perdaPoderCompra: number;
  percentPerda: number;
  custoFuturoEquivalente: number;
  aumentoCustoPercent: number;
  saldoPoupanca: number;
  saldoIpcaPlus: number;
  saldoCdi: number;
}

export interface InflationCalculationResult {
  mode: InflationMode;
  initialValue: number;
  annualRate: number;
  years: number;
  // Resultados da Lente 1: Poder de Compra
  poderCompraFinal: number;
  perdaValorTotal: number;
  percentPerdaTotal: number;
  // Resultados da Lente 2: Custo Futuro
  custoFuturoFinal: number;
  aumentoNecessarioTotal: number;
  percentAumentoTotal: number;
  // Blindagem patrimonial
  blindagem: {
    paradoReal: number;
    poupancaReal: number;
    ipcaPlusReal: number;
    cdiReal: number;
    ganhoRealIpcaPlus: number;
  };
  timeline: TimelineDataPoint[];
}

export const InflationTool = ({ onNavigate, onCalcUpdate, isAuthenticated }: any) => {
  const { totalInvestments, patrimonioLiquido } = useWealthData();
  const { transactions } = useTransactions();
  const { user } = useAuth();

  // Estados dos inputs
  const [mode, setMode] = useState<InflationMode>('poder_compra');
  const [inputValue, setInputValue] = useState<number | ''>(10000);
  const [annualRate, setAnnualRate] = useState<string>('5.5');
  const [selectedPreset, setSelectedPreset] = useState<string>('ipca_medio');
  const [years, setYears] = useState<string>('10');

  // Estados de cálculo e visualização
  const [result, setResult] = useState<InflationCalculationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'shield' | 'learn'>('chart');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const resultRef = useRef<HTMLDivElement>(null);

  // Média de despesas mensais reais dos últimos 90 dias
  const realMonthlyExpense = useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const recentTx = transactions.filter((t: any) => {
      if (!t.data) return false;
      const txDate = new Date(t.data);
      return txDate >= ninetyDaysAgo && t.tipo === 'despesa';
    });

    if (recentTx.length === 0) return 0;
    const total = recentTx.reduce((acc: number, t: any) => acc + (Number(t.valor) || 0), 0);
    return Math.round(total / 3);
  }, [transactions]);

  // Saldo real investido ou patrimônio
  const realWealth = useMemo(() => {
    return totalInvestments > 0 ? totalInvestments : (patrimonioLiquido > 0 ? patrimonioLiquido : 0);
  }, [totalInvestments, patrimonioLiquido]);

  // Sincronização inteligente de dados reais do app
  const handleSyncRealData = (targetMode?: InflationMode) => {
    const chosenMode = targetMode || mode;
    let synced = false;

    if (chosenMode === 'poder_compra') {
      if (realWealth > 0) {
        setInputValue(realWealth);
        setMode('poder_compra');
        synced = true;
        setSyncNotice(`✓ Sincronizado: R$ ${formatCurrency(realWealth)} do seu patrimônio investido.`);
      } else {
        setSyncNotice('Nenhum patrimônio cadastrado ainda no app. Preencha o valor manualmente.');
      }
    } else {
      if (realMonthlyExpense > 0) {
        setInputValue(realMonthlyExpense);
        setMode('custo_vida');
        synced = true;
        setSyncNotice(`✓ Sincronizado: R$ ${formatCurrency(realMonthlyExpense)}/mês de despesas médias do seu extrato.`);
      } else {
        setSyncNotice('Nenhuma despesa recente encontrada no app. Preencha seu custo de vida manualmente.');
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <ToolGate
        title="Impacto da Inflação"
        description="Descubra a taxa real de corrosão do seu poder de compra e aprenda como blindar seu patrimônio com inteligência soberana."
        onNavigate={onNavigate}
      />
    );
  }

  // Motor matemático de inflação e blindagem
  const calculate = () => {
    setErrorMessage('');
    const val = Number(inputValue) || 0;
    const rate = Number(annualRate.replace(',', '.')) || 0;
    let numYears = Math.round(Number(years.replace(',', '.'))) || 0;

    if (val <= 0) {
      setErrorMessage('Por favor, informe um valor monetário maior que zero.');
      return;
    }
    if (rate <= 0) {
      setErrorMessage('A taxa de inflação anual deve ser maior que zero.');
      return;
    }
    if (numYears <= 0) {
      setErrorMessage('O prazo em anos deve ser maior que zero.');
      return;
    }
    // Limite prudente de 50 anos para evitar distorções de cálculo
    if (numYears > 50) {
      numYears = 50;
      setYears('50');
    }

    const i = rate / 100;
    // Benchmarks fixos de mercado para o comparador de blindagem
    const poupancaRate = 0.0617; // 6.17% a.a.
    const cdiRate = 0.1075; // 10.75% a.a.
    const ipcaSpreadRate = 0.065; // IPCA + 6.5% a.a.
    const ipcaCompostoRate = (1 + i) * (1 + ipcaSpreadRate) - 1;

    // Linha do tempo ano a ano
    const timeline: TimelineDataPoint[] = [];

    for (let yr = 1; yr <= numYears; yr++) {
      const fatorInflacao = Math.pow(1 + i, yr);

      // Lente 1: Poder de compra do valor original no futuro
      const poderCompraReal = val / fatorInflacao;
      const perdaPoderCompra = val - poderCompraReal;
      const percentPerda = (perdaPoderCompra / val) * 100;

      // Lente 2: Custo futuro para comprar o mesmo valor
      const custoFuturoEquivalente = val * fatorInflacao;
      const aumentoCustoPercent = (fatorInflacao - 1) * 100;

      // Blindagem: evolução real do mesmo capital
      // Poupança em poder de compra real:
      const saldoPoupancaNominal = val * Math.pow(1 + poupancaRate, yr);
      const saldoPoupanca = saldoPoupancaNominal / fatorInflacao;

      // Tesouro IPCA+ em poder de compra real (garante ganho real de 6.5% a.a.):
      const saldoIpcaPlus = val * Math.pow(1 + ipcaSpreadRate, yr);

      // CDI 100% em poder de compra real:
      const saldoCdiNominal = val * Math.pow(1 + cdiRate, yr);
      const saldoCdi = saldoCdiNominal / fatorInflacao;

      timeline.push({
        year: yr,
        poderCompraReal,
        perdaPoderCompra,
        percentPerda,
        custoFuturoEquivalente,
        aumentoCustoPercent,
        saldoPoupanca,
        saldoIpcaPlus,
        saldoCdi,
      });
    }

    const last = timeline[timeline.length - 1];

    const calculationResult: InflationCalculationResult = {
      mode,
      initialValue: val,
      annualRate: rate,
      years: numYears,
      poderCompraFinal: last.poderCompraReal,
      perdaValorTotal: last.perdaPoderCompra,
      percentPerdaTotal: last.percentPerda,
      custoFuturoFinal: last.custoFuturoEquivalente,
      aumentoNecessarioTotal: last.custoFuturoEquivalente - val,
      percentAumentoTotal: last.aumentoCustoPercent,
      blindagem: {
        paradoReal: last.poderCompraReal,
        poupancaReal: last.saldoPoupanca,
        ipcaPlusReal: last.saldoIpcaPlus,
        cdiReal: last.saldoCdi,
        ganhoRealIpcaPlus: last.saldoIpcaPlus - val,
      },
      timeline,
    };

    setResult(calculationResult);

    if (onCalcUpdate) {
      onCalcUpdate({
        type: 'INFLACAO',
        label: 'Impacto da Inflação',
        details: `Simulação de R$ ${val.toLocaleString('pt-BR')} sob inflação de ${rate}% a.a. em ${numYears} anos.`,
      });
    }

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  const handleClear = () => {
    setInputValue(10000);
    setAnnualRate('5.5');
    setSelectedPreset('ipca_medio');
    setYears('10');
    setResult(null);
    setErrorMessage('');
    setSyncNotice(null);
  };

  // Ponte para ação no Painel de Metas
  const handleSaveGoal = () => {
    if (!result) return;
    const goalName = result.mode === 'poder_compra'
      ? 'Reserva Blindada contra Inflação'
      : 'Custo de Vida Futuro Protegido';
    const targetVal = Math.round(result.mode === 'poder_compra' ? result.initialValue : result.custoFuturoFinal);
    const monthlyEstimate = Math.round(targetVal / (result.years * 12)) || 500;
    const query = `action=new&nome=${encodeURIComponent(goalName)}&valor=${encodeURIComponent(String(monthlyEstimate))}&metaAlvo=${encodeURIComponent(String(targetVal))}`;
    onNavigate(`metas?${query}`);
  };

  // Seleciona um preset e atualiza a taxa
  const handleSelectPreset = (preset: InflationPreset) => {
    setSelectedPreset(preset.id);
    setAnnualRate(String(preset.rate));
  };

  // Gráfico de Evolução do Poder de Compra vs Blindagem ou Custo de Vida
  const chartData = useMemo(() => {
    if (!result) return [];
    return result.timeline.map((d) => ({
      name: `Ano ${d.year}`,
      'Poder do Dinheiro Parado': Math.round(d.poderCompraReal),
      'Poupança Tradicional': Math.round(d.saldoPoupanca),
      'Blindado no Tesouro IPCA+': Math.round(d.saldoIpcaPlus),
      'Custo de Vida Projetado': Math.round(d.custoFuturoEquivalente),
      'Custo de Vida Atual': Math.round(result.initialValue),
    }));
  }, [result]);

  return (
    <ToolLayout
      title="Impacto da Inflação"
      icon="📉"
      onBack={onNavigate}
      description="O impacto silencioso da perda do poder de compra e as estratégias de blindagem patrimonial."
      badge="Poder de Compra Real"
    >
      <div className="space-y-8">
        {/* Painel de Configuração e Entradas */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            
            {/* Banner de Sincronização Inteligente com Dados Reais */}
            {isAuthenticated && (
              <div className="mb-6 p-4 bg-gradient-to-r from-violet-50 via-purple-50 to-slate-50 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-slate-900 border border-violet-200/80 dark:border-violet-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span>Sincronizar com Meus Dados do Finanças Pro</span>
                      {(realWealth > 0 || realMonthlyExpense > 0) && (
                        <span className="text-[9px] font-black text-violet-800 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/60 px-2 py-0.5 rounded-full uppercase">
                          Pronto
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Puxe seu patrimônio guardado ou seu custo de vida mensal real sem precisar digitar.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSyncRealData('poder_compra')}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-black rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Usar patrimônio total investido"
                  >
                    <Sparkles size={12} />
                    <span>Usar Meu Saldo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSyncRealData('custo_vida')}
                    className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-slate-700 text-violet-800 dark:text-violet-300 text-[11px] font-black rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                    title="Usar média de despesas mensais"
                  >
                    <Scale size={12} />
                    <span>Usar Meu Custo de Vida</span>
                  </button>
                </div>
              </div>
            )}

            {syncNotice && (
              <div className="mb-6 p-3.5 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 rounded-2xl text-xs font-bold text-violet-900 dark:text-violet-300 flex items-center gap-2 animate-in fade-in duration-300">
                <CheckCircle2 size={16} className="text-violet-600 dark:text-violet-400 shrink-0" />
                <span>{syncNotice}</span>
              </div>
            )}

            {/* Alternador de Lente: Dinheiro Guardado vs Custo de Vida */}
            <div className="mb-6">
              <label className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
                Escolha a Lente de Análise
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setMode('poder_compra')}
                  className={`py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    mode === 'poder_compra'
                      ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <TrendingDown size={16} className={mode === 'poder_compra' ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'} />
                  <span>1. Dinheiro Guardado (Erosão)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('custo_vida')}
                  className={`py-3 px-4 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    mode === 'custo_vida'
                      ? 'bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <TrendingUp size={16} className={mode === 'custo_vida' ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'} />
                  <span>2. Custo de Vida (Reposição)</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 px-1">
                {mode === 'poder_compra'
                  ? '💡 Mostra quanto seu montante de dinheiro hoje comprará no futuro caso fique parado sem render.'
                  : '💡 Mostra quanto você precisará desembolsar por mês no futuro para sustentar seu padrão de vida atual.'}
              </p>
            </div>

            {/* Campos de Entrada */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Valor Monetário */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                  {mode === 'poder_compra' ? 'Valor do Capital Hoje' : 'Custo de Vida Mensal Atual'}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="10.000,00"
                    value={formatMoneyInputDisplay(inputValue)}
                    onChange={(e) => setInputValue(parseMoneyInput(e.target.value))}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-violet-500 focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {mode === 'poder_compra'
                    ? 'O montante guardado para avaliar a desvalorização.'
                    : 'Suas despesas mensais atuais de consumo e moradia.'}
                </p>
              </div>

              {/* Prazo em Anos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Prazo de Avaliação
                  </label>
                  <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">em Anos</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">
                    <Calendar size={16} />
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="10"
                    value={years}
                    onChange={(e) => setYears(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-violet-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Chips rápidos de anos */}
                <div className="flex gap-1.5 pt-1">
                  {['1', '3', '5', '10', '20'].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setYears(yr)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                        years === yr ? 'bg-violet-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {yr} {yr === '1' ? 'ano' : 'anos'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Presets Macroeconômicos Brasileiros de Inflação */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Cenário de Inflação Anual Estimada (IPCA)
                </label>
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                  <span className="text-xs font-black text-slate-800 dark:text-white">{annualRate}%</span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">a.a.</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {INFLATION_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      selectedPreset === preset.id
                        ? 'border-violet-600 bg-violet-50/60 dark:bg-violet-950/40 dark:border-violet-500 shadow-xs ring-2 ring-violet-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-850'
                    }`}
                  >
                    <div>
                      <span className="text-[9px] font-black text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/60 px-1.5 py-0.5 rounded uppercase block w-fit mb-1">
                        {preset.badge}
                      </span>
                      <p className="text-xs font-black text-slate-800 dark:text-white leading-snug">{preset.label}</p>
                    </div>
                    <p className="text-base font-black text-violet-900 dark:text-violet-300 mt-2">{preset.rate}% <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">a.a.</span></p>
                  </button>
                ))}
              </div>

              {/* Opção de taxa personalizada */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">Ou digite uma taxa personalizada:</span>
                <div className="relative w-24">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="5.5"
                    value={annualRate}
                    onChange={(e) => {
                      setAnnualRate(e.target.value);
                      setSelectedPreset('custom');
                    }}
                    className="w-full px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-violet-500 focus:outline-none"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs font-bold">%</span>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                onClick={calculate}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap size={18} /> CALCULAR IMPACTO REAL
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 sm:flex-none sm:px-8 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={16} /> LIMPAR
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-700 dark:text-red-300 font-medium">{errorMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bloco de Resultados */}
        {result && (
          <div ref={resultRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Hero Card com a Verdade Nua (Naked Truth) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Card Principal: Poder de Compra vs Custo de Vida */}
              <div className="lg:col-span-7 bg-gradient-to-br from-violet-50/70 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/20 border border-violet-100 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      {result.mode === 'poder_compra' ? 'Poder de Compra Real Restante' : 'Custo Futuro para o Mesmo Estilo de Vida'}
                    </p>
                    <span className="text-[10px] font-black text-violet-800 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Em {result.years} anos • {result.annualRate}% a.a.
                    </span>
                  </div>

                  <p className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    {result.mode === 'poder_compra'
                      ? fmtMoney(result.poderCompraFinal)
                      : fmtMoney(result.custoFuturoFinal)}
                  </p>

                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
                    {result.mode === 'poder_compra' ? (
                      <>
                        Seus <strong>{fmtMoney(result.initialValue)}</strong> de hoje comprarão apenas o equivalente a{' '}
                        <strong className="text-violet-700 dark:text-violet-400">{fmtMoney(result.poderCompraFinal)}</strong> daqui a {result.years} anos.
                      </>
                    ) : (
                      <>
                        Para comprar o que <strong>{fmtMoney(result.initialValue)}</strong> compram hoje, você precisará desembolsar{' '}
                        <strong className="text-rose-700 dark:text-rose-400">{fmtMoney(result.custoFuturoFinal)}</strong> todo mês.
                      </>
                    )}
                  </p>
                </div>

                {/* Resumo da Corrosão */}
                <div className="mt-6 pt-5 border-t border-violet-100 dark:border-t-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xs p-4 rounded-2xl border border-violet-200/60 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingDown size={14} /> Corrosão Inflacionária Acumulada
                      </p>
                      <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                        {result.mode === 'poder_compra'
                          ? `-${result.percentPerdaTotal.toFixed(1)}%`
                          : `+${result.percentAumentoTotal.toFixed(1)}%`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">Perda Financeira</p>
                      <p className="text-sm font-black text-slate-800 dark:text-white">
                        {result.mode === 'poder_compra'
                          ? fmtMoney(result.perdaValorTotal)
                          : fmtMoney(result.aumentoNecessarioTotal)}
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                    💡 <strong>Naked Truth:</strong> A inflação não diminui o número impresso na sua nota de dinheiro; ela diminui a quantidade de comida, combustível e serviços que essa nota consegue comprar.
                  </p>
                </div>
              </div>

              {/* Cards Laterais de Diagnóstico e Antídoto */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                
                {/* O Antídoto: O que acontece se blindar no Tesouro IPCA+ */}
                <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border border-emerald-200 dark:border-emerald-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-full uppercase">
                        O Antídoto Soberano
                      </span>
                      <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-xs font-black text-slate-800 dark:text-white mt-1">
                      Blindagem no Tesouro IPCA+
                    </p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
                      {fmtMoney(result.blindagem.ipcaPlusReal)}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Investindo com proteção IPCA+ (IPCA + 6,5% a.a.), seu capital preserva 100% do poder de compra e gera{' '}
                      <strong>+{fmtMoney(result.blindagem.ganhoRealIpcaPlus)} de lucro real acima da inflação</strong>.
                    </p>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => onNavigate('investimentos')}
                      className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>Ver Investimentos</span>
                      <ArrowRight size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveGoal}
                      className="flex-1 py-3 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-slate-700 text-emerald-800 dark:text-emerald-300 text-xs font-black rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Sparkles size={14} />
                      <span>Salvar Meta</span>
                    </button>
                  </div>
                </div>

                {/* Comparativo de 3 Vias: Parado vs Poupança vs CDI 100% */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-2xs">
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2.5">
                    O Destino Real do Mesmo Capital
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-rose-50/60 dark:bg-rose-950/30 rounded-xl border border-rose-100 dark:border-rose-900">
                      <p className="text-[9px] font-black text-rose-700 dark:text-rose-400 uppercase">Dinheiro Parado</p>
                      <p className="text-xs font-black text-rose-600 dark:text-rose-400 mt-0.5">{fmtCompactMoney(result.blindagem.paradoReal)}</p>
                      <p className="text-[8px] text-rose-500 font-bold mt-0.5">Perde {result.percentPerdaTotal.toFixed(0)}%</p>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase">Poupança (~6%)</p>
                      <p className="text-xs font-black text-slate-800 dark:text-white mt-0.5">{fmtCompactMoney(result.blindagem.poupancaReal)}</p>
                      <p className="text-[8px] text-slate-500 font-bold mt-0.5">Estagnado</p>
                    </div>
                    <div className="p-2.5 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900">
                      <p className="text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase">100% CDI</p>
                      <p className="text-xs font-black text-blue-700 dark:text-blue-400 mt-0.5">{fmtCompactMoney(result.blindagem.cdiReal)}</p>
                      <p className="text-[8px] text-blue-600 font-bold mt-0.5">Ganho Real</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Abas de Análise Profunda */}
            <div>
              <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('chart')}
                  className={`px-5 py-3 text-sm font-black flex items-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'chart'
                      ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-500'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 size={16} /> Gráfico: Derretimento vs. Blindagem
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className={`px-5 py-3 text-sm font-black flex items-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'table'
                      ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-500'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <TableIcon size={16} /> Tabela de Erosão Ano a Ano
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('learn')}
                  className={`px-5 py-3 text-sm font-black flex items-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'learn'
                      ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-500'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <BookOpen size={16} /> Fundamentos & Blindagem
                </button>
              </div>

              {/* Aba 1: Gráfico */}
              {activeTab === 'chart' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                        {result.mode === 'custo_vida' ? (
                          <>
                            <TrendingUp className="text-violet-600 dark:text-violet-400" size={18} />
                            Curva de Aumento do Custo de Vida Mensal
                          </>
                        ) : (
                          <>
                            <TrendingDown className="text-rose-500 dark:text-rose-400" size={18} />
                            Curva de Erosão Monetária vs. Blindagem Patrimonial
                          </>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {result.mode === 'custo_vida'
                          ? `Projeção do desembolso mensal necessário para manter exatamente o padrão de consumo atual ao longo dos próximos ${result.years} anos.`
                          : `Comparação do poder de compra real (em dinheiro de hoje) ao longo dos próximos ${result.years} anos.`}
                      </p>
                    </div>
                  </div>

                  <div className="h-80 w-full">
                    <ResponsiveContainer>
                      {result.mode === 'custo_vida' ? (
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorCusto" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.2} />
                          <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                          <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => fmtCompactMoney(v)} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                            formatter={(value: any) => [`R$ ${formatCurrency(value)}`, '']}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="Custo de Vida Projetado"
                            stroke="#7c3aed"
                            fill="url(#colorCusto)"
                            strokeWidth={2.5}
                          />
                          <Line
                            type="monotone"
                            dataKey="Custo de Vida Atual"
                            stroke="#94a3b8"
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            dot={false}
                          />
                        </AreaChart>
                      ) : (
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorIpcaPlus" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorParado" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" strokeOpacity={0.2} />
                          <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                          <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => fmtCompactMoney(v)} />
                          <RechartsTooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                            formatter={(value: any) => [`R$ ${formatCurrency(value)}`, '']}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="Blindado no Tesouro IPCA+"
                            stroke="#10b981"
                            fill="url(#colorIpcaPlus)"
                            strokeWidth={2.5}
                          />
                          <Area
                            type="monotone"
                            dataKey="Poder do Dinheiro Parado"
                            stroke="#f43f5e"
                            fill="url(#colorParado)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
                    {result.mode === 'custo_vida'
                      ? '* A curva roxa projeta a inflação acumulada elevando suas despesas para consumir exatamente a mesma cesta de bens.'
                      : '* Todos os valores estão deflacionados para o poder de compra real equivalente em dinheiro de hoje.'}
                  </p>
                </div>
              )}

              {/* Aba 2: Tabela de Marcos Temporais */}
              {activeTab === 'table' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm overflow-x-auto">
                  <h3 className="text-base font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <TableIcon className="text-violet-500" size={18} />
                    Detalhamento Cronológico da Erosão do Dinheiro
                  </h3>

                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                        <th className="text-left py-3 px-3 whitespace-nowrap">Ano</th>
                        <th className="text-right py-3 px-3 text-violet-900 dark:text-violet-300 font-black whitespace-nowrap">Poder Real Restante</th>
                        <th className="text-right py-3 px-3 text-rose-600 dark:text-rose-400 whitespace-nowrap">Perda Acumulada (R$)</th>
                        <th className="text-right py-3 px-3 text-rose-600 dark:text-rose-400 whitespace-nowrap">% de Perda</th>
                        <th className="text-right py-3 px-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">Custo Futuro Equivalente</th>
                        <th className="text-right py-3 px-3 text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">Saldo com Blindagem IPCA+</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.timeline.map((row) => (
                        <tr key={row.year} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-2.5 px-3 font-black text-slate-800 dark:text-white whitespace-nowrap">Ano {row.year}</td>
                          <td className="text-right py-2.5 px-3 font-black text-violet-900 dark:text-violet-300 whitespace-nowrap">{fmtMoney(row.poderCompraReal)}</td>
                          <td className="text-right py-2.5 px-3 text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">-{fmtMoney(row.perdaPoderCompra)}</td>
                          <td className="text-right py-2.5 px-3 text-rose-600 dark:text-rose-400 font-bold whitespace-nowrap">-{row.percentPerda.toFixed(1)}%</td>
                          <td className="text-right py-2.5 px-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{fmtMoney(row.custoFuturoEquivalente)}</td>
                          <td className="text-right py-2.5 px-3 text-emerald-700 dark:text-emerald-400 font-bold whitespace-nowrap">{fmtMoney(row.saldoIpcaPlus)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Aba 3: Fundamentos e Guia Anti-Inflação */}
              {activeTab === 'learn' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                      <ShieldAlert size={18} className="text-rose-500 dark:text-rose-400" />
                      Por que o dinheiro parado é o investimento mais arriscado que existe?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                      Muitas pessoas acreditam que guardar dinheiro em espécie ou na conta corrente é "100% seguro" porque o saldo numérico não oscila. No entanto, no mundo real, a inflação garante uma <strong>perda certa e permanente de poder de compra</strong> todos os dias. Em 10 anos a 5,5% a.a., seu poder de compra diminui em mais de 40%.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-slate-800 dark:text-white mb-1">1. IPCA vs Inflação Pessoal</h4>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        O IPCA mede uma cesta média de produtos de todo o país. O custo de vida da sua família pode subir muito mais rápido devido a gastos concentrados em saúde, educação e alimentação.
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-slate-800 dark:text-white mb-1">2. O Efeito na Aposentadoria</h4>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Projetar sua aposentadoria com base no custo de vida atual sem corrigir pela inflação cria um buraco no orçamento futuro. Você precisará de muito mais capital para manter o mesmo estilo de vida.
                      </p>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                      <h4 className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">3. Como se Blindar</h4>
                      <p className="text-emerald-900 dark:text-emerald-200 leading-relaxed">
                        Alocar parte do patrimônio em títulos indexados à inflação (Tesouro IPCA+, debêntures incentivadas) e ativos reais (imóveis, empresas sólidas) garante ganho real acima da carestia.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};