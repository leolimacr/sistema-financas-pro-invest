/**
 * Reprodutor de Alarme Contínuo (Continuous Alarm Player)
 * Sintetiza sinal sonoro persistente e cadenciado via Web Audio API
 * e vibração em loop até que o usuário dispense ou adie o alarme.
 * Possui auto-stop em 180 segundos (3 min) para proteção de bateria.
 */

export interface ActiveAlarmPayload {
  commitmentId: string;
  title: string;
  dateStr: string;
  timeStr?: string;
  userId?: string;
}

type AlarmStateListener = (active: boolean, payload: ActiveAlarmPayload | null) => void;

class ContinuousAlarmPlayer {
  private audioContext: AudioContext | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private autoStopTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private currentPayload: ActiveAlarmPayload | null = null;
  private playing: boolean = false;
  private listeners: Set<AlarmStateListener> = new Set();

  /** Cadência do alarme: 180 segundos (3 minutos) máximo de toque */
  private readonly AUTO_STOP_MS = 180_000;

  /** Inscreve listener para atualizações de estado do alarme ativo */
  public subscribe(listener: AlarmStateListener): () => void {
    this.listeners.add(listener);
    listener(this.playing, this.currentPayload);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.playing, this.currentPayload);
      } catch (err) {
        console.warn('[ContinuousAlarmPlayer] Erro no listener:', err);
      }
    }
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public getActivePayload(): ActiveAlarmPayload | null {
    return this.currentPayload;
  }

  /**
   * Inicia o toque sonoro e a vibração contínua em loop.
   */
  public start(payload: ActiveAlarmPayload): void {
    if (this.playing) {
      // Já está tocando: apenas atualiza o payload se for diferente
      this.currentPayload = payload;
      this.notify();
      return;
    }

    this.playing = true;
    this.currentPayload = payload;
    this.notify();

    // 1. Inicia o loop de áudio Web Audio API
    this.startAudioLoop();

    // 2. Inicia o loop de vibração háptica
    this.startVibrationLoop();

    // 3. Timeout defensivo para auto-stop após 3 minutos
    if (this.autoStopTimeoutId) clearTimeout(this.autoStopTimeoutId);
    this.autoStopTimeoutId = setTimeout(() => {
      console.warn('[ContinuousAlarmPlayer] Auto-stop atingido (3 min). Encerrando alarme.');
      this.stop();
    }, this.AUTO_STOP_MS);
  }

  /**
   * Encerra imediatamente o alarme sonoro e a vibração.
   */
  public stop(): void {
    if (!this.playing && !this.currentPayload) return;

    this.playing = false;
    this.currentPayload = null;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.autoStopTimeoutId) {
      clearTimeout(this.autoStopTimeoutId);
      this.autoStopTimeoutId = null;
    }

    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          void this.audioContext.close();
        }
      } catch {
        // silencioso
      }
      this.audioContext = null;
    }

    // Cancela qualquer vibração em andamento
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.(0);
      } catch {
        // silencioso
      }
    }

    this.notify();
  }

  private startAudioLoop(): void {
    if (typeof window === 'undefined') return;

    const playBeepCadence = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        if (!this.audioContext || this.audioContext.state === 'closed') {
          this.audioContext = new AudioCtx();
        }

        if (this.audioContext.state === 'suspended') {
          void this.audioContext.resume();
        }

        const now = this.audioContext.currentTime;

        // Tríade rítmica executiva (3 pulsos rápidos em A5 / 880 Hz com subida para 1046 Hz)
        const pulse = (freq: number, startTime: number, duration: number) => {
          if (!this.audioContext) return;
          const osc = this.audioContext.createOscillator();
          const gain = this.audioContext.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          // Ataque e decaimento limpos para não clicar nos alto-falantes
          gain.gain.setValueAtTime(0.0001, startTime);
          gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

          osc.connect(gain);
          gain.connect(this.audioContext.destination);

          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        pulse(880, now + 0.0, 0.12);
        pulse(880, now + 0.18, 0.12);
        pulse(1046, now + 0.36, 0.22);
      } catch (e) {
        // Fallback para navegadores com restrições rígidas de autoplay
        console.warn('[ContinuousAlarmPlayer] Não foi possível reproduzir pulso de áudio:', e);
      }
    };

    // Toca imediatamente o primeiro pulso
    playBeepCadence();

    // Repete a cada 1.4 segundos
    this.intervalId = setInterval(() => {
      if (this.playing) {
        playBeepCadence();
        this.triggerVibration();
      }
    }, 1400);
  }

  private triggerVibration(): void {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.([250, 100, 250, 100, 400]);
      } catch {
        // silencioso
      }
    }
  }

  private startVibrationLoop(): void {
    this.triggerVibration();
  }
}

export const continuousAlarmPlayer = new ContinuousAlarmPlayer();
