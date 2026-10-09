import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { ADMIN_EMAIL } from './adminPixAudit';

export interface AdminUserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  tier: 'free' | 'pro' | 'premium';
  billingStatus: string | null;
  billingCycle: string | null;
  planName: string;
  createdAt: string | null;
  lastActiveAt: string | null;
  daysSinceLastActive: number;
  launchCount: number;
  hasFinancialProfile: boolean;
  onboardingCompleted: boolean;
  abandonmentScore: number; // 0 a 6
  abandonmentLabel: string;
  isActive: boolean; // Ativo nos últimos 14 dias
}

export interface ListAdminUsersSummary {
  totalUsers: number;
  byTier: {
    free: number;
    pro: number;
    premium: number;
  };
  activeUsers: number;
  inactiveUsers: number;
  abandonedCount: number; // Grau 5 ou 6
  averageAbandonmentScore: number;
}

export interface ListAdminUsersResponse {
  success: boolean;
  summary: ListAdminUsersSummary;
  users: AdminUserData[];
}

function assertAdmin(request: any): string {
  const email = request.auth?.token?.email?.toLowerCase();
  if (!request.auth || !email || email !== ADMIN_EMAIL.toLowerCase()) {
    logger.warn(`[adminUsers] Acesso negado para usuário não admin: ${email || 'não autenticado'}`);
    throw new HttpsError('permission-denied', 'Acesso restrito ao administrador do sistema.');
  }
  return email;
}

/**
 * Calcula o Grau de Abandono (0 a 6) de forma soberana e determinística.
 * 
 * Critérios:
 * - Grau 0: Usuário Pleno (Risco 0%) -> Acesso há <= 2 dias E uso frequente (>= 10 lançamentos ou uso ativo).
 * - Grau 1: Estável (Risco 15%) -> Acesso entre 3 e 5 dias atrás.
 * - Grau 2: Atenção Leve (Risco 35%) -> Acesso entre 6 e 9 dias atrás.
 * - Grau 3: Risco Moderado (Risco 55%) -> Acesso entre 10 e 14 dias atrás.
 * - Grau 4: Risco Alto (Risco 75%) -> Acesso entre 15 e 21 dias atrás.
 * - Grau 5: Abandono Iminente (Risco 90%) -> Acesso entre 22 e 29 dias atrás.
 * - Grau 6: Abandono Pleno (Risco 100%) -> Tempo sem uso >= 30 dias OU conta vazia (0 lançamentos) há mais de 14 dias.
 */
export function calculateAbandonmentScore(params: {
  daysSinceLastActive: number;
  launchCount: number;
  hasFinancialProfile: boolean;
}): { score: number; label: string } {
  const { daysSinceLastActive, launchCount } = params;

  // Sem dados de acesso ou >= 30 dias sem uso: Abandono Pleno
  if (daysSinceLastActive >= 30) {
    return { score: 6, label: 'Abandono Pleno (30d+)' };
  }

  // Se cadastrou há mais de 14 dias e nunca registrou nada: Abandono Pleno
  if (daysSinceLastActive >= 14 && launchCount === 0) {
    return { score: 6, label: 'Abandono Pleno (Sem uso)' };
  }

  if (daysSinceLastActive >= 22) {
    return { score: 5, label: 'Abandono Iminente' };
  }

  if (daysSinceLastActive >= 15) {
    return { score: 4, label: 'Risco Alto' };
  }

  if (daysSinceLastActive >= 10) {
    return { score: 3, label: 'Risco Moderado' };
  }

  if (daysSinceLastActive >= 6) {
    return { score: 2, label: 'Atenção Leve' };
  }

  if (daysSinceLastActive >= 3) {
    return { score: 1, label: 'Estável' };
  }

  // daysSinceLastActive <= 2
  if (launchCount >= 5 || params.hasFinancialProfile) {
    return { score: 0, label: 'Usuário Pleno' };
  }

  // Acessou hoje ou ontem, mas ainda está no início
  return { score: 1, label: 'Iniciante Ativo' };
}

