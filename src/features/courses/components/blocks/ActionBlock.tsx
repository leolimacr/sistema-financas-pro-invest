import React from 'react';
import { Pencil } from 'lucide-react';

interface Props {
  title?: string;
  content: string;
}

const ActionBlock: React.FC<Props> = ({ title, content }) => (
  <div className="mb-5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl p-4 flex gap-3">
    <Pencil size={18} className="text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
    <div>
      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">
        {title ?? 'Ação prática de hoje'}
      </p>
      <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{content}</p>
    </div>
  </div>
);

export default ActionBlock;
