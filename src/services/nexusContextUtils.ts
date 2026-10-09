import type { UserContext } from './nexusInsightEngine';
import type { DebtItem } from './debt/debt.types';
import { getCurrentInvoice } from '../utils/invoiceUtils';
import { MANUAL_DEBT_TYPES } from './debt/debt.constants';

export function extractUpcomingBill(ctx: UserContext, debts?: DebtItem[]): UserContext['upcomingCreditCardBill'] {
  // 1. Se o contexto já veio preenchido (ex: de um cálculo externo), usa ele.
  if (ctx.upcomingCreditCardBill) return ctx.upcomingCreditCardBill;

  const candidates: Array<{ 
    daysToClose: number; 
    estimatedValue: number; 
    cardName?: string; 
    cardId?: string; 
    dueDate?: string;
    isCard?: boolean;
  }> = [];

  // 2. Coleta dados de cartões reais
  if (ctx.cards && ctx.transactions) {
    ctx.cards.forEach(card => {
      const invoice = getCurrentInvoice(card, ctx.transactions!);
      if (invoice && invoice.total > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));

        const paidToCard = ctx.transactions!
          .filter(t => t.isBillPayment && t.linkedCardId === card.id && t.date >= invoice.periodStart && t.date <= invoice.periodEnd)
          .reduce((sum, t) => sum + t.amount, 0);
        const remainingAmount = Math.max(0, invoice.total - paidToCard);
        
        candidates.push({
          daysToClose: diffDays,
          estimatedValue: remainingAmount,
          cardName: card.name,
          cardId: card.id,
          dueDate: invoice.dueDate,
          isCard: true
        });
      }
    });
  }

  // 3. Coleta dados de dívidas (legado ou rotativo manual)
  if (debts) {
    const cardDebts = debts.filter(d => 
      (d.tipo === MANUAL_DEBT_TYPES.ROTATIVO || d.tipo === 'Cartão de crédito') && 
      d.dataVencimento
    );
    cardDebts.forEach(d => {
       const today = new Date();
       today.setHours(0, 0, 0, 0);
       const dueDate = new Date(d.dataVencimento!);
       dueDate.setHours(0, 0, 0, 0);
       const diffTime = dueDate.getTime() - today.getTime();
       const diffDays = Math.ceil(diffTime / (1000 * 3600 * 24));
       
       candidates.push({
         daysToClose: diffDays,
         estimatedValue: d.valorParcela || d.saldoDevedor,
         cardName: d.nome,
         isCard: false
       });
    });
  }

  if (candidates.length === 0) return undefined;

  // 4. Ordenação: Cartões primeiro, depois vencimento mais próximo
  candidates.sort((a, b) => {
    if (a.isCard && !b.isCard) return -1;
    if (!a.isCard && b.isCard) return 1;
    return a.daysToClose - b.daysToClose;
  });

  const nearest = candidates[0];

  // 5. Se 0 <= diffDays <= 5, retorna os dados
  if (nearest.daysToClose >= 0 && nearest.daysToClose <= 5) {
    return {
      daysToClose: nearest.daysToClose,
      estimatedValue: nearest.estimatedValue,
      cardName: nearest.cardName,
      cardId: nearest.cardId,
      dueDate: nearest.dueDate
    };
  }

  return undefined;
}
