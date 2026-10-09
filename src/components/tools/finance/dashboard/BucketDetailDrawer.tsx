import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Shield, Lock, Wallet, AlertTriangle, Target } from 'lucide-react';
import type { SovereignSnapshot } from '../../../../utils/calculations';
import { maskCurrency } from '../../../../utils/calculations';

interface BucketDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  actionId: string | null;
  snapshot: SovereignSnapshot;
  variant?: 'light' | 'dark';
}

interface BucketHeader {
  icon: React.ElementType;
  label: string;
  color: string;
}

const BUCKET_HEADERS: Record<string, BucketHeader> = {
  contas: { icon: AlertTriangle, label: 'Contas do Mês', color: '#f97316' },
  colchao: { icon: Shield, label: 'Colchão Emergencial', color: '#0ea5e9' },
  reserva: { icon: Lock, label: 'Reserva de Emergência', color: '#10b981' },
  'falta-proteger': { icon: Target, label: 'Falta no Colchão', color: '#8b5cf6' },
  'falta-reserva': { icon: Target, label: 'Falta na Reserva', color: '#a78bfa' },
  disponivel: { icon: Wallet, label: 'Saldo Livre', color: '#059669' },
};

const ACTION_ROUTES: Record<string, string> = {
  contas: '/app/controla',
  colchao: '/app/central',
  reserva: '/app/central',
  'falta-proteger': '/app/central',
  'falta-reserva': '/app/central',
};

const ACTION_CTA: Record<string, string> = {
  contas: 'Acessar Lançamentos e Fluxo',
  colchao: 'Configurar Proteção na Central',
  reserva: 'Configurar Proteção na Central',
  'falta-proteger': 'Configurar Proteção na Central',
  'falta-reserva': 'Configurar Proteção na Central',
};

