import type { Transaction } from '../types';
import { getLocalDateString } from './dateHelpers';

/**
 * Calcula quantos dias consecutivos (incluindo hoje) o usuário registrou ao menos uma movimentação.
 */
export function getConsecutiveDays(transactions: Transaction[]): number {
  if (!transactions || transactions.length === 0) return 0;

  const dates = new Set(transactions.map((t) => t.date.split('T')[0]));

  const today = new Date();
  const todayStr = getLocalDateString(today);

  if (!dates.has(todayStr)) return 0;

  let streak = 0;
  const current = new Date(today);

  while (dates.has(getLocalDateString(current))) {
    streak++;
    current.setDate(current.getDate() - 1);
  }

  return streak;
}

/**
 * Conta quantos dias únicos do mês atual tiveram ao menos um lançamento.
 */
export function getMonthlyConsistency(transactions: Transaction[]): { current: number; total: number } {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const dates = new Set(transactions.map((t) => t.date.split('T')[0]));
  let count = 0;
  for (const dateStr of dates) {
    if (dateStr.startsWith(yearMonth)) count++;
  }

  return { current: count, total: now.getDate() };
}

/**
 * Mensagem analítica de consistência de registro (sem gamificação).
 */
export function getStreakMilestoneMessage(streak: number): string {
  if (streak >= 30) return `${streak} dias de registro contínuo. Seu sistema tem base sólida para calibrar sua folga do mês.`;
  if (streak >= 14) return `${streak} dias consecutivos. Padrão estável — dados suficientes para análise de comando.`;
  if (streak >= 7) return `${streak} dias de consistência. Continue registrando para refinar projeções.`;
  if (streak > 1) return `${streak} dias seguidos de registro.`;
  return 'Registre movimentações para o sistema interpretar sua estrutura financeira.';
}
