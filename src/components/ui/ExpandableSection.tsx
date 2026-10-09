import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface ExpandableSectionProps {
  label: string;
  value: string | React.ReactNode;
  helpText: string;
  children: React.ReactNode;
  onToggle?: (open: boolean) => void;
  /** Se true, outros accordeons fecham quando este abre. Use controlled=expanded para gerenciar externamente. */
  expanded?: boolean;
  setExpanded?: (v: boolean) => void;
  valueClassName?: string;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  label,
  value,
  helpText,
  children,
  expanded: controlledExpanded,
  setExpanded: controlledSetExpanded,
  valueClassName,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledExpanded !== undefined ? controlledExpanded : internalOpen;
  const toggle = () => {
    const next = !isOpen;
    if (controlledSetExpanded) {
      controlledSetExpanded(next);
    } else {
      setInternalOpen(next);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {label}
        </span>
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-600 transition-colors py-1 px-1 min-h-[44px]"
          aria-expanded={isOpen}
        >
          <span>{isOpen ? 'Recolher' : 'Ver composição'}</span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <p className={`font-black tracking-tight ${valueClassName || 'text-base md:text-lg text-slate-900'}`}>
        {value}
      </p>

      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
        {helpText}
      </p>

      {isOpen && (
        <div className="mt-2 rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

export default ExpandableSection;
