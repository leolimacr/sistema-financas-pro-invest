import { useEntitlementContext } from '../contexts/EntitlementContext';

export function useEntitlement() {
  const ctx = useEntitlementContext();
  return ctx;
}
