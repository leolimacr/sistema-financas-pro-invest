import React from 'react';

interface Props {
  content: string;
}

const QuoteBlock: React.FC<Props> = ({ content }) => (
  <div className="mb-5 border-l-4 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 rounded-r-xl px-4 py-3">
    <p className="text-sm text-emerald-800 dark:text-emerald-200 italic leading-relaxed">
      "{content}"
    </p>
  </div>
);

export default QuoteBlock;
