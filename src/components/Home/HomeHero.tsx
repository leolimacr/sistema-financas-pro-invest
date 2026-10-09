import React, { useState } from 'react';
import { ArrowRight, Sparkles, Smartphone } from 'lucide-react';

interface HomeHeroProps {
  isAuthenticated: boolean;
  onNavigate: (route: string) => void;
  onStartNow: () => void;
  isPrivacyMode: boolean;
  userMeta: any;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  isAuthenticated,
  onNavigate,
  onStartNow,
  isPrivacyMode,
  userMeta,
}) => {
  // Mini simulador interativo na dobra para engajar o usuário imediatamente
  const [renda, setRenda] = useState<string>('5000');
  const [gastos, setGastos] = useState<string>('3300');
  const [dividas, setDividas] = useState<string>('700');

  const numRenda = parseFloat(renda) || 0;
  const numGastos = parseFloat(gastos) || 0;
  const numDividas = parseFloat(dividas) || 0;

  // Filosofia do FPI: Saldo Livre Real = Renda - Gastos Essenciais - Provisão de Dívidas
  const saldoLivreReal = numRenda - numGastos - numDividas;
  const isDeficit = saldoLivreReal < 0;
  const percentLivre = numRenda > 0 ? Math.round((saldoLivreReal / numRenda) * 100) : 0;

  const handlePreset = (r: number, g: number, d: number) => {
    setRenda(String(r));
    setGastos(String(g));
    setDividas(String(d));
  };

  return (
    <section className="relative px-6 pt-24 pb-16 lg:pt-32 lg:pb-24 w-full z-10 font-sans bg-surface-secondary dark:bg-slate-950 text-slate-700 dark:text-slate-200 overflow-hidden">
      {/* Background visual estilo Cockpit de Alta Performance */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-12 right-12 w-96 h-96 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center relative z-10">
        
        {/* Coluna Esquerda: A Promessa Soberana */}
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-2xl">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Organize seu dinheiro do mês
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-[4.5rem] font-extrabold text-slate-950 dark:text-white leading-[1.05] tracking-tight mb-6">
            Saiba quanto <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">sobra de verdade</span> no seu mês
          </h1>

          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 mb-8 leading-relaxed max-w-lg">
            O saldo da conta não é o dinheiro livre. O Finanças Pro Invest mostra o que sobra depois das contas do mês — e você começa <strong>grátis</strong>, registrando sua rotina sem limite.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <button 
              onClick={onStartNow}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
            >
              <span>Começar grátis no Controla</span>
              <ArrowRight size={18} />
            </button>
            <button 
              onClick={() => onNavigate('download')}
              className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold px-6 py-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto group cursor-pointer"
            >
              <Smartphone size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
              <span>Baixar no Celular (APK)</span>
            </button>
          </div>

          <div className="flex flex-wrap justify-center lg:justify-start gap-3 mt-10 w-full">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              ✓ Grátis para começar
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              ✓ Lançamentos ilimitados
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              ✓ Planeje meses futuros
            </span>
          </div>
        </div>

        {/* Coluna Direita: O Cockpit Interativo com Mini-Sliders */}
        <div className="w-full max-w-[540px] mx-auto lg:ml-auto">
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block">Simule em 5 segundos</span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">Calculadora de Saldo Livre Real</h3>
              </div>

              {/* Presets Rápidos */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handlePreset(3500, 2400, 400)}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  3.5k
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(5000, 3300, 700)}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 cursor-pointer"
                >
                  5k
                </button>
                <button
                  type="button"
                  onClick={() => handlePreset(10000, 5800, 1200)}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  10k
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {/* Input 1: Renda com Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-slate-600 dark:text-slate-400 font-bold">Renda Líquida Mensal</label>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">R$ {numRenda.toLocaleString('pt-BR')}</span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="30000"
                  step="250"
                  value={numRenda}
                  onChange={(e) => setRenda(e.target.value)}
                  className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {/* Input 2: Custos Fixos com Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-slate-600 dark:text-slate-400 font-bold">Gastos & Contas Fixas</label>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">R$ {numGastos.toLocaleString('pt-BR')}</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="25000"
                  step="100"
                  value={numGastos}
                  onChange={(e) => setGastos(e.target.value)}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {/* Input 3: Dívidas / Parcelas com Slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="text-slate-600 dark:text-slate-400 font-bold">Compromissos & Dívidas</label>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">R$ {numDividas.toLocaleString('pt-BR')}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15000"
                  step="100"
                  value={numDividas}
                  onChange={(e) => setDividas(e.target.value)}
                  className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none"
                />
              </div>

              {/* Resultado: Saldo Livre Real */}
              <div className={`mt-5 p-5 rounded-2xl border transition-all ${
                isDeficit 
                  ? 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50' 
                  : 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50'
              }`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Saldo Livre Real (Sobra Real)
                  </span>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isDeficit ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                  }`}>
                    {isDeficit ? 'Déficit de Caixa' : 'Folga Saudável'}
                  </span>
                </div>
                
                <div className="flex items-baseline gap-2 my-1">
                  <p className={`text-2xl md:text-3xl font-black font-mono tracking-tight ${
                    isDeficit ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                  }`}>
                    R$ {saldoLivreReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {!isDeficit && numRenda > 0 && (
                    <span className="text-xs font-bold font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                      {percentLivre}% livre
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                  {isDeficit 
                    ? "Neste cenário, seus compromissos consomem mais do que entra. O Finanças Pro Invest identifica gargalos e planeja saídas inteligentes."
                    : `Você tem ${percentLivre}% da sua renda 100% livre após garantir suas contas e dívidas. O app ajuda você a proteger e multiplicar essa margem.`}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};