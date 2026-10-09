import React from 'react';
import {
  CreditCard as CardIcon,
  RefreshCw,
  Wallet as WalletIcon,
  Check,
  TrendingUp,
  Calendar,
  Plus,
  Settings2,
  EyeOff,
  Eye,
  X,
  ChevronUp,
  ChevronDown,
  Receipt,
  Edit2,
} from 'lucide-react';
import type { CreditCard, Transaction, VoucherType } from '../../../../types';
import { getVoucherCardAvailableBalance } from '../../../../utils/calculations';
import VoucherStatement from '../VoucherStatement';

export interface CardListProps {
  cards: CreditCard[];
  filteredCards: CreditCard[];
  showHidden: boolean;
  setShowHidden: (v: boolean) => void;
  isLoading: boolean;
  transactions: Transaction[];
  onEditTransaction: (t: Transaction) => void;
  onClose: (newCards?: CreditCard[]) => void;
  editingCardId: string | null;
  setEditingCardId: (id: string | null) => void;
  expandedCard: string | null;
  setExpandedCard: (id: string | null | ((prev: string | null) => string | null)) => void;
  cardInvoicesTimeline: any[];
  handleStartEdit: (card: CreditCard) => void;
  handleToggleStatus: (card: CreditCard) => void;
  handleStartPaymentFlow: (inv: any) => void;
  handleSaveEdit: (id: string) => void;
  editCardName: string;
  setEditCardName: (v: string) => void;
  editVoucherBalance: string;
  setEditVoucherBalance: (v: string) => void;
  editVoucherType: VoucherType;
  setEditVoucherType: (v: VoucherType) => void;
  editLimit: string;
  setEditLimit: (v: string) => void;
  editTaxaJuros: string;
  setEditTaxaJuros: (v: string) => void;
  editClosingDay: string;
  setEditClosingDay: (v: string) => void;
  editDueDay: string;
  setEditDueDay: (v: string) => void;
}

