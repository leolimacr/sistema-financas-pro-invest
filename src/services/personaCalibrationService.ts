import type { UserMeta } from '../types';

const DEFER_KEY_PREFIX = 'financas-pro-invest-calibration-defer-';
const DISMISS_KEY_PREFIX = 'financas-pro-invest-calibration-dismissed-';

export interface CalibrationContext {
  userMeta?: UserMeta | null;
  launchCount: number;
  hasRecurringOrCards: boolean;
  userId?: string | null;
}

/** Usuário concluiu a Calibração de Comando — Modo Comando ativo. */
export function isCommandMode(userMeta?: UserMeta | null): boolean {
  return Boolean(userMeta?.persona?.calibratedAt);
}

export function isCalibrationDeferred(userId?: string | null): boolean {
  if (!userId) return false;
  const until = localStorage.getItem(`${DEFER_KEY_PREFIX}${userId}`);
  if (!until) return false;
  return new Date(until) > new Date();
}

export function deferCalibration(userId: string, days = 3): void {
  const until = new Date();
  until.setDate(until.getDate() + days);
  localStorage.setItem(`${DEFER_KEY_PREFIX}${userId}`, until.toISOString());
}

export function dismissCalibrationInvite(userId: string): void {
  localStorage.setItem(`${DISMISS_KEY_PREFIX}${userId}`, '1');
}

export function wasCalibrationInviteDismissed(userId?: string | null): boolean {
  if (!userId) return false;
  return localStorage.getItem(`${DISMISS_KEY_PREFIX}${userId}`) === '1';
}

/**
 * Gatilhos de maturidade para convidar à Calibração de Comando.
 * Não abre modal automaticamente — apenas sinaliza que o momento é propício.
 */
export function shouldOfferCalibration(ctx: CalibrationContext): boolean {
  if (isCommandMode(ctx.userMeta)) return false;
  if (!ctx.userId) return false;
  if (isCalibrationDeferred(ctx.userId)) return false;
  if (wasCalibrationInviteDismissed(ctx.userId)) return false;

  const launches = ctx.launchCount;
  const hasHabit = launches >= 5;
  const hasEarlyHabitWithStructure = launches >= 3 && ctx.hasRecurringOrCards;

  return hasHabit || hasEarlyHabitWithStructure;
}

export function getCalibrationInviteCopy(launchCount: number): { title: string; body: string } {
  if (launchCount >= 5) {
    return {
      title: 'Calibração de Comando disponível',
      body: 'Tenho dados suficientes para calibrar seu perfil. São 7 perguntas — depois disso, passo a interpretar suas finanças no seu contexto, não no genérico.',
    };
  }
  return {
    title: 'Hora de calibrar seu comando',
    body: 'Suas movimentações já formam um padrão. Responda 7 perguntas para adaptar linguagem, prioridades e análises ao seu momento.',
  };
}
