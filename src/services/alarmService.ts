import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { continuousAlarmPlayer } from './continuousAlarmPlayer';

export interface AlarmInfo {
  commitmentId: string;
  title: string;
  dateStr: string;
  alarmAt: Date;
  /** Modo de aviso gravado no compromisso: notificação, alarme contínuo ou ambos. */
  mode?: 'notification' | 'alarm' | 'notification_alarm';
  userId?: string;
}

let scheduledInterval: ReturnType<typeof setInterval> | null = null;
let onAlarmDue: ((info: AlarmInfo) => void) | null = null;
const firedIds = new Set<string>();

const isNative = Capacitor.isNativePlatform();
let channelCreated = false;

async function ensureAlarmChannel(): Promise<void> {
  if (!isNative || channelCreated) return;
  try {
    await LocalNotifications.createChannel({
      id: 'fpi_alarm_channel',
      name: 'Alarmes da Agenda',
      description: 'Canal de alta prioridade para alarmes de compromissos financeiros',
      importance: 5,
      sound: 'default',
      vibration: true,
      visibility: 1,
    });
    channelCreated = true;
  } catch (err) {
    console.warn('[alarmService] Erro ao criar canal de alarme:', err);
  }
}

/** Register callback for when an alarm is due */
export function setAlarmCallback(cb: (info: AlarmInfo) => void) {
  onAlarmDue = cb;
}

/** Schedule a single alarm */
export async function scheduleAlarm(info: AlarmInfo) {
  if (isNative) {
    try {
      const isAlarmMode = info.mode === 'alarm' || info.mode === 'notification_alarm';
      if (isAlarmMode) {
        await ensureAlarmChannel();
      }

      await LocalNotifications.schedule({
        notifications: [{
          id: hashId(info.commitmentId),
          title: isAlarmMode ? `⏰ Alarme: ${info.title}` : 'Agenda',
          body: info.title,
          schedule: { at: info.alarmAt },
          sound: 'default',
          channelId: isAlarmMode ? 'fpi_alarm_channel' : undefined,
          ongoing: isAlarmMode,
          smallIcon: 'ic_stat_fpi',
          largeIcon: 'ic_stat_logo',
          iconColor: '#0284c7',
          extra: { 
            commitmentId: info.commitmentId, 
            dateStr: info.dateStr,
            mode: info.mode || 'notification',
            deepLink: '/app/agenda',
            targetRoute: '/app/agenda',
            eventType: 'agenda.alarm_due',
          },
        }],
      });
    } catch {
      // fallback: will be picked up by periodic check
    }
  }
  // Desktop: periodic check handles it — no extra setup needed
}

/** Cancel a scheduled alarm */
export async function cancelAlarm(commitmentId: string) {
  if (isNative) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: hashId(commitmentId) }] });
    } catch {
      // ignore
    }
  }
}

/** Start periodic check (every 30s) for due alarms */
export function startAlarmChecker(commitments: AlarmInfo[]) {
  stopAlarmChecker();

  const tick = () => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const now = Date.now();
    for (const c of commitments) {
      const diff = c.alarmAt.getTime() - now;
      if (diff > 30000 || diff < -60000) {
        firedIds.delete(c.commitmentId);
      }
      if (diff <= 30000 && diff >= -1000 && !firedIds.has(c.commitmentId)) {
        firedIds.add(c.commitmentId);
        fireAlarm(c);
      }
    }
  };

  scheduledInterval = setInterval(tick, 30000);
}

/** Stop periodic check WITHOUT clearing fired state.
 * Parar o intervalo (ex.: recarga de dados) não pode esquecer o que já
 * disparou — senão um reload dentro da janela ([−1s,+30s]) re-dispara o
 * alarme e a navegação. A memória de disparo tem ciclo próprio: só
 * `resetAlarmState` (troca de usuário/unmount) a apaga; fora da janela, o
 * próprio tick esquece o id (TTL natural). */
export function stopAlarmChecker() {
  if (scheduledInterval) {
    clearInterval(scheduledInterval);
    scheduledInterval = null;
  }
}

