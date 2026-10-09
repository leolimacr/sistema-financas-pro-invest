import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { firestore } from '../../firebase';
import { collection, query, where, orderBy, limit, getDocs, writeBatch, doc, Timestamp } from 'firebase/firestore';
import { PresenceEventService } from '../../services/PresenceEventService';
import { FPI_COPY } from '../../theme/fpiVoiceGuide';

interface PresenceEvent {
  eventId: string;
  eventType: string;
  urgency: 'low' | 'medium' | 'high';
  urgencyScore: number;
  expiresAt: { seconds: number };
  seenAt?: { seconds: number } | null;
  status: string;
  message: { title: string; body: string; ctaLabel: string };
  deepLink: string;
  channel: string;
}

interface Props {
  userId: string | null;
  isAuthenticated: boolean;
  onNavigate: (route: string) => void;
  heroPersona: 'dividas' | 'patrimonio';
}

const urgencyConfig = {
  high: { border: 'border-amber-200', bg: 'bg-amber-50', dot: 'bg-amber-500', badge: 'text-amber-700 bg-amber-100 border-amber-200' },
  medium: { border: 'border-sky-200', bg: 'bg-sky-50', dot: 'bg-sky-500', badge: 'text-sky-700 bg-sky-100 border-sky-200' },
  low: { border: 'border-slate-200', bg: 'bg-white', dot: 'bg-slate-400', badge: 'text-slate-600 bg-slate-100 border-slate-200' },
};

const urgencyLabel = { high: 'Importante', medium: 'Sugestão', low: 'Dica' };

