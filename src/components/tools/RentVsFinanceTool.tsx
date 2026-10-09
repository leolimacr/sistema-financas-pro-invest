import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ToolLayout, ToolGate } from './ToolComponents';
import {
  Home,
  TrendingUp,
  TrendingDown,
  Percent,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  Table as TableIcon,
  BarChart3,
  BookOpen,
  Calendar,
  ArrowRight,
  ShieldCheck,
  Scale,
  DollarSign,
  Target,
  Info,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  Line,
} from 'recharts';
import { useWealthData } from '../../hooks/useWealthData';
import { useTransactions } from '../../hooks/useTransactions';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCurrentSelicRate } from './buy-cash-or-installments/selicService';
import { RentVsFinanceTimeline } from './real-estate/RentVsFinanceTimeline';

// ─── Helpers de Formatação ──────────────────────────────────────────────────

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(val);

const fmtMoneyExact = (val: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

const formatPercent = (val: number) => `${Number(val).toFixed(1)}%`;

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

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface TimelineYearPoint {
  year: number;
  month: number;
  installment: number;
  outstandingDebt: number;
  rent: number;
  renterNetWorth: number;
  buyerNetWorth: number;
  propertyValue: number;
  difference: number;
  leader: 'buy' | 'rent';
}

export interface RentVsFinanceResult {
  winner: 'buy' | 'rent';
  differenceAmount: number;
  buyFinal: number;
  rentFinal: number;
  breakevenYear: number | null;
  initialOutflow: number;
  itivCost: number;
  notaryCost: number;
  annualMaintenanceCost: number;
  derivedFinancingRate: number;
  timeline: TimelineYearPoint[];
}

export const RentVsFinanceTool = ({ onNavigate, onCalcUpdate, isAuthenticated }: any) => {
  const { totalInvestments, patrimonioLiquido } = useWealthData();
  const { transactions } = useTransactions();
  const { user } = useAuth();

  // Estados dos inputs principais
  const [propertyValue, setPropertyValue] = useState<number | ''>(500000);
  const [rentValue, setRentValue] = useState<number | ''>(2500);
  const [downPayment, setDownPayment] = useState<number | ''>(100000);
  const [periodYears, setPeriodYears] = useState<string>('30');
  const [amortizationSystem, setAmortizationSystem] = useState<'SAC' | 'PRICE'>('SAC');

  // Custos de aquisição e manutenção
  const [includeItiv, setIncludeItiv] = useState<boolean>(true);
  const [itivRate, setItivRate] = useState<number>(3.0);
  const [includeNotary, setIncludeNotary] = useState<boolean>(true);
  const [notaryRate, setNotaryRate] = useState<number>(2.0);
  const [includeMaintenance, setIncludeMaintenance] = useState<boolean>(true);
  const [maintenanceRate, setMaintenanceRate] = useState<number>(0.8);

  // Premissas econômicas avançadas
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
  const [investmentRate, setInvestmentRate] = useState<number>(10.75);
  const [propertyAppreciation, setPropertyAppreciation] = useState<number>(5.0);
  const [rentReadjustment, setRentReadjustment] = useState<number>(5.0);

  // Taxa de juros do financiamento & Selic
  const [useCurrentSelic, setUseCurrentSelic] = useState<boolean>(true);
  const [selicCurrent, setSelicCurrent] = useState<number | null>(null);
  const [selicStatus, setSelicStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [bankSpread, setBankSpread] = useState<number>(3.5);
  const [financingRateManual, setFinancingRateManual] = useState<number>(10.5);

  // Estados de visualização e feedback
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'learn'>('chart');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const resultRef = useRef<HTMLDivElement>(null);

  // Consulta taxa Selic oficial do Banco Central (Série 432 - Meta Copom)
  useEffect(() => {
    let isMounted = true;
    const loadSelic = async () => {
      try {
        setSelicStatus('loading');
        const rate = await fetchCurrentSelicRate();
        if (!isMounted) return;
        if (Number.isFinite(rate) && rate > 0) {
          setSelicCurrent(rate);
          setSelicStatus('ok');
        } else {
          setSelicStatus('error');
        }
      } catch (e) {
        if (!isMounted) return;
        setSelicStatus('error');
      }
    };
    loadSelic();
    return () => {
      isMounted = false;
    };
  }, []);

  // Taxa de financiamento derivada
  const derivedFinancingRate = useMemo(() => {
    if (useCurrentSelic) {
      const base = Number.isFinite(selicCurrent) ? (selicCurrent as number) : 10.75;
      return Math.max(0, base + bankSpread);
    }
    return Math.max(0, financingRateManual);
  }, [useCurrentSelic, selicCurrent, bankSpread, financingRateManual]);

  // Saldo real investido do usuário (potencial para entrada)
  const realWealth = useMemo(() => {
    return totalInvestments > 0 ? totalInvestments : (patrimonioLiquido > 0 ? patrimonioLiquido : 0);
  }, [totalInvestments, patrimonioLiquido]);

  // Detecção de aluguel ou moradia real nas despesas dos últimos 90 dias
  const detectedRent = useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;
    const now = new Date();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(now.getDate() - 90);

    const housingTx = transactions.filter((t: any) => {
      if (!t.data || t.tipo !== 'despesa') return false;
      const txDate = new Date(t.data);
      if (txDate < ninetyDaysAgo) return false;
      const desc = (t.descricao || '').toLowerCase();
      const cat = (t.categoria || '').toLowerCase();
      return desc.includes('aluguel') || cat.includes('moradia') || desc.includes('condom');
    });

    if (housingTx.length === 0) return 0;
    const sum = housingTx.reduce((acc: number, t: any) => acc + (Number(t.valor) || 0), 0);
    return Math.round(sum / 3);
  }, [transactions]);

  // Sincronização inteligente com dados reais do app
  const handleSyncRealData = () => {
    let synced = false;
    const parts: string[] = [];

    if (realWealth > 0) {
      setDownPayment(realWealth);
      synced = true;
      parts.push(`${formatCurrency(realWealth)} para entrada`);
    }

    if (detectedRent > 0) {
      setRentValue(detectedRent);
      synced = true;
      parts.push(`${formatCurrency(detectedRent)}/mês de aluguel detectado`);
    }

    if (synced) {
      setSyncNotice(`✓ Dados reais sincronizados do seu app: ${parts.join(' e ')}.`);
    } else {
      setSyncNotice('Nenhum dado de patrimônio ou aluguel encontrado no app. Preencha os campos livremente.');
    }
  };

  // Motor de Simulação Financeira com Breakeven Point e Custos de Manutenção
  const simulationResults = useMemo<RentVsFinanceResult | null>(() => {
    const propVal = Number(propertyValue) || 0;
    const rentVal = Number(rentValue) || 0;
    const downVal = Number(downPayment) || 0;
    const yearsVal = Math.min(Math.max(Number(periodYears) || 1, 1), 35);
    const totalMonths = yearsVal * 12;

    if (propVal <= 0 || rentVal <= 0) return null;

    const monthlyInvRate = Math.pow(1 + investmentRate / 100, 1 / 12) - 1;
    const monthlyPropAppr = Math.pow(1 + propertyAppreciation / 100, 1 / 12) - 1;
    const monthlyRentReadj = Math.pow(1 + rentReadjustment / 100, 1 / 12) - 1;
    const monthlyFinRate = Math.pow(1 + derivedFinancingRate / 100, 1 / 12) - 1;
    const monthlyMaintRate = includeMaintenance ? (maintenanceRate / 100) / 12 : 0;

    const itivCost = includeItiv ? propVal * (itivRate / 100) : 0;
    const notaryCost = includeNotary ? propVal * (notaryRate / 100) : 0;
    const totalInitialOutflow = downVal + itivCost + notaryCost;

    let currentPropertyValue = propVal;
    let currentRent = rentVal;
    let debt = Math.max(0, propVal - downVal);

    const fixedSacAmortization = debt > 0 ? debt / totalMonths : 0;
    const priceFixedInstallment =
      debt > 0 && monthlyFinRate > 0
        ? (debt * (monthlyFinRate * Math.pow(1 + monthlyFinRate, totalMonths))) /
          (Math.pow(1 + monthlyFinRate, totalMonths) - 1)
        : debt / totalMonths;

    let renterInvestments = totalInitialOutflow;
    let buyerInvestments = 0;

    const timeline: TimelineYearPoint[] = [];
    let breakevenYear: number | null = null;
    let previousLeader: 'buy' | 'rent' | null = null;

    for (let m = 1; m <= totalMonths; m++) {
      currentRent *= 1 + monthlyRentReadj;

      let installment = 0;
      let amortization = 0;
      const interest = debt * monthlyFinRate;

      if (debt > 0) {
        if (amortizationSystem === 'PRICE') {
          installment = priceFixedInstallment;
          amortization = Math.max(0, installment - interest);
        } else {
          amortization = fixedSacAmortization;
          installment = amortization + interest;
        }
        debt = Math.max(0, debt - amortization);
      }

      currentPropertyValue *= 1 + monthlyPropAppr;
      const maintenanceCost = currentPropertyValue * monthlyMaintRate;

      // Desembolso total do comprador no mês (parcela + manutenção) vs desembolso do inquilino (aluguel)
      const buyerTotalOutflow = installment + maintenanceCost;
      const cashflowDiff = buyerTotalOutflow - currentRent;

      // Se o comprador desembolsou mais que o aluguel, o inquilino investe a folga
      if (cashflowDiff > 0) {
        renterInvestments += cashflowDiff;
      } else {
        // Se o aluguel ficou mais caro que a parcela, o comprador investe a folga
        buyerInvestments += Math.abs(cashflowDiff);
      }

      renterInvestments *= 1 + monthlyInvRate;
      buyerInvestments *= 1 + monthlyInvRate;

      // Registro nos marcos anuais ou no último mês
      if (m % 12 === 0 || m === totalMonths) {
        const yr = Math.round(m / 12);
        const buyerNetWorth = Math.round(currentPropertyValue - debt + buyerInvestments);
        const currentRenterNW = Math.round(renterInvestments);
        const leader: 'buy' | 'rent' = buyerNetWorth >= currentRenterNW ? 'buy' : 'rent';

        if (previousLeader && previousLeader !== leader && breakevenYear === null) {
          breakevenYear = yr;
        }
        previousLeader = leader;

        timeline.push({
          year: yr,
          month: m,
          installment: Math.round(installment),
          outstandingDebt: Math.round(debt),
          rent: Math.round(currentRent),
          renterNetWorth: currentRenterNW,
          buyerNetWorth,
          propertyValue: Math.round(currentPropertyValue),
          difference: Math.abs(buyerNetWorth - currentRenterNW),
          leader,
        });
      }
    }

    const last = timeline[timeline.length - 1];
    const buyFinal = last.buyerNetWorth;
    const rentFinal = last.renterNetWorth;
    const differenceAmount = Math.abs(buyFinal - rentFinal);
    const winner: 'buy' | 'rent' = buyFinal >= rentFinal ? 'buy' : 'rent';

    const res: RentVsFinanceResult = {
      winner,
      differenceAmount,
      buyFinal,
      rentFinal,
      breakevenYear,
      initialOutflow: totalInitialOutflow,
      itivCost,
      notaryCost,
      annualMaintenanceCost: Math.round(propVal * (maintenanceRate / 100)),
      derivedFinancingRate,
      timeline,
    };

    return res;
  }, [
    propertyValue,
    rentValue,
    downPayment,
    periodYears,
    amortizationSystem,
    includeItiv,
    itivRate,
    includeNotary,
    notaryRate,
    includeMaintenance,
    maintenanceRate,
    investmentRate,
    propertyAppreciation,
    rentReadjustment,
    derivedFinancingRate,
  ]);

  if (!isAuthenticated) {
    return (
      <ToolGate
        title="Imóveis: Alugar vs Comprar"
        description="A decisão financeira mais importante da sua vida exige matemática, não emoção."
        onNavigate={onNavigate}
      />
    );
  }

  // Ponte para ação com o Gerenciador de Metas
  const handleSaveGoal = () => {
    if (!simulationResults) return;
    const isBuyWinner = simulationResults.winner === 'buy';
    const goalName = isBuyWinner
      ? 'Entrada do Imóvel Próprio'
      : 'Acúmulo no Custo de Oportunidade (Aluguel)';
    const targetVal = isBuyWinner
      ? (Number(downPayment) > 0 ? Number(downPayment) : 100000)
      : Math.round(simulationResults.rentFinal);
    const monthlyEstimate = Math.round(targetVal / (Number(periodYears) * 12)) || 1000;
    const query = `action=new&nome=${encodeURIComponent(goalName)}&valor=${encodeURIComponent(String(monthlyEstimate))}&metaAlvo=${encodeURIComponent(String(targetVal))}`;
    onNavigate(`metas?${query}`);
  };

  // Dados para o Gráfico de Evolução Patrimonial
  const chartData = useMemo(() => {
    if (!simulationResults) return [];
    return simulationResults.timeline.map((d) => ({
      name: `${d.year}º ano`,
      'Comprando (Imóvel - Dívida)': d.buyerNetWorth,
      'Alugando (Investindo a Diferença)': d.renterNetWorth,
    }));
  }, [simulationResults]);

  const winnerLabel = simulationResults?.winner === 'rent' ? 'ALUGAR' : 'COMPRAR';
  const loserLabel = simulationResults?.winner === 'rent' ? 'COMPRAR' : 'ALUGAR';
  const winnerFinal =
    simulationResults?.winner === 'rent' ? simulationResults.rentFinal : simulationResults?.buyFinal;
  const loserFinal =
    simulationResults?.winner === 'rent' ? simulationResults.buyFinal : simulationResults?.rentFinal;

  return (
    <ToolLayout
      title="Alugar vs Comprar Imóvel"
      icon="🏠"
      onBack={onNavigate}
      description="Simulador soberano de custo de oportunidade, juros, valorização e impostos."
      badge="Decisão Imobiliária Soberana"
    >
      <div className="space-y-8">
        {/* Painel de Entradas */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
            
            {/* Banner de Sincronização Inteligente com Dados do App */}
            {isAuthenticated && (
              <div className="mb-6 p-4 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 dark:from-sky-950/40 dark:via-blue-950/30 dark:to-indigo-950/40 border border-sky-200/80 dark:border-blue-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Zap size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span>Usar Meus Dados Reais do Finanças Pro</span>
                      {(realWealth > 0 || detectedRent > 0) && (
                        <span className="text-[9px] font-black text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-full uppercase">
                          Pronto
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                      Puxa seu saldo investido atual para a entrada e o aluguel real detectado nas suas contas.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSyncRealData}
                  className="self-start sm:self-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Sparkles size={14} />
                  <span>Sincronizar Dados</span>
                </button>
              </div>
            )}

            {syncNotice && (
              <div className="mb-6 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2 animate-in fade-in duration-300">
                <CheckCircle2 size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{syncNotice}</span>
              </div>
            )}

            {/* Grid de Inputs Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              
              {/* Valor do Imóvel */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                  Valor de Compra do Imóvel
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="500.000,00"
                    value={formatMoneyInputDisplay(propertyValue)}
                    onChange={(e) => setPropertyValue(parseMoneyInput(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Aluguel Mensal Equivalente */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                  Aluguel Mensal Equivalente
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="2.500,00"
                    value={formatMoneyInputDisplay(rentValue)}
                    onChange={(e) => setRentValue(parseMoneyInput(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Valor da Entrada */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                  Valor da Entrada Disponível
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="100.000,00"
                    value={formatMoneyInputDisplay(downPayment)}
                    onChange={(e) => setDownPayment(parseMoneyInput(e.target.value))}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:outline-none transition-all text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Linha 2: Prazo e Sistema de Amortização */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              
              {/* Prazo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Prazo do Financiamento
                  </label>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{periodYears} anos ({Number(periodYears) * 12} meses)</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-bold text-sm">
                    <Calendar size={16} />
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="35"
                    value={periodYears}
                    onChange={(e) => setPeriodYears(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-slate-800 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div className="flex gap-1.5 pt-1">
                  {['10', '15', '20', '30', '35'].map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setPeriodYears(yr)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                        periodYears === yr ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {yr} anos
                    </button>
                  ))}
                </div>
              </div>

              {/* Sistema de Amortização (SAC vs PRICE) */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                  Tabela de Financiamento
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setAmortizationSystem('SAC')}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      amortizationSystem === 'SAC'
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    SAC (Decrescente)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAmortizationSystem('PRICE')}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs transition-all cursor-pointer ${
                      amortizationSystem === 'PRICE'
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    PRICE (Parcelas Fixas)
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {amortizationSystem === 'SAC'
                    ? 'A mais comum no Brasil: parcelas iniciam mais altas e caem a cada mês.'
                    : 'Parcelas iguais do começo ao fim (mais juros pagos no total acumulado).'}
                </p>
              </div>
            </div>

            {/* Custos Ocultos e Encargos da Compra */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Custos de Entrada e Manutenção do Imóvel
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* ITBI / ITIV */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800 dark:text-slate-100">
                      <input
                        type="checkbox"
                        checked={includeItiv}
                        onChange={(e) => setIncludeItiv(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>ITBI / ITIV ({itivRate}%)</span>
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Imposto municipal obrigatório</p>
                  </div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {includeItiv ? formatCurrency((Number(propertyValue) || 0) * (itivRate / 100)) : 'R$ 0'}
                  </span>
                </div>

                {/* Cartório */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800 dark:text-slate-100">
                      <input
                        type="checkbox"
                        checked={includeNotary}
                        onChange={(e) => setIncludeNotary(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Cartório ({notaryRate}%)</span>
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Escritura e registro do imóvel</p>
                  </div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {includeNotary ? formatCurrency((Number(propertyValue) || 0) * (notaryRate / 100)) : 'R$ 0'}
                  </span>
                </div>

                {/* Manutenção Anual do Dono */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-800 dark:text-slate-100">
                      <input
                        type="checkbox"
                        checked={includeMaintenance}
                        onChange={(e) => setIncludeMaintenance(e.target.checked)}
                        className="rounded text-blue-600"
                      />
                      <span>Manutenção ({maintenanceRate}% a.a.)</span>
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Reformas e desgaste predial</p>
                  </div>
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                    {includeMaintenance ? `${formatCurrency(((Number(propertyValue) || 0) * (maintenanceRate / 100)) / 12)}/mês` : 'R$ 0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Alternador de Premissas Avançadas */}
            <div className="mt-5 pt-3">
              <button
                type="button"
                onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer"
              >
                <span>{isAdvancedMode ? 'Ocultar Premissas de Mercado ↑' : 'Ajustar Premissas de Mercado (Selic, Aluguel e Investimentos) ↓'}</span>
              </button>

              {isAdvancedMode && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Rendimento de Investimentos */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                        Rendimento dos Investimentos (% a.a.)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={investmentRate}
                        onChange={(e) => setInvestmentRate(Number(e.target.value))}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                      />
                      <p className="text-[9px] text-slate-400 dark:text-slate-500">Rentabilidade da carteira do inquilino</p>
                    </div>

                    {/* Valorização do Imóvel */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                        Valorização do Imóvel (% a.a.)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={propertyAppreciation}
                        onChange={(e) => setPropertyAppreciation(Number(e.target.value))}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                      />
                      <p className="text-[9px] text-slate-400 dark:text-slate-500">Aumento patrimonial do imóvel no tempo</p>
                    </div>

                    {/* Reajuste do Aluguel */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                        Reajuste Anual do Aluguel (% a.a.)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={rentReadjustment}
                        onChange={(e) => setRentReadjustment(Number(e.target.value))}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white"
                      />
                      <p className="text-[9px] text-slate-400 dark:text-slate-500">Inflação anual de locação (IPCA/IGP-M)</p>
                    </div>
                  </div>

                  {/* Consulta Selic / Financiamento */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 dark:text-white">Taxa de Financiamento Imobiliário: </span>
                      <strong className="text-blue-700 dark:text-blue-400 font-black">{formatPercent(derivedFinancingRate)} a.a.</strong>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] ml-1">
                        {useCurrentSelic ? `(Selic ${Number.isFinite(selicCurrent) ? formatPercent(selicCurrent as number) : '10.75%'} + spread de ${bankSpread}%)` : '(manual)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">Spread:</label>
                      <input
                        type="number"
                        step="0.1"
                        value={bankSpread}
                        onChange={(e) => setBankSpread(Number(e.target.value))}
                        className="w-16 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-white text-center"
                      />
                      <span className="text-slate-400 dark:text-slate-500">%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bloco de Resultados */}
        {simulationResults && (
          <div ref={resultRef} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Hero Card do Veredito Soberano */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              
              {/* Card Principal */}
              <div
                className={`lg:col-span-8 p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col justify-between ${
                  simulationResults.winner === 'rent'
                    ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 border-emerald-200 dark:border-emerald-800'
                    : 'bg-gradient-to-br from-indigo-50 via-blue-50 to-white dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-slate-900 border-indigo-200 dark:border-indigo-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                      Veredito em {periodYears} anos • Tabela {amortizationSystem}
                    </span>
                    {simulationResults.breakevenYear && (
                      <span className="text-[10px] font-black text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 rounded-full uppercase">
                        Equilíbrio no {simulationResults.breakevenYear}º ano
                      </span>
                    )}
                  </div>

                  <p className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight">
                    Neste cenário,{' '}
                    <span className={simulationResults.winner === 'rent' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}>
                      {winnerLabel}
                    </span>{' '}
                    deixa você com mais patrimônio no final.
                  </p>

                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                    Em <strong>{periodYears} anos</strong>, a diferença líquida estimada a favor de{' '}
                    <strong className="text-slate-900 dark:text-white">{winnerLabel}</strong> é de{' '}
                    <strong className="text-slate-900 dark:text-white">{formatCurrency(simulationResults.differenceAmount)}</strong>.
                  </p>
                </div>

                {/* Detalhe do Ponto de Equilíbrio (Breakeven) */}
                <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 p-4 rounded-2xl">
                  {simulationResults.breakevenYear ? (
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                      ⚖️ <strong>Ponto de Equilíbrio:</strong> Até o <strong>{simulationResults.breakevenYear}º ano</strong>, a outra opção era mais vantajosa. Se você não pretende morar no mesmo imóvel por mais de {simulationResults.breakevenYear} anos, considere isso com atenção na sua decisão.
                    </p>
                  ) : (
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                      ⚖️ <strong>Trajetória Consistente:</strong> A opção de <strong>{winnerLabel}</strong> mantém a liderança patrimonial do primeiro ao último ano da simulação.
                    </p>
                  )}
                </div>
              </div>

              {/* Cards Laterais de Comparação e Ação */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                
                {/* Decomposição do Patrimônio Final */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between">
                  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Patrimônio Estimado no Final
                  </p>
                  
                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Se Alugar e Investir</p>
                        <p className="text-lg font-black text-emerald-800 dark:text-emerald-300">{formatCurrency(simulationResults.rentFinal)}</p>
                      </div>
                      <span className="text-xl">📈</span>
                    </div>

                    <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">Se Comprar e Financiar</p>
                        <p className="text-lg font-black text-indigo-800 dark:text-indigo-300">{formatCurrency(simulationResults.buyFinal)}</p>
                      </div>
                      <span className="text-xl">🏠</span>
                    </div>
                  </div>

                  {/* Botão de Criação de Meta */}
                  <button
                    type="button"
                    onClick={handleSaveGoal}
                    className="mt-4 w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-black rounded-xl transition-all shadow-md border border-transparent dark:border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <Target size={14} className="text-emerald-400" />
                    <span>Salvar Como Meta no Painel</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Abas: Gráfico de Evolução, Tabela Cronológica e Fundamentos */}
            <div>
              <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('chart')}
                  className={`px-5 py-3 text-sm font-black flex items-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'chart'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-500'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <BarChart3 size={16} /> Gráfico de Evolução
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('table')}
                  className={`px-5 py-3 text-sm font-black flex items-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'table'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-500'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <TableIcon size={16} /> Tabela de Marcos Temporais
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('learn')}
                  className={`px-5 py-3 text-sm font-black flex items-center gap-2 transition-colors cursor-pointer ${
                    activeTab === 'learn'
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-500'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <BookOpen size={16} /> Fundamentos da Decisão
                </button>
              </div>

              {/* Aba 1: Gráfico */}
              {activeTab === 'chart' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-base font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Scale className="text-blue-600 dark:text-blue-400" size={18} />
                    Crescimento do Patrimônio Líquido no Tempo
                  </h3>

                  <div className="h-80 w-full">
                    <ResponsiveContainer>
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorBuy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" strokeOpacity={0.2} />
                        <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v) => fmtCompactMoney(v)} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                          formatter={(val: any) => [formatCurrency(val), '']}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          name="Alugando (Investindo a Diferença)"
                          dataKey="Alugando (Investindo a Diferença)"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fill="url(#colorRent)"
                        />
                        <Area
                          type="monotone"
                          name="Comprando (Imóvel - Dívida)"
                          dataKey="Comprando (Imóvel - Dívida)"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          fill="url(#colorBuy)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 text-center">
                    * A linha verde representa o montante líquido investido; a roxa representa o valor do imóvel deduzido da dívida restante.
                  </p>
                </div>
              )}

              {/* Aba 2: Tabela de Marcos Temporais */}
              {activeTab === 'table' && (
                <RentVsFinanceTimeline
                  timeline={simulationResults.timeline}
                />
              )}

              {/* Aba 3: Fundamentos e Educação */}
              {activeTab === 'learn' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
                  <div>
                    <h3 className="text-base font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                      <Info size={18} className="text-blue-600 dark:text-blue-400" />
                      A Ilusão do "Aluguel é Dinheiro Jogado Fora"
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                      Dizer que morar de aluguel é jogar dinheiro fora é uma falácia comum. No financiamento imobiliário brasileiro, nos primeiros 10 a 15 anos a maior fatia de cada parcela vai exclusivamente para o pagamento de <strong>juros bancários</strong>, e não para amortizar a dívida. Juros bancários também são dinheiro que não volta.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-slate-800 dark:text-white mb-1">1. Custo de Oportunidade</h4>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        A entrada (ex: R$ 100.000) e os custos de cartório/ITBI (R$ 25.000) deixam de render juros compostos. Quem aluga preserva esse capital investido desde o primeiro dia.
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-slate-800 dark:text-white mb-1">2. Custos do Proprietário</h4>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Manutenção estrutural, reformas prediais e despesas extraordinárias de condomínio recaem sobre o proprietário, reduzindo o rendimento real do imóvel.
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <h4 className="font-bold text-slate-800 dark:text-white mb-1">3. Flexibilidade Geográfica</h4>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Mudar de cidade, adaptar o tamanho da casa conforme os filhos crescem ou aproveitar oportunidades de carreira é muito mais ágil e barato para quem aluga.
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
