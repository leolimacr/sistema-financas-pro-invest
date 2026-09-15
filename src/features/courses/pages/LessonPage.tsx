import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  BookOpen,
  X,
  Clock,
  PlayCircle,
  Menu,
} from 'lucide-react';

import { useCourseProgress } from '../hooks/useCourseProgress';
import { coursesRegistry, type CourseSlug } from '../registry';
import BlockRenderer from '../components/BlockRenderer';

export const LessonPage: React.FC = () => {
  const params = useParams<{
    courseSlug: string;
    moduleSlug: string;
    lessonSlug?: string;
    lessonId?: string;
  }>();
  const navigate = useNavigate();

  const safeCourseSlug = (params.courseSlug || 'investidor-iniciante') as CourseSlug;
  const moduleSlug = params.moduleSlug;
  const activeLessonSlug = params.lessonSlug || params.lessonId;

  const course = coursesRegistry[safeCourseSlug];

  const { progress, isLoading, markLessonAsCompleted, isLessonCompleted, getModuleCompletionPercentage } =
    useCourseProgress(String(safeCourseSlug || ''));

  const [isCompleting, setIsCompleting] = useState(false);
  const [canComplete, setCanComplete] = useState(false);
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Busca dados do módulo e da aula atual
  const { moduleData, lessonData, lessonIndex, previousLesson, nextLesson } = useMemo(() => {
    const mod = course?.modules.find((m) => m.slug === moduleSlug);
    const idx = mod?.lessons.findIndex((l) => l.slug === activeLessonSlug) ?? -1;
    const currentLesson = idx !== -1 ? mod?.lessons[idx] : null;
    const previousLess = mod && idx > 0 ? mod.lessons[idx - 1] : null;
    const nextLess =
      mod && idx !== -1 && idx + 1 < mod.lessons.length ? mod.lessons[idx + 1] : null;

    return {
      moduleData: mod,
      lessonData: currentLesson,
      lessonIndex: idx,
      previousLesson: previousLess,
      nextLesson: nextLess,
    };
  }, [course, moduleSlug, activeLessonSlug]);

  // Sempre que trocar de aula, recalibra canComplete
  useEffect(() => {
    if (!lessonData) return;
    setCanComplete(false);
    setIsSidebarOpenMobile(false);
  }, [lessonData?.slug]);

  // Se a aula não tiver quiz, permite concluir sem bloqueio
  useEffect(() => {
    if (!lessonData) return;

    const hasQuizBlock =
      Array.isArray(lessonData.blocks) &&
      lessonData.blocks.some((block: any) => block?.type === 'quiz');

    if (!hasQuizBlock) {
      setCanComplete(true);
    }
  }, [lessonData]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-blue-600 w-8 h-8" />
      </div>
    );
  }

  if (!course || !moduleData || !lessonData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-slate-600 mb-4 text-base">Aula não encontrada na trilha.</p>
        <button
          onClick={() => navigate(`/curso/${safeCourseSlug}`)}
          className="bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
        >
          Voltar para a Trilha
        </button>
      </div>
    );
  }

  const alreadyCompleted = isLessonCompleted(lessonData.slug);
  const totalLessons = moduleData.lessons.length;
  const currentStep = lessonIndex + 1;
  const progressPercentage = (currentStep / totalLessons) * 100;
  const modulePercentage = getModuleCompletionPercentage(moduleSlug || '');

  const hasQuizBlockHard =
    Array.isArray(lessonData.blocks) &&
    lessonData.blocks.some((block: any) => block?.type === 'quiz');

  const isDisabled = isCompleting || (hasQuizBlockHard && !canComplete && !alreadyCompleted);

  const handleCompleteLesson = async () => {
    if (isCompleting) return;
    setIsCompleting(true);

    await markLessonAsCompleted(lessonData.slug);

    if (nextLesson) {
      navigate(`/curso/${safeCourseSlug}/modulo/${moduleSlug}/aula/${nextLesson.slug}`);
    } else {
      navigate(`/curso/${safeCourseSlug}/modulo/${moduleSlug}`);
    }

    setIsCompleting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* HEADER SUPERIOR FIXO */}
      <header className="sticky top-0 bg-white/95 backdrop-blur-md z-30 border-b border-slate-200 px-4 md:px-8 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/curso/${safeCourseSlug}/modulo/${moduleSlug}`)}
              className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="Voltar para o módulo"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="hidden sm:block">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                {moduleData.title}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Aula {currentStep} de {totalLessons}
              </span>
            </div>
          </div>

          {/* Botão de abrir índice de aulas em telas mobile */}
          <button
            onClick={() => setIsSidebarOpenMobile(true)}
            className="lg:hidden flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 active:scale-95 transition-transform"
          >
            <Menu className="w-4 h-4 text-blue-600" />
            <span>Índice ({currentStep}/{totalLessons})</span>
          </button>

          {/* Barra de progresso no topo */}
          <div className="hidden md:flex items-center gap-3 min-w-[180px]">
            <span className="text-xs font-bold text-slate-500">{Math.round(progressPercentage)}%</span>
            <div className="w-32 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Barra de progresso linear fina no mobile */}
        <div className="md:hidden w-full bg-slate-200 h-1 mt-3 -mx-4 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </header>

      {/* ÁREA CENTRAL: SPLIT LMS (SIDEBAR NO DESKTOP + CONTEÚDO NOBRE) */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        
        {/* SIDEBAR DESKTOP (ÍNDICE DO MÓDULO) */}
        <aside className="hidden lg:block w-80 shrink-0 border-r border-slate-200 bg-white/80 p-6 self-start sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Plano de Aulas</span>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {modulePercentage}% feito
            </span>
          </div>

          <p className="text-xs font-bold text-slate-900 mb-4 leading-snug">
            {moduleData.title}
          </p>

          <div className="space-y-2">
            {moduleData.lessons.map((lesson, idx) => {
              const isCurrent = lesson.slug === activeLessonSlug;
              const isDone = isLessonCompleted(lesson.slug);

              return (
                <Link
                  key={lesson.slug}
                  to={`/curso/${safeCourseSlug}/modulo/${moduleSlug}/aula/${lesson.slug}`}
                  className={`flex items-start gap-3 p-3 rounded-xl text-xs transition-all ${
                    isCurrent
                      ? 'bg-blue-50 border border-blue-200 text-blue-900 font-bold shadow-sm'
                      : isDone
                        ? 'bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100'
                        : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isCurrent ? (
                      <PlayCircle className="w-4 h-4 text-blue-600" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400 font-semibold">
                        {idx + 1}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="leading-relaxed block">{lesson.title}</span>
                    {lesson.durationMinutes && (
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {lesson.durationMinutes} min
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* DRAWER MOBILE DE AULAS */}
        {isSidebarOpenMobile && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
            <div className="w-4/5 max-w-sm bg-white h-full p-6 flex flex-col shadow-2xl overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <div>
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                    Índice do Módulo
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">
                    {moduleData.title}
                  </h4>
                </div>
                <button
                  onClick={() => setIsSidebarOpenMobile(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 flex-1">
                {moduleData.lessons.map((lesson, idx) => {
                  const isCurrent = lesson.slug === activeLessonSlug;
                  const isDone = isLessonCompleted(lesson.slug);

                  return (
                    <Link
                      key={lesson.slug}
                      to={`/curso/${safeCourseSlug}/modulo/${moduleSlug}/aula/${lesson.slug}`}
                      onClick={() => setIsSidebarOpenMobile(false)}
                      className={`flex items-start gap-3 p-3 rounded-xl text-xs transition-all ${
                        isCurrent
                          ? 'bg-blue-50 border border-blue-200 text-blue-900 font-bold'
                          : isDone
                            ? 'bg-slate-50 border border-slate-100 text-slate-700'
                            : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : isCurrent ? (
                          <PlayCircle className="w-4 h-4 text-blue-600" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <span className="leading-relaxed">{lesson.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ÁREA DE LEITURA E CONTEÚDO EDITORIAL */}
        <main className="flex-1 px-4 md:px-8 lg:px-12 pt-8 pb-36 max-w-4xl mx-auto w-full">
          {/* Cabeçalho do artigo/aula */}
          <div className="mb-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
              <span>{moduleData.title}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                {lessonData.durationMinutes || 6} min de leitura
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 leading-tight tracking-tight mb-4">
              {lessonData.title}
            </h1>

            {lessonData.objective && (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
                <strong className="text-blue-900 font-bold block mb-1">Objetivo Pedagógico:</strong>
                {lessonData.objective}
              </div>
            )}
          </div>

          {/* Renderização rica dos blocos */}
          <div className="flex flex-col gap-6 text-slate-800">
            {lessonData.blocks?.map((block: any, index: number) => (
              <BlockRenderer
                key={index}
                block={block}
                onQuizCompleted={() => setCanComplete(true)}
              />
            ))}
          </div>
        </main>
      </div>

      {/* FOOTER FIXO DE AÇÃO */}
      <footer className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 pb-6 shadow-[0_-8px_20px_-8px_rgba(0,0,0,0.08)] z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {previousLesson ? (
            <button
              onClick={() =>
                navigate(
                  `/curso/${safeCourseSlug}/modulo/${moduleSlug}/aula/${previousLesson.slug}`
                )
              }
              className="px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs md:text-sm bg-white hover:bg-slate-50 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Aula anterior</span>
            </button>
          ) : (
            <div className="w-12" />
          )}

          <button
            onClick={() => {
              if (isDisabled) {
                alert('Antes de avançar, responda ao quiz desta aula.');
                return;
              }
              handleCompleteLesson();
            }}
            aria-disabled={isDisabled}
            className={`flex-1 sm:flex-initial sm:min-w-[260px] py-3.5 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 font-bold text-xs md:text-sm transition-all active:scale-95 ${
              alreadyCompleted
                ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                : isDisabled
                  ? 'bg-blue-300 text-white cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isCompleting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : alreadyCompleted ? (
              <>
                <span>{nextLesson ? 'Próxima Aula' : 'Concluir Módulo'}</span>
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{nextLesson ? 'Concluir e Próxima' : 'Concluir Módulo'}</span>
              </>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
};

export default LessonPage;