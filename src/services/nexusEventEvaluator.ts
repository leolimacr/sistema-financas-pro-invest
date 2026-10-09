import type { NexusInsight } from './nexusInsightEngine';
import type {
  TransactionCreatedEvent,
  TransactionUpdatedEvent,
  TransactionDeletedEvent,
  CardUsageUpdatedEvent,
  CardInvoiceOverdueEvent,
  DebtCreatedEvent,
  DebtUpdatedEvent,
  DebtAmortizedEvent,
  DebtDeletedEvent,
} from '../core/orchestration/domainEvents';

const LARGE_INCOME_THRESHOLD = 2000;
const LARGE_EXPENSE_THRESHOLD = 1500;
const SIGNIFICANT_AMOUNT_CHANGE = 750;
const SIGNIFICANT_CARD_USAGE_JUMP = 2000;
const SIGNIFICANT_CREDIT_RECOVERY = 1000;
const SIGNIFICANT_DEBT_AMOUNT = 5000;
const SIGNIFICANT_DEBT_DELETED = 2000;
const SIGNIFICANT_INSTALLMENT_PROGRESS = 0.5;

export function evaluateTransactionCreated(
  payload: TransactionCreatedEvent['payload']
): NexusInsight | null {
  const amount = payload.transaction.amount || 0;

  if (payload.transaction.isBillPayment && !payload.transaction.linkedRecurringBillId) {
    return {
      id: 'nexus-event-bill-payment',
      message: {
        title: 'Pagamento de fatura registrado',
        body: `{prefix} Registrei o pagamento de fatura de {value}. O limite do cartão foi ajustado automaticamente.`,
        ctaLabel: 'Ver Cartões',
      },
      deepLink: 'cartoes',
      priority: 'media',
    };
  }

  if (payload.transaction.linkedDebtId) {
    return {
      id: 'nexus-event-debt-amortization',
      message: {
        title: 'Amortização de dívida registrada',
        body: `{prefix} O valor de {value} foi abatido da dívida vinculada. Continue avançando na estratégia de desalavancagem.`,
        ctaLabel: 'Ver Dívidas',
      },
      deepLink: 'minhas-dividas',
      priority: 'media',
    };
  }

  if (payload.transaction.type === 'income' && amount >= LARGE_INCOME_THRESHOLD) {
    return {
      id: 'nexus-event-large-income',
      message: {
        title: 'Entrada de valor relevante',
        body: `{prefix} Recebi um movimento de {value}. Duas rotas: reforçar o Colchão Emergencial ou redirecionar para a estratégia de dívidas.`,
        ctaLabel: 'Ver Estrutura',
      },
      deepLink: 'home',
      priority: 'media',
      action: { label: 'Reservar parte', type: 'reserve' },
    };
  }

  if (payload.transaction.type === 'expense' && amount >= LARGE_EXPENSE_THRESHOLD) {
    return {
      id: 'nexus-event-large-expense',
      message: {
        title: 'Despesa significativa',
        body: `{prefix} Movimento de {value} registrado. Acompanhe o impacto na sua Disponibilidade Real.`,
        ctaLabel: 'Ver Controla',
      },
      deepLink: 'manager',
      priority: 'baixa',
    };
  }

  return null;
}

export function evaluateTransactionUpdated(
  payload: TransactionUpdatedEvent['payload']
): NexusInsight | null {
  const oldAmount = payload.previousTransaction?.amount || 0;
  const newAmount = payload.transaction.amount || 0;
  const diff = Math.abs(newAmount - oldAmount);

  if (diff >= SIGNIFICANT_AMOUNT_CHANGE) {
    return {
      id: 'nexus-event-transaction-updated',
      message: {
        title: 'Movimento atualizado',
        body: `{prefix} O valor do lançamento foi alterado em {diff}. A estrutura financeira foi recalculada.`,
        ctaLabel: 'Ver Lançamento',
      },
      deepLink: 'controla',
      priority: 'baixa',
    };
  }

  const hadLinkedDebt = !!payload.previousTransaction?.linkedDebtId;
  const hasLinkedDebt = !!payload.transaction.linkedDebtId;
  if (hadLinkedDebt !== hasLinkedDebt || payload.previousTransaction?.linkedDebtId !== payload.transaction.linkedDebtId) {
    return {
      id: 'nexus-event-debt-link-changed',
      message: {
        title: 'Vínculo de dívida ajustado',
        body: `{prefix} O vínculo com a dívida foi alterado. O saldo devedor foi recalculado.`,
        ctaLabel: 'Ver Dívidas',
      },
      deepLink: 'minhas-dividas',
      priority: 'media',
    };
  }

  return null;
}

