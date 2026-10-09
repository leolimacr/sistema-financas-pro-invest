import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ToolLayout, ToolGate } from './ToolComponents';
import { 
  Zap, 
  RefreshCw, 
  TrendingUp, 
  Table as TableIcon, 
  BookOpen, 
  BarChart3, 
  Info, 
  AlertCircle, 
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Target,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Percent,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { useWealthData } from '../../hooks/useWealthData';
import { useTransactions } from '../../hooks/useTransactions';
import { useAuth } from '../../contexts/AuthContext';
import { CompoundInterestChart } from './compound/CompoundInterestChart';
import { CompoundInterestTable } from './compound/CompoundInterestTable';

// ─── Helpers de Formatação ──────────────────────────────────────────────────

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtMoneyExact = (n: number) => `R$ ${formatCurrency(n)}`;

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

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface MonthlyData {
  month: number;
  year: number;
  jurosPeriodo: number;
  totalInvestido: number;
  totalJuros: number;
  totalAcumulado: number;
  poderCompraReal: number;
}

export interface YearlyData {
  year: number;
  aporteNoAno: number;
  totalInvestido: number;
  jurosNoAno: number;
  totalJuros: number;
  totalAcumulado: number;
  poderCompraReal: number;
}

export interface CalculationResult {
  total: number;
  investido: number;
  juros: number;
  percentJuros: number;
  multiplicador: number;
  poderCompraReal: number;
  inflacaoAnual: number;
  taxaAnualEfetiva: number;
  taxaMensalEfetiva: number;
  nMeses: number;
  crossoverJurosMes: { mes: number; ano: number; valorJuros: number } | null;
  crossoverJurosTotal: { mes: number; ano: number } | null;
  sensibilidadePlus1: { total: number; delta: number };
  sensibilidadePlus2: { total: number; delta: number };
}

// Benchmarks comuns de mercado brasileiro
const BENCHMARK_RATES = [
  { label: 'Poupança', rate: 6.17, desc: 'Rendimento tradicional isento' },
  { label: 'Selic / 100% CDI', rate: 10.75, desc: 'Referência de liquidez diária' },
  { label: 'Renda Fixa IPCA+', rate: 11.5, desc: 'Títulos públicos/privados médios' },
  { label: 'Ações / FIIs', rate: 13.0, desc: 'Média histórica diversificada' },
];

export const CompoundInterestTool = ({ onNavigate, onCalcUpdate, isAuthenticated }: any) => {
  // Dados do ecossistema
  const { totalInvestments, patrimonioLiquido } = useWealthData();
  const { transactions } = useTransactions();
  const { user, userMeta } = useAuth();

  // Estados dos inputs
  const [initialDeposit, setInitialDeposit] = useState<number | ''>('');
  const [monthlyDeposit, setMonthlyDeposit] = useState<number | ''>('');
  const [rateValue, setRateValue] = useState<string>('10.75');
  const [rateUnit, setRateUnit] = useState<'ano' | 'mes'>('ano');
  const [timeValue, setTimeValue] = useState<string>('10');
  const [timeUnit, setTimeUnit] = useState<'anos' | 'meses'>('anos');

  // Ajuste por inflação (IPCA)
  const [adjustInflation, setAdjustInflation] = useState<boolean>(true);
  const [inflationRate, setInflationRate] = useState<string>('4.5');

  // Estados de cálculo e visualização
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'result' | 'table' | 'learn'>('result');
  const [errorMessage, setErrorMessage] = useState('');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  // Calcula capacidade média real de aporte dos últimos 90 dias
  const realMonthlySurplus = useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const recentTx = transactions.filter((t: any) => {
      if (!t.data) return false;
      const txDate = new Date(t.data);
      return txDate >= ninetyDaysAgo;
    });

    if (recentTx.length === 0) return 0;

    const totalIncome = recentTx
      .filter((t: any) => t.tipo === 'receita')
      .reduce((sum: number, t: any) => sum + (Number(t.valor) || 0), 0);
    const totalExpense = recentTx
      .filter((t: any) => t.tipo === 'despesa')
      .reduce((sum: number, t: any) => sum + (Number(t.valor) || 0), 0);

    const surplus = totalIncome - totalExpense;
    // Média mensal aproximada (90 dias = 3 meses)
    const monthlyAverage = Math.round(surplus / 3);
    return monthlyAverage > 0 ? monthlyAverage : 0;
  }, [transactions]);

  // Sincronização inteligente com dados reais
  const handleSyncRealData = () => {
    let synced = false;
    const actualInvestments = totalInvestments > 0 ? totalInvestments : (patrimonioLiquido > 0 ? patrimonioLiquido : 0);

    if (actualInvestments > 0) {
      setInitialDeposit(actualInvestments);
      synced = true;
    }
    if (realMonthlySurplus > 0) {
      setMonthlyDeposit(realMonthlySurplus);
      synced = true;
    }

    if (synced) {
      const parts: string[] = [];
      if (actualInvestments > 0) parts.push(`${fmtMoneyExact(actualInvestments)} em investimentos`);
      if (realMonthlySurplus > 0) parts.push(`${fmtMoneyExact(realMonthlySurplus)}/mês de capacidade média de aporte`);
      setSyncNotice(`✓ Dados reais sincronizados do seu app: ${parts.join(' e ')}.`);
    } else {
      setSyncNotice('Nenhum investimento registrado no app ainda. Você pode preencher os campos abaixo livremente.');
    }
  };

  if (!isAuthenticated) {
    return (
      <ToolGate 
        title="Simulador de Juros Compostos" 
        description="Descubra o efeito multiplicador do tempo e da rentabilidade na construção do seu patrimônio." 
        onNavigate={onNavigate} 
      />
    );
  }

  // Motor de cálculo de juros compostos com Crossover Point e Sensibilidade
  const calculate = () => {
    setErrorMessage('');
    
    const p = Number(initialDeposit) || 0;
    const m = Number(monthlyDeposit) || 0;
    const rInput = Number(rateValue.replace(',', '.')) || 0;
    const tInput = Number(timeValue.replace(',', '.')) || 0;
    const ipcaInput = adjustInflation ? (Number(inflationRate.replace(',', '.')) || 0) : 0;

    if (p === 0 && m === 0) {
      setErrorMessage('Por favor, adicione um valor inicial ou um aporte mensal.');
      return;
    }
    if (rInput <= 0) {
      setErrorMessage('A taxa de juros deve ser maior que zero.');
      return;
    }
    if (tInput <= 0) {
      setErrorMessage('O período deve ser maior que zero.');
      return;
    }

    // Normalização de tempo para meses
    const nMeses = timeUnit === 'anos' ? Math.round(tInput * 12) : Math.round(tInput);

    // Normalização de taxa de juros efetiva mensal
    let taxaMensalEfetiva: number;
    let taxaAnualEfetiva: number;

    if (rateUnit === 'ano') {
      taxaAnualEfetiva = rInput;
      taxaMensalEfetiva = Math.pow(1 + rInput / 100, 1 / 12) - 1;
    } else {
      taxaMensalEfetiva = rInput / 100;
      taxaAnualEfetiva = (Math.pow(1 + taxaMensalEfetiva, 12) - 1) * 100;
    }

    // Inflação mensal
    const inflacaoMensal = Math.pow(1 + ipcaInput / 100, 1 / 12) - 1;

    // Simulação mês a mês
    let totalAcumulado = p;
    let totalInvestido = p;
    let totalJurosAcumulado = 0;
    const monthlyList: MonthlyData[] = [];

    let crossoverJurosMes: { mes: number; ano: number; valorJuros: number } | null = null;
    let crossoverJurosTotal: { mes: number; ano: number } | null = null;

    for (let mes = 1; mes <= nMeses; mes++) {
      totalAcumulado += m;
      totalInvestido += m;

      const jurosPeriodo = totalAcumulado * taxaMensalEfetiva;
      totalAcumulado += jurosPeriodo;
      totalJurosAcumulado += jurosPeriodo;

      const ano = Math.floor((mes - 1) / 12) + 1;

      // Ponto de virada 1: juros do mês superam o aporte do bolso
      if (m > 0 && !crossoverJurosMes && jurosPeriodo >= m) {
        crossoverJurosMes = {
          mes,
          ano,
          valorJuros: jurosPeriodo,
        };
      }

      // Ponto de virada 2: total de juros acumulados supera o capital depositado
      if (!crossoverJurosTotal && totalJurosAcumulado >= totalInvestido) {
        crossoverJurosTotal = {
          mes,
          ano,
        };
      }

      // Poder de compra real deflacionado pelo IPCA
      const deflator = Math.pow(1 + inflacaoMensal, mes);
      const poderCompraReal = totalAcumulado / deflator;

      monthlyList.push({
        month: mes,
        year: ano,
        jurosPeriodo,
        totalInvestido,
        totalJuros: totalJurosAcumulado,
        totalAcumulado,
        poderCompraReal,
      });
    }

    // Agrupamento anual para a tabela resumida
    const yearlyList: YearlyData[] = [];
    const totalAnos = Math.ceil(nMeses / 12);

    for (let ano = 1; ano <= totalAnos; ano++) {
      const mesesDoAno = monthlyList.filter(d => d.year === ano);
      if (mesesDoAno.length === 0) continue;

      const ultimoMes = mesesDoAno[mesesDoAno.length - 1];
      const jurosNoAno = mesesDoAno.reduce((acc, curr) => acc + curr.jurosPeriodo, 0);
      const aporteNoAno = mesesDoAno.length * m + (ano === 1 ? p : 0);

      yearlyList.push({
        year: ano,
        aporteNoAno,
        totalInvestido: ultimoMes.totalInvestido,
        jurosNoAno,
        totalJuros: ultimoMes.totalJuros,
        totalAcumulado: ultimoMes.totalAcumulado,
        poderCompraReal: ultimoMes.poderCompraReal,
      });
    }

    // Cálculo de sensibilidade de taxa (+1% e +2% a.a.)
    const calcularMontanteComTaxa = (deltaAnual: number) => {
      const rSim = taxaAnualEfetiva + deltaAnual;
      const rMensalSim = Math.pow(1 + rSim / 100, 1 / 12) - 1;
      let tot = p;
      for (let i = 1; i <= nMeses; i++) {
        tot += m;
        tot += tot * rMensalSim;
      }
      return tot;
    };

    const montantePlus1 = calcularMontanteComTaxa(1);
    const montantePlus2 = calcularMontanteComTaxa(2);

    const juros = totalAcumulado - totalInvestido;
    const percentJuros = totalAcumulado > 0 ? (juros / totalAcumulado) * 100 : 0;
    const multiplicador = totalInvestido > 0 ? (totalAcumulado / totalInvestido) : 1;
    const poderCompraFinal = monthlyList.length > 0 ? monthlyList[monthlyList.length - 1].poderCompraReal : totalAcumulado;

    const res: CalculationResult = {
      total: totalAcumulado,
      investido: totalInvestido,
      juros,
      percentJuros,
      multiplicador,
      poderCompraReal: poderCompraFinal,
      inflacaoAnual: ipcaInput,
      taxaAnualEfetiva,
      taxaMensalEfetiva,
      nMeses,
      crossoverJurosMes,
      crossoverJurosTotal,
      sensibilidadePlus1: { total: montantePlus1, delta: montantePlus1 - totalAcumulado },
      sensibilidadePlus2: { total: montantePlus2, delta: montantePlus2 - totalAcumulado },
    };

    setMonthlyData(monthlyList);
    setYearlyData(yearlyList);
    setResult(res);
    setActiveTab('result');

    if (onCalcUpdate) {
      onCalcUpdate({
        type: 'JUROS_COMPOSTOS',
        label: 'Calculadora de Juros Compostos',
        details: `Simulação de R$ ${totalAcumulado.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} em ${timeValue} ${timeUnit}.`
      });
    }

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  const handleClear = () => {
    setInitialDeposit('');
    setMonthlyDeposit('');
    setRateValue('10.75');
    setRateUnit('ano');
    setTimeValue('10');
    setTimeUnit('anos');
    setAdjustInflation(true);
    setInflationRate('4.5');
    setMonthlyData([]);
    setYearlyData([]);
    setResult(null);
    setErrorMessage('');
    setSyncNotice(null);
  };

  // Ponte para ação com o módulo de Metas
  const handleSaveGoal = () => {
    if (!result) return;
    const goalName = 'Acúmulo de Patrimônio (Juros Compostos)';
    const monthlyAporte = Number(monthlyDeposit) || 0;
    const targetNumber = Math.round(result.total);
    const query = `action=new&nome=${encodeURIComponent(goalName)}&valor=${encodeURIComponent(String(monthlyAporte))}&metaAlvo=${encodeURIComponent(String(targetNumber))}`;
    onNavigate(`metas?${query}`);
  };

  // Dados para o Gráfico de Evolução
  const chartData = useMemo(() => {
    if (yearlyData.length > 0 && nMesesFinal() > 24) {
      // Em simulações longas, plota pontos anuais para fluidez máxima
      return yearlyData.map(d => ({
        label: `Ano ${d.year}`,
        'Valor Investido': Math.round(d.totalInvestido),
        'Juros Acumulados': Math.round(d.totalJuros),
        'Poder Real': Math.round(d.poderCompraReal),
      }));
    }
    return monthlyData.map(d => ({
      label: `Mês ${d.month}`,
      'Valor Investido': Math.round(d.totalInvestido),
      'Juros Acumulados': Math.round(d.totalJuros),
      'Poder Real': Math.round(d.poderCompraReal),
    }));
  }, [yearlyData, monthlyData]);

  function nMesesFinal() {
    const t = Number(timeValue) || 0;
    return timeUnit === 'anos' ? t * 12 : t;
  }

  return (
    <ToolLayout 
      title="Calculadora de Juros Compostos" 
      icon="📈" 
      onBack={onNavigate} 
      description="O poder da multiplicação patrimonial pelo tempo e pelos juros." 
      badge="Efeito Bola de Neve"
    >
      <div className="space-y-8">
        {/* Bloco de Entrada de Dados */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            
            {/* Sincronização Inteligente com Dados Reais do App */}
            {isAuthenticated && (
              <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <span>Usar Meus Dados Reais do Finanças Pro</span>
                      {(totalInvestments > 0 || realMonthlySurplus > 0) && (
                        <span className="text-[9px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full uppercase">
                          Pronto
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Puxa seu saldo investido e sua média real de sobra mensal sem precisar digitar.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSyncRealData}
                  className="self-start sm:self-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
                >
                  <Sparkles size={14} />
                  <span>Usar Meus Dados Reais</span>
                </button>
              </div>
            )}

            {syncNotice && (
              <div className="mb-6 p-3.5 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in duration-300">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{syncNotice}</span>
              </div>
            )}

            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-1">
                Simule a Multiplicação do Seu Capital
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto">
                Veja como aportes consistentes combinados ao efeito bola de neve transformam seu dinheiro no tempo.
              </p>
            </div>

            {/* Grid de Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Aporte Inicial */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Aporte Inicial
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={formatMoneyInputDisplay(initialDeposit)}
                    onChange={(e) => setInitialDeposit(parseMoneyInput(e.target.value))}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400">O valor que você já possui hoje para começar.</p>
              </div>

              {/* Aporte Mensal */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Aporte Mensal
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={formatMoneyInputDisplay(monthlyDeposit)}
                    onChange={(e) => setMonthlyDeposit(parseMoneyInput(e.target.value))}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400">Quanto você guarda e investe todo mês.</p>
              </div>

              {/* Taxa de Juros com Unidade */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Taxa de Rentabilidade
                  </label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-black">
                    <button
                      type="button"
                      onClick={() => setRateUnit('ano')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        rateUnit === 'ano' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      % ao Ano
                    </button>
                    <button
                      type="button"
                      onClick={() => setRateUnit('mes')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        rateUnit === 'mes' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      % ao Mês
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    %
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="10.75"
                    value={rateValue}
                    onChange={(e) => setRateValue(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Chips rápidos de mercado brasileiro */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {BENCHMARK_RATES.map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => {
                        setRateValue(String(b.rate));
                        setRateUnit('ano');
                      }}
                      className="text-[9px] font-bold px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 hover:text-emerald-800 dark:hover:text-emerald-300 text-slate-600 dark:text-slate-300 rounded-md transition-colors"
                      title={b.desc}
                    >
                      {b.label} ({b.rate}% a.a.)
                    </button>
                  ))}
                </div>
              </div>

              {/* Período com Unidade */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Período / Prazo
                  </label>
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-black">
                    <button
                      type="button"
                      onClick={() => setTimeUnit('anos')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        timeUnit === 'anos' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Anos
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeUnit('meses')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        timeUnit === 'meses' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Meses
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    <Calendar size={16} />
                  </span>
                  <input
                    type="number"
                    min="1"
                    placeholder="10"
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Chips rápidos de anos */}
                <div className="flex gap-1.5 pt-1">
                  {['1', '5', '10', '20', '30'].map((years) => (
                    <button
                      key={years}
                      type="button"
                      onClick={() => {
                        setTimeValue(years);
                        setTimeUnit('anos');
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md transition-colors"
                    >
                      {years} {years === '1' ? 'ano' : 'anos'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Toggle de Inflação / Poder de Compra Real (Naked Truth) */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-white">
                      Corrigir pela Inflação (Poder de Compra Real)
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Mostra o valor real equivalente em dinheiro de hoje, descontando a perda inflacionária pelo IPCA.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {adjustInflation && (
                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">IPCA:</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={inflationRate}
                        onChange={(e) => setInflationRate(e.target.value)}
                        className="w-10 text-xs font-black text-slate-800 dark:text-white text-center focus:outline-none bg-transparent"
                      />
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">% a.a.</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setAdjustInflation(!adjustInflation)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      adjustInflation ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        adjustInflation ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button 
                type="button"
                onClick={calculate} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap size={18} /> CALCULAR MULTIPLICAÇÃO
              </button>
              <button 
                type="button"
                onClick={handleClear} 
                className="flex-1 sm:flex-none sm:px-8 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={16} /> LIMPAR
              </button>
            </div>

            {errorMessage && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-700 font-medium">{errorMessage}</p>
              </div>
            )}
          </div>
        </div>

        {/* Bloco de Resultados */}
        {result && (
          <div ref={resultRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Hero Card de Resultado */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Card Principal: Montante Bruto vs Poder de Compra Real */}
              <div className="lg:col-span-7 bg-gradient-to-br from-emerald-50 via-white to-slate-50 border border-emerald-100 p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      Patrimônio Bruto Acumulado
                    </p>
                    <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {result.nMeses} meses
                    </span>
                  </div>

                  <p className="text-4xl sm:text-5xl font-black text-slate-800 dark:text-white tracking-tight">
                    {fmtMoneyExact(result.total)}
                  </p>
                </div>

                {/* Poder de Compra Real em Dinheiro de Hoje */}
                {adjustInflation && (
                  <div className="mt-6 pt-5 border-t border-emerald-100/80 dark:border-emerald-800/60 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs p-4 rounded-2xl border border-emerald-200/50 dark:border-emerald-800/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                          <ShieldCheck size={14} /> Poder de Compra Real (Dinheiro de Hoje)
                        </p>
                        <p className="text-2xl font-black text-emerald-900 dark:text-emerald-200 mt-0.5">
                          {fmtMoneyExact(result.poderCompraReal)}
                        </p>
                      </div>
                      <div className="text-right text-[10px] text-slate-500 dark:text-slate-400 font-bold max-w-[150px]">
                        Considerando IPCA médio de {result.inflacaoAnual}% a.a.
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                      💡 <strong>Naked Truth:</strong> Em termos de poder de consumo, seus R$ {fmtCompactMoney(result.total)} comprarão exatamente o mesmo que R$ {fmtCompactMoney(result.poderCompraReal)} compram hoje.
                    </p>
                  </div>
                )}
              </div>

              {/* Cards Secundários de Decomposição */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                
                {/* Do seu Bolso */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    Total do Seu Bolso
                  </p>
                  <div className="my-2">
                    <p className="text-xl font-black text-slate-800 dark:text-white">
                      {fmtMoneyExact(result.investido)}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      {((result.investido / result.total) * 100).toFixed(1)}% do patrimônio
                    </p>
                  </div>
                  <span className="text-[9px] font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md inline-block w-fit">
                    Aportes Pessoais
                  </span>
                </div>

                {/* Lucro em Juros */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 shadow-sm flex flex-col justify-between">
                  <p className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                    Lucro em Juros
                  </p>
                  <div className="my-2">
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {fmtMoneyExact(result.juros)}
                    </p>
                    <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      {result.percentJuros.toFixed(1)}% do patrimônio
                    </p>
                  </div>
                  <span className="text-[9px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md inline-block w-fit">
                    Trabalho do Tempo
                  </span>
                </div>

                {/* Multiplicador de Riqueza */}
                <div className="col-span-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                      Multiplicador de Capital
                    </p>
                    <p className="text-2xl font-black mt-0.5">
                      {result.multiplicador.toFixed(2)}×
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Para cada R$ 1,00 depositado, você terá R$ {result.multiplicador.toFixed(2)}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveGoal}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Target size={14} />
                    <span>Salvar Meta no App</span>
                  </button>
                </div>
              </div>
            </div>

            {/* O Ponto de Virada (The Crossover Point / Efeito Bola de Neve Real) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                  ❄️
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-white">
                    O Efeito Bola de Neve (Ponto de Virada)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Os momentos matemáticos exatos em que a força dos juros assume o protagonismo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Virada 1: Juros do Mês > Aporte */}
                <div className={`p-5 rounded-2xl border ${result.crossoverJurosMes ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{result.crossoverJurosMes ? '⚡' : '⏳'}</span>
                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">
                      Juros Mensais Superam Seu Aporte
                    </p>
                  </div>
                  {result.crossoverJurosMes ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Acontece no <strong>{result.crossoverJurosMes.ano}º ano</strong> (Mês {result.crossoverJurosMes.mes}).
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Nesse mês, os juros sozinhos renderão <strong>{fmtMoneyExact(result.crossoverJurosMes.valorJuros)}</strong>, superando o seu esforço mensal de {fmtMoneyExact(Number(monthlyDeposit) || 0)}. A partir daqui, o dinheiro trabalha mais pesado que você!
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Nesse período simulado, seus juros ainda não ultrapassam o valor do aporte mensal. Aumente o prazo ou a taxa para ver o ponto de virada acontecer.
                    </p>
                  )}
                </div>

                {/* Virada 2: Juros Acumulados > Total Investido */}
                <div className={`p-5 rounded-2xl border ${result.crossoverJurosTotal ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{result.crossoverJurosTotal ? '🏆' : '⏳'}</span>
                    <p className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wide">
                      Mais de 50% do Bolo é Juro Puro
                    </p>
                  </div>
                  {result.crossoverJurosTotal ? (
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        Acontece no <strong>{result.crossoverJurosTotal.ano}º ano</strong> (Mês {result.crossoverJurosTotal.mes}).
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Nesse ponto, o total acumulado em juros ultrapassa 100% de tudo o que você tirou do próprio bolso. Mais da metade de todo o seu patrimônio passa a ser fruto exclusivo do tempo.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Para que o lucro em juros ultrapasse o total depositado do bolso, mantenha a consistência dos aportes em um horizonte mais longo.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Comparador de Sensibilidade da Rentabilidade (+1% e +2% a.a.) */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-base font-black text-emerald-400 flex items-center gap-2">
                    <TrendingUp size={18} />
                    O Impacto de Render Apenas 1% ou 2% a Mais
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Veja como pequenas melhorias na rentabilidade da sua carteira explodem no longo prazo:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Cenário com +1,0% a.a. ({(result.taxaAnualEfetiva + 1).toFixed(2)}%)
                    </span>
                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                      +{fmtMoneyExact(result.sensibilidadePlus1.delta)}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-white mt-2">
                    {fmtMoneyExact(result.sensibilidadePlus1.total)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Você ganha <strong>{fmtMoneyExact(result.sensibilidadePlus1.delta)} a mais</strong> sem precisar aumentar 1 centavo dos seus aportes mensais.
                  </p>
                </div>

                <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">
                      Cenário com +2,0% a.a. ({(result.taxaAnualEfetiva + 2).toFixed(2)}%)
                    </span>
                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                      +{fmtMoneyExact(result.sensibilidadePlus2.delta)}
                    </span>
                  </div>
                  <p className="text-2xl font-black text-white mt-2">
                    {fmtMoneyExact(result.sensibilidadePlus2.total)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Você ganha <strong>{fmtMoneyExact(result.sensibilidadePlus2.delta)} a mais</strong> apenas melhorando a alocação e reduzindo taxas desnecessárias.
                  </p>
                </div>
              </div>
            </div>

            {/* Abas de Detalhamento: Gráfico, Tabela e Fundamentos */}
            <div className="mt-8">
              <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('result')}
                  className={`px-5 py-3 text-sm font-black flex items-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'result'
                      ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 size={16} /> Gráfico de Evolução
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className={`px-5 py-3 text-sm font-black flex items-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'table'
                      ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <TableIcon size={16} /> Tabela de Crescimento
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('learn')}
                  className={`px-5 py-3 text-sm font-black flex items-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'learn'
                      ? 'text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                  }`}
                >
                  <BookOpen size={16} /> Fundamentos & Regra dos 72
                </button>
              </div>

              {/* Aba 1: Gráfico */}
              {activeTab === 'result' && (
                <CompoundInterestChart chartData={chartData} />
              )}

              {/* Aba 2: Tabela com Alternador Anual vs Mensal */}
              {activeTab === 'table' && (
                <CompoundInterestTable
                  yearlyData={yearlyData}
                  monthlyData={monthlyData}
                  adjustInflation={adjustInflation}
                />
              )}

              {/* Aba 3: Fundamentos e Matemática */}
              {activeTab === 'learn' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                      <Sparkles size={18} className="text-emerald-500" />
                      A Regra dos 72: Em quantos anos seu dinheiro dobra?
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                      A <strong>Regra dos 72</strong> é um atalho mental consagrado mundialmente por investidores. Divida 72 pela sua taxa de rentabilidade anual para descobrir o tempo aproximado que seu dinheiro leva para dobrar de valor sem novos aportes.
                    </p>
                    <div className="mt-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200 font-bold">
                      72 ÷ {result.taxaAnualEfetiva.toFixed(1)}% a.a. = ~{(72 / result.taxaAnualEfetiva).toFixed(1)} anos para dobrar o capital inicial.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-2xl">
                      <h4 className="font-bold text-blue-600 dark:text-blue-400 mb-1 text-xs uppercase tracking-wider">Juros Simples</h4>
                      <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                        Os juros incidem apenas sobre o valor inicial depositado. O crescimento é linear (uma linha reta constante). Exemplo: R$ 1.000 a 10% a.a. rende exatamente R$ 100 todo ano.
                      </p>
                    </div>

                    <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl">
                      <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-1 text-xs uppercase tracking-wider">Juros Compostos</h4>
                      <p className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed">
                        Os juros incidem sobre o montante acumulado (capital + juros passados). O crescimento é exponencial (uma curva que se inclina para cima cada vez mais rápido).
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                      <Info size={18} className="text-emerald-500" />
                      A Fórmula Exata Usada na Simulação
                    </h3>
                    <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-xs overflow-x-auto space-y-1 border border-slate-800">
                      <p className="text-emerald-400 font-bold">// Montante de Depósitos Regulares Antecipados</p>
                      <p>FV = P × (1 + i)^n + M × [((1 + i)^n - 1) / i] × (1 + i)</p>
                      <p className="text-slate-400 pt-1">// Onde P = Aporte Inicial, M = Aporte Mensal, i = Taxa Mensal, n = Número de Meses</p>
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
