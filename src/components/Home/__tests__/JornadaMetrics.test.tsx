import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import JornadaMetrics from '../JornadaMetrics';

describe('JornadaMetrics', () => {
  const defaultProps = {
    stageName: 'Sobrevivência',
    effectiveTier: 'pro' as const,
    saldoRealTotal: 5000,
    colchaoTarget: 10000,
    patrimonioLiquido: 50000,
    activeDebtsCount: 2,
    reserveTarget: 15000,
    formatCurrency: (val: number) => `R$ ${val.toLocaleString('pt-BR')}`,
    onNavigate: () => {},
  };

  it('exibe valores reais quando isPrivacyMode é falso', () => {
    render(<JornadaMetrics {...defaultProps} isPrivacyMode={false} />);

    expect(screen.getByText(/Saldo atual R\$ 5.000/i)).toBeInTheDocument();
    expect(screen.getByText(/Meta R\$ 15.000/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 50.000/i)).toBeInTheDocument();
  });

  it('mascara todos os saldos e metas com bolinhas quando isPrivacyMode é verdadeiro', () => {
    render(<JornadaMetrics {...defaultProps} isPrivacyMode={true} />);

    expect(screen.getByText(/Saldo atual ••••••/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Meta ••••••/i)).toHaveLength(2);
    expect(screen.queryByText(/R\$ 5.000/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/R\$ 50.000/i)).not.toBeInTheDocument();
  });
});
