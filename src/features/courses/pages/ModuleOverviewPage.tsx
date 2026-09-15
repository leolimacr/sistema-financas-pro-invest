import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, PlayCircle, Clock, Trophy, ChevronRight } from 'lucide-react';

import { useCourseProgress } from '../hooks/useCourseProgress';
import { coursesRegistry, type CourseSlug } from '../registry';

export const ModuleOverviewPage: React.FC = () => {
  const { courseSlug, moduleSlug } = useParams<{ courseSlug: string; moduleSlug: string }>();
  const navigate = useNavigate();
  const safeSlug = (courseSlug || 'investidor-iniciante') as CourseSlug;
  const course = coursesRegistry[safeSlug];

  const { progress, isLoading, getModuleCompletionPercentage } = useCourseProgress(safeSlug);

  const moduleIndex = useMemo(() => {
    if (!course || !moduleSlug) return null;
    const idx = course.modules.findIndex((m) => m.slug === moduleSlug);
    return idx >= 0 ? idx + 1 : null;
  }, [course, moduleSlug]);

  const moduleData = useMemo(() => {
    if (!course || !moduleSlug) return null;
    return course.modules.find((m) => m.slug === moduleSlug) ?? null;
  }, [course, moduleSlug]);

  const { lessonsState, nextLessonSlug, completedCount } = useMemo(() => {
    if (!progress || !moduleData) {
      return { lessonsState: [], nextLessonSlug: null, completedCount: 0 };
    }

    let foundCurrent = false;
    let nextSlug: string | null = null;
    let completed = 0;

    const states = moduleData.lessons.map((lesson) => {
      const isCompleted = progress.completedLessons.includes(lesson.slug);

      if (isCompleted) {
        completed++;
      }

      let status: 'completed' | 'current' | 'unlocked' | 'locked' = 'locked';

      if (isCompleted) {
        status = 'completed';
      } else if (!foundCurrent) {
        status = 'current';
        foundCurrent = true;
        nextSlug = lesson.slug;
      } else {
        status = 'unlocked';
      }

      return { ...lesson, status };
    });

    return {
      lessonsState: states,
      nextLessonSlug: nextSlug,
      completedCount: completed,
    };
  }, [progress, moduleData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className="min-h-[70vh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Módulo não encontrado</h2>
        <p className="text-slate-600 mb-6">Parece que esse conteúdo não está disponível na trilha.</p>
        <button
          onClick={() => navigate(`/curso/${safeSlug}`)}
          className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Voltar para a Trilha
        </button>
      </div>
    );
  }

  const isModuleFinished = completedCount === moduleData.lessons.length;
  const modulePercentage = getModuleCompletionPercentage(moduleSlug || '');

  return (
    <div className="min-h-screen bg-slate-50/70 pb-36 text-slate-800">
      {/* HEADER EDITORIAL DO MÓDULO */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-8 pt-8 pb-8 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => navigate(`/curso/${safeSlug}`)}
            className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-500 hover:text-slate-900 mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Voltar para a Trilha de Módulos</span>
          </button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  MÓDULO {moduleIndex} DE {course?.modules.length || 6}
                </span>

                {moduleData.badgeLabel && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    Insígnia: {moduleData.badgeLabel}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight mb-3">
                {moduleData.title}
              </h1>

              <p className="text-sm md:text-base text-slate-600 max-w-3xl leading-relaxed">
                {moduleData.objective || moduleData.description}
              </p>
            </div>

            {/* Progresso do Módulo */}
            <div className="shrink-0 bg-slate-50 border border-slate-200 rounded-2xl p-4 min-w-[200px]">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
                <span>Progresso do Módulo</span>
                <span className="text-slate-900 font-extrabold">{modulePercentage}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isModuleFinished ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${modulePercentage}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                {completedCount} de {moduleData.lessons.length} aulas concluídas
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* GRADE DE AULAS */}
      <main className="max-w-5xl mx-auto px-4 md:px-8 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Aulas Estruturadas
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            {moduleData.lessons.length} Aulas neste Módulo
          </span>
        </div>

        <div className="flex flex-col gap-3.5">
          {lessonsState.map((lesson, index) => {
            const isCompleted = lesson.status === 'completed';
            const isCurrent = lesson.status === 'current';

            return (
              <Link
                key={lesson.slug}
                to={`/curso/${safeSlug}/modulo/${moduleSlug}/aula/${lesson.slug}`}
                className={`flex items-start md:items-center justify-between p-4 md:p-5 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-white border-emerald-200 shadow-sm hover:border-emerald-300'
                    : isCurrent
                      ? 'bg-white border-blue-300 shadow-md ring-2 ring-blue-50 hover:border-blue-400'
                      : 'bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-start md:items-center gap-4">
                  {/* Ícone de Status */}
                  <div className="mt-0.5 md:mt-0 shrink-0">
                    {isCompleted ? (
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                        <PlayCircle className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <PlayCircle className="w-5 h-5" />
                      </div>
                    )}
                  </div>

                  {/* Informações da Aula */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[11px] font-bold tracking-wider uppercase ${
                          isCompleted
                            ? 'text-emerald-600'
                            : isCurrent
                              ? 'text-blue-600'
                              : 'text-slate-400'
                        }`}
                      >
                        AULA {index + 1}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Em Andamento
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm md:text-base font-bold text-slate-900 leading-snug">
                      {lesson.title}
                    </h3>

                    {lesson.objective && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {lesson.objective}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 ml-4">
                  {lesson.durationMinutes && (
                    <div className="hidden sm:flex items-center text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {lesson.durationMinutes} min
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* FOOTER FIXO */}
      <footer className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 pb-6 shadow-lg z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="text-xs text-slate-500 font-medium">
              Módulo {moduleIndex}: {moduleData.title}
            </p>
            <p className="text-xs font-bold text-slate-800">
              {completedCount} de {moduleData.lessons.length} aulas finalizadas
            </p>
          </div>

          {!isModuleFinished && nextLessonSlug ? (
            <button
              onClick={() =>
                navigate(`/curso/${safeSlug}/modulo/${moduleSlug}/aula/${nextLessonSlug}`)
              }
              className="w-full sm:w-auto ml-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
            >
              <PlayCircle className="w-4 h-4" />
              {completedCount === 0 ? 'Iniciar Primeira Aula' : 'Continuar Módulo'}
            </button>
          ) : (
            <button
              onClick={() => navigate(`/curso/${safeSlug}`)}
              className="w-full sm:w-auto ml-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Módulo Completo • Voltar à Trilha
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default ModuleOverviewPage;