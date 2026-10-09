import React, { useRef, useEffect } from 'react';

// Textarea com auto-resize para inputs de compromisso (edição e adição).
// Cresce verticalmente conforme o conteúdo, mantendo largura fluida.
export function AutoResizeTextarea({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  autoFocus,
  rows = 1,
  className = '',
  style,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      autoFocus={autoFocus}
      rows={rows}
      className={`flex-1 text-sm bg-transparent outline-none resize-none ${className}`}
      style={{ minHeight: '20px', lineHeight: '17px', ...style }}
      {...props}
    />
  );
}

export default AutoResizeTextarea;
