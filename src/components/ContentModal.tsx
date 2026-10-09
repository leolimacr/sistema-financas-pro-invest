import React from 'react';

export default ({ children, isOpen, onClose }: any) =>
  isOpen ? (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[1000] animate-in fade-in duration-300">
      {/* Overlay para fechar ao clicar fora */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-md md:max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[95vh] relative z-10">
        {/* O 'corredor' da barra agora é fisicamente encurtado por margens verticais de 56px (1.5cm) */}
        <div className="overflow-y-auto my-14 px-6 md:px-8 flex-1">
          {children}
        </div>
      </div>
    </div>
  ) : null;
