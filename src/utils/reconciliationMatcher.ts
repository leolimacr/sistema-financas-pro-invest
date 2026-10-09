import type { RecurringBill, Transaction } from '../types';

/**
 * Normaliza strings para comparação:
 * - Converte para minúsculas
 * - Remove acentos e diacríticos
 * - Remove caracteres especiais e pontuações
 * - Colapsa múltiplos espaços em um só
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clusters semânticos de serviços e concessionárias brasileiras.
 * Permite que "Enel" case com "Luz", "Sabesp" com "Água", "Claro" com "Internet", etc.
 */
const SEMANTIC_CLUSTERS: Record<string, string[]> = {
  energia: [
    'luz', 'energia', 'enel', 'cpfl', 'cemig', 'light', 'energisa', 'copel',
    'equatorial', 'eletropaulo', 'coelba', 'neoenergia', 'ceb', 'elektro', 'eletricidade'
  ],
  agua: [
    'agua', 'esgoto', 'sabesp', 'copasa', 'sanepar', 'cedae', 'embasa', 'caesb',
    'corsan', 'cagece', 'compesa', 'deso', 'saneago', 'daae', 'dmae', 'saae'
  ],
  telecom: [
    'internet', 'banda larga', 'fibra', 'wifi', 'claro', 'vivo', 'oi', 'tim',
    'starlink', 'net', 'telefonia', 'algar', 'gvt', 'telecom', 'desktop'
  ],
  moradia: [
    'aluguel', 'condominio', 'locacao', 'quintoandar', 'loft', 'imobiliaria',
    'moradia', 'iptu', 'taxa condominial', 'cond'
  ],
  gas: [
    'gas', 'ultragaz', 'liquigas', 'supergasbras', 'comgas', 'naturgy', 'fogas', 'nacional gas'
  ],
  streaming: [
    'netflix', 'spotify', 'amazon', 'prime', 'youtube', 'disney', 'globo',
    'globoplay', 'hbo', 'max', 'deezer', 'apple', 'star', 'crunchyroll'
  ],
  educacao: [
    'escola', 'colegio', 'faculdade', 'mensalidade', 'curso', 'universidade', 'creche'
  ],
  saude: [
    'academia', 'smartfit', 'smart fit', 'bluefit', 'plano de saude', 'unimed',
    'bradesco saude', 'sulamerica', 'amil', 'notredame', 'hapvida'
  ],
};

/**
 * Stop-words irrelevantes para reconciliação financeira.
 */
const STOP_WORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'para', 'pra',
  'pago', 'pagamento', 'conta', 'fatura', 'boleto', 'mensal', 'mes', 'ref', 'taxa'
]);

/**
 * Extrai tokens significativos de um texto.
 */
