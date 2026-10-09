import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useFirebase } from '../../../hooks/useFirebase';
import { collection, query, orderBy, getDocs, doc, updateDoc, addDoc, deleteDoc, limit } from 'firebase/firestore';
import { firestore } from '../../../firebase';
import { eventBus } from '../../../core/orchestration/event-bus';
import { createDomainEvent, EVENT_TYPES } from '../../../core/orchestration/domainEvents';
import type { DebtCreatedEvent, DebtUpdatedEvent, DebtDeletedEvent } from '../../../core/orchestration/domainEvents';
import {
  Plus, Trash2, Pencil, X,
  Sparkles,
  TrendingUp, ShieldCheck,
  LayoutGrid, List, History, ChevronRight, ChevronDown,
  ArrowLeft, AlertCircle, BookOpen
} from 'lucide-react';
import { DebtProjectionDrawer } from './DebtProjectionDrawer';
import { DebtUpgradeModal } from './DebtUpgradeModal';
import { DebtNexusFeed } from './DebtNexusFeed';
import { DebtAmortizationModal } from './DebtAmortizationModal';
import { useWealthData } from '../../../hooks/useWealthData';
import { useWealthHistory } from '../../../hooks/useWealthHistory';
import { useEntitlement } from '../../../hooks/useEntitlement';
import { useSovereignSnapshot } from '../../../hooks/useSovereignSnapshot';
import { useExclusionAmount } from '../../../contexts/ExclusionsContext';
import { useDebtAdvisor } from '../../../hooks/useDebtAdvisor';
import { useTransactions } from '../../../hooks/useTransactions';
import { fetchCurrentSelicRate } from '../buy-cash-or-installments/selicService';
import { DebtPlanSimulator } from '../DebtPlanSimulator';
import type { DebtCommand } from '../../../services/debt/advisor.types';
import { useDebts, useAmortizeDebt } from '../../../services/debt';
import type { DebtItem } from '../../../services/debt';
import { revertRotativoConversion, settleRotativoConversion, amortizeRotativoDebt } from '../../../services/rotativoService';
import { hasInterestBeenAppliedThisMonth, computeRotativoMonthlyInterest } from '../../../services/rotativo.math';
import { rankDebts, computeMonthlyImpact, convertAnnualToMonthlyRate, InterestRatePeriod } from '../../../services/debt/debt.math';
import { MANUAL_DEBT_TYPES, MANUAL_DEBT_TYPE_OPTIONS } from '../../../services/debt/debt.constants';
import { useToast } from '../../../contexts/ToastContext';
import { RotativoInterestReport } from './RotativoInterestReport';
import { DebtFormCard } from './debts/DebtFormCard';
import { DebtListSection } from './debts/DebtListSection';
import type { DebtAdjustmentType, DebtAdjustmentConfig, DebtSeries } from '../../../services/debt/debt.types';

interface SavedDebtPlan {
  id: string;
  title: string;
  planMarkdown: string;
  createdAt?: any;
  updatedAt?: any;
}

interface DebtManagerProps {
  userId: string | undefined;
  userMeta: any;
  lancamentos: any[];
  onNavigate?: (route: string) => void;
  isSyncing?: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const fixMojibake = (text?: string) => {
  if (!text) return '';
  return text
    .replace(/Plano de quitao/g, 'Plano de quitação')
    .replace(/Ã§/g, 'ç')
    .replace(/Ã£/g, 'ã')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã /g, 'à')
    .replace(/Ã¢/g, 'â')
    .replace(/Ãª/g, 'ê')
    .replace(/Ã©/g, 'é')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãµ/g, 'õ')
    .replace(/Ãº/g, 'ú')
    .replace(/â€“/g, '—')
    .replace(/â€"/g, '—')
    .normalize('NFC');
};