export const CardList: React.FC<CardListProps> = ({
  cards,
  filteredCards,
  showHidden,
  setShowHidden,
  isLoading,
  transactions,
  onEditTransaction,
  onClose,
  editingCardId,
  setEditingCardId,
  expandedCard,
  setExpandedCard,
  cardInvoicesTimeline,
  handleStartEdit,
  handleToggleStatus,
  handleStartPaymentFlow,
  handleSaveEdit,
  editCardName,
  setEditCardName,
  editVoucherBalance,
  setEditVoucherBalance,
  editVoucherType,
  setEditVoucherType,
  editLimit,
  setEditLimit,
  editTaxaJuros,
  setEditTaxaJuros,
  editClosingDay,
  setEditClosingDay,
  editDueDay,
  setEditDueDay,
}) => {
  return (
    <div className="bg-surface-primary dark:bg-slate-900 p-6 rounded-4xl border border-surface-elevated dark:border-slate-800 shadow-soft space-y-6 min-h-[500px]">
      <div className="flex items-center justify-between">
        <div className="flex bg-surface-secondary dark:bg-slate-800 p-1 rounded-2xl border border-surface-elevated dark:border-slate-700 w-full max-w-[300px]">
          <button 
            type="button"
            onClick={() => setShowHidden(false)} 
            className={`flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
              !showHidden ? 'bg-surface-primary dark:bg-slate-700 text-text-primary dark:text-white shadow-soft' : 'text-text-muted dark:text-slate-400'
            }`}
          >
            Ativos
          </button>
          <button 
            type="button"
            onClick={() => setShowHidden(true)} 
            className={`flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
              showHidden ? 'bg-surface-primary dark:bg-slate-700 text-text-primary dark:text-white shadow-soft' : 'text-text-muted dark:text-slate-400'
            }`}
          >
            Ocultos
          </button>
        </div>
        {isLoading && <RefreshCw size={16} className="animate-spin text-brand-primary" />}
      </div>

      {filteredCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="p-6 bg-surface-secondary dark:bg-slate-800 rounded-full text-text-muted dark:text-slate-400 opacity-20">
            <CardIcon size={48} />
          </div>
          <p className="text-xxs text-text-muted dark:text-slate-400 font-black uppercase tracking-widest leading-loose max-w-[200px]">
            {showHidden ? 'Nenhum cartão oculto no momento.' : 'Você ainda não cadastrou nenhum cartão ativo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCards.map((card) => {
            const isEditing = editingCardId === card.id;
            const timelineData = cardInvoicesTimeline.find((inv) => inv.cardId === card.id);
            const isVoucher = card.type === 'voucher';

            return (
              <div
                key={card.id}
                className="bg-surface-secondary dark:bg-slate-800/60 rounded-3xl border border-surface-elevated dark:border-slate-700/60 overflow-hidden transition-all group hover:border-brand-primary/30 shadow-sm"
              >
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div
                      className={`p-3 rounded-2xl transition-colors ${
                        isEditing
                          ? 'bg-brand-primary text-text-onBrand'
                          : isVoucher
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : 'bg-surface-primary dark:bg-slate-800 text-text-muted dark:text-slate-400 group-hover:text-brand-primary'
                      }`}
                    >
                      {isVoucher ? <WalletIcon size={24} /> : <CardIcon size={24} />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-base font-black text-text-primary dark:text-white uppercase tracking-tight">
                        {card.name}
                        {isVoucher && (() => {
                          const isRef =
                            card.voucherType === 'refeicao' ||
                            card.name.toLowerCase().includes('refei') ||
                            /\bvr\b/.test(card.name.toLowerCase());
                          const isAli =
                            card.voucherType === 'alimentacao' ||
                            card.name.toLowerCase().includes('alimenta') ||
                            /\bva\b/.test(card.name.toLowerCase());
                          const label = isRef ? 'Refeição' : isAli ? 'Alimentação' : 'Voucher';
                          const colorClass = isRef
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800';
                          return (
                            <span
                              className={`ml-2 inline-block px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider leading-none align-middle ${colorClass}`}
                            >
                              {label}
                            </span>
                          );
                        })()}
                      </span>
                      {!isEditing && (
                        <div className="flex flex-wrap items-center gap-4 mt-2">
                          {isVoucher ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                              <WalletIcon size={12} />
                              <span className="text-[10px] font-black uppercase tracking-tighter">
                                Saldo: R${' '}
                                {getVoucherCardAvailableBalance(card, transactions).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          ) : (
                            <>
                              {card.limit ? (
                                <div className="flex items-center gap-1.5 text-brand-primary dark:text-emerald-400">
                                  <Check size={12} />
                                  <span className="text-[10px] font-black uppercase tracking-tighter">
                                    Limite: R${' '}
                                    {card.limit.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                  </span>
                                </div>
                              ) : null}
                              {card.taxaJuros ? (
                                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                  <TrendingUp size={12} />
                                  <span className="text-[10px] font-black uppercase tracking-tighter">
                                    {card.taxaJuros}% a.m.
                                  </span>
                                </div>
                              ) : null}
                              {card.closingDay && (
                                <div className="flex items-center gap-1.5 text-text-muted dark:text-slate-400">
                                  <Calendar size={12} />
                                  <span className="text-[10px] font-bold uppercase tracking-tighter">
                                    Corte: Dia {card.closingDay}
                                  </span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!showHidden ? (
                      <>
                        {!isEditing ? (
                          <>
                            {isVoucher ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onClose(cards);
                                  onEditTransaction({
                                    paymentMethod: 'voucher',
                                    cardId: card.id,
                                    type: 'expense',
                                  } as any);
                                }}
                                className="p-3 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-2xl transition-all flex items-center gap-2 px-4 cursor-pointer"
                                title="Registrar Gasto no Voucher"
                              >
                                <Plus size={20} />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                                  Lançar
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  onEditTransaction({
                                    paymentMethod: 'credit',
                                    cardId: card.id,
                                    type: 'expense',
                                  } as any)
                                }
                                className="p-3 text-brand-primary dark:text-emerald-400 hover:bg-brand-primary/10 dark:hover:bg-emerald-950/30 rounded-2xl transition-all flex items-center gap-2 px-4 cursor-pointer"
                                title="Registrar Compra"
                              >
                                <Plus size={20} />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">
                                  Registrar
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(card)}
                              className="p-3 text-text-muted dark:text-slate-400 hover:text-brand-primary dark:hover:text-emerald-400 hover:bg-brand-primary/10 dark:hover:bg-slate-800 rounded-2xl transition-all cursor-pointer"
                              title="Editar Cartão"
                            >
                              <Settings2 size={20} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(card)}
                              className="p-3 text-text-muted dark:text-slate-400 hover:text-brand-secondary dark:hover:text-cyan-400 hover:bg-brand-secondary/10 dark:hover:bg-slate-800 rounded-2xl transition-all cursor-pointer"
                              title="Ocultar Cartão (pode ser reativado em Ocultos)"
                            >
                              <EyeOff size={20} />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setEditingCardId(null)}
                            className="p-3 text-text-muted dark:text-slate-400 hover:text-status-danger dark:hover:text-red-400 hover:bg-status-danger/10 dark:hover:bg-red-950/30 rounded-2xl transition-all cursor-pointer"
                            title="Cancelar Edição"
                          >
                            <X size={20} />
                          </button>
                        )}
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(card)}
                        className="p-3 text-text-muted dark:text-slate-400 hover:text-brand-primary dark:hover:text-emerald-400 hover:bg-brand-primary/10 dark:hover:bg-slate-800 rounded-2xl transition-all flex items-center gap-3 px-5 cursor-pointer"
                      >
                        <Eye size={20} />
                        <span className="text-xxs font-black uppercase tracking-widest">Reativar Cartão</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Área de Edição Expandida */}
                {isEditing && (
                  <div className="px-6 pb-6 pt-0 animate-in slide-in-from-top-4 duration-300">
                    <div className="bg-surface-primary dark:bg-slate-900 p-6 rounded-3xl border border-brand-primary/20 space-y-6 shadow-inner">
                      {isVoucher ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">
                                Nome do Cartão
                              </label>
                              <input
                                type="text"
                                value={editCardName}
                                onChange={(e) => setEditCardName(e.target.value)}
                                className="w-full bg-surface-secondary dark:bg-slate-800 p-3 rounded-xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm"
                                placeholder="Ex: Alelo Alimentação, Sodexo..."
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">
                                Saldo Disponível (R$)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editVoucherBalance}
                                onChange={(e) => setEditVoucherBalance(e.target.value)}
                                className="w-full bg-surface-secondary dark:bg-slate-800 p-3 rounded-xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm"
                                placeholder="0.00"
                              />
                              <p className="text-[8px] text-text-muted dark:text-slate-400 ml-1">
                                Ajuste manual do saldo disponível no voucher.
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">
                              Subtipo de Benefício
                            </label>
                            <div className="flex bg-surface-secondary dark:bg-slate-800 p-1 rounded-2xl border border-surface-elevated dark:border-slate-700 gap-1 max-w-md">
                              <button
                                type="button"
                                onClick={() => setEditVoucherType('alimentacao')}
                                className={`flex-1 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
                                  editVoucherType === 'alimentacao'
                                    ? 'bg-emerald-600 text-white shadow-soft'
                                    : 'text-text-muted dark:text-slate-400'
                                }`}
                              >
                                Alimentação
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditVoucherType('refeicao')}
                                className={`flex-1 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
                                  editVoucherType === 'refeicao'
                                    ? 'bg-amber-600 text-white shadow-soft'
                                    : 'text-text-muted dark:text-slate-400'
                                }`}
                              >
                                Refeição
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditVoucherType('outro')}
                                className={`flex-1 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer ${
                                  editVoucherType === 'outro'
                                    ? 'bg-surface-primary dark:bg-slate-700 text-text-primary dark:text-white shadow-soft'
                                    : 'text-text-muted dark:text-slate-400'
                                }`}
                              >
                                Outro
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">
                              Limite Total (R$)
                            </label>
                            <input
                              type="number"
                              value={editLimit}
                              onChange={(e) => setEditLimit(e.target.value)}
                              className="w-full bg-surface-secondary dark:bg-slate-800 p-3 rounded-xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">
                              Juros mensais (%)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editTaxaJuros}
                              onChange={(e) => setEditTaxaJuros(e.target.value)}
                              className="w-full bg-surface-secondary dark:bg-slate-800 p-3 rounded-xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">
                              Dia Corte
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={editClosingDay}
                              onChange={(e) => setEditClosingDay(e.target.value)}
                              className="w-full bg-surface-secondary dark:bg-slate-800 p-3 rounded-xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-text-muted dark:text-slate-400 uppercase tracking-widest ml-1">
                              Dia Vencimento
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={editDueDay}
                              onChange={(e) => setEditDueDay(e.target.value)}
                              className="w-full bg-surface-secondary dark:bg-slate-800 p-3 rounded-xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm"
                            />
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(card.id)}
                        className="w-full py-4 bg-brand-primary text-text-onBrand rounded-2xl font-black uppercase text-xxs tracking-widest flex items-center justify-center gap-2 shadow-brand-glow active:scale-95 transition-all cursor-pointer"
                      >
                        <Check size={16} /> Salvar Alterações
                      </button>
                    </div>
                  </div>
                )}

                {/* Accordion Timeline */}
                {timelineData && !isVoucher && (
                  <div className="border-t border-surface-elevated dark:border-slate-800 bg-surface-primary/30 dark:bg-slate-900/40 p-4">
                    <button 
                      type="button"
                      onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)} 
                      className="flex items-center gap-2 text-xxs font-black uppercase text-brand-primary hover:text-brand-secondary transition-colors cursor-pointer"
                    >
                      {expandedCard === card.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} 
                      {expandedCard === card.id ? 'Ocultar Linha do Tempo' : 'Ver Linha do Tempo de Faturas'}
                    </button>
                    
                    {expandedCard === card.id && (
                      <div className="mt-6 space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-elevated dark:before:bg-slate-800">
                        {timelineData.timeline.length > 0 ? (
                          timelineData.timeline.map((group: any) => (
                            <div key={`${group.year}-${group.month}`} className="relative pl-8 space-y-3">
                              {/* Marcador do Mês na Timeline */}
                              <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-surface-secondary dark:border-slate-800 flex items-center justify-center transition-colors ${group.isCurrent ? 'bg-brand-primary' : 'bg-surface-elevated dark:bg-slate-700'}`}>
                                {group.isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className={`text-[11px] font-black uppercase tracking-widest ${group.isCurrent ? 'text-action-primaryDark dark:text-emerald-400' : 'text-text-primary dark:text-white'}`}>
                                    Fatura de {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(group.year, group.month))}
                                  </h4>
                                  <p className="text-[9px] font-bold text-text-muted dark:text-slate-400 uppercase tracking-tighter mt-0.5">
                                    Vencimento: {new Date(group.dueDate.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-black text-text-primary dark:text-white">R$ {group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                  {group.isCurrent && (
                                    <button
                                      type="button"
                                      onClick={() => handleStartPaymentFlow({ total: group.total, dueDate: group.dueDate, periodEnd: group.periodEnd, invoiceId: `${card.id}_${group.periodEnd}`, cardName: card.name, cardId: card.id })}
                                      className="text-[8px] font-black text-action-primaryDark dark:text-emerald-400 uppercase tracking-widest mt-1 hover:underline cursor-pointer"
                                    >
                                      Pagar Agora
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                {group.transactions.map((t: any) => (
                                  <div key={t.id} className="flex items-center justify-between bg-surface-primary dark:bg-slate-900 p-3 rounded-2xl border border-surface-elevated dark:border-slate-800 text-xs group/item hover:border-brand-primary/20 dark:hover:border-emerald-500/30 transition-all shadow-sm">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-text-primary dark:text-white text-[11px]">{t.description}</span>
                                        {t.installments && t.installments > 1 && (
                                          <span className="px-1.5 py-0.5 bg-brand-primary/10 dark:bg-emerald-950/40 text-action-primaryDark dark:text-emerald-400 text-[8px] font-black rounded-md uppercase">
                                            {t.currentInstallment}/{t.installments}
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-text-muted dark:text-slate-400 text-[9px] font-medium mt-0.5">
                                        Compra em: {new Date(t.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-black text-text-primary dark:text-white">R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                      <button 
                                        type="button"
                                        onClick={() => { onClose(cards); onEditTransaction(t); }} 
                                        className="p-2 text-text-muted dark:text-slate-400 hover:text-brand-primary dark:hover:text-emerald-400 hover:bg-brand-primary/10 dark:hover:bg-slate-800 rounded-xl transition-all opacity-100 md:opacity-0 md:group-hover/item:opacity-100 md:group-focus-within/item:opacity-100 cursor-pointer"
                                      >
                                        <Edit2 size={14}/>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center py-6 text-center">
                            <p className="text-xxs text-text-muted dark:text-slate-400 font-bold uppercase tracking-widest">Nenhuma compra parcelada ou em aberto.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Accordion Extrato de Movimentações (Cartão Voucher) */}
                {isVoucher && (
                  <div className="border-t border-surface-elevated dark:border-slate-800 bg-surface-primary/30 dark:bg-slate-900/40 p-4">
                    <button 
                      type="button"
                      onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)} 
                      className="flex items-center gap-2 text-xxs font-black uppercase text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                    >
                      {expandedCard === card.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} 
                      <Receipt size={14} />
                      {expandedCard === card.id ? 'Ocultar Extrato de Movimentações' : 'Ver Extrato de Movimentações'}
                    </button>

                    {expandedCard === card.id && (
                      <VoucherStatement
                        card={card}
                        transactions={transactions}
                        onEditTransaction={onEditTransaction}
                        onCloseParent={() => onClose(cards)}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