export interface ResolveTierParams {
  email?: string | null;
  directTier?: string | null;
  directPlan?: string | null;
  subscription?: {
    tier?: string | null;
    planId?: string | null;
    plan?: string | null;
    status?: string | null;
    cycle?: string | null;
  } | null;
  billingMain?: {
    tier?: string | null;
    status?: string | null;
    billingCycle?: string | null;
  } | null;
}

/**
 * Resolve o plano/tier (Free, Pro, Premium) com tolerância a formatos legados
 * e garantindo a soberania do e-mail do administrador.
 */
export function resolveAdminUserTier(params: ResolveTierParams): {
  tier: 'free' | 'pro' | 'premium';
  planName: string;
  billingStatus: string;
  billingCycle: string;
} {
  const normalizedEmail = params.email?.toLowerCase().trim();
  const sub = params.subscription;
  const directTier = params.directTier;
  const directPlan = params.directPlan;
  const billingMain = params.billingMain;

  let tier: 'free' | 'pro' | 'premium' = 'free';
  let planName = 'Gratuito';

  // 1. O e-mail do Leo é soberanamente PREMIUM permanente
  if (normalizedEmail && normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
    tier = 'premium';
    planName = 'Plano Premium (Soberano Leo)';
  } else if (
    directTier === 'premium' ||
    sub?.tier === 'premium' ||
    sub?.planId?.includes('premium') ||
    (typeof sub?.plan === 'string' && sub.plan.includes('premium')) ||
    directPlan === 'premium'
  ) {
    tier = 'premium';
    planName = 'Plano Premium';
  } else if (
    directTier === 'pro' ||
    sub?.tier === 'pro' ||
    sub?.planId?.includes('pro') ||
    (typeof sub?.plan === 'string' && sub.plan.includes('pro')) ||
    directPlan === 'pro'
  ) {
    tier = 'pro';
    planName = 'Plano Pro';
  } else if (billingMain && billingMain.status === 'active') {
    if (billingMain.tier === 'premium') {
      tier = 'premium';
      planName = 'Plano Premium';
    } else if (billingMain.tier === 'pro') {
      tier = 'pro';
      planName = 'Plano Pro';
    }
  }

  const billingStatus = sub?.status || billingMain?.status || (tier !== 'free' ? 'active' : 'free');

  const isAnnual =
    sub?.cycle === 'annual' ||
    billingMain?.billingCycle === 'annual' ||
    sub?.planId?.includes('annual') ||
    sub?.planId?.includes('anual') ||
    (typeof sub?.plan === 'string' && (sub.plan.includes('annual') || sub.plan.includes('anual')));

  const billingCycle = sub?.cycle || billingMain?.billingCycle || (isAnnual ? 'annual' : 'monthly');

  return {
    tier,
    planName,
    billingStatus,
    billingCycle,
  };
}

