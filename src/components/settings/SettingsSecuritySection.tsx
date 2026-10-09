import React from 'react';
import {
  ShieldCheck, ChevronRight, Smartphone, House,
  LayoutGrid, Crown, Loader2, FileText, Lock, X,
  Sun, Moon, Laptop
} from 'lucide-react';
import type { useSecuritySettings } from '../../hooks/useSecuritySettings';
import { useTheme } from '../../contexts/ThemeContext';
import Toggle from './Toggle';

interface SettingsSecuritySectionProps {
  security: ReturnType<typeof useSecuritySettings>;
  isNative: boolean;
  isPremium: boolean;
  onNavigate: (path: string) => void;
  onNavigatePricing: () => void;
}

export const SettingsSecuritySection: React.FC<SettingsSecuritySectionProps> = ({
  security,
  isNative,
  isPremium,
  onNavigate,
  onNavigatePricing,
}) => {
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Aparência do Aplicativo (Tema Claro, Escuro, Sistema) */}
      <div className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              {theme === 'dark' ? <Moon size={18} className="text-amber-400" /> : theme === 'light' ? <Sun size={18} className="text-amber-500" /> : <Laptop size={18} className="text-sky-500" />}
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                Aparência do Aplicativo
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Escolha o tema visual do Finanças Pro Invest neste dispositivo.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs transition-all active:scale-95 ${
                theme === 'light'
                  ? 'bg-white text-slate-950 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Sun size={16} className={theme === 'light' ? 'text-amber-500' : ''} />
              <span>Claro</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs transition-all active:scale-95 ${
                theme === 'dark'
                  ? 'bg-slate-900 text-white shadow-sm border border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Moon size={16} className={theme === 'dark' ? 'text-amber-400' : ''} />
              <span>Escuro</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-black text-xs transition-all active:scale-95 ${
                theme === 'system'
                  ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-sm border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Laptop size={16} className={theme === 'system' ? 'text-sky-500' : ''} />
              <span>Sistema</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 text-center">
            {theme === 'system'
              ? 'Acompanha automaticamente as configurações de tema claro ou escuro do seu sistema operacional.'
              : theme === 'dark'
              ? 'Tema escuro fixado neste dispositivo, reduzindo a fadiga visual.'
              : 'Tema claro clássico fixado neste dispositivo com máximo contraste de luz.'}
          </p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 bg-white dark:bg-slate-900">
          <ShieldCheck size={20} className="text-emerald-500" />
          <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            Preferências
          </h4>
        </div>
        {isNative ? (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <button
              onClick={() => security.setActiveModal('pin')}
              className="w-full p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex justify-between items-center group"
            >
              <div>
                <span className="text-sm font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {security.hasPin ? 'Código de Proteção (PIN)' : 'Criar Código PIN'}
                </span>
                {!security.hasPin && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-tighter">
                    Recomendado para proteção de dados
                  </span>
                )}
              </div>
              <ChevronRight size={18} className="text-slate-400 dark:text-slate-500" />
            </button>
            <div className="p-6 flex justify-between items-center">
              <div>
                <p className="text-slate-900 dark:text-white font-bold text-sm">Sempre pedir PIN</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Exigir código ao abrir o app</p>
              </div>
              <Toggle active={security.alwaysAsk} onClick={security.handleToggleAlwaysAsk} />
            </div>
            <div className="p-6 flex justify-between items-center">
              <div>
                <p className="text-slate-900 dark:text-white font-bold text-sm">Biometria</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Usar FaceID ou Digital</p>
              </div>
              <Toggle active={security.useBiometrics} onClick={security.handleToggleBiometrics} />
            </div>
          </div>
        ) : (
          <div className="p-12 text-center space-y-4">
            <Smartphone size={40} className="text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <div>
              <p className="text-slate-900 dark:text-white font-bold text-sm">Apenas no App Mobile</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 leading-relaxed">
                Baixe nosso aplicativo para configurar camadas extras de segurança física.
              </p>
            </div>
          </div>
        )}

        {/* Tela Inicial (Mobile) */}
        {isNative && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <House size={18} className="text-amber-500" />
                <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Tela Inicial do App</p>
              </div>
              {security.savingStartupHome && (
                <Loader2 size={14} className="text-amber-500 animate-spin" />
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => security.handleStartupHomeChange('home', isPremium, onNavigatePricing)}
                className={`rounded-2xl border p-5 text-left transition-all ${
                  security.startupHome === 'home'
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-500/80 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-3 rounded-2xl ${security.startupHome === 'home' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                    <House size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Home</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Resumo e rotina</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Abre o app na Home com resumo do mês, atalhos e acesso rápido ao Controla completo.
                </p>
              </button>
              <button
                onClick={() => security.handleStartupHomeChange('central', isPremium, onNavigatePricing)}
                className={`rounded-2xl border p-5 text-left transition-all ${
                  security.startupHome === 'central'
                    ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-500/80 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                } ${!isPremium ? 'opacity-80' : ''}`}
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl ${security.startupHome === 'central' ? 'bg-sky-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                      <LayoutGrid size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Central financeira</p>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Visão completa do ecossistema</p>
                    </div>
                  </div>
                  {!isPremium && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <Crown size={12} /> Premium
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Ideal para quem quer abrir o app já na visão mais ampla, com Central, patrimônio, dívidas, Nexus e evolução do plano.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Documentos Legais */}
        <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            onClick={() => security.setActiveModal('termos')}
            className="w-full p-6 text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between group transition-colors"
          >
            <div className="flex items-center gap-4">
              <FileText size={20} className="text-slate-400 dark:text-slate-500" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Termos e Privacidade</span>
            </div>
            <ChevronRight size={18} className="text-slate-400 dark:text-slate-500" />
          </button>
        </div>
      </div>

      {/* Modais de Segurança e Termos */}
      {security.activeModal === 'pin' && isNative && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-8 w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <Lock size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">
              {security.hasPin ? 'Alterar PIN' : 'Definir PIN'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-8">Insira 4 dígitos para proteger seu acesso</p>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  onClick={() => security.handlePinKeyPress(String(n))}
                  className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-2xl active:bg-sky-500 transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
                >
                  {n}
                </button>
              ))}
              <div />
              <button
                onClick={() => security.handlePinKeyPress('0')}
                className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-2xl active:bg-sky-500 transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
              >
                0
              </button>
              <button
                onClick={() => security.setPinInput((prev) => prev.slice(0, -1))}
                className="h-16 rounded-2xl text-red-600 dark:text-red-400 flex items-center justify-center active:bg-red-50 dark:active:bg-red-950/40 transition-all"
              >
                <X size={28} />
              </button>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  security.setActiveModal(null);
                  security.setPinInput('');
                }}
                className="flex-1 py-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold uppercase text-xs tracking-widest"
              >
                Cancelar
              </button>
              <button
                onClick={security.handleSavePin}
                disabled={security.pinInput.length !== 4}
                className="flex-1 py-4 bg-emerald-600 disabled:opacity-30 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {security.activeModal === 'termos' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] p-10 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 bg-sky-50 dark:bg-sky-950/30 blur-3xl"></div>

            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter flex items-center gap-3">
              <FileText className="text-sky-600 dark:text-sky-400" /> Documentos Legais
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-8">Escolha qual documento deseja consultar</p>

            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  onNavigate('/termos');
                  security.setActiveModal(null);
                }}
                className="w-full py-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
              >
                <FileText size={18} /> Termos de Uso
              </button>

              <button
                onClick={() => {
                  onNavigate('/privacidade');
                  security.setActiveModal(null);
                }}
                className="w-full py-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
              >
                <ShieldCheck size={18} /> Política de Privacidade
              </button>

              <button
                onClick={() => security.setActiveModal(null)}
                className="w-full py-4 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-widest hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsSecuritySection;
