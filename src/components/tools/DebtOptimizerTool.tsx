import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ToolLayout, Input } from './ToolComponents';
import {
  Lock,
  ArrowRight,
  CalendarClock,
  Receipt,
  TrendingDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Target,
  Sparkles,
  BookOpen,
  Layers,
  BarChart3,
  Clock,
  Coins,
  ChevronRight,
  Calculator,
  ShieldAlert,
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
import {
  buildSacSchedule,
  buildPriceSchedule,
  buildRotativeSchedule,
  ScheduleRow,
} from '../../services/debt/debt.math';
import { useAuth } from '../../contexts/AuthContext';
import { useDebts } from '../../hooks/useDebts';
import type { DebtItem } from '../../services/debt/debt.types';
import { DebtScenarioChart } from './debt/DebtScenarioChart';
import { DebtScheduleTable, type TableViewMode } from './debt/DebtScheduleTable';

type DebtSystem = 'sac' | 'price' | 'rotativo';

type InputMode =
  | 'payment'
  | 'rate-term'
  | 'installments-payment'
  | 'guided';
// ─── Formatadores ─────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);

const fmtMoneyExact = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);


// ─── Funções Auxiliares de Cálculo de Taxa ─────────────────────────────────────

const calculatePricePayment = (
  principal: number,
  rateDecimal: number,
  months: number
) =>
  rateDecimal === 0
    ? principal / months
    : principal * ((rateDecimal * Math.pow(1 + rateDecimal, months)) / (Math.pow(1 + rateDecimal, months) - 1));

const inferSacRateFromPayment = (
  principal: number,
  payment: number,
  months: number
): number | null => {
  if (principal <= 0 || payment <= 0 || months <= 0) return null;
  const amortization = principal / months;
  if (payment < amortization) return null;
  return Math.max(((payment - amortization) / principal) * 100, 0);
};

const inferPriceRateFromPayment = (
  principal: number,
  payment: number,
  months: number
): number | null => {
  if (principal <= 0 || payment <= 0 || months <= 0) return null;
  const zeroRatePayment = principal / months;
  if (payment < zeroRatePayment) return null;
  if (Math.abs(payment - zeroRatePayment) < 0.01) return 0;

  let low = 0;
  let high = 1;

  while (calculatePricePayment(principal, high, months) < payment && high < 10) {
    high *= 2;
  }

  if (calculatePricePayment(principal, high, months) < payment) {
    return null;
  }

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2;
    const estimatedPayment = calculatePricePayment(principal, mid, months);

    if (estimatedPayment > payment) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return ((low + high) / 2) * 100;
};

// ─── Componentes de Apoio ─────────────────────────────────────────────────────

const SystemButton = ({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left rounded-2xl border p-4 sm:p-5 transition-all ${
      active
        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-500/20 shadow-sm'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
    }`}
  >
    <p
      className={`text-xs font-black uppercase tracking-[0.2em] mb-1.5 ${
        active ? 'text-rose-700 dark:text-rose-300' : 'text-slate-900 dark:text-white'
      }`}
    >
      {title}
    </p>
    <p className={`text-xs sm:text-sm leading-relaxed ${active ? 'text-rose-700/80 dark:text-rose-300/80' : 'text-slate-600 dark:text-slate-300'}`}>
      {subtitle}
    </p>
  </button>
);

const InputModeButton = ({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left rounded-2xl border p-4 sm:p-5 transition-all h-full ${
      active
        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20 shadow-sm'
        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
    }`}
  >
    <p
      className={`text-xs font-black uppercase tracking-[0.18em] mb-1.5 ${
        active ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-900 dark:text-white'
      }`}
    >
      {title}
    </p>
    <p className={`text-xs sm:text-sm leading-relaxed ${active ? 'text-emerald-700/80 dark:text-emerald-300/80' : 'text-slate-600 dark:text-slate-300'}`}>
      {subtitle}
    </p>
  </button>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] mb-3">{children}</p>
);

const DEBT_SIM_STORAGE_KEY = 'financas-pro-invest-debt-sim-v2';

// ─── Componente Principal ─────────────────────────────────────────────────────

