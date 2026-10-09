import React, { useState, useRef, useMemo } from 'react';
import { ToolLayout, ToolGate } from './ToolComponents';
import {
  Target,
  Wallet,
  TrendingUp,
  Clock,
  Flame,
  ShieldCheck,
  PieChart,
  ChevronDown,
  ChevronUp,
  Lock,
  Zap,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Info,
  RotateCcw,
  Sparkles,
  Table as TableIcon,
  Download,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Anchor,
  Coffee,
  Check,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useWealthData } from '../../hooks/useWealthData';
import { useTransactions } from '../../hooks/useTransactions';
import { useAuth } from '../../contexts/AuthContext';
import { FireSensitivityPanel } from './fire/FireSensitivityPanel';
import { FireMilestonesPanel } from './fire/FireMilestonesPanel';
import { FireTrinityModal } from './fire/FireTrinityModal';
import type { CalculatedState, FireMonthlyRow, FireYearlyRow } from './fire/fireTypes';

// ─── Helpers de Formatação ──────────────────────────────────────────────────

const fmtMoney = (n: number) =>
  'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const fmtMoneyExact = (n: number) =>
  'R$ ' +
  n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatMoneyInput = (value: number | '') => {
  if (value === '' || value === null || Number.isNaN(Number(value))) return '';
  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseMoneyDigits = (raw: string): number | '' => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits) / 100;
};

// ─── Campo de Moeda Seguro (Sem interceptação do scroll do mouse) ────────────

interface MoneyInputProps {
  label: string;
  icon: React.ElementType;
  value: number | '';
  onChange: (v: number | '') => void;
  hint?: string;
  placeholder?: string;
}

const MoneyInput: React.FC<MoneyInputProps> = ({
  label,
  icon: Icon,
  value,
  onChange,
  hint,
  placeholder = '0,00',
}) => {
  const [focused, setFocused] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const display = formatMoneyInput(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Icon size={14} className="text-orange-500 shrink-0" />
          {label}
        </label>
        {hint && (
          <button
            type="button"
            onClick={() => setShowHint((v) => !v)}
            className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 text-[10px] font-black text-slate-400 bg-white dark:bg-slate-800 hover:text-orange-600 hover:border-orange-400 transition-colors flex items-center justify-center"
            title="Mais informações"
          >
            ?
          </button>
        )}
      </div>

      {showHint && hint && (
        <p className="text-xs text-slate-600 dark:text-slate-300 bg-orange-50/80 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/60 rounded-xl p-3 leading-relaxed">
          {hint}
        </p>
      )}

      <div
        className={`relative flex items-center rounded-2xl border transition-all ${
          focused
            ? 'border-orange-500 ring-2 ring-orange-100 dark:ring-orange-950/60 bg-white dark:bg-slate-900 shadow-sm'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <span
          className={`absolute left-4 font-bold text-sm pointer-events-none transition-colors ${
            focused ? 'text-orange-500' : 'text-slate-400 dark:text-slate-500'
          }`}
        >
          R$
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={display}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(parseMoneyDigits(e.target.value))}
          className="w-full bg-transparent py-4 pl-12 pr-4 text-slate-900 dark:text-white font-black text-lg outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

// ─── Seletor de Perfil de Retirada ──────────────────────────────────────────

interface WithdrawalSelectorProps {
  value: number;
  onChange: (v: number) => void;
}

const WithdrawalSelector: React.FC<WithdrawalSelectorProps> = ({ value, onChange }) => {
  const [showHint, setShowHint] = useState(false);

  const profiles = [
    {
      label: 'Conservador · 3%',
      value: 0.03,
      multiplier: '33× anual',
      desc: 'Meta de 33× seus gastos do ano · Máxima blindagem contra crises longas',
    },
    {
      label: 'Padrão · 4%',
      value: 0.04,
      multiplier: '25× anual',
      desc: 'Meta de 25× seus gastos do ano · Regra de ouro global (Trinity)',
    },
    {
      label: 'Dinâmico · 5%',
      value: 0.05,
      multiplier: '20× anual',
      desc: 'Meta de 20× seus gastos do ano · Menos capital para parar mais cedo',
    },
  ];

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div>
          <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <PieChart size={14} className="text-orange-500 shrink-0" />
            Regra de Retirada Anual Segura
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
            A fatia percentual que você saca por ano do seu patrimônio investido para pagar seu custo de vida, sem esgotar o capital.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHint((v) => !v)}
          className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-700 text-[11px] font-black text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:text-orange-600 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-2xs mt-0.5 sm:mt-0"
          title="O que significa a Regra de Retirada Segura?"
          aria-label="Mais informações sobre a Regra de Retirada Anual Segura"
        >
          ?
        </button>
      </div>

      <FireTrinityModal isOpen={showHint} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {profiles.map((p) => {
          const isSelected = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/40 text-orange-950 dark:text-orange-200 shadow-sm ring-1 ring-orange-200 dark:ring-orange-800/80'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-black">{p.label}</p>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-orange-200/80 dark:bg-orange-900/60 text-orange-900 dark:text-orange-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {p.multiplier}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">{p.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Seletor de Rentabilidade com Gate Pro ───────────────────────────────────

interface RateSelectorProps {
  value: number;
  onChange: (v: number) => void;
  isPro: boolean;
}

const RateSelector: React.FC<RateSelectorProps> = ({ value, onChange, isPro }) => {
  const presets = [
    { label: 'Conservador · 5% a.a.', value: 5 },
    { label: 'Moderado · 6% a.a.', value: 6 },
    { label: 'Crescimento · 8% a.a.', value: 8 },
  ];

  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp size={14} className="text-orange-500" />
          Rendimento Real Projetado (Acima da Inflação)
        </label>
        {!isPro && (
          <span className="flex items-center gap-1 text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
            <Lock size={9} /> Pro
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {presets.map((p) => {
          const isSelected = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              disabled={!isPro && p.value !== 6}
              onClick={() => isPro && onChange(p.value)}
              className={`p-3 rounded-2xl border text-center transition-all ${
                isSelected
                  ? 'border-orange-500 bg-orange-500 text-white font-black shadow-sm'
                  : isPro
                  ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold'
                  : p.value === 6
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200 font-bold'
                  : 'border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-center gap-1 text-xs">
                {!isPro && p.value !== 6 && <Lock size={10} />}
                <span>{p.label}</span>
              </div>
            </button>
          );
        })}
      </div>
      {!isPro && (
        <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
          Padrão fixado em 6% a.a. acima da inflação. Para calibrar cenários personalizados, assine o plano Pro.
        </p>
      )}
    </div>
  );
};

