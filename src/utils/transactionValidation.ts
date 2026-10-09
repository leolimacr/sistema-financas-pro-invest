import type { Transaction } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export type TransactionInput = Omit<Transaction, 'id' | 'userId'> & { id?: string };

/**
 * Contrato de escrita de lançamentos (Etapa 3 — integridade do write-path).
 *
 * Alinhado ao tipo real `Transaction` (`src/types/index.ts:74-96`):
 * - `type`: exatamente 'income' | 'expense' (sem 'transfer');
 * - `date`: string 'YYYY-MM-DD' parseável;
 * - `paymentMethod`: opcional; quando presente, exatamente
 *   'money' | 'credit' | 'voucher' (sem 'debit'/'transfer'/'other');
 * - `amount`: número ou string numérica coercível (`Number()`), finito e > 0.
 *   O formulário envia `Number(amount)`, mas o restante do código tolera
 *   strings via `Number(t.amount) || 0` — legado em string não é bloqueado.
 *
 * Escopos:
 * - CRIAÇÃO (save sem `id`): objeto completo exigido nos campos acima.
 * - EDIÇÃO (save com `id`): o caminho de edição (`useTransactions`,
 *   ramo `transaction.id`) lê o objeto cheio — aplica-se o MESMO contrato
 *   da criação. Não existe patch esparso: nada além do contrato é exigido,
 *   e nenhum campo opcional novo é obrigatório.
 * - LEGADO: registros antigos só são validados ao serem RE-SALVOS.
 *   Leitura (`fetchMonth`, bridge, `allData`) nunca valida. `description` e
 *   `category` vazias são toleradas para não bloquear re-submissão de
 *   registros antigos.
 */
const VALID_TYPES = ['income', 'expense'] as const;
const VALID_METHODS = ['money', 'credit', 'voucher'] as const;

export function validateTransaction(input: TransactionInput): ValidationError[] {
  const errors: ValidationError[] = [];

  // `amount` é `number` no tipo, mas em runtime o legado pode trazer
  // string numérica — por isso a inspeção passa por `unknown`.
  const rawAmount: unknown = input.amount;
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
    errors.push({ field: 'amount', message: 'Valor é obrigatório' });
  } else {
    const numeric = Number(rawAmount);
    if (!Number.isFinite(numeric)) {
      errors.push({ field: 'amount', message: 'Valor deve ser um número finito' });
    } else if (numeric <= 0) {
      errors.push({ field: 'amount', message: 'Valor deve ser maior que zero' });
    }
  }

  if (!input.type || !VALID_TYPES.includes(input.type as Transaction['type'] & string)) {
    errors.push({ field: 'type', message: `Tipo inválido. Use: ${VALID_TYPES.join(', ')}` });
  }

  if (!input.date || typeof input.date !== 'string') {
    errors.push({ field: 'date', message: 'Data é obrigatória (formato YYYY-MM-DD)' });
  } else if (!/^\d{4}-\d{2}-\d{2}/.test(input.date)) {
    errors.push({ field: 'date', message: 'Data deve ter formato YYYY-MM-DD' });
  } else {
    const parsed = new Date(input.date.replace(/-/g, '/'));
    if (isNaN(parsed.getTime())) {
      errors.push({ field: 'date', message: 'Data inválida' });
    }
  }

  // Casts via unknown: em runtime, registros legados podem trazer tipos
  // inesperados; o contrato tolera texto vazio, mas rejeita não-texto.
  if (input.description !== undefined && input.description !== null && typeof (input.description as unknown) !== 'string') {
    errors.push({ field: 'description', message: 'Descrição deve ser texto' });
  }

  if (input.category !== undefined && input.category !== null && typeof (input.category as unknown) !== 'string') {
    errors.push({ field: 'category', message: 'Categoria deve ser texto' });
  }

  if (input.paymentMethod !== undefined && input.paymentMethod !== null &&
      !VALID_METHODS.includes(input.paymentMethod as NonNullable<Transaction['paymentMethod']> & string)) {
    errors.push({ field: 'paymentMethod', message: `Método inválido. Use: ${VALID_METHODS.join(', ')}` });
  }

  return errors;
}

export function isValidTransaction(input: TransactionInput): boolean {
  return validateTransaction(input).length === 0;
}
