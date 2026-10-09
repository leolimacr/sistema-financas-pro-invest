import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { firestore } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { BillingDoc, BillingTier, BillingStatus } from '../types/billing';
import type { EntitlementKey } from '../config/featureAccessMatrix';
import {
  getEffectiveTier,
  hasFeature as checkFeatureFn,
  getUsageLimit as getUsageLimitFn,
  getDisplayLabel,
  resolveLegacyPlanId,
} from '../config/featureAccessMatrix';

interface EntitlementState {
  loading: boolean;
  effectiveTier: BillingTier;
  billingStatus: BillingStatus;
  isFree: boolean;
  isPro: boolean;
  isPremium: boolean;
  displayLabel: string;
  hasFeature: (key: EntitlementKey) => boolean;
  getUsageLimit: (key: EntitlementKey) => { limit: number; unit: 'day' } | null;
}

const defaultState: EntitlementState = {
  loading: true,
  effectiveTier: 'free',
  billingStatus: null,
  isFree: true,
  isPro: false,
  isPremium: false,
  displayLabel: 'Gratuito',
  hasFeature: () => false,
  getUsageLimit: () => null,
};

const EntitlementContext = createContext<EntitlementState>(defaultState);

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [effectiveTier, setEffectiveTier] = useState<BillingTier>('free');
  const [billingStatus, setBillingStatus] = useState<BillingStatus>(null);
  const [billing, setBilling] = useState<{ tier: BillingTier; status: BillingStatus } | null>(null);

  useEffect(() => {
    if (!user || !firestore) {
      setEffectiveTier('free');
      setBillingStatus(null);
      setBilling(null);
      setLoading(false);
      return;
    }

    const billingDocRef = doc(firestore, 'users', user.uid, 'billing', 'main');

    const unsubBilling = onSnapshot(
      billingDocRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as BillingDoc;
          setBilling({ tier: data.tier, status: data.status });
          setEffectiveTier(getEffectiveTier(data.tier, data.status));
          setBillingStatus(data.status);
        } else {
          const userDocRef = doc(firestore, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const legacyPlan = userData?.plan as string | undefined;
            const subStatus = (userData?.subscription as Record<string, unknown> | undefined)?.status as string | undefined;
            const subActive = subStatus === 'active' || subStatus === 'trialing';

            let resolvedTier: BillingTier | null = null;

            if (legacyPlan && legacyPlan !== 'free' && subActive) {
              resolvedTier = legacyPlan === 'premium' ? 'premium' : 'pro';
            }

            // Cast explícito: o narrowing do TS não enxerga a atribuição
            // condicional acima (pré-existente; sem mudança de runtime).
            if (!resolvedTier || (resolvedTier as BillingTier) === 'free') {
              const subPlanId = (userData?.subscription as Record<string, unknown> | undefined)?.planId as string | undefined;
              if (subPlanId && subPlanId !== 'free' && subActive) {
                const resolved = resolveLegacyPlanId(subPlanId);
                if (resolved && resolved.tier !== 'free') {
                  resolvedTier = resolved.tier;
                }
              }
            }

            if (resolvedTier && (resolvedTier as BillingTier) !== 'free') {
              setBilling({ tier: resolvedTier, status: subStatus as BillingStatus });
              setEffectiveTier(resolvedTier);
              setBillingStatus(subStatus as BillingStatus);
            } else {
              setEffectiveTier('free');
              setBillingStatus(null);
              setBilling(null);
            }
          } else {
            setEffectiveTier('free');
            setBillingStatus(null);
            setBilling(null);
          }
        }
        setLoading(false);
      },
      (error: { code?: string; message?: string }) => {
        console.error('Erro no listener de billing:', error?.code, error?.message);
        setEffectiveTier('free');
        setBillingStatus(null);
        setBilling(null);
        setLoading(false);
      },
    );

    return () => {
      unsubBilling();
    };
  }, [user]);

  const hasFeature = useCallback(
    (key: EntitlementKey): boolean => {
      if (!billing) return false;
      return checkFeatureFn(billing.tier, billing.status, key);
    },
    [billing],
  );

  const getLimit = useCallback(
    (key: EntitlementKey): { limit: number; unit: 'day' } | null => {
      if (!billing) return null;
      return getUsageLimitFn(billing.tier, billing.status, key);
    },
    [billing],
  );

  const isFree = effectiveTier === 'free';
  const isPro = effectiveTier !== 'free';
  const isPremium = effectiveTier === 'premium';

  const displayLabel = useMemo(() => {
    const tier = billing?.tier ?? 'free';
    return getDisplayLabel(tier, billingStatus);
  }, [billing, billingStatus]);

  const value = useMemo<EntitlementState>(() => ({
    loading,
    effectiveTier,
    billingStatus,
    isFree,
    isPro,
    isPremium,
    displayLabel,
    hasFeature,
    getUsageLimit: getLimit,
  }), [loading, effectiveTier, billingStatus, isFree, isPro, isPremium, displayLabel, hasFeature, getLimit]);

  return (
    <EntitlementContext.Provider value={value}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlementContext(): EntitlementState {
  return useContext(EntitlementContext);
}