export function evaluateTransactionDeleted(
  payload: TransactionDeletedEvent['payload']
): NexusInsight | null {
  const amount = payload.previousTransaction?.amount || 0;

  if (payload.previousTransaction?.linkedDebtId) {
    return {
      id: 'nexus-event-debt-rollback',
      message: {
        title: 'Estorno de amortização',
        body: `{prefix} Ao excluir o movimento, o saldo da dívida vinculada foi restaurado em {value}.`,
        ctaLabel: 'Ver Dívidas',
      },
      deepLink: 'minhas-dividas',
      priority: 'media',
    };
  }

  if (amount >= SIGNIFICANT_AMOUNT_CHANGE) {
    return {
      id: 'nexus-event-transaction-deleted',
      message: {
        title: 'Movimento removido',
        body: `{prefix} Um lançamento de {value} foi excluído. A estrutura financeira foi recalculada.`,
        ctaLabel: 'Ver Controla',
      },
      deepLink: 'manager',
      priority: 'baixa',
    };
  }

  return null;
}

export function evaluateCardUsageUpdated(
  payload: CardUsageUpdatedEvent['payload']
): NexusInsight | null {
  const jump = payload.newSaldoUtilizado - payload.previousSaldoUtilizado;

  if (payload.reason === 'purchase' && jump >= SIGNIFICANT_CARD_USAGE_JUMP) {
    return {
      id: 'nexus-event-card-pressure',
      message: {
        title: 'Pressão no limite do cartão',
        body: `{prefix} O saldo utilizado do cartão subiu {jump}. Acompanhe a fatura para não apertar sua folga do mês.`,
        ctaLabel: 'Ver Cartões',
      },
      deepLink: 'cartoes',
      priority: 'media',
      action: { label: 'Pagar fatura', type: 'pay_invoice', payload: { cardId: payload.cardId, amount: jump } },
    };
  }

  if (payload.reason === 'bill_payment' && Math.abs(jump) >= SIGNIFICANT_CREDIT_RECOVERY) {
    return {
      id: 'nexus-event-card-recovery',
      message: {
        title: 'Limite recuperado',
        body: `{prefix} O pagamento da fatura liberou {jump} de limite no cartão.`,
        ctaLabel: 'Ver Cartões',
      },
      deepLink: 'cartoes',
      priority: 'baixa',
    };
  }

  if (payload.reason === 'rollback') {
    return {
      id: 'nexus-event-card-rollback',
      message: {
        title: 'Estorno de compra',
        body: `{prefix} O limite de {jump} foi restaurado no cartão após a exclusão do lançamento.`,
        ctaLabel: 'Ver Cartões',
      },
      deepLink: 'cartoes',
      priority: 'baixa',
    };
  }

  if (payload.reason === 'edit' && Math.abs(jump) >= SIGNIFICANT_CARD_USAGE_JUMP / 2) {
    return {
      id: 'nexus-event-card-edit',
      message: {
        title: 'Ajuste no cartão',
        body: `{prefix} O saldo utilizado do cartão foi ajustado em {jump} devido a uma edição.`,
        ctaLabel: 'Ver Cartões',
      },
      deepLink: 'cartoes',
      priority: 'baixa',
    };
  }

  return null;
}

export function evaluateDebtCreated(
  payload: DebtCreatedEvent['payload']
): NexusInsight | null {
  const amount = payload.debt.saldoDevedor || 0;

  if (amount >= SIGNIFICANT_DEBT_AMOUNT) {
    return {
      id: 'nexus-event-debt-created',
      message: {
        title: 'Nova dívida relevante',
        body: `{prefix} Dívida de {value} registrada. O Nexus pode traçar uma estratégia de quitação acelerada.`,
        ctaLabel: 'Criar Estratégia',
      },
      deepLink: 'minhas-dividas',
      priority: 'media',
    };
  }

  if (amount >= SIGNIFICANT_AMOUNT_CHANGE) {
    return {
      id: 'nexus-event-debt-created-small',
      message: {
        title: 'Dívida cadastrada',
        body: `{prefix} Nova dívida de {value} registrada. A estratégia de desalavancagem foi atualizada.`,
        ctaLabel: 'Ver Dívidas',
      },
      deepLink: 'minhas-dividas',
      priority: 'baixa',
    };
  }

  return null;
}

