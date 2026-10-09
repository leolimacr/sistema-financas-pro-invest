import React, { useMemo } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import {
  Lock,
  CheckCircle2,
  PlayCircle,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Clock,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Bot,
} from 'lucide-react';

import { useCourseProgress } from '../hooks/useCourseProgress';
import { coursesRegistry, type CourseSlug } from '../registry';

export const CourseTrackPage: React.FC = () => {
  const navigate = useNavigate();
  const { courseSlug } = useParams<{ courseSlug: string }>();

  const safeCourseSlug = (courseSlug || 'investidor-iniciante') as CourseSlug;
  const course = coursesRegistry[safeCourseSlug];

  const { progress, isLoading, getCourseCompletionPercentage } = useCourseProgress(
    String(safeCourseSlug || '')
  );

  const { currentModuleSlug, currentLessonSlug, moduleStates, totalLessonsCount } = useMemo(() => {
    if (!progress || !course) {
      return { currentModuleSlug: '', currentLessonSlug: '', moduleStates: [], totalLessonsCount: 0 };
    }
    let foundCurrent = false;
    let nextMod = '';
    let nextLess = '';
    let totalLessons = 0;

    const states = course.modules.map((mod, index) => {
      totalLessons += mod.lessons.length;
      const completedLessonsInMod = mod.lessons.filter((l) =>
        progress.completedLessons.includes(l.slug)
      ).length;

      const isCompleted = completedLessonsInMod === mod.lessons.length;

      // Regra de desbloqueio por módulo (primeiro sempre aberto ou aberto sequencialmente)
      let isUnlocked = false;
      if (index === 0) {
        isUnlocked = true;
      } else {
        const prevModule = course.modules[index - 1];
        const prevCompletedLessons = prevModule.lessons.filter((l) =>
          progress.completedLessons.includes(l.slug)
        ).length;
        isUnlocked = prevCompletedLessons === prevModule.lessons.length;
      }

      if (isUnlocked && !isCompleted && !foundCurrent) {
        foundCurrent = true;
        nextMod = mod.slug;
        nextLess =
          mod.lessons.find((l) => !progress.completedLessons.includes(l.slug))?.slug || '';
      }

      return {
        ...mod,
        isCompleted,
        isUnlocked,
        completedCount: completedLessonsInMod,
        totalCount: mod.lessons.length,
      };
    });

    return {
      currentModuleSlug: nextMod || course.modules[0]?.slug || '',
      currentLessonSlug: nextLess || course.modules[0]?.lessons[0]?.slug || '',
      moduleStates: states,
      totalLessonsCount: totalLessons,
    };
  }, [progress, course]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] bg-slate-50 dark:bg-slate-950">
        <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const completionPercent = getCourseCompletionPercentage();
  const completedLessonsTotal = progress?.completedLessons.length || 0;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 pb-28 text-slate-800 dark:text-slate-100">
      {/* HERO BANNER EDITORIAL PREMIUM */}
      <section className="bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 text-white border-b border-slate-800 px-4 md:px-8 pt-8 pb-12 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <button
              onClick={() => navigate('/app/explorar')}
              className="inline-flex items-center gap-2 text-xs md:text-sm font-semibold text-slate-300 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar ao Explorar</span>
            </button>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{course?.meta.level || 'Padrão CFP®'}</span>
            </div>
          </div>

          {/* Title & Metadata */}
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Trilha de Formação Soberana</span>
            </div>
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight text-white mb-4 leading-tight">
              {course?.meta.title ?? 'Curso Finanças Pro Invest'}
            </h1>
            <p className="text-sm md:text-base lg:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              {course?.meta.headline || course?.meta.description}
            </p>

            {/* Micro badges de metadados */}
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-slate-400">
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                <BookOpen className="w-4 h-4 text-blue-400" />
                {course?.modules.length || 0} Módulos ({totalLessonsCount} Aulas)
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                <Clock className="w-4 h-4 text-emerald-400" />
                {course?.meta.estimatedDuration || '2h30 estimada'}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                <Trophy className="w-4 h-4 text-amber-400" />
                Certificação de Conclusão FPI
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ÁREA PRINCIPAL: GRID RESPONSIVO DE 2 COLUNAS */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUNA ESQUERDA (2/3): TRILHA DOS MÓDULOS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Estrutura Pedagógica
                </h2>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Siga a ordem dos fatores para construir um patrimônio inabalável
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {moduleStates.map((mod, index) => {
                const isLocked = !mod.isUnlocked;
                const isCompleted = mod.isCompleted;

                return (
                  <Link
                    key={mod.slug}
                    to={isLocked ? '#' : `/curso/${safeCourseSlug}/modulo/${mod.slug}`}
                    onClick={(e) => {
                      if (isLocked) e.preventDefault();
                    }}
                    className={`block rounded-2xl border p-5 md:p-6 transition-all relative overflow-hidden ${
                      isLocked
                        ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 opacity-60 cursor-not-allowed'
                        : isCompleted
                          ? 'bg-white dark:bg-slate-900 border-emerald-200/80 dark:border-emerald-900/60 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md'
                          : 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-sm hover:border-blue-400 dark:hover:border-blue-700 hover:shadow-md ring-1 ring-blue-50 dark:ring-blue-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                              isLocked
                                ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                : isCompleted
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                            }`}
                          >
                            MÓDULO {index + 1}
                          </span>

                          {mod.badgeLabel && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-2 py-0.5 rounded-full">
                              <Trophy className="w-3 h-3 text-amber-500" />
                              {mod.badgeLabel}
                            </span>
                          )}
                        </div>

                        <h3
                          className={`text-base md:text-lg font-bold mb-2 leading-snug ${
                            isLocked ? 'text-slate-600 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {mod.title}
                        </h3>

                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                          {mod.objective || mod.description}
                        </p>

                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span>
                            {mod.completedCount} de {mod.totalCount} aulas concluídas
                          </span>
                          <span>•</span>
                          <span>{mod.lessons.length} aulas estruturadas</span>
                        </div>
                      </div>

                      <div className="mt-1 shrink-0">
                        {isLocked ? (
                          <div className="w-10 h-10 rounded-xl bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                            <Lock className="w-5 h-5" />
                          </div>
                        ) : isCompleted ? (
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                            <PlayCircle className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Barra de progresso interna do módulo */}
                    {!isLocked && (
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{
                            width: `${(mod.completedCount / mod.totalCount) * 100}%`,
                          }}
                        />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* COLUNA DIREITA (1/3): STATUS DO ALUNO & COMANDO */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Card de Progresso Geral */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <h3 className="text-sm font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 mb-4">
                Seu Progresso na Trilha
              </h3>

              <div className="flex items-baseline justify-between mb-2">
                <span className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100">
                  {completionPercent}%
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {completedLessonsTotal} de {totalLessonsCount} aulas
                </span>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden mb-6">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              {/* Botão de Ação Primária */}
              {completionPercent < 100 ? (
                <button
                  onClick={() =>
                    navigate(
                      `/curso/${safeCourseSlug}/modulo/${currentModuleSlug}/aula/${currentLessonSlug}`
                    )
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-between transition-all active:scale-95"
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <PlayCircle className="w-5 h-5" />
                    {completedLessonsTotal === 0 ? 'Começar Curso' : 'Continuar Aula Atual'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 text-center">
                  <Trophy className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">Curso Concluído com Sucesso!</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1 font-medium">
                    {course?.meta.id === 'plano-realista-para-sair-das-dividas'
                      ? 'Você conquistou a insígnia Livre de Dívidas • Estrategista da Quitação.'
                      : 'Você conquistou a certificação de Investidor Soberano.'}
                  </p>
                </div>
              )}
            </div>

            {/* Card de Conquistas & Badges */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500">
                  Suas Conquistas
                </h3>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
                  {progress?.unlockedBadges?.length || 0} desbloqueadas
                </span>
              </div>

              {progress?.unlockedBadges && progress.unlockedBadges.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                  {progress.unlockedBadges.map((badge, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold leading-snug">{badge}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                  <Trophy className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Conclua as aulas e módulos para desbloquear suas insígnias de autoridade financeira.
                  </p>
                </div>
              )}
            </div>

            {/* Suporte do Nexus Advisor */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">
                <Bot className="w-4 h-4 text-sky-400" />
                <span>Orientação Estratégica</span>
              </div>
              <h4 className="text-base font-bold text-white mb-2">
                Dúvidas durante o aprendizado?
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                O Nexus IA está treinado para tirar dúvidas sobre sua reserva de emergência, títulos do Tesouro ou sua alocação.
              </p>
              <button
                onClick={() => navigate('/app/central')}
                className="w-full text-center py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors"
              >
                Abrir Central do Nexus
              </button>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
};

export default CourseTrackPage;