const STRIPE_COLORS: Record<string, string> = {
  [MANUAL_DEBT_TYPES.ROTATIVO]: 'bg-rose-500',
  [MANUAL_DEBT_TYPES.PESSOAL]: 'bg-orange-400',
  [MANUAL_DEBT_TYPES.FINANCIAMENTO]: 'bg-blue-500',
  [MANUAL_DEBT_TYPES.CHEQUE_ESPECIAL]: 'bg-red-600',
  [MANUAL_DEBT_TYPES.CONSIGNADO]: 'bg-teal-500',
  [MANUAL_DEBT_TYPES.OUTRO]: 'bg-slate-400',
};

const EMPTY_FORM: DebtItem = {
  nome: '',
  tipo: 'Empréstimo pessoal',
  saldoDevedor: 0,
  taxaMensal: 0,
  parcelasRestantes: 0,
  valorParcela: 0,
  dataVencimento: null,
  proposito: '',
  totalParcelas: 0,
  parcelasPagas: 0,
  historicoPagamentos: [],
  adjustmentConfig: {
    type: 'fixed',
    series: [],
    frequency: 'monthly',
  },
  currentSeriesIndex: 0,
  nextAdjustmentDate: null,
};

export const DebtManager: React.FC<DebtManagerProps> = ({ userId, userMeta, onNavigate }) => {
  const { effectiveTier } = useEntitlement();
  const isPro = effectiveTier !== 'free';
  const { addToast } = useToast();
  const [showUpgradeModal, setShowUpgradeModal] = useState<{title: string, description: string} | null>(null);
  
  const { transactions } = useTransactions(userId);

  const reserveTarget = userMeta?.financialProfile?.emergencyReserveTarget || 0;
  const colchaoTarget = userMeta?.financialProfile?.colchaoInicialTarget || 0;
  const exclusionAmount = useExclusionAmount(reserveTarget, colchaoTarget);

  const sovereign = useSovereignSnapshot(transactions, userMeta, false, undefined, exclusionAmount);
  
  const { data: debtsData, isLoading } = useDebts(userId);
  const debts = debtsData || [];
  
  const commands = useDebtAdvisor(debts, sovereign);

  const { totalAssets, totalInvestments, totalProperty, patrimonioLiquido, totalDebts: realTotalDebts } = useWealthData();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { saveSnapshot, isSaving: isSavingSnapshot } = useWealthHistory(userId);

  const [showSimulator, setShowSimulator] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<DebtItem>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Adjustment config state (extracted for easier form handling)
  const [adjustmentType, setAdjustmentType] = useState<DebtAdjustmentType>('fixed');
  const [annualPercentRate, setAnnualPercentRate] = useState<number | undefined>(undefined);
  const [frequency, setFrequency] = useState<'monthly' | 'quarterly' | 'semi_annual' | 'annual'>('monthly');
  const [series, setSeries] = useState<DebtSeries[]>([]);

  // Interest rate period state (monthly vs annual)
  const [interestRatePeriod, setInterestRatePeriod] = useState<InterestRatePeriod>('monthly');
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('debt_view_mode') as 'grid' | 'list') || 'list';
  });
  const [showForm, setShowForm] = useState(true);
  const hasInitialized = useRef(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedDebtForProjection, setSelectedDebtForProjection] = useState<DebtItem | null>(null);
  const [selectedDebtForAmortization, setSelectedDebtForAmortization] = useState<DebtItem | null>(null);
  const [savedPlans, setSavedPlans] = useState<SavedDebtPlan[]>([]);
  const [selicRate, setSelicRate] = useState<number>(10.75);
  const [applyingInterestId, setApplyingInterestId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentSelicRate().then(rate => setSelicRate(rate || 10.75));
  }, []);

  useEffect(() => {
    if (!userId) return;
    const loadPlans = async () => {
      const q = query(
        collection(firestore, 'users', userId, 'nexusDebtPlans'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const snap = await getDocs(q);
      const plans = snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedDebtPlan));
      setSavedPlans(plans);
    };
    loadPlans();
  }, [userId]);

  useEffect(() => {
    if (!isLoading && !hasInitialized.current) {
      hasInitialized.current = true;
      if (debts.length > 0) setShowForm(false);
    }
  }, [isLoading, debts.length]);

  useEffect(() => {
    if (editingId) setShowForm(true);
  }, [editingId]);

  const handleCommandAction = (cmd: DebtCommand) => {
    if (cmd.action === 'open_projection' && cmd.metadata?.debtId) {
      const debt = debts.find(d => d.id === cmd.metadata.debtId);
      if (debt) setSelectedDebtForProjection(debt);
    } else if (cmd.action === 'open_validation') {
      setShowConfirmModal(true);
    } else if (cmd.action === 'open_crisis_mode') {
      onNavigate && onNavigate('controla');
    }
  };

  const { isPending: isAmortizing } = useAmortizeDebt(userId || '');

  const handleOpenAmortization = (debt: DebtItem) => {
    setSelectedDebtForAmortization(debt);
  };

  const handleAmortizeExtra = (amount: number) => {
      alert(`Fluxo para registrar pagamento de R$ ${amount} disparado!`);
      setSelectedDebtForProjection(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    if (!isPro && debts.length >= 3 && !editingId) {
        setShowUpgradeModal({
          title: "Limite de dívidas atingido",
          description: "Sua estratégia de desalavancagem está ficando robusta. Assine o plano Pro para cadastrar dívidas ilimitadas e desbloquear o motor de quitação acelerada."
        });
        return;
    }

    setIsSubmitting(true);
    try {
      // Build adjustmentConfig from state
      const buildAdjustmentConfig = (): DebtAdjustmentConfig | undefined => {
        if (adjustmentType === 'fixed') {
          return { type: 'fixed', series: [], frequency: 'monthly' };
        }
        if (adjustmentType === 'annual_percent') {
          return {
            type: 'annual_percent',
            annualPercentRate,
            series,
            frequency,
          };
        }
        if (adjustmentType === 'manual_series') {
          return {
            type: 'manual_series',
            series,
            frequency,
          };
        }
        return undefined;
      };

      const totalParcelas = form.totalParcelas || form.parcelasRestantes;
      const parcelasPagas = form.parcelasPagas || 0;
      
      // Convert annual rate to monthly if user entered annual rate
      let taxaMensalToSave = form.taxaMensal;
      if (interestRatePeriod === 'annual' && form.taxaMensal > 0) {
        taxaMensalToSave = convertAnnualToMonthlyRate(form.taxaMensal);
      }

      const debtData = {
        ...form,
        saldoDevedor: Math.max(0, form.saldoDevedor || 0),
        valorParcela: Math.max(0, form.valorParcela || 0),
        parcelasRestantes: Math.max(0, form.parcelasRestantes || 0),
        totalParcelas,
        parcelasPagas,
        updatedAt: new Date(),
        proposito: form.proposito || '',
        taxaMensal: taxaMensalToSave,
        adjustmentConfig: buildAdjustmentConfig(),
        currentSeriesIndex: 0,
        nextAdjustmentDate: null,
      };

      if (editingId) {
        const previousDebt = debts.find(d => d.id === editingId);
        await updateDoc(doc(firestore, 'users', userId, 'dividas', editingId), debtData);

        if (previousDebt?.originType === 'rotativo_cartao' && (form.saldoDevedor || 0) <= 0) {
          await settleRotativoConversion(userId, { ...previousDebt, ...debtData } as DebtItem);
        }

        await eventBus.publish(createDomainEvent<DebtUpdatedEvent['payload']>(
          'debt',
          EVENT_TYPES.debt.updated,
          {
            debtId: editingId,
            userId,
            previousDebt: previousDebt || null,
            changes: debtData,
          },
          'DebtManager.handleSave'
        ));
      } else {
        const newRef = await addDoc(collection(firestore, 'users', userId, 'dividas'), {
          ...debtData,
          createdAt: new Date()
        });
        await eventBus.publish(createDomainEvent<DebtCreatedEvent['payload']>(
          'debt',
          EVENT_TYPES.debt.created,
          {
            debt: { ...debtData, id: newRef.id } as DebtItem,
            userId,
          },
          'DebtManager.handleSave'
        ));
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      setAdjustmentType('fixed');
      setAnnualPercentRate(undefined);
      setFrequency('monthly');
      setSeries([]);
      setInterestRatePeriod('monthly');
      addToast(
        editingId
          ? 'Dívida atualizada. Continue monitorando sua evolução.'
          : 'Dívida cadastrada. O Nexus pode traçar uma estratégia de quitação.',
        'success'
      );
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar dívida.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (debt: DebtItem) => {
    setForm({ ...debt, proposito: debt.proposito || '' });
    setEditingId(debt.id || null);
    
    // Populate adjustment config state
    const config = debt.adjustmentConfig;
    if (config) {
      setAdjustmentType(config.type);
      setAnnualPercentRate(config.annualPercentRate);
      setFrequency(config.frequency ?? 'monthly');
      setSeries(config.series ?? []);
    } else {
      setAdjustmentType('fixed');
      setAnnualPercentRate(undefined);
      setFrequency('monthly');
      setSeries([]);
      setInterestRatePeriod('monthly');
    }
    
    setTimeout(() => document.getElementById('wealth-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  const handleDelete = async (id: string) => {
    if (!userId || !window.confirm("Excluir esta dívida?")) return;
    const previousDebt = debts.find(d => d.id === id);

    if (previousDebt?.originType === 'rotativo_cartao') {
      await revertRotativoConversion(userId, previousDebt);
      addToast('Dívida rotativa revertida. A fatura original foi restaurada.', 'info');
      return;
    }

    await deleteDoc(doc(firestore, 'users', userId, 'dividas', id));
    if (previousDebt) {
      await eventBus.publish(createDomainEvent<DebtDeletedEvent['payload']>(
        'debt',
        EVENT_TYPES.debt.deleted,
        {
          debtId: id,
          userId,
          previousDebt,
        },
        'DebtManager.handleDelete'
      ));
    }
  };

  const handleApplyInterest = async (debt: DebtItem) => {
    if (!userId || !debt.id) return;
    setApplyingInterestId(debt.id);
    try {
      const result = await amortizeRotativoDebt(userId, debt);
      if (result.success) {
        addToast(`Juros de ${formatCurrency(result.interest || 0)} aplicados com sucesso. Novo saldo: ${formatCurrency(result.newSaldo || 0)}`, 'success');
      } else {
        addToast(result.error || 'Erro ao aplicar juros', 'error');
      }
    } catch {
      addToast('Erro ao aplicar juros', 'error');
    } finally {
      setApplyingInterestId(null);
    }
  };

  const handleConfirmSaldos = async () => {
    try {
      await saveSnapshot({
        totalNetWorth: patrimonioLiquido,
        totalAssets: totalAssets,
        totalInvestments: totalInvestments,
        totalProperty: totalProperty,
        totalDebts: realTotalDebts,
        module: 'debts'
      });
      setShowConfirmModal(false);
      alert("Dívidas validadas com sucesso!");
    } catch (err) {
      console.error(err);
    }
  };

  const totalSaldo = debts.reduce((acc: number, d: DebtItem) => acc + (d.saldoDevedor || 0), 0);

  const criticalDebt = useMemo(() => {
    if (debts.length === 0) return null;
    return [...debts].sort((a, b) => (b.taxaMensal || 0) - (a.taxaMensal || 0))[0];
  }, [debts]);

  const rankings = useMemo(() => rankDebts(debts, sovereign?.heroValue), [debts, sovereign?.heroValue]);
  const topDebtId = rankings[0]?.debt?.id;

  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const highlightDebtId = (location.state as any)?.highlightDebtId || searchParams.get('highlight');
  const viewParam = searchParams.get('view');

  useEffect(() => {
    if (viewParam === 'estrategia' || viewParam === 'simulador') {
      setShowSimulator(true);
    }
  }, [viewParam]);

  useEffect(() => {
    if (!highlightDebtId) return;
    const targetRanking = rankings.find(r => r.debt.id === highlightDebtId);
    if (targetRanking) {
      setTimeout(() => {
        const el = document.getElementById(`debt-${highlightDebtId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      setSelectedDebtForProjection(targetRanking.debt);
    }
  }, [highlightDebtId, rankings]);

  const totalRemainingParcelas = useMemo(() => {
    return debts.reduce((acc, d) => acc + (d.parcelasRestantes || 0), 0);
  }, [debts]);

  if (showSimulator && userId) {
    return (
      <DebtPlanSimulator 
        userId={userId} 
        onBack={() => setShowSimulator(false)} 
        userMeta={userMeta}
        selicRate={selicRate}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8 animate-in fade-in duration-500 pb-32">
      {/* Breadcrumb + Título da Página (fora do card) */}
      <div className="flex flex-col gap-3">
        {onNavigate && (
          <button
            onClick={() => onNavigate('home')}
            className="w-fit flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 transition-all font-black uppercase text-[10px] tracking-[0.2em]"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
        )}
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500">
          Minhas Dívidas
        </h1>
      </div>

      {/* Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-8 md:p-12 shadow-floating group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.05),transparent_50%)]" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-4 flex-1">
            <div className="flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm w-fit">
                <ShieldCheck size={14} />
                Estratégia de Desalavancagem
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tight leading-[1.1]">
              Sua rota de <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-orange-500">liberdade total.</span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed font-medium">
              Encare suas dívidas com estratégia e não com medo. Mapeie cada juro e deixe o Nexus traçar o caminho mais curto para sua paz financeira.
            </p>
          </div>
          <div className="hidden lg:block w-80 h-56 shrink-0 relative animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="w-full h-full rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-card relative group-hover:scale-[1.02] transition-transform duration-500">
              <img src="/assets/images/lifestyle/debt-freedom.webp" alt="Liberdade" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-3 -left-3 bg-white dark:bg-slate-800 px-5 py-2.5 rounded-2xl shadow-floating border border-slate-100 dark:border-slate-700 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 tracking-tighter">Nexus Debt Shield</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feed de Comandos Nexus */}
      <DebtNexusFeed commands={commands} onAction={handleCommandAction} />

      {/* Bloco de Jornada de Progresso */}
      {debts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/20 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-1">Evolução da Jornada</p>
                  <h3 className="text-2xl font-black italic">Rumo ao Colchão Emergencial</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Saldo Remanescente</p>
                  <p className="text-xl font-black">{formatCurrency(totalSaldo)}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                  <span>Início da Estratégia</span>
                  <span>Liberdade Real</span>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden p-1 border border-slate-700/50">
                   <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full shadow-[0_0_15px_rgba(225,29,72,0.4)]" style={{ width: '15%' }} /> 
                </div>
                <p className="text-[11px] text-slate-500 font-medium italic">O Finanças Pro Invest está monitorando {totalRemainingParcelas} parcelas em aberto.</p>
              </div>
            </div>
          </div>
          {criticalDebt && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-[2.5rem] p-8 flex flex-col justify-between group hover:bg-rose-100/50 dark:hover:bg-rose-950/40 transition-all">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-200"><AlertCircle size={18} /></div>
                  <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">{debts.length > 1 ? 'Dívida mais Crítica' : 'Dívida Crítica'}</span>
                </div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white mb-1">{criticalDebt.nome}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {debts.length > 1
                    ? `Esta dívida possui a maior taxa de juros (${criticalDebt.taxaMensal}%/mês).`
                    : `Taxa de juros: ${criticalDebt.taxaMensal}%/mês.`}
                </p>
              </div>
              <button onClick={() => setSelectedDebtForProjection(criticalDebt)} className="mt-6 w-full py-4 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all shadow-sm">
                Atacar esta dívida
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
          <History size={16} /> {showHistory ? 'Ocultar Estratégias' : 'Ver Estratégias Salvas'}
        </button>
        <button onClick={() => setShowSimulator(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-700 border dark:border-slate-700 transition-all shadow-lg shadow-slate-900/20">
          <Sparkles size={16} className="text-amber-400" /> Simular Estratégia
        </button>
      </div>

      {showHistory && savedPlans.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-top-4 duration-300">
          {savedPlans.map(plan => (
            <div key={plan.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col justify-between group hover:border-sky-300 dark:hover:border-sky-700 transition-all">
              <div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4"><BookOpen size={20} /></div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">{fixMojibake(plan.title)}</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Gerado em {plan.createdAt?.toDate ? plan.createdAt.toDate().toLocaleDateString('pt-BR') : 'Recente'}</p>
              </div>
              <button onClick={() => alert("Abrindo visualização...")} className="mt-6 w-full py-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-widest group-hover:bg-sky-600 group-hover:text-white transition-all flex items-center justify-center gap-2">
                 Abrir Estratégia <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formulário — colapsável */}
      <DebtFormCard
        form={form}
        setForm={setForm}
        editingId={editingId}
        showForm={showForm}
        setShowForm={setShowForm}
        debtsCount={debts.length}
        isSubmitting={isSubmitting}
        handleSave={handleSave}
        onCancel={() => {
          setForm(EMPTY_FORM);
          setEditingId(null);
          setAdjustmentType('fixed');
          setAnnualPercentRate(undefined);
          setFrequency('monthly');
          setSeries([]);
          setInterestRatePeriod('monthly');
        }}
        adjustmentType={adjustmentType}
        setAdjustmentType={setAdjustmentType}
        annualPercentRate={annualPercentRate}
        setAnnualPercentRate={setAnnualPercentRate}
        frequency={frequency}
        setFrequency={setFrequency}
        series={series}
        setSeries={setSeries}
        interestRatePeriod={interestRatePeriod}
        setInterestRatePeriod={setInterestRatePeriod}
      />

      {/* Lista */}
      <DebtListSection
        debts={debts}
        rankings={rankings}
        viewMode={viewMode}
        setViewMode={setViewMode}
        topDebtId={topDebtId}
        highlightDebtId={highlightDebtId}
        applyingInterestId={applyingInterestId}
        isAmortizing={isAmortizing}
        handleApplyInterest={handleApplyInterest}
        handleOpenAmortization={handleOpenAmortization}
        setSelectedDebtForProjection={setSelectedDebtForProjection}
        handleEdit={handleEdit}
        handleDelete={handleDelete}
      />

      <div className="mt-12 rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 flex flex-col md:flex-row items-center justify-between gap-10">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Ritual de Governança</h3>
        <div className="flex gap-4">
          <button onClick={() => setShowConfirmModal(true)} className="px-10 py-4 bg-brand-primary text-white rounded-2xl text-[11px] font-black uppercase hover:bg-brand-primary/90 transition-all">Validar Dívidas</button>
        </div>
      </div>

      <RotativoInterestReport userId={userId} />

      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
             <h3 className="text-2xl font-black text-center mb-6 text-slate-900 dark:text-white">Validar Estratégia?</h3>
             <div className="flex flex-col gap-3">
               <button onClick={handleConfirmSaldos} disabled={isSavingSnapshot} className="w-full py-5 bg-brand-primary text-white rounded-2xl font-black uppercase hover:bg-brand-primary/90 transition-all">Confirmar</button>
               <button onClick={() => setShowConfirmModal(false)} className="w-full py-5 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black uppercase hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">Cancelar</button>
             </div>
          </div>
        </div>
      )}

      {selectedDebtForProjection && (
          <DebtProjectionDrawer debt={selectedDebtForProjection} isOpen={!!selectedDebtForProjection} onClose={() => setSelectedDebtForProjection(null)} onConfirmAmortization={handleAmortizeExtra} />
      )}

      {selectedDebtForAmortization && (
          <DebtAmortizationModal debt={selectedDebtForAmortization} userId={userId || ''} isOpen={!!selectedDebtForAmortization} onClose={() => setSelectedDebtForAmortization(null)} />
      )}

      {showUpgradeModal && (
        <DebtUpgradeModal isOpen={!!showUpgradeModal} onClose={() => setShowUpgradeModal(null)} onUpgrade={() => onNavigate && onNavigate('upgrade')} title={showUpgradeModal.title} description={showUpgradeModal.description} />
      )}
    </div>
  );
};

export default DebtManager;