export const DebtOptimizerTool = ({ onNavigate, isAuthenticated: isAuthProp }: any) => {
  const { user } = useAuth();
  const isAuthenticated = isAuthProp || !!user;

  // Sincronização com dados reais de dívidas cadastradas
  const { debts = [], isLoading: debtsLoading } = useDebts(user?.uid);
  const [selectedRealDebtId, setSelectedRealDebtId] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Estados dos inputs principais
  const [inputMode, setInputMode] = useState<InputMode>('installments-payment');
  const [system, setSystem] = useState<DebtSystem>('price');
  const [debtAmount, setDebtAmount] = useState<number | ''>('');
  const [monthlyRate, setMonthlyRate] = useState<number | ''>('');
  const [installments, setInstallments] = useState<number | ''>('');
  const [currentPayment, setCurrentPayment] = useState<number | ''>('');
  const [extraPayment, setExtraPayment] = useState<number | ''>('');
  const [hasCalculated, setHasCalculated] = useState(false);
  const [hasRestoredSimulation, setHasRestoredSimulation] = useState(false);

  // Estados de navegação interna e visualização
  const [activeTab, setActiveTab] = useState<'simulador' | 'cronograma' | 'estrategia'>('simulador');
  const [tableViewMode, setTableViewMode] = useState<TableViewMode>('milestones');

  const skipFirstAutoResetRef = useRef(true);

  // Validações de preenchimento
  const hasDebtAmount = debtAmount !== '' && Number(debtAmount) > 0;
  const hasRateValue = monthlyRate !== '' && Number(monthlyRate) >= 0;
  const hasInstallmentsValue = installments !== '' && Number(installments) > 0;
  const hasCurrentPaymentValue = currentPayment !== '' && Number(currentPayment) > 0;

  // Estimativa automática de taxa para financiamentos
  const inferredStructuredRate = useMemo(() => {
    if (inputMode !== 'installments-payment') return null;
    if (!hasDebtAmount || !hasInstallmentsValue || !hasCurrentPaymentValue) return null;

    const principal = Number(debtAmount);
    const payment = Number(currentPayment);
    const months = Number(installments);

    if (system === 'sac') {
      return inferSacRateFromPayment(principal, payment, months);
    }
    if (system === 'price') {
      return inferPriceRateFromPayment(principal, payment, months);
    }
    return null;
  }, [inputMode, system, debtAmount, installments, currentPayment, hasDebtAmount, hasInstallmentsValue, hasCurrentPaymentValue]);

  const effectiveStructuredRate = hasRateValue ? Number(monthlyRate) : inferredStructuredRate;

  const hasStructuredData =
    hasDebtAmount &&
    hasInstallmentsValue &&
    effectiveStructuredRate !== null &&
    effectiveStructuredRate >= 0;

  const hasRotativeData = hasDebtAmount && hasCurrentPaymentValue;

  const canCalculate = (system === 'sac' || system === 'price') ? hasStructuredData : hasRotativeData;

  // Reset de cálculo se inputs mudarem
  useEffect(() => {
    if (!hasRestoredSimulation) return;
    if (skipFirstAutoResetRef.current) {
      skipFirstAutoResetRef.current = false;
      return;
    }
    setHasCalculated(false);
  }, [system, debtAmount, monthlyRate, installments, currentPayment, extraPayment, hasRestoredSimulation]);

  // Recuperação de sessão anterior
  useEffect(() => {
    const raw = sessionStorage.getItem(DEBT_SIM_STORAGE_KEY);
    if (!raw) {
      // Valores padrão para demonstração inicial soberana caso vazio
      setDebtAmount(45000);
      setInstallments(48);
      setCurrentPayment(1250);
      setExtraPayment(250);
      setSystem('price');
      setInputMode('installments-payment');
      setHasCalculated(true);
      setHasRestoredSimulation(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed.inputMode) setInputMode(parsed.inputMode);
      if (parsed.system) setSystem(parsed.system);
      if (parsed.debtAmount !== undefined) setDebtAmount(parsed.debtAmount);
      if (parsed.monthlyRate !== undefined) setMonthlyRate(parsed.monthlyRate);
      if (parsed.installments !== undefined) setInstallments(parsed.installments);
      if (parsed.currentPayment !== undefined) setCurrentPayment(parsed.currentPayment);
      if (parsed.extraPayment !== undefined) setExtraPayment(parsed.extraPayment);
      if (parsed.hasCalculated !== undefined) setHasCalculated(parsed.hasCalculated);
    } catch (_) {
      sessionStorage.removeItem(DEBT_SIM_STORAGE_KEY);
    } finally {
      setHasRestoredSimulation(true);
    }
  }, []);

  // Persistência em sessão
  useEffect(() => {
    if (!hasRestoredSimulation) return;
    sessionStorage.setItem(
      DEBT_SIM_STORAGE_KEY,
      JSON.stringify({
        inputMode,
        system,
        debtAmount,
        monthlyRate,
        installments,
        currentPayment,
        extraPayment,
        hasCalculated,
      })
    );
  }, [inputMode, system, debtAmount, monthlyRate, installments, currentPayment, extraPayment, hasCalculated, hasRestoredSimulation]);

  const extra = Number(extraPayment || 0);
  const isPaymentMode = inputMode === 'payment';
  const shouldShowSystemSelector = !isPaymentMode;

  useEffect(() => {
    if (isPaymentMode && system !== 'rotativo') {
      setSystem('rotativo');
    }
  }, [isPaymentMode, system]);

  // Sincronização com dívida cadastrada real
  const handleSelectRealDebt = (debt: DebtItem) => {
    setSelectedRealDebtId(debt.id || null);
    setDebtAmount(debt.saldoDevedor || '');
    setMonthlyRate(debt.taxaMensal || '');
    setInstallments(debt.parcelasRestantes || '');
    setCurrentPayment(debt.valorParcela || '');

    if (
      debt.tipo === 'cartao' ||
      debt.tipo === 'rotativo_cartao' ||
      debt.tipo === 'cheque_especial' ||
      debt.originType === 'rotativo_cartao'
    ) {
      setSystem('rotativo');
      setInputMode('payment');
    } else if (debt.parcelasRestantes && debt.valorParcela) {
      setSystem('price');
      setInputMode('installments-payment');
    } else {
      setSystem('price');
      setInputMode('rate-term');
    }

    setHasCalculated(true);
    setSyncNotice(`Dívida "${debt.nome}" importada com sucesso do seu painel!`);
    setTimeout(() => setSyncNotice(null), 4000);
  };

  // Textos explicativos dos modos de entrada
  const inputModeContent = useMemo(() => {
    switch (inputMode) {
      case 'payment':
        return {
          title: 'Você sabe o saldo devedor e o pagamento mensal',
          description:
            'Ideal para cartão de crédito rotativo, cheque especial e dívidas abertas onde você paga o que pode ou o mínimo da fatura.',
        };
      case 'rate-term':
        return {
          title: 'Você tem dados completos do contrato',
          description:
            'Use este modo se souber a taxa mensal de juros e o prazo em meses. Permite comparar SAC e Price com exatidão contratual.',
        };
      case 'installments-payment':
        return {
          title: 'Você sabe as parcelas em aberto e o valor que paga',
          description:
            'Ideal para empréstimos e financiamentos. A ferramenta infere a taxa de juros real implícita na parcela.',
        };
      case 'guided':
        return {
          title: 'Identificação pelo comportamento da dívida',
          description:
            'Escolha se a parcela começa mais alta e cai (SAC), se é fixa (Price) ou se é uma dívida girando sem prazo fixo (Rotativo).',
        };
      default:
        return {
          title: 'Escolha o formato de entrada',
          description: 'Selecione a opção com os dados que você tem em mãos hoje.',
        };
    }
  }, [inputMode]);

  // Cálculos matemáticos dos sistemas
  const sacBase = useMemo(() => {
    if (!hasStructuredData || effectiveStructuredRate === null) return null;
    return buildSacSchedule(Number(debtAmount), effectiveStructuredRate, Number(installments), 0);
  }, [debtAmount, installments, hasStructuredData, effectiveStructuredRate]);

  const sacOptimized = useMemo(() => {
    if (!hasStructuredData || effectiveStructuredRate === null) return null;
    return buildSacSchedule(Number(debtAmount), effectiveStructuredRate, Number(installments), extra);
  }, [debtAmount, installments, extra, hasStructuredData, effectiveStructuredRate]);

  const priceBase = useMemo(() => {
    if (!hasStructuredData || effectiveStructuredRate === null) return null;
    return buildPriceSchedule(Number(debtAmount), effectiveStructuredRate, Number(installments), 0);
  }, [debtAmount, installments, hasStructuredData, effectiveStructuredRate]);

  const priceOptimized = useMemo(() => {
    if (!hasStructuredData || effectiveStructuredRate === null) return null;
    return buildPriceSchedule(Number(debtAmount), effectiveStructuredRate, Number(installments), extra);
  }, [debtAmount, installments, extra, hasStructuredData, effectiveStructuredRate]);

  const rotativeBase = useMemo(() => {
    if (!hasRotativeData) return null;
    return buildRotativeSchedule(Number(debtAmount), Number(monthlyRate), Number(currentPayment));
  }, [debtAmount, monthlyRate, currentPayment, hasRotativeData]);

  const rotativeOptimized = useMemo(() => {
    if (!hasRotativeData) return null;
    return buildRotativeSchedule(Number(debtAmount), Number(monthlyRate), Number(currentPayment) + extra);
  }, [debtAmount, monthlyRate, currentPayment, extra, hasRotativeData]);

  const activeSac = useMemo(() => (extra > 0 && sacOptimized?.valid ? sacOptimized : sacBase), [extra, sacBase, sacOptimized]);
  const activePrice = useMemo(() => (extra > 0 && priceOptimized?.valid ? priceOptimized : priceBase), [extra, priceBase, priceOptimized]);
  const activeRotative = useMemo(() => (extra > 0 && rotativeOptimized?.valid ? rotativeOptimized : rotativeBase), [extra, rotativeBase, rotativeOptimized]);

  // Economia da Amortização Extraordinária
  const savings = useMemo(() => {
    if (extra <= 0) return null;

    if (system === 'sac' && sacBase?.valid && sacOptimized?.valid) {
      const monthsSaved = sacBase.rows.length - sacOptimized.rows.length;
      const moneySaved = Math.max(sacBase.totalPaid - sacOptimized.totalPaid, 0);
      return {
        monthsSaved,
        moneySaved,
        originalMonths: sacBase.rows.length,
        optimizedMonths: sacOptimized.rows.length,
        originalTotalPaid: sacBase.totalPaid,
        optimizedTotalPaid: sacOptimized.totalPaid,
      };
    }

    if (system === 'price' && priceBase?.valid && priceOptimized?.valid) {
      const monthsSaved = priceBase.rows.length - priceOptimized.rows.length;
      const moneySaved = Math.max(priceBase.totalPaid - priceOptimized.totalPaid, 0);
      return {
        monthsSaved,
        moneySaved,
        originalMonths: priceBase.rows.length,
        optimizedMonths: priceOptimized.rows.length,
        originalTotalPaid: priceBase.totalPaid,
        optimizedTotalPaid: priceOptimized.totalPaid,
      };
    }

    if (system === 'rotativo' && rotativeBase?.valid && rotativeOptimized?.valid) {
      const monthsSaved = (rotativeBase.months || 0) - (rotativeOptimized.months || 0);
      const moneySaved = Math.max((rotativeBase.totalPaid || 0) - (rotativeOptimized.totalPaid || 0), 0);
      return {
        monthsSaved,
        moneySaved,
        originalMonths: rotativeBase.months || 0,
        optimizedMonths: rotativeOptimized.months || 0,
        originalTotalPaid: rotativeBase.totalPaid || 0,
        optimizedTotalPaid: rotativeOptimized.totalPaid || 0,
      };
    }

    return null;
  }, [extra, system, sacBase, sacOptimized, priceBase, priceOptimized, rotativeBase, rotativeOptimized]);

  // Resumo do sistema selecionado
  const selectedSummary = useMemo(() => {
    if (system === 'sac' && sacBase?.valid) {
      const current = sacBase;
      const optimized = sacOptimized?.valid ? sacOptimized : sacBase;
      const monthsSaved = current.rows.length - optimized.rows.length;
      const moneySaved = current.totalPaid - optimized.totalPaid;

      return {
        title: 'Sistema SAC (Amortização Constante)',
        primary: `${optimized.rows.length} parcelas restantes`,
        secondary: `Total pago: ${formatCurrency(optimized.totalPaid)}`,
        tertiary:
          extra > 0
            ? `Economia em juros: ${formatCurrency(Math.max(moneySaved, 0))}`
            : `1ª parcela: ${formatCurrency(current.firstPayment)} • Última: ${formatCurrency(current.lastPayment)}`,
        insight:
          extra > 0
            ? `Com amortização extra mensal de ${formatCurrency(extra)}, você elimina ${monthsSaved} meses de dívida.`
            : 'No SAC, as parcelas diminuem todo mês porque a amortização do saldo principal é fixa.',
        risk: '',
      };
    }

    if (system === 'price' && priceBase?.valid) {
      const current = priceBase;
      const optimized = priceOptimized?.valid ? priceOptimized : priceBase;
      const monthsSaved = current.rows.length - optimized.rows.length;
      const moneySaved = current.totalPaid - optimized.totalPaid;

      return {
        title: 'Tabela Price (Parcelas Fixas)',
        primary: `${optimized.rows.length} parcelas restantes`,
        secondary: `Total pago: ${formatCurrency(optimized.totalPaid)}`,
        tertiary:
          extra > 0
            ? `Economia em juros: ${formatCurrency(Math.max(moneySaved, 0))}`
            : `Parcela mensal fixa: ${formatCurrency(current.firstPayment)}`,
        insight:
          extra > 0
            ? `Com amortização extra mensal de ${formatCurrency(extra)}, você corta ${monthsSaved} meses e economiza ${formatCurrency(Math.max(moneySaved, 0))}.`
            : 'Na Price, as parcelas são iguais, mas no início quase todo o valor é juro e pouco abate a dívida.',
        risk: '',
      };
    }

    if (system === 'rotativo' && rotativeBase?.valid) {
      const current = rotativeBase;
      const optimized = rotativeOptimized?.valid ? rotativeOptimized : rotativeBase;
      const monthsSaved = (current.months || 0) - (optimized.months || 0);
      const moneySaved = (current.totalPaid || 0) - (optimized.totalPaid || 0);

      return {
        title: 'Dívida Rotativa / Cartão',
        primary: `${optimized.months} meses para quitar`,
        secondary: `Total pago: ${formatCurrency(optimized.totalPaid || 0)}`,
        tertiary:
          extra > 0
            ? `Economia em juros: ${formatCurrency(Math.max(moneySaved, 0))}`
            : `Juros acumulados: ${formatCurrency(optimized.totalInterest || 0)}`,
        insight:
          extra > 0
            ? `Adicionando ${formatCurrency(extra)} por mês, você reduz ${monthsSaved > 0 ? `${monthsSaved} meses` : 'o custo da dívida'} e estanca a sangria.`
            : 'No rotativo, pagar apenas o mínimo cria uma bola de neve agressiva.',
        risk: '',
      };
    }

    if (system === 'rotativo' && hasRotativeData) {
      return {
        title: 'Alerta Crítico: Pagamento Insuficiente',
        primary: 'A dívida não reduz',
        secondary: 'O pagamento é menor que os juros',
        tertiary: 'Aumente o pagamento mensal',
        insight: 'O valor que você paga não cobre nem os juros do mês. O saldo devedor está crescendo em vez de diminuir.',
        risk: 'Bola de neve ativada: o débito continuará crescendo sem parar.',
      };
    }

    return {
      title: 'Preencha os dados da dívida',
      primary: 'Aguardando simulação',
      secondary: 'Informe o saldo e parcelas',
      tertiary: 'Selecione o tipo de contrato',
      insight: 'A ferramenta demonstrará a trajetória completa e cenários de quitação acelerada.',
      risk: '',
    };
  }, [system, sacBase, sacOptimized, priceBase, priceOptimized, rotativeBase, rotativeOptimized, extra, hasRotativeData]);

  const displayedSummary = hasCalculated && canCalculate
    ? selectedSummary
    : {
        title: 'Aguardando cálculo',
        primary: 'Clique em Calcular',
        secondary: 'Preencha os campos para ver a projeção',
        tertiary: 'Diagnóstico e gráficos detalhados',
        insight: 'Os resultados e o gráfico comparativo serão exibidos após sua confirmação.',
        risk: '',
      };

  // Comparativo SAC vs Price
  const comparison = useMemo(() => {
    if (!activeSac?.valid || !activePrice?.valid) return null;
    const betterByInterest = activeSac.totalInterest < activePrice.totalInterest ? 'SAC' : 'Price';
    return {
      betterByInterest,
      interestGap: Math.abs(activePrice.totalInterest - activeSac.totalInterest),
    };
  }, [activeSac, activePrice]);

  // Lista de linhas da tabela de amortização
  const allRows: ScheduleRow[] = useMemo(() => {
    if (system === 'sac') return activeSac?.rows || [];
    if (system === 'price') return activePrice?.rows || [];
    return activeRotative?.rows || [];
  }, [system, activeSac, activePrice, activeRotative]);

  // Filtragem da tabela para exibição elegante
  const displayRows = useMemo(() => {
    if (allRows.length === 0) return [];
    if (tableViewMode === 'all') return allRows;
    if (tableViewMode === '24') return allRows.slice(0, 24);

    // Modo 'milestones' (Marcos Anuais + Primeiros Meses + Mês Final)
    const milestoneMonths = new Set([
      1, 2, 3, 6, 12, 24, 36, 48, 60, 84, 120, 180, 240, 300, 360, allRows.length,
    ]);
    return allRows.filter((row) => milestoneMonths.has(row.month));
  }, [allRows, tableViewMode]);

  const canShowDetailed = useMemo(() => {
    if (!hasCalculated || !canCalculate) return false;
    if (system === 'sac') return !!activeSac?.valid;
    if (system === 'price') return !!activePrice?.valid;
    return !!activeRotative?.valid;
  }, [hasCalculated, canCalculate, system, activeSac, activePrice, activeRotative]);

  const isDetailedLocked = !isAuthenticated && canShowDetailed;
  const showRotativeWarning = system === 'rotativo' && hasRotativeData && !activeRotative?.valid;

  // Série temporal para o gráfico Recharts
  const chartData = useMemo(() => {
    if (!hasCalculated || !canCalculate) return [];

    const baseRows = (system === 'sac' ? sacBase?.rows : system === 'price' ? priceBase?.rows : rotativeBase?.rows) || [];
    const optRows = (system === 'sac' ? sacOptimized?.rows : system === 'price' ? priceOptimized?.rows : rotativeOptimized?.rows) || [];

    if (baseRows.length === 0 && optRows.length === 0) return [];

    const maxMonths = Math.max(baseRows.length, optRows.length);
    const step = maxMonths > 180 ? 6 : maxMonths > 60 ? 3 : maxMonths > 24 ? 2 : 1;

    const points = [];
    const initialPrincipal = Number(debtAmount || 0);

    points.push({
      monthLabel: 'Início',
      month: 0,
      saldoNormal: Math.round(initialPrincipal),
      saldoAcelerado: Math.round(initialPrincipal),
    });

    for (let m = step; m <= maxMonths; m += step) {
      const bRow = baseRows.find((r) => r.month === m) || (m > baseRows.length ? { balance: 0 } : null);
      const oRow = optRows.find((r) => r.month === m) || (m > optRows.length ? { balance: 0 } : null);

      points.push({
        monthLabel: m % 12 === 0 ? `Ano ${m / 12}` : `Mês ${m}`,
        month: m,
        saldoNormal: bRow ? Math.round(bRow.balance) : 0,
        saldoAcelerado: oRow ? Math.round(oRow.balance) : 0,
      });
    }

    const lastBase = baseRows[baseRows.length - 1];
    const lastOpt = optRows[optRows.length - 1];
    if (points[points.length - 1]?.month !== maxMonths) {
      points.push({
        monthLabel: `Mês ${maxMonths}`,
        month: maxMonths,
        saldoNormal: lastBase ? Math.round(lastBase.balance) : 0,
        saldoAcelerado: lastOpt ? Math.round(lastOpt.balance) : 0,
      });
    }

    return points;
  }, [hasCalculated, canCalculate, system, sacBase, sacOptimized, priceBase, priceOptimized, rotativeBase, rotativeOptimized, debtAmount]);

  // Diagnóstico estratégico do Nexus
  const diagnosisCard = useMemo(() => {
    if (!hasCalculated || !canCalculate) {
      return {
        tone: 'slate',
        badge: 'Próximo Passo',
        title: 'Preencha os dados e gere a simulação',
        description: 'A ferramenta calculará o custo total real e os cenários de antecipação com amortização.',
      };
    }

    if (system === 'rotativo' && hasRotativeData && !activeRotative?.valid) {
      return {
        tone: 'rose',
        badge: 'Perigo Financeiro Alto',
        title: 'O pagamento mensal não vence os juros da dívida',
        description: 'Nesse ritmo o saldo nunca zera. Priorize aumentar o pagamento ou fazer portabilidade para crédito consignado/pessoal com taxa menor.',
      };
    }

    if (extra > 0 && savings) {
      return {
        tone: 'emerald',
        badge: 'Alavanca de Quitação Ativa',
        title: `Você poupará ${formatCurrency(savings.moneySaved)} e cortará ${savings.monthsSaved} meses!`,
        description: `O aporte extra de ${formatCurrency(extra)} por mês ataca diretamente o saldo devedor, cortando os juros futuros pela raiz.`,
      };
    }

    if (system === 'rotativo' && activeRotative?.valid) {
      return {
        tone: 'amber',
        badge: 'Juros Altos',
        title: 'Dívida no rotativo tem custo exorbitante',
        description: 'Simule uma amortização extra ou renegocie para estancar o custo mensal e recuperar seu Saldo Livre Real.',
      };
    }

    return {
      tone: 'sky',
      badge: 'Cenário Contratual Normal',
      title: 'Dívida em amortização programada',
      description: 'Teste adicionar uma amortização extra mensal para ver quantas parcelas você pode eliminar da sua vida.',
    };
  }, [hasCalculated, canCalculate, system, hasRotativeData, activeRotative, extra, savings]);

  const diagnosisClasses =
    diagnosisCard.tone === 'rose'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : diagnosisCard.tone === 'amber'
      ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
      : diagnosisCard.tone === 'emerald'
      ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
      : diagnosisCard.tone === 'sky'
      ? 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200'
      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white';

  // Redirecionamento com integração de Metas
  const handleSaveAsGoal = () => {
    const nomeMeta = encodeURIComponent(`Quitação Dívida (${system.toUpperCase()})`);
    const valorAlvo = encodeURIComponent(String(debtAmount || 0));
    const aporteMensal = encodeURIComponent(String(extra || currentPayment || 0));
    onNavigate(`metas?action=new&nome=${nomeMeta}&valor=${aporteMensal}&metaAlvo=${valorAlvo}`);
  };

  return (
    <ToolLayout
      title="Calculadora de Dívidas"
      icon="💳"
      onBack={onNavigate}
      description="Descubra o melhor caminho para quitar seus débitos, compare SAC, Price e Rotativo, e veja quantos anos e juros você poupa com amortização extra."
    >
      <div className="space-y-8">
        {/* Banner de Feedback de Sincronização */}
        {syncNotice && (
          <div
            data-testid="sync-notice"
            className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-sm font-semibold animate-fadeIn"
          >
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Bloco 1: Sincronização Inteligente com Dívidas Cadastradas */}
        {isAuthenticated && debts && debts.length > 0 && (
          <div className="bg-gradient-to-br from-rose-500/5 via-slate-50 to-white dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-850 border border-rose-200/80 dark:border-rose-900/60 rounded-[2rem] p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                  <Zap size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Importar Minhas Dívidas Reais
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Você possui {debts.length} dívida{debts.length > 1 ? 's' : ''} cadastrada{debts.length > 1 ? 's' : ''} no painel. Clique para simular:
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('minhas-dividas')}
                className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1 transition-colors"
              >
                Gerenciar em Minhas Dívidas <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {debts.map((d) => {
                const isSelected = selectedRealDebtId === d.id;
                return (
                  <button
                    key={d.id || d.nome}
                    type="button"
                    onClick={() => handleSelectRealDebt(d)}
                    className={`text-left p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-400 dark:border-rose-700 ring-2 ring-rose-500/20 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-600 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[170px]">{d.nome}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {d.tipo}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Saldo:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(d.saldoDevedor)}</span>
                    </div>
                    {d.valorParcela > 0 && (
                      <div className="flex items-baseline justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>Parcela:</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{formatCurrency(d.valorParcela)}/mês</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bloco 2: Seleção de Modo de Entrada e Sistema de Amortização */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-5 sm:p-6 shadow-sm">
          <SectionTitle>1. Quais dados você tem em mãos?</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            <InputModeButton
              active={inputMode === 'installments-payment'}
              onClick={() => setInputMode('installments-payment')}
              title="Parcelas em Aberto"
              subtitle="Você sabe quantas faltam e o valor da parcela (a ferramenta infere a taxa)."
            />
            <InputModeButton
              active={inputMode === 'rate-term'}
              onClick={() => setInputMode('rate-term')}
              title="Valor + Taxa + Prazo"
              subtitle="Dados completos do contrato para comparar SAC e Price com exatidão."
            />
            <InputModeButton
              active={inputMode === 'payment'}
              onClick={() => setInputMode('payment')}
              title="Saldo + Pagamento Livre"
              subtitle="Ideal para cartão rotativo e cheque especial sem cronograma fechado."
            />
            <InputModeButton
              active={inputMode === 'guided'}
              onClick={() => setInputMode('guided')}
              title="Ajuda Guiada"
              subtitle="Escolha de acordo com o comportamento da parcela ao longo do tempo."
            />
          </div>

          <div className="rounded-2xl border border-sky-200 dark:border-sky-800 bg-sky-50/60 dark:bg-sky-950/40 p-4 mb-6">
            <p className="text-slate-900 dark:text-white font-bold text-xs sm:text-sm mb-1">{inputModeContent.title}</p>
            <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">{inputModeContent.description}</p>
          </div>

          {shouldShowSystemSelector && (
            <>
              <SectionTitle>2. Sistema de Amortização</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <SystemButton
                  active={system === 'price'}
                  onClick={() => setSystem('price')}
                  title="Tabela Price"
                  subtitle="Parcelas fixas e iguais mês a mês. O sistema mais comum em empréstimos e CDC."
                />
                <SystemButton
                  active={system === 'sac'}
                  onClick={() => setSystem('sac')}
                  title="Sistema SAC"
                  subtitle="Parcelas começam maiores e caem todo mês. Mais comum em financiamento imobiliário."
                />
                <SystemButton
                  active={system === 'rotativo'}
                  onClick={() => setSystem('rotativo')}
                  title="Rotativo / Cartão"
                  subtitle="Sem prazo fixo; juros mensais incidem sobre o saldo residual não pago."
                />
              </div>
            </>
          )}
        </div>

        {/* Bloco 3: Formulário de Parâmetros da Dívida */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-5 sm:p-6 shadow-sm">
          <SectionTitle>3. Valores e Condições da Dívida</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <Input
              label="Saldo devedor total"
              value={debtAmount}
              onChange={setDebtAmount}
              prefix="R$"
              placeholder="Ex: 45000"
              help="Quanto ainda falta pagar do principal."
            />

            {(system === 'sac' || system === 'price') && (
              <Input
                label={inputMode === 'installments-payment' ? 'Parcelas restantes' : 'Prazo (meses)'}
                value={installments}
                onChange={setInstallments}
                placeholder="Ex: 48"
                help="Quantidade de parcelas que ainda restam."
              />
            )}

            {inputMode === 'installments-payment' ? (
              <Input
                label="Valor da parcela atual"
                value={currentPayment}
                onChange={setCurrentPayment}
                prefix="R$"
                placeholder="Ex: 1250"
                help="Quanto você paga em cada boleto hoje."
              />
            ) : (
              <Input
                label="Juros ao mês (% a.m.)"
                value={monthlyRate}
                onChange={setMonthlyRate}
                placeholder="Ex: 1.8"
                help="Taxa mensal contratada ou estimada."
              />
            )}

            {system === 'rotativo' && (
              <Input
                label="Pagamento mensal atual"
                value={currentPayment}
                onChange={setCurrentPayment}
                prefix="R$"
                placeholder="Ex: 800"
                help="Quanto você paga por mês hoje."
              />
            )}
          </div>

          {/* Alavanca de Amortização Extraordinária com Chips Rápidos */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Sparkles size={15} /> Amortização Extraordinária Mensal (Alavanca de Quitação)
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Simule quanto tempo e dinheiro você poupa aportando além da parcela normal.
                </p>
              </div>

              {extra > 0 && (
                <button
                  type="button"
                  onClick={() => setExtraPayment('')}
                  className="text-xs text-slate-400 hover:text-slate-600 underline text-left sm:text-right"
                >
                  Limpar aporte extra
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-xs font-bold text-slate-400 mr-1">Atalhos rápidos:</span>
              {[100, 200, 300, 500, 1000].map((val) => {
                const isActive = Number(extraPayment) === val;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setExtraPayment(val)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/20'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    +{formatCurrency(val)}
                  </button>
                );
              })}
            </div>

            <div className="max-w-xs">
              <Input
                label="Valor extra personalizado por mês"
                value={extraPayment}
                onChange={setExtraPayment}
                prefix="R$"
                placeholder="Ex: 350"
                help="Este valor abate diretamente o saldo devedor principal."
              />
            </div>
          </div>

          {/* Estimativa automática de taxa informada */}
          {(system === 'sac' || system === 'price') &&
            inputMode === 'installments-payment' &&
            monthlyRate === '' &&
            inferredStructuredRate !== null && (
              <div className="mt-4 p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-800 flex items-center gap-2">
                <Info size={16} className="shrink-0 text-sky-600" />
                <span>
                  Taxa implícita estimada:{' '}
                  <strong className="font-black text-sky-900">{inferredStructuredRate.toFixed(2)}% ao mês</strong> (com base nas parcelas e valor informado).
                </span>
              </div>
            )}

          {/* Botão de Ação de Cálculo */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => setHasCalculated(true)}
              disabled={!canCalculate}
              className={`px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-sm ${
                canCalculate
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Calculator size={16} /> Calcular Cenários
            </button>
          </div>
        </div>

        {/* Bloco 4: Resultados, Diagnóstico e Navegação por Abas */}
        {hasCalculated && canCalculate && (
          <div className="space-y-6">
            {/* Card Heroico de Economia de Tempo e Dinheiro */}
            {savings && savings.monthsSaved > 0 && (
              <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-8 translate-y-8">
                  <Coins size={220} />
                </div>
                <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-emerald-100 text-xs font-black tracking-wider uppercase backdrop-blur-sm">
                    <Sparkles size={14} /> Alavanca da Liberdade Financeira
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                    Você elimina {savings.monthsSaved} meses de dívida e poupa {formatCurrency(savings.moneySaved)} em juros!
                  </h3>
                  <p className="text-emerald-100 text-sm sm:text-base max-w-2xl leading-relaxed">
                    Com o aporte adicional de <strong>{formatCurrency(extra)}/mês</strong>, o contrato cai de{' '}
                    <strong>{savings.originalMonths}</strong> para apenas{' '}
                    <strong>{savings.optimizedMonths} parcelas</strong>. Esse dinheiro em juros fica no seu patrimônio em vez de ir para o banco.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveAsGoal}
                      className="px-5 py-3 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
                    >
                      <Target size={16} /> Salvar Amortização como Meta no Meu Painel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnóstico Estratégico do Nexus */}
            <div className={`rounded-2xl border p-5 sm:p-6 ${diagnosisClasses}`}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">{diagnosisCard.badge}</span>
              </div>
              <h4 className="text-base sm:text-lg font-black tracking-tight mb-1">{diagnosisCard.title}</h4>
              <p className="text-xs sm:text-sm leading-relaxed opacity-90">{diagnosisCard.description}</p>
            </div>

            {/* Navegação por Abas Soberanas */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('simulador')}
                className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                  activeTab === 'simulador'
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 size={16} /> Gráfico & Diagnóstico
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('cronograma')}
                className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                  activeTab === 'cronograma'
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers size={16} /> Cronograma de Amortização
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('estrategia')}
                className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                  activeTab === 'estrategia'
                    ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen size={16} /> Estratégia & Fundamentos
              </button>
            </div>

            {/* ABA 1: Simulador & Gráfico Visual */}
            {activeTab === 'simulador' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cards de Resumo */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm space-y-5">
                  <div>
                    <SectionTitle>Resumo Financeiro</SectionTitle>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {displayedSummary.title}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
                      <CalendarClock size={16} /> Prazo Estimado
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">{displayedSummary.primary}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{displayedSummary.tertiary}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
                      <Receipt size={16} /> Custo Total Projetado
                    </div>
                    <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{displayedSummary.secondary}</p>
                  </div>

                  {comparison && (system === 'sac' || system === 'price') && (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs leading-relaxed">
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" /> Comparativo SAC vs Price
                      </div>
                      O sistema <strong>{comparison.betterByInterest}</strong> gera <strong>{formatCurrency(comparison.interestGap)}</strong> a menos em juros totais para as mesmas condições.
                    </div>
                  )}

                  {/* Ações Rápidas */}
                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleSaveAsGoal}
                      className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <Target size={16} /> Salvar como Meta de Aporte
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigate(isAuthenticated ? 'minhas-dividas' : 'login')}
                      className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                    >
                      Ver Painel Minhas Dívidas <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Gráfico Recharts de Decaimento do Saldo Devedor */}
                <div className="lg:col-span-2">
                  <DebtScenarioChart chartData={chartData} />
                </div>
              </div>
            )}

            {/* ABA 2: Cronograma de Amortização (Tabela) */}
            {activeTab === 'cronograma' && (
              <DebtScheduleTable
                allRows={allRows}
                displayRows={displayRows}
                tableViewMode={tableViewMode}
                onTableViewModeChange={setTableViewMode}
              />
            )}

            {/* ABA 3: Estratégia & Fundamentos */}
            {activeTab === 'estrategia' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm space-y-3">
                  <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 w-fit">
                    <BookOpen size={20} />
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                    SAC vs Tabela Price
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    No <strong>SAC</strong>, você amortiza a mesma fatia da dívida todo mês, fazendo a parcela diminuir continuamente. Na <strong>Price</strong>, a parcela é idêntica, mas no início você quase só paga juros ao banco. Por isso, amortizar na Price corta anos inteiros de contrato.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm space-y-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 w-fit">
                    <Sparkles size={20} />
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                    O Poder da Amortização Extra
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Qualquer valor pago além da parcela obrigatória é abatido <strong>100% do saldo devedor principal</strong>. Como os juros do mês seguinte são calculados sobre um saldo menor, o efeito acumulado gera uma economia exponencial.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm space-y-3">
                  <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 w-fit">
                    <TrendingDown size={20} />
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                    Bola de Neve vs Avalanche
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    O método <strong>Avalanche</strong> quita primeiro as dívidas com maiores taxas (economiza mais dinheiro). O método <strong>Bola de Neve</strong> quita primeiro as menores (gera vitórias psicológicas rápidas para engajar o hábito).
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gate Educacional para Visitantes Deslogados */}
        {isDetailedLocked && (
          <div className="relative border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 rounded-[2rem] p-8 text-center shadow-lg">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
              <Lock size={24} />
            </div>

            <h3 className="text-slate-900 dark:text-white text-xl font-black tracking-tight mb-2">
              Desbloqueie sua Estratégia Completa de Quitação
            </h3>

            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto leading-relaxed mb-6">
              Crie sua conta ou faça login para salvar esta simulação, conectar com seu Saldo Livre Real e acompanhar a extinção definitiva dos débitos no app.
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
                className="flex-1 py-3.5 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-2xl font-black text-xs uppercase tracking-wider border border-slate-200 dark:border-slate-700 transition-all"
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

export default DebtOptimizerTool;
