import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DebtVictoryBanner } from '../DebtVictoryBanner';
import type { DebtItem } from '../../../../services/debt/debt.types';

describe('DebtVictoryBanner', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockDebts: DebtItem[] = [
    {
      id: 'debt-1',
      nome: 'Empréstimo Caixa',
      tipo: 'emprestimo',
      saldoDevedor: 0,
      taxaMensal: 2.5,
      parcelasRestantes: 0,
      valorParcela: 650,
      dataVencimento: '2026-09-20',
      totalParcelas: 24,
      parcelasPagas: 24,
      historicoPagamentos: [],
    },
    {
      id: 'debt-2',
      nome: 'Financiamento Carro',
      tipo: 'financiamento',
      saldoDevedor: 15000,
      taxaMensal: 1.8,
      parcelasRestantes: 18,
      valorParcela: 980,
      dataVencimento: '2026-10-10',
      totalParcelas: 36,
      parcelasPagas: 18,
      historicoPagamentos: [],
    },
  ];

  it('renderiza banner de celebração quando há dívida quitada', () => {
    render(
      <DebtVictoryBanner
        debts={mockDebts}
        formatCurrency={(val) => `R$ ${val.toFixed(2)}`}
        isPrivacyMode={false}
      />
    );

    expect(screen.getByRole('region', { name: /celebração de quitação/i })).toBeInTheDocument();
    expect(screen.getByText(/Empréstimo Caixa: Dívida Liquidada!/i)).toBeInTheDocument();
    expect(screen.getByText(/\+R\$ 650.00\/mês/i)).toBeInTheDocument();
  });

  it('mascara o valor com bolinhas quando isPrivacyMode está ativo', () => {
    render(
      <DebtVictoryBanner
        debts={mockDebts}
        formatCurrency={(val) => `R$ ${val.toFixed(2)}`}
        isPrivacyMode={true}
      />
    );

    expect(screen.getByText(/\+••••••\/mês/i)).toBeInTheDocument();
    expect(screen.queryByText(/R\$ 650/i)).not.toBeInTheDocument();
  });

  it('permite dispensar o banner e persiste no localStorage', () => {
    render(
      <DebtVictoryBanner
        debts={mockDebts}
        formatCurrency={(val) => `R$ ${val.toFixed(2)}`}
        isPrivacyMode={false}
      />
    );

    const dismissBtn = screen.getByTitle(/Reconhecer conquista e dispensar aviso/i);
    fireEvent.click(dismissBtn);

    expect(localStorage.getItem('fpi_victory_dismissed_debt-1')).toBe('true');
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('não renderiza nada se todas as dívidas tiverem saldo > 0', () => {
    const activeOnlyDebts: DebtItem[] = [mockDebts[1]];
    const { container } = render(
      <DebtVictoryBanner
        debts={activeOnlyDebts}
        formatCurrency={(val) => `R$ ${val.toFixed(2)}`}
        isPrivacyMode={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
