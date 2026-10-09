import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectInstitutionsModal } from '../ConnectInstitutionsModal';

describe('ConnectInstitutionsModal - Modal Informativo de Conexão Automática', () => {
  it('não deve renderizar nada quando isOpen for false', () => {
    const { container } = render(
      <ConnectInstitutionsModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar título, badge de desenvolvimento e mensagem honesta quando aberto', () => {
    render(<ConnectInstitutionsModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('connect-institutions-modal')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /conexão automática em desenvolvimento/i })).toBeInTheDocument();
    expect(screen.getAllByText(/em desenvolvimento/i).length).toBeGreaterThan(0);

    // Texto pedagógico, factual e honesto (sem alegar homologação ou suporte garantido)
    expect(
      screen.getByText(/a sincronização automática com instituições financeiras e corretoras é um recurso em desenvolvimento/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/as instituições compatíveis ainda estão em definição/i)
    ).toBeInTheDocument();

    // Declaração de Autoridade Silenciosa e Rigor Contábil
    expect(
      screen.getByText(/o finanças pro invest nunca estima preço médio, quantidade ou resultado fiscal sem dados suficientes/i)
    ).toBeInTheDocument();
  });

  it('GARANTIA DE SEGURANÇA: não deve solicitar senha, token, API key, login bancário ou credenciais', () => {
    const { container } = render(<ConnectInstitutionsModal isOpen={true} onClose={vi.fn()} />);

    // Não deve conter campos de entrada de senha, texto ou token
    const passwordInputs = container.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBe(0);

    const allInputs = container.querySelectorAll('input');
    expect(allInputs.length).toBe(0);

    // Não deve conter textos pedindo credenciais
    expect(screen.queryByText(/digite sua senha/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/insira seu token/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/chave de api/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/credenciais/i)).not.toBeInTheDocument();
  });

  it('GARANTIA DE VERACIDADE: não deve conter checkbox ou promessa falsa de lista de aviso não persistida', () => {
    const { container } = render(<ConnectInstitutionsModal isOpen={true} onClose={vi.fn()} />);

    // Não deve existir checkbox de consentimento simulado
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(0);

    expect(screen.queryByText(/quero ser avisado/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/avise-me por e-mail/i)).not.toBeInTheDocument();
  });

  it('deve disparar onOpenImport e fechar ao clicar em "Importar arquivo"', () => {
    const handleClose = vi.fn();
    const handleOpenImport = vi.fn();

    render(
      <ConnectInstitutionsModal
        isOpen={true}
        onClose={handleClose}
        onOpenImport={handleOpenImport}
      />
    );

    const importBtn = screen.getByRole('button', { name: /importar arquivo/i });
    fireEvent.click(importBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleOpenImport).toHaveBeenCalledTimes(1);
  });

  it('deve disparar onOpenManual e fechar ao clicar em "Cadastrar manualmente"', () => {
    const handleClose = vi.fn();
    const handleOpenManual = vi.fn();

    render(
      <ConnectInstitutionsModal
        isOpen={true}
        onClose={handleClose}
        onOpenManual={handleOpenManual}
      />
    );

    const manualBtn = screen.getByRole('button', { name: /cadastrar manualmente/i });
    fireEvent.click(manualBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleOpenManual).toHaveBeenCalledTimes(1);
  });

  it('deve fechar ao clicar em "Entendi" ou no botão de fechar (X)', () => {
    const handleClose = vi.fn();

    const { rerender } = render(
      <ConnectInstitutionsModal isOpen={true} onClose={handleClose} />
    );

    const entendiBtn = screen.getByRole('button', { name: /entendi/i });
    fireEvent.click(entendiBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Rerender e testa o botão X
    rerender(<ConnectInstitutionsModal isOpen={true} onClose={handleClose} />);
    const closeBtn = screen.getByRole('button', { name: /fechar modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(2);
  });

  it('deve fechar ao pressionar a tecla Escape', () => {
    const handleClose = vi.fn();
    render(<ConnectInstitutionsModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  describe('Acessibilidade e Gerenciamento de Foco', () => {
    it('deve posicionar o foco inicial no primeiro elemento focável do modal', () => {
      vi.useFakeTimers();
      render(
        <ConnectInstitutionsModal
          isOpen={true}
          onClose={vi.fn()}
          onOpenImport={vi.fn()}
        />
      );

      vi.runAllTimers();

      const closeBtn = screen.getByTestId('modal-close-button');
      expect(document.activeElement).toBe(closeBtn);
      vi.useRealTimers();
    });

    it('deve conter o foco no modal com Tab e Shift+Tab (focus trap)', () => {
      render(
        <ConnectInstitutionsModal
          isOpen={true}
          onClose={vi.fn()}
          onOpenImport={vi.fn()}
          onOpenManual={vi.fn()}
        />
      );

      const closeBtn = screen.getByTestId('modal-close-button');
      const dismissBtn = screen.getByTestId('modal-dismiss-button');

      // Do último elemento (Entendi), Tab avança para o primeiro (Fechar)
      dismissBtn.focus();
      expect(document.activeElement).toBe(dismissBtn);

      fireEvent.keyDown(window, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(closeBtn);

      // Do primeiro elemento (Fechar), Shift+Tab recua para o último (Entendi)
      fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(dismissBtn);
    });

    it('deve restaurar o foco para o elemento acionador ao fechar o modal', () => {
      const triggerBtn = document.createElement('button');
      triggerBtn.setAttribute('data-testid', 'test-trigger-btn');
      document.body.appendChild(triggerBtn);
      triggerBtn.focus();
      expect(document.activeElement).toBe(triggerBtn);

      const { rerender } = render(
        <ConnectInstitutionsModal isOpen={true} onClose={vi.fn()} />
      );

      // Fecha o modal mudando isOpen para false
      rerender(<ConnectInstitutionsModal isOpen={false} onClose={vi.fn()} />);

      expect(document.activeElement).toBe(triggerBtn);
      document.body.removeChild(triggerBtn);
    });
  });
});
