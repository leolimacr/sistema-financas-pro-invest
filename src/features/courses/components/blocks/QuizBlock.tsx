import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
  question: string;
  options: string[];
  correctIndex: number;
  feedbackCorrect: string;
  feedbackIncorrect: string;
  onCompleted?: () => void;             
}

const QuizBlock: React.FC<Props> = ({
  question,
  options,
  correctIndex,
  feedbackCorrect,
  feedbackIncorrect,
  onCompleted,                            
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const answered = selected !== null;
  const isCorrect = selected === correctIndex;

  const handleRetry = () => {
    setSelected(null);
  };

  return (
    <div className="mb-5 border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Verificação de Aprendizado</span>
      </div>
      <p className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 mb-4">{question}</p>
      <div className="space-y-2.5">
        {options.map((option, i) => {
          let style =
            'border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800';
          if (answered) {
            if (i === correctIndex)
              style = 'border border-emerald-500 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold shadow-xs';
            else if (i === selected)
              style = 'border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 font-medium';
            else
              style = 'border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60';
          }
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => {
                setSelected(i);
                if (i === correctIndex && onCompleted) {
                  onCompleted();
                }
              }}
              className={`w-full text-left text-xs md:text-sm px-4 py-3 rounded-xl transition-all ${style}`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          className={`mt-4 text-xs md:text-sm rounded-xl p-4 transition-all ${
            isCorrect
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="font-bold block mb-1">
                {isCorrect ? '✓ Resposta Correta!' : '✗ Quase lá...'}
              </span>
              <p className="leading-relaxed text-xs md:text-sm">
                {isCorrect ? feedbackCorrect : feedbackIncorrect}
              </p>
            </div>
            {!isCorrect && (
              <button
                type="button"
                onClick={handleRetry}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 font-bold text-xs hover:bg-red-100/60 dark:hover:bg-red-950/60 shadow-xs transition-colors"
              >
                <RotateCcw size={13} />
                <span>Tentar de novo</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizBlock;
