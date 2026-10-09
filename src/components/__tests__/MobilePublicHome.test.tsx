import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import MobilePublicHome from '../MobilePublicHome';

const mockEnterDemoMode = vi.fn();

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    enterDemoMode: mockEnterDemoMode,
  }),
}));

describe('MobilePublicHome (Etapa B2 — Onboarding Mobile Deslogado & Fase 2)', () => {
  it('renderiza título principal e os 4 pilares da liberdade soberana', () => {
    render(
      <MemoryRouter>
        <MobilePublicHome onLogin={vi.fn()} onRegister={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Saiba exatamente quanto/i)).toBeInTheDocument();
    expect(screen.getByText(/sobra de verdade/i)).toBeInTheDocument();
    expect(screen.getByText(/A Arquitetura da Liberdade/i)).toBeInTheDocument();

    // 4 Pilares visíveis
    expect(screen.getByText('Caixa')).toBeInTheDocument();
    expect(screen.getByText('Compromissos')).toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Evolução')).toBeInTheDocument();
  });

  it('permite alternar entre os pilares para explorar os conceitos', () => {
    render(
      <MemoryRouter>
        <MobilePublicHome onLogin={vi.fn()} onRegister={vi.fn()} />
      </MemoryRouter>
    );

    // Inicialmente no pilar 1 (Caixa & Rotina)
    expect(screen.getByText('Pilar 01 de 04')).toBeInTheDocument();
    expect(screen.getByText('Caixa & Rotina')).toBeInTheDocument();

    // Clica no pilar 2 (Compromissos)
    fireEvent.click(screen.getByText('Compromissos'));
    expect(screen.getByText('Pilar 02 de 04')).toBeInTheDocument();
    expect(screen.getByText('Contas fixas e faturas programadas')).toBeInTheDocument();

    // Clica no pilar 3 (Base de Proteção)
    fireEvent.click(screen.getByText('Base'));
    expect(screen.getByText('Pilar 03 de 04')).toBeInTheDocument();
    expect(screen.getByText('Base de Proteção')).toBeInTheDocument();

    // Clica no pilar 4 (Evolução)
    fireEvent.click(screen.getByText('Evolução'));
    expect(screen.getByText('Pilar 04 de 04')).toBeInTheDocument();
    expect(screen.getByText('Multiplicação e independência financeira')).toBeInTheDocument();
  });

  it('aciona os callbacks de Login e Criar Conta', () => {
    const onLogin = vi.fn();
    const onRegister = vi.fn();

    render(
      <MemoryRouter>
        <MobilePublicHome onLogin={onLogin} onRegister={onRegister} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Criar Conta Gratuita'));
    expect(onRegister).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText(/Já tenho conta • Entrar/i));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('exibe o botão de demonstração sem cadastro e aciona o enterDemoMode', () => {
    render(
      <MemoryRouter>
        <MobilePublicHome onLogin={vi.fn()} onRegister={vi.fn()} />
      </MemoryRouter>
    );

    const demoBtn = screen.getByText(/Experimentar demonstração sem cadastro/i);
    expect(demoBtn).toBeInTheDocument();

    fireEvent.click(demoBtn);
    expect(mockEnterDemoMode).toHaveBeenCalledTimes(1);
  });

  it('renderiza o carrossel de simuladores e ferramentas abertas', () => {
    render(
      <MemoryRouter>
        <MobilePublicHome onLogin={vi.fn()} onRegister={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Simuladores & Ferramentas Abertas')).toBeInTheDocument();
    expect(screen.getByText('Juros Compostos')).toBeInTheDocument();
    expect(screen.getByText('Calculadora de Dívidas')).toBeInTheDocument();
    expect(screen.getByText('Calculadora de Independência Financeira')).toBeInTheDocument();
  });
});
