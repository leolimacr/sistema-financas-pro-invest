import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BalanceCards, { getVoucherTitle } from './BalanceCards';
import { ExclusionsProvider } from '../../../../contexts/ExclusionsContext';

describe('getVoucherTitle helper', () => {
  it('retorna título limpo para Alimentação genérico', () => {
    expect(getVoucherTitle({ name: 'Alimentação' })).toBe('Retirar o saldo do Cartão Alimentação');
    expect(getVoucherTitle({ name: 'Vale Alimentação' })).toBe('Retirar o saldo do Cartão Alimentação');
    expect(getVoucherTitle({ name: 'Cartão Alimentação' })).toBe('Retirar o saldo do Cartão Alimentação');
  });

  it('retorna título específico com nome para cartão nominal de Alimentação', () => {
    expect(getVoucherTitle({ name: 'Alelo', voucherType: 'alimentacao' })).toBe('Retirar o saldo do Cartão Alimentação (Alelo)');
    expect(getVoucherTitle({ name: 'Alelo Alimentação' })).toBe('Retirar o saldo do Cartão Alimentação (Alelo Alimentação)');
    expect(getVoucherTitle({ name: 'Ticket VA' })).toBe('Retirar o saldo do Cartão Alimentação (Ticket VA)');
  });

  it('retorna título limpo para Refeição genérico', () => {
    expect(getVoucherTitle({ name: 'Refeição' })).toBe('Retirar o saldo do Cartão Refeição');
    expect(getVoucherTitle({ name: 'Vale Refeição' })).toBe('Retirar o saldo do Cartão Refeição');
  });

  it('retorna título específico com nome para cartão nominal de Refeição', () => {
    expect(getVoucherTitle({ name: 'Sodexo', voucherType: 'refeicao' })).toBe('Retirar o saldo do Cartão Refeição (Sodexo)');
    expect(getVoucherTitle({ name: 'Ticket Refeição' })).toBe('Retirar o saldo do Cartão Refeição (Ticket Refeição)');
    expect(getVoucherTitle({ name: 'Flash VR' })).toBe('Retirar o saldo do Cartão Refeição (Flash VR)');
  });

  it('retorna fallback para outros vouchers', () => {
    expect(getVoucherTitle({ name: 'Combustível' })).toBe('Retirar o saldo do Cartão Voucher (Combustível)');
  });
});

