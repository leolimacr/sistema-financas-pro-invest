import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, CreditCard as CardIcon, ChevronLeft, ChevronDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { addCard, getCards, updateCard } from '../../../services/cardService';
import { payInvoice } from '../../../services/payInvoiceService';
import type { CreditCard, Transaction, VoucherType } from '../../../types';
import { getInvoiceBillingMonth } from '../../../utils/invoiceUtils';
import { getLocalDateString } from '../../../utils/dateHelpers';
import { getVoucherCardAvailableBalance } from '../../../utils/calculations';
import { CardList } from './cards/CardList';
import { CardFormModal } from './cards/CardFormModal';
import { InvoiceDetailsModal } from './cards/InvoiceDetailsModal';

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
    <div className="fixed inset-0 z-[2000] bg-surface-secondary dark:bg-slate-950 animate-in fade-in duration-200 overflow-y-auto">
      <div className="max-w-5xl mx-auto min-h-screen flex flex-col p-4 md:p-8 space-y-8">
        {/* Header com Botão Voltar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button 
            onClick={() => onClose(cards)} 
            className="flex items-center gap-2 text-text-muted dark:text-slate-400 hover:text-brand-primary dark:hover:text-emerald-400 transition-all font-black uppercase text-[10px] tracking-ultra-wide self-start"
          >
            <ChevronLeft size={16} /> Voltar ao Cockpit
          </button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
              <CardIcon size={28} />
            </div>
            <div>
              {contextualReason && (
                <p className="text-[10px] font-black text-action-primaryDark dark:text-emerald-400 uppercase tracking-wider mb-0.5 animate-in fade-in duration-300">
                  ↳ {contextualReason}
                </p>
              )}
              <h2 className="text-2xl font-black text-text-primary dark:text-white uppercase tracking-tight">Gestão de Cartões</h2>
              <p className="text-xxs font-bold text-text-muted dark:text-slate-400 uppercase tracking-widest mt-1">Configure limites, faturas e o impacto na folga do mês</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna Esquerda: Cadastro */}
          <div className="lg:col-span-5 space-y-6">
            {!showHidden && !showForm && filteredCards.length > 0 && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full bg-surface-primary dark:bg-slate-900 p-5 rounded-4xl border border-surface-elevated dark:border-slate-800 shadow-soft hover:border-brand-primary/40 dark:hover:border-emerald-500/40 transition-all group flex items-center justify-between sticky top-8"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-brand-primary/10 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors">
                    <Plus size={18} className="text-brand-primary" />
                  </div>
                  <span className="text-sm font-black text-text-muted dark:text-slate-400 group-hover:text-text-primary dark:group-hover:text-white uppercase tracking-tight transition-colors">Cadastrar Cartão</span>
                </div>
                <ChevronDown size={18} className="text-text-muted dark:text-slate-400 group-hover:text-brand-primary dark:group-hover:text-emerald-400 transition-colors" />
              </button>
            )}
            {!showHidden && (showForm || filteredCards.length === 0) && (
              <CardFormModal
                newCardName={newCardName}
                setNewCardName={setNewCardName}
                newCardType={newCardType}
                setNewCardType={setNewCardType}
                newVoucherType={newVoucherType}
                setNewVoucherType={setNewVoucherType}
                newLimit={newLimit}
                setNewLimit={setNewLimit}
                newVoucherBalance={newVoucherBalance}
                setNewVoucherBalance={setNewVoucherBalance}
                newTaxaJuros={newTaxaJuros}
                setNewTaxaJuros={setNewTaxaJuros}
                newClosingDay={newClosingDay}
                setNewClosingDay={setNewClosingDay}
                newDueDay={newDueDay}
                setNewDueDay={setNewDueDay}
                isAdding={isAdding}
                canClose={filteredCards.length > 0}
                onClose={() => setShowForm(false)}
                onAdd={handleAdd}
              />
            )}
          </div>

          {/* Coluna Direita: Listagem */}
          <div className="lg:col-span-7 space-y-6">
            <CardList
              cards={cards}
              filteredCards={filteredCards}
              showHidden={showHidden}
              setShowHidden={setShowHidden}
              isLoading={isLoading}
              transactions={transactions}
              onEditTransaction={onEditTransaction}
              onClose={onClose}
              editingCardId={editingCardId}
              setEditingCardId={setEditingCardId}
              expandedCard={expandedCard}
              setExpandedCard={setExpandedCard}
              cardInvoicesTimeline={cardInvoicesTimeline}
              handleStartEdit={handleStartEdit}
              handleToggleStatus={handleToggleStatus}
              handleStartPaymentFlow={handleStartPaymentFlow}
              handleSaveEdit={handleSaveEdit}
              editCardName={editCardName}
              setEditCardName={setEditCardName}
              editVoucherBalance={editVoucherBalance}
              setEditVoucherBalance={setEditVoucherBalance}
              editVoucherType={editVoucherType}
              setEditVoucherType={setEditVoucherType}
              editLimit={editLimit}
              setEditLimit={setEditLimit}
              editTaxaJuros={editTaxaJuros}
              setEditTaxaJuros={setEditTaxaJuros}
              editClosingDay={editClosingDay}
              setEditClosingDay={setEditClosingDay}
              editDueDay={editDueDay}
              setEditDueDay={setEditDueDay}
            />
          </div>
        </div>

        {/* Footer com Concluir */}
        <div className="flex justify-center pt-8 border-t border-surface-elevated dark:border-slate-800">
          <button
            onClick={() => onClose(cards)}
            className="px-12 py-5 bg-surface-primary dark:bg-slate-900 text-text-primary dark:text-white font-black rounded-full uppercase text-xxs tracking-ultra-wide hover:bg-brand-primary hover:text-text-onBrand dark:hover:bg-emerald-600 transition-all shadow-soft border border-surface-elevated dark:border-slate-800 active:scale-95"
          >
            Concluir e Voltar
          </button>
        </div>
      </div>

      <InvoiceDetailsModal
        pendingInvoice={pendingInvoice}
        showEarlyPaymentWarning={showEarlyPaymentWarning}
        showDatePicker={showDatePicker}
        selectedPaymentDate={selectedPaymentDate}
        onSelectPaymentDate={setSelectedPaymentDate}
        onConfirmEarlyPayment={handleConfirmEarlyPayment}
        onFinalConfirmPayment={handleFinalConfirmPayment}
        onCancel={() => {
          setIsConfirmingPayment(false);
          setShowEarlyPaymentWarning(false);
          setShowDatePicker(false);
        }}
      />
    </div>
  );

  return createPortal(content, document.body);
};

export default CardManager;
