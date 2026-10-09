import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.financasproinvest.mobile';

interface AppOnlyBlockProps {
  isMobileBrowser: boolean;
  hasBottomNav?: boolean;
}

const AppOnlyBlock: React.FC<AppOnlyBlockProps> = ({ isMobileBrowser, hasBottomNav = false }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isMobileBrowser) return;
    
    const dismissed = localStorage.getItem('mobile-banner-dismissed');
    if (!dismissed) {
      setIsVisible(true);
    }
  }, [isMobileBrowser]);

  const handleDismiss = () => {
    localStorage.setItem('mobile-banner-dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible || !isMobileBrowser) return null;

  return (
    <div className={`fixed ${hasBottomNav ? 'bottom-[5.5rem]' : 'bottom-20'} md:bottom-6 left-4 right-4 z-[60] animate-in slide-in-from-bottom-full duration-500 lg:hidden`}>
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
            <Smartphone size={20} />
          </div>
          <div className="flex flex-col">
            <p className="text-white text-xs font-bold leading-tight">Experiência Completa</p>
            <p className="text-slate-500 text-[10px] leading-tight">Baixe nosso app gratuito</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <Download size={14} />
            INSTALAR
          </a>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppOnlyBlock;
