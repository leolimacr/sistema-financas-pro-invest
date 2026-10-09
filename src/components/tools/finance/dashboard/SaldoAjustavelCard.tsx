import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { CreditCard, Clock, Receipt, Eye, Check, X, Loader, ChevronDown } from 'lucide-react';
import type { QueryClient } from '@tanstack/react-query';
import { maskCurrency, toIntegerCents } from '../../../../utils/calculations';
import type { FaturaDetalhe, LancamentoFuturoInfo } from '../../../../utils/calculations';
import { getLocalDateString } from '../../../../utils/dateHelpers';
import { payInvoice } from '../../../../services/payInvoiceService';
import ComposicaoDrawer, { type ComposicaoItem } from './ComposicaoDrawer';
import { useExclusions } from '../../../../contexts/ExclusionsContext';

interface VoucherCardInfo {
  id: string;
  name: string;
  balance: number;
}

interface SaldoAjustavelCardProps {
  isPrivacyMode: boolean;
  saldoReal: number | null;
  faturasFechadas: FaturaDetalhe[];
  faturasAbertas: FaturaDetalhe[];
  gastosFuturosMes: LancamentoFuturoInfo[];
  contasFuturasMes: LancamentoFuturoInfo[];
  userId: string;
  queryClient: QueryClient;
  reserveTarget: number;
  colchaoTarget: number;
  voucherCards: VoucherCardInfo[];
}

type CheckState = Record<string, boolean>;

