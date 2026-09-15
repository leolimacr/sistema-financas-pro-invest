import React, { useState, useMemo } from 'react';
import { Pencil, Trash2, ChevronDown, Calendar } from 'lucide-react';
import { useCards } from '../../../hooks/useCards';
import { useAuth } from '../../../contexts/AuthContext';
import { getLocalDateString } from '../../../utils/dateHelpers';

interface TransactionHistoryProps {
  transactions: any[];
  onDelete: (id: string) => void;
  onEdit: (t: any) => void;
  isPrivacyMode: boolean;
  isDisabled?: boolean;
  invoiceLookup?: Map<string, { transacoes: Array<{ id: string; description: string; amount: number; date: string }>; total: number }>;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, onDelete, onEdit, isPrivacyMode, isDisabled, invoiceLookup }) => {
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
    () => transactions.filter(t => !(t as any).isFutureLaunch && !t.isVirtual && t.date > today),
    [transactions, today]
  );

  const pastTransactions = useMemo(
    () => transactions.filter(t => !(t as any).isFutureLaunch && !t.isVirtual && t.date <= today),
    [transactions, today]
  );

  const futureTransactions = useMemo(
    () => transactions.filter(t => (t as any).isFutureLaunch || t.isVirtual),
    [transactions]
  );

  const expandedComposition = useMemo(() => {
    if (!expandedPaymentId) return null;
    const allPast = [...pastTransactions, ...futureDatedTransactions];
    const tx = allPast.find(t => t.id === expandedPaymentId);
    if (!tx || !tx.linkedCardId || !tx.linkedInvoicePeriodEnd) return null;
    const key = `${tx.linkedCardId}-${tx.linkedInvoicePeriodEnd}`;
    return invoiceLookup?.get(key) || null;
  }, [expandedPaymentId, pastTransactions, futureDatedTransactions, invoiceLookup]);

  return (
    <div className={`bg-surface-primary border border-surface-elevated rounded-4xl overflow-hidden shadow-soft ${isDisabled ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-secondary text-xxs font-black text-text-muted uppercase tracking-ultra-wide">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3 text-right">Valor</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-elevated">
            {pastTransactions.length === 0 && futureDatedTransactions.length === 0 && futureTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-muted font-bold uppercase text-xxs">
                  Nenhum lançamento encontrado
                </td>
              </tr>
                ) : (
                  <>

                    {/* DESPESAS AGENDADAS (usuário criou manualmente) */}
                    {futureDatedTransactions.length > 0 && (
                      <>
                        <tr className="border-t-2 border-orange-200">
                          <td colSpan={5} className="px-4 py-2 bg-orange-50/40">
                            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-700">
                              <Calendar size={14} />
                              Despesas agendadas ({futureDatedTransactions.length})
                            </p>
                          </td>
                        </tr>

                        {futureDatedTransactions.map((t) => {
                          const rowClass = 'bg-orange-50/80 hover:bg-orange-100/70 transition-colors group align-middle border-l-4 border-l-orange-400 border border-orange-200';
                          const categoryClass = 'inline-flex items-center px-2.5 py-1 bg-orange-100 border border-orange-200 rounded-full text-xxs font-black text-orange-700';

                          return (
                            <tr key={t.id} className={rowClass}>
                              <td className="px-4 py-3 text-xxs text-text-secondary font-medium whitespace-nowrap">
                                {new Date(t.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                              </td>
                              <td className="px-4 py-3 text-sm text-text-primary font-bold leading-tight">
                                <div className="flex flex-col gap-1">
                                  {t.description}
                                  <div className="flex">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-200 border border-orange-300 text-[9px] font-black text-orange-800 uppercase tracking-wider leading-none shadow-sm">
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
                              <td className="px-4 py-3 text-right font-black text-sm whitespace-nowrap text-orange-700">
                                {isPrivacyMode ? '••••' : `R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex justify-center gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                                    disabled={isDisabled}
                                    className="p-2 text-text-muted hover:text-brand-secondary hover:bg-brand-secondary/10 active:bg-brand-secondary/20 rounded-lg transition-all disabled:opacity-50"
                                    title="Editar"
                                  >
                                    <Pencil size={16}/>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (window.confirm(`Deseja excluir "${t.description}"?`)) onDelete(t.id); }}
                                    disabled={isDisabled}
                                    className="p-2 text-text-muted hover:text-status-danger hover:bg-status-danger/10 active:bg-status-danger/20 rounded-lg transition-all disabled:opacity-50"
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
                        <tr className="border-t-2 border-amber-200">
                          <td colSpan={5} className="px-4 py-2 bg-amber-50/40">
                            <button
                              type="button"
                              onClick={() => setShowFutures(!showFutures)}
                              className="flex items-center gap-2 w-full text-left text-[10px] font-black uppercase tracking-widest text-amber-800"
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
                      const categoryClass = 'inline-flex items-center px-2.5 py-1 bg-amber-100 border border-amber-200 rounded-full text-xxs font-black text-amber-800 uppercase tracking-wider';

                      return (
                        <tr key={t.id} className="bg-amber-50/80 hover:bg-amber-100/70 transition-colors group align-middle border-l-4 border-l-amber-400">
                          <td className="px-4 py-3 text-xxs text-text-secondary font-medium whitespace-nowrap">
                            {'Lançamento futuro'}
                            {(t as any).dueDate && (
                              <div className="text-[9px] font-bold text-amber-700 mt-1">
                                Vence em {new Date((t as any).dueDate.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-text-primary font-bold leading-tight">
                            <div className="flex flex-col gap-1">
                              {t.description.replace(/^Lançamento futuro\s*[-–]\s*/i, '')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={categoryClass}>
                              Lançamento futuro
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-black text-sm whitespace-nowrap text-amber-700">
                            {isPrivacyMode ? '••••' : `R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-2">
                              <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 px-2 py-1 rounded-lg bg-amber-100 border border-amber-200">
                                Previsto
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}

                {pastTransactions.map((t) => {
                  const isBillPayment = t.isBillPayment === true;
                  const rowClass = isBillPayment
                    ? 'bg-violet-100/80 hover:bg-violet-200/70 transition-colors group align-middle border-l-4 border-l-violet-500 border border-violet-300 cursor-pointer'
                    : 'hover:bg-surface-secondary/50 transition-colors group align-middle';
                  const categoryClass = isBillPayment
                    ? 'inline-flex items-center px-2.5 py-1 bg-violet-200 border border-violet-300 rounded-full text-xxs font-black text-violet-800'
                    : 'inline-flex items-center px-2.5 py-1 bg-surface-secondary border border-surface-elevated rounded-full text-xxs font-bold text-text-secondary';

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
                      <td className="px-4 py-3 text-xxs text-text-secondary font-medium whitespace-nowrap">
                        {new Date(t.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary font-bold leading-tight">
                        <div className="flex flex-col gap-1">
                          {t.description}
                          {isBillPayment && (
                            <div className="flex">
                              <span className="px-2 py-0.5 rounded-md bg-violet-200 border border-violet-300 text-[9px] font-black text-violet-800 uppercase tracking-wider leading-none shadow-sm">
                                Pagamento de fatura
                              </span>
                            </div>
                          )}
                          {t.paymentMethod === 'credit' && !isBillPayment && (
                            <div className="flex">
                              <span className="px-1.5 py-0.5 bg-brand-secondary/10 border border-brand-secondary/20 rounded-md text-[9px] font-black text-brand-secondary uppercase tracking-wider">
                                {t.cardId && cardMap[t.cardId] ? cardMap[t.cardId] : 'Crédito'}
                              </span>
                            </div>
                          )}
                          {t.paymentMethod === 'voucher' && !isBillPayment && (
                            <div className="flex">
                              <span className="px-1.5 py-0.5 bg-emerald-100 border border-emerald-200 rounded-md text-[9px] font-black text-emerald-700 uppercase tracking-wider">
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
                      <td className={`px-4 py-3 text-right font-black text-sm whitespace-nowrap ${isBillPayment ? 'text-red-800' : t.type === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isPrivacyMode ? '••••' : `R$ ${Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); onEdit(t); }}
                            disabled={isDisabled}
                            className="p-2 text-text-muted hover:text-brand-secondary hover:bg-brand-secondary/10 active:bg-brand-secondary/20 rounded-lg transition-all disabled:opacity-30"
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
                            className="p-2 text-text-muted hover:text-status-danger hover:bg-status-danger/10 active:bg-status-danger/20 rounded-lg transition-all disabled:opacity-30"
                            title={isBillPayment ? "Excluir pagamento e estornar fatura" : "Excluir"}
                          >
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isBillPayment && expandedPaymentId === t.id && expandedComposition && expandedComposition.transacoes.length > 0 && (
                      <tr className="bg-violet-50/50">
                        <td colSpan={5} className="px-4 py-3">
                          <div className="rounded-2xl bg-white border border-violet-200 p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <p className="text-[9px] font-black uppercase tracking-widest text-violet-700 mb-2">
                              Composição da fatura
                            </p>
                            <div className="divide-y divide-violet-100">
                              {expandedComposition.transacoes.map((tx) => (
                                <div key={tx.id} className="flex justify-between items-center py-2">
                                  <div className="min-w-0 flex-1 pr-4">
                                    <p className="text-xs font-medium text-text-primary truncate">
                                      {tx.description}
                                    </p>
                                    <p className="text-[9px] text-text-muted mt-0.5">
                                      {new Date(tx.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                  <p className="text-xs font-black text-text-primary tabular-nums shrink-0">
                                     R$ {tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div className="border-t border-violet-200 pt-3 space-y-1.5">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wider">
                                  Pagamento
                                </span>
                                <span className="text-sm font-black text-red-700 tabular-nums">
                                   -R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-text-primary uppercase tracking-wider">
                                  Total da fatura
                                </span>
                                <span className="text-sm font-black text-text-primary tabular-nums">
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