describe('BalanceCards Component - Checkboxes de Exclusão', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const defaultProps = {
    isPrivacyMode: false,
    saldoReal: 5000,
    receitasMes: 7000,
    despesasMes: 2000,
    reserveTarget: 1000,
    colchaoTarget: 500,
    transactions: [],
    voucherCards: [
      { id: 'v-1', name: 'Alelo Alimentação', balance: 800, voucherType: 'alimentacao' as const },
      { id: 'v-2', name: 'Sodexo Refeição', balance: 400, voucherType: 'refeicao' as const },
      { id: 'v-3', name: 'Ticket Cultura', balance: 0, voucherType: 'outro' as const },
    ],
  };

  it('renderiza os checkboxes de Alimentação e Refeição com valores corretos', () => {
    render(
      <ExclusionsProvider>
        <BalanceCards {...defaultProps} />
      </ExclusionsProvider>
    );

    expect(screen.getByText('Retirar minha reserva de emergência')).toBeDefined();
    expect(screen.getByText('Retirar o meu Colchão emergencial')).toBeDefined();
    expect(screen.getByText('Retirar o saldo do Cartão Alimentação (Alelo Alimentação)')).toBeDefined();
    expect(screen.getByText('Retirar o saldo do Cartão Refeição (Sodexo Refeição)')).toBeDefined();
    expect(screen.getByText('Retirar o saldo do Cartão Voucher (Ticket Cultura)')).toBeDefined();
  });

  it('cartão com saldo zerado é exibido desabilitado', () => {
    render(
      <ExclusionsProvider>
        <BalanceCards {...defaultProps} />
      </ExclusionsProvider>
    );

    const ticketCheckbox = screen.getByLabelText(/Ticket Cultura/i) as HTMLInputElement;
    expect(ticketCheckbox.disabled).toBe(true);
    expect(ticketCheckbox.checked).toBe(false);
  });

  it('exibe saldo inicial composto por saldoReal + vouchers ativos (5000 + 800 + 400 = 6200)', () => {
    render(
      <ExclusionsProvider>
        <BalanceCards {...defaultProps} />
      </ExclusionsProvider>
    );

    // Saldo inicial composto: 5000 (conta) + 800 (Alelo) + 400 (Sodexo) = 6200
    // O h2 principal e o FinanceTotal exibem 6.200
    expect(screen.getAllByText(/6\.200,00/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Saldo Atual').length).toBeGreaterThanOrEqual(1);
  });

  it('marcar checkbox de voucher único mantém o topo íntegro (6200) e abate no total com exclusões (5400)', () => {
    render(
      <ExclusionsProvider>
        <BalanceCards {...defaultProps} />
      </ExclusionsProvider>
    );

    const aleloCheckbox = screen.getByLabelText(/Alelo Alimentação/i) as HTMLInputElement;
    expect(aleloCheckbox.checked).toBe(false);

    // Saldo inicial total sem exclusões: 6200
    // Ao clicar para abater Alelo Alimentação (800): 6200 - 800 = 5400
    fireEvent.click(aleloCheckbox);

    // O SALDO ATUAL no topo NUNCA sofre exclusão: permanece R$ 6.200,00
    expect(screen.getByRole('heading', { level: 2, name: /6\.200,00/ })).toBeDefined();

    // A linha inferior de fechamento exibe 'Saldo Atual (com exclusões)' com 5.400,00
    expect(screen.getByText('Saldo Atual (com exclusões)')).toBeDefined();
    expect(screen.getAllByText(/5\.400,00/).length).toBeGreaterThanOrEqual(1);
  });

  it('marcar todos os vouchers ativos mantém o topo íntegro (6200) e revela 5000 no fechamento com exclusões', () => {
    render(
      <ExclusionsProvider>
        <BalanceCards {...defaultProps} />
      </ExclusionsProvider>
    );

    const aleloCheckbox = screen.getByLabelText(/Alelo Alimentação/i) as HTMLInputElement;
    const sodexoCheckbox = screen.getByLabelText(/Sodexo Refeição/i) as HTMLInputElement;

    // Abate Alelo (800) e Sodexo (400)
    fireEvent.click(aleloCheckbox);
    fireEvent.click(sodexoCheckbox);

    // O SALDO ATUAL no topo NUNCA sofre exclusão: permanece R$ 6.200,00
    expect(screen.getByRole('heading', { level: 2, name: /6\.200,00/ })).toBeDefined();

    // Linha inferior de fechamento: 6200 - 800 - 400 = 5000 (estritamente o saldoReal da conta bancária)
    expect(screen.getByText('Saldo Atual (com exclusões)')).toBeDefined();
    expect(screen.getAllByText(/5\.000,00/).length).toBeGreaterThanOrEqual(1);
  });

  it('marcar reserva além dos vouchers mantém o topo íntegro (6200) e exibe 4000 no fechamento com exclusões', () => {
    render(
      <ExclusionsProvider>
        <BalanceCards {...defaultProps} />
      </ExclusionsProvider>
    );

    const aleloCheckbox = screen.getByLabelText(/Alelo Alimentação/i) as HTMLInputElement;
    const sodexoCheckbox = screen.getByLabelText(/Sodexo Refeição/i) as HTMLInputElement;
    const reservaCheckbox = screen.getByLabelText(/Retirar minha reserva de emergência/i) as HTMLInputElement;

    fireEvent.click(aleloCheckbox);
    fireEvent.click(sodexoCheckbox);
    fireEvent.click(reservaCheckbox);

    // O SALDO ATUAL no topo permanece R$ 6.200,00
    expect(screen.getByRole('heading', { level: 2, name: /6\.200,00/ })).toBeDefined();

    // Linha inferior: 6200 - 800 - 400 - 1000 = 4000
    expect(screen.getByText('Saldo Atual (com exclusões)')).toBeDefined();
    expect(screen.getAllByText(/4\.000,00/).length).toBeGreaterThanOrEqual(1);
  });

  it('renderiza botão de extrato e chama onOpenCardManager com o id do cartão voucher', () => {
    const handleOpen = vi.fn();

    render(
      <ExclusionsProvider>
        <BalanceCards {...defaultProps} onOpenCardManager={handleOpen} />
      </ExclusionsProvider>
    );

    const statementBtn = screen.getByRole('button', { name: /Ver extrato do cartão Alelo Alimentação/i });
    expect(statementBtn).toBeInTheDocument();

    fireEvent.click(statementBtn);
    expect(handleOpen).toHaveBeenCalledWith('v-1');
  });
});
