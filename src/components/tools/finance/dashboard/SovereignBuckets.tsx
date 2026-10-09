import React, { useMemo, useState } from 'react';
import { Shield, Lock, Wallet, AlertTriangle, Target } from 'lucide-react';
import type { SovereignSnapshot } from '../../../../utils/calculations';
import {
  deriveSovereignBuckets,
  maskCurrency,
} from '../../../../utils/calculations';
import BucketDetailDrawer from './BucketDetailDrawer';

export interface SovereignBucketsProps {
  snapshot: SovereignSnapshot;
  marcoZero?: number;
  reserveCurrent?: number;
  isPrivacyMode?: boolean;
  variant?: 'light' | 'dark';
}

interface BucketMetaItem {
  key: string;
  actionId: string;
  label: string;
  sub: string;
  color: string;
  icon: React.ElementType;
}

const BUCKET_META: BucketMetaItem[] = [
  {
    key: 'comprometido',
    actionId: 'contas',
    label: 'Contas do Mês',
    sub: 'O que já está carimbado',
    color: '#f97316',
    icon: AlertTriangle,
  },
  {
    key: 'colchao',
    actionId: 'colchao',
    label: 'Colchão Emergencial',
    sub: 'Proteção imediata',
    color: '#0ea5e9',
    icon: Shield,
  },
  {
    key: 'reserve',
    actionId: 'reserva',
    label: 'Reserva de Emergência',
    sub: 'Proteção investida',
    color: '#10b981',
    icon: Lock,
  },
  {
    key: 'colchaoShortfall',
    actionId: 'falta-proteger',
    label: 'Falta no Colchão',
    sub: 'Meta pendente',
    color: '#8b5cf6',
    icon: Target,
  },
  {
    key: 'reserveShortfall',
    actionId: 'falta-reserva',
    label: 'Falta na Reserva',
    sub: 'Meta pendente',
    color: '#7c3aed',
    icon: Target,
  },
  {
    key: 'livre',
    actionId: 'disponivel',
    label: 'Disponível',
    sub: 'Saldo Livre',
    color: '#059669',
    icon: Wallet,
  },
];

