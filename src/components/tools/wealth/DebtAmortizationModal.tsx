import React, { useState, useMemo } from 'react';
import { X, ShieldCheck, AlertCircle, Calculator, Calendar, ChevronRight, TrendingUp } from 'lucide-react';
import type { DebtItem, AmortizacaoTipo } from '../../../services/debt';
import { useAmortizeDebt } from '../../../services/debt/debt.hooks';
import { useToast } from '../../../contexts/ToastContext';
import { computeCurrentInstallment, getCurrentSeriesInfo, computeRemainingInstallments } from '../../../services/debt/debt.math';
import { addTransaction } from '../../../services/transactionService';
import { getLocalDateString } from '../../../utils/dateHelpers';

interface DebtAmortizationModalProps {
  debt: DebtItem | null;
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

export const DebtAmortizationModal: React.FC<DebtAmortizationModalProps> = ({
  debt,
  userId,
  isOpen,
  onClose,
}) => {
  const [tipo, setTipo] = useState<AmortizacaoTipo>('normal');
  const [valorExtra, setValorExtra] = useState<string>('');
  const [syncWithControla, setSyncWithControla] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { mutateAsync: amortize, isPending } = useAmortizeDebt(userId);
  const { addToast } = useToast();

  const currentInstallment = debt ? computeCurrentInstallment(debt) : 0;
  const seriesInfo = debt ? getCurrentSeriesInfo(debt) : { seriesIndex: 0, series: null, installmentInSeries: 0 };
  const remainingInstallments = debt ? computeRemainingInstallments(debt) : 0;
  const config = debt?.adjustmentConfig;

  const isSeriesDebt = config && config.type !== 'fixed' && config.series && config.series.length > 0;
  const currentSeries = seriesInfo.series;
  const nextSeries = isSeriesDebt && config.series && seriesInfo.seriesIndex + 1 < config.series.length 
    ? config.series[seriesInfo.seriesIndex + 1] 
    : null;

  const valorParcelaNormal = currentInstallment;
  const valorExtraNum = parseFloat(valorExtra.replace(',', '.')) || 0;
  const valorAbatido = useMemo(() => {
    if (tipo === 'extraordinaria') {
      return valorParcelaNormal + valorExtraNum;
    }
    return valorParcelaNormal;
  }, [tipo, valorParcelaNormal, valorExtraNum]);

  const newSaldo = useMemo(() => {
    if (!debt) return 0;
    return Math.max(0, debt.saldoDevedor - valorAbatido);
  }, [debt, valorAbatido]);

  const parcelasPagasNestaAmortizacao = useMemo(() => {
    return Math.ceil(valorAbatido / valorParcelaNormal);
  }, [valorAbatido, valorParcelaNormal]);

  const newParcelasRestantes = useMemo(() => {
    if (!debt) return 0;
    // Simular o estado após amortização para calcular parcelas restantes
    const simulatedDebt = { ...debt, parcelasPagas: (debt.parcelasPagas || 0) + parcelasPagasNestaAmortizacao };
    return computeRemainingInstallments(simulatedDebt);
  }, [debt, parcelasPagasNestaAmortizacao]);

  const proximaParcelaNumero = (debt?.parcelasPagas || 0) + 1;
  const totalParcelas = debt?.totalParcelas || debt?.parcelasRestantes || 0;
  const progressoPercentual = totalParcelas > 0
    ? Math.round(((debt?.parcelasPagas || 0) / totalParcelas) * 100)
    : 0;

  const handleSubmit = async () => {
    if (!debt || !userId) return;
    
    if (valorAbatido <= 0) {
      addToast('Valor a abater deve ser maior que zero', 'error');
      return;
    }
    if (valorAbatido > debt.saldoDevedor) {
      addToast('Valor a abater não pode exceder o saldo devedor', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await amortize({
        debtId: debt.id!,
        options: {
          tipo,
          valorExtra: tipo === 'extraordinaria' ? valorExtraNum : undefined,
        },
      });

      // Sincronia Automática com o Controla (F4.3.1)
      if (syncWithControla) {
        try {
          await addTransaction(userId, {
            description: `Amortização ${debt.nome} (${tipo === 'extraordinaria' ? 'Extraordinária' : `Parcela ${proximaParcelaNumero}/${totalParcelas}`})`,
            amount: valorAbatido,
            type: 'expense',
            category: 'Dívidas',
            date: getLocalDateString(),
            paymentMethod: 'money',
          });
        } catch (syncErr) {
          console.warn('[DebtAmortizationModal] Falha ao registrar despesa no Controla:', syncErr);
        }
      }

      const msgTipo = tipo === 'extraordinaria' 
        ? `Amortização extraordinária de ${formatCurrency(valorAbatido)} realizada`
        : `Parcela ${proximaParcelaNumero}/${totalParcelas} abatida`;

      const msgSinc = syncWithControla ? ' e registrada no Controla' : '';
      
      addToast(
        `${msgTipo}${msgSinc}. Saldo: ${formatCurrency(debt.saldoDevedor)} → ${formatCurrency(newSaldo)}`,
        'success'
      );
      onClose();
    } catch (error: any) {
      addToast(error.message || 'Erro ao abater parcela', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !debt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-950">Abater Parcela</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors" disabled={isSubmitting}>
            <X size={20} />
          </button>
        </div>

        {/* Info da Dívida + Série Atual */}
        <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-sm font-black text-slate-900">{debt.nome}</p>
          
          {isSeriesDebt && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <div className="flex items-center gap-2 text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">
                <Calendar size={12} /> Série Atual
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-slate-500 font-medium">Série</p>
                  <p className="font-black text-slate-900">
                    {currentSeries ? `${seriesInfo.seriesIndex + 1} (${currentSeries.year})` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Parcela na Série</p>
                  <p className="font-black text-slate-900">
                    {seriesInfo.installmentInSeries} / {currentSeries?.installmentsCount ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-medium">Parcelas Restantes (Total)</p>
                  <p className="font-black text-slate-900">{remainingInstallments}</p>
                </div>
                {nextSeries && (
                  <div className="col-span-2 flex items-center gap-2 text-amber-600 font-black text-sm">
                    <TrendingUp size={12} />
                    Próxima: Série {seriesInfo.seriesIndex + 2} ({nextSeries.year}) → {formatCurrency(nextSeries.installmentValue)}
                    {nextSeries.adjustmentRate ? ` (+${nextSeries.adjustmentRate}%)` : ''}
                    <ChevronRight size={12} />
                    {debt.nextAdjustmentDate && <span className="text-[10px] text-slate-500 ml-2">em {formatDate(debt.nextAdjustmentDate)}</span>}
                  </div>
                )}
                {!nextSeries && (
                  <div className="col-span-2">
                    <p className="font-black text-emerald-600">Última série — sem reajustes futuros</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="font-black text-slate-700">
              Parcela {proximaParcelaNumero} de {totalParcelas}
            </span>
            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-rose-500 to-orange-500 transition-all duration-300"
                style={{ width: `${progressoPercentual}%` }}
              />
            </div>
            <span className="font-black text-slate-500">{progressoPercentual}%</span>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo de abate</p>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => { setTipo('normal'); setValorExtra(''); }}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                tipo === 'normal'
                  ? 'border-rose-500 bg-rose-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              disabled={isSubmitting}
            >
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={18} className={tipo === 'normal' ? 'text-rose-600' : 'text-slate-400'} />
                <span className="font-black text-sm">
                  Parcela Normal
                </span>
              </div>
              <p className="text-[11px] font-medium">
                {formatCurrency(valorParcelaNormal)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setTipo('extraordinaria')}
              className={`p-4 rounded-2xl border-2 text-left transition-all ${
                tipo === 'extraordinaria'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              disabled={isSubmitting}
            >
              <div className="flex items-center gap-2 mb-1">
                <Calculator size={18} className={tipo === 'extraordinaria' ? 'text-amber-600' : 'text-slate-400'} />
                <span className="font-black text-sm">
                  Extraordinária
                </span>
              </div>
              <p className="text-[11px] font-medium">
                Parcela + valor extra
              </p>
            </button>
          </div>

          {tipo === 'extraordinaria' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Valor extra (além da parcela normal)
              </label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-sm">R$</span>
                <input
                  type="text"
                  value={valorExtra}
                  onChange={e => setValorExtra(e.target.value)}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 transition-all text-sm font-black"
                  placeholder="0,00"
                  disabled={isSubmitting}
                />
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Total a abater: <span className="font-black text-amber-700">{formatCurrency(valorAbatido)}</span>
              </p>
            </div>
          )}
        </div>

        {/* Simulação de Impacto */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 text-[10px] font-black text-blue-800 uppercase tracking-widest mb-3">
            <Calculator size={16} />
            Simulação de Impacto
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Saldo atual</span>
              <span className="font-black text-slate-900">{formatCurrency(debt.saldoDevedor)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Valor a abater</span>
              <span className="font-black text-rose-600">- {formatCurrency(valorAbatido)}</span>
            </div>
            <div className="border-t border-blue-200 pt-2 flex justify-between">
              <span className="font-black text-slate-700">Saldo após abate</span>
              <span className="font-black text-emerald-600 text-lg">{formatCurrency(newSaldo)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Parcelas restantes</span>
              <span className="font-black text-slate-700">{newParcelasRestantes}</span>
            </div>
            {isSeriesDebt && nextSeries && (
              <div className="border-t border-blue-200 pt-2">
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Próxima parcela (após reajuste)</span>
                  <span className="font-black text-amber-600">{formatCurrency(nextSeries.installmentValue)}</span>
                </div>
              </div>
            )}
            {parcelasPagasNestaAmortizacao > 1 && (
              <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">
                Esta amortização quita {parcelasPagasNestaAmortizacao} parcelas de uma vez
              </p>
            )}
          </div>
        </div>

        {valorAbatido > (debt?.saldoDevedor || 0) && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
            <AlertCircle size={20} className="text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-rose-800 uppercase tracking-widest mb-1">Atenção</p>
              <p className="text-sm text-rose-700">
                O valor a abater ({formatCurrency(valorAbatido)}) excede o saldo devedor ({formatCurrency(debt.saldoDevedor)}).
                O saldo ficará zerado.
              </p>
            </div>
          </div>
        )}

        {/* Sincronia Automática com o Controla (F4.3.1) */}
        <div className="mb-6 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={syncWithControla}
              onChange={(e) => setSyncWithControla(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-slate-900 block">
                Registrar despesa no Controla automaticamente
              </span>
              <p className="text-[11px] text-slate-500 leading-tight">
                Lança {formatCurrency(valorAbatido)} no seu fluxo diário de hoje, mantendo o saldo real do caixa rigorosamente alinhado.
              </p>
            </div>
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isSubmitting || isPending}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || isPending}
            className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-rose-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <ShieldCheck size={16} />
            {isSubmitting ? 'Processando...' : 'Confirmar Abate'}
          </button>
        </div>
      </div>
    </div>
  );
};