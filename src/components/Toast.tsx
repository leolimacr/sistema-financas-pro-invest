import React from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

export interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            pointer-events-auto
            flex items-center justify-between
            min-w-[280px] max-w-md
            px-4 py-3 rounded-xl shadow-lg border
            animate-in slide-in-from-right-4 fade-in duration-300
            ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : ''}
            ${toast.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : ''}
            ${toast.type === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-800' : ''}
            ${toast.type === 'info' ? 'bg-blue-50 border-blue-100 text-blue-800' : ''}
          `}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 p-1 rounded-lg hover:bg-black/5 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