export const HomePresenceFeed: React.FC<Props> = ({ userId, isAuthenticated, onNavigate, heroPersona }) => {
  const [events, setEvents] = useState<PresenceEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const seenKey = `fpi_seen_events_${userId}`;
    const getSeenSet = (): Set<string> => {
      try {
        const raw = sessionStorage.getItem(seenKey);
        return raw ? new Set(JSON.parse(raw)) : new Set();
      } catch { return new Set(); }
    };
    const saveSeenSet = (s: Set<string>) => {
      try { sessionStorage.setItem(seenKey, JSON.stringify([...s])); } catch {}
    };

    const markSeen = (items: PresenceEvent[]) => {
      const seen = getSeenSet();
      const toMark = items.filter(ev =>
        !ev.eventId.startsWith('static-') && !ev.seenAt?.seconds && !seen.has(ev.eventId)
      );
      if (toMark.length === 0) return;

      const batch = writeBatch(firestore);
      toMark.forEach(ev => {
        const ref = doc(firestore, 'users', userId!, 'presenceEvents', ev.eventId);
        batch.update(ref, { seenAt: Timestamp.now() });
        seen.add(ev.eventId);
      });
      batch.commit().catch(() => {});
      saveSeenSet(seen);
    };

    const start = async () => {
      try {
        const q = query(
          collection(firestore, 'users', userId, 'presenceEvents'),
          where('status', '==', 'pending'),
          where('channel', 'in', ['in_app', 'push']),
          orderBy('urgencyScore', 'desc'),
          limit(6)
        );

        // [FINOPS] Troca de onSnapshot por getDocs para carregamento único (mais barato)
        const snap = await getDocs(q);
        const now = Math.floor(Date.now() / 1000);
        const items = snap.docs
          .map(d => ({ eventId: d.id, ...d.data() } as PresenceEvent))
          .filter(ev => !ev.expiresAt || ev.expiresAt.seconds > now)
          .slice(0, 3);

        setEvents(items);
        setLoading(false);
        markSeen(items);
      } catch (error) {
        console.error('[HomePresenceFeed] Erro ao buscar presenceEvents:', error);

        const requiresIndex =
          error &&
          typeof error === 'object' &&
          'code' in error &&
          (error as any).code === 'failed-precondition';

        if (!requiresIndex) {
          setLoading(false);
          return;
        }

        try {
          const fallbackQ = query(
            collection(firestore, 'users', userId, 'presenceEvents'),
            where('status', '==', 'pending'),
            limit(20)
          );

          const fallbackSnap = await getDocs(fallbackQ);
          const now = Math.floor(Date.now() / 1000);
          const items = fallbackSnap.docs
            .map(d => ({ eventId: d.id, ...d.data() } as PresenceEvent))
            .filter(ev => (ev.channel === 'in_app' || ev.channel === 'push'))
            .filter(ev => !ev.expiresAt || ev.expiresAt.seconds > now)
            .sort((a, b) => (b.urgencyScore || 0) - (a.urgencyScore || 0))
            .slice(0, 3);

          setEvents(items);
          markSeen(items);
        } catch (fallbackError) {
          console.error('[HomePresenceFeed] Fallback query também falhou:', fallbackError);
        } finally {
          setLoading(false);
        }
      }
    };

    start();
  }, [userId, isAuthenticated]);

  const staticFallbackByPersona: Record<string, PresenceEvent[]> = {
    dividas: [
      {
        eventId: 'static-dividas-1',
        eventType: 'onboarding.register_debts',
        urgency: 'medium',
        urgencyScore: 2,
        expiresAt: { seconds: Infinity },
        status: 'pending',
        message: {
          title: 'Comece pelo cadastro',
          body: 'Registre suas dívidas para que o Nexus acompanhe sua jornada com contexto real.',
          ctaLabel: 'Ir para Minhas Dívidas',
        },
        deepLink: 'minhas-dividas',
        channel: 'in_app',
      },
    ],
    patrimonio: [
      {
        eventId: 'static-patrimonio-1',
        eventType: 'onboarding.register_assets',
        urgency: 'medium',
        urgencyScore: 2,
        expiresAt: { seconds: Infinity },
        status: 'pending',
        message: {
          title: 'Base patrimonial pendente',
          body: 'Cadastre seus ativos e investimentos para o ecossistema acompanhar sua evolução.',
          ctaLabel: 'Cadastrar patrimônio',
        },
        deepLink: 'investimentos',
        channel: 'in_app',
      },
    ],
  };

  const displayEvents = events.length > 0 ? events : (staticFallbackByPersona[heroPersona] ?? []);

  // Teaser estático por persona para usuário não autenticado
  const teaserByPersona: Record<string, PresenceEvent[]> = {
    dividas: [
      {
        eventId: 'teaser-1',
        eventType: 'teaser',
        urgency: 'high',
        urgencyScore: 3,
        expiresAt: { seconds: Infinity },
        status: 'pending',
        message: {
          title: 'Cartão vence em 3 dias',
          body: 'Com suas dívidas cadastradas, o sistema avisa antes — não depois. Você age no momento certo, sem susto.',
          ctaLabel: 'Quero ser avisado assim',
        },
        deepLink: 'register',
        channel: 'in_app',
      },
      {
        eventId: 'teaser-2',
        eventType: 'teaser',
        urgency: 'medium',
        urgencyScore: 2,
        expiresAt: { seconds: Infinity },
        status: 'pending',
        message: {
          title: 'Qual dívida atacar primeiro?',
          body: 'O Nexus analisa taxas, fôlego e prazo e responde com clareza. Sem planilha, sem chute.',
          ctaLabel: 'Ver como funciona',
        },
        deepLink: 'register',
        channel: 'in_app',
      },
      {
        eventId: 'teaser-3',
        eventType: 'teaser',
        urgency: 'low',
        urgencyScore: 1,
        expiresAt: { seconds: Infinity },
        status: 'pending',
        message: {
          title: FPI_COPY.presencePlanTightened,
          body: 'Quando a rotina muda, o sistema detecta e sugere ajuste antes que a folga saia do controle.',
          ctaLabel: 'Começar de graça',
        },
        deepLink: 'register',
        channel: 'in_app',
      },
    ],
    patrimonio: [
      {
        eventId: 'teaser-1',
        eventType: 'teaser',
        urgency: 'medium',
        urgencyScore: 2,
        expiresAt: { seconds: Infinity },
        status: 'pending',
        message: {
          title: 'Aporte previsto para esta semana',
          body: 'O sistema lembra antes — para você revisar a distribuição com calma, não na correria do dia.',
          ctaLabel: 'Quero ser lembrado assim',
        },
        deepLink: 'register',
        channel: 'in_app',
      },
      {
        eventId: 'teaser-2',
        eventType: 'teaser',
        urgency: 'medium',
        urgencyScore: 2,
        expiresAt: { seconds: Infinity },
        status: 'pending',
        message: {
          title: 'Patrimônio sem revisão há 14 dias',
          body: 'O Nexus avisa quando seu patrimônio ficou tempo demais sem conferência. Pequenas correções evitam grandes surpresas.',
          ctaLabel: 'Quero esse acompanhamento',
        },
        deepLink: 'register',
        channel: 'in_app',
      },
      {
        eventId: 'teaser-3',
        eventType: 'teaser',
        urgency: 'low',
        urgencyScore: 1,
        expiresAt: { seconds: Infinity },
        status: 'pending',
        message: {
          title: 'Meta próxima do prazo',
          body: 'Com meta cadastrada, o sistema mostra se você está no ritmo certo ou se precisa ajustar o aporte agora.',
          ctaLabel: 'Começar de graça',
        },
        deepLink: 'register',
        channel: 'in_app',
      },
    ],
  };

  if (loading) return null;

  const isTeaser = !isAuthenticated;
  const feedEvents = isTeaser
    ? (teaserByPersona[heroPersona] ?? [])
    : displayEvents;

  if (feedEvents.length === 0) return null;

  return (
    <section className="px-4 lg:px-12 pb-6 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isTeaser ? (
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-300"></span>
            </span>
          ) : (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {isTeaser ? 'O que o sistema avisa para você' : 'O sistema identificou'}
          </span>
          {isTeaser && (
            <span className="text-[9px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              Exemplos reais
            </span>
          )}
        </div>
        {isTeaser && (
          <button
            onClick={() => onNavigate('register')}
            className="inline-flex items-center gap-1.5 text-[11px] font-black bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-full transition-colors"
          >
            Criar conta grátis <ArrowRight size={11} />
          </button>
        )}
      </div>
      <div className={`flex flex-col sm:flex-row gap-3`}>
        {feedEvents.map((ev) => {
          const cfg = urgencyConfig[ev.urgency] || urgencyConfig.low;
          return (
            <div key={ev.eventId} className={`flex-1 ${cfg.bg} border ${cfg.border} rounded-2xl p-4 shadow-sm ${isTeaser ? 'pointer-events-none select-none' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${cfg.badge}`}>{urgencyLabel[ev.urgency]}</span>
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              </div>
              <p className="text-sm font-black text-slate-900 mb-1">{ev.message.title}</p>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">{ev.message.body}</p>
              {isTeaser ? (
                <button
                  onClick={() => onNavigate('register')}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                  Criar conta para ver os seus <ArrowRight size={12} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    onNavigate(ev.deepLink);
                    if (ev.eventId && !ev.eventId.startsWith('static-') && userId) {
                      PresenceEventService.markActioned(userId, ev.eventId);
                    }
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                  {ev.message.ctaLabel} <ArrowRight size={12} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};