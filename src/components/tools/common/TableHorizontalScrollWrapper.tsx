import React, { useRef, useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

interface TableHorizontalScrollWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHorizontalScrollWrapper: React.FC<TableHorizontalScrollWrapperProps> = ({
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    // Se o conteúdo é maior que a largura visível e ainda não chegamos ao final
    setCanScrollRight(scrollWidth > clientWidth && scrollLeft + clientWidth < scrollWidth - 12);
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={containerRef}
        onScroll={checkScroll}
        className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent"
      >
        {children}
      </div>

      {/* Indicador visual suave de continuidade no mobile */}
      {canScrollRight && (
        <div
          data-testid="table-scroll-hint"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-slate-800 dark:via-slate-800/80 flex items-center justify-end pr-1 text-emerald-600 dark:text-emerald-400 sm:hidden transition-opacity duration-300 animate-pulse"
        >
          <ChevronRight size={16} strokeWidth={3} />
        </div>
      )}
    </div>
  );
};

export default TableHorizontalScrollWrapper;
