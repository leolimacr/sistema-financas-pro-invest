import React, { useState, useMemo, useEffect } from 'react';
import { ToolLayout, Input } from './ToolComponents';
import { TableHorizontalScrollWrapper } from './common/TableHorizontalScrollWrapper';
import {
  Zap,
  TrendingUp,
  Target,
  Wallet,
  Sparkles,
  Coins,
  Calendar,
  Building2,
  Landmark,
  Layers,
  Award,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Lock,
  ChevronRight,
  Clock,
  CircleDollarSign,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useAuth } from '../../contexts/AuthContext';
import { useWealthData } from '../../hooks/useWealthData';
import { useTransactions } from '../../hooks/useTransactions';

type SimMode = 'snowball' | 'target';
type ActiveTab = 'chart' | 'table' | 'milestones' | 'fundamentals';

// ─── Formatadores ─────────────────────────────────────────────────────────────

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

const fmtCompactMoney = (value: number) => {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(0)}k`;
  }
  return `R$ ${value.toFixed(0)}`;
};

export const DividendsTool = ({ onNavigate, onCalcUpdate, isAuthenticated: isAuthProp }: any) => {
  const { user } = useAuth();
  const isAuthenticated = isAuthProp || !!user;

  // Sincronização de dados do ecossistema
  const { totalInvestments, patrimonioLiquido } = useWealthData();
  const { transactions = [] } = useTransactions();

  // Modo de simulação: 'snowball' (Acumulação com Reinvestimento) ou 'target' (Meta de Salário Passivo)
  const [mode, setMode] = useState<SimMode>('snowball');
  const [activeTab, setActiveTab] = useState<ActiveTab>('chart');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Parâmetros Modo Acumulação / Bola de Neve
  const [initialCapital, setInitialCapital] = useState<number | ''>(50000);
  const [monthlyContribution, setMonthlyContribution] = useState<number | ''>(1000);
  const [periodYears, setPeriodYears] = useState<string>('15');
  const [dividendYield, setDividendYield] = useState<number | ''>(8.5);
  const [reinvestDividends, setReinvestDividends] = useState<boolean>(true);
  const [assetAppreciation, setAssetAppreciation] = useState<number | ''>(3.0);

  // Parâmetros Modo Meta de Renda
  const [desiredIncome, setDesiredIncome] = useState<number | ''>(5000);

  // Sincronização inteligente com dados reais
  const handleSyncUserData = () => {
    let synced = false;
    const currentInvested = Number(totalInvestments || patrimonioLiquido || 0);

    if (currentInvested > 0) {
      setInitialCapital(currentInvested);
      synced = true;
    }

    // Calcula despesas mensais médias recentes para preencher a meta de renda
    if (transactions.length > 0) {
      const expenses = transactions.filter((t: any) => t.tipo === 'despesa' && t.valor > 0);
      if (expenses.length > 0) {
        const totalExpenses = expenses.reduce((acc: number, t: any) => acc + Number(t.valor), 0);
        const avgExpense = Math.round(totalExpenses / Math.min(expenses.length, 3));
        if (avgExpense >= 1000) {
          setDesiredIncome(avgExpense);
          synced = true;
        }
      }
    }

    if (synced) {
      setSyncNotice('Dados reais de patrimônio e orçamento sincronizados com sucesso!');
      setTimeout(() => setSyncNotice(null), 4000);
    } else {
      setSyncNotice('Nenhum dado financeiro consolidado encontrado. Preencha os campos para simular.');
      setTimeout(() => setSyncNotice(null), 4000);
    }
  };

  // Presets rápidos de Dividend Yield do Mercado Brasileiro
  const handleApplyPreset = (yieldValue: number) => {
    setDividendYield(yieldValue);
  };

  // Motor de Projeção da Bola de Neve (Mês a Mês / Ano a Ano)
  const projection = useMemo(() => {
    const pInit = Number(initialCapital) || 0;
    const pContribution = Number(monthlyContribution) || 0;
    const years = Math.min(Math.max(parseInt(periodYears, 10) || 10, 1), 35);
    const dyAnnual = Number(dividendYield) || 0;
    const appAnnual = Number(assetAppreciation) || 0;

    const monthlyYield = (dyAnnual / 100) / 12;
    const monthlyApp = (appAnnual / 100) / 12;
    const totalMonths = years * 12;

    let balanceWithReinvest = pInit;
    let balanceWithoutReinvest = pInit;
    let totalDividendsReinvested = 0;
    let totalDividendsWithdrawn = 0;
    let totalInvestedFromPocket = pInit;

    let magicNumberMonth: number | null = null;

    const yearlyData = [];
    const chartPoints = [];

    // Ponto inicial Ano 0
    chartPoints.push({
      yearLabel: 'Início',
      year: 0,
      monthlyIncomeWithReinvest: Math.round((pInit * (dyAnnual / 100)) / 12),
      monthlyIncomeWithoutReinvest: Math.round((pInit * (dyAnnual / 100)) / 12),
      balanceWithReinvest: Math.round(pInit),
      balanceWithoutReinvest: Math.round(pInit),
    });

    for (let m = 1; m <= totalMonths; m += 1) {
      totalInvestedFromPocket += pContribution;

      // 1. Cenário COM Reinvestimento (Bola de Neve)
      const divWith = balanceWithReinvest * monthlyYield;
      totalDividendsReinvested += divWith;

      if (!magicNumberMonth && pContribution > 0 && divWith >= pContribution) {
        magicNumberMonth = m;
      }

      if (reinvestDividends) {
        balanceWithReinvest = (balanceWithReinvest + divWith + pContribution) * (1 + monthlyApp);
      } else {
        balanceWithReinvest = (balanceWithReinvest + pContribution) * (1 + monthlyApp);
      }

      // 2. Cenário SEM Reinvestimento (Apenas aportes do bolso)
      const divWithout = balanceWithoutReinvest * monthlyYield;
      totalDividendsWithdrawn += divWithout;
      balanceWithoutReinvest = (balanceWithoutReinvest + pContribution) * (1 + monthlyApp);

      // Marcos anuais
      if (m % 12 === 0) {
        const currentYear = m / 12;
        const currentMonthlyIncome = (balanceWithReinvest * (dyAnnual / 100)) / 12;
        const linearMonthlyIncome = (balanceWithoutReinvest * (dyAnnual / 100)) / 12;

        yearlyData.push({
          year: currentYear,
          investedFromPocket: Math.round(totalInvestedFromPocket),
          balance: Math.round(balanceWithReinvest),
          balanceWithout: Math.round(balanceWithoutReinvest),
          annualIncome: Math.round(balanceWithReinvest * (dyAnnual / 100)),
          monthlyIncome: Math.round(currentMonthlyIncome),
          linearMonthlyIncome: Math.round(linearMonthlyIncome),
          dividendsGeneratedInYear: Math.round(balanceWithReinvest * (dyAnnual / 100)),
        });

        chartPoints.push({
          yearLabel: `Ano ${currentYear}`,
          year: currentYear,
          monthlyIncomeWithReinvest: Math.round(currentMonthlyIncome),
          monthlyIncomeWithoutReinvest: Math.round(linearMonthlyIncome),
          balanceWithReinvest: Math.round(balanceWithReinvest),
          balanceWithoutReinvest: Math.round(balanceWithoutReinvest),
        });
      }
    }

    const finalMonthlyIncome = (balanceWithReinvest * (dyAnnual / 100)) / 12;
    const finalAnnualIncome = balanceWithReinvest * (dyAnnual / 100);
    const linearFinalMonthlyIncome = (balanceWithoutReinvest * (dyAnnual / 100)) / 12;

    return {
      years,
      finalBalance: balanceWithReinvest,
      finalBalanceWithout: balanceWithoutReinvest,
      totalInvestedFromPocket,
      totalDividendsReinvested,
      finalMonthlyIncome,
      finalAnnualIncome,
      linearFinalMonthlyIncome,
      magicNumberMonth,
      yearlyData,
      chartPoints,
    };
  }, [initialCapital, monthlyContribution, periodYears, dividendYield, reinvestDividends, assetAppreciation]);

  // Cálculos Modo Meta de Renda
  const targetResult = useMemo(() => {
    const desired = Number(desiredIncome) || 0;
    const dy = Number(dividendYield) || 0;
    const contribution = Number(monthlyContribution) || 0;
    if (desired <= 0 || dy <= 0) return null;

    const annualNeeded = desired * 12;
    const requiredCapital = annualNeeded / (dy / 100);
    const dailyIncome = desired / 30;

    // Estimativa de quantos anos e meses para atingir a meta
    let monthsToTarget: number | null = null;
    if (contribution > 0 || Number(initialCapital) > 0) {
      let b = Number(initialCapital) || 0;
      const mYield = (dy / 100) / 12;
      for (let m = 1; m <= 600; m += 1) {
        const div = b * mYield;
        b = b + div + contribution;
        if (b >= requiredCapital) {
          monthsToTarget = m;
          break;
        }
      }
    }

    return {
      desired,
      annualNeeded,
      requiredCapital,
      dailyIncome,
      monthsToTarget,
    };
  }, [desiredIncome, dividendYield, monthlyContribution, initialCapital]);

  // Marcos de Cobertura de Custo de Vida
  const currentMonthlyReference = mode === 'snowball' ? projection.finalMonthlyIncome : (Number(desiredIncome) || 0);
  const milestones = [
    { label: 'Contas Básicas (Energia e Água)', value: 250, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Supermercado Essencial', value: 1000, icon: Coins, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Moradia e Aluguel', value: 2500, icon: Building2, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Semi-Aposentadoria / Conforto', value: 5000, icon: Award, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Independência Financeira Plena', value: 10000, icon: Landmark, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  // Disparo para o callback onCalcUpdate se presente
  useEffect(() => {
    if (!onCalcUpdate) return;
    if (mode === 'snowball') {
      onCalcUpdate({
        type: 'DIVIDENDOS',
        label: 'Simulador de Dividendos',
        details: `Renda projetada: ${formatCurrency(projection.finalMonthlyIncome)}/mês em ${projection.years} anos.`,
      });
    } else if (targetResult) {
      onCalcUpdate({
        type: 'DIVIDENDOS',
        label: 'Simulador de Dividendos',
        details: `Patrimônio necessário: ${formatCurrency(targetResult.requiredCapital)} para ${formatCurrency(targetResult.desired)}/mês.`,
      });
    }
  }, [mode, projection.finalMonthlyIncome, projection.years, targetResult, onCalcUpdate]);

  // Ação de Salvar como Meta
  const handleSaveAsGoal = () => {
    const metaNome = encodeURIComponent(
      mode === 'snowball'
        ? `Renda Passiva ${formatCurrency(projection.finalMonthlyIncome)}/mês`
        : `Meta de Viver de Renda ${formatCurrency(targetResult?.desired || 0)}/mês`
    );
    const metaValorAlvo = encodeURIComponent(
      mode === 'snowball' ? String(Math.round(projection.finalBalance)) : String(Math.round(targetResult?.requiredCapital || 0))
    );
    const aporteMensal = encodeURIComponent(String(monthlyContribution || 0));

    onNavigate(`metas?action=new&nome=${metaNome}&valor=${aporteMensal}&metaAlvo=${metaValorAlvo}`);
  };

  return (
    <ToolLayout
      title="Simulador de Dividendos"
      icon="🪙"
      onBack={onNavigate}
      description="Projete o crescimento exponencial da sua renda passiva com o poder do reinvestimento de proventos e do efeito bola de neve."
    >
      <div className="space-y-8">
        {/* Banner de Feedback de Sincronização */}
        {syncNotice && (
          <div
            data-testid="sync-notice"
            className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold animate-fadeIn"
          >
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Barra Superior de Sincronização e Alternância de Modo */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-4 sm:p-5 shadow-sm">
          {/* Seletor de Modo */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl inline-flex self-center sm:self-auto shadow-inner">
            <button
              type="button"
              onClick={() => setMode('snowball')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                mode === 'snowball'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles size={16} /> Efeito Bola de Neve
            </button>
            <button
              type="button"
              onClick={() => setMode('target')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                mode === 'target'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Target size={16} /> Meta de Salário Passivo
            </button>
          </div>

          {/* Botão de Sincronização com o Ecossistema */}
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleSyncUserData}
              className="px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
            >
              <Zap size={15} className="text-emerald-600 dark:text-emerald-400" /> Usar Meus Dados Reais
            </button>
          )}
        </div>

        {/* Card Principal de Formulário */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet size={18} className="text-emerald-600 dark:text-emerald-400" /> Parâmetros da Carteira de Proventos
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {mode === 'snowball'
                  ? 'Informe quanto você tem, quanto aporta e veja o crescimento dos dividendos ao longo do tempo.'
                  : 'Informe a renda mensal que você quer receber para calcular o patrimônio semente necessário.'}
              </p>
            </div>

            {/* Presets Rápidos de Yield */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 sm:pt-0">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mr-1">Presets de Mercado:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset(9.5)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  dividendYield === 9.5 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                FIIs (9,5% a.a.)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(7.5)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  dividendYield === 7.5 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Ações (7,5% a.a.)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset(8.5)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  dividendYield === 8.5 ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Mista (8,5% a.a.)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {mode === 'snowball' ? (
              <>
                <Input
                  label="Patrimônio Inicial"
                  value={initialCapital}
                  onChange={setInitialCapital}
                  prefix="R$"
                  placeholder="Ex: 50000"
                  help="Capital que você já possui investido."
                />

                <Input
                  label="Aporte Mensal do Bolso"
                  value={monthlyContribution}
                  onChange={setMonthlyContribution}
                  prefix="R$"
                  placeholder="Ex: 1000"
                  help="Quanto você poupa do seu salário todo mês."
                />

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5">Horizonte de Tempo</label>
                  <select
                    value={periodYears}
                    onChange={(e) => setPeriodYears(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                  >
                    <option value="5">5 anos (Curto Prazo)</option>
                    <option value="10">10 anos (Médio Prazo)</option>
                    <option value="15">15 anos (Construção Consistente)</option>
                    <option value="20">20 anos (Previdência Privada)</option>
                    <option value="25">25 anos (Independência Sólida)</option>
                    <option value="30">30 anos (Patrimônio Multigeracional)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Tempo de maturação da carteira.</span>
                </div>

                <Input
                  label="Dividend Yield Médio Anual"
                  value={dividendYield}
                  onChange={setDividendYield}
                  prefix="%"
                  placeholder="Ex: 8.5"
                  help="Taxa anual média esperada de proventos."
                />
              </>
            ) : (
              <>
                <Input
                  label="Renda Mensal Desejada"
                  value={desiredIncome}
                  onChange={setDesiredIncome}
                  prefix="R$"
                  placeholder="Ex: 5000"
                  help="Quanto você quer receber limpo por mês."
                />

                <Input
                  label="Dividend Yield Médio Anual"
                  value={dividendYield}
                  onChange={setDividendYield}
                  prefix="%"
                  placeholder="Ex: 8.5"
                  help="Taxa de retorno anual em dividendos."
                />

                <Input
                  label="Aporte Mensal Previsto"
                  value={monthlyContribution}
                  onChange={setMonthlyContribution}
                  prefix="R$"
                  placeholder="Ex: 1500"
                  help="Para estimar quantos anos até alcançar a meta."
                />

                <Input
                  label="Patrimônio Inicial Já Acumulado"
                  value={initialCapital}
                  onChange={setInitialCapital}
                  prefix="R$"
                  placeholder="Ex: 20000"
                  help="Ponto de partida do seu patrimônio."
                />
              </>
            )}
          </div>

          {/* Toggle de Reinvestimento de Dividendos (A Chave da Bola de Neve) */}
          {mode === 'snowball' && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReinvestDividends(!reinvestDividends)}
                  className={`w-12 h-7 rounded-full transition-colors relative p-1 focus:outline-none ${
                    reinvestDividends ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      reinvestDividends ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Reinvestir 100% dos Dividendos Recebidos
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {reinvestDividends
                      ? 'Ativado: os proventos compram mais cotas que geram mais proventos (efeito exponencial).'
                      : 'Desativado: os dividendos são sacados e apenas os aportes do bolso acumulam.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 max-w-[200px]">
                <Input
                  label="Valorização das Cotas (% a.a.)"
                  value={assetAppreciation}
                  onChange={setAssetAppreciation}
                  prefix="%"
                  placeholder="Ex: 3"
                  help="Proteção inflacionária dos ativos."
                />
              </div>
            </div>
          )}
        </div>

        {/* Card Heroico de Resultado */}
        {mode === 'snowball' ? (
          <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 text-white rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
              <Coins size={240} />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-emerald-100 text-xs font-black tracking-wider uppercase backdrop-blur-sm">
                <Sparkles size={14} /> Salário Vitalício Projetado
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-200 mb-1">
                    Renda Passiva Mensal em {projection.years} Anos
                  </p>
                  <p className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    {formatCurrency(projection.finalMonthlyIncome)}
                    <span className="text-sm font-semibold text-emerald-200"> /mês</span>
                  </p>
                  <p className="text-xs text-emerald-100/80 mt-1">
                    Equivale a {formatCurrency(projection.finalAnnualIncome)} por ano sem trabalhar.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-200 mb-1">
                    Patrimônio Gerador Acumulado
                  </p>
                  <p className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {formatCurrency(projection.finalBalance)}
                  </p>
                  <p className="text-xs text-emerald-100/80 mt-1">
                    Você investiu {formatCurrency(projection.totalInvestedFromPocket)} do próprio bolso.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-200 mb-1">
                    {projection.magicNumberMonth
                      ? 'Ponto de Inflexão (Magic Number)'
                      : 'Multiplicador dos Dividendos'}
                  </p>
                  <p className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-300">
                    {projection.magicNumberMonth
                      ? `Ano ${Math.ceil(projection.magicNumberMonth / 12)} (Mês ${projection.magicNumberMonth})`
                      : `${((projection.finalBalance / Math.max(projection.totalInvestedFromPocket, 1))).toFixed(1)}x o valor investido`}
                  </p>
                  <p className="text-xs text-emerald-100/80 mt-1">
                    {projection.magicNumberMonth
                      ? 'Momento em que os proventos mensais superam seu aporte do bolso!'
                      : 'O crescimento composto supera com folga seus aportes nominais.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveAsGoal}
                  className="px-5 py-3 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                >
                  <Target size={16} /> Salvar como Meta de Renda Passiva
                </button>
              </div>
            </div>
          </div>
        ) : targetResult ? (
          <div className="bg-gradient-to-br from-indigo-600 via-blue-700 to-slate-900 text-white rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-indigo-100 text-xs font-black tracking-wider uppercase backdrop-blur-sm">
                <Target size={14} /> Meta de Viver de Renda
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-200 mb-1">
                    Patrimônio Necessário
                  </p>
                  <p className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                    {formatCurrency(targetResult.requiredCapital)}
                  </p>
                  <p className="text-xs text-indigo-100/80 mt-1">
                    Para gerar {formatCurrency(targetResult.desired)}/mês a {dividendYield}% a.a.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-200 mb-1">
                    Renda Média Diária
                  </p>
                  <p className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {formatCurrency(targetResult.dailyIncome)}
                    <span className="text-sm font-semibold text-indigo-200"> /dia</span>
                  </p>
                  <p className="text-xs text-indigo-100/80 mt-1">
                    Totalizando {formatCurrency(targetResult.annualNeeded)} ao ano.
                  </p>
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-200 mb-1">
                    Tempo Estimado com Aportes
                  </p>
                  <p className="text-2xl sm:text-3xl font-black tracking-tight text-indigo-300">
                    {targetResult.monthsToTarget
                      ? `${Math.floor(targetResult.monthsToTarget / 12)} anos e ${targetResult.monthsToTarget % 12} meses`
                      : 'Defina aporte mensal'}
                  </p>
                  <p className="text-xs text-indigo-100/80 mt-1">
                    Considerando o reinvestimento integral dos proventos até atingir o alvo.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSaveAsGoal}
                  className="px-5 py-3 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                >
                  <Target size={16} /> Salvar como Meta de Acumulação
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Abas de Aprofundamento */}
        <div className="space-y-6">
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('chart')}
              className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'chart'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <TrendingUp size={16} /> Gráfico da Bola de Neve
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'table'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Layers size={16} /> Tabela Cronológica Ano a Ano
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('milestones')}
              className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'milestones'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Award size={16} /> Marcos de Cobertura de Vida
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fundamentals')}
              className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                activeTab === 'fundamentals'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <BookOpen size={16} /> Estratégia Previdenciária
            </button>
          </div>

          {/* ABA 1: Gráfico Recharts */}
          {activeTab === 'chart' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Evolução da Renda Passiva Mensal (R$/mês)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Compare o efeito exponencial de reinvestir proventos vs. depender apenas de aportes do próprio bolso.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Com Reinvestimento (Bola de Neve)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 inline-block" /> Sem Reinvestimento
                  </span>
                </div>
              </div>

              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={projection.chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradWith" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="gradWithout" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.3} />
                    <XAxis dataKey="yearLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={fmtCompactMoney} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        fmtMoneyExact(Number(value)) + '/mês',
                        name === 'monthlyIncomeWithReinvest' ? 'Renda Com Reinvestimento' : 'Renda Sem Reinvestimento',
                      ]}
                      labelFormatter={(label) => `Período: ${label}`}
                      contentStyle={{ borderRadius: '1rem', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="monthlyIncomeWithoutReinvest" stroke="#94a3b8" strokeWidth={2} fill="url(#gradWithout)" />
                    <Area type="monotone" dataKey="monthlyIncomeWithReinvest" stroke="#10b981" strokeWidth={2.5} fill="url(#gradWith)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3">
                <Sparkles size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  <strong>O Efeito Bola de Neve:</strong> No início, a maior parte do crescimento vem do seu aporte do trabalho. Conforme o tempo passa, os dividendos se tornam uma força maior que seu próprio salário, reinvestindo-se sozinhos e acelerando a liberdade financeira.
                </p>
              </div>
            </div>
          )}

          {/* ABA 2: Tabela Cronológica Ano a Ano */}
          {activeTab === 'table' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-4">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Cronograma de Crescimento da Renda Passiva
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Acompanhe ano a ano o patrimônio total e a renda mensal pingando na conta.
                </p>
              </div>

              <TableHorizontalScrollWrapper className="rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="py-3.5 px-4">Ano</th>
                      <th className="py-3.5 px-4">Aportes do Bolso</th>
                      <th className="py-3.5 px-4">Patrimônio Acumulado</th>
                      <th className="py-3.5 px-4">Renda Mensal</th>
                      <th className="py-3.5 px-4">Proventos no Ano</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {projection.yearlyData.map((row) => (
                      <tr key={row.year} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">Ano {row.year}</td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{formatCurrency(row.investedFromPocket)}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{formatCurrency(row.balance)}</td>
                        <td className="py-3.5 px-4 font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/30">{formatCurrency(row.monthlyIncome)}/mês</td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{formatCurrency(row.annualIncome)}/ano</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableHorizontalScrollWrapper>
            </div>
          )}

          {/* ABA 3: Marcos de Cobertura de Custo de Vida */}
          {activeTab === 'milestones' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Régua de Conquistas de Renda Passiva
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cada novo patamar de dividendos liberta você de uma obrigação da sua vida real.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {milestones.map((m) => {
                  const Icon = m.icon;
                  const isAchieved = currentMonthlyReference >= m.value;
                  const percent = Math.min(Math.round((currentMonthlyReference / m.value) * 100), 100);

                  return (
                    <div
                      key={m.label}
                      className={`p-5 rounded-2xl border transition-all ${
                        isAchieved
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20 dark:ring-emerald-500/30 shadow-sm'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2.5 rounded-xl ${m.bg} ${m.color}`}>
                          <Icon size={18} />
                        </div>
                        {isAchieved ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                            ✓ Conquistado
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{percent}% alcançado</span>
                        )}
                      </div>

                      <h5 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{m.label}</h5>
                      <p className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(m.value)}/mês</p>

                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${isAchieved ? 'bg-emerald-600' : 'bg-slate-400 dark:bg-slate-600'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ABA 4: Fundamentos e Metodologia Previdenciária */}
          {activeTab === 'fundamentals' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm space-y-3">
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 w-fit">
                  <Coins size={20} />
                </div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                  O Método Barsi de Previdência
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Foque na <strong>quantidade de ações/cotas</strong> geradoras de renda, não apenas na oscilação diária do preço. Quando o mercado cai, os mesmos dividendos compram ainda mais cotas com desconto, acelerando sua bola de neve.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm space-y-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 w-fit">
                  <Building2 size={20} />
                </div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                  Fundos Imobiliários (FIIs)
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  No Brasil, os proventos de FIIs são <strong>isentos de Imposto de Renda para pessoa física</strong> e pagos mensalmente. Funcionam como aluguéis de shopping centers, galpões logísticos e lajes corporativas sem a dor de cabeça da vacância individual.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm space-y-3">
                <div className="p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 w-fit">
                  <ShieldCheck size={20} />
                </div>
                <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                  Segurança e Diversificação
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Nunca dependa de uma única empresa ou setor. Uma carteira soberana de renda passiva equilibra empresas perenes (energia, bancos, saneamento), Fundos Imobiliários de tijolo e títulos públicos com cupons semestrais.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Gate Convidativo para Usuários Deslogados */}
        {!isAuthenticated && (
          <div className="border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 rounded-[2rem] p-8 text-center shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
              <Lock size={24} />
            </div>

            <h3 className="text-slate-900 dark:text-white text-xl font-black tracking-tight mb-2">
              Transforme sua Simulação em Realidade Financeira
            </h3>

            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto leading-relaxed mb-6">
              Crie sua conta gratuita para conectar sua carteira de investimentos real, acompanhar o pagamento mensal dos seus dividendos e proteger seu Saldo Livre Real.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="flex-1 py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
              >
                Criar Conta Grátis <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="flex-1 py-3.5 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider border border-slate-200 dark:border-slate-700 transition-all"
              >
                Entrar
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default DividendsTool;
