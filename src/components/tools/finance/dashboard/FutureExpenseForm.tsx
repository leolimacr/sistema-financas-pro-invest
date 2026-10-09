import React, { useState } from 'react';
import { push, ref, set } from 'firebase/database';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Loader, Check, X } from 'lucide-react';
import { db } from '../../../../firebase';
import { getLocalDateString } from '../../../../utils/dateHelpers';
import type { Category } from '../../../../types';
import { queryKeys } from '../../../../core/query/queryKeys';

interface FutureExpenseFormProps {
  userId: string;
  categories: Category[];
  queryClient: ReturnType<typeof useQueryClient>;
  onClose: () => void;
}

const FutureExpenseForm: React.FC<FutureExpenseFormProps> = ({ userId, categories, queryClient, onClose }) => {
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const today = getLocalDateString();
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) { setAmountText(''); return; }
    const num = parseInt(raw, 10) / 100;
    setAmountText(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const parseAmount = (text: string): number => {
    return parseFloat(text.replace(/\./g, '').replace(',', '.')) || 0;
  };

  const handleSave = async () => {
    if (!description.trim()) { setError('Descreva o que será este gasto.'); return; }
    const amountNum = parseAmount(amountText);
    if (!amountNum || amountNum <= 0) { setError('Informe um valor válido.'); return; }
    if (!date) { setError('Selecione uma data.'); return; }
    if (date <= today) { setError('A data precisa ser futura — escolha um dia à frente.'); return; }
    if (!category) { setError('Selecione uma categoria.'); return; }

    setSaving(true);
    setError('');

    try {
      const transactionRef = push(ref(db, `transactions/${userId}`));
      const now = Date.now();
      const dateClean = date.replace(/-/g, '');
      await set(transactionRef, {
        userId,
        description: description.trim(),
        amount: amountNum,
        type: 'expense',
        category,
        date,
        paymentMethod: 'money',
        createdAtMs: now,
        sortKey: `${dateClean}_${now}_${transactionRef.key}`,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.byUser(userId) });
      onClose();
    } catch {
      setError('Erro ao salvar. Tente novamente.');
      setSaving(false);
    }
  };

  return (
    <div className="border border-dashed border-amber-300/60 dark:border-amber-700/60 rounded-3xl p-4 bg-amber-50/30 dark:bg-amber-950/20 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <p className="text-[9px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
        <Calendar size={12} />
        Agendar despesa futura
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[8px] font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider block mb-1">Descrição</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ex: Dentista, presente, conserto..."
            className="w-full px-3 py-2.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 text-xs font-bold text-text-primary dark:text-white placeholder:text-text-muted/50 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-300/40 focus:border-amber-400 transition-all"
          />
        </div>
        <div>
          <label className="text-[8px] font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider block mb-1">Valor</label>
          <input
            type="text"
            inputMode="decimal"
            value={amountText}
            onChange={handleAmountChange}
            placeholder="R$ 0,00"
            className="w-full px-3 py-2.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 text-xs font-black text-text-primary dark:text-white placeholder:text-text-muted/50 dark:placeholder:text-slate-500 tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-300/40 focus:border-amber-400 transition-all"
          />
        </div>
        <div>
          <label className="text-[8px] font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider block mb-1">Data</label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={e => setDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 text-xs font-bold text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-300/40 focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      <div>
        <label className="text-[8px] font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider block mb-1">Categoria</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full px-3 py-2.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-white dark:bg-slate-900 text-xs font-bold text-text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-300/40 focus:border-amber-400 transition-all appearance-none"
        >
          <option value="" className="dark:bg-slate-900 dark:text-white">Selecionar categoria...</option>
          {expenseCategories.map(c => (
            <option key={c.id || c.name} value={c.name} className="dark:bg-slate-900 dark:text-white">{c.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-[9px] font-bold text-status-danger">{error}</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 shadow-soft"
        >
          {saving ? <Loader size={12} className="animate-spin" /> : <Check size={12} />}
          Agendar
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl border border-surface-elevated dark:border-slate-800 text-text-muted dark:text-slate-300 text-[9px] font-black uppercase tracking-widest hover:bg-surface-secondary dark:hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
        >
          <X size={12} />
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default FutureExpenseForm;
