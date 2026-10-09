import React from 'react';

// ---- ToolCard ----
interface ToolCardProps {
  icon: React.ElementType;
  title: string;
  desc: string;
  route: string;
  onNavigate: (route: string) => void;
  bgColor?: string;
  highlight?: boolean;
}

export const ToolCard: React.FC<ToolCardProps> = ({
  icon: Icon, title, desc, route, onNavigate, bgColor = 'blue', highlight = false,
}) => {
  const colorMap: Record<string, any> = {
    amber:   { card: 'bg-amber-100 dark:bg-amber-950/40',   cardHover: 'hover:bg-amber-200 dark:hover:bg-amber-900/50',   border: 'border-amber-300 dark:border-amber-800',   borderHover: 'hover:border-amber-400 dark:hover:border-amber-700',   iconBg: 'bg-amber-300 dark:bg-amber-800',   iconHoverBg: 'group-hover:bg-amber-400 dark:group-hover:bg-amber-700',   iconColor: 'text-amber-800 dark:text-amber-200' },
    emerald: { card: 'bg-emerald-100 dark:bg-emerald-950/40', cardHover: 'hover:bg-emerald-200 dark:hover:bg-emerald-900/50', border: 'border-emerald-300 dark:border-emerald-800', borderHover: 'hover:border-emerald-400 dark:hover:border-emerald-700', iconBg: 'bg-emerald-300 dark:bg-emerald-800', iconHoverBg: 'group-hover:bg-emerald-400 dark:group-hover:bg-emerald-700', iconColor: 'text-emerald-800 dark:text-emerald-200' },
    sky:     { card: 'bg-sky-100 dark:bg-sky-950/40',     cardHover: 'hover:bg-sky-200 dark:hover:bg-sky-900/50',     border: 'border-sky-300 dark:border-sky-800',     borderHover: 'hover:border-sky-400 dark:hover:border-sky-700',     iconBg: 'bg-sky-300 dark:bg-sky-800',     iconHoverBg: 'group-hover:bg-sky-400 dark:group-hover:bg-sky-700',     iconColor: 'text-sky-800 dark:text-sky-200' },
    purple:  { card: 'bg-purple-100 dark:bg-purple-950/40',  cardHover: 'hover:bg-purple-200 dark:hover:bg-purple-900/50',  border: 'border-purple-300 dark:border-purple-800',  borderHover: 'hover:border-purple-400 dark:hover:border-purple-700',  iconBg: 'bg-purple-300 dark:bg-purple-800',  iconHoverBg: 'group-hover:bg-purple-400 dark:group-hover:bg-purple-700',  iconColor: 'text-purple-800 dark:text-purple-200' },
    default: { card: 'bg-slate-100 dark:bg-slate-900',   cardHover: 'hover:bg-slate-200 dark:hover:bg-slate-800',   border: 'border-slate-300 dark:border-slate-700',   borderHover: 'hover:border-slate-400 dark:hover:border-slate-600',   iconBg: 'bg-slate-300 dark:bg-slate-800',   iconHoverBg: 'group-hover:bg-slate-400 dark:group-hover:bg-slate-700',   iconColor: 'text-slate-800 dark:text-slate-200' },
  };
  const s = colorMap[bgColor] || colorMap.default;

  return (
    <div
      onClick={() => onNavigate(route)}
      className={`relative ${s.card} ${s.cardHover} border ${s.border} ${s.borderHover} rounded-2xl p-6 transition-all duration-300 cursor-pointer group flex flex-col justify-between h-40 shadow-lg hover:shadow-xl hover:-translate-y-1 overflow-hidden ${highlight ? 'ring-2 ring-amber-300 shadow-[0_10px_30px_-12px_rgba(251,191,36,0.45)]' : ''}`}
    >
      {highlight && (
        <div className="absolute top-3 right-3 z-20">
          <span className="inline-flex items-center rounded-full bg-white/90 border border-amber-300 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-700">Recomendado</span>
        </div>
      )}
      <div className="relative z-10">
        <div className={`p-2 ${s.iconBg} ${s.iconHoverBg} rounded-lg w-fit border ${s.border} transition-colors`}>
          <Icon size={20} className={`${s.iconColor} group-hover:scale-110 transition-transform`} />
        </div>
      </div>
      <div className="relative z-10 mt-auto">
        <h4 className="text-gray-800 dark:text-white font-bold text-base truncate drop-shadow-sm">{title}</h4>
        <p className="text-gray-600 dark:text-slate-300 text-xs font-medium uppercase tracking-wide truncate drop-shadow-sm">{desc}</p>
      </div>
    </div>
  );
};

// ---- MarketPanel ----
interface MarketPanelProps {
  title: string;
  items: any[];
  onItemClick: (symbol: string, category: string) => void;
}

export const MarketPanel: React.FC<MarketPanelProps> = ({ title, items, onItemClick }) => {
  const accentMap: Record<string, string> = { 'Câmbio': 'bg-emerald-500', 'Cripto': 'bg-purple-500', 'B3': 'bg-amber-500' };
  const accentColor = Object.entries(accentMap).find(([k]) => title.includes(k))?.[1] || 'bg-sky-500';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col h-[300px] relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-sm">
      <div className={`absolute top-0 left-0 w-full h-1 ${accentColor} opacity-70 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
      <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-3 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${accentColor} animate-pulse`} />
        {title}
      </h3>
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 pb-2">
        {items.map((item: any, idx: number) => (
          <div
            key={idx}
            onClick={() => onItemClick(item.symbol, item.type)}
            className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer transition-all duration-300 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-px hover:shadow-sm group/item"
          >
            <div>
              <span className="font-black text-slate-900 dark:text-white text-xs block group-hover/item:text-slate-700 dark:group-hover/item:text-slate-200 transition-colors">{item.symbol}</span>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase">{item.type}</span>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="block text-xs font-bold text-slate-900 dark:text-white tracking-wide">
                {item.type === 'currency' || item.type === 'crypto' ? 'R$ ' : ''}
                {typeof item.price === 'number' ? item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item.price}
              </span>
              {item.change !== undefined && (
                <span className={`mt-1 text-xs font-black px-2 py-1 rounded flex items-center gap-1 shadow-sm ${item.up ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'}`}>
                  {item.up ? '▲' : '▼'} {item.up ? '+' : ''}{item.change?.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};