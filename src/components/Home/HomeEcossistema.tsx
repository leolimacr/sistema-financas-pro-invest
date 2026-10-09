import React from 'react';
import { LayoutGrid, ChevronRight, ArrowRight } from 'lucide-react';

interface Props {
  heroPersona: 'dividas' | 'patrimonio';
  onNavigate: (route: string) => void;
  onStartNow: () => void;
  isAuthenticated: boolean;
}

export const HomeEcossistema: React.FC<Props> = ({ heroPersona, onNavigate, onStartNow, isAuthenticated }) => {
  const bentoCards = [
    { 
      title: 'Simulador de Juros Compostos', 
      subtitle: 'Projete o poder da multiplicação mensal com aportes contínuos no tempo.', 
      image: '/assets/images/tools/juros-compostos-cover.jpg',
      badge: 'Efeito Bola de Neve',
      onClick: () => onNavigate('tool-juros') 
    },
    { 
      title: 'Alugar ou Comprar Imóvel', 
      subtitle: 'Decisões imobiliárias na ponta do lápis com custo de oportunidade.', 
      image: '/assets/images/tools/alugar-vs-comprar-cover.jpg',
      badge: 'Decisão Imobiliária',
      onClick: () => onNavigate('tool-alugar') 
    },
    { 
      title: heroPersona === 'dividas' ? 'Calculadora de Dívidas' : 'Calculadora FIRE', 
      subtitle: heroPersona === 'dividas' ? 'Elimine anos de juros com amortização acelerada.' : 'Descubra quanto tempo ainda precisa trabalhar.', 
      image: heroPersona === 'dividas' ? '/assets/images/tools/calculadora-dividas-cover.jpg' : '/assets/images/tools/calculadora-fire-cover.jpg',
      badge: heroPersona === 'dividas' ? 'Amortização Estratégica' : 'Tempo de Trabalho Real',
      onClick: () => onNavigate(heroPersona === 'dividas' ? 'tool-dividas' : 'tool-fire') 
    },
    { 
      title: 'À Vista ou Parcelado?', 
      subtitle: 'Compare pagar com desconto ou investir no CDI mês a mês.', 
      image: '/assets/images/tools/a-vista-ou-parcelado-cover.jpg',
      badge: 'Decisão de Compra',
      onClick: () => onNavigate('tool-buy-cash-or-installments') 
    },
  ];

  return (
    <section className="px-6 lg:px-16 py-28 w-full bg-surface-secondary dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-sans border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-16 items-center">
        
        {/* Coluna de Texto e Destaque Principal */}
        <div className="w-full lg:w-1/2 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mx-auto lg:mx-0">
            <LayoutGrid size={14} />
            Módulos Práticos
          </div>
          
          <h2 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
            Ferramentas Auxiliares de Navegação
          </h2>
          
          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
            Aproveite utilitários avançados de cálculo para simular e estruturar cenários específicos antes de assumir decisões críticas.
          </p>

          {/* Destaque Principal do Controla */}
          <div className="mt-8 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left relative overflow-hidden group">
            <div className="absolute top-0 right-0 bg-emerald-500/10 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase px-4 py-1.5 rounded-bl-xl tracking-wider">
              Célula de Comando
            </div>
            
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-2">Painel de Controle Integrado</span>
            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">O Controla e a Inteligência do Nexus</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              A verdadeira mágica acontece quando seus dados estão conectados. O Controla gerencia seus fluxos diários enquanto o Nexus prevê tensões patrimoniais de forma totalmente automatizada.
            </p>

            <button 
              onClick={() => onNavigate(heroPersona === 'dividas' ? 'minhas-dividas' : 'investimentos')}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-all text-xs cursor-pointer"
            >
              <span>{heroPersona === 'dividas' ? 'Acessar Gestão de Débitos' : 'Acessar Gestão Patrimonial'}</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Grade de Ferramentas Auxiliares com Capas Executivas 16:9 */}
        <div className="w-full lg:w-1/2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {bentoCards.map((card, index) => (
              <button 
                key={index} 
                onClick={card.onClick} 
                className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden text-left shadow-sm hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
              >
                <div className="relative h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                  <span className="absolute bottom-2.5 left-3 px-2.5 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-xs text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {card.badge}
                  </span>
                </div>

                <div className="p-5 flex flex-col justify-between flex-1">
                  <div className="space-y-1.5">
                    <p className="text-base font-black text-slate-900 dark:text-white leading-snug tracking-tight">{card.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{card.subtitle}</p>
                  </div>
                  
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                    Calcular agora
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};