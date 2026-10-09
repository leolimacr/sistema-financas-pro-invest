import React from 'react';
import { getDisplayPrice } from '../../utils/marketFormatters';

export const MarketItemRow = ({ item, onClick }: any) => {
    const isIndicator = item.type === 'indicator';
    
    // Verifica se o preço é um número válido ou se os dados já chegaram
    const isNumericPrice = item.price !== null && item.price !== undefined && !isNaN(parseFloat(item.price));
    const hasData = isNumericPrice && item.price !== 0;

    const priceColor = isIndicator ? 'text-slate-900 dark:text-white' : (item.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400');
    const changeColor = item.up ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500';

    const changeVal = parseFloat(item.change);
    const displayChange = !isNaN(changeVal) ? changeVal.toFixed(2) : "0.00";

    return (
        <div 
            onClick={!isIndicator ? onClick : undefined} 
            className={`flex items-center justify-between w-full p-3 bg-white dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700/50 rounded-lg transition-colors mb-1 ${!isIndicator ? 'hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer' : 'cursor-default'}`}
        >
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{item.symbol}</span>
            <div className="flex flex-col items-end leading-none">
                {hasData ? (
                    <>
                        <span className={`text-[13px] font-black ${priceColor}`}>
                            {getDisplayPrice(item.type, item.symbol, item.price)}
                        </span>
                        {!isIndicator && item.change !== undefined && (
                            <span className={`text-xs font-bold ${changeColor}`}>
                                {changeVal >= 0 ? '+' : ''}{displayChange}%
                            </span>
                        )}
                    </>
                ) : (
                    <span className="text-[10px] font-black text-sky-400 uppercase animate-pulse">
                        Buscando Preço...
                    </span>
                )}
            </div>
        </div>
    );
};

export const MarketGroup = ({ title, items, onClickItem }: any) => (
    <div className="mb-4">
        <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-200 dark:border-slate-800 pb-1">{title}</p>
        <div className="flex flex-col gap-1">
            {items && items.map((item: any, i: number) => (
                <MarketItemRow key={i} item={item} onClick={() => onClickItem(item.symbol)} />
            ))}
        </div>
    </div>
);

export const InfiniteTicker = ({ data }: any) => {
    const all = [ ...data.indicators, ...data.indices, ...data.currencies, ...data.stocks, ...data.cryptos ].filter(i => i.price);
    return (
        <div className="w-full bg-[#dbeafe] dark:bg-slate-900 border-b border-blue-200 dark:border-slate-800 h-8 flex items-center overflow-hidden z-40 fixed top-16 left-0">
            <div className="animate-marquee flex whitespace-nowrap items-center">
                {[...all, ...all].map((item, i) => {
                    const cVal = parseFloat(item.change);
                    const displayChange = !isNaN(cVal) ? cVal.toFixed(2) : "0.00";
                    return (
                        <div key={i} className="flex items-center gap-3 mx-8 text-[15px] font-mono font-bold">
                            <span className="text-slate-700 dark:text-slate-300">{item.symbol}</span>
                            <span className={item.up ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>{getDisplayPrice(item.type, item.symbol, item.price)}</span>
                            {item.type !== 'indicator' && (
                                <span className={`text-[13px] ${item.up ? 'text-emerald-800 dark:text-emerald-400' : 'text-red-800 dark:text-red-400'} flex items-center`}>
                                    {item.up ? '▲' : '▼'} {displayChange}%
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <style>{` @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } } .animate-marquee { animation: marquee 80s linear infinite; } `}</style>
        </div>
    );
};

export const ToolHubItem = ({ icon, name, route, onNavigate, onStartNow, isAuth }: any) => {
  const handleClick = () => {
    // Detecta se é um dispositivo móvel
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (route === 'manager' && isMobile) {
      const appUrl = 'financaspro://manager';
      const fallbackUrl = 'https://play.google.com/store/apps/details?id=com.financasproinvest.app';
      
      window.location.href = appUrl;
      
      setTimeout(() => {
        window.location.href = fallbackUrl;
      }, 500);
    } else {
      if (route === 'manager' && !isAuth) {
        onStartNow();
      } else {
        onNavigate(route);
      }
    }
  };

  return (
    <button onClick={handleClick} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 p-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 active:scale-95 group shadow-lg min-h-[160px] w-full transition-all">
      <span className="text-4xl group-hover:scale-110 transition-transform mb-2">{icon}</span>
      <span className="text-slate-900 dark:text-white font-black text-[11px] uppercase tracking-[0.1em] leading-tight text-center px-2">{name}</span>
    </button>
  );
};