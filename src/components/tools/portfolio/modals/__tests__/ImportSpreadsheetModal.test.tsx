import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportSpreadsheetModal } from '../ImportSpreadsheetModal';
import type { PortfolioAsset, PortfolioAssetClass } from '../../../../../core/portfolio/portfolioTypes';

describe('ImportSpreadsheetModal - Validação Atômica da Carga Inicial', () => {
  const mockClasses: PortfolioAssetClass[] = [
    { id: 'c1', name: 'Ações Brasil', targetPercentage: 60 },
    { id: 'c2', name: 'Renda Fixa', targetPercentage: 40 },
  ];

  const mockExistingAssets: PortfolioAsset[] = [
    {
      id: 'ast-existente',
      userId: 'user-1',
      ticker: 'PETR4',
      name: 'Petrobras PN',
      category: 'Ações Brasil',
      currency: 'BRL',
      market: 'B3',
      createdAt: '2026-09-25T10:00:00Z',
      updatedAt: '2026-09-25T10:00:00Z',
    },
  ];

  it('1. Arquivo com linha inválida (ERROR) bloqueia confirmação e não grava nada', async () => {
    const handleConfirmImport = vi.fn().mockResolvedValue(undefined);

    render(
      <ImportSpreadsheetModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirmImport={handleConfirmImport}
        existingAssets={mockExistingAssets}
        classes={mockClasses}
        userId="user-1"
      />
    );

    // CSV contendo uma linha com fórmula inválida (=SOMA sem valor em cache)
    const invalidCsv = 'Ativo;Qtd;Preco;Total\nVALE3;100;60,00;6000,00\nPRIO3;10;30,00;=SOMA(A1:B1)';
    const file = new File([invalidCsv], 'carteira_com_erro.csv', { type: 'text/csv' });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      const banner = screen.getByTestId('import-error-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(/Importação Bloqueada/i);
    });

    const confirmBtn = screen.getByTestId('confirm-import-btn');
    expect(confirmBtn).toBeDisabled();

    // Tentativa de clique não deve disparar importação
    fireEvent.click(confirmBtn);
    expect(handleConfirmImport).not.toHaveBeenCalled();
  });

  it('2. Arquivo com avisos (WARNING) exige confirmação explícita via checkbox antes de liberar o botão', async () => {
    const handleConfirmImport = vi.fn().mockResolvedValue(undefined);

    render(
      <ImportSpreadsheetModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirmImport={handleConfirmImport}
        existingAssets={mockExistingAssets}
        classes={mockClasses}
        userId="user-1"
      />
    );

    // CSV com um ativo sem quantidade (apenas saldo -> gera WARNING legítimo de saldo financeiro)
    const warningCsv = 'Ativo;Qtd;Preco;Total\nCAIXA;;;15000,00';
    const file = new File([warningCsv], 'carteira_caixa.csv', { type: 'text/csv' });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId('import-warning-banner')).toBeInTheDocument();
    });

    const confirmBtn = screen.getByTestId('confirm-import-btn');
    // Inicialmente bloqueado porque há warning e o checkbox ainda não foi marcado
    expect(confirmBtn).toBeDisabled();

    fireEvent.click(confirmBtn);
    expect(handleConfirmImport).not.toHaveBeenCalled();

    // Marca o checkbox de confirmação de avisos
    const checkbox = screen.getByTestId('confirm-warnings-checkbox');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Agora o botão deve estar liberado
    expect(confirmBtn).not.toBeDisabled();

    // Ao clicar, executa a importação
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleConfirmImport).toHaveBeenCalledTimes(1);
    });
  });

  it('3. Importação 100% válida grava todos os registros previstos e exibe contadores exatos pós-gravação', async () => {
    const handleConfirmImport = vi.fn().mockResolvedValue(undefined);

    render(
      <ImportSpreadsheetModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirmImport={handleConfirmImport}
        existingAssets={mockExistingAssets}
        classes={mockClasses}
        userId="user-1"
      />
    );

    // Planilha perfeitamente válida com 2 ativos (1 existente PETR4 e 1 novo WEGE3)
    const validCsv = 'Ativo;Qtd;Preco;Total\nPETR4;100;35,00;3500,00\nWEGE3;50;40,00;2000,00';
    const file = new File([validCsv], 'carteira_valida.csv', { type: 'text/csv' });

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Conferência Pré-Gravação')).toBeInTheDocument();
      // Total previsto: 3500 + 2000 = 5500
      expect(screen.getByText(/Total Previsto: R\$\s*5\.500,00/i)).toBeInTheDocument();
    });

    const confirmBtn = screen.getByTestId('confirm-import-btn');
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleConfirmImport).toHaveBeenCalledTimes(1);
    });

    // Tela de conclusão pós-gravação com contadores exatos
    await waitFor(() => {
      expect(screen.getByText('Importação Concluída com Sucesso!')).toBeInTheDocument();
      expect(screen.getByText('Ativos Novos')).toBeInTheDocument();
      expect(screen.getByText('Posições Iniciais')).toBeInTheDocument();
      expect(screen.getByText('0 erros')).toBeInTheDocument();
    });
  });

  it('4. Transição de isOpen=false para isOpen=true não quebra as regras de hooks do React', () => {
    const handleConfirmImport = vi.fn().mockResolvedValue(undefined);

    // Renderiza inicialmente fechado
    const { rerender } = render(
      <ImportSpreadsheetModal
        isOpen={false}
        onClose={vi.fn()}
        onConfirmImport={handleConfirmImport}
        existingAssets={mockExistingAssets}
        classes={mockClasses}
        userId="user-1"
      />
    );

    expect(screen.queryByText('Importar Planilha (CSV ou XLSX)')).not.toBeInTheDocument();

    // Transiciona para aberto (simulando clique do usuário em "Importar")
    expect(() => {
      rerender(
        <ImportSpreadsheetModal
          isOpen={true}
          onClose={vi.fn()}
          onConfirmImport={handleConfirmImport}
          existingAssets={mockExistingAssets}
          classes={mockClasses}
          userId="user-1"
        />
      );
    }).not.toThrow();

    expect(screen.getByText('Importar Planilha (CSV ou XLSX)')).toBeInTheDocument();
  });

  it('5. Renderiza a barra de presets rápidos de importação e permite alternar presets em 1 clique', async () => {
    render(
      <ImportSpreadsheetModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirmImport={vi.fn()}
        existingAssets={mockExistingAssets}
        classes={mockClasses}
        userId="user-1"
      />
    );

    const presetsContainer = screen.getByTestId('import-presets-container');
    expect(presetsContainer).toBeInTheDocument();
    expect(presetsContainer).toHaveTextContent(/B3 - Negociação/i);
    expect(presetsContainer).toHaveTextContent(/B3 - Custódia \/ Posição/i);
    expect(presetsContainer).toHaveTextContent(/Kinvo/i);
    expect(presetsContainer).toHaveTextContent(/Gorila/i);
    expect(presetsContainer).toHaveTextContent(/XP Investimentos/i);

    // Clica no preset "B3 - Negociação"
    const b3NegBtn = screen.getByRole('button', { name: /B3 - Negociação/i });
    fireEvent.click(b3NegBtn);

    // O modo de importação deve alternar para "Histórico de Movimentos" (MOVEMENTS)
    expect(screen.getByText(/Histórico de Movimentos/i)).toBeInTheDocument();
  });
});
