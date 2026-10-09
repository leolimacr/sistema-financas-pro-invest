import { useMemo } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

export const useNexusEvents = () => {
  const { unreadEvents, dismiss, markAllAsRead, loading } = useNotifications();

  const events = useMemo(() => {
    const urgencyMap = { high: 3, medium: 2, low: 1 };
    return [...unreadEvents].sort((a, b) => {
      const uA = urgencyMap[a.urgency || 'low'] || 0;
      const uB = urgencyMap[b.urgency || 'low'] || 0;
      if (uA !== uB) return uB - uA;
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });
  }, [unreadEvents]);

  return { 
    events, 
    event: events[0] || null,
    dismiss, 
    markAllAsRead,
    loading 
  };
};
