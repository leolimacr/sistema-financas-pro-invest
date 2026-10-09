import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import MobileAppGate from '../MobileAppGate';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('MobileAppGate - Smart Bridge de Abertura do App e Relatório', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = {
      ...originalLocation,
      href: '',
      pathname: '/app/dashboard',
      search: '?origin=email_weekly_summary',
      hash: '',
    };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('não renderiza se não for navegador móvel (ex: Desktop)', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <MobileAppGate isMobileBrowser={false} isAuthenticated={true} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('não renderiza se já foi dispensado nesta sessão', () => {
    sessionStorage.setItem('fpi-mobile-web-dismissed', 'true');
    const { container } = render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <MobileAppGate isMobileBrowser={true} isAuthenticated={true} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza com contexto de relatório financeiro quando o destino é o dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard?origin=email_weekly_summary']}>
        <MobileAppGate isMobileBrowser={true} isAuthenticated={true} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('mobile-app-gate')).toBeInTheDocument();
    expect(screen.getByText('Seu Relatório Está Pronto')).toBeInTheDocument();
    expect(screen.getByText('Relatório')).toBeInTheDocument();
    expect(screen.getByTestId('open-in-app-btn')).toHaveTextContent('Abrir Relatório no Aplicativo');
    expect(screen.getByTestId('continue-on-web-btn')).toHaveTextContent('Ver Relatório no Navegador Web');
  });

  it('renderiza com contexto geral quando a rota é outra ferramenta', () => {
    render(
      <MemoryRouter initialEntries={['/app/controla']}>
        <MobileAppGate isMobileBrowser={true} isAuthenticated={true} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('mobile-app-gate')).toBeInTheDocument();
    expect(screen.getByText('Experiência Completa no Celular')).toBeInTheDocument();
    expect(screen.getByText('App Mobile')).toBeInTheDocument();
    expect(screen.getByTestId('open-in-app-btn')).toHaveTextContent('Abrir no Aplicativo Instalado');
    expect(screen.getByTestId('continue-on-web-btn')).toHaveTextContent('Continuar no Navegador Web');
  });

  it('dispensa o modal e salva na sessionStorage ao clicar em "Continuar no Navegador Web"', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <MobileAppGate isMobileBrowser={true} isAuthenticated={true} />
      </MemoryRouter>
    );

    const continueBtn = screen.getByTestId('continue-on-web-btn');
    fireEvent.click(continueBtn);

    expect(sessionStorage.getItem('fpi-mobile-web-dismissed')).toBe('true');
    expect(screen.queryByTestId('mobile-app-gate')).not.toBeInTheDocument();
  });

  it('dispensa o modal ao clicar no botão fechar (X)', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <MobileAppGate isMobileBrowser={true} isAuthenticated={true} />
      </MemoryRouter>
    );

    const closeBtn = screen.getByRole('button', { name: /fechar e continuar na web/i });
    fireEvent.click(closeBtn);

    expect(sessionStorage.getItem('fpi-mobile-web-dismissed')).toBe('true');
    expect(screen.queryByTestId('mobile-app-gate')).not.toBeInTheDocument();
  });

  it('dispara abertura pelo intent nativo ao clicar em "Abrir Relatório no Aplicativo"', () => {
    // Simula User Agent Android
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile',
      configurable: true,
    });

    render(
      <MemoryRouter initialEntries={['/app/dashboard?origin=email_weekly_summary']}>
        <MobileAppGate isMobileBrowser={true} isAuthenticated={true} />
      </MemoryRouter>
    );

    const openBtn = screen.getByTestId('open-in-app-btn');
    fireEvent.click(openBtn);

    expect(window.location.href).toContain('intent://app/dashboard?origin=email_weekly_summary#Intent;scheme=financaspro;package=com.financasproinvest.app;end');
  });

  it('navega para /download ao clicar no link de download do APK', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <MobileAppGate isMobileBrowser={true} isAuthenticated={true} />
      </MemoryRouter>
    );

    const downloadLink = screen.getByText(/Ainda não instalou o aplicativo no celular\? Baixar APK Android/i);
    fireEvent.click(downloadLink);

    expect(mockNavigate).toHaveBeenCalledWith('/download');
  });
});
