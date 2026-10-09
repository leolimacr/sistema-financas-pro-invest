
import React, { useState, useEffect } from 'react';
import { fetchMarketQuotes } from '../services/marketService';
import type { MarketQuote } from '../types';

interface MarketTickerProps {
  onAssetClick?: (asset: MarketQuote) => void;
}

const MarketTicker: React.FC<MarketTickerProps> = ({ onAssetClick }) => {
  const [quotes, setQuotes] = useState<MarketQuote[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const { quotes: data } = await fetchMarketQuotes(false);
    // Filtrar ativos relevantes para a fita
    
    const relevant = data.filter(q => 
        ['USD', 'EUR', 'IBOV', 'BTC/BRL', 'ETH/BRL', 'VALE3', 'PETR4', 'ITUB4'].includes(q.symbol) || 
        q.symbol.includes('/USD')
    );
    
    setQuotes(relevant);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  if (loading && quotes.length === 0) return null;

  // Duplicar itens para efeito infinito suave
  const displayItems = [...quotes, ...quotes, ...quotes];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-primary border-t border-slate-800 h-8 flex items-center overflow-hidden font-mono text-xs select-none">
      <div className="flex animate-ticker whitespace-nowrap hover:pause-animation">
        {displayItems.map((item, index) => {
            const isPositive = item.changePercent >= 0;
            const symbol = item.symbol;
            const price = item.category === 'index' 
                ? item.price.toLocaleString('pt-BR', { maximumFractionDigits: 0 })
                : item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            return (
                <div 
                    key={`${item.symbol}-${index}`} 
                    onClick={() => onAssetClick?.(item)}
                    className="flex items-center gap-2 px-4 border-r border-slate-800/50 cursor-pointer hover:bg-slate-800 transition-colors h-8"
                >
                    <span className="font-bold text-slate-500">{symbol}</span>
                    <span className="text-slate-200">{price}</span>
                    <span className={`flex items-center ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                        {isPositive ? '▲' : '▼'} {Math.abs(item.changePercent).toFixed(2)}%
                    </span>
                </div>
            );
        })}
      </div>
      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-ticker {
          animation: ticker 40s linear infinite;
        }
        .hover\\:pause-animation:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default MarketTicker;