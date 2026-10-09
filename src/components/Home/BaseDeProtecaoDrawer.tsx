import React, { useState, useEffect } from 'react';
import { X, Shield, HelpCircle } from 'lucide-react';
import { BASE_PROTECAO } from '../../theme/fpiVoiceGuide';

interface BaseDeProtecaoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  colchaoInicialTarget: number;
  colchaoInicialCurrent: number;
  reserveTarget: number;
  reserveCurrent: number;
  protectionMonths: number;
  onSave: (data: {
    colchaoInicialTarget: number;
    colchaoInicialCurrent: number;
    reserveTarget: number;
    reserveCurrent: number;
    protectionMonths: number;
  }) => Promise<void>;
  contextualReason?: string;
}

type HelpField =
  | 'colchaoMeta'
  | 'colchaoSaldo'
  | 'reservaMeta'
  | 'reservaSaldo'
  | null;

const BaseDeProtecaoDrawer: React.FC<BaseDeProtecaoDrawerProps> = ({
  isOpen,
  onClose,
  colchaoInicialTarget: initColchaoTarget,
  colchaoInicialCurrent: initColchaoCurrent,
  reserveTarget: initReserveTarget,
  reserveCurrent: initReserveCurrent,
  protectionMonths: initProtectionMonths,
  onSave,
  contextualReason,
}) => {
  const [colchaoTarget, setColchaoTarget] = useState(initColchaoTarget);
  const [colchaoCurrent, setColchaoCurrent] = useState(initColchaoCurrent);
  const [reserveTarget, setReserveTarget] = useState(initReserveTarget);
  const [reserveCurrent, setReserveCurrent] = useState(initReserveCurrent);
  const [protectionMonths] = useState(initProtectionMonths);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedHelp, setExpandedHelp] = useState<HelpField>(null);

  useEffect(() => {
    if (isOpen) {
      setColchaoTarget(initColchaoTarget);
      setColchaoCurrent(initColchaoCurrent);
      setReserveTarget(initReserveTarget);
      setReserveCurrent(initReserveCurrent);
      setExpandedHelp(null);
    }
  }, [isOpen, initColchaoTarget, initColchaoCurrent, initReserveTarget, initReserveCurrent]);

  const toggleHelp = (field: HelpField) => {
    setExpandedHelp((prev) => (prev === field ? null : field));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        colchaoInicialTarget: colchaoTarget,
        colchaoInicialCurrent: colchaoCurrent,
        reserveTarget,
        reserveCurrent,
        protectionMonths,
      });
      onClose();
    } catch {
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl px-6 pt-[max(1.75rem,calc(env(safe-area-inset-top)+1rem))] pb-6 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Shield size={20} />
            </div>
            <div>
              {contextualReason && (
                <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5 animate-in fade-in duration-300">
                  ↳ {contextualReason}
                </p>
              )}
              <h2 className="text-xl font-black text-slate-950 dark:text-white">{BASE_PROTECAO.drawerTitle}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-8">
          <section className="space-y-4">
            <div className="border-l-4 border-sky-500 pl-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                {BASE_PROTECAO.colchaoBlockTitle}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                {BASE_PROTECAO.colchaoBlockSubtitle}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 ml-1">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {BASE_PROTECAO.colchaoMetaLabel}
                </label>
                <button
                  type="button"
                  onClick={() => toggleHelp('colchaoMeta')}
                  className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                  aria-label="O que é isso?"
                >
                  <HelpCircle size={12} />
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-black text-sm">R$</span>
                <input
                  type="number"
                  value={colchaoTarget || ''}
                  onChange={(e) => setColchaoTarget(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-sky-500 transition-all text-sm font-black outline-none"
                  placeholder={BASE_PROTECAO.colchaoMetaPlaceholder}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-1 font-medium">
                {BASE_PROTECAO.colchaoMetaHelp}
              </p>
              {expandedHelp === 'colchaoMeta' && (
                <div className="ml-1 bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 rounded-xl p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <p className="text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed font-medium">
                    {BASE_PROTECAO.colchaoMetaHelpExpanded}
                  </p>
                </div>
              )}
            </div>

          </section>

          <section className="space-y-4">
            <div className="border-l-4 border-emerald-500 pl-4">
              <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                {BASE_PROTECAO.reservaBlockTitle}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                {BASE_PROTECAO.reservaBlockSubtitle}
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 ml-1">
                <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {BASE_PROTECAO.reservaMetaLabel}
                </label>
                <button
                  type="button"
                  onClick={() => toggleHelp('reservaMeta')}
                  className="text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
                  aria-label="O que é isso?"
                >
                  <HelpCircle size={12} />
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-black text-sm">R$</span>
                <input
                  type="number"
                  value={reserveTarget || ''}
                  onChange={(e) => setReserveTarget(Math.max(0, Number(e.target.value)))}
                  className="w-full pl-12 pr-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-brand-primaryCta transition-all text-sm font-black outline-none"
                  placeholder={BASE_PROTECAO.reservaMetaPlaceholder}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-1 font-medium">
                {BASE_PROTECAO.reservaMetaHelp}
              </p>
              {expandedHelp === 'reservaMeta' && (
                <div className="ml-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed font-medium">
                    {BASE_PROTECAO.reservaMetaHelpExpanded}
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 rounded-2xl p-4">
            <div className="flex items-start gap-2.5">
              <Shield size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                {BASE_PROTECAO.disclaimer}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 mt-8">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? BASE_PROTECAO.saving : BASE_PROTECAO.save}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BaseDeProtecaoDrawer;