export const listAdminUsers = onCall(
  {
    region: 'us-central1',
    cors: true,
    timeoutSeconds: 60,
  },
  async (request): Promise<ListAdminUsersResponse> => {
    assertAdmin(request);

    const db = getFirestore();
    const usersSnap = await db.collection('users').get();
    const now = Date.now();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    // Enriquecimento com dados do Firebase Authentication para contas sem e-mail/nome no Firestore
    const authMap = new Map<string, { email?: string; displayName?: string }>();
    try {
      const uidsToFetch = usersSnap.docs
        .filter((d) => !d.data().email || !d.data().displayName)
        .map((d) => d.id);

      if (uidsToFetch.length > 0) {
        const auth = getAuth();
        const batchSize = 100;
        for (let i = 0; i < uidsToFetch.length; i += batchSize) {
          const chunk = uidsToFetch.slice(i, i + batchSize).map((uid) => ({ uid }));
          const getResult = await auth.getUsers(chunk);
          for (const u of getResult.users) {
            authMap.set(u.uid, {
              email: u.email,
              displayName: u.displayName,
            });
          }
        }
      }
    } catch (authErr) {
      logger.warn('[adminUsers] Aviso ao buscar dados do Firebase Auth:', authErr);
    }

    const usersList: AdminUserData[] = [];

    const summary: ListAdminUsersSummary = {
      totalUsers: 0,
      byTier: { free: 0, pro: 0, premium: 0 },
      activeUsers: 0,
      inactiveUsers: 0,
      abandonedCount: 0,
      averageAbandonmentScore: 0,
    };

    let scoreSum = 0;

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const uid = doc.id;

      const authData = authMap.get(uid);
      const email = data.email || authData?.email || null;
      const displayName = data.displayName || authData?.displayName || data.nickname || null;

      // Consulta canônica a billing/main se existir
      let billingMainData: any = null;
      try {
        const billingSnap = await db.collection('users').doc(uid).collection('billing').doc('main').get();
        if (billingSnap.exists) {
          billingMainData = billingSnap.data();
        }
      } catch {
        // silencioso
      }

      const { tier, planName, billingStatus, billingCycle } = resolveAdminUserTier({
        email,
        directTier: data.tier,
        directPlan: data.plan,
        subscription: data.subscription,
        billingMain: billingMainData,
      });

      // Datas
      const createdAtRaw = data.createdAt;
      const createdAtDate: Date = createdAtRaw instanceof Timestamp
        ? createdAtRaw.toDate()
        : (createdAtRaw ? new Date(createdAtRaw) : new Date(0));
      const createdAtIso = createdAtDate.getTime() > 0 ? createdAtDate.toISOString() : null;

      const lastActiveRaw = data.lastActiveAt;
      const lastActiveDate: Date = lastActiveRaw instanceof Timestamp
        ? lastActiveRaw.toDate()
        : (lastActiveRaw ? new Date(lastActiveRaw) : createdAtDate);
      const lastActiveIso = lastActiveDate.getTime() > 0 ? lastActiveDate.toISOString() : null;

      const daysSinceLastActive = lastActiveDate.getTime() > 0
        ? Math.max(0, Math.floor((now - lastActiveDate.getTime()) / MS_PER_DAY))
        : 999;

      const launchCount = typeof data.launchCount === 'number' ? data.launchCount : 0;
      const hasFinancialProfile = Boolean(data.financialProfile?.monthlyIncome || data.financialProfile?.marcoZero);
      const onboardingCompleted = Boolean(data.onboardingCompleted);

      const { score, label } = calculateAbandonmentScore({
        daysSinceLastActive,
        launchCount,
        hasFinancialProfile,
      });

      const isActive = daysSinceLastActive <= 14;

      usersList.push({
        uid,
        email: email || null,
        displayName: displayName || null,
        tier,
        billingStatus,
        billingCycle,
        planName,
        createdAt: createdAtIso,
        lastActiveAt: lastActiveIso,
        daysSinceLastActive,
        launchCount,
        hasFinancialProfile,
        onboardingCompleted,
        abandonmentScore: score,
        abandonmentLabel: label,
        isActive,
      });

      // Atualiza sumário
      summary.totalUsers++;
      summary.byTier[tier]++;
      if (isActive) summary.activeUsers++;
      else summary.inactiveUsers++;
      if (score >= 5) summary.abandonedCount++;
      scoreSum += score;
    }

    // Ordenação inicial: usuários mais críticos (maior abandono) ou por último acesso
    usersList.sort((a, b) => b.daysSinceLastActive - a.daysSinceLastActive);

    summary.averageAbandonmentScore = summary.totalUsers > 0
      ? Number((scoreSum / summary.totalUsers).toFixed(1))
      : 0;

    return {
      success: true,
      summary,
      users: usersList,
    };
  }
);
