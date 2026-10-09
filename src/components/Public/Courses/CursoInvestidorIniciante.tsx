import React from 'react';

export const metadata = {
  id: 'investidor-iniciante',
  title: 'Investidor Iniciante',
  category: 'Fundamentos',
  excerpt: 'Aprenda os conceitos básicos para começar a investir com segurança.',
  duration: '4 horas',
  modules: 8,
  icon: '📘'
};

export const CursoInvestidorIniciante: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-slate-300">
      <h1 className="text-4xl font-black text-white mb-6">Investidor Iniciante</h1>
      <p className="text-lg leading-relaxed">
        Conteúdo completo do curso será desenvolvido aqui.
      </p>
    </div>
  );
};