const SovereignBuckets: React.FC<SovereignBucketsProps> = ({
  snapshot,
  marcoZero,
  reserveCurrent,
  isPrivacyMode = false,
  variant = 'light',
}) => {
  const isDark = variant === 'dark';

  const buckets = useMemo(
    () => deriveSovereignBuckets(snapshot, marcoZero, reserveCurrent),
    [snapshot, marcoZero, reserveCurrent]
  );

  const deficitAlert = useMemo(() => {
    if (isPrivacyMode) return null;
    const cashSurplus = (snapshot.accumulatedBalance ?? 0) - (snapshot.obligationsDeduction ?? 0);
    if (cashSurplus < 0) {
      return {
        title: 'Atenção ao Caixa:',
        description: `suas contas do mês superam seu caixa em ${maskCurrency(Math.abs(cashSurplus))}. Seu Colchão Emergencial deve ser acionado para amortecer este aperto.`,
        alertClass: isDark
          ? 'bg-rose-950/40 border-rose-800/50 text-rose-300'
          : 'bg-rose-50 border-rose-100 text-rose-700',
      };
    }
    if (buckets.structureInvaded) {
      const totalProtected = (buckets.colchao ?? 0) + (buckets.reserve ?? 0);
      return {
        title: 'Estrutura Financeira:',
        description: `Seus compromissos imediatos estão cobertos e você já possui ${maskCurrency(totalProtected)} guardados. Faltam ${maskCurrency(buckets.freedomDeficit)} para atingir 100% da sua meta de reserva.`,
        alertClass: isDark
          ? 'bg-sky-950/40 border-sky-800/50 text-sky-300'
          : 'bg-sky-50 border-sky-100 text-sky-800',
      };
    }
    if (snapshot.projectedBalance < 0) {
      return {
        title: 'Déficit de fluxo:',
        description: `o mês não se paga sozinho. Faltam ${maskCurrency(Math.abs(snapshot.projectedBalance))} para equilibrar suas receitas e despesas.`,
        alertClass: isDark
          ? 'bg-amber-950/40 border-amber-800/50 text-amber-300'
          : 'bg-amber-50 border-amber-100 text-amber-700',
      };
    }
    return null;
  }, [buckets, snapshot, isPrivacyMode, isDark]);

  const barItems = useMemo(() => {
    const items: { value: number; color: string; label: string }[] = [];
    if (buckets.comprometido > 0) items.push({ value: buckets.comprometido, color: '#f97316', label: 'Contas' });
    if ((buckets.colchao ?? buckets.marcoZero) > 0) items.push({ value: (buckets.colchao ?? buckets.marcoZero), color: '#0ea5e9', label: 'Colchão' });
    if (buckets.reserve > 0) items.push({ value: buckets.reserve, color: '#10b981', label: 'Reserva' });
    if (buckets.colchaoShortfall > 0) items.push({ value: buckets.colchaoShortfall, color: '#8b5cf6', label: 'Falta Colchão' });
    if (buckets.reserveShortfall > 0) items.push({ value: buckets.reserveShortfall, color: '#7c3aed', label: 'Falta Reserva' });
    if (buckets.livre > 0) items.push({ value: buckets.livre, color: '#059669', label: 'Disponível' });
    if (buckets.freedomDeficit > 0) items.push({ value: buckets.freedomDeficit, color: '#e11d48', label: 'Déficit' });
    return items;
  }, [buckets]);

  const barTotal = barItems.reduce((s, i) => s + i.value, 0);

  const format = (val: number) =>
    isPrivacyMode ? '••••' : maskCurrency(val);

  const getWidth = (val: number) =>
    barTotal > 0 ? Math.max((val / barTotal) * 100, val > 0 ? 2 : 0) : 0;

  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const handleBucketClick = (actionId: string) => {
    setSelectedActionId(actionId);
  };

  const handleCloseDrawer = () => {
    setSelectedActionId(null);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-section border p-4 md:p-5 space-y-4 ${
        isDark
          ? 'bg-slate-900/60 border-slate-700/80'
          : 'bg-surface-subtle border-slate-200'
      } group`}
    >
      <div className="absolute right-0 top-0 w-32 h-full opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
        <img 
          src="/assets/images/lifestyle/safety-protection.webp" 
          alt="Segurança" 
          className="w-full h-full object-cover"
        />
        <div className={`absolute inset-0 bg-gradient-to-l ${isDark ? 'from-transparent to-slate-900' : 'from-transparent to-white'}`} />
      </div>

      <div className="flex items-center justify-between gap-3 relative z-10">
        <p
          className={`text-xxs font-black uppercase tracking-ultra-wide ${
            isDark ? 'text-slate-500' : 'text-text-muted'
          }`}
        >
          Resumo financeiro
        </p>
        {buckets.freedomVelocity > 0 && !isPrivacyMode && (
          <p className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-text-muted'}`}>
            +{buckets.freedomVelocity} dias de tranquilidade este mês
          </p>
        )}
      </div>

      {!isPrivacyMode && barTotal > 0 && (
        <div
          className="flex h-2.5 rounded-full overflow-hidden bg-slate-200 ring-1 ring-slate-200"
          role="img"
          aria-label={`Composição: ${barItems.map((i) => `${i.label} ${maskCurrency(i.value)}`).join(', ')}`}
        >
          {barItems.map((item, i) => (
            <div
              key={i}
              className="h-full transition-all duration-500 ring-1 ring-white/60"
              style={{ width: `${getWidth(item.value)}%`, backgroundColor: item.color }}
              title={`${item.label}: ${maskCurrency(item.value)}`}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
        {BUCKET_META.map(({ key, actionId, label, sub, color, icon: Icon }) => {
          const value = (buckets as any)[key];
          const invaded = (key === 'colchao' || key === 'marcoZero') && buckets.structureInvaded;
          const isShortfall = key === 'colchaoShortfall' || key === 'reserveShortfall';

          if (value === 0 && isShortfall) return null;

          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-label={`${label}: ${format(value)}. ${sub}. Ativar para ver detalhes.`}
              onClick={() => handleBucketClick(actionId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleBucketClick(actionId);
                }
              }}
              className={`rounded-item p-3 border transition-all cursor-pointer hover:border-slate-300 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-action-sky ${
                isDark
                  ? 'bg-slate-800/50 border-slate-700/60'
                  : 'bg-white border-slate-200'
              } ${invaded ? 'ring-1 ring-rose-500/40 border-rose-300 border-dashed' : ''} ${isShortfall ? 'border-dashed' : ''}`}
            >
              <div className="flex items-center gap-1.5 mb-2">
                <div
                  className="p-1 rounded-lg"
                  style={{ backgroundColor: `${color}18`, color }}
                >
                  <Icon size={12} strokeWidth={2.5} />
                </div>
                <p
                  className={`text-[9px] font-black uppercase tracking-widest ${
                    isDark ? 'text-slate-500' : 'text-text-muted'
                  }`}
                >
                  {label}
                </p>
              </div>
              <p
                className={`text-sm font-black tracking-tight ${
                  invaded
                    ? 'text-rose-600'
                    : isDark
                      ? 'text-white'
                      : 'text-text-primary'
                }`}
              >
                {format(value)}
              </p>
              <p className={`text-[9px] font-medium mt-0.5 ${isDark ? 'text-slate-500' : 'text-text-muted'}`}>
                {invaded ? 'Dinheiro de segurança usado' : sub}
              </p>
            </div>
          );
        })}
      </div>

      {deficitAlert && (
        <div className={`flex items-start gap-2.5 rounded-2xl px-3 py-2.5 border ${deficitAlert.alertClass}`}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <p className="text-[10px] font-medium leading-relaxed">
            <span className="font-black">
              {deficitAlert.title}
            </span>{' '}
            {deficitAlert.description}
          </p>
        </div>
      )}

      <BucketDetailDrawer
        isOpen={selectedActionId !== null}
        onClose={handleCloseDrawer}
        actionId={selectedActionId}
        snapshot={snapshot}
        variant={variant}
      />
    </div>
  );
};

export default SovereignBuckets;
