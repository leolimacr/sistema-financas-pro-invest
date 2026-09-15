import React, { useMemo } from 'react';
import { Plus, Edit2, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import type { CreditCard, Transaction } from '../../../types';
import { calculateWalletStatementSummary, toIntegerCents } from '../../../utils/calculations';

export interface VoucherStatementProps {
  card: CreditCard;
  transactions: Transaction[];
  onEditTransaction: (t: any) => void;
  onCloseParent?: () => void;
}

interface MonthlyGroup {
  monthKey: string;
  monthLabel: string;
  transactions: Transaction[];
  totalIncomes: number;
  totalExpenses: number;
  netFlow: number;
}

const VoucherStatement: React.FC<VoucherStatementProps> = ({
  card,
  transactions,
  onEditTransaction,
  onCloseParent,
}) => {
  // Transações vinculadas a este cartão voucher
  const voucherTransactions = useMemo(() => {
    return transactions
      .filter(t => t.cardId === card.id)
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return (b.createdAtMs || 0) - (a.createdAtMs || 0);
      });
  }, [transactions, card.id]);

  // Resumo financeiro consolidado pelo motor soberano de domínio (calculado em centavos inteiros)
  // Regra: saldoDisponivel = totalEntradas - totalDespesas
  const summary = useMemo(() => {
    return calculateWalletStatementSummary(voucherTransactions);
  }, [voucherTransactions]);

  // Agrupamento por mês/ano em centavos inteiros
  const monthlyGroups = useMemo(() => {
    interface InternalMonthlyGroup extends MonthlyGroup {
      incomesCents: number;
      expensesCents: number;
      netFlowCents: number;
    }
    const groups: Record<string, InternalMonthlyGroup> = {};

    voucherTransactions.forEach(t => {
      const parts = t.date.split('-');
      const year = parseInt(parts[0], 10) || new Date().getFullYear();
      const month = parseInt(parts[1], 10) || 1;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      if (!groups[monthKey]) {
        const dateObj = new Date(year, month - 1, 1);
        const rawLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(dateObj);
        const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

        groups[monthKey] = {
          monthKey,
          monthLabel,
          transactions: [],
          totalIncomes: 0,
          totalExpenses: 0,
          netFlow: 0,
          incomesCents: 0,
          expensesCents: 0,
          netFlowCents: 0,
        };
      }

      groups[monthKey].transactions.push(t);
      const valCents = toIntegerCents(t.amount);
      if (t.type === 'income') {
        groups[monthKey].incomesCents += valCents;
        groups[monthKey].netFlowCents += valCents;
      } else {
        groups[monthKey].expensesCents += valCents;
        groups[monthKey].netFlowCents -= valCents;
      }
    });

    return Object.values(groups)
      .map(g => ({
        monthKey: g.monthKey,
        monthLabel: g.monthLabel,
        transactions: g.transactions,
        totalIncomes: g.incomesCents / 100,
        totalExpenses: g.expensesCents / 100,
        netFlow: g.netFlowCents / 100,
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [voucherTransactions]);

  const handleLaunchExpense = () => {
    onCloseParent?.();
    onEditTransaction({
      paymentMethod: 'voucher',
      cardId: card.id,
      type: 'expense',
    } as any);
  };

  const handleLaunchIncome = () => {
    onCloseParent?.();
    onEditTransaction({
      paymentMethod: 'voucher',
      cardId: card.id,
      type: 'income',
    } as any);
  };

  return (
    <div className="mt-6 space-y-6" data-testid={`voucher-statement-${card.id}`}>
      {/* Resumo do Cartão Voucher */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-primary p-4 rounded-2xl border border-surface-elevated">
        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-text-muted">Saldo Atual Disponível</p>
          <p className="text-base font-black text-emerald-600 mt-0.5">
            R$ {summary.availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-text-muted">Total em Recargas</p>
          <p className="text-base font-black text-text-primary mt-0.5">
            + R$ {summary.totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-text-muted">Total em Despesas</p>
          <p className="text-base font-black text-text-primary mt-0.5">
            − R$ {summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Barra de Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
          Histórico de Movimentações ({voucherTransactions.length})
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleLaunchExpense}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={12} /> Registrar Gasto
          </button>
          <button
            type="button"
            onClick={handleLaunchIncome}
            className="px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors flex items-center gap-1.5 active:scale-95"
          >
            <Plus size={12} /> Registrar Recarga
          </button>
        </div>
      </div>

      {/* Linha do Tempo de Movimentações */}
      {monthlyGroups.length > 0 ? (
        <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-elevated">
          {monthlyGroups.map((group) => (
            <div key={group.monthKey} className="relative pl-8 space-y-3">
              {/* Marcador na Timeline */}
              <div className="absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-surface-secondary bg-emerald-500 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Cabeçalho do Mês */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-text-primary">
                    {group.monthLabel}
                  </h4>
                  <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter mt-0.5">
                    {group.transactions.length} movimentaç{group.transactions.length > 1 ? 'ões' : 'ão'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-text-primary">
                    Fluxo: {group.netFlow >= 0 ? '+' : '−'} R$ {Math.abs(group.netFlow).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Itens do Mês */}
              <div className="space-y-2">
                {group.transactions.map((t) => {
                  const isIncome = t.type === 'income';
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between bg-surface-primary p-3 rounded-2xl border border-surface-elevated text-xs group/item hover:border-emerald-500/30 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isIncome ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-secondary text-text-muted'
                          }`}
                        >
                          {isIncome ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-text-primary text-[11px]">
                            {t.description || (isIncome ? 'Recarga de Voucher' : 'Compra Voucher')}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-text-muted text-[9px] font-medium">
                              {new Date(t.date.replace(/-/g, '/')).toLocaleDateString('pt-BR')}
                            </span>
                            {t.category && (
                              <span className="px-1.5 py-0.5 bg-surface-secondary text-text-muted text-[8px] font-black rounded-md uppercase">
                                {t.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-black text-xs ${isIncome ? 'text-emerald-600' : 'text-text-primary'}`}>
                          {isIncome ? '+' : '−'} R$ {Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            onCloseParent?.();
                            onEditTransaction(t);
                          }}
                          className="p-2 text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-all opacity-100 md:opacity-0 md:group-hover/item:opacity-100"
                          title="Editar lançamento"
                          aria-label="Editar lançamento"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-8 text-center space-y-3 bg-surface-primary/50 rounded-2xl border border-dashed border-surface-elevated">
          <div className="p-3 bg-surface-secondary rounded-2xl text-text-muted opacity-40">
            <Receipt size={28} />
          </div>
          <p className="text-xxs text-text-muted font-bold uppercase tracking-widest max-w-[240px]">
            Nenhuma movimentação registrada neste cartão voucher.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleLaunchExpense}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
            >
              Registrar Gasto
            </button>
            <button
              type="button"
              onClick={handleLaunchIncome}
              className="px-4 py-2 bg-surface-primary text-text-primary border border-surface-elevated rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-surface-secondary transition-all active:scale-95"
            >
              Registrar Recarga
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherStatement;
