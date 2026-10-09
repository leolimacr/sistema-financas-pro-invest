import React from 'react';
import { useNavigate } from 'react-router-dom';
import { courses } from '../Public/Courses';
import { ArrowRight, Clock, Award } from 'lucide-react';

interface Props {
  heroPersona: 'dividas' | 'patrimonio';
  setHeroPersona: (p: 'dividas' | 'patrimonio') => void;
  setSelectedCourse: (c: any) => void;
}

export const HomeCursos: React.FC<Props> = ({ heroPersona, setHeroPersona, setSelectedCourse }) => {
  const navigate = useNavigate();
  return (
    <section id="secao-cursos" className="px-6 lg:px-16 py-24 w-full bg-surface-secondary dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-sans border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-[1200px] mx-auto mb-16 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Conhecimento Estratégico
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
          {heroPersona === 'dividas' 
            ? <>Primeiro organize a base. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">Depois avance.</span></> 
            : <>Primeiro organize a base. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">Depois refine decisões.</span></>
          }
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-sm md:text-base mb-6 leading-relaxed">
          {heroPersona === 'dividas' 
            ? 'Os cursos de estruturação ajudam a aprofundar seu entendimento, disciplina e organização tática após estabelecer seu Colchão Emergencial.' 
            : 'Nossos cursos diretos amadurecem suas tomadas de decisão após registrar sua base patrimonial e sua rotina financeira no painel principal.'}
        </p>
        <button 
          onClick={() => setHeroPersona(heroPersona === 'dividas' ? 'patrimonio' : 'dividas')} 
          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors uppercase tracking-wider cursor-pointer"
        >
          {heroPersona === 'dividas' 
            ? 'Já organizou a base e quer evoluir para investimentos? Veja a jornada patrimonial →' 
            : 'Precisa organizar suas pendências antes de investir? Veja a jornada de quitação →'}
        </button>
      </div>

      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {courses.map((course) => {
          const isDebtCourse = course.id === 'dividas' || course.slug === 'dividas' || course.slug === 'plano-realista-para-sair-das-dividas';
          const courseImage = isDebtCourse 
            ? '/assets/images/courses/curso-dividas-cover.jpg' 
            : '/assets/images/courses/curso-investidor-cover.jpg';
          const duration = isDebtCourse ? '1h30' : '3h00';
          const badgeLabel = isDebtCourse ? 'Trilha de Recuperação' : 'Formação CFP®';

          return (
            <div 
              key={course.id} 
              className="group relative rounded-3xl p-6 transition-all duration-300 cursor-pointer border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 dark:hover:border-emerald-500/40 hover:shadow-lg flex flex-col justify-between overflow-hidden"
              onClick={() => {
                let internalSlug: string = course.slug;
                if (isDebtCourse) {
                  internalSlug = 'dividas';
                } else {
                  internalSlug = 'investidor-iniciante';
                }
                navigate(`/curso/${internalSlug}`);
              }}
            >
              <div>
                {/* Capa Executiva 16:9 */}
                <div className="relative h-48 w-full overflow-hidden bg-slate-100 dark:bg-slate-800 rounded-2xl -mt-2 mb-5">
                  <img
                    src={courseImage}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-xs text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {badgeLabel}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-xs text-[10px] font-mono font-bold text-slate-200 flex items-center gap-1">
                      <Clock size={11} className="text-emerald-400" />
                      {duration}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <Award size={12} />
                    Trilha Estratégica Completa
                  </span>
                  
                  <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                    {course.title}
                  </h4>
                  
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {course.excerpt}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <span>Acessar Trilha de Aprendizado</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </span>
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                  Gratuito
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};