export type Plan = 'free' | 'pro' | 'premium';

/**
 * Order of plans from lowest to highest privilege.
 */
const planOrder: Plan[] = ['free', 'pro', 'premium'];

/**
 * Returns true if the current plan satisfies the required plan (i.e., is the same or higher).
 * Example: hasAccess('pro', 'free') => true, hasAccess('free', 'pro') => false.
 */
export function hasPlanAccess(current: Plan, required: Plan): boolean {
  const currentIdx = planOrder.indexOf(current);
  const requiredIdx = planOrder.indexOf(required);
  return currentIdx >= requiredIdx;
}

/**
 * Convenience helpers.
 */
export const isFree = (plan: Plan) => plan === 'free';
export const isPro = (plan: Plan) => plan === 'pro';
export const isPremium = (plan: Plan) => plan === 'premium';
