import React from 'react';

interface Props {
  heroPersona?: 'dividas' | 'patrimonio';
}

const STEPS = [
  {
    n: '01',
    title: 'Registre sua rotina',
    body: 'Anote entradas e saídas no Controla, sem limite. O hábito diário é o centro do método — e continua gratuito.',
  },
  {
    n: '02',
    title: 'Veja o que sobra',
    body: 'Entenda sua folga do mês, acompanhe o presente e planeje meses futuros com clareza sobre o que entra, sai e sobra.',
  },
  {
    n: '03',
    title: 'Aprofunde quando fizer sentido',
    body: 'No Pro, você acessa o histórico completo e compara sua evolução. No Premium, conecta rotina, dívidas, investimentos e patrimônio.',
  },
];

export const HomeJornada: React.FC<Props> = () => {
  return (
    <section id="como-funciona" className="px-6 lg:px-16 py-28 w-full bg-surface-secondary dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-sans border-t border-slate-200 dark:border-slate-800 relative">
      <div className="max-w-[1200px] mx-auto space-y-20 relative z-10">
        
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Como funciona
          </div>
          
          <h3 className="text-3xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tight leading-tight">
            Três passos para clareza financeira
          </h3>
          
          <p className="text-base md:text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            Comece registrando sua rotina. Evolua quando quiser ver o passado ou pensar de forma mais estratégica.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((step, idx) => (
            <div 
              key={idx} 
              className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm transition-all hover:border-blue-300 dark:hover:border-blue-500/50 flex flex-col space-y-6"
            >
              <div className="w-12 h-12 rounded-xl bg-surface-secondary dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center font-mono text-lg font-bold">
                {step.n}
              </div>
              
              <div className="space-y-3">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{step.title}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-normal">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