// ─── Seção Educativa (Acordeão) ──────────────────────────────────────────────

const TABS = [
  {
    id: 0,
    title: 'O que é o movimento FIRE?',
    icon: Flame,
    content:
      'FIRE significa "Financial Independence, Retire Early" (Independência Financeira, Aposentadoria Antecipada). O objetivo não é parar de trabalhar para ficar ocioso, mas sim acumular patrimônio suficiente para que os rendimentos cubram todos os seus custos de vida, permitindo que você trabalhe exclusivamente por escolha, com total autonomia sobre seu tempo.',
  },
  {
    id: 1,
    title: 'Como funciona a Regra dos 4%?',
    icon: BookOpen,
    content:
      'Criada pelo renomado Estudo Trinity, a regra demonstra que uma carteira diversificada em renda fixa e ações pode sustentar retiradas anuais de 4% (corrigidas pela inflação) por décadas sem esgotar o principal. Para descobrir sua meta: multiplique seu gasto anual por 25 (ou seu custo mensal por 300).',
  },
  {
    id: 2,
    title: 'Por que a soberania financeira importa?',
    icon: ShieldCheck,
    content:
      'Depender unicamente de salário mensal ou da previdência pública é um risco estrutural. Atingir seu Número da Liberdade devolve o controle da sua vida, protege sua família contra qualquer imprevisto e garante poder real de escolha.',
  },
  {
    id: 3,
    title: 'Qual taxa de retirada escolher?',
    icon: PieChart,
    content:
      '3% (Conservador): ideal para horizontes muito longos (40+ anos) ou cenários de maior cautela. 4% (Padrão): a referência global mais testada e equilibrada. 5% (Dinâmico): alcança a independência mais rápido, porém exige flexibilidade para reduzir despesas em períodos de crise.',
  },
];

