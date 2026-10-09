import React, { useState, useMemo } from 'react';
import { Pencil, Trash2, ChevronDown, Calendar } from 'lucide-react';
import { useCards } from '../../../hooks/useCards';
import { useAuth } from '../../../contexts/AuthContext';
import { getLocalDateString, isPreviousInstallment, getOriginalPurchaseDate } from '../../../utils/dateHelpers';

interface TransactionHistoryProps {
  transactions: any[];
  allTransactions?: any[];
  onDelete: (id: string) => void;
  onEdit: (t: any) => void;
  isPrivacyMode: boolean;
  isDisabled?: boolean;
  invoiceLookup?: Map<string, { transacoes: Array<{ id: string; description: string; amount: number; date: string; purchaseDate?: string; installments?: number; currentInstallment?: number }>; total: number }>;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, allTransactions, onDelete, onEdit, isPrivacyMode, isDisabled, invoiceLookup }) => {
  const { user } = useAuth();
  const { cards: userCards } = useCards(user?.uid);

  const cardMap = useMemo(() => {
    const map: Record<string, string> = {};
    userCards.forEach(c => {
      map[c.id] = c.name;
    });
    return map;
  }, [userCards]);

  const [showFutures, setShowFutures] = useState(false);
  const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);

  const today = getLocalDateString();

  const futureDatedTransactions = useMemo(
    () => transactions.filter(t => !(t as any).isFutureLaunch && !t.isVirtual && !isPreviousInstallment(t) && t.date > today),
    [transactions, today]
  );

  const pastTransactions = useMemo(
    () => transactions.filter(t => !(t as any).isFutureLaunch && !t.isVirtual && !isPreviousInstallment(t) && t.date <= today),
    [transactions, today]
  );

  const futureTransactions = useMemo(
    () => transactions.filter(t => (t as any).isFutureLaunch || t.isVirtual),
    [transactions]
  );

  const expandedComposition = useMemo(() => {
    if (!expandedPaymentId) return null;
    const all = [...pastTransactions, ...futureDatedTransactions, ...futureTransactions];
    const tx = all.find(t => t.id === expandedPaymentId);
    if (!tx) return null;
    const cardId = tx.linkedCardId || tx.cardId;
    const periodEnd = tx.linkedInvoicePeriodEnd || (typeof tx.id === 'string' && tx.id.startsWith('virtual-inv-') ? tx.id.replace(`virtual-inv-${cardId}-`, '').replace(`virtual-inv-${cardId}`, '') : null);

    if (cardId && periodEnd) {
      const direct = invoiceLookup?.get(`${cardId}-${periodEnd}`);
      if (direct) return direct;
    }

    if (cardId && invoiceLookup) {
      for (const [key, value] of invoiceLookup.entries()) {
        if (key.startsWith(`${cardId}-`)) {
          return value;
        }
      }
    }

    return null;
  }, [expandedPaymentId, pastTransactions, futureDatedTransactions, futureTransactions, invoiceLookup]);

  return (
    <div className={`bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 rounded-4xl overflow-hidden shadow-soft ${isDisabled ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-secondary dark:bg-slate-800/60 text-xxs font-black text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-elevated dark:divide-slate-800">
            {pastTransactions.length === 0 && futureDatedTransactions.length === 0 && futureTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-muted dark:text-slate-400 font-bold uppercase text-xxs">
                  Nenhum lançamento encontrado
                </td>
              </tr>
                ) : (
                  <>

                    {/* DESPESAS AGENDADAS (usuário criou manualmente) */}
                    {futureDatedTransactions.length > 0 && (
                      <>
                        <tr className="border-t-2 border-orange-200 dark:border-orange-900/60">
                          <td colSpan={5} className="px-4 py-2 bg-orange-50/40 dark:bg-orange-950/20">
                            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-400">
                              <Calendar size={14} />
                              Despesas agendadas ({futureDatedTransactions.length})
                            </p>
                          </td>
                        </tr>

                        {futureDatedTransactions.map((t) => {
                          const rowClass = 'bg-orange-50/80 dark:bg-orange-950/20 hover:bg-orange-100/70 dark:hover:bg-orange-900/30 transition-colors group align-middle border-l-4 border-l-orange-400 dark:border-l-orange-500 border border-orange-200 dark:border-orange-900/40';
                          const categoryClass = 'inline-flex items-center px-2.5 py-1 bg-orange-100 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-full text-xxs font-black text-orange-700 dark:text-orange-300';

                          return (
                            <tr key={t.id} className={rowClass}>
                              <td className="px-4 py-3 text-xxs text-text-secondary dark:text-slate-400 font-medium whitespace-nowrap">
                                {new Date(t.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-4 py-3 text-sm text-text-primary dark:text-white font-bold leading-tight">
                                <div className="flex flex-col gap-1">
                                  {t.description}
                                  <div className="flex">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-200 dark:bg-orange-900/50 border border-orange-300 dark:border-orange-700 text-[9px] font-black text-orange-800 dark:text-orange-200 uppercase tracking-wider leading-none shadow-sm">
                                      <Calendar size={9} />
                                      Agendado
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className={categoryClass}>
                                  {t.category}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-black text-sm whitespace-nowrap text-orange-700 dark:text-orange-400">
                                {isPrivacyMode ? '••••' : `R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                                    disabled={isDisabled}
                                    className="p-2 text-text-muted dark:text-slate-400 hover:text-brand-secondary dark:hover:text-emerald-400 hover:bg-brand-secondary/10 dark:hover:bg-emerald-500/10 active:bg-brand-secondary/20 rounded-lg transition-all disabled:opacity-50"
                                    title="Editar"
                                  >
                                    <Pencil size={16}/>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (window.confirm(`Deseja excluir "${t.description}"?`)) onDelete(t.id); }}
                                    disabled={isDisabled}
                                    className="p-2 text-text-muted dark:text-slate-400 hover:text-status-danger dark:hover:text-rose-400 hover:bg-status-danger/10 dark:hover:bg-rose-500/10 active:bg-status-danger/20 rounded-lg transition-all disabled:opacity-50"
                                    title="Excluir"
                                  >
                                    <Trash2 size={16}/>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}

                    {futureTransactions.length > 0 && (
                      <>
                        <tr className="border-t-2 border-amber-200 dark:border-amber-900/60">
                          <td colSpan={5} className="px-4 py-2 bg-amber-50/40 dark:bg-amber-950/20">
                            <button
                              type="button"
                              onClick={() => setShowFutures(!showFutures)}
                              className="flex items-center gap-2 w-full text-left text-[10px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-400"
                            >
                              <ChevronDown
                                size={14}
                                className={`transition-transform duration-200 ${showFutures ? 'rotate-180' : ''}`}
                              />
                              Faturas previstas ({futureTransactions.length})
                            </button>
                          </td>
                        </tr>

                        {showFutures && futureTransactions.map((t) => {
                          const categoryClass = 'inline-flex items-center px-2.5 py-1 bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-full text-xxs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider';
                          const isExpanded = expandedPaymentId === t.id;

                          return (
                            <React.Fragment key={t.id}>
                              <tr
                                onClick={() => setExpandedPaymentId(isExpanded ? null : t.id)}
                                className="bg-amber-50/80 dark:bg-amber-950/20 hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-colors group align-middle border-l-4 border-l-amber-400 dark:border-l-amber-500 cursor-pointer"
                              >
                                <td className="px-4 py-3 text-xxs text-text-secondary dark:text-slate-400 font-medium whitespace-nowrap">
                                  {'Lançamento futuro'}
                                  {(t as any).dueDate && (
                                    <div className="text-[9px] font-bold text-amber-700 dark:text-amber-400 mt-1">
                                      Vence em {new Date((t as any).dueDate.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-text-primary dark:text-white font-bold leading-tight">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5">
                                      <span>{t.description.replace(/^Lançamento futuro\s*[-–]\s*/i, '')}</span>
                                      <ChevronDown
                                        size={14}
                                        className={`text-amber-700 dark:text-amber-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                      />
                                    </div>
                                    <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400">
                                      {isExpanded ? 'Ocultar compras e parcelas' : 'Clique para ver compras e parcelas desta fatura'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className={categoryClass}>
                                    Fatura Prevista
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right font-black text-sm whitespace-nowrap text-amber-700 dark:text-amber-400">
                                  {isPrivacyMode ? '••••' : `R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex justify-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                                      Previsto
                                    </span>
                                  </div>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr className="bg-amber-50/50 dark:bg-amber-950/20">
                                  <td colSpan={5} className="px-4 py-3">
                                    <div className="rounded-2xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                      <div className="flex items-center justify-between border-b border-amber-100 dark:border-amber-900/40 pb-2 mb-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">
                                          Composição da fatura ({expandedComposition?.transacoes.length || 0} lançamentos)
                                        </p>
                                        <span className="text-[10px] font-black text-amber-700 dark:text-amber-400">
                                          Total da Fatura: {isPrivacyMode ? '••••' : `R$ ${(expandedComposition?.total ?? Number(t.amount)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                        </span>
                                      </div>

                                      {expandedComposition && expandedComposition.transacoes.length > 0 ? (
                                        <div className="divide-y divide-amber-100 dark:divide-slate-800">
                                          {expandedComposition.transacoes.map((tx) => {
                                            const purchaseDateStr = getOriginalPurchaseDate(tx);
                                            const isInst = isPreviousInstallment(tx);

                                            return (
                                              <div key={tx.id} className="flex justify-between items-center py-2 hover:bg-amber-50/40 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors">
                                                <div className="min-w-0 flex-1 pr-4">
                                                  <p className="text-xs font-bold text-text-primary dark:text-white truncate">
                                                    {tx.description}
                                                  </p>
                                                  <p className="text-[9px] text-text-muted dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                    {isInst ? (
                                                      <span className="text-amber-700 dark:text-amber-400 font-semibold">
                                                        Compra original: {new Date(purchaseDateStr.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                                                      </span>
                                                    ) : (
                                                      <span>
                                                        {new Date(tx.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                                                      </span>
                                                    )}
                                                  </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                  <p className="text-xs font-black text-text-primary dark:text-white tabular-nums shrink-0">
                                                    {isPrivacyMode ? '••••' : `R$ ${Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                  </p>
                                                  <div className="flex items-center gap-1">
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const fullTx = (allTransactions || transactions).find(x => x.id === tx.id) || tx;
                                                        onEdit(fullTx);
                                                      }}
                                                      disabled={isDisabled}
                                                      className="p-1.5 text-text-muted dark:text-slate-400 hover:text-brand-secondary dark:hover:text-emerald-400 hover:bg-brand-secondary/10 rounded-lg transition-all"
                                                      title="Editar lançamento"
                                                    >
                                                      <Pencil size={13} />
                                                    </button>
                                                    <button
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (window.confirm(`Deseja excluir "${tx.description}"?`)) onDelete(tx.id);
                                                      }}
                                                      disabled={isDisabled}
                                                      className="p-1.5 text-text-muted dark:text-slate-400 hover:text-status-danger dark:hover:text-rose-400 hover:bg-status-danger/10 rounded-lg transition-all"
                                                      title="Excluir lançamento"
                                                    >
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      ) : (
                                        <p className="text-xxs text-text-muted dark:text-slate-400 py-2">
                                          Nenhum lançamento vinculado localizado nesta fatura.
                                        </p>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                  </>
                )}

                {pastTransactions.map((t) => {
                  const isBillPayment = Boolean(t.isBillPayment && !t.linkedRecurringBillId);
                  const rowClass = isBillPayment
                    ? 'bg-violet-100/80 dark:bg-violet-950/30 hover:bg-violet-200/70 dark:hover:bg-violet-900/30 transition-colors group align-middle border-l-4 border-l-violet-500 border border-violet-300 dark:border-violet-800/60 cursor-pointer'
                    : 'hover:bg-surface-secondary/50 dark:hover:bg-slate-800/40 transition-colors group align-middle';
                  const categoryClass = isBillPayment
                    ? 'inline-flex items-center px-2.5 py-1 bg-violet-200 dark:bg-violet-900/50 border border-violet-300 dark:border-violet-700 rounded-full text-xxs font-black text-violet-800 dark:text-violet-200'
                    : 'inline-flex items-center px-2.5 py-1 bg-surface-secondary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 rounded-full text-xxs font-bold text-text-secondary dark:text-slate-300';

                  return (
                    <React.Fragment key={t.id}>
                    <tr
                      className={rowClass}
                      onClick={() => {
                        if (isBillPayment) {
                          setExpandedPaymentId(expandedPaymentId === t.id ? null : t.id);
                        }
                      }}
                    >
                      <td className="px-4 py-3 text-xxs text-text-secondary dark:text-slate-400 font-medium whitespace-nowrap">
                        {new Date(t.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary dark:text-white font-bold leading-tight">
                        <div className="flex flex-col gap-1">
                          {t.description}
                          {isBillPayment && (
                            <div className="flex">
                              <span className="px-2 py-0.5 rounded-md bg-violet-200 dark:bg-violet-900/50 border border-violet-300 dark:border-violet-700 text-[9px] font-black text-violet-800 dark:text-violet-200 uppercase tracking-wider leading-none shadow-sm">
                                Pagamento de fatura
                              </span>
                            </div>
                          )}
                          {t.paymentMethod === 'credit' && !isBillPayment && (
                            <div className="flex">
                              <span className="px-1.5 py-0.5 bg-brand-secondary/10 dark:bg-emerald-500/10 border border-brand-secondary/20 dark:border-emerald-500/20 rounded-md text-[9px] font-black text-brand-secondary dark:text-emerald-400 uppercase tracking-wider">
                                {t.cardId && cardMap[t.cardId] ? cardMap[t.cardId] : 'Crédito'}
                              </span>
                            </div>
                          )}
                          {t.paymentMethod === 'voucher' && !isBillPayment && (
                            <div className="flex">
                              <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                                {t.cardId && cardMap[t.cardId] ? cardMap[t.cardId] : 'Voucher'}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={categoryClass}>
                          {isBillPayment ? 'Fatura' : t.category}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-black text-sm whitespace-nowrap ${isBillPayment ? 'text-red-800 dark:text-red-400' : t.type === 'income' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        {isPrivacyMode ? '••••' : `R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                            disabled={isDisabled}
                            className="p-2 text-text-muted dark:text-slate-400 hover:text-brand-secondary dark:hover:text-emerald-400 hover:bg-brand-secondary/10 dark:hover:bg-emerald-500/10 active:bg-brand-secondary/20 rounded-lg transition-all disabled:opacity-30"
                            title={isBillPayment ? "Editar data de pagamento" : "Editar"}
                          >
                            <Pencil size={16}/>
                          </button>
                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const confirmMsg = isBillPayment
                                ? `Excluir este pagamento de fatura irá estornar o valor e restabelecer o limite do cartão. Deseja continuar?`
                                : `Deseja excluir "${t.description}"?`;
                              if (window.confirm(confirmMsg)) onDelete(t.id); 
                            }}
                            disabled={isDisabled}
                            className="p-2 text-text-muted dark:text-slate-400 hover:text-status-danger dark:hover:text-rose-400 hover:bg-status-danger/10 dark:hover:bg-rose-500/10 active:bg-status-danger/20 rounded-lg transition-all disabled:opacity-30"
                            title={isBillPayment ? "Excluir pagamento e estornar fatura" : "Excluir"}
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isBillPayment && expandedPaymentId === t.id && expandedComposition && expandedComposition.transacoes.length > 0 && (
                      <tr className="bg-violet-50/50 dark:bg-violet-950/20">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-violet-200 dark:border-violet-800 p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <p className="text-[9px] font-black uppercase tracking-widest text-violet-700 dark:text-violet-300 mb-2">
                              Composição da fatura
                            </p>
                            <div className="divide-y divide-violet-100 dark:divide-slate-800">
                              {expandedComposition.transacoes.map((tx) => {
                                const purchaseDateStr = getOriginalPurchaseDate(tx);
                                const isInst = isPreviousInstallment(tx);
                                return (
                                  <div key={tx.id} className="flex justify-between items-center py-2">
                                    <div className="min-w-0 flex-1 pr-4">
                                      <p className="text-xs font-medium text-text-primary dark:text-white truncate">
                                        {tx.description}
                                      </p>
                                      <p className="text-[9px] text-text-muted dark:text-slate-400 mt-0.5">
                                        {isInst ? (
                                          <span className="text-violet-700 dark:text-violet-300 font-semibold">
                                            Compra original: {new Date(purchaseDateStr.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                                          </span>
                                        ) : (
                                          <span>
                                            {new Date(tx.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                    <p className="text-xs font-black text-text-primary dark:text-white tabular-nums shrink-0">
                                       R$ {Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                            <div className="border-t border-violet-200 dark:border-slate-800 pt-3 space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
                                  Pagamento
                                </span>
                                <span className="text-sm font-black text-red-700 dark:text-red-400 tabular-nums">
                                   -R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-text-primary dark:text-slate-200 uppercase tracking-wider">
                                  Total da fatura
                                </span>
                                <span className="text-sm font-black text-text-primary dark:text-white tabular-nums">
                                   R$ {expandedComposition.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}


              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionHistory;