export function evaluateDebtUpdated(
  payload: DebtUpdatedEvent['payload']
): NexusInsight | null {
  const oldSaldo = payload.previousDebt?.saldoDevedor || 0;
  const newSaldo = (payload.changes.saldoDevedor as number) ?? oldSaldo;
  const diff = Math.abs(newSaldo - oldSaldo);

  if (diff < SIGNIFICANT_AMOUNT_CHANGE) return null;

  return {
    id: 'nexus-event-debt-updated',
    message: {
      title: newSaldo < oldSaldo ? 'Dívida reduzida' : 'Dívida ajustada',
      body: `{prefix} O saldo da dívida foi alterado em {diff}. Acompanhe sua evolução na Central.`,
      ctaLabel: 'Ver Dívidas',
    },
    deepLink: 'minhas-dividas',
    priority: 'baixa',
  };
}

export function evaluateDebtAmortized(
  payload: DebtAmortizedEvent['payload']
): NexusInsight | null {
  if (payload.newSaldo <= 0) {
    return {
      id: 'nexus-event-debt-paid-off',
      message: {
        title: 'Dívida totalmente quitada!',
        body: `{prefix} A dívida foi integralmente paga! Foram abatidos {amount} — o saldo final é zero. Mais um passo rumo à liberdade financeira.`,
        ctaLabel: 'Ver Dívidas',
      },
      deepLink: 'minhas-dividas',
      priority: 'alta',
      action: { label: 'Próximo passo', type: 'adjust' },
    };
  }

  if (payload.previousSaldo > 0 && payload.newSaldo <= payload.previousSaldo * (1 - SIGNIFICANT_INSTALLMENT_PROGRESS)) {
    return {
      id: 'nexus-event-debt-progress',
      message: {
        title: 'Progresso significativo',
        body: `{prefix} Você já quitou mais da metade dessa dívida! Saldo atual: {newSaldo} (de {previousSaldo}).`,
        ctaLabel: 'Ver Dívidas',
      },
      deepLink: 'minhas-dividas',
      priority: 'media',
    };
  }

  if (payload.amount >= SIGNIFICANT_AMOUNT_CHANGE) {
    return {
      id: 'nexus-event-debt-amortized',
      message: {
        title: 'Amortização registrada',
        body: `{prefix} Foram abatidos {amount} da dívida. Saldo restante: {newSaldo}.`,
        ctaLabel: 'Ver Dívidas',
      },
      deepLink: 'minhas-dividas',
      priority: 'baixa',
    };
  }

  return null;
}

export function evaluateCardInvoiceOverdue(
  payload: CardInvoiceOverdueEvent['payload']
): NexusInsight | null {
  return {
    id: 'nexus-event-card-invoice-overdue',
    message: {
      title: 'Fatura vencida',
      body: '{prefix} A fatura do {cardName} venceu em {dueDate} com R$ {remainingAmount} em aberto. Registrar como dívida rotativa?',
      ctaLabel: 'Converter em Dívida',
    },
    deepLink: 'minhas-dividas',
    priority: 'alta',
    action: {
      label: 'Registrar Rotativo',
      type: 'convert_rotativo',
      payload: {
        cardId: payload.cardId,
        invoiceId: payload.invoiceId,
        periodEnd: payload.periodEnd,
        remainingAmount: payload.remainingAmount,
        dueDate: payload.dueDate,
        cardName: payload.cardName,
      },
    },
  };
}

export function evaluateDebtDeleted(
  payload: DebtDeletedEvent['payload']
): NexusInsight | null {
  const amount = payload.previousDebt?.saldoDevedor || 0;

  if (amount >= SIGNIFICANT_DEBT_DELETED) {
    return {
      id: 'nexus-event-debt-deleted',
      message: {
        title: 'Dívida removida',
        body: `{prefix} Dívida de {value} foi excluída. A pressão sobre sua estrutura financeira diminuiu.`,
        ctaLabel: 'Ver Dívidas',
      },
      deepLink: 'minhas-dividas',
      priority: 'media',
    };
  }

  if (amount >= SIGNIFICANT_AMOUNT_CHANGE) {
    return {
      id: 'nexus-event-debt-deleted-small',
      message: {
        title: 'Dívida removida',
        body: `{prefix} Uma dívida de {value} foi excluída do cadastro.`,
        ctaLabel: 'Ver Dívidas',
      },
      deepLink: 'minhas-dividas',
      priority: 'baixa',
    };
  }

  return null;
}