const EducationalAccordeon: React.FC = () => {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="mt-8 space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Info size={14} className="text-slate-400 dark:text-slate-500" />
        <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Fundamentos da Metodologia FIRE
        </p>
      </div>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isOpen = open === tab.id;
        return (
          <div
            key={tab.id}
            className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : tab.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span className="flex items-center gap-3 text-sm font-black text-slate-800 dark:text-white">
                <Icon size={16} className="text-orange-500" />
                {tab.title}
              </span>
              {isOpen ? (
                <ChevronUp size={16} className="text-slate-400 dark:text-slate-500" />
              ) : (
                <ChevronDown size={16} className="text-slate-400 dark:text-slate-500" />
              )}
            </button>
            {isOpen && (
              <div className="px-5 pb-5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                {tab.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Tooltip do Gráfico ─────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-slate-900 text-white rounded-xl px-4 py-2.5 shadow-xl text-left border border-slate-800 pointer-events-none">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        {d.year === 0 ? 'Ponto Inicial (Hoje)' : `Ano ${d.year}`}
      </p>
      <p className="text-base font-black text-emerald-400 mt-0.5">
        {fmtMoney(d.patrimonio)}
      </p>
    </div>
  );
};

// ─── Tipagens da Planilha ───────────────────────────────────────────────────

export type { FireMonthlyRow, FireYearlyRow, CalculatedState };

// ─── Componente da Planilha Transparente e Memória de Cálculo ───────────────

interface FireSpreadsheetSectionProps {
  result: CalculatedState;
}

const FireSpreadsheetSection: React.FC<FireSpreadsheetSectionProps> = ({ result }) => {
  const [viewMode, setViewMode] = useState<'yearly' | 'monthly'>('yearly');
  const [selectedYear, setSelectedYear] = useState<number>(1);

  const totalYears = result.yearlyBreakdown.length;
  const currentYearMonthlyData = result.monthlyBreakdown.filter(
    (m) => m.year === selectedYear
  );

  const handleDownloadCSV = () => {
    if (!result || !result.monthlyBreakdown.length) return;

    const headers = [
      'Mes_Global',
      'Ano',
      'Mes_Do_Ano',
      'Saldo_Inicial_R$',
      'Aporte_Mensal_R$',
      'Rendimento_Juros_R$',
      'Saldo_Final_R$',
      'Renda_Passiva_Mensal_Gerada_R$',
      'Meta_FIRE_Atingida',
    ];

    const rows = result.monthlyBreakdown.map((r) => [
      r.month,
      r.year,
      r.monthInYear,
      r.startingBalance.toFixed(2),
      r.investment.toFixed(2),
      r.interest.toFixed(2),
      r.endingBalance.toFixed(2),
      r.passiveIncome.toFixed(2),
      r.isFireAchievedMonth ? 'SIM' : 'NAO',
    ]);

    const csvContent = [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `planilha_fire_financas_pro_invest.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalDeposited =
    result.currentWealth +
    result.monthlyBreakdown.reduce((acc, cur) => acc + cur.investment, 0);

  const totalInterestEarned = result.monthlyBreakdown.reduce(
    (acc, cur) => acc + cur.interest,
    0
  );

  const lastRow = result.monthlyBreakdown[result.monthlyBreakdown.length - 1];
  const finalBalance = lastRow ? lastRow.endingBalance : result.fireNumber;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm space-y-8">
      {/* Cabeçalho da Seção de Transparência */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h4 className="text-base md:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <TableIcon className="text-orange-500" size={20} />
            Transparência Matemática · Planilha de Evolução
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Entenda exatamente como cada centavo do seu dinheiro cresce mês a mês através dos juros compostos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCSV}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-orange-300 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-slate-700 dark:text-slate-200 hover:text-orange-900 dark:hover:text-orange-200 font-bold text-xs transition-all cursor-pointer"
          title="Baixar planilha completa em formato CSV para Excel ou Google Planilhas"
        >
          <Download size={14} className="text-orange-500" />
          <span>Baixar Planilha (.csv)</span>
        </button>
      </div>

      {/* Memória de Cálculo / Fórmulas Utilizadas */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Calculator size={16} className="text-orange-600 dark:text-orange-400" />
          <h5 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
            Memória de Cálculo e Fórmulas Oficiais
          </h5>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">1. Número FIRE</p>
            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
              Gasto × 12 ÷ Retirada
            </p>
            <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold mt-1">
              {fmtMoney(result.monthlyExpense)} × 12 ÷ {(result.withdrawalRate * 100).toFixed(0)}% ={' '}
              <strong>{fmtMoney(result.fireNumber)}</strong>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">2. Taxa Mensal Efetiva</p>
            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
              (1 + i_anual)^(1/12) - 1
            </p>
            <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold mt-1">
              (1 + {result.returnRate / 100})^(1/12) - 1 ={' '}
              <strong>{(result.monthlyRate * 100).toFixed(4)}% a.m.</strong>
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">3. Juros do Mês</p>
            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
              Saldo Inicial × Taxa Mensal
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Os juros incidem sobre o saldo acumulado antes do novo aporte.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">4. Renda Mensal Gerada</p>
            <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-1">
              Saldo × Retirada ÷ 12
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
              Mostra quanto de renda passiva mensal perpétua seu saldo já produz.
            </p>
          </div>
        </div>
      </div>

      {/* Resumo de Aportes Próprios vs Juros Gerados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Total do Seu Bolso (Aportes)
          </p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {fmtMoney(totalDeposited)}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            Capital investido por você
          </p>
        </div>

        <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl">
          <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Total Gerado por Juros
          </p>
          <p className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-1">
            {fmtMoney(totalInterestEarned)}
          </p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
            Efeito multiplicador da bola de neve
          </p>
        </div>

        <div className="p-4 bg-orange-50/70 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/80 rounded-2xl">
          <p className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-wider">
            Patrimônio Final Projetado
          </p>
          <p className="text-xl font-black text-orange-900 dark:text-orange-200 mt-1">
            {fmtMoney(finalBalance)}
          </p>
          <p className="text-[10px] text-orange-600 dark:text-orange-400 mt-0.5">
            Liberdade financeira garantida
          </p>
        </div>
      </div>

      {/* Seletor de Visão (Anual vs Mês a Mês) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setViewMode('yearly')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
              viewMode === 'yearly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Visão Consolidada Anual
          </button>
          <button
            type="button"
            onClick={() => setViewMode('monthly')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
              viewMode === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Detalhamento Mês a Mês
          </button>
        </div>

        {viewMode === 'monthly' && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Exibindo:</span>
            <button
              type="button"
              disabled={selectedYear <= 1}
              onClick={() => setSelectedYear((y) => Math.max(1, y - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-800 dark:text-slate-200 py-1.5 px-3 rounded-lg outline-none cursor-pointer"
            >
              {Array.from({ length: totalYears }, (_, i) => i + 1).map((y) => (
                <option key={y} value={y}>
                  Ano {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={selectedYear >= totalYears}
              onClick={() => setSelectedYear((y) => Math.min(totalYears, y + 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Dados */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-2xs">
        {viewMode === 'yearly' ? (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Ano</th>
                <th className="py-3.5 px-4 text-right">Saldo Inicial</th>
                <th className="py-3.5 px-4 text-right">Aportado no Ano</th>
                <th className="py-3.5 px-4 text-right">Juros Ganhos</th>
                <th className="py-3.5 px-4 text-right">Saldo Final</th>
                <th className="py-3.5 px-4 text-right">Renda Mensal Gerada</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {result.yearlyBreakdown.map((row) => (
                <tr
                  key={row.year}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                    row.isFireAchievedYear
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 font-bold border-l-4 border-l-emerald-500'
                      : ''
                  }`}
                >
                  <td className="py-3 px-4 font-black text-slate-900 dark:text-white">Ano {row.year}</td>
                  <td className="py-3 px-4 text-right">{fmtMoneyExact(row.startingBalance)}</td>
                  <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-bold">
                    {fmtMoneyExact(row.totalInvested)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                    +{fmtMoneyExact(row.totalInterest)}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                    {fmtMoneyExact(row.endingBalance)}
                  </td>
                  <td className="py-3 px-4 text-right text-orange-600 dark:text-orange-400 font-black">
                    {fmtMoneyExact(row.passiveIncome)}/mês
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.isFireAchievedYear ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                        🏁 Meta FIRE!
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                        {Math.min(
                          (row.endingBalance / result.fireNumber) * 100,
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-black border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Período</th>
                <th className="py-3.5 px-4 text-right">Saldo Inicial</th>
                <th className="py-3.5 px-4 text-right">Aporte do Mês</th>
                <th className="py-3.5 px-4 text-right">Juros do Mês</th>
                <th className="py-3.5 px-4 text-right">Saldo Final</th>
                <th className="py-3.5 px-4 text-right">Renda Mensal Gerada</th>
                <th className="py-3.5 px-4 text-center">Conquista</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {currentYearMonthlyData.map((row) => (
                <tr
                  key={row.month}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                    row.isFireAchievedMonth
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 font-bold border-l-4 border-l-emerald-500'
                      : ''
                  }`}
                >
                  <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                    Mês {row.month} <span className="text-slate-400 dark:text-slate-500 font-normal">({row.monthInYear}º do Ano {row.year})</span>
                  </td>
                  <td className="py-3 px-4 text-right">{fmtMoneyExact(row.startingBalance)}</td>
                  <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-bold">
                    {fmtMoneyExact(row.investment)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-bold">
                    +{fmtMoneyExact(row.interest)}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
                    {fmtMoneyExact(row.endingBalance)}
                  </td>
                  <td className="py-3 px-4 text-right text-orange-600 dark:text-orange-400 font-black">
                    {fmtMoneyExact(row.passiveIncome)}/mês
                  </td>
                  <td className="py-3 px-4 text-center">
                    {row.isFireAchievedMonth ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                        🏁 Atingiu o FIRE aqui!
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                        {Math.min(
                          (row.endingBalance / result.fireNumber) * 100,
                          100
                        ).toFixed(0)}
                        %
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};


// ─── Componente Principal ───────────────────────────────────────────────────

interface FireCalculatorToolProps {
  onNavigate: (route: string) => void;
  onCalcUpdate?: (data: { type: string; label: string; details: string }) => void;
  isAuthenticated: boolean;
  isPro?: boolean;
  isPremium?: boolean;
}

export const FireCalculatorTool: React.FC<FireCalculatorToolProps> = ({
  onNavigate,
  onCalcUpdate,
  isAuthenticated,
  isPro = false,
  isPremium = false,
}) => {
  // Estado dos Inputs (não recalcula sozinho ao digitar)
  const [expense, setExpense] = useState<number | ''>(5000);
  const [currentWealth, setCurrentWealth] = useState<number | ''>(0);
  const [monthlyInvestment, setMonthlyInvestment] = useState<number | ''>(1000);
  const [withdrawalRate, setWithdrawalRate] = useState<number>(0.04);
  const [returnRate, setReturnRate] = useState<number>(6);
  const [currentAge, setCurrentAge] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Estado do Resultado (só preenchido após clicar no botão Calcular)
  const [result, setResult] = useState<CalculatedState | null>(null);

  // Integração com dados reais do ecossistema Finanças Pro Invest
  const { user, userMeta } = useAuth();
  const { totalInvestments, patrimonioLiquido } = useWealthData();
  const { transactions } = useTransactions(user?.uid);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Média de despesas reais do app
  const realMonthlyExpense = useMemo(() => {
    if (userMeta?.financialProfile?.monthlyExpenseBudget && userMeta.financialProfile.monthlyExpenseBudget > 0) {
      return Math.round(userMeta.financialProfile.monthlyExpenseBudget);
    }
    if (!transactions || transactions.length === 0) return 0;
    const expenseTxs = transactions.filter(t => t.tipo === 'despesa' && !t.isIgnoredInStats);
    if (expenseTxs.length === 0) return 0;
    const byMonth: Record<string, number> = {};
    for (const tx of expenseTxs) {
      const monthKey = tx.data ? tx.data.substring(0, 7) : '';
      if (monthKey) {
        byMonth[monthKey] = (byMonth[monthKey] || 0) + (Number(tx.valor) || 0);
      }
    }
    const months = Object.keys(byMonth);
    if (months.length === 0) return 0;
    const total = Object.values(byMonth).reduce((a, b) => a + b, 0);
    return Math.round(total / months.length);
  }, [transactions, userMeta]);

  // Idade cadastrada no perfil
  const detectedAge = useMemo(() => {
    if (userMeta?.idade && Number(userMeta.idade) > 0) return String(userMeta.idade);
    if (userMeta?.dataNascimento) {
      const birthYear = new Date(userMeta.dataNascimento).getFullYear();
      if (birthYear > 1900) {
        const calculated = new Date().getFullYear() - birthYear;
        if (calculated > 0 && calculated < 120) return String(calculated);
      }
    }
    return '';
  }, [userMeta]);

  const handleSyncRealData = () => {
    let synced = false;
    const actualInvestments = totalInvestments > 0 ? totalInvestments : (patrimonioLiquido > 0 ? patrimonioLiquido : 0);

    if (actualInvestments > 0) {
      setCurrentWealth(actualInvestments);
      synced = true;
    }
    if (realMonthlyExpense > 0) {
      setExpense(realMonthlyExpense);
      synced = true;
    }
    if (detectedAge && !currentAge) {
      setCurrentAge(detectedAge);
      synced = true;
    }

    if (synced) {
      const parts: string[] = [];
      if (actualInvestments > 0) parts.push(`${fmtMoney(actualInvestments)} em investimentos`);
      if (realMonthlyExpense > 0) parts.push(`${fmtMoney(realMonthlyExpense)}/mês em despesas médias`);
      if (detectedAge) parts.push(`${detectedAge} anos de idade`);
      setSyncNotice(`✓ Dados sincronizados do seu app: ${parts.join(' e ')}.`);
    } else {
      setSyncNotice('Nenhum investimento ou despesa registrado ainda no app. Você pode preencher os campos abaixo livremente.');
    }
  };

  const handleSaveGoal = () => {
    if (!result) return;
    const goalName = 'Independência Financeira (FIRE)';
    const monthlyAporte = result.monthlyInvestment > 0 ? result.monthlyInvestment : (result.minMonthly || 500);
    const targetNumber = result.fireNumber;
    const query = `action=new&nome=${encodeURIComponent(goalName)}&valor=${encodeURIComponent(String(monthlyAporte))}&metaAlvo=${encodeURIComponent(String(targetNumber))}`;
    onNavigate(`metas?${query}`);
  };

  // Referência para rolar até o resultado de forma suave
  const resultsSectionRef = useRef<HTMLDivElement>(null);

  // ── Função de Cálculo Executada Somente sob Demanda ───────────────────────
  const handleCalculate = () => {
    setFormError('');

    const exp = Number(expense) || 0;
    const wealth = Number(currentWealth) || 0;
    const monthly = Number(monthlyInvestment) || 0;
    const rate = isPro ? returnRate : 6;
    const ageNum = currentAge !== '' ? parseInt(currentAge, 10) : null;

    if (exp <= 0) {
      setFormError('Informe o custo mensal que você deseja ter na sua independência.');
      return;
    }

    const fireNumber = exp * (12 / withdrawalRate);
    const monthlyRate = Math.pow(1 + rate / 100, 1 / 12) - 1;
    const alreadyFire = wealth >= fireNumber;

    let months = 0;
    let balance = wealth;

    if (!alreadyFire && monthly > 0 && monthlyRate > 0) {
      while (balance < fireNumber && months < 1200) {
        balance = balance * (1 + monthlyRate) + monthly;
        months++;
      }
    }

    const yearsToFire = alreadyFire ? 0 : balance >= fireNumber ? months / 12 : null;
    const percentageDone = Math.min((wealth / fireNumber) * 100, 100);

    // Sugestão de aporte mínimo para 30 anos caso o atual não alcance
    let minMonthly: number | null = null;
    if (!alreadyFire && (monthly === 0 || yearsToFire === null) && monthlyRate > 0) {
      const targetMonths = 360;
      const r = monthlyRate;
      const fv = fireNumber;
      const pv = wealth;
      minMonthly = Math.ceil(
        (fv - pv * Math.pow(1 + r, targetMonths)) /
          ((Math.pow(1 + r, targetMonths) - 1) / r)
      );
    }

    // Trajetória patrimonial para o gráfico
    const trajectory: { year: number; patrimonio: number }[] = [];
    const maxMonths = alreadyFire ? 12 : Math.min((months || 360) + 24, 600);
    let runningBal = wealth;

    for (let mo = 0; mo <= maxMonths; mo += 6) {
      trajectory.push({
        year: Math.round((mo / 12) * 10) / 10,
        patrimonio: Math.round(runningBal),
      });
      for (let i = 0; i < 6; i++) {
        runningBal = runningBal * (1 + monthlyRate) + monthly;
      }
    }

    // ── Geração da Planilha Mês a Mês Completa ─────────────────────────────
    const monthlyBreakdown: FireMonthlyRow[] = [];
    const yearlyBreakdown: FireYearlyRow[] = [];

    // Limitar o cálculo da planilha até 2 anos pós-FIRE ou 30 anos (360 meses)
    const breakdownTotalMonths = alreadyFire
      ? 24
      : Math.min((months || 360) + 24, 360);

    let curBalance = wealth;
    let fireTriggered = alreadyFire;

    let currentYearInvested = 0;
    let currentYearInterest = 0;
    let currentYearStart = wealth;

    for (let m = 1; m <= breakdownTotalMonths; m++) {
      const yearIndex = Math.ceil(m / 12);
      const monthInYear = ((m - 1) % 12) + 1;

      const start = curBalance;
      const interest = start * monthlyRate;
      const invest = monthly;
      const end = start + interest + invest;
      const passiveInc = end * (withdrawalRate / 12);

      let isFireAchievedMonth = false;
      if (!fireTriggered && end >= fireNumber) {
        isFireAchievedMonth = true;
        fireTriggered = true;
      }

      monthlyBreakdown.push({
        month: m,
        year: yearIndex,
        monthInYear,
        startingBalance: start,
        investment: invest,
        interest,
        endingBalance: end,
        passiveIncome: passiveInc,
        isFireAchievedMonth,
      });

      currentYearInvested += invest;
      currentYearInterest += interest;
      curBalance = end;

      // Ao fechar 12 meses ou no último mês do loop, consolidar o ano
      if (monthInYear === 12 || m === breakdownTotalMonths) {
        const isFireAchievedYear =
          monthlyBreakdown
            .filter((row) => row.year === yearIndex)
            .some((row) => row.isFireAchievedMonth) || (alreadyFire && yearIndex === 1);

        yearlyBreakdown.push({
          year: yearIndex,
          startingBalance: currentYearStart,
          totalInvested: currentYearInvested,
          totalInterest: currentYearInterest,
          endingBalance: end,
          passiveIncome: passiveInc,
          isFireAchievedYear,
        });

        currentYearStart = end;
        currentYearInvested = 0;
        currentYearInterest = 0;
      }
    }

    const fireYear =
      yearsToFire !== null && yearsToFire > 0
        ? Math.round(yearsToFire * 10) / 10
        : null;

    const arrivalAge =
      ageNum !== null && ageNum > 0 && yearsToFire !== null
        ? Math.round(ageNum + yearsToFire)
        : null;

    const newResult: CalculatedState = {
      fireNumber,
      yearsToFire,
      percentageDone,
      alreadyFire,
      minMonthly,
      trajectory,
      fireYear,
      arrivalAge,
      monthlyExpense: exp,
      monthlyInvestment: monthly,
      currentWealth: wealth,
      withdrawalRate,
      returnRate: rate,
      monthlyRate,
      monthlyBreakdown,
      yearlyBreakdown,
    };

    setResult(newResult);

    if (onCalcUpdate) {
      onCalcUpdate({
        type: 'FIRE',
        label: 'Calculadora FIRE',
        details: `Meta: ${fmtMoney(fireNumber)} | Faltam: ${
          yearsToFire !== null ? yearsToFire.toFixed(1) + ' anos' : 'Rever aportes'
        }`,
      });
    }

    // Rola suavemente até o painel de resultados
    setTimeout(() => {
      resultsSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 120);
  };

  const handleReset = () => {
    setExpense(5000);
    setCurrentWealth(0);
    setMonthlyInvestment(1000);
    setWithdrawalRate(0.04);
    setReturnRate(6);
    setCurrentAge('');
    setFormError('');
    setSyncNotice(null);
    setResult(null);
  };

  if (!isAuthenticated) {
    return (
      <ToolGate
        title="Calculadora FIRE"
        description="Descubra o número exato que você precisa acumular para viver de renda — com rigor matemático e segurança."
        onNavigate={onNavigate}
      />
    );
  }

  return (
    <ToolLayout
      title="Calculadora FIRE"
      icon={<Flame size={36} className="text-orange-500" />}
      onBack={onNavigate}
      description="Veja quanto tempo você ainda precisa trabalhar para conseguir a sua independência financeira."
      badge="Tempo de Trabalho Real"
    >
      <div className="max-w-4xl mx-auto space-y-10">
        {/* ── Formulário Principal de Entrada ──────────────────────────── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 md:p-10 shadow-sm space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Sparkles className="text-orange-500" size={22} />
              Defina seus parâmetros
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Preencha com tranquilidade. Os cálculos serão realizados ao clicar no botão abaixo.
            </p>
          </div>

          {/* Sincronização inteligente com dados reais do app */}
          {isAuthenticated && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-4 bg-gradient-to-r from-emerald-50/90 via-white to-orange-50/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-orange-950/30 border border-emerald-200/90 dark:border-emerald-800/80 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Zap size={18} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span>Sincronizar com Meus Dados Reais do App</span>
                    {(totalInvestments > 0 || realMonthlyExpense > 0) && (
                      <span className="text-[9px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full uppercase">
                        Disponível
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Puxa seu patrimônio investido e custo mensal real sem você precisar digitar tudo.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncRealData}
                className="self-start sm:self-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Sparkles size={14} />
                <span>Usar Meus Dados Reais</span>
              </button>
            </div>
          )}

          {syncNotice && (
            <div className="p-3.5 bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 animate-in fade-in duration-300">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{syncNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MoneyInput
              label="Quanto você quer gastar por mês quando for livre?"
              icon={Target}
              value={expense}
              onChange={setExpense}
              hint="O custo de vida desejado para cobrir todas as despesas pessoais, lazer, saúde e moradia."
            />

            <MoneyInput
              label="Quanto você já tem investido hoje?"
              icon={Wallet}
              value={currentWealth}
              onChange={setCurrentWealth}
              hint="O patrimônio líquido investido com liquidez ou rendimentos financeiros."
            />

            <MoneyInput
              label="Quanto você consegue investir por mês?"
              icon={TrendingUp}
              value={monthlyInvestment}
              onChange={setMonthlyInvestment}
              hint="O valor mensal que você consegue poupar e direcionar para seus investimentos."
            />

            {/* Idade atual com input seguro (sem captura do scroll do mouse) */}
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={14} className="text-orange-500 shrink-0" />
                Sua idade atual (opcional)
              </label>
              <div className="relative flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-100 dark:focus-within:ring-orange-950/60 transition-all">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  value={currentAge}
                  onChange={(e) => setCurrentAge(e.target.value.replace(/\D/g, ''))}
                  placeholder="Ex: 32"
                  className="w-full bg-transparent py-4 px-4 text-slate-900 dark:text-white font-black text-lg outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          <WithdrawalSelector value={withdrawalRate} onChange={setWithdrawalRate} />
          <RateSelector value={returnRate} onChange={setReturnRate} isPro={isPro || isPremium} />

          {formError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-2xl text-xs font-bold text-red-600 dark:text-red-300 flex items-center gap-2">
              <span>⚠️</span>
              {formError}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleCalculate}
              className="w-full sm:flex-1 py-4 px-8 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-lg shadow-orange-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Flame size={18} />
              {result ? 'Recalcular Minha Liberdade' : 'Calcular Minha Liberdade'}
            </button>

            {result && (
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto py-4 px-6 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={16} />
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* ── Bloco de Resultados (Exibido após o clique em Calcular) ───── */}
        {result && (
          <div
            ref={resultsSectionRef}
            className="space-y-8 animate-in fade-in duration-300"
          >
            {/* Card Principal: Número da Liberdade */}
            <div className="bg-gradient-to-br from-white to-orange-50/50 dark:from-slate-900 dark:to-orange-950/20 border border-orange-200/80 dark:border-orange-800/80 rounded-[2.5rem] p-7 md:p-10 shadow-sm text-center">
              <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 bg-orange-100/70 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 px-3 py-1 rounded-full uppercase tracking-widest inline-block mb-3">
                Seu Número da Liberdade
              </span>

              <h3 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
                {fmtMoney(result.fireNumber)}
              </h3>

              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto mt-2 font-medium">
                Com esse patrimônio investido, você retira{' '}
                <strong className="text-slate-900 dark:text-white">{fmtMoney(result.monthlyExpense)}/mês</strong>{' '}
                completamente livres, preservando seu capital ano a ano.
              </p>

              {/* Barra de Progresso */}
              <div className="mt-8 max-w-lg mx-auto space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
                  <span>Progresso do seu patrimônio</span>
                  <span className="text-orange-600 dark:text-orange-400 font-black">
                    {result.percentageDone.toFixed(1)}%
                  </span>
                </div>
                <div className="h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${result.percentageDone}%` }}
                  />
                </div>
                {!result.alreadyFire && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-right">
                    Faltam {fmtMoney(result.fireNumber - result.currentWealth)} para a meta
                  </p>
                )}
              </div>

              {/* Status e Tempo de Espera */}
              <div className="mt-8 max-w-lg mx-auto">
                {result.alreadyFire ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 text-center space-y-2">
                    <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                    <p className="text-lg font-black text-emerald-800 dark:text-emerald-200">
                      Você já conquistou seu Número FIRE!
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                      Seu patrimônio atual já cobre {result.percentageDone.toFixed(0)}% do seu custo de vida
                      desejado com total segurança matemática.
                    </p>
                  </div>
                ) : result.yearsToFire !== null ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex items-center justify-center gap-5 shadow-sm">
                    <div className="bg-orange-50 dark:bg-orange-950/50 p-4 rounded-2xl text-orange-500 dark:text-orange-400 shrink-0">
                      <Clock size={28} />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider">
                        Tempo Estimado com Seus Aportes
                      </p>
                      <p className="text-3xl font-black text-slate-900 dark:text-white">
                        {result.yearsToFire.toFixed(1)}{' '}
                        <span className="text-base text-slate-500 dark:text-slate-400 font-bold">anos</span>
                      </p>
                      {result.arrivalAge !== null && (
                        <p className="text-xs font-black text-orange-600 dark:text-orange-400 mt-0.5">
                          Você alcançará sua liberdade aos {result.arrivalAge} anos
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-left space-y-2">
                    <p className="text-sm font-black text-amber-800 dark:text-amber-200 flex items-center gap-2">
                      <span>💡</span> Aporte atual insuficiente para fechar em prazo hábil
                    </p>
                    {result.minMonthly !== null && result.minMonthly > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        Para atingir a liberdade em até 30 anos com a taxa selecionada, seu aporte mensal
                        precisaria ser de aproximadamente{' '}
                        <strong className="font-black text-amber-900 dark:text-amber-100">
                          {fmtMoney(result.minMonthly)}/mês
                        </strong>
                        .
                      </p>
                    )}
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      Dica: você também pode calibrar o custo mensal desejado para um valor mais enxuto na fase inicial.
                    </p>
                  </div>
                )}
              </div>

              {/* Botão de Salvar como Meta */}
              {!result.alreadyFire && (
                <div className="mt-8 max-w-sm mx-auto">
                  <button
                    type="button"
                    onClick={handleSaveGoal}
                    className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <span>Salvar Meta de Aporte no Meu Painel</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* ── Alavanca do Tempo de Trabalho (Sensibilidade de Cortes) ── */}
            <FireSensitivityPanel result={result} />

            {/* ── Marcos Intermediários de Soberania (Coast FIRE & Barista) ─ */}
            <FireMilestonesPanel
              result={result}
              currentAgeNum={currentAge !== '' ? parseInt(currentAge, 10) : null}
            />

            {/* Gráfico de Projeção Patrimonial */}
            {result.trajectory.length > 1 && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 md:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp size={18} className="text-orange-500" />
                      Curva de Acúmulo de Patrimônio
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Evolução projetada com aportes contínuos e reinvestimento de juros
                    </p>
                  </div>

                  {result.fireYear !== null && (
                    <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full self-start sm:self-auto">
                      Independência no Ano {result.fireYear}
                    </span>
                  )}
                </div>

                {/* Container do Gráfico com toque vertical nativo liberado */}
                <div className="w-full h-64 md:h-72" style={{ touchAction: 'pan-y' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={result.trajectory}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="fireChartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis
                        dataKey="year"
                        tickFormatter={(v) => (v === 0 ? 'Hoje' : `${v}a`)}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v) =>
                          v >= 1_000_000
                            ? `${(v / 1_000_000).toFixed(1)}M`
                            : v >= 1_000
                            ? `${(v / 1_000).toFixed(0)}k`
                            : `${v}`
                        }
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine
                        y={result.fireNumber}
                        stroke="#f97316"
                        strokeDasharray="5 3"
                        strokeWidth={1.5}
                        label={{
                          value: 'Meta FIRE',
                          position: 'top',
                          fontSize: 10,
                          fill: '#ea580c',
                          fontWeight: 800,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="patrimonio"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        fill="url(#fireChartGrad)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#f97316', stroke: '#ffffff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span>Projeção com taxa real de {result.returnRate}% a.a.</span>
                  <span>Linha tracejada laranja: Meta calculada</span>
                </div>
              </div>
            )}

            {/* ── Planilha Detalhada e Memória de Cálculo ───────────────── */}
            <FireSpreadsheetSection result={result} />
          </div>
        )}

        {/* ── Acordeão com Explicações da Metodologia ──────────────────── */}
        <EducationalAccordeon />
      </div>
    </ToolLayout>
  );
};

export default FireCalculatorTool;
