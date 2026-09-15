import React from 'react';
import { useNavigate } from 'react-router-dom';
import { courses } from '../Public/Courses';

interface Props {
  heroPersona: 'dividas' | 'patrimonio';
  setHeroPersona: (p: 'dividas' | 'patrimonio') => void;
  setSelectedCourse: (c: any) => void;
}

export const HomeCursos: React.FC<Props> = ({ heroPersona, setHeroPersona, setSelectedCourse }) => {
  const navigate = useNavigate();
  return (
    <section id="secao-cursos" className="px-6 lg:px-16 py-24 w-full bg-surface-secondary text-slate-700 font-sans border-t border-slate-200">
      <div className="max-w-[1200px] mx-auto mb-16 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Conhecimento Estratégico
        </div>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
          {heroPersona === 'dividas' 
            ? <>Primeiro organize a base. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">Depois avance.</span></> 
            : <>Primeiro organize a base. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">Depois refine decisões.</span></>
          }
        </h2>
        <p className="text-slate-500 max-w-2xl text-sm md:text-base mb-6 leading-relaxed">
          {heroPersona === 'dividas' 
            ? 'Os cursos de estruturação ajudam a aprofundar seu entendimento, disciplina e organização tática após estabelecer seu Colchão Inicial.' 
            : 'Nossos cursos diretos amadurecem suas tomadas de decisão após registrar sua base patrimonial e sua rotina financeira no painel principal.'}
        </p>
        <button 
          onClick={() => setHeroPersona(heroPersona === 'dividas' ? 'patrimonio' : 'dividas')} 
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
        >
          {heroPersona === 'dividas' 
            ? 'Já organizou a base e quer evoluir para investimentos? Veja a jornada patrimonial →' 
            : 'Precisa organizar suas pendências antes de investir? Veja a jornada de quitação →'}
        </button>
      </div>

      <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => {
          const isDebtCourse = course.id === 'dividas' || course.slug === 'dividas';
          const isFeaturedDebtCourse = heroPersona === 'dividas' && isDebtCourse;
          return (
            <div 
              key={course.id} 
              className={`relative rounded-2xl p-6 transition-all duration-300 cursor-pointer border flex flex-col justify-between ${
                isFeaturedDebtCourse 
                  ? 'md:col-span-2 lg:col-span-2 bg-white border-blue-500/40 shadow-sm' 
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
              onClick={() => {
                let internalSlug: string = course.slug;
                if (course.slug === 'plano-realista-para-sair-das-dividas' || course.id === 'plano-realista-para-sair-das-dividas' || course.id === 'dividas') {
                  internalSlug = 'dividas';
                } else if (course.slug === 'investidor-iniciante-seus-primeiros-passos' || course.id === 'investidor-iniciante') {
                  internalSlug = 'investidor-iniciante';
                }
                navigate(`/curso/${internalSlug}`);
              }}
            >
              <div>
                {isFeaturedDebtCourse && (
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-600">Destaque de Onboarding</span>
                  </div>
                )}
                
                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-2xl mb-6">
                  {course.icon}
                </div>

                <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-300 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600 mb-4">
                  Conteúdo Exclusivo
                </span>
                
                <h4 className="text-xl font-bold text-slate-900 mb-3 tracking-tight group-hover:text-blue-600 transition-colors">
                  {course.title}
                </h4>
                
                <p className="text-sm text-slate-500 leading-relaxed mb-6">
                  {course.excerpt}
                </p>
              </div>

              {isFeaturedDebtCourse && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200 mt-auto">
                  <div className="rounded-xl bg-surface-secondary border border-slate-200 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-blue-600 mb-1">Resultado</p>
                    <p className="text-xs font-semibold text-slate-900">Comando absoluto de rota</p>
                  </div>
                  <div className="rounded-xl bg-surface-secondary border border-slate-200 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Formato</p>
                    <p className="text-xs font-semibold text-slate-900">Piloto guiado</p>
                  </div>
                  <div className="rounded-xl bg-surface-secondary border border-slate-200 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">Alvo</p>
                    <p className="text-xs font-semibold text-slate-900">Sair do vermelho</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};