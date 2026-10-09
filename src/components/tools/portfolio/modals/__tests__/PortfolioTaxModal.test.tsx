import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioTaxModal } from '../PortfolioTaxModal';
import type { PortfolioTaxSummary } from '../../../../../core/portfolio/taxEngine';

describe('PortfolioTaxModal - Modal de Apuração Fiscal de IRPF e DARF', () => {
  const mockTaxSummary: PortfolioTaxSummary = {
    accumulatedStocksLossBRL: 500,
    accumulatedFiisLossBRL: 200,
    totalTaxPaidOrDueBRL: 640,
    totalExemptProfitBRL: 3000,
    reports: [
      {
        yearMonth: '2026-03',
        monthName: 'Março de 2026',
        stocksSalesTotalBRL: 25000, // Acima de 20k
        isStocksExempt: false,
        stocksRawProfitLossBRL: 4000,
        stocksExemptProfitBRL: 0,
        stocksTaxableProfitBRL: 4000,
        stocksLossCarriedForwardBRL: 0,
        stocksRemainingLossBRL: 0,
        stocksTaxDueBRL: 600, // 15%
        fiisSalesTotalBRL: 2000,
        fiisRawProfitLossBRL: 200,
        fiisTaxableProfitBRL: 200,
        fiisLossCarriedForwardBRL: 0,
        fiisRemainingLossBRL: 0,
        fiisTaxDueBRL: 40, // 20%
        totalTaxDueBRL: 640,
        darfCode: '6015',
        darfDueDate: '2026-04-30',
        isDarfPayable: true,
        sales: [
          {
            movementId: 'm-sale-1',
            assetId: 'ast-petr',
            ticker: 'PETR4',
            name: 'Petrobras',
            category: 'Ações Brasil',
            date: '2026-03-15',
            quantity: 500,
            saleUnitPrice: 50,
            avgCostUnitPrice: 42,
            saleGrossAmountBRL: 25000,
            saleNetAmountBRL: 25000,
            costBRL: 21000,
            grossProfitLossBRL: 4000,
            feesBRL: 0,
            netProfitLossBRL: 4000,
            isProfit: true,
          },
        ],
      },
    ],
  };

  it('1. Não deve renderizar nada quando isOpen for false', () => {
    const handleClose = vi.fn();
    render(
      <PortfolioTaxModal
        isOpen={false}
        onClose={handleClose}
        taxSummary={mockTaxSummary}
      />
    );

    expect(screen.queryByTestId('portfolio-tax-modal')).not.toBeInTheDocument();
  });

  it('2. Deve renderizar os totais acumulados de lucro isento e prejuízos a compensar quando aberto', () => {
    const handleClose = vi.fn();
    render(
      <PortfolioTaxModal
        isOpen={true}
        onClose={handleClose}
        taxSummary={mockTaxSummary}
      />
    );

    expect(screen.getByTestId('portfolio-tax-modal')).toBeInTheDocument();
    expect(screen.getByTestId('tax-summary-exempt-profit')).toHaveTextContent('R$ 3.000,00');
    expect(screen.getByTestId('tax-summary-stocks-loss')).toHaveTextContent('R$ 500,00');
    expect(screen.getByTestId('tax-summary-fiis-loss')).toHaveTextContent('R$ 200,00');
  });

  it('3. Deve exibir código DARF 6015 e permitir cópia para o clipboard', () => {
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    render(
      <PortfolioTaxModal
        isOpen={true}
        onClose={vi.fn()}
        taxSummary={mockTaxSummary}
      />
    );

    expect(screen.getByText('6015')).toBeInTheDocument();
    expect(screen.getByText(/Imposto Devido Apurado: R\$ 640,00/i)).toBeInTheDocument();

    const copyBtn = screen.getByTitle('Copiar código DARF');
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('6015');
  });

  it('4. Deve renderizar a tabela de vendas do mês com preço médio e resultado', () => {
    render(
      <PortfolioTaxModal
        isOpen={true}
        onClose={vi.fn()}
        taxSummary={mockTaxSummary}
      />
    );

    expect(screen.getByText('PETR4')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('+R$ 4.000,00')).toBeInTheDocument();
  });

  it('5. Deve fechar o modal ao clicar no botão de fechar', () => {
    const handleClose = vi.fn();
    render(
      <PortfolioTaxModal
        isOpen={true}
        onClose={handleClose}
        taxSummary={mockTaxSummary}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /fechar relatório fiscal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