function DisponivelContent({ snapshot }: { snapshot: SovereignSnapshot }) {
  const { accumulatedBalance, obligationsDeduction, totalProtectionTarget, sovereignFreeBalance } = snapshot;
  const livre = Math.max(0, sovereignFreeBalance);
  const hasDeficit = sovereignFreeBalance < 0;

  const rows: { label: string; value: number; color: string; isMinus?: boolean }[] = [
    { label: 'Saldo Total em Conta', value: accumulatedBalance, color: '#64748b' },
    { label: 'Contas e pendências', value: obligationsDeduction, color: '#f97316', isMinus: true },
    { label: 'Base de proteção (Colchão + Reserva)', value: totalProtectionTarget, color: '#0ea5e9', isMinus: true },
  ];

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-emerald-500 pl-4">
        <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
          Cálculo do Saldo Livre
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
          O valor livre para novos planos após garantir suas contas do mês e sua base de proteção.
        </p>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              {r.isMinus && <span className="text-slate-500 dark:text-slate-400 font-black text-sm">−</span>}
              <span className="text-xs font-bold text-slate-500 dark:text-slate-300">{r.label}</span>
            </div>
            <span className="text-sm font-black" style={{ color: r.color }}>
              {maskCurrency(r.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
        <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 rounded-xl px-4 py-4 border border-emerald-100 dark:border-emerald-800/60">
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Saldo Livre
          </span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {maskCurrency(livre)}
          </span>
        </div>
      </div>

      {hasDeficit && (
        <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/60 rounded-2xl px-4 py-3">
          <p className="text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed font-medium">
            Seu saldo acumulado cobre as obrigações imediatas e está prioritariamente alocado para sua segurança (Colchão e Reserva de Emergência). O Saldo Livre passará a acumular quando as metas de proteção forem 100% atingidas.
          </p>
        </div>
      )}

      <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-800/60 rounded-2xl p-4">
        <p className="text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed font-medium">
          <span className="font-black">Fórmula:</span> Saldo Total − Contas do mês − Meta de Proteção = Saldo Livre (mínimo R$ 0,00)
        </p>
      </div>
    </div>
  );
}

interface QuickViewContentProps {
  actionId: string;
  snapshot: SovereignSnapshot;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

function QuickViewContent({ actionId, snapshot, onClose, onNavigate }: QuickViewContentProps) {
  const route = ACTION_ROUTES[actionId];
  const ctaLabel = ACTION_CTA[actionId];
  const header = BUCKET_HEADERS[actionId];

  const metrics: { label: string; value: number; color: string; unit?: string }[] = [];

  if (actionId === 'contas') {
    metrics.push(
      { label: 'Total comprometido', value: snapshot.obligationsDeduction, color: '#f97316' },
      { label: 'Saldo do mês', value: snapshot.monthBalance, color: '#64748b' },
      { label: 'Projeção mensal', value: snapshot.projectedBalance, color: snapshot.projectedBalance < 0 ? '#e11d48' : '#10b981' },
    );
  } else if (actionId === 'colchao') {
    metrics.push(
      { label: 'Meta', value: snapshot.colchaoTarget, color: '#64748b' },
      { label: 'Coberto pelo saldo', value: snapshot.colchaoCoverage, color: '#0ea5e9' },
      { label: 'Falta acumular', value: snapshot.colchaoShortfall, color: snapshot.colchaoShortfall > 0 ? '#8b5cf6' : '#10b981' },
    );
  } else if (actionId === 'reserva') {
    metrics.push(
      { label: 'Meta', value: snapshot.reserveTarget, color: '#64748b' },
      { label: 'Coberto pelo saldo', value: snapshot.reserveCoverage, color: '#10b981' },
      { label: 'Falta acumular', value: snapshot.reserveShortfall, color: snapshot.reserveShortfall > 0 ? '#7c3aed' : '#10b981' },
    );
  } else if (actionId === 'falta-proteger' || actionId === 'falta-reserva') {
    const shortfall = actionId === 'falta-proteger' ? snapshot.colchaoShortfall : snapshot.reserveShortfall;
    const complementLabel = actionId === 'falta-proteger' ? 'Colchão Emergencial' : 'Reserva';
    metrics.push(
      { label: `Falta para o ${complementLabel}`, value: shortfall, color: header.color },
      { label: 'Prioridade', value: 1, color: '#64748b', unit: 'alta' },
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-l-4 pl-4" style={{ borderColor: header.color }}>
        <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
          Resumo rápido
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
          {header.label} — visão geral dos valores.
        </p>
      </div>

      <div className="space-y-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-300">{m.label}</span>
            <span className="text-sm font-black" style={{ color: m.color }}>
              {m.unit ?? maskCurrency(m.value)}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
        <button
          type="button"
          onClick={() => {
            onClose();
            onNavigate(route);
          }}
          className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg flex items-center justify-center gap-2"
          style={{
            backgroundColor: header.color,
            color: '#fff',
            boxShadow: `${header.color}33 0px 10px 20px -5px`,
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

const BucketDetailDrawer: React.FC<BucketDetailDrawerProps> = ({
  isOpen,
  onClose,
  actionId,
  snapshot,
  variant = 'light',
}) => {
  const navigate = useNavigate();
  const header = actionId ? BUCKET_HEADERS[actionId] : null;
  const isDark = variant === 'dark';

  if (!isOpen || !actionId || !header) return null;

  const Icon = header.icon;

  const handleNavigate = (route: string) => {
    navigate(route);
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative w-full max-w-md h-full shadow-2xl pt-20 p-6 overflow-y-auto animate-in slide-in-from-right duration-300 ${
          isDark ? 'bg-slate-900 border-l border-slate-700' : 'bg-white'
        }`}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${header.color}18`, color: header.color }}
            >
              <Icon size={20} />
            </div>
            <h2 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
              {header.label}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {actionId === 'disponivel' ? (
          <DisponivelContent snapshot={snapshot} />
        ) : (
          <QuickViewContent
            actionId={actionId}
            snapshot={snapshot}
            onClose={onClose}
            onNavigate={handleNavigate}
          />
        )}
      </div>
    </div>
  );
};

export default BucketDetailDrawer;
