import React from 'react';
import { Lightbulb } from 'lucide-react';

interface Props {
  title?: string;
  content: string;
}

const AnalogyBox: React.FC<Props> = ({ title, content }) => (
  <div className="mb-5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-4 flex gap-3">
    <Lightbulb size={18} className="text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
    <div>
      {title && (
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">
          {title}
        </p>
      )}
      <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{content}</p>
    </div>
  </div>
);

export default AnalogyBox;
