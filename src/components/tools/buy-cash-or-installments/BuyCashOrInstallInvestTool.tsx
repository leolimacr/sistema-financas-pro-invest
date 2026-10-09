import React, { useEffect, useMemo, useState } from 'react';
import { ToolLayout, Input } from '../ToolComponents';
import { TableHorizontalScrollWrapper } from '../common/TableHorizontalScrollWrapper';
import {
  calculateDecision,
  formatCurrencyBRL,
  formatPercent,
  maskCurrencyInput,
  maskPercentInput,
  parsePtBrNumber,
  validateCalculation,
} from './finance';
import { fetchCurrentSelicRate } from './selicService';
import type { CalculationInputs, CalculationResult, TaxMode } from './types';
import {
  ShoppingCart,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
  Target,
  BookOpen,
  Layers,
  BarChart3,
  Clock,
  DollarSign,
  ShieldCheck,
  Scale,
  Sparkles,
  Lock,
  ChevronRight,
  Info,
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
import { useAuth } from '../../../contexts/AuthContext';
import { useWealthData } from '../../../hooks/useWealthData';

const defaultState = {
  cashPrice: '3.000,00',
  totalInstallmentPrice: '3.000,00',
  installmentValue: '300,00',
  installmentCount: '10',
  cashDiscount: '150,00',
  annualRate: '',
  netAnnualRate: '',
  inflationAnnualRate: '',
  fees: '',
  iof: '',
  ignoreIR: false,
};

type FormState = typeof defaultState;
type ActiveTab = 'decision' | 'schedule' | 'fundamentals';

function toNumberState(form: FormState, taxMode: TaxMode, autoRate: number, advanced: boolean): CalculationInputs {
  return {
    cashPrice: parsePtBrNumber(form.cashPrice),
    totalInstallmentPrice: parsePtBrNumber(form.totalInstallmentPrice),
    installmentValue: parsePtBrNumber(form.installmentValue),
    installmentCount: Number(form.installmentCount || 0),
    cashDiscount: parsePtBrNumber(form.cashDiscount),
    annualRate: taxMode === 'automatic' ? autoRate : parsePtBrNumber(form.annualRate),
    netAnnualRate: advanced ? parsePtBrNumber(form.netAnnualRate) : undefined,
    inflationAnnualRate: advanced ? parsePtBrNumber(form.inflationAnnualRate) : undefined,
    fees: advanced ? parsePtBrNumber(form.fees) : 0,
    iof: advanced ? parsePtBrNumber(form.iof) : 0,
    taxMode,
    useInflation: advanced && parsePtBrNumber(form.inflationAnnualRate) > 0,
    ignoreIR: form.ignoreIR,
  };
}

export default function BuyCashOrInstallInvestTool({ onNavigate, isAuthenticated: isAuthProp }: any) {
  const { user } = useAuth();
  const isAuthenticated = isAuthProp || !!user;
  const { totalInvestments, patrimonioLiquido } = useWealthData();

  const [form, setForm] = useState<FormState>(defaultState);
  const [advanced, setAdvanced] = useState(false);
  const [taxMode, setTaxMode] = useState<TaxMode>('automatic');
  const [autoRate, setAutoRate] = useState(10.75);
  const [rateStatus, setRateStatus] = useState('Consultando Selic oficial do Banco Central...');
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('decision');
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Consulta taxa Selic oficial Copom (Série 432)
  useEffect(() => {
    let isMounted = true;
    fetchCurrentSelicRate()
      .then((rate) => {
        if (!isMounted) return;
        if (Number.isFinite(rate) && rate > 0) {
          setAutoRate(rate);
          setRateStatus(`Meta Selic oficial Copom: ${rate.toFixed(2).replace('.', ',')}% a.a.`);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setRateStatus('Taxa Selic de referência padrão: 10,75% a.a. (Copom).');
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const parsedInput = useMemo(() => toNumberState(form, taxMode, autoRate, advanced), [form, taxMode, autoRate, advanced]);

  // Cálculo automático inicial e sob demanda
  useEffect(() => {
    const validationErrors = validateCalculation(parsedInput);
    if (validationErrors.length === 0) {
      setResult(calculateDecision(parsedInput));
      setErrors([]);
    }
  }, [parsedInput]);

  function updateField(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleCurrency(field: keyof FormState, value: string) {
    updateField(field, maskCurrencyInput(value));
  }

  function handlePercent(field: keyof FormState, value: string) {
    updateField(field, maskPercentInput(value));
  }

  function handleCalculate() {
    const validationErrors = validateCalculation(parsedInput);
    setErrors(validationErrors);
    if (validationErrors.length) {
      setResult(null);
      return;
    }
    setResult(calculateDecision(parsedInput));
  }

  function handleReset() {
    setForm({
      cashPrice: '',
      totalInstallmentPrice: '',
      installmentValue: '',
      installmentCount: '10',
      cashDiscount: '',
      annualRate: '',
      netAnnualRate: '',
      inflationAnnualRate: '',
      fees: '',
      iof: '',
      ignoreIR: false,
    });
    setErrors([]);
    setResult(null);
    setAdvanced(false);
    setTaxMode('automatic');
  }

  // Sincronização com dados do ecossistema
  const handleCheckLiquidity = () => {
    const available = Number(totalInvestments || patrimonioLiquido || 0);
    const purchaseVal = parsePtBrNumber(form.cashPrice);

    if (available <= 0) {
      setSyncNotice('Nenhum saldo investido registrado no seu painel para consulta.');
      setTimeout(() => setSyncNotice(null), 4000);
      return;
    }

    if (purchaseVal > 0 && available >= purchaseVal) {
      setSyncNotice(`Você possui ${formatCurrencyBRL(available)} em investimentos/reserva. A compra à vista cabe na sua liquidez.`);
    } else if (purchaseVal > 0) {
      setSyncNotice(`Atenção: A compra de ${formatCurrencyBRL(purchaseVal)} supera seu saldo investido de ${formatCurrencyBRL(available)}.`);
    } else {
      setSyncNotice(`Saldo investido disponível: ${formatCurrencyBRL(available)}.`);
    }
    setTimeout(() => setSyncNotice(null), 5000);
  };

  // Cronograma mês a mês do fluxo financeiro
  const scheduleData = useMemo(() => {
    if (!result) return [];

    const effectiveCash = result.effectiveCashPrice;
    const count = result.installmentCount;
    const pmt = result.installmentValue;
    const mRate = (result.monthlyRate || 0) / 100;

    let balance = effectiveCash;
    const rows = [];

    for (let m = 1; m <= count; m += 1) {
      const startBalance = balance;
      const earnings = startBalance * mRate;
      const balanceAfterEarnings = startBalance + earnings;
      const endBalance = balanceAfterEarnings - pmt;

      rows.push({
        month: m,
        startBalance: Math.max(startBalance, 0),
        earnings: Math.max(earnings, 0),
        payment: pmt,
        endBalance: endBalance,
      });

      balance = endBalance;
    }

    return rows;
  }, [result]);

  // Série de dados para o gráfico Recharts
  const chartPoints = useMemo(() => {
    if (!result || scheduleData.length === 0) return [];

    const points = [];
    points.push({
      monthLabel: 'Início',
      month: 0,
      saldoInvestido: Math.round(result.effectiveCashPrice),
      desembolsoVista: Math.round(result.effectiveCashPrice),
    });

    scheduleData.forEach((row) => {
      points.push({
        monthLabel: `Mês ${row.month}`,
        month: row.month,
        saldoInvestido: Math.round(row.endBalance),
        desembolsoVista: 0,
      });
    });

    return points;
  }, [result, scheduleData]);

  // Redirecionamento de Meta
  const handleSaveAsGoal = () => {
    if (!result) return;
    const isInvest = result.decision === 'installments_invest';
    const nomeMeta = encodeURIComponent(
      isInvest
        ? `Lucro Parcelamento vs À Vista (${formatCurrencyBRL(result.finalDifference)})`
        : `Economia Compra com Desconto (${formatCurrencyBRL(Math.abs(result.finalDifference))})`
    );
    const valorAlvo = encodeURIComponent(String(Math.round(Math.abs(result.finalDifference))));
    const aporte = encodeURIComponent(String(Math.round(result.installmentValue)));

    onNavigate(`metas?action=new&nome=${nomeMeta}&valor=${aporte}&metaAlvo=${valorAlvo}`);
  };

  const isInstallmentsBetter = result?.decision === 'installments_invest';
  const isCashBetter = result?.decision === 'pay_cash';
  const verdictBg = isInstallmentsBetter
    ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
    : isCashBetter
    ? 'bg-gradient-to-br from-amber-500 to-orange-700 text-white'
    : 'bg-gradient-to-br from-sky-500 to-indigo-700 text-white';

  return (
    <ToolLayout
      title="À Vista ou Parcelado"
      icon="🛒"
      onBack={onNavigate}
      description="Compare pagar à vista com desconto ou parcelar no cartão e deixar o dinheiro rendendo no CDI/Selic."
      badge="Decisão Financeira"
    >
      <div className="space-y-8">
        {/* Banner de Feedback de Sincronização */}
        {syncNotice && (
          <div
            data-testid="sync-notice"
            className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-semibold animate-fadeIn"
          >
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Card Principal: Dados da Compra */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Scale size={18} className="text-amber-600 dark:text-amber-400" /> Dados da Oferta de Compra
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Preencha os valores da loja para calcular matematicamente a melhor escolha.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleCheckLiquidity}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Zap size={14} className="text-amber-600 dark:text-amber-400" /> Consultar Minha Reserva
                </button>
              )}

              <button
                type="button"
                onClick={() => setAdvanced((prev) => !prev)}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
              >
                {advanced ? 'Ocultar Modo Avançado' : 'Abrir Modo Avançado'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Preço à Vista Original</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-bold">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.cashPrice}
                  onChange={(e) => handleCurrency('cashPrice', e.target.value)}
                  placeholder="3.000,00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 pl-12 text-slate-900 dark:text-white font-black text-lg focus:border-amber-400 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-950 outline-none transition-all"
                />
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Preço da etiqueta sem parcelamento.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Desconto para Pagamento à Vista (Pix/Dinheiro)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-bold">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.cashDiscount}
                  onChange={(e) => handleCurrency('cashDiscount', e.target.value)}
                  placeholder="150,00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 pl-12 text-slate-900 dark:text-white font-black text-lg focus:border-amber-400 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-950 outline-none transition-all"
                />
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Desconto concedido se pagar no Pix ou dinheiro.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Quantidade de Parcelas</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.installmentCount}
                onChange={(e) => updateField('installmentCount', e.target.value.replace(/\D/g, ''))}
                placeholder="10"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white font-black text-lg focus:border-amber-400 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-950 outline-none transition-all"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Número total de vezes no cartão.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Valor da Parcela</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-bold">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.installmentValue}
                  onChange={(e) => handleCurrency('installmentValue', e.target.value)}
                  placeholder="300,00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 pl-12 text-slate-900 dark:text-white font-black text-lg focus:border-amber-400 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-950 outline-none transition-all"
                />
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Valor cobrado a cada mês na fatura.</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Preço Parcelado Total</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-bold">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.totalInstallmentPrice}
                  onChange={(e) => handleCurrency('totalInstallmentPrice', e.target.value)}
                  placeholder="3.000,00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 pl-12 text-slate-900 dark:text-white font-black text-lg focus:border-amber-400 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-950 outline-none transition-all"
                />
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">Soma de todas as parcelas.</span>
            </div>

            {/* Configuração da Taxa de Rendimento */}
            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Rendimento de Aplicação:</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{rateStatus}</span>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="taxMode"
                    checked={taxMode === 'automatic'}
                    onChange={() => setTaxMode('automatic')}
                    className="accent-amber-600"
                  />
                  <span>Selic Automática ({autoRate.toFixed(2)}%)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="taxMode"
                    checked={taxMode === 'manual'}
                    onChange={() => setTaxMode('manual')}
                    className="accent-amber-600"
                  />
                  <span>Manual</span>
                </label>
              </div>

              {taxMode === 'manual' && (
                <div className="pt-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.annualRate}
                    onChange={(e) => handlePercent('annualRate', e.target.value)}
                    placeholder="10,75"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-black text-slate-900 dark:text-white focus:border-amber-400 outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Opção de Isenção de IR */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3">
            <input
              type="checkbox"
              id="ignoreIR"
              checked={form.ignoreIR}
              onChange={(e) => updateField('ignoreIR', e.target.checked)}
              className="w-4 h-4 rounded text-amber-600 accent-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="ignoreIR" className="text-xs text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
              Investimento isento de Imposto de Renda (ex: LCI, LCA ou FIIs)
            </label>
          </div>

          {/* Parâmetros Avançados Opcionais */}
          {advanced && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4 animate-fadeIn">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Parâmetros Econômicos Avançados</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Rentabilidade Líquida (% a.a.)</label>
                  <input
                    type="text"
                    value={form.netAnnualRate}
                    onChange={(e) => handlePercent('netAnnualRate', e.target.value)}
                    placeholder="10,00"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Inflação Projetada (IPCA % a.a.)</label>
                  <input
                    type="text"
                    value={form.inflationAnnualRate}
                    onChange={(e) => handlePercent('inflationAnnualRate', e.target.value)}
                    placeholder="4,00"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">Taxas Administrativas (R$)</label>
                  <input
                    type="text"
                    value={form.fees}
                    onChange={(e) => handleCurrency('fees', e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">IOF ou Encargos (R$)</label>
                  <input
                    type="text"
                    value={form.iof}
                    onChange={(e) => handleCurrency('iof', e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold space-y-1">
              {errors.map((err) => (
                <p key={err}>• {err}</p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-bold text-xs uppercase tracking-wider transition-all"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleCalculate}
              className="px-8 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-widest transition-all shadow-sm"
            >
              Calcular Veredito
            </button>
          </div>
        </div>

        {/* Card Heroico do Veredito */}
        {result && (
          <div className={`${verdictBg} rounded-[2rem] p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-4`}>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-black tracking-wider uppercase backdrop-blur-sm w-fit">
              <Sparkles size={14} /> Veredito Soberano da Decisão
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="md:col-span-2">
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
                  {result.headline}
                </h3>
                <p className="text-white/90 text-sm sm:text-base leading-relaxed max-w-xl">
                  {result.summary}
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 flex flex-col justify-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-white/80">
                  Vantagem Financeira Líquida
                </span>
                <span className="text-3xl sm:text-4xl font-black text-white mt-1">
                  {formatCurrencyBRL(Math.abs(result.finalDifference))}
                </span>
                <span className="text-xs text-white/80 mt-1">
                  {isInstallmentsBetter ? 'Saldo que sobra no seu bolso' : 'Economia imediata no Pix'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSaveAsGoal}
                className="px-5 py-3 rounded-xl bg-white text-slate-900 hover:bg-slate-50 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
              >
                <Target size={16} /> Salvar Vantagem como Meta no Painel
              </button>
            </div>
          </div>
        )}

        {/* Abas Soberanas: Gráfico, Cronograma e Fundamentos */}
        {result && (
          <div className="space-y-6">
            <div className="flex border-b border-slate-200 dark:border-slate-700 gap-2 sm:gap-4 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('decision')}
                className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                  activeTab === 'decision'
                    ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 size={16} /> Gráfico & Indicadores
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                  activeTab === 'schedule'
                    ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers size={16} /> Cronograma Mês a Mês
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('fundamentals')}
                className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 shrink-0 ${
                  activeTab === 'fundamentals'
                    ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen size={16} /> Estratégia & Quando Parcelar
              </button>
            </div>

            {/* ABA 1: Gráfico e Indicadores */}
            {activeTab === 'decision' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cards de Métricas */}
                <div className="lg:col-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-sm space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Métricas da Decisão</h4>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Preço com Desconto À Vista</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">{formatCurrencyBRL(result.effectiveCashPrice)}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Custo Total Parcelado</span>
                    <span className="text-xl font-black text-slate-900 dark:text-white">{formatCurrencyBRL(result.totalInstallmentPrice)}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Rendimento Bruto se Investir</span>
                    <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">{formatCurrencyBRL(result.investmentGrossEarnings)}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Alíquota de IR Estimada</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      {form.ignoreIR ? 'Isento (0%)' : `${result.incomeTaxRatePercent?.toFixed(1)}% (Tabela Regressiva)`}
                    </span>
                  </div>
                </div>

                {/* Gráfico Recharts de Trajetória */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 sm:p-8 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                          Evolução do Saldo Aplicado Mês a Mês
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          O dinheiro rendendo no CDI enquanto cada parcela de {formatCurrencyBRL(result.installmentValue)} é paga.
                        </p>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 w-fit">
                        Taxa mensal: {formatPercent(result.monthlyRate || 0)}
                      </span>
                    </div>

                    <div className="h-[280px] w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="gradInvest" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="opacity-50 dark:opacity-20" />
                          <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tickFormatter={(v) => `R$ ${Math.round(v)}`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            formatter={(val: any) => [formatCurrencyBRL(Number(val)), 'Saldo Remanescente']}
                            labelFormatter={(l) => `Período: ${l}`}
                            contentStyle={{ borderRadius: '1rem', border: '1px solid #cbd5e1', backgroundColor: '#0f172a', color: '#fff' }}
                          />
                          <Area type="monotone" dataKey="saldoInvestido" stroke="#10b981" strokeWidth={2.5} fill="url(#gradInvest)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <strong>Por que essa análise importa:</strong> {result.explanation}
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: Cronograma Mês a Mês */}
            {activeTab === 'schedule' && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 sm:p-8 shadow-sm space-y-4">
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Cronograma Detalhado da Aplicação vs. Parcelas
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Veja o saldo aplicado inicial, os juros auferidos e o saldo remanescente após pagar a parcela da fatura.
                  </p>
                </div>

                <TableHorizontalScrollWrapper className="rounded-2xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="py-3.5 px-4">Parcela</th>
                        <th className="py-3.5 px-4">Saldo Aplicado Inicial</th>
                        <th className="py-3.5 px-4">Rendimento Líquido (Mês)</th>
                        <th className="py-3.5 px-4">Valor da Parcela</th>
                        <th className="py-3.5 px-4">Saldo Remanescente</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {scheduleData.map((row) => (
                        <tr key={row.month} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">Mês {row.month}</td>
                          <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{formatCurrencyBRL(row.startBalance)}</td>
                          <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrencyBRL(row.earnings)}</td>
                          <td className="py-3.5 px-4 font-semibold text-rose-600 dark:text-rose-400">-{formatCurrencyBRL(row.payment)}</td>
                          <td className="py-3.5 px-4 font-black text-slate-900 dark:text-white">{formatCurrencyBRL(row.endBalance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableHorizontalScrollWrapper>
              </div>
            )}

            {/* ABA 3: Fundamentos e Estratégia */}
            {activeTab === 'fundamentals' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-sm space-y-3">
                  <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 w-fit">
                    <AlertTriangle size={20} />
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                    A Regra de Ouro da Disciplina
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    A vantagem matemática de parcelar só funciona de verdade <strong>se o dinheiro realmente ficar investido</strong>. Se você parcelar e gastar o dinheiro no dia a dia, você apenas comprou dívida futura e reduziu seu Saldo Livre Real.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-sm space-y-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 w-fit">
                    <DollarSign size={20} />
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                    O Mito do "Sem Juros"
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Quase nenhuma compra é realmente "sem juros". O custo financeiro do lojista já está embutido no preço total. Por isso, ao pedir desconto à vista (5% a 10%), você quase sempre ganha do rendimento do CDI no período curto.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-6 shadow-sm space-y-3">
                  <div className="p-2.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 w-fit">
                    <ShieldCheck size={20} />
                  </div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-wide">
                    Tabela Regressiva do IR
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Aplicações de renda fixa comuns (CDB e Tesouro Selic) sofrem alíquotas de IR de 22,5% (até 6 meses) a 15% (acima de 2 anos). Esta ferramenta já desconta o imposto automaticamente para dar a resposta líquida real.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}