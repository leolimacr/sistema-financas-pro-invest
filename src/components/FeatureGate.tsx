import React from 'react';
import { useEntitlement } from '../hooks/useEntitlement';
import type { EntitlementKey } from '../config/featureAccessMatrix';

type FeatureGateProps = {
  featureKey: EntitlementKey;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export const FeatureGate: React.FC<FeatureGateProps> = ({
  featureKey,
  fallback = null,
  children,
}) => {
  const { hasFeature, loading } = useEntitlement();
  // Durante o carregamento do entitlement, nunca exibir o fallback comercial
  // (evita flash de paywall para pagantes em cold start) — E7-03.
  if (loading) return null;
  return hasFeature(featureKey) ? <>{children}</> : <>{fallback}</>;
};

export default FeatureGate;
