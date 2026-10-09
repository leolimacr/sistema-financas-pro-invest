import React from 'react';
import { Calculator, Bot, Copy, TrendingUp, Percent, Wallet, Flame, Target, Home, ShoppingCart } from 'lucide-react';
import { useNavigation } from '../../../../hooks/useNavigation';

interface Props {
  tool: 'debt-calculator' | 'nexus-ai' | 'budget-tool' | 'compound-interest' | 'inflation' | 'dividends' | 'fire' | 'debt-manager' | 'rent-vs-buy' | 'cash-vs-installments' | string;
  title: string;
  content: string;
  buttonLabel: string;
  buttonHref?: string;
  prompt?: string;
}

const toolConfig: Record<string, { icon: React.ReactNode; bg: string; titleColor: string; btnClass: string; defaultTargetTool: string }> = {
  'debt-calculator': {
    icon: <Calculator size={18} className="text-rose-500 dark:text-rose-400 shrink-0" />,
    bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60',
    titleColor: 'text-rose-700 dark:text-rose-300',
    btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
    defaultTargetTool: 'tool-dividas',
  },
  'debt-manager': {
    icon: <Target size={18} className="text-rose-500 dark:text-rose-400 shrink-0" />,
    bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60',
    titleColor: 'text-rose-700 dark:text-rose-300',
    btnClass: 'bg-rose-600 hover:bg-rose-700 text-white',
    defaultTargetTool: 'minhas-dividas',
  },
  'compound-interest': {
    icon: <TrendingUp size={18} className="text-emerald-500 dark:text-emerald-400 shrink-0" />,
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60',
    titleColor: 'text-emerald-700 dark:text-emerald-300',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    defaultTargetTool: 'tool-juros',
  },
  'inflation': {
    icon: <Percent size={18} className="text-violet-500 dark:text-violet-400 shrink-0" />,
    bg: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-900/60',
    titleColor: 'text-violet-700 dark:text-violet-300',
    btnClass: 'bg-violet-600 hover:bg-violet-700 text-white',
    defaultTargetTool: 'tool-inflacao',
  },
  'dividends': {
    icon: <Wallet size={18} className="text-indigo-500 dark:text-indigo-400 shrink-0" />,
    bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60',
    titleColor: 'text-indigo-700 dark:text-indigo-300',
    btnClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    defaultTargetTool: 'tool-dividendos',
  },
  'fire': {
    icon: <Flame size={18} className="text-orange-500 dark:text-orange-400 shrink-0" />,
    bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900/60',
    titleColor: 'text-orange-700 dark:text-orange-300',
    btnClass: 'bg-orange-600 hover:bg-orange-700 text-white',
    defaultTargetTool: 'tool-fire',
  },
  'rent-vs-buy': {
    icon: <Home size={18} className="text-sky-500 dark:text-sky-400 shrink-0" />,
    bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/60',
    titleColor: 'text-sky-700 dark:text-sky-300',
    btnClass: 'bg-sky-600 hover:bg-sky-700 text-white',
    defaultTargetTool: 'tool-alugar',
  },
  'cash-vs-installments': {
    icon: <ShoppingCart size={18} className="text-amber-500 dark:text-amber-400 shrink-0" />,
    bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60',
    titleColor: 'text-amber-700 dark:text-amber-300',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    defaultTargetTool: 'tool-buy-cash-or-installments',
  },
  'nexus-ai': {
    icon: <Bot size={18} className="text-sky-500 dark:text-sky-400 shrink-0" />,
    bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-900/60',
    titleColor: 'text-sky-700 dark:text-sky-300',
    btnClass: 'bg-sky-600 hover:bg-sky-700 text-white',
    defaultTargetTool: 'chat',
  },
  'budget-tool': {
    icon: <Calculator size={18} className="text-teal-500 dark:text-teal-400 shrink-0" />,
    bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-900/60',
    titleColor: 'text-teal-700 dark:text-teal-300',
    btnClass: 'bg-teal-600 hover:bg-teal-700 text-white',
    defaultTargetTool: 'manager',
  },
};

const ToolCTA: React.FC<Props> = ({
  tool,
  title,
  content,
  buttonLabel,
  buttonHref,
  prompt,
}) => {
  
  const { navigateTo } = useNavigation();
  const config = toolConfig[tool];

  // se o tool vindo do bloco for inválido, usa 'debt-calculator' como padrão
  const safeConfig = config ?? toolConfig['debt-calculator'];

  const normalizeTargetTool = (value?: string, fallback?: string) => {
    const raw = value ?? fallback ?? '';
    if (!raw) return raw;
    return raw.startsWith('/') ? raw.slice(1) : raw;
  };

  const targetTool = normalizeTargetTool(buttonHref, safeConfig.defaultTargetTool);
  const copyPrompt = () => {
    if (prompt) navigator.clipboard.writeText(prompt);
  };

  return (
    <div
      className={`mb-5 border rounded-xl p-4 ${safeConfig.bg}`}
    >
      <div className="flex items-start gap-2 mb-2">
        {safeConfig.icon}
        <p className={`text-sm font-semibold ${safeConfig.titleColor}`}>{title}</p>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">{content}</p>
      {prompt && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 mb-3 relative">
          <p className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed pr-6">
            {prompt}
          </p>
          <button
            onClick={copyPrompt}
            title="Copiar prompt"
            className="absolute top-2 right-2 text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <Copy size={14} />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() =>
          navigateTo(targetTool, prompt ? { initialPrompt: prompt } : undefined)
        }
        className={`inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${safeConfig.btnClass}`}
      >
        {buttonLabel}
      </button>
    </div>
  );
};

export default ToolCTA;
