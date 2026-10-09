import type { CreditCard, Transaction, RecurringBill } from '../types';

/**
 * Verifica se uma conta recorrente foi paga no mês corrente.
 *
 * REGRA 1 (dados novos, prioridade absoluta): `linkedRecurringBillId === bill.id` → paga.
 * REGRA 2 (legado sem link — restrita e determinística, cumulativa):
 *   a) sem `linkedRecurringBillId` (link para outra conta → não é desta);
 *   b) nome normalizado EXATO (trim + lowercase + sem diacríticos);
 *      nome parcial ("Luz" × "Luzerne") NUNCA casa; nomes vazios NUNCA casam;
 *   c) categoria, quando presente nos dois lados, deve ser igual
 *      (categoria sozinha NUNCA decide);
 *   d) valor, quando finito e > 0 nos dois lados, deve diferir no máximo
 *      max(0.01, 1% do valor da conta); divergência → não paga.
 * REGRA 3 (ambíguo → pendente): fora da Regra 1 e sem cumprir toda a Regra 2
 *   → NÃO paga. Na dúvida, a conta permanece pendente.
 */
function normalizeBillName(value: string | undefined | null): string {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function isBillPaid(bill: RecurringBill, transactions: Transaction[]): boolean {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Regra 0: Pagamento explícito registrado na conta recorrente no mês corrente
  if (bill.lastPaidDate) {
    const raw = bill.lastPaidDate;
    const lastPaid = new Date(raw.includes('T') ? raw : raw.replace(/-/g, '/'));
    if (!isNaN(lastPaid.getTime()) && lastPaid.getMonth() === currentMonth && lastPaid.getFullYear() === currentYear) {
      return true;
    }
  }

  const billName = normalizeBillName(bill.name);

  return transactions.some(t => {
    if (t.type !== 'expense') return false;

    const tDate = new Date(t.date.replace(/-/g, '/'));
    const isSameMonth = tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;

    if (!isSameMonth) return false;

    // Regra 1: link explícito (match exato, sem falso-positivos)
    if (t.linkedRecurringBillId && bill.id && t.linkedRecurringBillId === bill.id) return true;

    // Regra 2: fallback legado restrito
    if (t.linkedRecurringBillId) return false; // vínculo com outra conta
    const txName = normalizeBillName(t.description);
    if (!billName || !txName || txName !== billName) return false;
    if (t.category && bill.category && t.category !== bill.category) return false;

    const txAmount = Number(t.amount);
    if (Number.isFinite(txAmount) && txAmount > 0 && Number.isFinite(bill.amount) && bill.amount > 0) {
      const tolerance = Math.max(0.01, Math.abs(bill.amount) * 0.01);
      if (Math.abs(txAmount - bill.amount) > tolerance) return false;
    }

    return true;
  });
}

export function getCurrentInvoice(
  card: CreditCard,
  transactions: Transaction[]
): { total: number; periodStart: string; periodEnd: string; dueDate: string } | null {
  if (!card.closingDay || !card.dueDay) return null;

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let startYear, startMonth, startDay;
  let endYear, endMonth, endDay;
  let dueYear, dueMonth, dueDay;

  if (currentDay > card.closingDay) {
    // Período: 16/05 a 15/06 (se hoje > 15/05)
    startYear = currentYear;
    startMonth = currentMonth;
    startDay = card.closingDay + 1;

    endYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    endMonth = (currentMonth + 1) % 12;
    endDay = card.closingDay;

    // Vencimento é no mês do fim do período? Geralmente sim.
    // Usando a lógica do prompt: dueDate baseado no período.
    dueYear = endYear;
    dueMonth = endMonth;
    dueDay = card.dueDay;
    
    // Se o dia de vencimento for menor que o de fechamento, o vencimento costuma ser no mês seguinte ao fechamento.
    // Mas vamos manter simples conforme o prompt ou ajustar se necessário.
    // Prompt diz: "Calcule a data de vencimento (dueDate) com base em dueDay e no período."
    if (dueDay < endDay) {
      dueMonth = (dueMonth + 1) % 12;
      if (dueMonth === 0) dueYear++;
    }
  } else {
    // Período: 16/04 a 15/05 (se hoje <= 15/05)
    startYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    startMonth = (currentMonth - 1 + 12) % 12;
    startDay = card.closingDay + 1;

    endYear = currentYear;
    endMonth = currentMonth;
    endDay = card.closingDay;

    dueYear = endYear;
    dueMonth = endMonth;
    dueDay = card.dueDay;

    if (dueDay < endDay) {
      dueMonth = (dueMonth + 1) % 12;
      if (dueMonth === 0) dueYear++;
    }
  }

  const periodStart = `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
  const periodEnd = `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
  const dueDate = `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

  const cardTransactions = transactions.filter(t => 
    t.cardId === card.id && 
    t.type === 'expense' &&
    t.date >= periodStart &&
    t.date <= periodEnd
  );

  const total = cardTransactions.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

  return { total, periodStart, periodEnd, dueDate };
}

/**
 * Calcula em qual mês/ano uma transação de cartão de crédito será cobrada.
 * Retorna um objeto com o mês e ano do VENCIMENTO da fatura.
 */
export function getInvoiceBillingMonth(
  card: CreditCard,
  transactionDate: string
): { month: number; year: number; dueDate: string } {
  const [y, m, d] = transactionDate.split('-').map(Number);
  const closingDay = card.closingDay || 1;
  const dueDay = card.dueDay || 10;

  let billingMonth = m - 1; // 0-indexed
  let billingYear = y;

  if (d > closingDay) {
    // Se a compra foi após o fechamento, cai na fatura do próximo mês
    billingMonth++;
    if (billingMonth > 11) {
      billingMonth = 0;
      billingYear++;
    }
  }

  // O vencimento é no mesmo mês da fatura (ou no próximo se dueDay < closingDay)
  let dueMonth = billingMonth;
  let dueYear = billingYear;

  if (dueDay < closingDay) {
    dueMonth++;
    if (dueMonth > 11) {
      dueMonth = 0;
      dueYear++;
    }
  }

  const dueDate = `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;

  return { month: billingMonth, year: billingYear, dueDate };
}
