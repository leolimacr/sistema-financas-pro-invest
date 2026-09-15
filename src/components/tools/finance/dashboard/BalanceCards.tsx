import React, { useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { maskCurrency, calculatePreviousMonthClose, toIntegerCents } from '../../../../utils/calculations';
import { useExclusions } from '../../../../contexts/ExclusionsContext';
import { FinanceLine, FinanceTotal, FinanceCheckLine } from './FinanceLine';

interface VoucherCardInfo {
  id: string;
  name: string;
  balance: number;
  voucherType?: 'alimentacao' | 'refeicao' | 'outro';
}

export function getVoucherTitle(card: { name: string; voucherType?: string }): string {
  const nameLower = (card.name || '').toLowerCase();
  const isAlimentacao =
    card.voucherType === 'alimentacao' ||
    nameLower.includes('alimenta') ||
    /\bva\b/.test(nameLower);
  const isRefeicao =
    card.voucherType === 'refeicao' ||
    nameLower.includes('refei') ||
    /\bvr\b/.test(nameLower);

  if (isAlimentacao) {
    if (
      nameLower === 'alimentação' ||
      nameLower === 'alimentacao' ||
      nameLower === 'vale alimentação' ||
      nameLower === 'vale alimentacao' ||
      nameLower === 'cartão alimentação' ||
      nameLower === 'cartao alimentacao'
    ) {
      return 'Retirar o saldo do Cartão Alimentação';
    }
    return `Retirar o saldo do Cartão Alimentação (${card.name})`;
  }

  if (isRefeicao) {
    if (
      nameLower === 'refeição' ||
      nameLower === 'refeicao' ||
      nameLower === 'vale refeição' ||
      nameLower === 'vale refeicao' ||
      nameLower === 'cartão refeição' ||
      nameLower === 'cartao refeicao'
    ) {
      return 'Retirar o saldo do Cartão Refeição';
    }
    return `Retirar o saldo do Cartão Refeição (${card.name})`;
  }

  return `Retirar o saldo do Cartão Voucher (${card.name})`;
}

interface BalanceCardsProps {
  isPrivacyMode: boolean;
  saldoReal: number | null;
  receitasMes: number | null;
  despesasMes: number | null;
  reserveTarget: number;
  colchaoTarget: number;
  voucherCards: VoucherCardInfo[];
  transactions: any[];
  onOpenCardManager?: (cardId?: string) => void;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const BalanceCards: React.FC<BalanceCardsProps> = ({
  isPrivacyMode,
  saldoReal,
  receitasMes,
  despesasMes,
  reserveTarget,
  colchaoTarget,
  voucherCards,
  transactions,
  onOpenCardManager,
}) => {
  const { excluirReserva, excluirColchao, excluirVoucherMap, toggleReserva, toggleColchao, toggleVoucherCard, computeExclusions } = useExclusions();
  const fmt = (n: number) => (isPrivacyMode ? '••••••' : maskCurrency(n));

  // Loading skeleton — exibido até os dados do mês corrente estarem carregados
  if (saldoReal === null) {
    return (
      <div className="bg-surface-primary border border-border-strong rounded-panel p-5 shadow-panel border-l-4 border-l-brand-primary/40 animate-pulse">
        <div className="h-3 w-24 bg-surface-secondary rounded-full mb-3" />
        <div className="h-4 w-16 bg-surface-secondary rounded-full mb-1" />
        <div className="h-8 w-36 bg-surface-secondary rounded-xl mt-4" />
        <div className="border-t border-surface-elevated pt-3 mt-4 space-y-2">
          <div className="flex justify-between"><div className="h-3 w-28 bg-surface-secondary rounded-full" /><div className="h-4 w-20 bg-surface-secondary rounded-full" /></div>
          <div className="flex justify-between"><div className="h-3 w-24 bg-surface-secondary rounded-full" /><div className="h-4 w-20 bg-surface-secondary rounded-full" /></div>
          <div className="flex justify-between"><div className="h-3 w-32 bg-surface-secondary rounded-full" /><div className="h-4 w-20 bg-surface-secondary rounded-full" /></div>
        </div>
      </div>
    );
  }

  // Composição Soberana do Saldo Atual: Saldo em Conta + Saldos dos Cartões Voucher
  const totalVoucherCents = voucherCards.reduce(
    (acc, c) => acc + toIntegerCents(c.balance || 0),
    0
  );
  const saldoRealCents = toIntegerCents(saldoReal);
  const saldoBaseCents = saldoRealCents + totalVoucherCents;
  const saldoBase = saldoBaseCents / 100;
  const isSaldoBaseNegative = saldoBase < 0;

  const exclusaoTotal = computeExclusions(reserveTarget, colchaoTarget, voucherCards);
  const exclusaoTotalCents = toIntegerCents(exclusaoTotal);
  const saldoDisplayCents = saldoBaseCents - exclusaoTotalCents;
  const saldoDisplay = saldoDisplayCents / 100;
  const isNegative = saldoDisplay < 0;
  const hasExclusao = excluirReserva || excluirColchao || Object.values(excluirVoucherMap).some(Boolean);

  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();
  const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
  const anoAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;

  const labelAnterior = `${MESES[mesAnterior]}/${anoAnterior}`;
  const labelAtual = `${MESES[mesAtual]}/${anoAtual}`;

  const saldoAnterior = calculatePreviousMonthClose(transactions, new Date());

  return (
    <div className="bg-surface-primary border border-border-strong rounded-panel p-5 shadow-panel border-l-4 border-l-brand-primary/40">
      <div className="flex flex-col gap-4">
        {/* Título */}
        <h2 className="text-sm font-black text-text-primary tracking-tight">
          Saldo Atual
        </h2>
        <p className="text-[10px] text-text-muted font-medium -mt-2 leading-relaxed">
          {totalVoucherCents > 0
            ? 'Total de recursos disponíveis hoje (conta bancária e cartões de benefício).'
            : 'Dinheiro que realmente está na sua conta bancária hoje.'}
          <span className="block mt-0.5 text-[9px] text-text-muted italic">
            {totalVoucherCents > 0
              ? 'Marque os cartões voucher abaixo para desconsiderá-los e visualizar estritamente o saldo em conta bancária.'
              : 'Reflete o fluxo de caixa efetivado em conta: receitas menos despesas à vista e pagamentos de cartão. Compras no cartão de crédito e obrigações a prazo não são deduzidas aqui.'}
          </span>
        </p>

        {/* Valor principal: Sempre o saldo íntegro / cheio */}
        <div className="flex items-baseline justify-between">
          <h2
            className={`text-3xl font-black tabular-nums tracking-tight ${
              isSaldoBaseNegative ? 'text-status-danger' : 'text-text-primary'
            }`}
          >
            {fmt(saldoBase)}
          </h2>
        </div>

        {/* Decomposição mensal */}
        <div className="border-t border-surface-elevated pt-1" role="group" aria-label="Decomposição do saldo: Saldo anterior + Receitas do mês − Despesas do mês = Saldo Atual">
          <FinanceLine
            label={`Saldo anterior de ${labelAnterior}`}
            value={fmt(saldoAnterior)}
          />
          <FinanceLine
            label={`Receitas de ${labelAtual}`}
            value={`+ ${fmt(receitasMes ?? 0)}`}
            tone="positive"
          />
          <FinanceLine
            label={`Despesas já pagas de ${labelAtual}`}
            hint="Compras feitas no cartão de crédito não entram nas despesas — apenas os pagamentos das faturas estão neste total."
            value={`− ${fmt(despesasMes ?? 0)}`}
            tone="negative"
          />

          {/* Checkboxes de exclusão */}
          <div className="pt-1">
            <FinanceCheckLine
              checked={excluirReserva}
              onChange={toggleReserva}
              title="Retirar minha reserva de emergência"
              hint={`Simulação: ${fmt(reserveTarget)} abatidos do SALDO ATUAL. Valor separado para proteção — não é despesa do mês.`}
              value={fmt(reserveTarget)}
            />
            <FinanceCheckLine
              checked={excluirColchao}
              onChange={toggleColchao}
              title="Retirar o meu Colchão emergencial"
              hint={`Simulação: ${fmt(colchaoTarget)} abatidos do SALDO ATUAL. Valor separado para proteção — não é despesa do mês.`}
              value={fmt(colchaoTarget)}
            />
            {voucherCards.map(card => {
              const isZero = (card.balance || 0) <= 0;
              const title = getVoucherTitle(card);
              return (
                <div key={card.id} className="flex items-center justify-between group">
                  <div className="flex-1 min-w-0">
                    <FinanceCheckLine
                      checked={!isZero && !!excluirVoucherMap[card.id]}
                      disabled={isZero}
                      onChange={() => !isZero && toggleVoucherCard(card.id)}
                      title={title}
                      hint={
                        isZero
                          ? 'Saldo zerado neste cartão voucher.'
                          : `Simulação: ${fmt(card.balance)} abatidos do SALDO ATUAL para ver o saldo real em conta.`
                      }
                      value={fmt(card.balance || 0)}
                    />
                  </div>
                  {onOpenCardManager && (
                    <button
                      type="button"
                      onClick={() => onOpenCardManager(card.id)}
                      className="ml-2 p-1.5 text-text-muted hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all shrink-0 active:scale-95"
                      title={`Ver extrato do cartão ${card.name}`}
                      aria-label={`Ver extrato do cartão ${card.name}`}
                    >
                      <Receipt size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <FinanceTotal
            label={hasExclusao ? 'Saldo Atual (com exclusões)' : 'Saldo Atual'}
            value={fmt(saldoDisplay)}
            tone={isNegative ? 'negative' : 'neutral'}
          />
        </div>

        {/* Nota explicativa */}
        <p className="text-[9px] text-text-muted font-medium leading-relaxed">
          O saldo do fechamento de {labelAnterior} forma o saldo atual de {labelAtual}.
          <span className="block mt-0.5 text-text-muted">
            O Extrato / filtragem geral inclui o fluxo bruto (todas as despesas), enquanto o Saldo Atual reflete apenas o fluxo de caixa efetivado em conta.
          </span>
        </p>
      </div>
    </div>
  );
};

export default BalanceCards;
