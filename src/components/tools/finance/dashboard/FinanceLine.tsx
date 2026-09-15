import React from 'react';

/**
 * Linha financeira — par rótulo/valor como uma unidade visual única.
 *
 * Responsivo por contexto (breakpoint `md:` = 768px, padrão consolidado
 * dos componentes financeiros; sem breakpoints arbitrários):
 * - Mobile (<md): linha compacta, sem separadores nem coluna larga —
 *   rótulo e valor próximos na mesma linha; o valor nunca é truncado.
 * - Desktop (md+): faixa completa com separador, coluna de valor com
 *   largura previsível alinhada à direita e largura máxima legível à esquerda.
 *
 * Sinais (+/−) e peso carregam o sentido; cor é apenas reforço.
 */

type Tone = 'neutral' | 'positive' | 'negative' | 'muted';

const toneClass: Record<Tone, string> = {
  neutral: 'text-text-primary',
  positive: 'text-action-primaryDark',
  negative: 'text-action-dangerDark',
  muted: 'text-text-muted',
};

interface FinanceLineProps {
  label: string;
  hint?: string;
  value: string;
  tone?: Tone;
}

export const FinanceLine: React.FC<FinanceLineProps> = ({
  label,
  hint,
  value,
  tone = 'neutral',
}) => (
  <div className="flex items-baseline justify-between gap-2 py-1.5 md:gap-6 md:py-2 md:border-b md:border-slate-100 md:last:border-b-0">
    <div className="min-w-0 flex-1 md:max-w-[38rem]">
      <p className="text-xs font-bold text-slate-700 leading-snug">{label}</p>
      {hint && (
        <p className="text-[10px] text-text-muted font-medium leading-snug mt-0.5">{hint}</p>
      )}
    </div>
    <p
      className={`shrink-0 whitespace-nowrap text-right text-sm font-black tabular-nums md:min-w-[10rem] ${toneClass[tone]}`}
    >
      {value}
    </p>
  </div>
);

interface FinanceTotalProps {
  label: string;
  hint?: string;
  value: string;
  tone?: Tone;
}

export const FinanceTotal: React.FC<FinanceTotalProps> = ({
  label,
  hint,
  value,
  tone = 'neutral',
}) => (
  <div className="border-t border-slate-200 mt-1 pt-2 flex items-baseline justify-between gap-2 md:gap-6 md:border-t-2 md:pt-3">
    <div className="min-w-0 flex-1 md:max-w-[38rem]">
      <p className="text-xs font-black text-text-primary uppercase tracking-ultra-wide">{label}</p>
      {hint && (
        <p className="text-[10px] text-text-muted font-medium leading-snug mt-0.5">{hint}</p>
      )}
    </div>
    <p
      className={`shrink-0 whitespace-nowrap text-right text-base md:text-lg font-black tabular-nums md:min-w-[10rem] ${toneClass[tone]}`}
    >
      {value}
    </p>
  </div>
);

interface FinanceCheckLineProps {
  checked: boolean;
  onChange: () => void;
  title: string;
  hint?: string;
  value: string;
  disabled?: boolean;
}

export const FinanceCheckLine: React.FC<FinanceCheckLineProps> = ({
  checked,
  onChange,
  title,
  hint,
  value,
  disabled = false,
}) => (
  <label className={`flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 py-1.5 transition-opacity md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-x-6 md:py-2.5 md:border-b md:border-slate-100 md:last:border-b-0 ${
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer group'
  }`}>
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={disabled ? undefined : onChange}
      className={`order-1 mt-0.5 h-3.5 w-3.5 shrink-0 self-start rounded border-surface-elevated text-brand-primary focus:ring-brand-primary/30 md:order-none md:col-start-1 md:row-span-2 md:mt-0 md:self-center ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    />
    {/* Mobile: título flexível com largura mínima — valor fica ao lado se couber,
        ou quebra para a linha de baixo do mesmo bloco se não houver espaço. */}
    <span className="order-2 min-w-[9rem] flex-1 text-xs font-bold text-slate-700 leading-snug group-hover:text-text-primary transition-colors md:order-none md:col-start-2 md:row-start-1 md:min-w-0">
      {title}
    </span>
    <span className="order-3 ml-auto shrink-0 whitespace-nowrap text-sm font-black tabular-nums text-text-primary md:order-none md:col-start-3 md:row-span-2 md:row-start-1 md:ml-0 md:self-center md:text-right md:min-w-[10rem]">
      {value}
    </span>
    {hint && (
      <span className="order-4 basis-full text-[10px] text-text-muted font-medium leading-snug md:order-none md:col-start-2 md:row-start-2 md:basis-auto">
        {hint}
      </span>
    )}
  </label>
);
