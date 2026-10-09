import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { Lock, Globe, Smartphone, UserPlus, LogIn, Zap } from 'lucide-react';

// === COMPONENTE DE BLOQUEIO WEB-ONLY (MOBILE APP) ===
export const WebOnlyBlock = ({ title, onBack }: any) => {
  const handleOpenBrowser = async () => {
    await Browser.open({ url: 'https://www.financasproinvest.com.br' });
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-8 animate-in fade-in zoom-in-95">
      <div className="w-24 h-24 bg-sky-50 dark:bg-sky-950/30 rounded-[2rem] flex items-center justify-center mx-auto text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 shadow-[0_20px_60px_rgba(14,165,233,0.15)] relative">
        <Smartphone size={48} className="opacity-20 absolute" />
        <Lock size={32} className="relative z-10" />
      </div>

      <div className="space-y-3">
        <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{title}</h2>
        <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-200 dark:border-emerald-800 inline-block">
          Disponível na Versão Web
        </div>
      </div>

      <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-sm mx-auto">
        Para garantir a melhor precisão nos gráficos e uma experiência analítica completa, esta ferramenta é exclusiva para acesso via desktop ou navegador.
      </p>

      <div className="pt-6 flex flex-col gap-4">
        <button
          onClick={handleOpenBrowser}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95"
        >
          <Globe size={18} /> Acessar Versão Completa no Site
        </button>
        <button
          onClick={() => onBack('home')}
          className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          Voltar ao Gerenciador
        </button>
      </div>
    </div>
  );
};

// === COMPONENTE DE BLOQUEIO DE LOGIN (GATE) ===
export const ToolGate = ({ title, description, onNavigate }: any) => (
  <div className="max-w-4xl mx-auto px-6 py-20 text-center animate-in fade-in slide-in-from-bottom-8">
    <button
      onClick={() => onNavigate('home')}
      className="mb-12 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-bold text-xs uppercase tracking-widest transition-colors"
    >
      ← Voltar
    </button>

    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 md:p-16 rounded-[3rem] shadow-[0_30px_80px_rgba(15,23,42,0.10)] relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent opacity-70"></div>
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-100 blur-[80px] rounded-full pointer-events-none"></div>

      <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-8 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-200 dark:border-slate-700">
        <Lock size={32} />
      </div>

      <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-6">{title}</h2>
      <p className="text-slate-600 dark:text-slate-300 text-lg max-w-xl mx-auto leading-relaxed mb-10">{description}</p>

      <div className="flex flex-col md:flex-row justify-center gap-4 max-w-md mx-auto">
        <button
          onClick={() => onNavigate('register')}
          className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <UserPlus size={18} /> Criar Conta Grátis
        </button>
        <button
          onClick={() => onNavigate('login')}
          className="flex-1 py-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl font-black text-sm uppercase tracking-widest border border-slate-200 dark:border-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <LogIn size={18} /> Já tenho conta
        </button>
      </div>

      <p className="mt-8 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        Acesso liberado em menos de 1 minuto
      </p>
    </div>
  </div>
);

// === LAYOUT PADRÃO PARA FERRAMENTAS ===
export const ToolLayout = ({ title, icon, onBack, children, description, badge }: any) => {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) return <WebOnlyBlock title={title} onBack={onBack} />;

  return (
    <div className="max-w-6xl mx-auto px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <button
        onClick={() => { onBack('home'); setTimeout(() => { document.getElementById('secao-ferramentas')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); }}
        className="mt-6 mb-8 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-400 transition-all font-black uppercase text-[10px] tracking-[0.2em]"
      >
        ← Voltar
      </button>

      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-12 rounded-[3rem] shadow-[0_30px_80px_rgba(15,23,42,0.10)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-100/70 dark:bg-sky-950/20 blur-[120px] -z-10"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-100/50 dark:bg-orange-950/20 blur-[120px] -z-10"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-4xl shadow-sm border border-slate-200 dark:border-slate-700">
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{title}</h1>
                {badge && (
                  <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest border border-emerald-200 dark:border-emerald-800">
                    {badge}
                  </span>
                )}
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-sm font-medium mt-1">{description}</p>
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
};
const formatMoneyInputValue = (value: number | '') => {
  if (value === '' || value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }

  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const parseMoneyDigitsToNumber = (raw: string) => {
  const digits = raw.replace(/\D/g, '');

  if (!digits) return '';

  return Number(digits) / 100;
};

// === COMPONENTE DE INPUT REUTILIZÁVEL ===
export const Input = ({ label, value, onChange, prefix, placeholder, help }: any) => {
  const isMoneyInput = prefix === 'R$';
  const helpRef = useRef<HTMLDivElement | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setIsHelpOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = useMemo(() => {
    if (isMoneyInput) {
      return formatMoneyInputValue(value);
    }

    return value;
  }, [isMoneyInput, value]);

  return (
    <div className="space-y-3 flex-1">
      <div className="flex items-center gap-2 ml-1">
        <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em]">
          {label}
        </label>

        {help && (
          <div ref={helpRef} className="relative">
            <button
              type="button"
              onClick={() => setIsHelpOpen((prev: boolean) => !prev)}
              className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 text-[10px] font-black text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-sky-700 dark:hover:text-sky-400 hover:border-sky-300 dark:hover:border-sky-500 transition-all flex items-center justify-center"
              aria-label={`Ajuda sobre ${label}`}
            >
              ?
            </button>

            {isHelpOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-white dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 rounded-xl z-50 border border-slate-200 dark:border-slate-700 shadow-xl leading-relaxed">
                {help}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative group">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 font-bold group-focus-within:text-sky-600 dark:group-focus-within:text-sky-400 transition-colors">
            {prefix}
          </span>
        )}

        {isMoneyInput ? (
          <input
            type="text"
            inputMode="numeric"
            value={displayValue}
            placeholder={placeholder}
            onChange={(e) => onChange(parseMoneyDigitsToNumber(e.target.value))}
            className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-slate-900 dark:text-white font-black text-lg focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950 outline-none transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400 ${prefix ? 'pl-12' : ''}`}
          />
        ) : (
          <input
            type="number"
            inputMode="decimal"
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
            className={`w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-slate-900 dark:text-white font-black text-lg focus:border-sky-400 dark:focus:border-sky-500 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950 outline-none transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400 ${prefix ? 'pl-12' : ''}`}
          />
        )}
      </div>
    </div>
  );
};

// === COMPONENTE DE FERRAMENTA EM CONSTRUÇÃO (PLACEHOLDER) ===
export const PlaceholderTool = ({ title, icon, onBack, description, badge }: any) => (
  <ToolLayout title={title} icon={icon} onBack={onBack} description={description} badge={badge || "Em Breve"}>
    <div className="py-32 flex flex-col items-center justify-center text-center space-y-6">
      <div className="p-6 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse border border-slate-200 dark:border-slate-700">
        <Zap size={48} className="text-slate-500 dark:text-slate-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Engenharia em progresso</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">
          Estamos calibrando os algoritmos para esta ferramenta.
        </p>
      </div>
    </div>
  </ToolLayout>
);
