import React, { useState } from 'react';

const GoalsPage: React.FC<any> = ({ onBack, goals, onAddGoal, onDeleteGoal, onUpdateGoal }) => {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && target) {
        // Envia para o Firebase (via App.tsx)
        onAddGoal({ 
            name, 
            targetAmount: parseFloat(target), 
            currentAmount: 0 
        });
        setName('');
        setTarget('');
        setShowForm(false);
    }
  };

  const calculateProgress = (current: number, target: number) => {
    if (!target) return 0;
    return Math.min(100, (current / target) * 100);
  };

  return (
    <div className="space-y-6 animate-in fade-in pt-4 pb-24">
      {/* Header Interno */}
      <div className="flex items-center gap-4 px-2">
        <button onClick={onBack} className="bg-slate-200 dark:bg-slate-800 p-3 rounded-xl text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            ←
        </button>
        <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Metas & Sonhos</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Planeje suas conquistas</p>
        </div>
      </div>

      {/* Botão Nova Meta */}
      {!showForm ? (
        <button 
            onClick={() => setShowForm(true)} 
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
            <span className="text-xl">+</span> Nova Meta
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-surface-secondary dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
            <h3 className="text-slate-900 dark:text-white font-bold">Criar Objetivo</h3>
            <div className="space-y-2">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Nome do Objetivo</label>
                <input 
                    placeholder="Ex: Viagem, Carro, Reserva..." 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500" 
                    autoFocus
                />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Valor Alvo (R$)</label>
                <input 
                    type="number" 
                    placeholder="0.00" 
                    value={target} 
                    onChange={e => setTarget(e.target.value)} 
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-3 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-500" 
                />
            </div>
            <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-bold shadow-lg">Salvar Meta</button>
            </div>
        </form>
      )}

      {/* Lista de Metas */}
      <div className="space-y-4">
        {goals && goals.map((g: any) => {
            const progress = calculateProgress(g.currentAmount, g.targetAmount);
            return (
                <div key={g.id} className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{g.name}</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                Falta: <span className="text-emerald-600 dark:text-emerald-400 font-bold">R$ {(g.targetAmount - g.currentAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </p>
                        </div>
                        <button 
                            onClick={() => { if(confirm('Excluir esta meta?')) onDeleteGoal(g.id); }} 
                            className="text-slate-400 hover:text-red-600 p-2"
                        >
                            🗑️
                        </button>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="relative h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                        <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-4">
                        <span>{progress.toFixed(0)}%</span>
                        <span>R$ {g.targetAmount.toLocaleString('pt-BR')}</span>
                    </div>

                    {/* Botões de Aporte Rápido */}
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => onUpdateGoal(g.id, g.currentAmount + 50)} 
                            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            + R$ 50
                        </button>
                        <button 
                            onClick={() => onUpdateGoal(g.id, g.currentAmount + 200)} 
                            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                        >
                            + R$ 200
                        </button>
                    </div>
                </div>
            );
        })}

        {(!goals || goals.length === 0) && !showForm && (
            <div className="text-center text-slate-500 dark:text-slate-400 py-12 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl">
                <p className="text-4xl mb-2 grayscale opacity-30">🎯</p>
                <p className="text-sm">Nenhuma meta definida ainda.</p>
            </div>
        )}
      </div>
    </div>
  );
};
export default GoalsPage;