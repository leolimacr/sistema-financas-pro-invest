import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AgendaAlarmModal from '../AgendaAlarmModal';

describe('AgendaAlarmModal (Seletor Triplo de Aviso)', () => {
  const defaultTarget = {
    id: 'comm-1',
    date: new Date('2026-09-23T10:00:00'),
    title: 'Transferência Fornecedor',
  };

  it('não renderiza nada se target for nulo', () => {
    const { container } = render(
      <AgendaAlarmModal
        target={null}
        onClose={vi.fn()}
        onSetAlarm={vi.fn()}
        onClearAlarm={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('exibe as 3 opções de aviso: Notificação, Alarme e Ambos', () => {
    render(
      <AgendaAlarmModal
        target={defaultTarget}
        onClose={vi.fn()}
        onSetAlarm={vi.fn()}
        onClearAlarm={vi.fn()}
      />
    );

    expect(screen.getByText('Notificação')).toBeDefined();
    expect(screen.getByText('Alarme')).toBeDefined();
    expect(screen.getByText('Ambos')).toBeDefined();
    expect(screen.getByText('Transferência Fornecedor')).toBeDefined();
  });

  it('permite selecionar o modo Alarme e repassa no onSetAlarm', () => {
    const onSetAlarm = vi.fn();
    render(
      <AgendaAlarmModal
        target={defaultTarget}
        onClose={vi.fn()}
        onSetAlarm={onSetAlarm}
        onClearAlarm={vi.fn()}
      />
    );

    // Clica no modo Alarme
    const alarmBtn = screen.getByText('Alarme');
    fireEvent.click(alarmBtn);

    // Preenche horário
    const timeInput = screen.getByLabelText(/horário do disparo/i);
    fireEvent.change(timeInput, { target: { value: '14:30' } });

    // Clica em Definir
    const submitBtn = screen.getByText('Definir');
    fireEvent.click(submitBtn);

    expect(onSetAlarm).toHaveBeenCalledWith('14:30', 'alarm');
  });

  it('permite selecionar o modo Notificação e repassa no onSetAlarm', () => {
    const onSetAlarm = vi.fn();
    render(
      <AgendaAlarmModal
        target={defaultTarget}
        onClose={vi.fn()}
        onSetAlarm={onSetAlarm}
        onClearAlarm={vi.fn()}
      />
    );

    // Clica no modo Notificação
    const notifBtn = screen.getByText('Notificação');
    fireEvent.click(notifBtn);

    const timeInput = screen.getByLabelText(/horário do disparo/i);
    fireEvent.change(timeInput, { target: { value: '09:00' } });

    const submitBtn = screen.getByText('Definir');
    fireEvent.click(submitBtn);

    expect(onSetAlarm).toHaveBeenCalledWith('09:00', 'notification');
  });

  it('chama onClearAlarm ao clicar em Remover', () => {
    const onClearAlarm = vi.fn();
    const targetWithAlarm = {
      ...defaultTarget,
      currentAlarm: new Date('2026-09-23T10:00:00'),
    };

    render(
      <AgendaAlarmModal
        target={targetWithAlarm}
        onClose={vi.fn()}
        onSetAlarm={vi.fn()}
        onClearAlarm={onClearAlarm}
      />
    );

    const removeBtn = screen.getByText('Remover');
    fireEvent.click(removeBtn);

    expect(onClearAlarm).toHaveBeenCalled();
  });
});
