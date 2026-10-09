import React from 'react';
import { Sparkles, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';
import type { DebtCommand } from '../../../services/debt/advisor.types';

interface DebtNexusFeedProps {
  commands: DebtCommand[];
  onAction: (command: DebtCommand) => void;
}

const TYPE_STYLES = {
  urgency: {
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    icon: <AlertTriangle className="text-rose-600" size={18} />,
    title: 'text-rose-950',
    desc: 'text-rose-800/70',
    cta: 'bg-rose-600 hover:bg-rose-700 text-white'
  },
  hygiene: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    icon: <ShieldCheck className="text-emerald-600" size={18} />,
    title: 'text-emerald-950',
    desc: 'text-emerald-800/70',
    cta: 'bg-emerald-600 hover:bg-emerald-700 text-white'
  },
  opportunity: {
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    icon: <Sparkles className="text-sky-600" size={18} />,
    title: 'text-sky-950',
    desc: 'text-sky-800/70',
    cta: 'bg-sky-600 hover:bg-sky-700 text-white'
  }
};

export const DebtNexusFeed: React.FC<DebtNexusFeedProps> = ({ commands, onAction }) => {
  if (commands.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
      {commands.map((cmd) => {
        const style = TYPE_STYLES[cmd.type];
        return (
          <div 
            key={cmd.id} 
            className={`${style.bg} ${style.border} border rounded-[2rem] p-6 shadow-sm flex flex-col justify-between group transition-all hover:shadow-md`}
          >
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-inherit">
                  {style.icon}
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Nexus Command</span>
              </div>
              <h4 className={`text-sm font-black ${style.title} uppercase tracking-tight mb-1`}>{cmd.title}</h4>
              <p className={`text-xs font-medium leading-relaxed ${style.desc}`}>{cmd.description}</p>
            </div>
            
            <button
              onClick={() => onAction(cmd)}
              className={`mt-6 w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 ${style.cta}`}
            >
              {cmd.ctaLabel} <ArrowRight size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
