import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, CreditCard as CardIcon, Trash2, EyeOff, Eye, RefreshCw, Calendar, Settings2, Check, ChevronLeft, ChevronDown, ChevronUp, Edit2, TrendingUp, Wallet as WalletIcon, Receipt } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { addCard, getCards, updateCard, deleteCard } from '../../../services/cardService';
import { payInvoice } from '../../../services/payInvoiceService';
import type { CreditCard, Transaction, VoucherType } from '../../../types';
import { getCurrentInvoice, getInvoiceBillingMonth } from '../../../utils/invoiceUtils';
import { getLocalDateString } from '../../../utils/dateHelpers';
import { calculateWalletStatementSummary, getVoucherCardAvailableBalance } from '../../../utils/calculations';
import VoucherStatement from './VoucherStatement';

interface CardManagerProps {
  isOpen: boolean;
  onClose: (newCards?: CreditCard[]) => void;
  userId: string;
  transactions: Transaction[];
  onEditTransaction: (t: Transaction) => void;
  focusedCardId?: string | null;
  contextualReason?: string;
}

const CardManager: React.FC<CardManagerProps> = ({ isOpen, onClose, userId, transactions, onEditTransaction, focusedCardId, contextualReason }) => {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [newCardName, setNewCardName] = useState('');
  const [newCardType, setNewCardType] = useState<'credit' | 'voucher'>('credit');
  const [newClosingDay, setNewClosingDay] = useState<string>('');
  const [newDueDay, setNewDueDay] = useState<string>('');
  const [newLimit, setNewLimit] = useState<string>('');
  const [newTaxaJuros, setNewTaxaJuros] = useState<string>('');
  const [newVoucherBalance, setNewVoucherBalance] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newVoucherType, setNewVoucherType] = useState<VoucherType>('alimentacao');
  const [editCardName, setEditCardName] = useState<string>('');
  const [editVoucherBalance, setEditVoucherBalance] = useState<string>('');
  const [editVoucherType, setEditVoucherType] = useState<VoucherType>('alimentacao');
  const [showForm, setShowForm] = useState(true);
  const hasInitialized = useRef(false);
  const [editClosingDay, setEditClosingDay] = useState<string>('');
  const [editDueDay, setEditDueDay] = useState<string>('');
  const [editLimit, setEditLimit] = useState<string>('');
  const [editTaxaJuros, setEditTaxaJuros] = useState<string>('');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Estados para o novo fluxo de confirmação de pagamento
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<any>(null);
  const [showEarlyPaymentWarning, setShowEarlyPaymentWarning] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState(getLocalDateString());
  const queryClient = useQueryClient();

  const handleStartPaymentFlow = (inv: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(inv.dueDate.replace(/-/g, '/'));
    dueDate.setHours(0, 0, 0, 0);

    setPendingInvoice(inv);
    setSelectedPaymentDate(getLocalDateString());

    if (today < dueDate) {
      setShowEarlyPaymentWarning(true);
    } else {
      setShowDatePicker(true);
    }
    setIsConfirmingPayment(true);
  };

  const handleConfirmEarlyPayment = () => {
    setShowEarlyPaymentWarning(false);
    setShowDatePicker(true);
  };

  const handleFinalConfirmPayment = async () => {
    if (!userId || !pendingInvoice) return;

    await payInvoice({
      userId,
      cardId: pendingInvoice.cardId,
      cardName: pendingInvoice.cardName,
      amount: pendingInvoice.total,
      date: selectedPaymentDate,
      periodEnd: pendingInvoice.periodEnd,
      invoiceId: pendingInvoice.invoiceId,
      queryClient,
    });

    onClose(cards);
    
    setIsConfirmingPayment(false);
    setPendingInvoice(null);
    setShowEarlyPaymentWarning(false);
    setShowDatePicker(false);
  };

  useEffect(() => {
    if (isOpen && userId) {
      loadCards();
    }
  }, [isOpen, userId]);

  // Previne scroll do body quando o modal está aberto
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Auto-expande o cartão focado quando navega de PendingObligations
  useEffect(() => {
    if (focusedCardId && isOpen && cards.some(c => c.id === focusedCardId)) {
      setExpandedCard(focusedCardId);
    }
  }, [focusedCardId, isOpen, cards]);

  useEffect(() => {
    if (!isLoading && !hasInitialized.current) {
      hasInitialized.current = true;
      if (cards.length > 0) setShowForm(false);
    }
  }, [isLoading, cards.length]);

  useEffect(() => {
    if (editingCardId) setShowForm(true);
  }, [editingCardId]);

  const loadCards = async () => {
    setIsLoading(true);
    try {
      const data = await getCards(userId);
      setCards(data);
    } catch (error) {
      console.error("Erro ao carregar cartões:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newCardName.trim()) return;
    if (newCardType === 'credit') {
      if (!newClosingDay || !newDueDay) return;
      const closing = Number(newClosingDay);
      const due = Number(newDueDay);
      if (closing < 1 || closing > 31 || due < 1 || due > 31) {
        alert("Os dias devem estar entre 1 e 31.");
        return;
      }
    }
    
    const limitVal = Number(newLimit) || 0;
    const taxaJurosVal = newTaxaJuros ? Number(newTaxaJuros) : undefined;

    if (taxaJurosVal !== undefined && (taxaJurosVal < 0 || taxaJurosVal > 100)) {
      alert("A taxa de juros deve estar entre 0% e 100% ao mês.");
      return;
    }

    setIsAdding(true);
    try {
      const closing = newCardType === 'credit' ? Number(newClosingDay) : undefined;
      const due = newCardType === 'credit' ? Number(newDueDay) : undefined;
      const voucherBal = newCardType === 'voucher' ? Number(newVoucherBalance) || 0 : undefined;
      const voucherTypeVal = newCardType === 'voucher' ? newVoucherType : undefined;
      await addCard(
        userId, 
        newCardName.trim(), 
        closing, 
        due,
        limitVal,
        taxaJurosVal,
        newCardType,
        voucherBal,
        voucherTypeVal
      );
      setNewCardName('');
      setNewCardType('credit');
      setNewVoucherType('alimentacao');
      setNewClosingDay('');
      setNewDueDay('');
      setNewLimit('');
      setNewTaxaJuros('');
      setNewVoucherBalance('');

      await loadCards();
    } catch (error) {
      console.error("Erro ao adicionar cartão:", error);
      alert("Erro ao salvar cartão.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleStartEdit = (card: CreditCard) => {
    setEditingCardId(card.id);
    setEditCardName(card.name || '');
    if (card.type === 'voucher') {
      const currentBal = getVoucherCardAvailableBalance(card, transactions);
      setEditVoucherBalance(currentBal.toString());
      const detectedType: VoucherType = card.voucherType || (card.name.toLowerCase().includes('refei') ? 'refeicao' : 'alimentacao');
      setEditVoucherType(detectedType);
    } else {
      setEditClosingDay(card.closingDay?.toString() || '');
      setEditDueDay(card.dueDay?.toString() || '');
      setEditLimit(card.limit?.toString() || '');
      setEditTaxaJuros(card.taxaJuros?.toString() || '');
    }
  };

  const handleSaveEdit = async (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    if (card.type === 'voucher') {
      if (!editCardName.trim()) {
        alert("O nome do cartão é obrigatório.");
        return;
      }
      const newBal = Number(editVoucherBalance);
      if (isNaN(newBal) || newBal < 0) {
        alert("O saldo do voucher deve ser um valor numérico válido maior ou igual a zero.");
        return;
      }

      try {
        await updateCard(userId, cardId, {
          name: editCardName.trim(),
          voucherBalance: newBal,
          voucherType: editVoucherType,
        });
        setEditingCardId(null);
        await loadCards();
      } catch (error) {
        console.error("Erro ao atualizar cartão voucher:", error);
        alert("Erro ao salvar alterações do cartão.");
      }
      return;
    }

    if (!editClosingDay || !editDueDay) {
      alert("As datas de fechamento e vencimento são obrigatórias.");
      return;
    }

    const closing = Number(editClosingDay);
    const due = Number(editDueDay);
    const limitVal = Number(editLimit) || 0;
    const taxaJurosVal = editTaxaJuros ? Number(editTaxaJuros) : undefined;

    if (taxaJurosVal !== undefined && (taxaJurosVal < 0 || taxaJurosVal > 100)) {
      alert("A taxa de juros deve estar entre 0% e 100% ao mês.");
      return;
    }

    if (closing < 1 || closing > 31 || due < 1 || due > 31) {
      alert("Os dias devem estar entre 1 e 31.");
      return;
    }

    try {
      await updateCard(userId, cardId, {
        name: editCardName.trim() || card.name,
        closingDay: closing,
        dueDay: due,
        limit: limitVal,
        ...(taxaJurosVal !== undefined && { taxaJuros: taxaJurosVal }),
      });
      setEditingCardId(null);
      await loadCards();
    } catch (error) {
      console.error("Erro ao atualizar cartão:", error);
      alert("Erro ao salvar alterações.");
    }
  };

  const checkCardHistory = (cardId: string) => {
    return transactions.some(t => t.cardId === cardId);
  };

  const handleToggleStatus = async (card: CreditCard, skipConfirm = false) => {
    const isHiding = card.isActive !== false;

    if (isHiding && !skipConfirm) {
      const confirmMessage = `Deseja realmente ocultar o cartão "${card.name}"?\n\nEle não aparecerá na lista de seleção do dia a dia, mas você poderá reativá-lo a qualquer momento na aba "Ocultos".`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }

    const nextStatus = !card.isActive;
    try {
      await updateCard(userId, card.id, { isActive: nextStatus });
      await loadCards();
    } catch (error) {
      console.error("Erro ao atualizar status do cartão:", error);
      alert("Erro ao alterar visibilidade do cartão.");
    }
  };

  const handleDeleteCard = async (card: CreditCard) => {
    const hasHistory = checkCardHistory(card.id);
    
    if (hasHistory) {
      if (window.confirm(`O cartão "${card.name}" possui histórico de lançamentos e não pode ser excluído permanentemente para não afetar seus dados.\n\nDeseja apenas OCULTÁ-LO da lista de seleção? (Você poderá reativá-lo a qualquer momento na aba "Ocultos")`)) {
        await handleToggleStatus(card, true);
      }
      return;
    }

    if (window.confirm(`Tem certeza que deseja EXCLUIR permanentemente o cartão "${card.name}"?`)) {
      try {
        await deleteCard(userId, card.id);
        await loadCards();
      } catch (error) {
        console.error("Erro ao excluir cartão:", error);
        alert("Erro ao excluir cartão.");
      }
    }
  };

  const filteredCards = useMemo(() => {
    return cards.filter(c => showHidden ? !c.isActive : c.isActive);
  }, [cards, showHidden]);

  const cardInvoicesTimeline = useMemo(() => {
    return cards.map(card => {
      const cardTransactions = transactions.filter(t => t.cardId === card.id && t.type === 'expense');
      
      // Agrupa transações por mês de cobrança
      const monthlyGroups: Record<string, { 
        month: number, 
        year: number, 
        dueDate: string, 
        transactions: Transaction[], 
        total: number,
        isCurrent: boolean
      }> = {};

      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      cardTransactions.forEach(t => {
        const billing = getInvoiceBillingMonth(card, t.date);
        const key = `${billing.year}-${String(billing.month + 1).padStart(2, '0')}`;
        
        if (!monthlyGroups[key]) {
          monthlyGroups[key] = {
            month: billing.month,
            year: billing.year,
            dueDate: billing.dueDate,
            transactions: [],
            total: 0,
            isCurrent: billing.month === currentMonth && billing.year === currentYear
          };
        }
        
        monthlyGroups[key].transactions.push(t);
        monthlyGroups[key].total += Number(t.amount) || 0;
      });

      // Transforma em array e ordena por data
      const timeline = Object.values(monthlyGroups).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      return { cardId: card.id, timeline };
    });
  }, [cards, transactions]);

  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[2000] bg-surface-secondary animate-in fade-in duration-200 overflow-y-auto">
      <div className="max-w-5xl mx-auto min-h-screen flex flex-col p-4 md:p-8 space-y-8">
        {/* Header com Botão Voltar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button 
            onClick={() => onClose(cards)} 
            className="flex items-center gap-2 text-text-muted hover:text-brand-primary transition-all font-black uppercase text-[10px] tracking-ultra-wide self-start"
          >
            <ChevronLeft size={16} /> Voltar ao Cockpit
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
              <CardIcon size={28} />
            </div>
            <div>
              {contextualReason && (
                <p className="text-[10px] font-black text-action-primaryDark uppercase tracking-wider mb-0.5 animate-in fade-in duration-300">
                  ↳ {contextualReason}
                </p>
              )}
              <h2 className="text-2xl font-black text-text-primary uppercase tracking-tight">Gestão de Cartões</h2>
              <p className="text-xxs font-bold text-text-muted uppercase tracking-widest mt-1">Configure limites, faturas e o impacto na folga do mês</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Esquerda: Cadastro */}
          <div className="lg:col-span-5 space-y-6">
            {!showHidden && !showForm && filteredCards.length > 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full bg-surface-primary p-5 rounded-4xl border border-surface-elevated shadow-soft hover:border-brand-primary/40 transition-all group flex items-center justify-between sticky top-8"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors">
                    <Plus size={18} className="text-brand-primary" />
                  </div>
                  <span className="text-sm font-black text-text-muted group-hover:text-text-primary uppercase tracking-tight transition-colors">Cadastrar Cartão</span>
                </div>
                <ChevronDown size={18} className="text-text-muted group-hover:text-brand-primary transition-colors" />
              </button>
            )}
            {!showHidden && (showForm || filteredCards.length === 0) && (
              <div className="bg-surface-primary p-6 rounded-4xl border border-surface-elevated shadow-soft space-y-6 sticky top-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 ml-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary"></div>
                    <p className="text-[10px] font-black text-text-primary uppercase tracking-widest">Novo Cartão</p>
                  </div>
                  {filteredCards.length > 0 && (
                    <button onClick={() => setShowForm(false)} className="text-[9px] font-black text-text-muted hover:text-text-primary uppercase tracking-widest flex items-center gap-1 transition-colors">
                      <X size={12} /> Fechar
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Nome do Cartão</label>
                    <input
                      type="text"
                      placeholder="Ex: Nubank, Inter, Alelo Alimentação..."
                      value={newCardName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewCardName(val);
                        if (newCardType === 'voucher') {
                          const lower = val.toLowerCase();
                          if (lower.includes('refei') || /\bvr\b/.test(lower)) {
                            setNewVoucherType('refeicao');
                          } else if (lower.includes('alimenta') || /\bva\b/.test(lower)) {
                            setNewVoucherType('alimentacao');
                          }
                        }
                      }}
                      className="w-full bg-surface-secondary p-4 rounded-2xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Tipo de Cartão</label>
                    <div className="flex bg-surface-secondary p-1 rounded-2xl border border-surface-elevated">
                      <button
                        type="button"
                        onClick={() => setNewCardType('credit')}
                        className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${newCardType === 'credit' ? 'bg-surface-primary text-text-primary shadow-soft' : 'text-text-muted'}`}
                      >
                        Crédito
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewCardType('voucher')}
                        className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${newCardType === 'voucher' ? 'bg-surface-primary text-text-primary shadow-soft' : 'text-text-muted'}`}
                      >
                        Voucher (Alimentação/Refeição)
                      </button>
                    </div>
                  </div>

                  {newCardType === 'voucher' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Subtipo de Benefício</label>
                      <div className="flex bg-surface-secondary p-1 rounded-2xl border border-surface-elevated gap-1">
                        <button
                          type="button"
                          onClick={() => setNewVoucherType('alimentacao')}
                          className={`flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${newVoucherType === 'alimentacao' ? 'bg-emerald-600 text-white shadow-soft' : 'text-text-muted'}`}
                        >
                          Alimentação
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewVoucherType('refeicao')}
                          className={`flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${newVoucherType === 'refeicao' ? 'bg-amber-600 text-white shadow-soft' : 'text-text-muted'}`}
                        >
                          Refeição
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewVoucherType('outro')}
                          className={`flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${newVoucherType === 'outro' ? 'bg-surface-primary text-text-primary shadow-soft' : 'text-text-muted'}`}
                        >
                          Outro
                        </button>
                      </div>
                    </div>
                  )}

                  {newCardType === 'credit' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Limite Total (R$)</label>
                      <input
                        type="number"
                        placeholder="Ex: 5000"
                        value={newLimit}
                        onChange={(e) => setNewLimit(e.target.value)}
                        className="w-full bg-surface-secondary p-4 rounded-2xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm transition-all"
                      />
                    </div>
                  )}

                  {newCardType === 'voucher' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Saldo Inicial (R$)</label>
                      <input
                        type="number"
                        placeholder="Ex: 1000"
                        value={newVoucherBalance}
                        onChange={(e) => setNewVoucherBalance(e.target.value)}
                        className="w-full bg-surface-secondary p-4 rounded-2xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm transition-all"
                      />
                      <p className="text-[8px] font-medium text-text-muted ml-1">Valor carregado no cartão voucher no momento do cadastro.</p>
                    </div>
                  )}

                  {newCardType === 'credit' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Juros mensais do cartão (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 14.9"
                        value={newTaxaJuros}
                        onChange={(e) => setNewTaxaJuros(e.target.value)}
                        className="w-full bg-surface-secondary p-4 rounded-2xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm transition-all"
                      />
                      <p className="text-[8px] font-medium text-text-muted ml-1">Usado em novas conversões para rotativo. Opcional.</p>
                    </div>
                  )}

                  {newCardType === 'credit' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Dia Fechamento</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Ex: 5"
                          value={newClosingDay}
                          onChange={(e) => setNewClosingDay(e.target.value)}
                          className="w-full bg-surface-secondary p-4 rounded-2xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Dia Vencimento</label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Ex: 12"
                          value={newDueDay}
                          onChange={(e) => setNewDueDay(e.target.value)}
                          className="w-full bg-surface-secondary p-4 rounded-2xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleAdd}
                    disabled={isAdding || !newCardName.trim()}
                    className="w-full py-5 bg-brand-primary text-text-onBrand rounded-3xl shadow-brand-glow active:scale-95 disabled:opacity-50 transition-all font-black uppercase text-xxs tracking-widest flex items-center justify-center gap-2 mt-4"
                  >
                    <Plus size={18} /> Cadastrar Cartão
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Listagem */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-surface-primary p-6 rounded-4xl border border-surface-elevated shadow-soft space-y-6 min-h-[500px]">
              <div className="flex items-center justify-between">
                <div className="flex bg-surface-secondary p-1 rounded-2xl border border-surface-elevated w-full max-w-[300px]">
                  <button 
                    onClick={() => setShowHidden(false)} 
                    className={`flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${!showHidden ? 'bg-surface-primary text-text-primary shadow-soft' : 'text-text-muted'}`}
                  >
                    Ativos
                  </button>
                  <button 
                    onClick={() => setShowHidden(true)} 
                    className={`flex-1 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${showHidden ? 'bg-surface-primary text-text-primary shadow-soft' : 'text-text-muted'}`}
                  >
                    Ocultos
                  </button>
                </div>
                {isLoading && <RefreshCw size={16} className="animate-spin text-brand-primary" />}
              </div>

              {filteredCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="p-6 bg-surface-secondary rounded-full text-text-muted opacity-20">
                    <CardIcon size={48} />
                  </div>
                  <p className="text-xxs text-text-muted font-black uppercase tracking-widest leading-loose max-w-[200px]">
                    {showHidden ? 'Nenhum cartão oculto no momento.' : 'Você ainda não cadastrou nenhum cartão ativo.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredCards.map((card) => {
                          const hasHistory = checkCardHistory(card.id);
                          const isEditing = editingCardId === card.id;
                          const timelineData = cardInvoicesTimeline.find(inv => inv.cardId === card.id);
                          const isVoucher = card.type === 'voucher';
                          return (
                      <div key={card.id} className="bg-surface-secondary rounded-3xl border border-surface-elevated overflow-hidden transition-all group hover:border-brand-primary/30 shadow-sm">
                        <div className="p-6 flex items-center justify-between">
                          <div className="flex items-center gap-5">
                            <div className={`p-3 rounded-2xl transition-colors ${isEditing ? 'bg-brand-primary text-text-onBrand' : isVoucher ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-primary text-text-muted group-hover:text-brand-primary'}`}>
                              {isVoucher ? <WalletIcon size={24} /> : <CardIcon size={24} />}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-base font-black text-text-primary uppercase tracking-tight">
                                {card.name}
                                {isVoucher && (() => {
                                  const isRef = card.voucherType === 'refeicao' || card.name.toLowerCase().includes('refei') || /\bvr\b/.test(card.name.toLowerCase());
                                  const isAli = card.voucherType === 'alimentacao' || card.name.toLowerCase().includes('alimenta') || /\bva\b/.test(card.name.toLowerCase());
                                  const label = isRef ? 'Refeição' : isAli ? 'Alimentação' : 'Voucher';
                                  const colorClass = isRef ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';
                                  return (
                                    <span className={`ml-2 inline-block px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider leading-none align-middle ${colorClass}`}>
                                      {label}
                                    </span>
                                  );
                                })()}
                              </span>
                              {!isEditing && (
                                <div className="flex flex-wrap items-center gap-4 mt-2">
                                  {isVoucher ? (
                                    <div className="flex items-center gap-1.5 text-emerald-600">
                                      <WalletIcon size={12} />
                                      <span className="text-[10px] font-black uppercase tracking-tighter">
                                        Saldo: R$ {getVoucherCardAvailableBalance(card, transactions).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  ) : (
                                    <>
                                      {card.limit ? (
                                        <div className="flex items-center gap-1.5 text-brand-primary">
                                          <Check size={12} />
                                          <span className="text-[10px] font-black uppercase tracking-tighter">Limite: R$ {card.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                      ) : null}
                                      {card.taxaJuros ? (
                                        <div className="flex items-center gap-1.5 text-amber-600">
                                          <TrendingUp size={12} />
                                          <span className="text-[10px] font-black uppercase tracking-tighter">{card.taxaJuros}% a.m.</span>
                                        </div>
                                      ) : null}
                                      {card.closingDay && (
                                        <div className="flex items-center gap-1.5 text-text-muted">
                                          <Calendar size={12} />
                                          <span className="text-[10px] font-bold uppercase tracking-tighter">Corte: Dia {card.closingDay}</span>
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
                                        onClick={() => {
                                          onClose(cards);
                                          onEditTransaction({ paymentMethod: 'voucher', cardId: card.id, type: 'expense' } as any);
                                        }}
                                        className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all flex items-center gap-2 px-4"
                                        title="Registrar Gasto no Voucher"
                                      >
                                        <Plus size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Lançar</span>
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => onEditTransaction({ paymentMethod: 'credit', cardId: card.id, type: 'expense' } as any)}
                                        className="p-3 text-brand-primary hover:bg-brand-primary/10 rounded-2xl transition-all flex items-center gap-2 px-4"
                                        title="Registrar Compra"
                                      >
                                        <Plus size={20} />
                                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Registrar</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleStartEdit(card)}
                                      className="p-3 text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-2xl transition-all"
                                      title="Editar Cartão"
                                    >
                                      <Settings2 size={20} />
                                    </button>
                                    <button
                                      onClick={() => handleToggleStatus(card)}
                                      className="p-3 text-text-muted hover:text-brand-secondary hover:bg-brand-secondary/10 rounded-2xl transition-all"
                                      title="Ocultar Cartão (pode ser reativado em Ocultos)"
                                    >
                                      <EyeOff size={20} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setEditingCardId(null)}
                                    className="p-3 text-text-muted hover:text-status-danger hover:bg-status-danger/10 rounded-2xl transition-all"
                                    title="Cancelar Edição"
                                  >
                                    <X size={20} />
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(card)}
                                className="p-3 text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-2xl transition-all flex items-center gap-3 px-5"
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
                            <div className="bg-surface-primary p-6 rounded-3xl border border-brand-primary/20 space-y-6 shadow-inner">
                              {isVoucher ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Nome do Cartão</label>
                                      <input
                                        type="text"
                                        value={editCardName}
                                        onChange={(e) => setEditCardName(e.target.value)}
                                        className="w-full bg-surface-secondary p-3 rounded-xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm"
                                        placeholder="Ex: Alelo Alimentação, Sodexo..."
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Saldo Disponível (R$)</label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editVoucherBalance}
                                        onChange={(e) => setEditVoucherBalance(e.target.value)}
                                        className="w-full bg-surface-secondary p-3 rounded-xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm"
                                        placeholder="0.00"
                                      />
                                      <p className="text-[8px] text-text-muted ml-1">Ajuste manual do saldo disponível no voucher.</p>
                                    </div>
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Subtipo de Benefício</label>
                                    <div className="flex bg-surface-secondary p-1 rounded-2xl border border-surface-elevated gap-1 max-w-md">
                                      <button
                                        type="button"
                                        onClick={() => setEditVoucherType('alimentacao')}
                                        className={`flex-1 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${editVoucherType === 'alimentacao' ? 'bg-emerald-600 text-white shadow-soft' : 'text-text-muted'}`}
                                      >
                                        Alimentação
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditVoucherType('refeicao')}
                                        className={`flex-1 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${editVoucherType === 'refeicao' ? 'bg-amber-600 text-white shadow-soft' : 'text-text-muted'}`}
                                      >
                                        Refeição
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditVoucherType('outro')}
                                        className={`flex-1 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${editVoucherType === 'outro' ? 'bg-surface-primary text-text-primary shadow-soft' : 'text-text-muted'}`}
                                      >
                                        Outro
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Limite Total (R$)</label>
                                    <input
                                      type="number"
                                      value={editLimit}
                                      onChange={(e) => setEditLimit(e.target.value)}
                                      className="w-full bg-surface-secondary p-3 rounded-xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Juros mensais (%)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={editTaxaJuros}
                                      onChange={(e) => setEditTaxaJuros(e.target.value)}
                                      className="w-full bg-surface-secondary p-3 rounded-xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Dia Corte</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="31"
                                      value={editClosingDay}
                                      onChange={(e) => setEditClosingDay(e.target.value)}
                                      className="w-full bg-surface-secondary p-3 rounded-xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Dia Vencimento</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="31"
                                      value={editDueDay}
                                      onChange={(e) => setEditDueDay(e.target.value)}
                                      className="w-full bg-surface-secondary p-3 rounded-xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm"
                                    />
                                  </div>
                                </div>
                              )}
                              <button
                                onClick={() => handleSaveEdit(card.id)}
                                className="w-full py-4 bg-brand-primary text-text-onBrand rounded-2xl font-black uppercase text-xxs tracking-widest flex items-center justify-center gap-2 shadow-brand-glow active:scale-95 transition-all"
                              >
                                <Check size={16} /> Salvar Alterações
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Accordion Timeline */}
                        {timelineData && !isVoucher && (
                          <div className="border-t border-surface-elevated bg-surface-primary/30 p-4">
                            <button 
                              onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)} 
                              className="flex items-center gap-2 text-xxs font-black uppercase text-brand-primary hover:text-brand-secondary transition-colors"
                            >
                              {expandedCard === card.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} 
                              {expandedCard === card.id ? 'Ocultar Linha do Tempo' : 'Ver Linha do Tempo de Faturas'}
                            </button>
                            
                            {expandedCard === card.id && (
                              <div className="mt-6 space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-elevated">
                                {timelineData.timeline.length > 0 ? (
                                  timelineData.timeline.map((group, idx) => (
                                    <div key={`${group.year}-${group.month}`} className="relative pl-8 space-y-3">
                                      {/* Marcador do Mês na Timeline */}
                                      <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-surface-secondary flex items-center justify-center transition-colors ${group.isCurrent ? 'bg-brand-primary' : 'bg-surface-elevated'}`}>
                                        {group.isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                                      </div>

                                      <div className="flex items-center justify-between">
                                        <div>
                                          <h4 className={`text-[11px] font-black uppercase tracking-widest ${group.isCurrent ? 'text-action-primaryDark' : 'text-text-primary'}`}>
                                            Fatura de {new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(group.year, group.month))}
                                          </h4>
                                          <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter mt-0.5">
                                            Vencimento: {new Date(group.dueDate.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-xs font-black text-text-primary">R$ {group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                          {group.isCurrent && (
                                            <button
                                              onClick={() => handleStartPaymentFlow({ total: group.total, dueDate: group.dueDate, periodEnd: group.periodEnd, invoiceId: `${card.id}_${group.periodEnd}`, cardName: card.name, cardId: card.id })}
                                              className="text-[8px] font-black text-action-primaryDark uppercase tracking-widest mt-1 hover:underline"
                                            >
                                              Pagar Agora
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        {group.transactions.map(t => (
                                          <div key={t.id} className="flex items-center justify-between bg-surface-primary p-3 rounded-2xl border border-surface-elevated text-xs group/item hover:border-brand-primary/20 transition-all shadow-sm">
                                            <div className="flex flex-col">
                                              <div className="flex items-center gap-2">
                                                <span className="font-bold text-text-primary text-[11px]">{t.description}</span>
                                                {t.installments && t.installments > 1 && (
                                                  <span className="px-1.5 py-0.5 bg-brand-primary/10 text-action-primaryDark text-[8px] font-black rounded-md uppercase">
                                                    {t.currentInstallment}/{t.installments}
                                                  </span>
                                                )}
                                              </div>
                                              <span className="text-text-muted text-[9px] font-medium mt-0.5">
                                                Compra em: {new Date(t.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                 <span className="font-black text-text-primary">R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                              <button 
                                                onClick={() => { onClose(); onEditTransaction(t); }} 
                                                className="p-2 text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all opacity-100 md:opacity-0 md:group-hover/item:opacity-100 md:group-focus-within/item:opacity-100"
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
                                    <p className="text-xxs text-text-muted font-bold uppercase tracking-widest">Nenhuma compra parcelada ou em aberto.</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Accordion Extrato de Movimentações (Cartão Voucher) */}
                        {isVoucher && (
                          <div className="border-t border-surface-elevated bg-surface-primary/30 p-4">
                            <button 
                              onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)} 
                              className="flex items-center gap-2 text-xxs font-black uppercase text-emerald-600 hover:text-emerald-700 transition-colors"
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
          </div>
        </div>

        {/* Footer com Concluir */}
        <div className="flex justify-center pt-8 border-t border-surface-elevated">
          <button
            onClick={() => onClose(cards)}
            className="px-12 py-5 bg-surface-primary text-text-primary font-black rounded-full uppercase text-xxs tracking-ultra-wide hover:bg-brand-primary hover:text-text-onBrand transition-all shadow-soft border border-surface-elevated active:scale-95"
          >
            Concluir e Voltar
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE ANTECIPAÇÃO */}
      {showEarlyPaymentWarning && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-primary w-full max-w-sm rounded-4xl shadow-2xl border border-surface-elevated overflow-hidden p-6 space-y-6 animate-in zoom-in duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-secondary/10 rounded-2xl text-brand-secondary">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-black text-text-primary tracking-tight leading-tight uppercase">
                Antecipar Fatura?
              </h3>
            </div>

            <p className="text-sm font-medium text-text-secondary leading-relaxed">
              Esta fatura vence apenas em <strong className="text-text-primary">{new Date(pendingInvoice?.dueDate.replace(/-/g, '/')).toLocaleDateString('pt-BR')}</strong>. Deseja realmente antecipar o pagamento para hoje?
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setIsConfirmingPayment(false); setShowEarlyPaymentWarning(false); }}
                className="flex-1 py-4 bg-surface-secondary text-text-muted rounded-3xl font-black uppercase text-xxs tracking-widest hover:bg-surface-elevated transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmEarlyPayment}
                className="flex-1 py-4 bg-brand-primary text-text-onBrand rounded-3xl font-black uppercase text-xxs tracking-widest shadow-brand-glow active:scale-95 transition-transform"
              >
                Sim, Antecipar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SELEÇÃO DE DATA */}
      {showDatePicker && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-primary w-full max-w-sm rounded-4xl shadow-2xl border border-surface-elevated overflow-hidden p-6 space-y-6 animate-in zoom-in duration-300">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                <Check size={24} />
              </div>
              <h3 className="text-xl font-black text-text-primary tracking-tight leading-tight uppercase">
                Data do Pagamento
              </h3>
            </div>

            <p className="text-sm font-medium text-text-secondary leading-relaxed">
              O pagamento será registrado para o dia selecionado. Você pode escolher hoje ou uma data anterior.
            </p>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-text-muted uppercase tracking-widest ml-1">Data de Pagamento</label>
              <input
                type="date"
                max={getLocalDateString()}
                value={selectedPaymentDate}
                onChange={(e) => setSelectedPaymentDate(e.target.value)}
                className="w-full bg-surface-secondary p-4 rounded-2xl text-text-primary font-bold outline-none border border-surface-elevated focus:border-brand-primary text-sm transition-all"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setIsConfirmingPayment(false); setShowDatePicker(false); }}
                className="flex-1 py-4 bg-surface-secondary text-text-muted rounded-3xl font-black uppercase text-xxs tracking-widest hover:bg-surface-elevated transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinalConfirmPayment}
                className="flex-1 py-4 bg-brand-primary text-text-onBrand rounded-3xl font-black uppercase text-xxs tracking-widest shadow-brand-glow active:scale-95 transition-transform"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
};

export default CardManager;
