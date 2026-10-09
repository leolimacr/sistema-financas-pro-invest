import { FPI_COPY } from '../../theme/fpiVoiceGuide';
import { Plus } from 'lucide-react';

interface QuickActionCardProps {
  onAction: () => void;
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({ onAction }) => {
  return (
    <button
      type="button"
      onClick={onAction}
      className="w-full group relative overflow-hidden rounded-[2rem] p-6 text-left transition-all active:scale-[0.98] border bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xl hover:-translate-y-0.5 shadow-sm"
    >
      <div className="flex items-center gap-5">
        <div className="p-4 rounded-2xl transition-all bg-emerald-500 text-white shadow-lg shadow-emerald-200 group-hover:scale-110">
          <Plus size={24} strokeWidth={3} />
        </div>
        <div>
          <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
            {FPI_COPY.quickActionTitle}
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5 text-emerald-600">
            {FPI_COPY.quickActionSubtitle}
          </p>
        </div>
      </div>
    </button>
  );
};

export default QuickActionCard;
