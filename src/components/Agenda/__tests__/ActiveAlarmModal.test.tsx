import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ActiveAlarmModal from '../ActiveAlarmModal';
import { continuousAlarmPlayer } from '../../../services/continuousAlarmPlayer';

// Mock do alarmService para capturar chamadas
vi.mock('../../../services/alarmService', () => ({
  dismissAlarm: vi.fn(() => continuousAlarmPlayer.stop()),
  snoozeAlarm: vi.fn(() => continuousAlarmPlayer.stop()),
}));

describe('ActiveAlarmModal (Modal de Alarme Ativo)', () => {
  beforeEach(() => {
    continuousAlarmPlayer.stop();
    vi.clearAllMocks();
  });

  afterEach(() => {
    continuousAlarmPlayer.stop();
  });

  it('não renderiza nada quando nenhum alarme está tocando', () => {
    const { container } = render(<ActiveAlarmModal />);
    expect(container.firstChild).toBeNull();
  });

  it('renderiza título e botões de ação quando o alarme contínuo inicia', () => {
    render(<ActiveAlarmModal />);

    act(() => {
      continuousAlarmPlayer.start({
        commitmentId: 'comm-1',
        title: 'Pagar Aluguel',
        dateStr: '2026-09-23',
      });
    });

    expect(screen.getByText('Alarme da Agenda')).toBeDefined();
    expect(screen.getByText('Pagar Aluguel')).toBeDefined();
    expect(screen.getByText('Dispensar Alarme')).toBeDefined();
    expect(screen.getByText('Soneca (+5 min)')).toBeDefined();
  });

  it('clicar em Dispensar Alarme interrompe o alarme', () => {
    render(<ActiveAlarmModal />);

    act(() => {
      continuousAlarmPlayer.start({
        commitmentId: 'comm-1',
        title: 'Pagar Aluguel',
        dateStr: '2026-09-23',
      });
    });

    const dismissBtn = screen.getByText('Dispensar Alarme');
    fireEvent.click(dismissBtn);

    expect(continuousAlarmPlayer.isPlaying()).toBe(false);
  });

  it('pressionar Escape fecha o modal e interrompe o alarme', () => {
    render(<ActiveAlarmModal />);

    act(() => {
      continuousAlarmPlayer.start({
        commitmentId: 'comm-1',
        title: 'Pagar Aluguel',
        dateStr: '2026-09-23',
      });
    });

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });

    expect(continuousAlarmPlayer.isPlaying()).toBe(false);
  });
});
