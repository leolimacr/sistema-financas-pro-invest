import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AssetModal } from '../AssetModal';
import type { PortfolioAssetClass, PortfolioAsset } from '../../../../../core/portfolio/portfolioTypes';

const mockClasses: PortfolioAssetClass[] = [
  { id: 'c1', name: 'Ações Brasil', targetPercentage: 40 },
  { id: 'c2', name: 'Fundos Imobiliários', targetPercentage: 30 },
  { id: 'c3', name: 'Renda Fixa', targetPercentage: 30 },
];

describe('AssetModal', () => {
  it('1. Renderiza os campos obrigatórios quando aberto', () => {
    render(
      <AssetModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        classes={mockClasses}
        userId="user-1"
      />
    );

    expect(screen.getByText('Cadastrar Novo Ativo')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: PETR4, KNCR11/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: Petrobras PN, Tesouro Selic 2029/i)).toBeInTheDocument();
  });

  it('2. Bloqueia submissão se campos obrigatórios não forem preenchidos', async () => {
    const onSaveMock = vi.fn();
    render(
      <AssetModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        classes={mockClasses}
        userId="user-1"
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Cadastrar Ativo/i });
    fireEvent.click(submitBtn);

    // O HTML5 nativo required ou a validação bloqueia
    expect(onSaveMock).not.toHaveBeenCalled();
  });

  it('3. Salva ativo com sucesso quando preenchido', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);
    const onCloseMock = vi.fn();

    render(
      <AssetModal
        isOpen={true}
        onClose={onCloseMock}
        onSave={onSaveMock}
        classes={mockClasses}
        userId="user-1"
      />
    );

    const tickerInput = screen.getByPlaceholderText(/Ex: PETR4, KNCR11/i);
    const nameInput = screen.getByPlaceholderText(/Ex: Petrobras PN, Tesouro Selic 2029/i);
    const metaInput = screen.getByPlaceholderText(/Ex: 10\.0/i);

    fireEvent.change(tickerInput, { target: { value: 'ITUB4' } });
    fireEvent.change(nameInput, { target: { value: 'Itaú Unibanco PN' } });
    fireEvent.change(metaInput, { target: { value: '15' } });

    const submitBtn = screen.getByRole('button', { name: /Cadastrar Ativo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    const saved: PortfolioAsset = onSaveMock.mock.calls[0][0];
    expect(saved.ticker).toBe('ITUB4');
    expect(saved.name).toBe('Itaú Unibanco PN');
    expect(saved.targetPercentage).toBe(15);
    expect(saved.currency).toBe('BRL');
    expect(saved.market).toBe('B3');
    expect(onCloseMock).toHaveBeenCalled();
  });

  it('4. Permite marcar como ativo de saldo financeiro puro (isBalanceOnly)', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);

    render(
      <AssetModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        classes={mockClasses}
        userId="user-1"
      />
    );

    const checkbox = screen.getByRole('checkbox', {
      name: /Ativo cadastrado puramente por Saldo Financeiro/i,
    });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const tickerInput = screen.getByPlaceholderText(/Ex: PETR4, KNCR11/i);
    const nameInput = screen.getByPlaceholderText(/Ex: Petrobras PN, Tesouro Selic 2029/i);

    fireEvent.change(tickerInput, { target: { value: 'CDB-INTER' } });
    fireEvent.change(nameInput, { target: { value: 'CDB Liquidez Diária Inter' } });

    const submitBtn = screen.getByRole('button', { name: /Cadastrar Ativo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    const saved: PortfolioAsset = onSaveMock.mock.calls[0][0];
    expect(saved.isBalanceOnly).toBe(true);
  });

  it('5. Exibe sugestões do catálogo ao digitar ticker e preenche campos ao selecionar', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);

    render(
      <AssetModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        classes={mockClasses}
        userId="user-1"
      />
    );

    const tickerInput = screen.getByPlaceholderText(/Ex: PETR4, KNCR11/i);
    fireEvent.change(tickerInput, { target: { value: 'PETR4' } });

    // O dropdown de autocomplete deve aparecer
    const dropdown = await screen.findByTestId('ticker-autocomplete-dropdown');
    expect(dropdown).toBeInTheDocument();

    const petr4Option = screen.getByTestId('suggestion-PETR4');
    expect(petr4Option).toBeInTheDocument();
    expect(petr4Option).toHaveTextContent('Petrobras PN');

    // Ao clicar na opção sugerida
    fireEvent.mouseDown(petr4Option);

    // Campos são preenchidos automaticamente
    const nameInput = screen.getByPlaceholderText(/Ex: Petrobras PN, Tesouro Selic 2029/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Petrobras PN');
  });

  it('6. Permite selecionar e salvar instituição/corretora custodiante via chips ou texto', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);

    render(
      <AssetModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        classes={mockClasses}
        userId="user-1"
      />
    );

    // Clica no chip rápido "BTG Pactual"
    const btgChip = screen.getByRole('button', { name: 'BTG Pactual' });
    fireEvent.click(btgChip);

    const instInput = screen.getByPlaceholderText(/Ex: XP Investimentos, BTG Pactual, Inter, Avenue/i) as HTMLInputElement;
    expect(instInput.value).toBe('BTG Pactual');

    const tickerInput = screen.getByPlaceholderText(/Ex: PETR4, KNCR11/i);
    const nameInput = screen.getByPlaceholderText(/Ex: Petrobras PN, Tesouro Selic 2029/i);
    fireEvent.change(tickerInput, { target: { value: 'KNCR11' } });
    fireEvent.change(nameInput, { target: { value: 'Kinea Rendimentos' } });

    const submitBtn = screen.getByRole('button', { name: /Cadastrar Ativo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    const saved: PortfolioAsset = onSaveMock.mock.calls[0][0];
    expect(saved.institution).toBe('BTG Pactual');
  });

  it('7. Permite configurar parâmetros de Renda Fixa para marcação na curva automática', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);

    render(
      <AssetModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        classes={mockClasses}
        userId="user-1"
      />
    );

    // Seleciona a categoria 'Renda Fixa'
    const categorySelect = screen.getByLabelText(/Classe \/ Categoria/i);
    fireEvent.change(categorySelect, { target: { value: 'Renda Fixa' } });

    // A seção de parâmetros de Renda Fixa deve estar visível
    const rfSection = screen.getByTestId('rf-parameters-section');
    expect(rfSection).toBeInTheDocument();
    expect(rfSection).toHaveTextContent(/Marcação na Curva/i);

    const tickerInput = screen.getByPlaceholderText(/Ex: PETR4, KNCR11/i);
    const nameInput = screen.getByPlaceholderText(/Ex: Petrobras PN, Tesouro Selic 2029/i);
    const rateInput = screen.getByPlaceholderText(/Ex: 110 \(% CDI\) ou 12\.5 \(% a\.a\.\)/i);

    fireEvent.change(tickerInput, { target: { value: 'CDB-INTER-110' } });
    fireEvent.change(nameInput, { target: { value: 'CDB Inter 110%' } });
    fireEvent.change(rateInput, { target: { value: '110' } });

    const submitBtn = screen.getByRole('button', { name: /Cadastrar Ativo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    const saved: PortfolioAsset = onSaveMock.mock.calls[0][0];
    expect(saved.ticker).toBe('CDB-INTER-110');
    expect(saved.fixedIncomeRatePercent).toBe(110);
  });

  it('8. Ao atualizar um ativo existente sem instituição informada, não gera campos com valor undefined', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);
    const existingAsset: PortfolioAsset = {
      id: 'asset-vt-123',
      userId: 'user-1',
      ticker: 'VT',
      name: 'Vanguard Total World Stock',
      category: 'Internacional',
      currency: 'USD',
      market: 'US',
      targetPercentage: 10,
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    };

    render(
      <AssetModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        classes={mockClasses}
        userId="user-1"
        initialAsset={existingAsset}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Atualizar Ativo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    const saved = onSaveMock.mock.calls[0][0];
    expect(saved.id).toBe('asset-vt-123');
    expect(saved.ticker).toBe('VT');
    expect('institution' in saved).toBe(false);
    expect('notes' in saved).toBe(false);
    expect('fixedIncomeIndexation' in saved).toBe(false);

    // Garante que nenhuma chave possui valor undefined
    for (const [key, value] of Object.entries(saved)) {
      expect(value, `Campo ${key} não deve ser undefined`).not.toBeUndefined();
    }
  });

  it('9. Exibe opção para adicionar novo título/vencimento quando ativo é de Renda Fixa (ex: Tesouro IPCA) e salva múltiplos certificados sob a mesma meta', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);
    const existingAsset: PortfolioAsset = {
      id: 'asset-ipca-1',
      userId: 'user-1',
      ticker: 'IPCA',
      name: 'TESOU IPCA 2045',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      institution: 'Inter',
      targetPercentage: 6.5,
      fixedIncomeIndexation: 'IPCA',
      fixedIncomeRatePercent: 6.2,
      fixedIncomeMaturityDate: '2045-05-15',
      manualPrice: 3000,
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    };

    render(
      <AssetModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        classes={mockClasses}
        userId="user-1"
        initialAsset={existingAsset}
      />
    );

    // Seção de Composição de Títulos / Vencimentos deve estar presente
    const certSection = screen.getByTestId('asset-modal-certificates-section');
    expect(certSection).toBeInTheDocument();

    // Botão para adicionar novo vencimento / título
    const addBtn = screen.getByTestId('btn-add-certificate');
    expect(addBtn).toBeInTheDocument();
    fireEvent.click(addBtn);

    // Formulário inline de novo título se abre
    const inlineForm = screen.getByTestId('form-inline-certificate');
    expect(inlineForm).toBeInTheDocument();

    // Preenche os campos do novo título (Tesouro IPCA+ 2050)
    const nameInput = screen.getByPlaceholderText(/Ex: TESOURO IPCA\+ 2050, CDB Inter 115%/i);
    const tickerInput = screen.getByPlaceholderText(/Ex: IPCA2050/i);
    const rateInput = screen.getByPlaceholderText(/Ex: 6\.50 ou 110/i);

    // Como o ativo é Tesouro IPCA, ele abriu por padrão em modo TITLES. Clicamos em Saldo Total (R$) para alternar
    const balanceModeBtn = screen.getByTestId('btn-cert-mode-balance');
    fireEvent.click(balanceModeBtn);

    const balanceInput = screen.getByPlaceholderText(/Ex: 5000\.00/i);

    fireEvent.change(nameInput, { target: { value: 'TESOURO IPCA+ 2050' } });
    fireEvent.change(tickerInput, { target: { value: 'IPCA2050' } });
    fireEvent.change(rateInput, { target: { value: '6.5' } });
    fireEvent.change(balanceInput, { target: { value: '2500' } });

    // Salva o novo título no bloco
    const saveCertBtn = screen.getByTestId('btn-save-certificate');
    fireEvent.click(saveCertBtn);

    // O formulário inline se fecha e agora há 2 títulos listados
    expect(screen.queryByTestId('form-inline-certificate')).not.toBeInTheDocument();
    expect(screen.getByTestId('certificate-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('certificate-item-1')).toBeInTheDocument();
    expect(screen.getByText('TESOURO IPCA+ 2050')).toBeInTheDocument();

    // Clica em Atualizar Ativo
    const submitBtn = screen.getByRole('button', { name: /Atualizar Ativo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    const saved: PortfolioAsset = onSaveMock.mock.calls[0][0];
    expect(saved.fixedIncomeCertificates).toBeDefined();
    expect(saved.fixedIncomeCertificates).toHaveLength(2);
    expect(saved.fixedIncomeCertificates?.[0].name).toBe('TESOU IPCA 2045');
    expect(saved.fixedIncomeCertificates?.[1].name).toBe('TESOURO IPCA+ 2050');
    expect(saved.fixedIncomeCertificates?.[1].ratePercent).toBe(6.5);
    expect(saved.fixedIncomeCertificates?.[1].balance).toBe(2500);
  });

  it('10. Permite cadastrar título fracionário com Quantidade e Preço Unitário (PU)', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);
    const existingAsset: PortfolioAsset = {
      id: 'asset-ipca-2',
      userId: 'user-1',
      ticker: 'IPCA',
      name: 'TESOU IPCA 2045',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 6.5,
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    };

    render(
      <AssetModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        classes={mockClasses}
        userId="user-1"
        initialAsset={existingAsset}
      />
    );

    const addBtn = screen.getByTestId('btn-add-certificate');
    fireEvent.click(addBtn);

    // Clica no modo Títulos (Qtd / PU)
    const titlesModeBtn = screen.getByTestId('btn-cert-mode-titles');
    fireEvent.click(titlesModeBtn);

    const nameInput = screen.getByPlaceholderText(/Ex: TESOURO IPCA\+ 2050, CDB Inter 115%/i);
    fireEvent.change(nameInput, { target: { value: 'Tesouro IPCA+ 2035' } });

    const qtyInput = screen.getByPlaceholderText(/Ex: 0\.15 ou 2\.0/i);
    const puInput = screen.getByPlaceholderText(/Ex: 4250\.00/i);

    fireEvent.change(qtyInput, { target: { value: '0.5' } });
    fireEvent.change(puInput, { target: { value: '4000.00' } });

    // Salva o título fracionário
    const saveCertBtn = screen.getByTestId('btn-save-certificate');
    fireEvent.click(saveCertBtn);

    const submitBtn = screen.getByRole('button', { name: /Atualizar Ativo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    const saved: PortfolioAsset = onSaveMock.mock.calls[0][0];
    const secondCert = saved.fixedIncomeCertificates?.[1];
    expect(secondCert).toBeDefined();
    expect(secondCert?.quantity).toBe(0.5);
    expect(secondCert?.unitPrice).toBe(4000);
    expect(secondCert?.balance).toBe(2000);
  });

  it('11. Permite editar dados de um título existente e remover títulos da meta', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);
    const existingAsset: PortfolioAsset = {
      id: 'asset-ipca-3',
      userId: 'user-1',
      ticker: 'IPCA',
      name: 'Tesouro IPCA Principal',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 6.5,
      fixedIncomeCertificates: [
        {
          id: 'cert-1',
          name: 'Tesouro IPCA 2045',
          institution: 'Inter',
          balance: 3000,
          ratePercent: 6.0,
          indexation: 'IPCA',
          maturityDate: '2045-05-15',
        },
        {
          id: 'cert-2',
          name: 'Tesouro IPCA 2050',
          institution: 'XP',
          balance: 2000,
          ratePercent: 6.5,
          indexation: 'IPCA',
          maturityDate: '2050-05-15',
        },
      ],
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    };

    render(
      <AssetModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        classes={mockClasses}
        userId="user-1"
        initialAsset={existingAsset}
      />
    );

    expect(screen.getByTestId('certificate-item-0')).toBeInTheDocument();
    expect(screen.getByTestId('certificate-item-1')).toBeInTheDocument();

    // Clica para editar o primeiro título
    const editFirstBtn = screen.getByTestId('btn-edit-cert-0');
    fireEvent.click(editFirstBtn);

    const nameInput = screen.getByPlaceholderText(/Ex: TESOURO IPCA\+ 2050, CDB Inter 115%/i);
    fireEvent.change(nameInput, { target: { value: 'Tesouro IPCA 2045 Editado' } });

    const saveCertBtn = screen.getByTestId('btn-save-certificate');
    fireEvent.click(saveCertBtn);

    expect(screen.getByText('Tesouro IPCA 2045 Editado')).toBeInTheDocument();

    // Remove o segundo título
    const deleteSecondBtn = screen.getByTestId('btn-delete-cert-1');
    fireEvent.click(deleteSecondBtn);

    expect(screen.queryByTestId('certificate-item-1')).not.toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Atualizar Ativo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    const saved: PortfolioAsset = onSaveMock.mock.calls[0][0];
    expect(saved.fixedIncomeCertificates).toHaveLength(1);
    expect(saved.fixedIncomeCertificates?.[0].name).toBe('Tesouro IPCA 2045 Editado');
  });

  it('12. Permite salvar os dados do 1º título antes de adicionar novo vencimento e exibe a Meta na Carteira logo abaixo da composição', async () => {
    const onSaveMock = vi.fn().mockResolvedValue(undefined);

    render(
      <AssetModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={onSaveMock}
        classes={mockClasses}
        userId="user-1"
      />
    );

    // Seleciona Categoria Renda Fixa
    const categorySelect = screen.getByLabelText(/Classe \/ Categoria/i);
    fireEvent.change(categorySelect, { target: { value: 'Renda Fixa' } });

    // Preenche Ticker e Nome
    const tickerInput = screen.getByPlaceholderText(/Ex: PETR4, KNCR11/i);
    const nameInput = screen.getByPlaceholderText(/Ex: Petrobras PN, Tesouro Selic 2029/i);
    fireEvent.change(tickerInput, { target: { value: 'IPCA' } });
    fireEvent.change(nameInput, { target: { value: 'TESOU IPCA 2045' } });

    // Preenche taxa contratada e vencimento
    const rateInput = screen.getByPlaceholderText(/Ex: 110 \(% CDI\) ou 12\.5 \(% a\.a\.\)/i);
    fireEvent.change(rateInput, { target: { value: '6.7' } });

    // Botão de salvar dados deste título imediatamente antes da composição
    const confirmPrimaryBtn = screen.getByTestId('btn-confirm-primary-cert');
    expect(confirmPrimaryBtn).toBeInTheDocument();
    fireEvent.click(confirmPrimaryBtn);

    // O título é salvo como 1º Título (Principal) na composição
    expect(screen.getByTestId('certificate-item-0')).toBeInTheDocument();
    expect(screen.getByText('1º Título (Principal)')).toBeInTheDocument();
    expect(screen.getByText(/Salvo na meta!/i)).toBeInTheDocument();

    // A seção de Meta na Carteira está presente logo abaixo
    const targetSection = screen.getByTestId('asset-target-section');
    expect(targetSection).toBeInTheDocument();

    const targetInput = screen.getByLabelText(/Meta na Carteira/i);
    fireEvent.change(targetInput, { target: { value: '6.5' } });

    // Salva o ativo
    const submitBtn = screen.getByRole('button', { name: /Cadastrar Ativo/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSaveMock).toHaveBeenCalledTimes(1);
    });

    const saved: PortfolioAsset = onSaveMock.mock.calls[0][0];
    expect(saved.targetPercentage).toBe(6.5);
    expect(saved.fixedIncomeCertificates).toHaveLength(1);
    expect(saved.fixedIncomeCertificates?.[0].ratePercent).toBe(6.7);
  });
});
