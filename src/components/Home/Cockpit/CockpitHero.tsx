import React, { useState, useMemo } from 'react';
import { AlertCircle, Crown, ChevronDown, Shield, Receipt, Wallet } from 'lucide-react';
import type { Transaction, UserMeta, RecurringBill } from '../../../types';
import type { SovereignSnapshotResult } from '../../../hooks/useSovereignSnapshot';
import { useEntitlement } from '../../../hooks/useEntitlement';
import { getHeroHelperText, DISPONIBILIDADE_REAL } from '../../../theme/fpiVoiceGuide';
import { getLocalDateString } from '../../../utils/dateHelpers';

interface CockpitHeroProps {
  urgentBills: RecurringBill[];
  userMeta: UserMeta | null | undefined;
  isPrivacyMode: boolean;
  sovereign: SovereignSnapshotResult;
  marcoZero: number;
  reserveCurrent: number;
  transactions: Transaction[];
  formatCurrency: (val: number) => string;
  onNavigate?: (tool: string) => void;
  onOpenForm?: (data?: unknown) => void;
  onShowUrgentBills?: () => void;
  exclusionAmount?: number;
}

type ExpandedSection = 'hero' | 'saldoMes' | 'saldoAcumulado' | 'cartao' | 'contas' | 'falta' | null;

