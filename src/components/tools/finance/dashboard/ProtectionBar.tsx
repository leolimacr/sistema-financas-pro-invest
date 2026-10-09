import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { firestore } from '../../../../firebase';
import { Pencil, X, Check } from 'lucide-react';
import type { UserMeta, FinancialProfile, Transaction } from '../../../../types';
import { maskCurrency } from '../../../../utils/calculations';
import { useExclusions } from '../../../../contexts/ExclusionsContext';

interface ProtectionBarProps {
  saldoRealTotal: number;
  colchaoTarget: number;
  reserveTarget: number;
  isPrivacyMode: boolean;
  userId?: string;
  userMeta?: UserMeta | null;
  onOpenForm?: (initialData?: Partial<Transaction>) => void;
  /** Pre-computed effective balance (after exclusions). When provided,
   *  the component skips its own exclusion calculation to avoid double-counting. */
  effectiveBalanceOverride?: number;
}

const ProtectionBar: React.FC<ProtectionBarProps> = ({
  saldoRealTotal,
  colchaoTarget,
  reserveTarget,
  isPrivacyMode,
  userId,
  userMeta,
  effectiveBalanceOverride,
}) => {
  const { excluirReserva, excluirColchao, toggleReserva, toggleColchao } = useExclusions();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleStartEdit = (field: string, currentValue: number) => {
    setEditingField(field);
    setEditValue(String(currentValue));
  };

  const handleSave = async (field: string) => {
    if (!userId) return;
    setSaving(true);
    try {
      const numValue = parseFloat(editValue.replace(/\./g, '').replace(',', '.')) || 0;
      const existingProfile = (userMeta?.financialProfile || {}) as FinancialProfile;
      const profileUpdate: FinancialProfile = { ...existingProfile };
      if (field === 'colchaoTarget') profileUpdate.colchaoInicialTarget = numValue;
      else if (field === 'reserveTarget') profileUpdate.emergencyReserveTarget = numValue;
      const userDocRef = doc(firestore, 'users', userId);
      await setDoc(userDocRef, { financialProfile: profileUpdate }, { merge: true });
      setEditingField(null);
    } catch (err) {
      console.error('Erro ao salvar:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingField(null);
  };

  const totalTarget = reserveTarget + colchaoTarget;
  const remainingTarget = (excluirReserva ? 0 : reserveTarget) + (excluirColchao ? 0 : colchaoTarget);
  const effectiveBalance = effectiveBalanceOverride != null
    ? Math.max(0, effectiveBalanceOverride)
    : Math.max(0, saldoRealTotal
        - (excluirReserva ? reserveTarget : 0)
        - (excluirColchao ? colchaoTarget : 0));

  const coveredAmount = Math.min(effectiveBalance, remainingTarget);
  const surplusAmount = effectiveBalance - coveredAmount;

  const barDenominator = Math.max(totalTarget, effectiveBalance, 1);
  const reservePct = totalTarget > 0 ? (reserveTarget / barDenominator) * 100 : 0;
  const colchaoPct = totalTarget > 0 ? (colchaoTarget / barDenominator) * 100 : 0;
  const colchaoEnd = reservePct + colchaoPct;

  const coveragePct = totalTarget > 0 ? (coveredAmount / barDenominator) * 100 : 0;
  const surplusPct = totalTarget > 0 ? (surplusAmount / barDenominator) * 100 : 0;
  const coverageStartPct = excluirReserva ? reservePct : 0;

  const hasTargets = totalTarget > 0;

  const renderEditableValue = (field: string, label: string, value: number) => {
    const isEditing = editingField === field;
    return (
      <div className="flex items-center justify-between group">
        <span className="text-[10px] font-bold text-text-muted dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                inputMode="decimal"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-24 text-right text-xs font-black bg-white dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 rounded-xl px-2 py-1 tabular-nums outline-none focus:ring-2 focus:ring-brand-primary/30 dark:text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave(field);
                  if (e.key === 'Escape') handleCancel();
                }}
              />
              <button
                onClick={() => handleSave(field)}
                disabled={saving}
                aria-label="Salvar meta"
                className="p-1 rounded-lg text-action-primaryDark hover:bg-brand-primary/10 transition-colors"
              >
                <Check size={14} />
              </button>
              <button
                onClick={handleCancel}
                aria-label="Cancelar edição"
                className="p-1 rounded-lg text-text-muted dark:text-slate-400 hover:bg-surface-secondary dark:hover:bg-slate-800 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <span className="text-xs font-black tabular-nums text-text-primary dark:text-white">
                {isPrivacyMode ? '••••' : maskCurrency(value)}
              </span>
              <button
                onClick={() => handleStartEdit(field, value)}
                aria-label={`Editar ${label}`}
                className="p-1 rounded-lg text-text-muted dark:text-slate-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 hover:bg-surface-secondary dark:hover:bg-slate-800 transition-all"
              >
                <Pencil size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-surface-primary dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-section p-5 border-l-4 border-l-brand-technical/40 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black text-text-primary dark:text-white uppercase tracking-ultra-wide">
          Proteção Financeira
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-text-muted dark:text-slate-400">
            {isPrivacyMode ? '••••' : maskCurrency(effectiveBalance)} disponível
          </span>
          {hasTargets && (
            <>
              <button
                onClick={toggleReserva}
                className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold border transition-all ${
                  excluirReserva
                    ? 'bg-violet-100 dark:bg-violet-950/60 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                    : 'border-transparent text-text-muted dark:text-slate-400 hover:bg-surface-secondary dark:hover:bg-slate-800'
                }`}
              >
                – Reserva
              </button>
              <button
                onClick={toggleColchao}
                className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold border transition-all ${
                  excluirColchao
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                    : 'border-transparent text-text-muted dark:text-slate-400 hover:bg-surface-secondary dark:hover:bg-slate-800'
                }`}
              >
                – Colchão
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {hasTargets && (
          <div className="relative w-full h-8">
            <div
              className="absolute inset-y-0 text-center flex flex-col items-center justify-center"
              style={{ left: '0', width: `${reservePct}%` }}
            >
              <div className="text-[10px] font-bold text-violet-700 dark:text-violet-400 leading-tight">Meta Reserva</div>
              <div className="text-[10px] font-bold text-violet-700 dark:text-violet-400 leading-tight">
                {isPrivacyMode ? '••••' : maskCurrency(reserveTarget)}
              </div>
            </div>
            <div
              className="absolute inset-y-0 text-center flex flex-col items-center justify-center"
              style={{ left: `${reservePct}%`, width: `${colchaoPct}%` }}
            >
              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 leading-tight">Meta Colchão</div>
              <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
                {isPrivacyMode ? '••••' : maskCurrency(colchaoTarget)}
              </div>
            </div>
            {surplusPct > 0 && (
              <div
                className="absolute inset-y-0 text-center flex flex-col items-center justify-center"
                style={{ left: `${100 - surplusPct}%`, width: `${surplusPct}%` }}
              >
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-tight">Saldo Excedente</div>
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-tight">
                  {isPrivacyMode ? '••••' : maskCurrency(surplusAmount)}
                </div>
              </div>
            )}
          </div>
        )}
        <div className="relative w-full">
          {/* Bar track */}
          <div className="relative h-5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
            {hasTargets && (
              <>
                <div
                  className="absolute inset-y-0 left-0 bg-violet-300 dark:bg-violet-600/70"
                  style={{ width: `${reservePct}%` }}
                />
                <div
                  className="absolute inset-y-0 bg-emerald-300 dark:bg-emerald-600/70"
                  style={{ left: `${reservePct}%`, width: `${colchaoPct}%` }}
                />
              </>
            )}
            {effectiveBalance > 0 && coveragePct > 0 && (
              <div
                className="absolute inset-y-0 border-2 border-dashed border-amber-500 bg-transparent"
                style={{ left: `${coverageStartPct}%`, width: `${coveragePct}%` }}
              />
            )}
            {surplusPct > 0 && (
              <div
                className="absolute inset-y-0 right-0 bg-amber-100 dark:bg-amber-950/50 border-2 border-dashed border-amber-500 dark:border-amber-400"
                style={{ width: `${surplusPct}%` }}
              />
            )}
            {!hasTargets && (
              <div className="absolute inset-y-0 left-0 w-full bg-slate-200 dark:bg-slate-800 rounded-full" />
            )}

          </div>
        </div>

        {effectiveBalance > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-medium text-text-muted dark:text-slate-400">
            {hasTargets && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-violet-600" />
                  Meta Reserva
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  Meta Colchão
                </span>
              </>
            )}
            {hasTargets && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                Saldo atual
              </span>
            )}
            {surplusAmount > 0 && (
              <>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-300 border border-amber-600" />
                  Excedente
                </span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">
                  +{maskCurrency(surplusAmount)} acima das metas
                </span>
              </>
            )}
            {coveragePct > 0 && coveragePct < 100 && surplusPct === 0 && (
              <span className="text-amber-700 dark:text-amber-400">
                {(coveredAmount / remainingTarget * 100).toFixed(0)}% das metas
              </span>
            )}
          </div>
        )}

        {effectiveBalance <= 0 && (
          <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400">
            Saldo no período abaixo da meta de proteção. Acompanhe as despesas e a evolução da folga para decidir como recompor essa margem.
          </p>
        )}
      </div>

      <div className="border-t border-surface-elevated dark:border-slate-800 pt-3 space-y-2">
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            {renderEditableValue('reserveTarget', 'Meta da Reserva de Emergência', reserveTarget)}
          </div>
          <div className="flex-1 min-w-0">
            {renderEditableValue('colchaoTarget', 'Meta do Colchão Emergencial', colchaoTarget)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProtectionBar;
