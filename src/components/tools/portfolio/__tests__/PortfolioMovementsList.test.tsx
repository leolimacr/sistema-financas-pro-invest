import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortfolioMovementsList } from '../PortfolioMovementsList';
import type { PortfolioMovement, PortfolioAsset } from '../../../../core/portfolio/portfolioTypes';

const mockAssets: PortfolioAsset[] = [
  {
    id: 'asset-1',
    userId: 'u1',
    ticker: 'PETR4',
    name: 'Petrobras PN',
    category: 'Ações Brasil',
    currency: 'BRL',
    market: 'B3',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'asset-2',
    userId: 'u1',
    ticker: 'KNCR11',
    name: 'Kinea Rendimentos FII',
    category: 'Fundos Imobiliários',
    currency: 'BRL',
    market: 'B3',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const mockMovements: PortfolioMovement[] = [
  {
    id: 'mov-1',
    userId: 'u1',
    assetId: 'asset-1',
    type: 'BUY',
    date: '2026-01-10',
    quantity: 100,
    unitPrice: 30.0,
    fees: 5.0,
    grossAmount: 3000.0,
    netAmount: 3005.0,
    currency: 'BRL',
    fxRateToBRL: 1.0,
    fxSource: 'FIXED_ONE',
    netAmountBRL: 3005.0,
    status: 'ACTIVE',
    createdAt: '2026-01-10',
    updatedAt: '2026-01-10',
  },
  {
    id: 'mov-2',
    userId: 'u1',
    assetId: 'asset-2',
    type: 'BUY',
    date: '2026-01-15',
    quantity: 50,
    unitPrice: 100.0,
    fees: 0,
    grossAmount: 5000.0,
    netAmount: 5000.0,
    currency: 'BRL',
    fxRateToBRL: 1.0,
    fxSource: 'FIXED_ONE',
    netAmountBRL: 5000.0,
    status: 'ACTIVE',
    createdAt: '2026-01-15',
    updatedAt: '2026-01-15',
  },
  {
    id: 'mov-3',
    userId: 'u1',
    assetId: 'asset-1',
    type: 'DIVIDEND',
    date: '2026-02-01',
    quantity: null,
    unitPrice: 0,
    fees: 0,
    grossAmount: 120.0,
    netAmount: 120.0,
    currency: 'BRL',
    fxRateToBRL: 1.0,
    fxSource: 'FIXED_ONE',
    netAmountBRL: 120.0,
    status: 'ACTIVE',
    createdAt: '2026-02-01',
    updatedAt: '2026-02-01',
  },
  {
    id: 'mov-4',
    userId: 'u1',
    assetId: 'asset-1',
    type: 'SELL',
    date: '2026-02-10',
    quantity: 20,
    unitPrice: 35.0,
    fees: 2.0,
    grossAmount: 700.0,
    netAmount: 698.0,
    currency: 'BRL',
    fxRateToBRL: 1.0,
    fxSource: 'FIXED_ONE',
    netAmountBRL: 698.0,
    status: 'VOIDED',
    createdAt: '2026-02-10',
    updatedAt: '2026-02-10',
  },
];

describe('PortfolioMovementsList', () => {
  it('1. Renderiza lista de movimentações e contadores', () => {
    render(<PortfolioMovementsList movements={mockMovements} assets={mockAssets} />);

    expect(screen.getByText('Livro Razão Contábil (Movimentações)')).toBeInTheDocument();
    expect(screen.getByText(/4 de 4 registros auditáveis/i)).toBeInTheDocument();

    expect(screen.getAllByText('PETR4').length).toBeGreaterThan(0);
    expect(screen.getAllByText('KNCR11').length).toBeGreaterThan(0);
  });

  it('2. Filtra por tipo de movimentação (Compras, Vendas, Proventos)', () => {
    render(<PortfolioMovementsList movements={mockMovements} assets={mockAssets} />);

    // Clica na pílula "Compras (2)"
    const comprasBtn = screen.getByRole('button', { name: /Compras \(2\)/i });
    fireEvent.click(comprasBtn);

    expect(screen.getByTestId('movement-row-mov-1')).toBeInTheDocument();
    expect(screen.getByTestId('movement-row-mov-2')).toBeInTheDocument();
    expect(screen.queryByTestId('movement-row-mov-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('movement-row-mov-4')).not.toBeInTheDocument();

    // Clica em "Proventos (1)"
    const proventosBtn = screen.getByRole('button', { name: /Proventos \(1\)/i });
    fireEvent.click(proventosBtn);

    expect(screen.getByTestId('movement-row-mov-3')).toBeInTheDocument();
    expect(screen.queryByTestId('movement-row-mov-1')).not.toBeInTheDocument();
  });

  it('3. Filtra por busca textual (ticker ou data)', () => {
    render(<PortfolioMovementsList movements={mockMovements} assets={mockAssets} />);

    const searchInput = screen.getByPlaceholderText(/Buscar por ativo, data/i);
    fireEvent.change(searchInput, { target: { value: 'KNCR11' } });

    expect(screen.getByTestId('movement-row-mov-2')).toBeInTheDocument();
    expect(screen.queryByTestId('movement-row-mov-1')).not.toBeInTheDocument();
  });

  it('4. Permite alternar visualização para ocultar lançamentos anulados', () => {
    render(<PortfolioMovementsList movements={mockMovements} assets={mockAssets} />);

    // mov-4 é VOIDED
    expect(screen.getByTestId('movement-row-mov-4')).toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /Mostrando Todos/i });
    fireEvent.click(toggleBtn);

    // mov-4 desaparece
    expect(screen.queryByTestId('movement-row-mov-4')).not.toBeInTheDocument();
  });

  it('5. Paginação funciona corretamente quando há mais de 15 lançamentos', () => {
    // Cria 20 movimentações
    const manyMovements: PortfolioMovement[] = Array.from({ length: 20 }, (_, i) => ({
      id: `bulk-mov-${i + 1}`,
      userId: 'u1',
      assetId: 'asset-1',
      type: 'BUY',
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      quantity: 10,
      unitPrice: 10.0,
      fees: 0,
      grossAmount: 100.0,
      netAmount: 100.0,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 100.0,
      status: 'ACTIVE',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    }));

    render(<PortfolioMovementsList movements={manyMovements} assets={mockAssets} />);

    // Página 1 deve conter 15 itens
    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Página 1 de 2');

    const nextBtn = screen.getByRole('button', { name: /Próxima/i });
    fireEvent.click(nextBtn);

    // Agora está na página 2
    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Página 2 de 2');

    const prevBtn = screen.getByRole('button', { name: /Anterior/i });
    fireEvent.click(prevBtn);

    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Página 1 de 2');
  });

  it('6. Abre modal de anulação e chama onVoidMovement com justificativa', async () => {
    const onVoidMock = vi.fn().mockResolvedValue(undefined);

    render(
      <PortfolioMovementsList
        movements={mockMovements}
        assets={mockAssets}
        onVoidMovement={onVoidMock}
      />
    );

    const anularButtons = screen.getAllByRole('button', { name: /^Anular$/i });
    fireEvent.click(anularButtons[0]);

    expect(screen.getByText('Confirmar Estorno / Anulação')).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText(/Ex: Erro de digitação/i);
    fireEvent.change(reasonInput, { target: { value: 'Lançamento duplicado' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirmar Anulação/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(onVoidMock).toHaveBeenCalledWith('mov-3', 'Lançamento duplicado');
    });
  });
});
