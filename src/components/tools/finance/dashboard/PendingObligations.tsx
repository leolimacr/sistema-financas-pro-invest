import { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import { CreditCard as CardIcon, Clock, Check, ChevronDown, Circle, CircleCheckBig, Ban, Sparkles, CheckCheck } from 'lucide-react';
import { getLocalDateString } from '../../../../utils/dateHelpers';
import { isBillPaid } from '../../../../utils/invoiceUtils';
import { findCandidateTransactionsForBill } from '../../../../utils/reconciliationMatcher';
import { reconcileTransactionWithBill, markBillPaidDirectly } from '../../../../services/transactionService';
import { ToastContext } from '../../../../contexts/ToastContext';
import type { RecurringBill, Transaction } from '../../../../types';

const useToastSafe = () => {
  const ctx = useContext(ToastContext);
  return ctx || { addToast: () => {} };
};

interface PendingObligationsProps {
  userId?: string;
  activeInvoices: any[];
  pendingBills: any[];
  recurringBills: any[];
  safeTransactions: any[];
  isPrivacyMode: boolean;
  onOpenForm: (initialData?: any) => void;
  onNavigate?: (tool: string, state?: any) => void;
}

const getSearchParamsSafe = (): URLSearchParams => {
  try {
    if (typeof window !== 'undefined' && window.location?.search) {
      return new URLSearchParams(window.location.search);
    }
  } catch {
    /* fallback */
  }
  return new URLSearchParams();
};

/** Formata DD/MM de forma segura: data ausente/inválida retorna null (nunca "Invalid Date"). */
export function formatCycleDate(dueDate: string | undefined | null): string | null {
  if (!dueDate) return null;
  const parsed = new Date(dueDate.replace(/-/g, '/'));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

/** Grade de faturas pelo volume, sem trilhas vazias. Exportada para testes. */
export function invoiceGridClass(count: number): string {
  if (count <= 1) return 'grid grid-cols-1 md:max-w-md gap-4';
  if (count === 2) return 'grid grid-cols-1 md:grid-cols-2 gap-4';
  return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
}

const PendingObligations: React.FC<PendingObligationsProps> = ({
  userId,
  activeInvoices,
  pendingBills,
  recurringBills,
  safeTransactions,
  isPrivacyMode,
  onOpenForm,
  onNavigate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useMemo(() => getSearchParamsSafe(), []);
  const viewParam = searchParams.get('view');
  const filterParam = searchParams.get('filter');
  const highlightBillParam = searchParams.get('highlightBill');
  const cardIdParam = searchParams.get('cardId');

  const shouldExpandInitial = viewParam === 'contas' || filterParam === 'next5days' || !!highlightBillParam;
  const [billsExpanded, setBillsExpanded] = useState(shouldExpandInitial);
  const [highlightedBillId, setHighlightedBillId] = useState<string | null>(highlightBillParam);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [directPayingId, setDirectPayingId] = useState<string | null>(null);
  const [dismissedMatches, setDismissedMatches] = useState<Record<string, boolean>>({});
  const [optimisticPaidBillIds, setOptimisticPaidBillIds] = useState<Record<string, boolean>>({});

  const { addToast } = useToastSafe();

  const checkIsBillPaid = useCallback(
    (bill: RecurringBill, txs: Transaction[]) => {
      if (optimisticPaidBillIds[bill.id]) return true;
      return isBillPaid(bill, txs);
    },
    [optimisticPaidBillIds]
  );

  const effectivePendingBills = useMemo(() => {
    return pendingBills.filter(b => !optimisticPaidBillIds[b.id] && !isBillPaid(b, safeTransactions));
  }, [pendingBills, optimisticPaidBillIds, safeTransactions]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Mapeia contas não pagas que possuem lançamentos candidatos no extrato deste mês
  const billsWithCandidates = useMemo(() => {
    const map = new Map<string, ReturnType<typeof findCandidateTransactionsForBill>[0]>();
    for (const bill of recurringBills) {
      if (bill.isActive === false) continue;
      if (checkIsBillPaid(bill, safeTransactions)) continue;
      if (dismissedMatches[bill.id]) continue;

      const matches = findCandidateTransactionsForBill(bill, safeTransactions, currentMonth, currentYear);
      if (matches.length > 0) {
        map.set(bill.id, matches[0]);
      }
    }
    return map;
  }, [recurringBills, safeTransactions, dismissedMatches, currentMonth, currentYear, checkIsBillPaid]);

  const handleReconcileSingle = async (bill: RecurringBill, transaction: Transaction) => {
    setReconcilingId(bill.id);
    setOptimisticPaidBillIds(prev => ({ ...prev, [bill.id]: true }));
    addToast(`"${bill.name}" sensibilizado!`, 'success');
    try {
      await reconcileTransactionWithBill(userId || '', transaction.id, bill, transaction.date);
    } catch (err) {
      console.error('Erro ao conciliar conta:', err);
      setOptimisticPaidBillIds(prev => {
        const copy = { ...prev };
        delete copy[bill.id];
        return copy;
      });
      addToast(`Erro ao conciliar "${bill.name}". Tente novamente.`, 'error');
    } finally {
      setReconcilingId(null);
    }
  };

  const handleReconcileAll = async () => {
    setReconcilingId('all');
    const entries = Array.from(billsWithCandidates.entries());
    const count = entries.length;
    setOptimisticPaidBillIds(prev => {
      const copy = { ...prev };
      for (const [billId] of entries) {
        copy[billId] = true;
      }
      return copy;
    });
    addToast(count === 1 ? 'Conta sensibilizada!' : `${count} contas sensibilizadas!`, 'success');
    try {
      for (const [billId, match] of entries) {
        const bill = recurringBills.find(b => b.id === billId);
        if (bill && match) {
          await reconcileTransactionWithBill(userId || '', match.transaction.id, bill, match.transaction.date);
        }
      }
    } catch (err) {
      console.error('Erro ao conciliar todas as contas:', err);
      addToast('Ocorreu um erro ao conciliar algumas contas.', 'error');
    } finally {
      setReconcilingId(null);
    }
  };

  const handleDirectMarkPaid = async (bill: RecurringBill) => {
    setDirectPayingId(bill.id);
    setOptimisticPaidBillIds(prev => ({ ...prev, [bill.id]: true }));
    addToast(`"${bill.name}" sensibilizado!`, 'success');
    try {
      await markBillPaidDirectly(userId || '', bill.id, getLocalDateString());
    } catch (err) {
      console.error('Erro ao dar baixa manual na conta:', err);
      setOptimisticPaidBillIds(prev => {
        const copy = { ...prev };
        delete copy[bill.id];
        return copy;
      });
      addToast(`Erro ao dar baixa em "${bill.name}". Tente novamente.`, 'error');
    } finally {
      setDirectPayingId(null);
    }
  };

  const handleDismissMatch = (billId: string) => {
    setDismissedMatches(prev => ({ ...prev, [billId]: true }));
  };

  useEffect(() => {
    if (shouldExpandInitial) {
      setBillsExpanded(true);
      window.setTimeout(() => {
        if (highlightBillParam) {
          const el = document.getElementById(`recurring-bill-${highlightBillParam}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    } else if (viewParam === 'faturas' || cardIdParam) {
      window.setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 250);
    }

    if (highlightBillParam) {
      setHighlightedBillId(highlightBillParam);
      const timer = window.setTimeout(() => setHighlightedBillId(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [shouldExpandInitial, highlightBillParam, viewParam, cardIdParam]);

  if (activeInvoices.length === 0 && effectivePendingBills.length === 0 && recurringBills.length === 0) return null;

  const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const hasPendencies = activeInvoices.length > 0 || effectivePendingBills.length > 0;
  const anyOverdue = activeInvoices.some(inv => {
    if (!inv.dueDate || inv.storedStatus === 'paid') return false;
    return new Date(inv.dueDate.replace(/-/g, '/')) < new Date();
  }) || recurringBills.some(b => {
    if (b.isActive === false) return false;
    if (checkIsBillPaid(b, safeTransactions)) return false;
    return (b.dueDay || 31) < new Date().getDate();
  });

  const sectionBorder = anyOverdue
    ? 'border-l-4 border-l-status-danger/40'
    : hasPendencies
      ? 'border-l-4 border-l-brand-accent/40'
      : '';

  const invoiceCount = activeInvoices.length;
  // Grade pelo volume, sem trilhas vazias (ver invoiceGridClass).
  const gridClass = invoiceGridClass(invoiceCount);

  return (
    <div ref={containerRef} id="pending-obligations-container" className={`bg-surface-primary dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-panel p-5 shadow-panel space-y-4 ${sectionBorder}`}>
      <div>
        <h2 className="text-sm font-black text-text-primary dark:text-white tracking-tight">Obrigações do mês</h2>
        <p className="text-[11px] text-text-muted dark:text-slate-400 font-medium mt-0.5">
          Faturas do ciclo e contas fixas recorrentes
        </p>
      </div>
      {/* SEÇÃO DE FATURAS */}
      {invoiceCount > 0 && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted dark:text-slate-400 px-1">
            Faturas do ciclo
          </p>
          <div className={gridClass}>
          {activeInvoices.map((inv) => (
            <div
              key={inv.cardId}
              role="button"
              tabIndex={0}
              onClick={() => {
                onNavigate?.('manager', { openCards: true, focusedCardId: inv.cardId });
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onNavigate?.('manager', { openCards: true, focusedCardId: inv.cardId });
                }
              }}
              className="bg-surface-subtle dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-4 rounded-section flex items-center gap-4 group cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all active:scale-[0.98]"
            >
              <div className="p-3 bg-brand-secondary/10 dark:bg-slate-700 rounded-2xl text-brand-secondary dark:text-emerald-400 group-hover:scale-110 transition-transform">
                <CardIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-muted dark:text-slate-400 text-[10px] font-black uppercase tracking-widest truncate">
                  {inv.cardName}
                </p>
                <h3 className="text-lg font-black text-text-primary dark:text-white mt-0.5 tabular-nums break-words">
                  {isPrivacyMode ? '••••' : `R$ ${fmt(inv.total)}`}
                </h3>
                {formatCycleDate(inv.dueDate) ? (
                  <p className="text-[11px] font-bold text-text-muted dark:text-slate-400 mt-1">
                    Sai da folga do mês{' '}
                    <span className="font-black text-slate-700 dark:text-slate-200">
                      em {formatCycleDate(inv.dueDate)}
                    </span>
                  </p>
                ) : (
                  <p className="text-[11px] font-medium text-text-muted dark:text-slate-400 mt-1">
                    Fatura em aberto
                  </p>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      {/* SEÇÃO DE CONTAS RECORRENTES */}
      {recurringBills.length > 0 && (
        <div className={`space-y-3 ${invoiceCount > 0 ? 'border-t border-slate-200 dark:border-slate-800 pt-4' : ''}`}>
          {filterParam === 'next5days' && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold">⚠️ Atenção ao Caixa: Contas dos próximos 5 dias</span>
              <span className="font-black">
                {isPrivacyMode ? '••••' : `R$ ${fmt(effectivePendingBills.reduce((s, b) => s + (b.amount || 0), 0))}`}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setBillsExpanded((prev) => !prev)}
            className="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 border-b border-surface-elevated dark:border-slate-800 hover:border-brand-primary/30 dark:hover:border-emerald-500/30 transition-colors group min-h-[44px]"
            aria-expanded={billsExpanded}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Clock size={15} className="text-text-muted dark:text-slate-400 group-hover:text-brand-primary dark:group-hover:text-emerald-400 transition-colors shrink-0" />
              <p className="text-[11px] font-black uppercase tracking-ultra-wide text-text-muted dark:text-slate-400 group-hover:text-text-primary dark:group-hover:text-white transition-colors">
                Contas Fixas Recorrentes
              </p>
              <span className="text-[10px] font-bold text-text-muted dark:text-slate-300 bg-surface-elevated/60 dark:bg-slate-800 px-2 py-0.5 rounded-lg whitespace-nowrap">
                {effectivePendingBills.length} pendente{effectivePendingBills.length !== 1 ? 's' : ''}
              </span>
              {billsWithCandidates.size > 0 && (
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-lg flex items-center gap-1 whitespace-nowrap animate-pulse">
                  <Sparkles size={10} />
                  {billsWithCandidates.size} a conciliar
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ml-auto">
              {effectivePendingBills.length > 0 && (
                <span className="text-xs font-black text-text-muted dark:text-slate-300 tabular-nums whitespace-nowrap">
                  {isPrivacyMode ? '••••' : `R$ ${fmt(effectivePendingBills.reduce((s, b) => s + b.amount, 0))}`}
                </span>
              )}
              <ChevronDown
                size={16}
                className={`text-text-muted dark:text-slate-400 transition-transform duration-200 ${billsExpanded ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {billsExpanded && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              {billsWithCandidates.size > 0 && (
                <div
                  data-testid="batch-reconciliation-banner"
                  className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/90 dark:border-emerald-800/90 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-xl shrink-0 mt-0.5 sm:mt-0">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 dark:text-emerald-200 uppercase tracking-tight">
                        Conciliação Inteligente de Contas
                      </h4>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium mt-0.5">
                        {billsWithCandidates.size === 1
                          ? 'Detectamos 1 pagamento avulso no extrato compatível com uma conta fixa pendente.'
                          : `Detectamos ${billsWithCandidates.size} pagamentos avulsos no extrato compatíveis com contas fixas pendentes.`}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={reconcilingId === 'all'}
                    onClick={handleReconcileAll}
                    data-testid="reconcile-all-btn"
                    className="self-end sm:self-auto px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  >
                    <CheckCheck size={14} />
                    Conciliar {billsWithCandidates.size > 1 ? `Todas (${billsWithCandidates.size})` : 'e Baixar'}
                  </button>
                </div>
              )}

              {[...recurringBills]
                .sort((a, b) => {
                  const today = new Date().getDate();
                  const aPaid = !a.isActive ? false : checkIsBillPaid(a, safeTransactions);
                  const bPaid = !b.isActive ? false : checkIsBillPaid(b, safeTransactions);
                  if ((b.dueDay || 31) !== (a.dueDay || 31)) return (b.dueDay || 31) - (a.dueDay || 31);
                  return (aPaid ? 1 : 0) - (bPaid ? 1 : 0);
                })
                .map((bill) => {
                const paid = checkIsBillPaid(bill, safeTransactions);
                const inactive = !bill.isActive;
                const today = new Date().getDate();
                const dueDay = bill.dueDay || 31;
                const isHighlighted = highlightedBillId === bill.id;
                const match = billsWithCandidates.get(bill.id);

                let statusLabel: string;
                let statusIcon: React.ReactNode;
                if (inactive) {
                  statusLabel = 'Inativa';
                  statusIcon = <Ban size={10} />;
                } else if (paid) {
                  statusLabel = 'Paga';
                  statusIcon = <CircleCheckBig size={10} />;
                } else if (dueDay === today) {
                  statusLabel = 'Vencendo hoje';
                  statusIcon = <Circle size={10} />;
                } else if (dueDay > today) {
                  statusLabel = 'A vencer';
                  statusIcon = <Circle size={10} />;
                } else {
                  statusLabel = 'Vencida - Não paga';
                  statusIcon = <Circle size={10} />;
                }

                let rowStyle: string;
                let iconStyle: string;
                let statusBadgeStyle: string;
                if (inactive) {
                  rowStyle = 'bg-surface-secondary/50 dark:bg-slate-800/40 border-surface-elevated/50 dark:border-slate-700/50';
                  iconStyle = 'bg-surface-elevated/50 dark:bg-slate-700 text-text-muted dark:text-slate-400';
                  statusBadgeStyle = 'text-text-muted dark:text-slate-400 bg-surface-elevated/70 dark:bg-slate-700';
                } else if (paid) {
                  rowStyle = 'bg-status-success/5 dark:bg-emerald-950/20 border-status-success/20 dark:border-emerald-800/40';
                  iconStyle = 'bg-status-success/10 dark:bg-emerald-900/40 text-action-primaryDark dark:text-emerald-400';
                  statusBadgeStyle = 'text-action-primaryDark dark:text-emerald-400 bg-status-success/10 dark:bg-emerald-950/50';
                } else if (dueDay < today) {
                  rowStyle = 'bg-status-danger/5 dark:bg-rose-950/20 border-status-danger/20 dark:border-rose-800/40';
                  iconStyle = 'bg-status-danger/10 dark:bg-rose-900/40 text-action-dangerDark dark:text-rose-400';
                  statusBadgeStyle = 'text-action-dangerDark dark:text-rose-400 bg-status-danger/10 dark:bg-rose-950/50';
                } else {
                  rowStyle = 'bg-surface-subtle dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600';
                  iconStyle = 'bg-brand-primary/10 dark:bg-emerald-900/40 text-action-primaryDark dark:text-emerald-400';
                  statusBadgeStyle = 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50';
                }

                if (isHighlighted) {
                  rowStyle = 'bg-amber-50/90 dark:bg-amber-950/70 border-amber-400 dark:border-amber-500 ring-2 ring-amber-400 dark:ring-amber-500 shadow-sm';
                }

                return (
                  <div
                    key={bill.id}
                    id={`recurring-bill-${bill.id}`}
                    className={`rounded-item border p-3.5 transition-all ${rowStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${iconStyle}`}>
                        {bill.type === 'subscription' ? <Check size={16} /> : <Clock size={16} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted dark:text-slate-400">
                            Dia {bill.dueDay} • {bill.type === 'fixed' ? 'Conta Fixa' : 'Assinatura'}
                          </p>
                          {isHighlighted && (
                            <span className="text-[9px] font-bold text-amber-800 dark:text-amber-200 bg-amber-200/80 dark:bg-amber-900/80 px-1.5 py-0.5 rounded">
                              Citada na Notificação
                            </span>
                          )}
                          <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg ${statusBadgeStyle}`}>
                            {statusIcon} {statusLabel}
                          </span>
                        </div>
                        <p className="text-sm font-black text-text-primary dark:text-white mt-0.5 truncate">{bill.name}</p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <p className={`text-sm font-black ${inactive ? 'text-text-muted dark:text-slate-500' : 'text-text-primary dark:text-white'}`}>
                          {isPrivacyMode ? '••••' : `R$ ${fmt(bill.amount)}`}
                        </p>
                        {!inactive && !paid && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDirectMarkPaid(bill)}
                              disabled={directPayingId === bill.id}
                              className="p-1.5 bg-surface-secondary dark:bg-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-600 text-text-muted dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                              title="Já paguei (dar baixa manual sem gerar novo débito no extrato)"
                              data-testid={`mark-paid-direct-${bill.id}`}
                            >
                              <CircleCheckBig size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenForm({
                                type: 'expense',
                                category: bill.category,
                                amount: bill.amount,
                                description: bill.name,
                                date: getLocalDateString(),
                                autoFocusAmount: true,
                                linkedRecurringBillId: bill.id,
                              })}
                              className="p-1.5 bg-surface-secondary dark:bg-slate-700 hover:bg-brand-primary/10 dark:hover:bg-emerald-950/50 text-action-primaryDark dark:text-emerald-400 rounded-xl transition-colors shadow-sm"
                              title="Lançar pagamento no extrato"
                              data-testid={`pay-bill-${bill.id}`}
                            >
                              <Check size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* SUGESTÃO DE CONCILIAÇÃO PROATIVA */}
                    {!inactive && !paid && match && (
                      <div
                        data-testid={`reconciliation-suggestion-${bill.id}`}
                        className="mt-2.5 pt-2.5 border-t border-emerald-200/60 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs animate-in fade-in duration-200"
                      >
                        <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 min-w-0">
                          <Sparkles size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">
                            Detectamos <strong className="font-black text-emerald-950 dark:text-emerald-100">"{match.transaction.description}"</strong> (R$ {fmt(Number(match.transaction.amount))}) em {match.transaction.date.split('-').reverse().slice(0, 2).join('/')}.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleDismissMatch(bill.id)}
                            className="text-[10px] font-bold text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white px-1.5 py-0.5 rounded transition-colors"
                            title="Ignorar esta correspondência"
                          >
                            Ignorar
                          </button>
                          <button
                            type="button"
                            disabled={reconcilingId === bill.id}
                            onClick={() => handleReconcileSingle(bill, match.transaction)}
                            data-testid={`reconcile-btn-${bill.id}`}
                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                            title="Vincular este lançamento à conta fixa e dar baixa imediata sem duplicar débito"
                          >
                            <Check size={12} />
                            Conciliar e Baixar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setBillsExpanded(false)}
                className="w-full flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-ultra-wide text-text-muted dark:text-slate-400 hover:text-text-primary dark:hover:text-white transition-colors border border-dashed border-surface-elevated dark:border-slate-800 rounded-2xl hover:border-brand-primary/30 dark:hover:border-emerald-500/30"
              >
                <ChevronDown size={14} className="rotate-180" />
                Recolher
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PendingObligations;
