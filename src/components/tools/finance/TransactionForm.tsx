import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FolderPlus, RefreshCw, Wallet as WalletIcon, ShieldAlert, Trash2, Sparkles, CheckCircle2, X } from 'lucide-react';
import CategoryManager from './CategoryManager';
import CardManager from './CardManager';
import type { Transaction, Category, CreditCard, RecurringBill } from '../../../types';
import { useDebts } from '../../../hooks/useDebts';
import { getFlowLabels, FPI_COPY } from '../../../theme/fpiVoiceGuide';
import NexusInlineAdvisor from './NexusInlineAdvisor';
import { getCards } from '../../../services/cardService';
import { addRecurringBill } from '../../../services/billService';
import { useAuth } from '../../../contexts/AuthContext';
import { getLocalDateString } from '../../../utils/dateHelpers';
import { getVoucherCardAvailableBalance } from '../../../utils/calculations';
import { findMatchingBillsForTransaction } from '../../../utils/reconciliationMatcher';
import { isBillPaid } from '../../../utils/invoiceUtils';

interface TransactionFormProps {
  onSave: (data: any) => Promise<void>;
  onCancel: () => void;
  initialData?: (Partial<Transaction> & { autoFocusAmount?: boolean }) | null;
  categories: Category[];
  onSaveCategory: (category: Category) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  nexusAdvisoryContext?: NexusAdvisoryContext;
  transactions: Transaction[];
  onDelete?: (id: string) => Promise<void> | void;
  recurringBills?: RecurringBill[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onSave, 
  onCancel, 
  initialData,  
  categories = [],
  onSaveCategory,
  onDeleteCategory,
  nexusAdvisoryContext,
  transactions,
  onDelete,
  recurringBills = [],
}) => {
  const { user } = useAuth();
  const amountInputRef = useRef<HTMLInputElement>(null);
  
  // Flag de travamento exclusivo para Faturas de Cartão de Crédito (nunca bloquear Contas Fixas/Recorrentes)
  const isBillPayment = Boolean(
    (initialData as any)?.isBillPayment && !(initialData as any)?.linkedRecurringBillId
  );
  const isLocked = Boolean((initialData as any)?.isLocked || isBillPayment);
  const lockMessage = (initialData as any)?.lockMessage || (
    isBillPayment
      ? "Este lançamento representa o pagamento consolidado da fatura do cartão. O valor é composto pelas compras do período e protegido contra alteração direta. Apenas a data de pagamento pode ser editada. Para alterar o valor ou cancelar o pagamento, utilize a opção de excluir lançamento."
      : ""
  );

  const [description, setDescription] = useState(initialData?.description || '');
  const [amount, setAmount] = useState(initialData?.amount || '');
  const [type, setType] = useState<'income' | 'expense'>(initialData?.type || 'expense');
  const [category, setCategory] = useState(initialData?.category || '');
  const [date, setDate] = useState(initialData?.date || getLocalDateString());
  const [paymentMethod, setPaymentMethod] = useState<'money' | 'credit' | 'voucher'>(initialData?.paymentMethod || 'money');
  const [cardId, setCardId] = useState<string>(initialData?.cardId || '');
  const [installments, setInstallments] = useState<number>(initialData?.installments || 1);
  const [userCards, setUserCards] = useState<CreditCard[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);

  // NOVO: Integração Reativa com Dívidas (Assisted Amortization)
  const { debts: activeDebts } = useDebts(user?.uid);
  const [linkedDebtId, setLinkedDebtId] = useState<string>( (initialData as any)?.linkedDebtId || '' );
  
  // NOVO: Integração Inteligente com Contas Fixas (Prevenção de Duplicidade & Conciliação)
  const [linkedRecurringBillId, setLinkedRecurringBillId] = useState<string>((initialData as any)?.linkedRecurringBillId || '');
  const [isBillPaymentState, setIsBillPaymentState] = useState<boolean>(Boolean((initialData as any)?.isBillPayment));
  const [dismissedMatchBillId, setDismissedMatchBillId] = useState<string | null>(null);

  const pendingBills = useMemo(() => {
    return recurringBills.filter(b => b.isActive !== false && !isBillPaid(b, transactions));
  }, [recurringBills, transactions]);

  const matchingBills = useMemo(() => {
    if (type !== 'expense' || isLocked || linkedRecurringBillId || initialData?.id) return [];
    return findMatchingBillsForTransaction({ description, amount, category, date }, pendingBills);
  }, [type, isLocked, linkedRecurringBillId, initialData?.id, description, amount, category, date, pendingBills]);

  const suggestedMatch = matchingBills.length > 0 && matchingBills[0].bill.id !== dismissedMatchBillId ? matchingBills[0] : null;

  const linkedRecurringBill = useMemo(() => {
    if (!linkedRecurringBillId) return null;
    return recurringBills.find(b => b.id === linkedRecurringBillId) || null;
  }, [linkedRecurringBillId, recurringBills]);

  // Detecta se a categoria é relacionada a dívidas
  const isDebtCategory = (cat: string) => {
    const search = cat.toLowerCase();
    return search.includes('divida') || search.includes('empréstimo') || search.includes('emprestimo') || search.includes('financiamento');
  };

  const showDebtSelector = type === 'expense' && isDebtCategory(category) && activeDebts.length > 0;

  // Load user cards
  useEffect(() => {
    if (user?.uid) {
      getCards(user.uid)
        .then(cards => {
          const activeCards = cards.filter(c => c.isActive !== false);
          setUserCards(activeCards);
          
          // Auto-select if only one card exists and no card is currently selected
          if (activeCards.length === 1 && !cardId) {
            setCardId(activeCards[0].id);
          }
        })
        .catch(console.error);
    }
  }, [user?.uid]);

  // Sync state when initialData changes (modal reopen)
  useEffect(() => {
    setDescription(initialData?.description || '');
    setAmount(initialData?.amount || '');
    setType(initialData?.type || 'expense');
    setCategory(initialData?.category || '');
    setDate(initialData?.date || getLocalDateString());
    setPaymentMethod(initialData?.paymentMethod || 'money');
    setCardId(initialData?.cardId || '');
    setInstallments(initialData?.installments || 1);
    setIsRecurring(false);
    setLinkedRecurringBillId((initialData as any)?.linkedRecurringBillId || '');
    setIsBillPaymentState(Boolean((initialData as any)?.isBillPayment));
    setDismissedMatchBillId(null);

    // Auto-focus amount if requested
    if (initialData?.autoFocusAmount && !isLocked) {
      setTimeout(() => {
        amountInputRef.current?.focus();
        amountInputRef.current?.select();
      }, 100);
    }
  }, [initialData, isLocked]);

  // Reset payment method and cardId when type is 'income' (unless using voucher card)
  useEffect(() => {
    if (type === 'income' && !isLocked) {
      setPaymentMethod('money');
      setCardId('');
    }
  }, [type, isLocked]);

  // Reset cardId if paymentMethod is changed to 'money'
  useEffect(() => {
    if (paymentMethod === 'money' && !isLocked) {
      setCardId('');
    }
  }, [paymentMethod, isLocked]);

  // Clear cardId when switching from voucher to credit or vice versa
  const prevPaymentMethodRef = useRef(paymentMethod);
  useEffect(() => {
    const prev = prevPaymentMethodRef.current;
    prevPaymentMethodRef.current = paymentMethod;
    if (!isLocked && prev && prev !== paymentMethod) {
      setCardId('');
    }
  }, [paymentMethod, isLocked]);

  // ✅ CORREÇÃO: Calcula dinamicamente a partir de `categories` (reativo e em tempo real)
  const currentCategoryList = categories
    .filter((c: Category) => c.type === type)
    .map((c: Category) => c.name);

  useEffect(() => {
    // Se for novo lançamento e não houver categoria pré-selecionada, inicia vazio para forçar escolha
    if (!initialData?.id && !initialData?.category && !isLocked) {
      setCategory('');
    }
  }, [type, categories, initialData, isLocked]);

  const handleCloseCardManager = (updatedCards?: CreditCard[]) => {
    if (updatedCards) setUserCards(updatedCards.filter(c => c.isActive !== false));
    setIsCardModalOpen(false);
  };

  const handleSave = async () => {
    const numericAmount = Number(amount);
    if (!description.trim()) return alert("Informe uma descrição para o lançamento.");
    if (!numericAmount || numericAmount <= 0) return alert("Informe um valor válido maior que zero.");
    if (!category) return alert("Selecione uma categoria.");
    
    // Validação de Cartão
    if (paymentMethod === 'credit' && !isLocked) {
      if (!cardId && userCards.length > 0) {
        return alert("Por favor, selecione qual cartão foi utilizado para este lançamento.");
      }
      
      const selectedCard = userCards.find(c => c.id === cardId);
      if (selectedCard && (!selectedCard.closingDay || !selectedCard.dueDay)) {
        return alert("Este cartão não possui datas de fechamento e vencimento configuradas. Configure-o antes de usá-lo.");
      }
    }

    if (paymentMethod === 'voucher' && !isLocked) {
      if (!cardId) {
        return alert("Por favor, selecione o cartão voucher utilizado para este lançamento.");
      }
      const selCard = userCards.find(c => c.id === cardId);
      if (selCard) {
        const availableBal = getVoucherCardAvailableBalance(selCard, transactions);
        if (numericAmount > availableBal) {
          if (!window.confirm(`Saldo insuficiente no cartão ${selCard.name}. Disponíveis: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(availableBal)}. Deseja continuar mesmo assim?`)) {
            return;
          }
        }
      }
    }
    
    const isVoucherRecharge = type === 'income' && cardId && userCards.find(c => c.id === cardId)?.type === 'voucher';
    const finalPaymentMethod = isVoucherRecharge ? 'voucher' : paymentMethod;

    setIsSaving(true);
    await onSave({ 
      id: initialData?.id,
      description: description.trim(), 
      amount: numericAmount, 
      type, 
      category, 
      date,
      paymentMethod: finalPaymentMethod,
      cardId: finalPaymentMethod === 'credit' || finalPaymentMethod === 'voucher' || (type === 'income' && cardId) ? (cardId || null) : null,
      installments: finalPaymentMethod === 'credit' ? installments : 1,
      linkedDebtId: showDebtSelector ? linkedDebtId : null,
      ...(isBillPayment ? {
        isBillPayment: true,
        linkedCardId: (initialData as any).linkedCardId,
        linkedInvoiceId: (initialData as any).linkedInvoiceId,
        linkedInvoicePeriodEnd: (initialData as any).linkedInvoicePeriodEnd,
      } : {}),
      ...(( (initialData as any)?.linkedRecurringBillId || linkedRecurringBillId ) ? {
        linkedRecurringBillId: linkedRecurringBillId || (initialData as any).linkedRecurringBillId,
        isBillPayment: false,
      } : {}),
    });

    if (isRecurring && user?.uid && type === 'expense' && !initialData?.id) {
      const dueDay = date ? parseInt(date.split('-')[2], 10) : new Date().getDate();
      await addRecurringBill(user.uid, {
        name: description.trim(),
        amount: numericAmount,
        dueDay,
        category,
        type: 'fixed',
        isActive: true,
      });
    }
  };

  const voice = getFlowLabels(nexusAdvisoryContext?.commandMode);

  return (
    <>
      <CategoryManager 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
        categories={categories} 
        onSave={onSaveCategory} 
        onDelete={onDeleteCategory}
        commandMode={nexusAdvisoryContext?.commandMode}
      />
      <CardManager
        isOpen={isCardModalOpen}
        onClose={handleCloseCardManager}
        userId={user?.uid || ''}
        transactions={transactions}
        onEditTransaction={() => {}} // Placeholder aqui pois o form já está aberto
      />
      <div className="space-y-4 p-2">
        {isLocked && (
          <div className="bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 p-3.5 rounded-2xl flex gap-3 animate-in fade-in slide-in-from-top-2 shadow-xs">
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 h-fit shrink-0">
              <ShieldAlert size={18} />
            </div>
            <p className="text-[11px] font-medium text-amber-900 dark:text-amber-200 leading-relaxed">
              {lockMessage}
            </p>
          </div>
        )}

        <div className="flex bg-surface-elevated dark:bg-slate-800 p-1 rounded-2xl border border-surface-elevated dark:border-slate-700">
          <button 
            disabled={isLocked}
            onClick={() => setType('expense')} 
            className={`flex-1 py-2 rounded-xl font-black uppercase text-xxs transition-all ${type === 'expense' ? 'bg-rose-600 text-text-onBrand shadow-soft' : 'text-text-muted dark:text-slate-400'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {voice.expenseSingular}
          </button>
          <button 
            disabled={isLocked}
            onClick={() => setType('income')} 
            className={`flex-1 py-2 rounded-xl font-black uppercase text-xxs transition-all ${type === 'income' ? 'bg-emerald-600 text-text-onBrand shadow-soft' : 'text-text-muted dark:text-slate-400'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {voice.incomeSingular}
          </button>
        </div>
        
        {/* SELETOR DE DÍVIDA (REATIVO) */}
        {showDebtSelector && (
          <div className="bg-sky-50 dark:bg-sky-950/40 border border-brand-secondary/30 dark:border-sky-800 p-4 rounded-2xl space-y-3 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <label className="text-xxs font-black text-sky-700 dark:text-sky-300 uppercase tracking-widest">
                Vincular a uma dívida?
              </label>
              <span className="text-[9px] font-bold text-sky-600 dark:text-sky-300 px-2 py-0.5 bg-sky-100 dark:bg-sky-900/50 rounded-lg">
                Nexus Intelligence
              </span>
            </div>
            <select 
              value={linkedDebtId} 
              onChange={e => setLinkedDebtId(e.target.value)} 
              className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl text-text-primary dark:text-white outline-none border border-brand-secondary/20 dark:border-sky-800 focus:border-brand-secondary appearance-none text-sm font-medium shadow-sm"
            >
              <option value="" className="dark:bg-slate-900 dark:text-white">Não vincular (Lançamento avulso)</option>
              {activeDebts.filter(d => d.saldoDevedor > 0).map(debt => (
                <option key={debt.id} value={debt.id} className="dark:bg-slate-900 dark:text-white">
                  {debt.nome} (Saldo: R$ {debt.saldoDevedor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                </option>
              ))}
            </select>
            <p className="text-[9px] text-sky-700 dark:text-sky-300 leading-relaxed">
              Ao vincular, o saldo da dívida será abatido automaticamente após salvar.
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase ml-1">Valor</label>
            <input 
              ref={amountInputRef}
              disabled={isLocked}
              type="text" 
              inputMode="numeric" 
              placeholder="R$ 0,00" 
              value={amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(amount)) : ''} 
              onChange={e => {
                const value = e.target.value.replace(/\D/g, '');
                setAmount(value ? Number(value) / 100 : '');
              }} 
              className={`w-full bg-surface-primary dark:bg-slate-900 p-4 rounded-2xl text-text-primary dark:text-white font-bold outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary ${isLocked ? 'opacity-70 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed' : ''}`} 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase ml-1">Data de Pagamento</label>
            <input 
              type="date" 
              disabled={isLocked && !isBillPayment}
              value={date} 
              onChange={e => setDate(e.target.value)} 
              className={`w-full bg-surface-primary dark:bg-slate-900 p-4 rounded-2xl text-text-primary dark:text-white outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary text-sm ${isLocked && !isBillPayment ? 'opacity-70 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed' : ''}`} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase ml-1">Descrição</label>
            <input 
              type="text" 
              disabled={isLocked}
              placeholder="Ex: Aluguel, Supermercado..." 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              className={`w-full bg-surface-primary dark:bg-slate-900 p-4 rounded-2xl text-text-primary dark:text-white font-medium outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary ${isLocked ? 'opacity-70 bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed' : ''}`} 
            />
          </div>

          <div className="space-y-1">
            <label className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase ml-1">Categoria</label>
            {isLocked ? (
              <div className="w-full bg-surface-primary dark:bg-slate-900 p-4 rounded-2xl text-text-primary dark:text-white font-bold border border-surface-elevated dark:border-slate-700 opacity-70 cursor-not-allowed text-sm">
                {category}
              </div>
            ) : (
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-surface-primary dark:bg-slate-900 p-4 rounded-2xl text-text-primary dark:text-white outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary appearance-none">
                <option value="" className="dark:bg-slate-900 dark:text-white">Selecione a categoria...</option>
                {currentCategoryList.map((c: string) => <option key={c} value={c} className="dark:bg-slate-900 dark:text-white">{c}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* VÍNCULO ATIVO COM CONTA FIXA */}
        {linkedRecurringBill && (
          <div data-testid="transaction-linked-bill-badge" className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 flex items-center justify-between gap-2 animate-in fade-in shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">
                Vinculado a: <strong>{linkedRecurringBill.name}</strong> (Dará baixa automática)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLinkedRecurringBillId('');
                setIsBillPaymentState(false);
              }}
              className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 underline shrink-0"
            >
              Desvincular
            </button>
          </div>
        )}

        {/* SUGESTÃO INTELIGENTE DE RECONCILIAÇÃO (IA LOCAL <1MS) */}
        {suggestedMatch && !linkedRecurringBill && (
          <div data-testid="transaction-reconcile-suggestion" className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200/90 dark:border-sky-800 rounded-2xl p-3.5 flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top-1 shadow-xs">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-1.5 bg-sky-500/10 text-sky-600 dark:text-sky-400 rounded-xl mt-0.5 shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  Parece o pagamento de uma conta fixa
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 truncate">
                  <strong>{suggestedMatch.bill.name}</strong> • R$ {suggestedMatch.bill.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Vence dia {suggestedMatch.bill.dueDay})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setLinkedRecurringBillId(suggestedMatch.bill.id);
                  setIsBillPaymentState(true);
                  if (!category && suggestedMatch.bill.category) {
                    setCategory(suggestedMatch.bill.category);
                  }
                }}
                data-testid="btn-link-recurring-bill"
                className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-[11px] font-black rounded-xl transition shadow-xs"
              >
                Vincular e Baixar
              </button>
              <button
                type="button"
                onClick={() => setDismissedMatchBillId(suggestedMatch.bill.id)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                title="Manter como despesa avulsa"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {type === 'expense' && (
          <div className="mt-2 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
              <div className="space-y-1">
                <label className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase ml-1">Meio de Pagamento</label>
                <div className="flex bg-surface-primary dark:bg-slate-900 p-1 rounded-2xl border border-surface-elevated dark:border-slate-800">
                  <button 
                    type="button"
                    disabled={isLocked}
                    onClick={() => setPaymentMethod('money')} 
                    className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${paymentMethod === 'money' ? 'bg-surface-elevated dark:bg-slate-800 text-text-primary dark:text-white shadow-soft' : 'text-text-muted dark:text-slate-400'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Dinheiro
                  </button>
                  <button 
                    type="button"
                    disabled={isLocked}
                    onClick={() => setPaymentMethod('credit')} 
                    className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${paymentMethod === 'credit' ? 'bg-status-info/10 text-brand-secondary shadow-soft border border-brand-secondary/20' : 'text-text-muted dark:text-slate-400'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Cartão
                  </button>
                  <button 
                    type="button"
                    disabled={isLocked}
                    onClick={() => setPaymentMethod('voucher')} 
                    className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${paymentMethod === 'voucher' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shadow-soft border border-emerald-200 dark:border-emerald-800' : 'text-text-muted dark:text-slate-400'} ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Voucher (Alimentação/Refeição)
                  </button>
                </div>
              </div>

              {paymentMethod === 'credit' && (
                <div className="space-y-1 animate-in fade-in slide-in-from-left-1 duration-200">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase">Identificar Cartão</label>
                    <button 
                      type="button"
                      onClick={() => setIsCardModalOpen(true)}
                      className="text-[9px] font-black text-action-primaryDark uppercase tracking-widest hover:underline"
                    >
                      + Gerenciar
                    </button>
                  </div>
                  <select 
                    value={cardId} 
                    onChange={e => setCardId(e.target.value)} 
                    className="w-full bg-surface-primary dark:bg-slate-900 p-4 rounded-2xl text-text-primary dark:text-white outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary appearance-none text-sm"
                  >
                    <option value="" className="dark:bg-slate-900 dark:text-white">{userCards.length > 1 ? 'Selecione o seu cartão...' : 'Cartão não identificado'}</option>
                    {userCards.filter(c => c.type !== 'voucher').map(card => (
                      <option key={card.id} value={card.id} className="dark:bg-slate-900 dark:text-white">
                        {card.name} {(!card.closingDay || !card.dueDay) ? ' (Sem data!)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {paymentMethod === 'voucher' && (
                <div className="space-y-1 animate-in fade-in slide-in-from-left-1 duration-200">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase">Cartão Voucher</label>
                    <button 
                      type="button"
                      onClick={() => setIsCardModalOpen(true)}
                      className="text-[9px] font-black text-action-primaryDark uppercase tracking-widest hover:underline"
                    >
                      + Gerenciar
                    </button>
                  </div>
                  <select 
                    value={cardId} 
                    onChange={e => setCardId(e.target.value)} 
                    className="w-full bg-surface-primary dark:bg-slate-900 p-4 rounded-2xl text-text-primary dark:text-white outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary appearance-none text-sm"
                  >
                    <option value="" className="dark:bg-slate-900 dark:text-white">Selecione o cartão voucher...</option>
                    {userCards.filter(c => c.type === 'voucher').map(card => {
                      const bal = getVoucherCardAvailableBalance(card, transactions);
                      return (
                        <option key={card.id} value={card.id} className="dark:bg-slate-900 dark:text-white">
                          {card.name} (Saldo: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bal)})
                        </option>
                      );
                    })}
                  </select>
                  {cardId && (() => {
                    const selectedCard = userCards.find(c => c.id === cardId);
                    if (!selectedCard) return null;
                    const availableBal = getVoucherCardAvailableBalance(selectedCard, transactions);
                    const numAmount = Number(amount);
                    if (!numAmount) return null;
                    const insufficient = numAmount > availableBal;
                    return (
                      <div className={`text-[10px] font-bold px-1 ${insufficient ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {insufficient
                          ? `Saldo insuficiente — disponível: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(availableBal)}`
                          : `Saldo disponível: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(availableBal)}`
                        }
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {paymentMethod === 'credit' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 animate-in fade-in slide-in-from-bottom-1 duration-200">
                <div className="space-y-1">
                  <label className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase ml-1">Parcelas</label>
                  <select 
                    value={installments} 
                    onChange={e => setInstallments(Number(e.target.value))} 
                    className="w-full bg-surface-primary dark:bg-slate-900 p-4 rounded-2xl text-text-primary dark:text-white outline-none border border-surface-elevated dark:border-slate-700 focus:border-brand-primary appearance-none text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24, 36, 48].map(n => (
                      <option key={n} value={n} className="dark:bg-slate-900 dark:text-white">{n === 1 ? 'À vista (1x)' : `${n} parcelas`}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <p className="text-[9px] font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider ml-1 mt-1">
                      {installments > 1 
                      ? `Serão gerados ${installments} lançamentos de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(amount) / installments)}.`
                      : FPI_COPY.creditImpact}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {type === 'expense' && !initialData?.id && !isLocked && (
          <div className="flex items-center justify-between p-4 rounded-2xl border border-surface-elevated dark:border-slate-800 bg-surface-secondary dark:bg-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-primary/10 text-brand-primary">
                <RefreshCw size={16} />
              </div>
              <div>
                <p className="text-xs font-black text-text-primary dark:text-white uppercase tracking-widest">Repetir todo mês</p>
                <p className="text-[9px] text-text-muted dark:text-slate-400 font-medium">Cria uma conta fixa com os mesmos dados</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isRecurring}
              onClick={() => setIsRecurring(!isRecurring)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/30 ${
                isRecurring ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  isRecurring ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {type === 'income' && !isLocked && userCards.filter(c => c.type === 'voucher').length > 0 && (
          <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/30 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                <WalletIcon size={14} />
              </div>
              <p className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-widest">Recarregar cartão voucher</p>
            </div>
            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Selecione um cartão voucher para creditar este valor como recarga.</p>
            <select 
              value={cardId} 
              onChange={e => setCardId(e.target.value)} 
              className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl text-text-primary dark:text-white outline-none border border-emerald-200 dark:border-emerald-800 focus:border-emerald-400 appearance-none text-sm font-bold"
            >
              <option value="" className="dark:bg-slate-900 dark:text-white">Apenas receita (sem recarga de voucher)</option>
              {userCards.filter(c => c.type === 'voucher').map(card => {
                const bal = getVoucherCardAvailableBalance(card, transactions);
                return (
                  <option key={card.id} value={card.id} className="dark:bg-slate-900 dark:text-white">
                    {card.name} (Saldo atual: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bal)})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {!isLocked && (
          <button 
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="mt-1 w-full py-3 rounded-2xl bg-surface-secondary dark:bg-slate-800/80 hover:bg-brand-primary/10 border border-surface-elevated dark:border-slate-700 hover:border-brand-primary/30 text-text-secondary dark:text-slate-300 hover:text-action-primaryDark font-bold text-xxs uppercase tracking-ultra-wide transition-all flex items-center justify-center gap-2"
          >
            <FolderPlus size={16} />
            <span>Gerenciar Categorias</span>
          </button>
        )}

        <NexusInlineAdvisor 
          draft={{ amount: Number(amount), category, type, paymentMethod }}
          context={nexusAdvisoryContext}
        />

        <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-4 pb-2 mt-4 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800">
          {initialData?.id && onDelete && (
            <button
              type="button"
              onClick={async () => {
                const confirmMsg = isBillPayment
                  ? "Excluir este pagamento de fatura irá estornar o valor e restabelecer o limite do cartão. Deseja continuar?"
                  : `Deseja realmente excluir este lançamento?`;
                if (window.confirm(confirmMsg)) {
                  await onDelete(initialData.id!);
                  onCancel();
                }
              }}
              className="px-4 py-4 text-status-danger dark:text-rose-400 hover:bg-status-danger/10 dark:hover:bg-rose-500/10 active:bg-status-danger/20 rounded-3xl transition-all font-black text-xxs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-status-danger/20 dark:border-rose-500/30 shrink-0"
              title={isBillPayment ? "Excluir pagamento e estornar fatura" : "Excluir lançamento"}
            >
              <Trash2 size={15} />
              <span className="hidden sm:inline">Excluir</span>
            </button>
          )}
          <button onClick={onCancel} className="flex-1 py-4 text-text-muted dark:text-slate-400 font-bold uppercase text-xxs tracking-ultra-wide">Cancelar</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 py-4 bg-brand-primary text-text-onBrand rounded-3xl font-black uppercase text-xxs tracking-ultra-wide shadow-brand-glow active:scale-95 disabled:opacity-50">
              {isSaving ? 'Processando...' : initialData?.id ? 'Atualizar' : 'Salvar'}
          </button>
        </div>
      </div>
    </>
  );
};

export default TransactionForm;
