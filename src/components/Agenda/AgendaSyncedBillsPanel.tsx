import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Check,
  ChevronRight,
  RefreshCw,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowUpRight,
  Tag,
  Trash2,
} from 'lucide-react';
import type { AgendaCommitment } from '../../services/agendaService';
import { extractBillAmount, isSyncedBill } from '../../services/agendaService';
import type { RecurringBill } from '../../types';
import {
  DAYS_SHORT,
  MONTHS,
  tsToDate,
  commitmentTimeLabel,
} from '../../agenda/agendaTypes';

export interface AgendaSyncedBillsPanelProps {
  show: boolean;
  activeYear: number;
  activeMonth: number;
  commitments: AgendaCommitment[];
  recurringBills: RecurringBill[];
  isSyncing: boolean;
  onClose: () => void;
  onToggleCommitment: (id: string, completed: boolean) => void;
  onFocusCommitment: (c: AgendaCommitment) => void;
  onSyncAgain: () => void;
  onOpenDeleteConfirm?: (id: string, title: string) => void;
}

type FilterTab = 'all' | 'pending' | 'paid';

export const AgendaSyncedBillsPanel: React.FC<AgendaSyncedBillsPanelProps> = ({
  show,
  activeYear,
  activeMonth,
  commitments,
  recurringBills,
  isSyncing,
  onClose,
  onToggleCommitment,
  onFocusCommitment,
  onSyncAgain,
  onOpenDeleteConfirm,
}) => {
  const [filter, setFilter] = useState<FilterTab>('all');

  // Filtra apenas os compromissos que são contas sincronizadas do Controla
  const syncedCommitments = useMemo(() => {
    return commitments
      .filter(isSyncedBill)
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date.getTime() : a.date?.toDate?.()?.getTime() || 0;
        const db = b.date instanceof Date ? b.date.getTime() : b.date?.toDate?.()?.getTime() || 0;
        return da - db;
      });
  }, [commitments]);

  // Cálculos financeiros consolidados
  const { totalAmount, paidAmount, pendingAmount, paidCount, pendingCount } = useMemo(() => {
    let total = 0;
    let paid = 0;
    let paidC = 0;

    for (const c of syncedCommitments) {
      const amt = extractBillAmount(c);
      total += amt;
      if (c.completed) {
        paid += amt;
        paidC++;
      }
    }

    return {
      totalAmount: total,
      paidAmount: paid,
      pendingAmount: Math.max(0, total - paid),
      paidCount: paidC,
      pendingCount: syncedCommitments.length - paidC,
    };
  }, [syncedCommitments]);

  // Contas fixas ativas no Controla que ainda não estão presentes neste mês
  const unsyncedBills = useMemo(() => {
    const existingTitles = new Set(
      syncedCommitments.map((c) => (c.title || '').toLowerCase().trim())
    );
    return recurringBills.filter((b) => {
      if (!b || b.isActive === false) return false;
      const title = `pagar ${(b.name || '').trim().toLowerCase()}`;
      return !existingTitles.has(title);
    });
  }, [recurringBills, syncedCommitments]);

  // Itens filtrados pela aba selecionada
  const filteredList = useMemo(() => {
    if (filter === 'pending') return syncedCommitments.filter((c) => !c.completed);
    if (filter === 'paid') return syncedCommitments.filter((c) => c.completed);
    return syncedCommitments;
  }, [syncedCommitments, filter]);

  if (!show) return null;

  const monthLabel = `${MONTHS[activeMonth]} de ${activeYear}`;

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <section
      data-testid="agenda-synced-bills-panel"
      className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-200 dark:border-slate-800 shadow-card dark:shadow-none p-4 sm:p-5 space-y-4 animate-in fade-in duration-200"
    >
      {/* 1. Header do Painel */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 bg-sky-50 dark:bg-sky-950/40 rounded-xl text-sky-600 dark:text-sky-400 shrink-0">
            <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
                Contas Sincronizadas do Controla
              </h2>
              <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300">
                {monthLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {syncedCommitments.length === 0
                ? 'Nenhuma conta importada para este mês.'
                : `${syncedCommitments.length} ${
                    syncedCommitments.length === 1 ? 'conta sincronizada' : 'contas sincronizadas'
                  } neste mês.`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onSyncAgain}
            disabled={isSyncing}
            data-testid="synced-panel-refresh"
            title="Sincronizar novamente com o Controla"
            className="inline-flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin text-sky-600' : 'text-slate-500'} />
            <span className="hidden md:inline">Sincronizar</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Voltar ao caderno completo"
            data-testid="synced-panel-close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* 2. Banner de Resumo Financeiro Executivo */}
      {syncedCommitments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80">
          <div className="space-y-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total do Mês
            </span>
            <div className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              {formatCurrency(totalAmount)}
            </div>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              {syncedCommitments.length} {syncedCommitments.length === 1 ? 'conta' : 'contas'}
            </span>
          </div>

          <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 size={11} />
              Quitadas
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300">
              {formatCurrency(paidAmount)}
            </div>
            <span className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">
              {paidCount} {paidCount === 1 ? 'paga' : 'pagas'}
            </span>
          </div>

          <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-2 sm:pt-0 sm:pl-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <Clock size={11} />
              Pendentes
            </span>
            <div className="text-base sm:text-lg font-black text-sky-700 dark:text-sky-300">
              {formatCurrency(pendingAmount)}
            </div>
            <span className="text-[10px] font-semibold text-sky-600/80 dark:text-sky-400/80">
              {pendingCount} {pendingCount === 1 ? 'restante' : 'restantes'}
            </span>
          </div>
        </div>
      )}

      {/* 3. Aviso sutil de contas do Controla não sincronizadas (se houver) */}
      {unsyncedBills.length > 0 && (
        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-amber-800 dark:text-amber-200 font-semibold truncate">
              {unsyncedBills.length} {unsyncedBills.length === 1 ? 'conta ativa do Controla ainda não está' : 'contas ativas do Controla ainda não estão'} na Agenda deste mês.
            </span>
          </div>
          <button
            type="button"
            onClick={onSyncAgain}
            disabled={isSyncing}
            className="shrink-0 font-black text-[11px] uppercase tracking-wider text-amber-900 dark:text-amber-200 bg-amber-200/60 dark:bg-amber-900/60 hover:bg-amber-200 px-2 py-1 rounded-lg transition"
          >
            Importar
          </button>
        </div>
      )}

      {/* 4. Filtros de Status (Todas / Pendentes / Pagas) */}
      {syncedCommitments.length > 0 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              data-testid="synced-filter-all"
              className={`text-xs font-bold px-3 py-1 rounded-xl transition ${
                filter === 'all'
                  ? 'bg-sky-500 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Todas ({syncedCommitments.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('pending')}
              data-testid="synced-filter-pending"
              className={`text-xs font-bold px-3 py-1 rounded-xl transition ${
                filter === 'pending'
                  ? 'bg-sky-500 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Pendentes ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter('paid')}
              data-testid="synced-filter-paid"
              className={`text-xs font-bold px-3 py-1 rounded-xl transition ${
                filter === 'paid'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Pagas ({paidCount})
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:underline shrink-0"
          >
            Ver no caderno
          </button>
        </div>
      )}

      {/* 5. Lista de Contas */}
      {syncedCommitments.length === 0 ? (
        <div className="text-center py-10 px-4 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900/60 flex items-center justify-center mx-auto text-sky-600 dark:text-sky-400">
            <RefreshCw size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
              Nenhuma conta sincronizada em {monthLabel}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Cadastre suas contas fixas e assinaturas no módulo <strong>Controla</strong> e clique no botão abaixo para importá-las para a sua Agenda com data e valor programados.
            </p>
          </div>
          <button
            type="button"
            onClick={onSyncAgain}
            disabled={isSyncing}
            data-testid="synced-panel-empty-sync"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-black shadow-xs transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>Sincronizar Contas do Controla</span>
          </button>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
          Nenhuma conta encontrada com o filtro selecionado.
        </div>
      ) : (
        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
          {filteredList.map((c) => {
            const dateObj = tsToDate(c.date);
            const dayOfWeek = DAYS_SHORT[dateObj.getDay()];
            const dayNum = dateObj.getDate();
            const amount = extractBillAmount(c);
            const timeLabel = commitmentTimeLabel(c);
            const isCompleted = Boolean(c.completed);

            return (
              <div
                key={c.id || `${c.title}_${dateObj.getTime()}`}
                data-testid={`synced-bill-item-${c.id}`}
                className={`group flex items-center justify-between gap-3 p-3 rounded-xl border transition ${
                  isCompleted
                    ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 opacity-75'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 hover:border-sky-300 dark:hover:border-sky-800 shadow-2xs'
                }`}
              >
                {/* Lado Esquerdo: Checkbox + Identificação */}
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => c.id && onToggleCommitment(c.id, !isCompleted)}
                    data-testid={`synced-bill-toggle-${c.id}`}
                    aria-label={isCompleted ? 'Marcar conta como pendente' : 'Marcar conta como paga'}
                    className={`shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-slate-300 dark:border-slate-600 hover:border-sky-500'
                    }`}
                  >
                    {isCompleted && <Check size={12} strokeWidth={3} />}
                  </button>

                  {/* Data & Dia */}
                  <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 shrink-0 text-center select-none">
                    <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 leading-none">
                      {dayOfWeek}
                    </span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-200 leading-none pt-0.5">
                      {dayNum}
                    </span>
                  </div>

                  {/* Nome, Horário & Categoria */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4
                        className={`text-xs sm:text-sm font-bold tracking-tight truncate ${
                          isCompleted
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {c.title}
                      </h4>
                      {c.category && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                          <Tag size={9} />
                          {c.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 pt-0.5">
                      {timeLabel && (
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock size={10} />
                          {timeLabel}
                        </span>
                      )}
                      <span>•</span>
                      <span className={isCompleted ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                        {isCompleted ? 'Quitada' : 'A Vencer'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Valor & Ações de Salto */}
                <div className="flex items-center gap-2 shrink-0">
                  {amount > 0 && (
                    <div className="text-right">
                      <div
                        className={`text-xs sm:text-sm font-black tracking-tight ${
                          isCompleted
                            ? 'text-slate-400 dark:text-slate-500 line-through'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {formatCurrency(amount)}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onFocusCommitment(c)}
                    data-testid={`synced-bill-focus-${c.id}`}
                    title="Ver no Caderno da Agenda"
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 text-xs font-bold transition flex items-center gap-1 shrink-0"
                  >
                    <span className="hidden sm:inline">Ver</span>
                    <ArrowUpRight size={13} />
                  </button>

                  {onOpenDeleteConfirm && c.id && (
                    <button
                      type="button"
                      onClick={() => onOpenDeleteConfirm(c.id!, c.title)}
                      data-testid={`synced-bill-delete-${c.id}`}
                      title="Excluir este compromisso da Agenda"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default AgendaSyncedBillsPanel;