const SaldoAjustavelCard: React.FC<SaldoAjustavelCardProps> = ({
  isPrivacyMode,
  saldoReal,
  faturasFechadas,
  faturasAbertas,
  gastosFuturosMes,
  contasFuturasMes,
  userId,
  queryClient,
  reserveTarget,
  colchaoTarget,
  voucherCards,
}) => {
  const { excluirReserva, excluirColchao, excluirVoucherMap, computeExclusions } = useExclusions();
  
  // Ordena faturas abertas por vencimento: mais próxima primeiro (dueDate asc)
  const sortedAbertas = useMemo(() => {
    const copy = [...faturasAbertas];
    copy.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return copy;
  }, [faturasAbertas]);
  
  // SaldoAjustavelCard is a simulation tool - keeps its own local checkbox state for granular payment planning
  const [checked, setChecked] = useState<CheckState>(() => {
    const init: CheckState = {};
    for (const f of faturasFechadas) {
      init[`fat-${f.cardId}-${f.periodEnd}`] = true;
    }
    return init;
  });

  // Composição Soberana: Saldo em Conta + Saldos dos Cartões Voucher
  const totalVoucherCents = (voucherCards || []).reduce(
    (acc, c) => acc + toIntegerCents(c.balance || 0),
    0
  );
  const saldoRealCents = toIntegerCents(saldoReal || 0);
  const saldoBaseCents = saldoRealCents + totalVoucherCents;
  const exclusaoTotalCents = toIntegerCents(computeExclusions(reserveTarget, colchaoTarget, voucherCards || []));
  const saldoComExclusoes = saldoReal != null ? (saldoBaseCents - exclusaoTotalCents) / 100 : 0;
  const saldoBase = saldoComExclusoes;

  const [drawerItem, setDrawerItem] = useState<ComposicaoItem | null>(null);
  const [payingFaturaKey, setPayingFaturaKey] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [isPaying, setIsPaying] = useState(false);

  const toggle = useCallback((key: string) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const temParceladas = useMemo(() => {
    return sortedAbertas.some(f =>
      f.transacoes.some(t => t.installments != null && t.installments > 1)
    );
  }, [sortedAbertas]);

  const [faturasAbertasExpanded, setFaturasAbertasExpanded] = useState(false);

  const handleSelectAllAbertas = useCallback(() => {
    setChecked(prev => {
      const allChecked = sortedAbertas.every(f => !!prev[`fat-${f.cardId}-${f.periodEnd}`]);
      const next = { ...prev };
      for (const f of sortedAbertas) {
        next[`fat-${f.cardId}-${f.periodEnd}`] = !allChecked;
      }
      return next;
    });
  }, [sortedAbertas]);

  const [contasFuturasExpanded, setContasFuturasExpanded] = useState(false);

  const handleSelectAllContas = useCallback(() => {
    setChecked(prev => {
      const allChecked = contasFuturasMes.every(c => !!prev[`con-${c.id}`]);
      const next = { ...prev };
      for (const c of contasFuturasMes) {
        next[`con-${c.id}`] = !allChecked;
      }
      return next;
    });
  }, [contasFuturasMes]);

  const fmt = (n: number) => (isPrivacyMode ? '••••••' : maskCurrency(n));

  const totalDeducoes = useMemo(() => {
    let total = 0;

    for (const f of faturasFechadas) {
      if (checked[`fat-${f.cardId}-${f.periodEnd}`]) total += f.remainingAmount;
    }
    for (const f of sortedAbertas) {
      if (checked[`fat-${f.cardId}-${f.periodEnd}`]) total += f.remainingAmount;
    }
    for (const g of gastosFuturosMes) {
      if (checked[`gas-${g.id}`]) total += g.amount;
    }
    for (const c of contasFuturasMes) {
      if (checked[`con-${c.id}`]) total += c.amount;
    }

    return total;
  }, [faturasFechadas, sortedAbertas, gastosFuturosMes, contasFuturasMes, checked]);

  const saldoAjustado = saldoBase - totalDeducoes;
  const isNegativo = saldoAjustado < 0;

  const abrirComposicao = useCallback((item: ComposicaoItem) => {
    setDrawerItem(item);
  }, []);

  const handleStartPayment = useCallback((key: string) => {
    setPayingFaturaKey(key);
    setPaymentDate(getLocalDateString());
    setIsPaying(false);
  }, []);

  const handleCancelPayment = useCallback(() => {
    setPayingFaturaKey(null);
    setIsPaying(false);
  }, []);

  const handleConfirmPayment = useCallback(async (fatura: FaturaDetalhe) => {
    if (!userId || isPaying) return;
    setIsPaying(true);
    const invoiceId = `${fatura.cardId}_${fatura.periodEnd}`;
    await payInvoice({
      userId,
      cardId: fatura.cardId,
      cardName: fatura.cardName,
      amount: fatura.remainingAmount,
      date: paymentDate,
      invoiceId,
      periodEnd: fatura.periodEnd,
      queryClient,
    });
    setIsPaying(false);
    setPayingFaturaKey(null);
  }, [userId, paymentDate, queryClient, isPaying]);

  // Loading skeleton — até os dados do mês corrente estarem carregados
  if (saldoReal === null) {
    return (
      <div className="bg-surface-primary dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-panel p-5 shadow-panel animate-pulse">
        <div className="h-3 w-28 bg-surface-secondary dark:bg-slate-800 rounded-full mb-3" />
        <div className="h-4 w-16 bg-surface-secondary dark:bg-slate-800 rounded-full mb-1" />
        <div className="h-8 w-36 bg-surface-secondary dark:bg-slate-800 rounded-xl mt-4" />
        <div className="border-t border-surface-elevated dark:border-slate-800 pt-3 mt-4 space-y-2">
          <div className="h-3 w-40 bg-surface-secondary dark:bg-slate-800 rounded-full" />
          <div className="h-3 w-36 bg-surface-secondary dark:bg-slate-800 rounded-full" />
          <div className="h-3 w-32 bg-surface-secondary dark:bg-slate-800 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-surface-primary dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-panel p-5 shadow-panel">
        {/* Saldo Atual (fixo no topo) */}
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h2 className="text-sm font-black text-text-primary dark:text-white tracking-tight">
              Saldo Ajustável
            </h2>
            <p className="text-[10px] text-text-muted dark:text-slate-400 font-medium leading-relaxed mt-0.5">
              Simule o abatimento de faturas e contas para ver quanto resta para a proteção (Colchão e Reserva).
            </p>
          </div>
          <p className="text-2xl font-black tabular-nums tracking-tight text-text-primary dark:text-white">
            {fmt(saldoBase)}
          </p>
        </div>

        {/* Seção: Faturas Fechadas */}
        <div className="mb-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-text-muted dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <CreditCard size={12} />
            Faturas fechadas (não pagas)
          </p>
          {faturasFechadas.length > 0 ? (
            <div className="space-y-1">
              {faturasFechadas.map(f => {
                const key = `fat-${f.cardId}-${f.periodEnd}`;
                const isChecked = !!checked[key];
                const isPayingThis = payingFaturaKey === key;
                const isOverdue = new Date(f.dueDate.replace(/-/g, '/')) < new Date();
                return (
                  <div key={key}>
                    <div
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                        isOverdue
                          ? isChecked
                            ? 'bg-red-100 dark:bg-red-950/50 border-red-400 dark:border-red-800'
                            : 'bg-red-50/40 dark:bg-red-950/20 border-red-300/60 dark:border-red-900/40'
                          : isChecked
                            ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800'
                            : 'bg-surface-subtle dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      }`}
                      onClick={() => abrirComposicao({ tipo: 'fatura', dados: f })}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(key)}
                        onClick={e => e.stopPropagation()}
                        className={`w-4 h-4 rounded cursor-pointer shrink-0 ${
                          isOverdue
                            ? 'border-red-400 text-red-600 focus:ring-red-500'
                            : 'border-slate-300 text-red-600 focus:ring-red-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate flex items-center gap-1.5 ${
                          isOverdue
                            ? isChecked ? 'text-red-800 dark:text-red-300' : 'text-red-700 dark:text-red-400'
                            : isChecked ? 'text-red-700 dark:text-red-300' : 'text-text-muted dark:text-slate-400'
                        }`}>
                          {isOverdue && (
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-red-200 dark:bg-red-900/60 text-[8px] font-black uppercase tracking-wider text-red-800 dark:text-red-200 leading-none">
                              Vencida
                            </span>
                          )}
                          {f.cardName}
                        </p>
                        <p className={`text-[9px] mt-0.5 ${
                          isOverdue
                            ? isChecked ? 'text-red-600 dark:text-red-400' : 'text-red-600 dark:text-red-400'
                            : isChecked ? 'text-red-600 dark:text-red-400' : 'text-text-muted dark:text-slate-400'
                        }`}>
                          Venceu em {new Date(f.dueDate.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <p className={`text-sm font-black tabular-nums shrink-0 ${
                        isOverdue
                          ? isChecked ? 'text-red-700 dark:text-red-300' : 'text-red-600 dark:text-red-400'
                          : isChecked ? 'text-red-600 dark:text-red-400' : 'text-text-muted dark:text-slate-400'
                      }`}>
                        {fmt(f.remainingAmount)}
                      </p>
                      <Eye size={14} className="text-text-muted dark:text-slate-400 shrink-0" />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleStartPayment(key); }}
                        className="text-[8px] font-black text-action-primaryDark uppercase tracking-widest hover:underline shrink-0 whitespace-nowrap"
                      >
                        Pagar Agora
                      </button>
                    </div>

                    {isPayingThis && (
                      <div className="mt-2 p-3 bg-surface-secondary dark:bg-slate-800 rounded-2xl border border-surface-elevated dark:border-slate-700 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-3">
                          <label className="text-[10px] font-bold text-text-muted dark:text-slate-400 shrink-0">
                            Data do pagamento
                          </label>
                          <input
                            type="date"
                            value={paymentDate}
                            max={getLocalDateString()}
                            onChange={e => setPaymentDate(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl border border-surface-elevated dark:border-slate-700 bg-surface-primary dark:bg-slate-900 text-xs font-bold text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isPaying}
                            onClick={() => handleConfirmPayment(f)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary text-text-onBrand text-[9px] font-black uppercase tracking-widest hover:bg-brand-primary/90 transition-all active:scale-95 disabled:opacity-50"
                          >
                            {isPaying ? (
                              <Loader size={12} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            Confirmar Pagamento
                          </button>
                          <button
                            type="button"
                            disabled={isPaying}
                            onClick={handleCancelPayment}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-surface-elevated dark:border-slate-700 text-text-muted dark:text-slate-300 text-[9px] font-black uppercase tracking-widest hover:bg-surface-secondary dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                          >
                            <X size={12} />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-text-muted dark:text-slate-400 font-medium italic pl-1">
              Nenhuma fatura fechada pendente.
            </p>
          )}
        </div>

        {/* Seção: Faturas Abertas */}
        <div className="mb-3">
          <div
            className={`flex items-center gap-1.5 mb-2 ${temParceladas ? 'cursor-pointer select-none' : ''}`}
            onClick={() => temParceladas && setFaturasAbertasExpanded(p => !p)}
          >
            {temParceladas && (
              <ChevronDown
                size={12}
                className={`text-text-muted dark:text-slate-400 transition-transform ${faturasAbertasExpanded ? '' : '-rotate-90'}`}
              />
            )}
            <input
              type="checkbox"
              checked={sortedAbertas.length > 0 && sortedAbertas.every(f => !!checked[`fat-${f.cardId}-${f.periodEnd}`])}
              onChange={handleSelectAllAbertas}
              onClick={e => e.stopPropagation()}
              className="h-3.5 w-3.5 rounded border-surface-elevated text-amber-500 focus:ring-amber-400/30 shrink-0"
            />
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted dark:text-slate-400 flex items-center gap-1.5">
              <CreditCard size={12} />
              Faturas abertas (em curso)
            </p>
            {sortedAbertas.length > 0 && (
              <span className="text-[8px] font-bold text-text-muted dark:text-slate-400 ml-auto">
                {sortedAbertas.length} {sortedAbertas.length === 1 ? 'fatura' : 'faturas'}
              </span>
            )}
          </div>

          {(!temParceladas || faturasAbertasExpanded) && (
            sortedAbertas.length > 0 ? (
              <div className="space-y-1">
                {sortedAbertas.map(f => {
                  const key = `fat-${f.cardId}-${f.periodEnd}`;
                  const isChecked = !!checked[key];
                  const isPayingThis = payingFaturaKey === key;
                  return (
                    <div key={key}>
                      <div
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                            : 'bg-surface-subtle dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                        }`}
                        onClick={() => abrirComposicao({ tipo: 'fatura', dados: f })}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(key)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate flex items-center gap-1.5 ${isChecked ? 'text-amber-700 dark:text-amber-300' : 'text-text-muted dark:text-slate-400'}`}>
                            <span className="inline-block px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-[8px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 leading-none">
                              Fecha {new Date(f.periodEnd.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                            </span>
                            {f.cardName}
                          </p>
                          <p className={`text-[9px] mt-0.5 ${isChecked ? 'text-amber-700 dark:text-amber-300' : 'text-text-muted dark:text-slate-400'}`}>
                            Vence {new Date(f.dueDate.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <p className={`text-sm font-black tabular-nums shrink-0 ${isChecked ? 'text-amber-600 dark:text-amber-400' : 'text-text-muted dark:text-slate-400'}`}>
                          {fmt(f.remainingAmount)}
                        </p>
                        <Eye size={14} className="text-text-muted dark:text-slate-400 shrink-0" />
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleStartPayment(key); }}
                          className="text-[8px] font-black text-action-primaryDark uppercase tracking-widest hover:underline shrink-0 whitespace-nowrap"
                        >
                          Pagar Agora
                        </button>
                      </div>

                      {isPayingThis && (
                        <div className="mt-2 p-3 bg-surface-secondary dark:bg-slate-800 rounded-2xl border border-surface-elevated dark:border-slate-700 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex items-center gap-3">
                            <label className="text-[10px] font-bold text-text-muted dark:text-slate-400 shrink-0">
                              Data do pagamento
                            </label>
                            <input
                              type="date"
                              value={paymentDate}
                              max={getLocalDateString()}
                              onChange={e => setPaymentDate(e.target.value)}
                              className="flex-1 px-3 py-2 rounded-xl border border-surface-elevated dark:border-slate-700 bg-surface-primary dark:bg-slate-900 text-xs font-bold text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isPaying}
                              onClick={() => handleConfirmPayment(f)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-primary text-text-onBrand text-[9px] font-black uppercase tracking-widest hover:bg-brand-primary/90 transition-all active:scale-95 disabled:opacity-50"
                            >
                              {isPaying ? (
                                <Loader size={12} className="animate-spin" />
                              ) : (
                                <Check size={12} />
                              )}
                              Confirmar Pagamento
                            </button>
                            <button
                              type="button"
                              disabled={isPaying}
                              onClick={handleCancelPayment}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-surface-elevated dark:border-slate-700 text-text-muted dark:text-slate-300 text-[9px] font-black uppercase tracking-widest hover:bg-surface-secondary dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <X size={12} />
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-text-muted dark:text-slate-400 font-medium italic pl-1">
                Nenhuma fatura aberta no momento.
              </p>
            )
          )}
        </div>

        {/* Seção: Gastos futuros no mês */}
        <div className="mb-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-text-muted dark:text-slate-400 mb-2 flex items-center gap-1.5">
            <Clock size={12} />
            Gastos futuros deste mês
          </p>
          {gastosFuturosMes.length > 0 ? (
            <div className="space-y-1 mb-2">
              {gastosFuturosMes.map(g => {
                const key = `gas-${g.id}`;
                const isChecked = !!checked[key];
                return (
                  <div
                    key={key}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                        : 'bg-surface-subtle dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                    }`}
                    onClick={() => abrirComposicao({ tipo: 'gasto-futuro', dados: g })}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(key)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isChecked ? 'text-amber-700 dark:text-amber-300' : 'text-text-muted dark:text-slate-400'}`}>
                        {g.description || 'Sem descrição'}
                      </p>
                      <p className={`text-[9px] mt-0.5 ${isChecked ? 'text-amber-500 dark:text-amber-400' : 'text-text-muted dark:text-slate-400'}`}>
                        {new Date(g.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <p className={`text-sm font-black tabular-nums shrink-0 ${isChecked ? 'text-amber-600 dark:text-amber-400' : 'text-text-muted dark:text-slate-400'}`}>
                      {fmt(g.amount)}
                    </p>
                    <Eye size={14} className="text-text-muted dark:text-slate-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] text-text-muted dark:text-slate-400 font-medium italic pl-1">
              Nenhum gasto futuro previsto neste mês.
            </p>
          )}
        </div>

        {/* Seção: Contas recorrentes a vencer */}
        <div className="mb-3">
          <div
            className={`flex items-center gap-1.5 mb-2 ${contasFuturasMes.length > 2 ? 'cursor-pointer select-none' : ''}`}
            onClick={() => contasFuturasMes.length > 2 && setContasFuturasExpanded(p => !p)}
          >
            {contasFuturasMes.length > 2 && (
              <ChevronDown
                size={12}
                className={`text-text-muted dark:text-slate-400 transition-transform ${contasFuturasExpanded ? '' : '-rotate-90'}`}
              />
            )}
            <input
              type="checkbox"
              checked={contasFuturasMes.length > 0 && contasFuturasMes.every(c => !!checked[`con-${c.id}`])}
              onChange={handleSelectAllContas}
              onClick={e => e.stopPropagation()}
              className="h-3.5 w-3.5 rounded border-surface-elevated text-purple-500 focus:ring-purple-400/30 shrink-0"
            />
            <p className="text-[9px] font-black uppercase tracking-widest text-text-muted dark:text-slate-400 flex items-center gap-1.5">
              <Receipt size={12} />
              Contas recorrentes a vencer
            </p>
            {contasFuturasMes.length > 0 && (
              <span className="text-[8px] font-bold text-text-muted dark:text-slate-400 ml-auto">
                {contasFuturasMes.length} {contasFuturasMes.length === 1 ? 'conta' : 'contas'}
              </span>
            )}
          </div>

          {(contasFuturasMes.length <= 2 || contasFuturasExpanded) && (
            contasFuturasMes.length > 0 ? (
              <div className="space-y-1">
                {contasFuturasMes.map(c => {
                  const key = `con-${c.id}`;
                  const isChecked = !!checked[key];
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
                          : 'bg-surface-subtle dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                      }`}
                      onClick={() => abrirComposicao({ tipo: 'conta-futura', dados: c })}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(key)}
                        onClick={e => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-300 text-purple-500 focus:ring-purple-400 cursor-pointer shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold truncate ${isChecked ? 'text-purple-700 dark:text-purple-300' : 'text-text-muted dark:text-slate-400'}`}>
                          {c.description}
                        </p>
                        <p className={`text-[9px] mt-0.5 ${isChecked ? 'text-purple-700 dark:text-purple-300' : 'text-text-muted dark:text-slate-400'}`}>
                          Dia {new Date(c.date.replace(/-/g, '/')).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                      <p className={`text-sm font-black tabular-nums shrink-0 ${isChecked ? 'text-purple-600 dark:text-purple-400' : 'text-text-muted dark:text-slate-400'}`}>
                        {fmt(c.amount)}
                      </p>
                      <Eye size={14} className="text-text-muted dark:text-slate-400 shrink-0" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[10px] text-text-muted dark:text-slate-400 font-medium italic pl-1">
                Não há nenhuma conta recorrente a vencer neste mês.
              </p>
            )
          )}
        </div>

        {/* Total Ajustado */}
        <div className="border-t border-surface-elevated dark:border-slate-800 pt-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-ultra-wide text-text-primary dark:text-white">
                Saldo Ajustado
              </p>
              <p className="text-[9px] text-text-muted dark:text-slate-400 font-medium mt-0.5">
                {isNegativo
                  ? 'Após as deduções das contas imediatas, o caixa entra em aperto temporário.'
                  : 'Saldo operacional restante após pagar as contas imediatas do mês.'}
              </p>
            </div>
            <p
              className={`text-2xl font-black tabular-nums tracking-tight ${
                isNegativo ? 'text-status-danger dark:text-rose-400' : 'text-text-primary dark:text-white'
              }`}
            >
              {isPrivacyMode ? '••••••' : maskCurrency(saldoAjustado)}
            </p>
          </div>
        </div>
      </div>

      <ComposicaoDrawer
        isOpen={drawerItem !== null}
        onClose={() => setDrawerItem(null)}
        item={drawerItem}
      />
    </>
  );
};

export default SaldoAjustavelCard;
