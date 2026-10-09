import React from 'react';
import { ArrowRight, Smartphone } from 'lucide-react';

interface Props {
  heroPersona: 'dividas' | 'patrimonio';
  onNavigate: (route: string) => void;
  onStartNow: () => void;
  isAuthenticated: boolean;
}

export const HomeSecoesSuporte: React.FC<Props> = ({ heroPersona, onNavigate, onStartNow, isAuthenticated }) => (
  <div className="bg-surface-secondary dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-sans border-t border-slate-200 dark:border-slate-800">
    
    {/* Dobra de Comando & Integração FPI */}
    <section className="px-6 lg:px-16 py-20 max-w-[1400px] mx-auto w-full">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 lg:p-12 shadow-sm">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
            Sua Central de Comando
          </span>
          <h3 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
            A verdade nua e crua na palma da sua mão.
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed mb-8">
            {heroPersona === 'dividas' 
              ? 'Pare de usar planilhas complexas que perdoam seus deslizes. O FPI monitora as taxas reais cobradas e alerta antes de os juros minarem sua folga do mês.'
              : 'O FPI junta todas as pontas. Mapeamos seus investimentos, descontamos a inflação em tempo real e mostramos quanto sua carteira está de fato protegendo a sua liberdade.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => onNavigate(heroPersona === 'dividas' ? 'minhas-dividas' : 'investimentos')} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-[0_4px_20px_rgba(37,99,235,0.3)] inline-flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
            >
              <span>Assumir o Controle</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>

    {/* Benefícios Filosóficos */}
    <section className="px-6 lg:px-16 py-10 max-w-[1400px] mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Clareza Imperturbável</h4>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Nós não enviamos avisos de comemoração ou notificações coloridas desnecessárias. Nossa entrega é focada na verdade absoluta da sua saúde patrimonial.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Instinto de Comando</h4>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Você é quem pilota. O sistema serve apenas como painel de dados com feedback imediato para proteger o seu Saldo Livre Real.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
          <h4 className="text-slate-900 dark:text-white font-bold text-lg mb-2">Foco no Colchão Emergencial</h4>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Todas as métricas são orientadas a construir sua primeira camada de proteção financeira o quanto antes. O resto é apenas ruído.
          </p>
        </div>
      </div>
    </section>

    {/* CTA Final Unificado */}
    <section className="px-6 lg:px-16 py-28 max-w-[1400px] mx-auto w-full text-center">
      <div className="max-w-3xl mx-auto space-y-6">
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
          Ação Estratégica
        </span>
        
        <h3 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Pronto para assumir o controle?
        </h3>
        
        <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg leading-relaxed">
          {heroPersona === 'dividas'
            ? 'Esconda o pânico. Mapeie a realidade e comece seu plano para sair do vermelho com suporte da autoridade silenciosa do Nexus.'
            : 'Consolide suas contas, acompanhe seu progresso real e deixe o cockpit te guiar com tranquilidade.'}
        </p>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button 
            onClick={onStartNow} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-10 py-5 rounded-xl transition-all shadow-[0_4px_25px_rgba(16,185,129,0.3)] inline-flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
          >
            <span>Quero Mapear meu Colchão Emergencial</span>
            <ArrowRight size={18} />
          </button>
          <button 
            onClick={() => onNavigate('download')}
            className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-bold px-8 py-5 rounded-xl transition-all shadow-sm inline-flex items-center justify-center gap-2 w-full sm:w-auto group cursor-pointer"
          >
            <Smartphone size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
            <span>Baixar App no Celular</span>
          </button>
        </div>
      </div>
    </section>

  </div>
);
