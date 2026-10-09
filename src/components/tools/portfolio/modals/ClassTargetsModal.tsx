import React, { useState } from 'react';
import { X, Check, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { PortfolioAssetClass } from '../../../../core/portfolio/portfolioTypes';

interface ClassTargetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classes: PortfolioAssetClass[]) => Promise<void>;
  initialClasses: PortfolioAssetClass[];
}

export const ClassTargetsModal: React.FC<ClassTargetsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialClasses,
}) => {
  const [classes, setClasses] = useState<PortfolioAssetClass[]>(initialClasses);
  const [newClassName, setNewClassName] = useState('');
  const [newClassTarget, setNewClassTarget] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalPercentage = classes.reduce((sum, c) => sum + (c.targetPercentage || 0), 0);
  const is100Percent = Math.abs(totalPercentage - 100) < 0.01;

  const handleTargetChange = (id: string, value: number) => {
    setClasses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, targetPercentage: Math.max(0, Math.min(100, value)) } : c))
    );
  };

  const handleAddClass = () => {
    const trimmed = newClassName.trim();
    if (!trimmed) return;
    if (classes.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg('Já existe uma classe de ativo com este nome.');
      return;
    }

    const target = newClassTarget === '' ? 0 : Number(newClassTarget);
    const newClass: PortfolioAssetClass = {
      id: `class_${Date.now()}`,
      name: trimmed,
      targetPercentage: target,
      color: '#475569',
    };

    setClasses((prev) => [...prev, newClass]);
    setNewClassName('');
    setNewClassTarget('');
    setErrorMsg(null);
  };

  const handleRemoveClass = (id: string) => {
    if (classes.length <= 1) {
      setErrorMsg('A carteira deve conter pelo menos uma classe de ativos.');
      return;
    }
    setClasses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onSave(classes);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao salvar metas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Metas de Alocação por Classe</h3>
            <p className="text-xs text-slate-300 dark:text-slate-400">Defina o percentual alvo ideal para cada categoria</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Banner de Soma das Metas */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between ${
              is100Percent
                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {is100Percent ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold block">
                  {is100Percent
                    ? 'Distribuição Ideal Concluída (100%)'
                    : `Soma Atual: ${totalPercentage.toFixed(1)}%`}
                </span>
                <span className="text-[11px] opacity-80 block">
                  {is100Percent
                    ? 'A soma de todas as classes fecha exatamente em 100%.'
                    : `Diferença de ${(100 - totalPercentage).toFixed(1)}% para fechar em 100%.`}
                </span>
              </div>
            </div>
            <span className="text-base font-black tracking-tight">{totalPercentage.toFixed(1)}%</span>
          </div>

          {/* Lista de Classes Existentes */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
              Classes Cadastradas
            </label>
            <div className="space-y-2">
              {classes.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: c.color || '#475569' }}
                    />
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{c.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative w-24">
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        max="100"
                        value={c.targetPercentage}
                        onChange={(e) => handleTargetChange(c.id, Number(e.target.value))}
                        className="w-full pl-3 pr-6 py-1.5 text-right text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                      />
                      <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 dark:text-slate-500 font-bold">
                        %
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveClass(c.id)}
                      className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                      title="Excluir classe"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Adicionar Nova Classe */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2">
              Adicionar Nova Classe
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ex: Criptomoedas, Commodities..."
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
              <div className="relative w-24">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  placeholder="Meta %"
                  value={newClassTarget}
                  onChange={(e) => setNewClassTarget(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full pl-3 pr-6 py-2 text-right text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
                <span className="absolute right-2.5 top-2.5 text-xs text-slate-400 dark:text-slate-500 font-bold">%</span>
              </div>
              <button
                type="button"
                onClick={handleAddClass}
                className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl font-bold transition-colors"
                title="Adicionar classe"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl shadow transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Salvando...' : 'Salvar Metas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
