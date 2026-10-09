import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

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
  isActive: boolean;
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
  abandonedCount: number;
  averageAbandonmentScore: number;
}

export interface ListAdminUsersResponse {
  success: boolean;
  summary: ListAdminUsersSummary;
  users: AdminUserData[];
}

/**
 * Busca todos os usuários, tiers e índices de abandono (exclusivo para administradores)
 */
export async function fetchAdminUsers(): Promise<ListAdminUsersResponse> {
  const fn = httpsCallable<void, ListAdminUsersResponse>(functions, 'listAdminUsers');
  const result = await fn();
  return result.data;
}
