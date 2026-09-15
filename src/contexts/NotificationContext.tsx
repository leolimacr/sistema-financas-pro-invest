import React, { createContext, useContext, useState, useEffect } from 'react';
import { firestore } from '../firebase';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import { collection, query, doc, updateDoc, orderBy, limit, onSnapshot, getDocs, startAfter } from 'firebase/firestore';
import { useAuth } from './AuthContext';

export interface NexusEvent {
  id: string;
  eventType?: string;
  message: { title: string; body: string; ctaLabel?: string };
  deepLink?: string;
  resourceId?: string;
  urgency?: 'high' | 'medium' | 'low';
  createdAt?: any;
  read?: boolean;
  expiresAt?: any;
}

interface NotificationContextType {
  unreadEvents: NexusEvent[];
  historyEvents: NexusEvent[];
  unreadCount: number;
  loading: boolean;
  hasMoreHistory: boolean;
  dismiss: (eventId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  loadMoreHistory: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadEvents, setUnreadEvents] = useState<NexusEvent[]>([]);
  const [historyEvents, setHistoryEvents] = useState<NexusEvent[]>([]);
  const [lastHistoryDoc, setLastHistoryDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [loading, setLoading] = useState(true);

  // VALIDATOR: Garante que a mensagem é exibível
  const isValid = (e: NexusEvent) => !!(e.message?.title && e.message?.body);

  useEffect(() => {
    if (!user) {
      setUnreadEvents([]);
      setHistoryEvents([]);
      setLoading(false);
      return;
    }

    // 1. LISTENER PARA NÃO LIDAS (Tempo Real)
    // Buscamos as mais recentes e filtramos em memória.
    const unreadRef = collection(firestore, 'users', user.uid, 'presenceEvents');
    const qUnread = query(
        unreadRef, 
        orderBy('createdAt', 'desc'), 
        limit(20)
    );

    const unsubscribe = onSnapshot(qUnread, (snapshot) => {
      const now = Date.now();
      const allFetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NexusEvent));
      
      // Filtra apenas as NÃO LIDAS e VÁLIDAS
      const filteredUnread = allFetched.filter(e => {
          if (e.read === true) return false;
          if (!isValid(e)) return false;
          if (e.expiresAt && typeof e.expiresAt.toMillis === 'function') {
              return e.expiresAt.toMillis() > now;
          }
          return true;
      });

      // Filtra as LIDAS e VÁLIDAS para o histórico inicial
      const filteredRead = allFetched.filter(e => e.read === true && isValid(e));

      setUnreadEvents(filteredUnread);
      
      // Se ainda não carregamos histórico, pegamos os que vieram na query inicial
      setHistoryEvents(prev => {
          if (prev.length === 0) return filteredRead.slice(0, 5);
          return prev;
      });

      setLoading(false);
    }, (error) => {
      console.error('Erro no listener de notificações:', error?.code, error?.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const dismiss = async (eventId: string) => {
    if (!user) return;
    const eventToMove = unreadEvents.find(e => e.id === eventId);
    const nowIso = new Date().toISOString();
    if (eventToMove) {
      setUnreadEvents(prev => prev.filter(e => e.id !== eventId));
      setHistoryEvents(prev => {
        if (prev.some(h => h.id === eventId)) return prev;
        return [{ ...eventToMove, read: true, readAt: nowIso }, ...prev];
      });
    }
    try {
      await updateDoc(doc(firestore, 'users', user.uid, 'presenceEvents', eventId), { 
        read: true,
        readAt: nowIso,
      });
    } catch (e) {
      console.error('Erro ao descartar evento:', e);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadEvents.length === 0) return;
    const eventsToMove = [...unreadEvents];
    const nowIso = new Date().toISOString();
    setUnreadEvents([]);
    setHistoryEvents(prev => {
      const existingIds = new Set(prev.map(h => h.id));
      const newItems = eventsToMove
        .filter(e => !existingIds.has(e.id))
        .map(e => ({ ...e, read: true, readAt: nowIso }));
      return [...newItems, ...prev];
    });
    try {
      const promises = eventsToMove.map(e => 
        updateDoc(doc(firestore, 'users', user.uid, 'presenceEvents', e.id), { 
          read: true,
          readAt: nowIso,
        })
      );
      await Promise.all(promises);
    } catch (e) {
      console.error('Erro ao marcar todas como lidas:', e);
    }
  };

  const loadMoreHistory = async () => {
      if (!user || !hasMoreHistory) return;

      try {
          const eventsRef = collection(firestore, 'users', user.uid, 'presenceEvents');
          let q = query(
              eventsRef, 
              orderBy('read', 'desc'), // Garante que pegamos os já lidos
              orderBy('createdAt', 'desc'), 
              limit(5)
          );

          if (lastHistoryDoc) {
              q = query(q, startAfter(lastHistoryDoc));
          }

          const snap = await getDocs(q);
          if (snap.empty) {
              setHasMoreHistory(false);
              return;
          }

          const newHistory = snap.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as NexusEvent))
            .filter(e => e.read === true && isValid(e));

          setHistoryEvents(prev => [...prev, ...newHistory]);
          setLastHistoryDoc(snap.docs[snap.docs.length - 1]);
          if (snap.docs.length < 5) setHasMoreHistory(false);

      } catch (e) {
          console.error('Erro ao carregar mais histórico:', e);
      }
  };

  return (
    <NotificationContext.Provider value={{ 
        unreadEvents, 
        historyEvents,
        unreadCount: unreadEvents.length, 
        loading, 
        hasMoreHistory,
        dismiss, 
        markAllAsRead,
        loadMoreHistory
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
