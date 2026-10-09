import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClassTargetsModal } from '../ClassTargetsModal';
import type { PortfolioAssetClass } from '../../../../../core/portfolio/portfolioTypes';

const mockClasses: PortfolioAssetClass[] = [
  { id: 'c1', name: 'Ações Brasil', targetPercentage: 40 },
  { id: 'c2', name: 'Fundos Imobiliários', targetPercentage: 30 },
  { id: 'c3', name: 'Renda Fixa', targetPercentage: 30 },
];

describe('ClassTargetsModal', () => {
  it('1. Renderiza a lista de classes e o banner de 100% quando a soma estiver correta', () => {
    render(
      <ClassTargetsModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialClasses={mockClasses}
      />
    );

    expect(screen.getByText('Metas de Alocação por Classe')).toBeInTheDocument();
    expect(screen.getByText('Distribuição Ideal Concluída (100%)')).toBeInTheDocument();
    expect(screen.getByText('Ações Brasil')).toBeInTheDocument();
    expect(screen.getByText('Fundos Imobiliários')).toBeInTheDocument();
  });

  it('2. Altera a porcentagem de uma classe e sinaliza divergência se não somar 100%', () => {
    render(
      <ClassTargetsModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialClasses={mockClasses}
      />
    );

    // Ajusta o primeiro input (Ações Brasil) de 40 para 50
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '50' } });

    expect(screen.getByText('Soma Atual: 110.0%')).toBeInTheDocument();
    expect(screen.getByText(/Diferença de -10\.0% para fechar em 100%\./i)).toBeInTheDocument();
  });

  it('3. Salva a nova configuração de classes com sucesso', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <ClassTargetsModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        initialClasses={mockClasses}
      />
    );

    const saveBtn = screen.getByRole('button', { name: /Salvar Metas/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    expect(onSaveMock).toHaveBeenCalledWith(mockClasses);
    expect(onCloseMock).toHaveBeenCalled();
  });
});
