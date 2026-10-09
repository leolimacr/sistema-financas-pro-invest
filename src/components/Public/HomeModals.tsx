import React, { useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';

export const ContentModal = ({ title, icon: Icon, children, onClose }: any) => (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative">
      <div className="absolute top-0 right-0 p-6">
        <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400 transition-colors"><X size={24}/></button>
      </div>
      <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400"><Icon size={32} /></div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{title}</h2>
        </div>
        <div className="text-slate-700 dark:text-slate-300 space-y-6 leading-relaxed">{children}</div>
      </div>
    </div>
  </div>
);
export const AssetModal = ({ asset, onClose }: { asset: { symbol: string; category: string }, onClose: () => void }) => {  	
  console.log('DEBUG AssetModal Received Asset:', asset);
  const [isFull, setIsFull] = useState(false); // ✅ Estado para controlar o tamanho da tela
  
  const normalizeCryptoPair = (raw: string) => {
    const value = raw.toUpperCase().trim();

    const slashMatch = value.match(/^([A-Z0-9]+)\/(BRL|USD|USDT)$/);
    if (slashMatch) {
      return { base: slashMatch[1], quote: slashMatch[2] as 'BRL' | 'USD' | 'USDT' };
    }

    const dashMatch = value.match(/^([A-Z0-9]+)-(BRL|USD|USDT)$/);
    if (dashMatch) {
      return { base: dashMatch[1], quote: dashMatch[2] as 'BRL' | 'USD' | 'USDT' };
    }

    return { base: value.replace('.SA', ''), quote: 'BRL' as const };
  };

  const getTradingViewSymbol = (s: string, cat: string) => {
    const sym = s.toUpperCase().trim();

    // Mapeamento de Índices e Moedas
    if (sym === '^GSPC' || sym === 'GSPC' || sym === 'S&P 500') return 'CAPITALCOM:SPX500';
    if (sym === 'USD' || sym === 'USDBRL') return 'FX_IDC:USDBRL';
    if (sym === 'EUR' || sym === 'EURBRL') return 'FX_IDC:EURBRL';
    if (sym.includes('IBOV') || sym === '^BVSP') return 'BMFBOVESPA:IBOV';

    // Mapeamento explícito de Criptoativos com Prefixos de Exchange
    if (sym.includes('BTC') && sym.includes('BRL')) return 'BINANCE:BTCBRL';
    if (sym.includes('BTC') && (sym.includes('USD') || sym.includes('USDT'))) return 'BITSTAMP:BTCUSD';
    
    if (sym.includes('ETH') && sym.includes('BRL')) return 'BINANCE:ETHBRL';
    if (sym.includes('ETH') && (sym.includes('USD') || sym.includes('USDT'))) return 'BITSTAMP:ETHUSD';
    
    if (sym.includes('BNB') && sym.includes('BRL')) return 'BINANCE:BNBBRL';
    if (sym.includes('SOL') && sym.includes('BRL')) return 'BINANCE:SOLBRL';

    // Fallback B3
    return `BMFBOVESPA:${sym.replace('.SA', '')}`;
  };
  
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      
      {/* Container do Modal com transição suave entre normal e full screen */}
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden relative 
        ${isFull ? 'fixed inset-0 w-full h-full rounded-none z-[10001]' : 'w-full max-w-5xl h-[600px] rounded-2xl'}`}>
        
        {/* Header do Modal */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-surface-primary dark:bg-slate-900">
            <h3 className="text-slate-900 dark:text-white font-bold text-lg flex items-center gap-2">
                <span className="text-emerald-600 dark:text-emerald-400">📊</span> Análise Técnica: {asset.symbol}
            </h3>

            {/* Agrupamento de botões à direita */}
            <div className="flex items-center gap-2">
                {/* Botão de Expandir / Reduzir */}
                <button 
                    onClick={() => setIsFull(!isFull)} 
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-700 dark:text-slate-300 transition border border-slate-300 dark:border-slate-700 group"
                    title={isFull ? "Reduzir Tela" : "Tela Cheia"}
                >
                    {isFull ? (
                        <Minimize2 size={18} className="group-hover:scale-110 transition-transform" />
                    ) : (
                        <Maximize2 size={18} className="group-hover:scale-110 transition-transform" />
                    )}
                </button>

                {/* Botão de Fechar */}
                <button 
                    onClick={onClose} 
                    className="p-2 bg-red-600 hover:bg-red-500 rounded-full text-white transition border border-red-400 group"
                    title="Fechar"
                >
                    <X size={18} className="group-hover:scale-110 transition-transform" />
                </button>
            </div>
        </div>

        {/* Iframe do Gráfico */}
        <div className="flex-1 bg-black relative">
            <iframe 
                key={`${asset.symbol}-${asset.category}`}
                src={`https://s.tradingview.com/widgetembed/?symbol=${getTradingViewSymbol(asset.symbol, asset.category)}&interval=D&hidesidetoolbar=1&theme=dark&style=1&timezone=America%2FSao_Paulo&locale=br&withdateranges=1`}
                className="w-full h-full absolute inset-0 border-0" 
                allowTransparency 
                allowFullScreen
            ></iframe>
        </div>
        </div>
        </div>
        );
        };