function extractTokens(text: string): string[] {
  const norm = normalizeText(text);
  return norm
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

/**
 * Avalia a similaridade semântica entre dois textos considerando
 * sinônimos de concessionárias brasileiras e sobreposição de tokens.
 */
export function calculateTextSimilarity(textA: string, textB: string): number {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  // Substring direta (ex: "aluguel" contido em "aluguel apto")
  if (normA.includes(normB) || normB.includes(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    return Math.max(0.8, minLen / maxLen);
  }

  const tokensA = extractTokens(textA);
  const tokensB = extractTokens(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  // Verifica sobreposição direta de tokens
  let commonTokens = 0;
  for (const tA of tokensA) {
    if (tokensB.some((tB) => tA === tB || tA.includes(tB) || tB.includes(tA))) {
      commonTokens++;
    }
  }

  const jaccardScore = commonTokens / Math.max(tokensA.length, tokensB.length);
  if (jaccardScore >= 0.5) return jaccardScore;

  // Verifica se pertencem ao mesmo cluster semântico (ex: "Enel" e "Luz")
  for (const cluster of Object.values(SEMANTIC_CLUSTERS)) {
    const aInCluster = tokensA.some((t) => cluster.includes(t));
    const bInCluster = tokensB.some((t) => cluster.includes(t));
    if (aInCluster && bInCluster) {
      return 0.85; // Alta similaridade semântica por concessionária/serviço
    }
  }

  return jaccardScore;
}

/**
 * Avalia a similaridade de valor financeiro com tolerância
 * de até 15% para contas de consumo variável (luz, água, gás).
 */
export function calculateAmountSimilarity(amountA: number, amountB: number): number {
  if (!Number.isFinite(amountA) || !Number.isFinite(amountB) || amountA <= 0 || amountB <= 0) {
    return 0;
  }

  const diff = Math.abs(amountA - amountB);
  if (diff <= 0.05) return 1.0; // Exato

  const maxVal = Math.max(amountA, amountB);
  const percentDiff = diff / maxVal;

  if (percentDiff <= 0.05) return 0.95;  // Diferença de até 5%
  if (percentDiff <= 0.15) return 0.80;  // Diferença de até 15% (contas variáveis)
  if (percentDiff <= 0.25) return 0.50;  // Diferença de até 25%

  return 0;
}

export interface MatchResult {
  bill: RecurringBill;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface CandidateTransactionResult {
  transaction: Transaction;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

/**
 * Encontra contas recorrentes pendentes que correspondem a uma transação sendo preenchida.
 * Chamado no momento do lançamento no `TransactionForm` (0ms, client-side, 100% offline).
 */
export function findMatchingBillsForTransaction(
  tx: {
    description?: string;
    amount?: number | string;
    category?: string;
    date?: string;
  },
  pendingBills: RecurringBill[]
): MatchResult[] {
  const txDesc = tx.description || '';
  const txAmount = typeof tx.amount === 'string' ? parseFloat(tx.amount.replace(',', '.')) : Number(tx.amount || 0);
  const txCategory = tx.category || '';

  if (!pendingBills || pendingBills.length === 0) return [];

  const results: MatchResult[] = [];

  for (const bill of pendingBills) {
    if (bill.isActive === false) continue;

    const textSim = calculateTextSimilarity(txDesc, bill.name);
    const amountSim = txAmount > 0 && bill.amount > 0 ? calculateAmountSimilarity(txAmount, bill.amount) : 0;
    const sameCategory = txCategory && bill.category && normalizeText(txCategory) === normalizeText(bill.category);

    let totalScore = 0;
    let reason = '';

    // Cenário 1: Nome altamente similar e valor compatível
    if (textSim >= 0.75 && amountSim >= 0.8) {
      totalScore = textSim * 0.55 + amountSim * 0.45;
      reason = 'Nome e valor compatíveis com esta conta fixa';
    }
    // Cenário 2: Nome exato ou semântico mesmo sem valor preenchido ainda
    else if (textSim >= 0.8) {
      totalScore = textSim * 0.8 + (sameCategory ? 0.2 : 0);
      reason = 'Descrição coincide com sua conta fixa';
    }
    // Cenário 3: Valor exato e mesma categoria (ou nome moderado)
    else if (amountSim >= 0.95 && (sameCategory || textSim >= 0.5)) {
      totalScore = amountSim * 0.6 + (textSim > 0 ? textSim * 0.3 : 0.2) + (sameCategory ? 0.2 : 0);
      reason = 'Valor exato e categoria coincidente';
    }
    // Cenário 4: Valor próximo e nome moderado
    else if (textSim >= 0.5 && amountSim >= 0.8) {
      totalScore = textSim * 0.5 + amountSim * 0.5;
      reason = 'Possível correspondência de nome e valor';
    }

    if (totalScore >= 0.6) {
      results.push({
        bill,
        score: totalScore,
        confidence: totalScore >= 0.8 ? 'high' : 'medium',
        reason,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Procura transações avulsas existentes no mês corrente que podem corresponder
 * a uma conta fixa pendente/vencida.
 * Chamado em `PendingObligations` e `UrgentBillsSheet` para sugerir conciliação com 1 toque.
 */
export function findCandidateTransactionsForBill(
  bill: RecurringBill,
  transactions: Transaction[],
  currentMonth: number,
  currentYear: number
): CandidateTransactionResult[] {
  if (!transactions || transactions.length === 0 || !bill) return [];

  const candidates: CandidateTransactionResult[] = [];

  for (const t of transactions) {
    if (t.type !== 'expense') continue;

    // Se a transação já está vinculada a OUTRA conta fixa, ignora
    if (t.linkedRecurringBillId && t.linkedRecurringBillId !== bill.id) continue;

    // Filtra transações do mesmo mês
    const tDate = new Date(t.date.replace(/-/g, '/'));
    if (tDate.getMonth() !== currentMonth || tDate.getFullYear() !== currentYear) {
      continue;
    }

    // Se já está vinculada a esta mesma conta, já está 100% resolvida
    if (t.linkedRecurringBillId === bill.id) {
      candidates.push({
        transaction: t,
        score: 1.0,
        confidence: 'high',
        reason: 'Já vinculada a esta conta fixa',
      });
      continue;
    }

    const txAmount = Number(t.amount);
    const textSim = calculateTextSimilarity(t.description, bill.name);
    const amountSim = calculateAmountSimilarity(txAmount, bill.amount);
    const sameCategory = t.category && bill.category && normalizeText(t.category) === normalizeText(bill.category);

    let totalScore = 0;
    let reason = '';

    // Match de alta confiança: nome semântico + valor tolerante
    if (textSim >= 0.75 && amountSim >= 0.8) {
      totalScore = textSim * 0.55 + amountSim * 0.45;
      reason = `Lançamento "${t.description}" com valor compatível (R$ ${txAmount.toFixed(2)})`;
    }
    // Match de valor exato e nome moderado
    else if (amountSim >= 0.95 && (textSim >= 0.4 || sameCategory)) {
      totalScore = amountSim * 0.6 + (textSim * 0.3) + (sameCategory ? 0.1 : 0);
      reason = `Valor exato de R$ ${txAmount.toFixed(2)} registrado em ${t.date.split('-').reverse().slice(0, 2).join('/')}`;
    }
    // Match de nome forte mesmo com variação de valor (ex: conta de luz de R$ 160 vs estimada R$ 150)
    else if (textSim >= 0.8 && amountSim >= 0.5) {
      totalScore = textSim * 0.65 + amountSim * 0.35;
      reason = `Nome compatível ("${t.description}") registrado no dia ${tDate.getDate()}`;
    }

    if (totalScore >= 0.6) {
      candidates.push({
        transaction: t,
        score: totalScore,
        confidence: totalScore >= 0.8 ? 'high' : 'medium',
        reason,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}
