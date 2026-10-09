import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { continuousAlarmPlayer } from '../continuousAlarmPlayer';

describe('continuousAlarmPlayer (Reprodutor de Alarme Contínuo)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    continuousAlarmPlayer.stop();
  });

  afterEach(() => {
    continuousAlarmPlayer.stop();
    vi.useRealTimers();
  });

  it('inicia com isPlaying false e payload nulo', () => {
    expect(continuousAlarmPlayer.isPlaying()).toBe(false);
    expect(continuousAlarmPlayer.getActivePayload()).toBeNull();
  });

  it('inicia o alarme e notifica assinantes com payload ativo', () => {
    let lastActive: boolean | null = null;
    let lastPayload: any = null;

    const unsubscribe = continuousAlarmPlayer.subscribe((active, payload) => {
      lastActive = active;
      lastPayload = payload;
    });

    continuousAlarmPlayer.start({
      commitmentId: 'comm-123',
      title: 'Pagar DARF',
      dateStr: '2026-09-23',
    });

    expect(continuousAlarmPlayer.isPlaying()).toBe(true);
    expect(lastActive).toBe(true);
    expect(lastPayload?.title).toBe('Pagar DARF');

    unsubscribe();
  });

  it('interrompe o alarme e limpa estado ao chamar stop()', () => {
    continuousAlarmPlayer.start({
      commitmentId: 'comm-123',
      title: 'Pagar DARF',
      dateStr: '2026-09-23',
    });

    expect(continuousAlarmPlayer.isPlaying()).toBe(true);

    continuousAlarmPlayer.stop();

    expect(continuousAlarmPlayer.isPlaying()).toBe(false);
    expect(continuousAlarmPlayer.getActivePayload()).toBeNull();
  });

  it('encerra automaticamente após 180 segundos (auto-stop de segurança de bateria)', () => {
    continuousAlarmPlayer.start({
      commitmentId: 'comm-123',
      title: 'Pagar DARF',
      dateStr: '2026-09-23',
    });

    expect(continuousAlarmPlayer.isPlaying()).toBe(true);

    // Avança 181 segundos
    vi.advanceTimersByTime(181_000);

    expect(continuousAlarmPlayer.isPlaying()).toBe(false);
    expect(continuousAlarmPlayer.getActivePayload()).toBeNull();
  });
});
