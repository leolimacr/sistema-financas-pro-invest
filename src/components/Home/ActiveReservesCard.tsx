import React from 'react';
import { ShieldCheck, Calendar, Wallet } from 'lucide-react';
import type { Goal } from '../../services/goalService';

interface ActiveReservesCardProps {
  goals: Goal[];
}

const ActiveReservesCard: React.FC<ActiveReservesCardProps> = ({ goals }) => {
  const activeReserves = goals.filter(g => g.type === 'nexus_reserve' && g.ativa);

  if (activeReserves.length === 0) return null;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getDaysDiff = (targetDate: any) => {
    if (!targetDate) return null;
    
    let date: Date;
    if (typeof targetDate === 'string') {
      date = new Date(targetDate);
    } else if (targetDate.toDate) {
      date = targetDate.toDate();
    } else {
      date = new Date(targetDate);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

    if (diffDays === 0) return 'Vence hoje';
    if (diffDays < 0) return `Venceu há ${Math.abs(diffDays)} dias`;
    return `Vence em ${diffDays} dias`;
  };

  return (
    <div className="rounded-[2rem] border border-slate-200 dark:border-slate-800 border-l-4 border-l-emerald-500 bg-white dark:bg-slate-900 p-6 shadow-sm animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-100 dark:shadow-none text-white">
          <ShieldCheck size={18} />
        </div>
        <h3 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">
          Reservas Estratégicas
        </h3>
      </div>

      <div className="space-y-4">
        {activeReserves.map((goal) => (
          <div key={goal.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800/60 transition-all group">
            <div className="flex items-center gap-4">
              <div className="bg-white dark:bg-slate-700 p-2.5 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-sm group-hover:scale-110 transition-transform">
                <Wallet size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{goal.title}</span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  {formatCurrency(goal.targetAmount || 0)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1.5 rounded-full">
              <Calendar size={12} />
              {getDaysDiff(goal.targetDate)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveReservesCard;