/** Apaga a memória de disparos — chamar apenas em troca de usuário/unmount. */
export function resetAlarmState() {
  firedIds.clear();
}

function fireAlarm(info: AlarmInfo) {
  const isAlarmMode = info.mode === 'alarm' || info.mode === 'notification_alarm';
  const shouldNotify = info.mode === 'notification' || info.mode === 'notification_alarm' || !info.mode;

  // 1. Notificação do Sistema (Web Notification API)
  if (shouldNotify && !isNative && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      const n = new Notification(isAlarmMode ? `⏰ Alarme: ${info.title}` : 'Agenda', {
        body: info.title,
        icon: '/assets/images/brand/icon.png',
        tag: `agenda-${info.commitmentId}`,
      });
      n.onclick = () => {
        window.focus();
        if (onAlarmDue) onAlarmDue(info);
        if (typeof window !== 'undefined' && window.location.pathname !== '/app/agenda') {
          window.location.assign('/app/agenda');
        }
      };
    } catch {
      // fallback
    }
  }

  // 2. Feedback Sonoro: Alarme Contínuo em Loop vs Notificação Padrão Curta
  if (isAlarmMode) {
    continuousAlarmPlayer.start({
      commitmentId: info.commitmentId,
      title: info.title,
      dateStr: info.dateStr,
      userId: info.userId,
    });
  } else {
    attemptAlarmFeedback();
  }

  if (onAlarmDue) onAlarmDue(info);

  // 3. Registro no PresenceEventService
  if (info.userId) {
    import('./PresenceEventService')
      .then(({ PresenceEventService }) => {
        void PresenceEventService.create({
          uid: info.userId!,
          eventType: 'agenda.alarm_due',
          persona: 'wealth',
          urgency: 'high',
          message: {
            title: isAlarmMode ? `Alarme da Agenda: ${info.title}` : `Lembrete da Agenda: ${info.title}`,
            body: `Compromisso agendado para ${info.dateStr}.`,
            ctaLabel: 'Abrir Agenda',
          },
          deepLink: info.commitmentId
            ? `agenda?view=week&highlight=${info.commitmentId}${info.dateStr ? `&date=${info.dateStr}` : ''}`
            : 'agenda',
          cooldownHours: 6,
          expiresInHours: 48,
          resourceId: info.commitmentId,
        });
      })
      .catch(() => {});
  }
}

/** Para o alarme sonoro contínuo imediatamente */
export function dismissAlarm(): void {
  continuousAlarmPlayer.stop();
}

/** Adia o alarme por X minutos (padrão: 5 min) e reagenda */
export async function snoozeAlarm(info: AlarmInfo, minutes: number = 5): Promise<void> {
  continuousAlarmPlayer.stop();

  const snoozedDate = new Date(Date.now() + minutes * 60 * 1000);
  const snoozedInfo: AlarmInfo = {
    ...info,
    alarmAt: snoozedDate,
  };

  firedIds.delete(info.commitmentId);
  await scheduleAlarm(snoozedInfo);

  if (info.userId && info.commitmentId && !info.commitmentId.startsWith('temp_')) {
    try {
      const { updateCommitment } = await import('./agendaService');
      await updateCommitment(info.userId, info.commitmentId, {
        alarmAt: snoozedDate,
      });
    } catch (e) {
      console.warn('[alarmService] Erro ao persistir soneca no Firestore:', e);
    }
  }
}


/**
 * Sinal de alarme além da notificação visual (modo 'notification_alarm'):
 * vibração + tom curto. Totalmente feature-detectado — sem suporte no
 * dispositivo ou com exceção, não faz nada em silêncio.
 */
export function attemptAlarmFeedback(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      // sem vibração disponível
    }
  }
  if (typeof window === 'undefined' || typeof window.AudioContext !== 'function') return;
  try {
    const context = new window.AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.5);
    oscillator.addEventListener('ended', () => { void context.close(); });
  } catch {
    // áudio indisponível
  }
}

/** Request notification permission (desktop web e nativo Android/iOS) */
export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display === 'granted') return true;
      const req = await LocalNotifications.requestPermissions();
      return req.display === 'granted';
    } catch {
      return false;
    }
  }
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h) + id.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
