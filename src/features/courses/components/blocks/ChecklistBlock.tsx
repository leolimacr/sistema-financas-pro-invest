import React, { useState } from 'react';

interface Props {
  title?: string;
  items: string[];
}

const ChecklistBlock: React.FC<Props> = ({ title, items }) => {
  const [checked, setChecked] = useState<boolean[]>(
    Array(items.length).fill(false)
  );

  const toggle = (index: number) => {
    setChecked((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const total = items.length;
  const done = checked.filter(Boolean).length;

  return (
    <div className="mb-5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      {title && (
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">{title}</h3>
      )}
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => toggle(i)}
          >
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all
                ${
                  checked[i]
                    ? 'bg-emerald-600 border-emerald-600'
                    : 'border-slate-300 dark:border-slate-600 group-hover:border-emerald-400'
                }`}
            >
              {checked[i] && (
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span
              className={`text-sm transition-colors ${
                checked[i]
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {item}
            </span>
          </li>
        ))}
      </ul>
      {done > 0 && (
        <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          {done} de {total} marcados
        </p>
      )}
    </div>
  );
};

export default ChecklistBlock;