const CockpitHero: React.FC<CockpitHeroProps> = ({
  urgentBills,
  userMeta,
  isPrivacyMode,
  sovereign,
  marcoZero,
  reserveCurrent,
  formatCurrency,
  onNavigate,
  onOpenForm,
  onShowUrgentBills,
  exclusionAmount = 0,
}) => {
  const { isPro, isPremium } = useEntitlement();
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const [expandedInline, setExpandedInline] = useState<ExpandedSection>(null);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const planLabel = isPremium ? 'Premium' : isPro ? 'Pro' : 'Free';

  const toggleSection = (section: ExpandedSection) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const toggleInline = (section: ExpandedSection) => {
    setExpandedInline((prev) => (prev === section ? null : section));
  };

  const heroHelp = sovereign.commandMode
    ? getHeroHelperText(
        sovereign.commandMode,
        sovereign.cashSurplus ?? ((sovereign.accumulatedBalance ?? 0) - (sovereign.obligationsDeduction ?? 0)),
        sovereign.protectionShortfall
      )
    : DISPONIBILIDADE_REAL.heroHelpRotina;

  const colchaoTarget = userMeta?.financialProfile?.colchaoInicialTarget || 0;
  const reserveTarget = userMeta?.financialProfile?.emergencyReserveTarget || 0;
  // Fonte única: shortfalls vêm do snapshot soberano (não recalculados aqui).
  const colchaoShortfall = sovereign.colchaoShortfall;
  const reserveShortfall = sovereign.reserveShortfall;
  const totalShortfall = sovereign.protectionShortfall;

  const totalTarget = (colchaoTarget || 0) + (reserveTarget || 0);
  const percentProtected = totalTarget > 0
    ? Math.min(100, Math.round(((sovereign.protectionBuffer || 0) / totalTarget) * 100))
    : 100;
  const freeBalance = Math.max(0, sovereign.sovereignFreeBalance);

  // No modo comando, o valor principal do Hero é o Saldo Total em Conta
  const displayMainValue = sovereign.commandMode
    ? (sovereign.accumulatedBalance ?? sovereign.heroValue)
    : sovereign.heroValue;

  const heroValueDisplay = isPrivacyMode
    ? '••••••'
    : formatCurrency(displayMainValue);

  return (
    <div className="relative z-20 rounded-panel bg-white dark:bg-slate-900 border border-border-strong dark:border-slate-800 p-6 md:p-8 shadow-floating group">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent_50%)] rounded-panel pointer-events-none" />
      
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
        <div className="space-y-2 flex-1">
          {urgentBills.length > 0 && (
            <div
              onClick={() => {
                if (urgentBills.length === 1) {
                  const bill = urgentBills[0];
                  onOpenForm?.({
                    type: 'expense',
                    category: bill.category,
                    amount: bill.amount,
                    description: bill.name,
                    date: getLocalDateString(),
                    autoFocusAmount: true,
                  });
                } else {
                  onShowUrgentBills?.();
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (urgentBills.length === 1) {
                    const bill = urgentBills[0];
                    onOpenForm?.({
                      type: 'expense',
                      category: bill.category,
                      amount: bill.amount,
                      description: bill.name,
                      date: getLocalDateString(),
                      autoFocusAmount: true,
                    });
                  } else {
                    onShowUrgentBills?.();
                  }
                }
              }}
              role="button"
              tabIndex={0}
              className="cursor-pointer flex items-center justify-between gap-4 p-3.5 bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl transition-colors hover:bg-rose-100/80 dark:hover:bg-rose-900/40 mb-3"
            >
              <div>
                <div className="flex items-center gap-2 text-status-danger animate-pulse">
                  <AlertCircle size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Atenção Prioritária</span>
                </div>
                <p className="text-base font-black tracking-tight leading-tight text-slate-950 dark:text-white mt-0.5">
                  {urgentBills.length} {urgentBills.length === 1 ? 'conta vence' : 'contas vencem'}{' '}
                  <span className="text-emerald-600 dark:text-emerald-400">hoje ou amanhã.</span>
                </p>
              </div>
              <button
                type="button"
                className="px-3.5 py-1.5 rounded-xl bg-status-danger text-white text-xs font-bold shadow-sm hover:bg-rose-700 transition-all shrink-0 active:scale-95"
              >
                Ver e pagar
              </button>
            </div>
          )}
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mb-3">{greeting}, {userMeta?.nickname || 'Investidor'}</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest shadow-sm ${
                  isPremium ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 shadow-emerald-500/10' :
                  isPro ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800/60 shadow-sky-500/10' :
                  'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                }`}>
                  {isPremium && <Crown size={12} className="fill-emerald-500" />}
                  {isPro && !isPremium && <Crown size={12} />}
                  Plano {planLabel}
                </span>
                {userMeta?.persona?.archetype && (
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Estratégia: {(userMeta.persona.archetype as string) === 'dividas' ? 'Sair do vermelho' : (userMeta.persona.archetype as string) === 'patrimonio' ? 'Crescimento' : 'Controle'}
                  </span>
                )}
              </div>
              <div className="flex flex-col md:flex-row md:items-end gap-8 mt-6">
                <div className="space-y-3">
                  <p className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em]">
                    {sovereign.commandMode ? DISPONIBILIDADE_REAL.heroLabelComando : DISPONIBILIDADE_REAL.heroLabelRotina}
                  </p>
                  <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-none text-transparent bg-clip-text drop-shadow-sm bg-gradient-to-br from-slate-950 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-300">
                    {heroValueDisplay}
                  </h1>

                  {/* Os 3 Cards de Alocação Real (Envelopes / 3 Horizontes) em destaque no Modo Comando */}
                  {sovereign.commandMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 max-w-2xl">
                      {/* 1. Protegido em Reserva */}
                      <div className="rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 p-3 shadow-sm">
                        <div className="flex items-center gap-1.5 text-sky-800 dark:text-sky-300">
                          <Shield size={14} className="text-sky-600 dark:text-sky-400" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Protegido em Reserva</span>
                        </div>
                        <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                          {isPrivacyMode ? '••••••' : formatCurrency(sovereign.protectionBuffer)}
                        </p>
                        <p className="text-[10px] text-sky-700 dark:text-sky-400 mt-0.5 font-medium">
                          {percentProtected}% da meta blindada
                        </p>
                      </div>

                      {/* 2. Contas do Mês */}
                      <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 p-3 shadow-sm">
                        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                          <Receipt size={14} className="text-amber-600 dark:text-amber-400" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Contas do Mês</span>
                        </div>
                        <p className="text-base font-black text-slate-900 dark:text-white mt-1">
                          {isPrivacyMode ? '••••••' : formatCurrency(sovereign.obligationsDeduction)}
                        </p>
                        <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 font-medium">
                          Boletos e fatura
                        </p>
                      </div>

                      {/* 3. Saldo Livre */}
                      <div className="rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-3 shadow-sm">
                        <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                          <Wallet size={14} className="text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[10px] font-black uppercase tracking-wider">Saldo Livre</span>
                        </div>
                        <p className="text-base font-black text-emerald-900 dark:text-emerald-300 mt-1">
                          {isPrivacyMode ? '••••••' : formatCurrency(freeBalance)}
                        </p>
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
                          {freeBalance > 0 ? 'Livre para decisões' : '100% alocado na proteção'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Hero expandable composition */}
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-md">
                      {heroHelp}
                    </p>

                    {sovereign.commandMode && (
                      <button
                        type="button"
                        onClick={() => toggleSection('hero')}
                        className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-1 min-h-[44px]"
                        aria-expanded={expandedSection === 'hero'}
                      >
                        <span>{expandedSection === 'hero' ? 'Recolher' : 'Ver composição'}</span>
                        <ChevronDown
                          size={14}
                          className={`transition-transform duration-200 ${expandedSection === 'hero' ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}

                    {expandedSection === 'hero' && sovereign.commandMode && (
                      <div className="rounded-2xl bg-surface-subtle dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200 max-w-2xl">
                        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
                          Composição: Saldo em Conta − Contas a Pagar − Reserva Alocada = Saldo Livre
                        </p>
                        <div className="space-y-1.5 text-[12px] font-medium text-slate-700 dark:text-slate-200">
                          <div className="flex justify-between">
                            <span>Saldo total administrado</span>
                            <span className="font-black text-slate-900 dark:text-white">{formatCurrency(sovereign.accumulatedBalance)}</span>
                          </div>
                          <div className="flex justify-between text-amber-700 dark:text-amber-400">
                            <span>− Cartão de crédito</span>
                            <span className="font-black">−{formatCurrency(sovereign.virtualImpact)}</span>
                          </div>
                          <div className="flex justify-between text-amber-700 dark:text-amber-400">
                            <span>− Contas a pagar</span>
                            <span className="font-black">−{formatCurrency(sovereign.totalPendingBills)}</span>
                          </div>
                          <div className="flex justify-between text-sky-700 dark:text-sky-400">
                            <span>− Alocado em Reserva ({percentProtected}% da meta)</span>
                            <span className="font-black">−{formatCurrency(sovereign.protectionBuffer)}</span>
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex justify-between font-black text-slate-900 dark:text-white">
                            <span>= Saldo Livre Desimpedido</span>
                            <span className={freeBalance > 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}>
                              {formatCurrency(freeBalance)}
                            </span>
                          </div>
                        </div>
                        {totalShortfall > 0 && (
                          <p className="text-[11px] text-sky-800 dark:text-sky-300 mt-2 font-medium bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 rounded-xl p-2.5">
                            🎯 <strong>Faltam apenas {formatCurrency(totalShortfall)}</strong> para atingir 100% da sua meta de segurança de {formatCurrency(totalTarget)}.
                          </p>
                        )}
                      </div>
                    )}
                    
                    {sovereign.commandMode && (
                      <div className="relative">
                        {expandedInline && (
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setExpandedInline(null)}
                            aria-hidden="true"
                          />
                        )}
                        <div className="relative z-40 flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
                          {/* Saldo acumulado */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => toggleInline('saldoAcumulado')}
                              className="flex items-center gap-1 text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:text-slate-700 dark:hover:text-slate-200 transition-colors py-1 min-h-[36px]"
                            >
                              <span>Total em Conta: {isPrivacyMode ? '•••' : formatCurrency(sovereign.accumulatedBalance)}</span>
                              <ChevronDown size={12} className={`transition-transform ${expandedInline === 'saldoAcumulado' ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedInline === 'saldoAcumulado' && (
                              <div className="absolute left-0 top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-500 dark:text-slate-400">Receitas acumuladas</span>
                                  <span className="font-black text-slate-900 dark:text-white">{formatCurrency(sovereign.accumulatedIncome)}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                  <span className="text-slate-500 dark:text-slate-400">− Despesas acumuladas</span>
                                  <span className="font-black text-slate-900 dark:text-white">−{formatCurrency(sovereign.accumulatedExpenses)}</span>
                                </div>
                                <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex justify-between text-[11px] font-black text-slate-900 dark:text-white">
                                  <span>= Total em conta</span>
                                  <span>{formatCurrency(sovereign.accumulatedBalance)}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <span className="text-slate-200 dark:text-slate-700 text-[9px]">|</span>

                          {/* Cartão */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => toggleInline('cartao')}
                              className="flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest hover:text-amber-800 dark:hover:text-amber-300 transition-colors py-1 min-h-[36px]"
                            >
                              <span>Cartão: {isPrivacyMode ? '•••' : formatCurrency(sovereign.virtualImpact)}</span>
                              <ChevronDown size={12} className={`transition-transform ${expandedInline === 'cartao' ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedInline === 'cartao' && (
                              <div className="absolute left-0 top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  Total das faturas de cartão de crédito a vencer neste período.
                                </p>
                                <div className="flex justify-between text-[11px] font-black">
                                  <span className="text-slate-900 dark:text-white">Total no cartão</span>
                                  <span className="text-amber-700 dark:text-amber-400">{formatCurrency(sovereign.virtualImpact)}</span>
                                </div>
                                {onNavigate && (
                                  <button
                                    type="button"
                                    onClick={() => onNavigate('manager')}
                                    className="w-full mt-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest transition-all"
                                  >
                                    Ver cartões
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <span className="text-slate-200 dark:text-slate-700 text-[9px]">|</span>

                          {/* Contas */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => toggleInline('contas')}
                              className="flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest hover:text-amber-800 dark:hover:text-amber-300 transition-colors py-1 min-h-[36px]"
                            >
                              <span>Contas: {isPrivacyMode ? '•••' : formatCurrency(sovereign.totalPendingBills)}</span>
                              <ChevronDown size={12} className={`transition-transform ${expandedInline === 'contas' ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedInline === 'contas' && (
                              <div className="absolute left-0 top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  Contas recorrentes cadastradas que ainda vencem neste período.
                                </p>
                                <div className="flex justify-between text-[11px] font-black">
                                  <span className="text-slate-900 dark:text-white">Total a pagar</span>
                                  <span className="text-amber-700 dark:text-amber-400">{formatCurrency(sovereign.totalPendingBills)}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {totalShortfall > 0 && (
                            <>
                              <span className="text-slate-200 dark:text-slate-700 text-[9px]">|</span>

                              {/* Falta proteger */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => toggleInline('falta')}
                                  className="flex items-center gap-1 text-[9px] font-bold text-sky-700 dark:text-sky-400 uppercase tracking-widest hover:text-sky-800 dark:hover:text-sky-300 transition-colors py-1 min-h-[36px]"
                                >
                                  <span>Falta proteger: {isPrivacyMode ? '•••' : formatCurrency(totalShortfall)}</span>
                                  <ChevronDown size={12} className={`transition-transform ${expandedInline === 'falta' ? 'rotate-180' : ''}`} />
                                </button>
                                {expandedInline === 'falta' && (
                                  <div className="absolute sm:left-0 right-0 top-full mt-1.5 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-sky-700 dark:text-sky-400 font-bold">Falta no Colchão</span>
                                      <span className="font-black text-slate-900 dark:text-white">{formatCurrency(colchaoShortfall)}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 dark:text-slate-400">{colchaoTarget > 0
                                      ? `Meta R$ ${colchaoTarget.toLocaleString('pt-BR')} − Coberto R$ ${marcoZero.toLocaleString('pt-BR')}`
                                      : 'Defina uma meta no Colchão Emergencial.'}</p>
                                    <div className="flex justify-between text-[11px]">
                                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Falta na Reserva</span>
                                      <span className="font-black text-slate-900 dark:text-white">{formatCurrency(reserveShortfall)}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 dark:text-slate-400">{reserveTarget > 0
                                      ? `Meta R$ ${reserveTarget.toLocaleString('pt-BR')} − Coberto R$ ${reserveCurrent.toLocaleString('pt-BR')}`
                                      : 'Defina uma meta na Reserva de Emergência.'}</p>
                                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1 flex justify-between text-[11px] font-black text-slate-900 dark:text-white">
                                      <span>= Total a proteger</span>
                                      <span>{formatCurrency(totalShortfall)}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {sovereign.commandMode && sovereign.leewayDays > 0 && !isPrivacyMode && (
                    <p className="text-[11px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2 pt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      {sovereign.leewayDays} dias de tranquilidade protegidos
                    </p>
                  )}

                  {!isPrivacyMode && sovereign.commandMode && (
                    <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
                      {(sovereign.totalCreditUsed ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                            Crédito Comprometido: {formatCurrency(sovereign.totalCreditUsed ?? 0)}
                          </span>
                        </div>
                      )}
                      {(sovereign.totalDebtBalance ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                          <span className="text-[9px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                            Peso das Dívidas: {formatCurrency(sovereign.totalDebtBalance ?? 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pb-2">
                  {!sovereign.commandMode && sovereign.totalPendingBills > 0 && !isPrivacyMode && (
                    <div className="flex items-center gap-3 px-5 py-2 bg-surface-subtle dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner">
                      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        O que sobra:{' '}
                        <span className={`text-sm ${sovereign.projectedBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-status-danger'}`}>
                          {formatCurrency(sovereign.projectedBalance)}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
        </div>

        {urgentBills.length === 0 && (
          <div className="hidden lg:block w-72 h-48 shrink-0 relative animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="w-full h-full rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-card relative group-hover:scale-[1.02] transition-transform duration-500">
              <img 
                src="/assets/images/lifestyle/cockpit-clarity.webp" 
                alt="Clareza Financeira" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute -bottom-3 -left-3 bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-floating border border-slate-100 dark:border-slate-700 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Nexus Active</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CockpitHero;
