import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { fetchPixAuditQueue, type PixAuditItem } from '../services/adminPixAuditService';

interface PixAuditContextType {
  pendingCount: number;
  items: PixAuditItem[];
  loading: boolean;
  refreshAudit: () => Promise<void>;
  updateItemLocally: (transactionId: string, partial: Partial<PixAuditItem>) => void;
}

const PixAuditContext = createContext<PixAuditContextType>({
  pendingCount: 0,
  items: [],
  loading: false,
  refreshAudit: async () => {},
  updateItemLocally: () => {},
});

import { isSystemAdmin } from '../utils/adminCheck';

export const PixAuditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, userMeta } = useAuth();
  const isAdmin = isAuthenticated && isSystemAdmin(userMeta);

  const [items, setItems] = useState<PixAuditItem[]>([]);
  const [loading, setLoading] = useState(false);

  const refreshAudit = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const data = await fetchPixAuditQueue();
      setItems(data);
    } catch (err) {
      console.warn('[PixAuditContext] Falha ao sincronizar fila de auditoria Pix:', err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Atualização em background a cada 45 segundos para o admin
  useEffect(() => {
    if (!isAdmin) {
      setItems([]);
      return;
    }

    refreshAudit();
    const interval = setInterval(refreshAudit, 45000);
    return () => clearInterval(interval);
  }, [isAdmin, refreshAudit]);

  const updateItemLocally = useCallback((transactionId: string, partial: Partial<PixAuditItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.transactionId === transactionId ? { ...item, ...partial } : item))
    );
  }, []);

  // Comprovantes que demandam atenção imediata do Leo:
  // 1. pending_review (dentro dos 3 dias de inércia)
  // 2. underpaid com chave informada aguardando estorno (refundStatus === 'refund_pending')
  const pendingCount = items.filter(
    (it) => it.effectiveStatus === 'pending_review' || it.refundStatus === 'refund_pending'
  ).length;

  return (
    <PixAuditContext.Provider
      value={{
        pendingCount,
        items,
        loading,
        refreshAudit,
        updateItemLocally,
      }}
    >
      {children}
    </PixAuditContext.Provider>
  );
};

export const usePixAudit = () => useContext(PixAuditContext);
