import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AssetCalibrationModal } from '../AssetCalibrationModal';
import type {
  DerivedAssetPosition,
  PortfolioAsset,
  PortfolioMovement,
  PortfolioAssetClass,
} from '../../../../../core/portfolio/portfolioTypes';

describe('AssetCalibrationModal - Assistente de Calibração Soberana', () => {
  const mockClasses: PortfolioAssetClass[] = [
    { id: 'c1', name: 'Ações Brasil', targetPercentage: 50 },
    { id: 'c2', name: 'Fundos Imobiliários', targetPercentage: 50 },
  ];

  const uncalibratedPosition: DerivedAssetPosition = {
    assetId: 'ast-petr',
    ticker: 'PETR4',
    name: 'Petróleo Brasileiro S.A.',
    category: 'Ações Brasil',
    currency: 'BRL',
    market: 'B3',
    targetPercentage: 0,
    quantity: null,
    hasKnownQuantity: false,
    isBalanceOnly: true,
    hasKnownCost: false,
    avgCostOriginal: null,
    avgCostBRL: null,
    totalInvestedBRL: 3846,
    realizedPnLOriginal: 0,
    realizedPnLBRL: 0,
    totalDividendsOriginal: 0,
    totalDividendsBRL: 0,
    currentPriceOriginal: 38.46,
    currentFxRateToBRL: 1.0,
    currentPriceBRL: 38.46,
    currentValueOriginal: 3846,
    currentValueBRL: 3846,
    unrealizedPnLBRL: null,
    unrealizedPnLPercent: null,
    assetReturnPercentOriginal: null,
    fxReturnPercent: 0,
    movementCount: 1,
    ledgerChecksum: 'chk1',
    lastMovementDate: '2026-06-01',
    institution: undefined,
  };

  const mockAsset: PortfolioAsset = {
    id: 'ast-petr',
    userId: 'user1',
    ticker: 'PETR4',
    name: 'Petróleo Brasileiro S.A.',
    category: 'Ações Brasil',
    currency: 'BRL',
    market: 'B3',
    targetPercentage: 0,
    isBalanceOnly: true,
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z',
  };

  const mockMovement: PortfolioMovement = {
    id: 'mov1',
    userId: 'user1',
    assetId: 'ast-petr',
    type: 'INITIAL_POSITION',
    date: '2026-06-01',
    quantity: null,
    hasKnownQuantity: false,
    unitPrice: 0,
    fees: 0,
    grossAmount: 3846,
    netAmount: 3846,
    currency: 'BRL',
    fxRateToBRL: 1.0,
    fxSource: 'FIXED_ONE',
    netAmountBRL: 3846,
    hasKnownCost: false,
    status: 'ACTIVE',
    createdAt: '2026-06-01T10:00:00Z',
    updatedAt: '2026-06-01T10:00:00Z',
  };

  it('1. Deve renderizar os campos do ativo pendente e exibir sugestão de cotas da B3', () => {
    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[uncalibratedPosition]}
        assets={[mockAsset]}
        movements={[mockMovement]}
        classes={mockClasses}
        onSaveCalibration={vi.fn()}
      />
    );

    expect(screen.getByText('PETR4')).toBeInTheDocument();
    expect(screen.getByText('Petróleo Brasileiro S.A.')).toBeInTheDocument();
    // Sugestão de 3846 / 38.46 = 100 cotas
    expect(screen.getByTestId('btn-apply-inferred-qty')).toHaveTextContent('100 cotas');
  });

  it('2. Deve preencher quantidade e preço ao clicar na sugestão da cotação B3', async () => {
    const user = userEvent.setup();

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[uncalibratedPosition]}
        assets={[mockAsset]}
        movements={[mockMovement]}
        classes={mockClasses}
        onSaveCalibration={vi.fn()}
      />
    );

    const suggestBtn = screen.getByTestId('btn-apply-inferred-qty');
    await user.click(suggestBtn);

    const qtyInput = screen.getByTestId('input-calibration-quantity') as HTMLInputElement;
    const priceInput = screen.getByTestId('input-calibration-price') as HTMLInputElement;

    expect(qtyInput.value).toBe('100');
    expect(priceInput.value).toBe('38.46');
  });

  it('3. Deve salvar calibração com sucesso chamando onSaveCalibration com dados calculados', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);
    const handleClose = vi.fn();

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={handleClose}
        positions={[uncalibratedPosition]}
        assets={[mockAsset]}
        movements={[mockMovement]}
        classes={mockClasses}
        onSaveCalibration={handleSave}
      />
    );

    // Preenche quantidade
    const qtyInput = screen.getByTestId('input-calibration-quantity');
    await user.clear(qtyInput);
    await user.type(qtyInput, '100');

    // Seleciona corretora XP
    const xpBtn = screen.getByText('XP');
    await user.click(xpBtn);

    // Preenche meta
    const targetInput = screen.getByTestId('input-calibration-target');
    await user.clear(targetInput);
    await user.type(targetInput, '15');

    // Salva
    const saveBtn = screen.getByTestId('btn-save-calibration');
    await user.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const [savedAsset, savedMovementData] = handleSave.mock.calls[0];
    expect(savedAsset.ticker).toBe('PETR4');
    expect(savedAsset.institution).toBe('XP');
    expect(savedAsset.targetPercentage).toBe(15);
    expect(savedAsset.isBalanceOnly).toBe(false);

    expect(savedMovementData.quantity).toBe(100);
    expect(savedMovementData.grossAmount).toBeGreaterThan(0);
  });

  it('4. Deve exibir estado 100% calibrado quando a carteira não possuir pendências', () => {
    const calibratedPos: DerivedAssetPosition = {
      ...uncalibratedPosition,
      quantity: 100,
      hasKnownQuantity: true,
      isBalanceOnly: false,
      hasKnownCost: true,
      institution: 'XP',
      targetPercentage: 10,
    };

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[calibratedPos]}
        assets={[{ ...mockAsset, institution: 'XP', targetPercentage: 10, isBalanceOnly: false }]}
        movements={[{ ...mockMovement, quantity: 100, hasKnownQuantity: true }]}
        classes={mockClasses}
        onSaveCalibration={vi.fn()}
      />
    );

    expect(screen.getByText('Carteira Soberana 100% Calibrada')).toBeInTheDocument();
    expect(screen.getByTestId('btn-close-calibration-empty')).toBeInTheDocument();
  });

  it('5. Deve permitir alterar o Valor Total diretamente e recalcular a quantidade de cotas', async () => {
    const user = userEvent.setup();

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[uncalibratedPosition]}
        assets={[mockAsset]}
        movements={[mockMovement]}
        classes={mockClasses}
        onSaveCalibration={vi.fn()}
      />
    );

    const totalInput = screen.getByTestId('input-calibration-total') as HTMLInputElement;
    const qtyInput = screen.getByTestId('input-calibration-quantity') as HTMLInputElement;

    // Altera o valor total para 7692 (o dobro de 3846, com cotação 38.46 => 200 cotas)
    await user.clear(totalInput);
    await user.type(totalInput, '7692');

    expect(totalInput.value).toBe('7692');
    expect(qtyInput.value).toBe('200');
  });

  it('6. Deve sincronizar a alteração de quantidade atualizando o Valor Total dinamicamente', async () => {
    const user = userEvent.setup();

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[uncalibratedPosition]}
        assets={[mockAsset]}
        movements={[mockMovement]}
        classes={mockClasses}
        onSaveCalibration={vi.fn()}
      />
    );

    const qtyInput = screen.getByTestId('input-calibration-quantity') as HTMLInputElement;
    const totalInput = screen.getByTestId('input-calibration-total') as HTMLInputElement;

    // Digita 50 cotas com preço 38.46 => 50 * 38.46 = 1923
    await user.clear(qtyInput);
    await user.type(qtyInput, '50');

    expect(qtyInput.value).toBe('50');
    expect(totalInput.value).toBe('1923');
  });

  it('7. Deve permitir desmarcar cotação automática para modo manual e salvar manualPrice', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[uncalibratedPosition]}
        assets={[mockAsset]}
        movements={[mockMovement]}
        classes={mockClasses}
        onSaveCalibration={handleSave}
      />
    );

    // Verifica que checkbox de cotação da internet está marcado por padrão
    const quoteCheckbox = screen.getByTestId('checkbox-auto-quote') as HTMLInputElement;
    expect(quoteCheckbox.checked).toBe(true);

    // Desmarca para modo manual
    await user.click(quoteCheckbox);
    expect(quoteCheckbox.checked).toBe(false);
    expect(screen.getByText('Preço Manual')).toBeInTheDocument();

    // Define preço manual de 40.00
    const priceInput = screen.getByTestId('input-calibration-price') as HTMLInputElement;
    await user.clear(priceInput);
    await user.type(priceInput, '40');

    // Define 100 cotas
    const qtyInput = screen.getByTestId('input-calibration-quantity') as HTMLInputElement;
    await user.clear(qtyInput);
    await user.type(qtyInput, '100');

    // Salva
    const saveBtn = screen.getByTestId('btn-save-calibration');
    await user.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const [savedAsset, savedMovementData] = handleSave.mock.calls[0];
    expect(savedAsset.manualPrice).toBe(40);
    expect(savedMovementData.quantity).toBe(100);
    expect(savedMovementData.grossAmount).toBe(4000);
  });

  it('8. Não deve exibir badge Online se o ativo estiver sem cotação confirmada (mesmo com quantidade digitada)', async () => {
    const user = userEvent.setup();
    const positionWithoutPrice: DerivedAssetPosition = {
      ...uncalibratedPosition,
      currentPriceBRL: null,
      currentPriceOriginal: null,
      currentValueBRL: 3000,
    };

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[positionWithoutPrice]}
        assets={[mockAsset]}
        movements={[mockMovement]}
        classes={mockClasses}
        onSaveCalibration={vi.fn()}
      />
    );

    // Inicialmente não deve ter badge online
    expect(screen.queryByTestId('badge-online-quote')).not.toBeInTheDocument();

    // Usuário digita 10 cotas => preço calculado 300.00
    const qtyInput = screen.getByTestId('input-calibration-quantity');
    await user.clear(qtyInput);
    await user.type(qtyInput, '10');

    // Como a cotação NÃO foi confirmada via API online (status != success), o badge verde NÃO pode aparecer!
    expect(screen.queryByTestId('badge-online-quote')).not.toBeInTheDocument();
  });

  it('9. Para ativo de Renda Fixa tributável (ex: CDB), deve exibir seletor Saldo Bruto vs Saldo Líquido e salvar fixedIncomeIsNetBalance e isNetBalance', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);

    const cdbPosition: DerivedAssetPosition = {
      assetId: 'ast-cdb',
      ticker: 'CDB DI 110%',
      name: 'CDB Banco Inter 110% CDI',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 0,
      quantity: null,
      hasKnownQuantity: false,
      isBalanceOnly: true,
      hasKnownCost: false,
      avgCostOriginal: null,
      avgCostBRL: null,
      totalInvestedBRL: 5000,
      realizedPnLOriginal: 0,
      realizedPnLBRL: 0,
      totalDividendsOriginal: 0,
      totalDividendsBRL: 0,
      currentPriceOriginal: null,
      currentFxRateToBRL: 1.0,
      currentPriceBRL: null,
      currentValueOriginal: 5000,
      currentValueBRL: 5000,
      unrealizedPnLBRL: null,
      unrealizedPnLPercent: null,
      assetReturnPercentOriginal: null,
      fxReturnPercent: 0,
      movementCount: 1,
      ledgerChecksum: 'chk_cdb',
      lastMovementDate: '2026-06-01',
      institution: 'Inter',
    };

    const cdbAsset: PortfolioAsset = {
      id: 'ast-cdb',
      userId: 'user1',
      ticker: 'CDB DI 110%',
      name: 'CDB Banco Inter 110% CDI',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 0,
      isBalanceOnly: true,
      institution: 'Inter',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    const cdbMovement: PortfolioMovement = {
      id: 'mov_cdb',
      userId: 'user1',
      assetId: 'ast-cdb',
      type: 'INITIAL_POSITION',
      date: '2026-06-01',
      quantity: null,
      hasKnownQuantity: false,
      unitPrice: 0,
      fees: 0,
      grossAmount: 5000,
      netAmount: 5000,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 5000,
      hasKnownCost: false,
      status: 'ACTIVE',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[cdbPosition]}
        assets={[cdbAsset]}
        movements={[cdbMovement]}
        classes={mockClasses}
        onSaveCalibration={handleSave}
      />
    );

    // Deve exibir os seletores de Saldo Bruto e Saldo Líquido
    const btnGross = screen.getByTestId('btn-balance-gross');
    const btnNet = screen.getByTestId('btn-balance-net');
    expect(btnGross).toBeInTheDocument();
    expect(btnNet).toBeInTheDocument();

    // Seleciona Saldo Líquido
    await user.click(btnNet);

    // Salva a calibração
    const saveBtn = screen.getByTestId('btn-save-calibration');
    await user.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const [savedAsset, savedMovementData] = handleSave.mock.calls[0];
    expect(savedAsset.fixedIncomeIsNetBalance).toBe(true);
    expect(savedMovementData.isNetBalance).toBe(true);
  });

  it('10. Para ativo de Renda Fixa isento de IR (ex: LCI), deve exibir badge de isenção sem os botões de seleção de saldo líquido', () => {
    const lciPosition: DerivedAssetPosition = {
      assetId: 'ast-lci',
      ticker: 'LCI DI 95%',
      name: 'LCI Banco BTG 95% CDI',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 0,
      quantity: null,
      hasKnownQuantity: false,
      isBalanceOnly: true,
      hasKnownCost: false,
      avgCostOriginal: null,
      avgCostBRL: null,
      totalInvestedBRL: 10000,
      realizedPnLOriginal: 0,
      realizedPnLBRL: 0,
      totalDividendsOriginal: 0,
      totalDividendsBRL: 0,
      currentPriceOriginal: null,
      currentFxRateToBRL: 1.0,
      currentPriceBRL: null,
      currentValueOriginal: 10000,
      currentValueBRL: 10000,
      unrealizedPnLBRL: null,
      unrealizedPnLPercent: null,
      assetReturnPercentOriginal: null,
      fxReturnPercent: 0,
      movementCount: 1,
      ledgerChecksum: 'chk_lci',
      lastMovementDate: '2026-06-01',
      institution: 'BTG Pactual',
    };

    const lciAsset: PortfolioAsset = {
      id: 'ast-lci',
      userId: 'user1',
      ticker: 'LCI DI 95%',
      name: 'LCI Banco BTG 95% CDI',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 0,
      isBalanceOnly: true,
      institution: 'BTG Pactual',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    const lciMovement: PortfolioMovement = {
      id: 'mov_lci',
      userId: 'user1',
      assetId: 'ast-lci',
      type: 'INITIAL_POSITION',
      date: '2026-06-01',
      quantity: null,
      hasKnownQuantity: false,
      unitPrice: 0,
      fees: 0,
      grossAmount: 10000,
      netAmount: 10000,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 10000,
      hasKnownCost: false,
      status: 'ACTIVE',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[lciPosition]}
        assets={[lciAsset]}
        movements={[lciMovement]}
        classes={mockClasses}
        onSaveCalibration={vi.fn()}
      />
    );

    // Deve exibir o badge de isento
    expect(screen.getByTestId('fixed-income-tax-exempt-badge')).toBeInTheDocument();
    expect(screen.getByText(/Isento de Imposto de Renda/i)).toBeInTheDocument();

    // Não deve renderizar os botões de alternância bruto vs líquido pois Bruto = Líquido
    expect(screen.queryByTestId('btn-balance-gross')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-balance-net')).not.toBeInTheDocument();
  });

  it('11. Permite adicionar outro CDB/título dentro da mesma meta/categoria e persistir junto na calibração', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);

    const cdbPosition: DerivedAssetPosition = {
      assetId: 'ast-cdb-daycoval',
      ticker: 'Z CDB',
      name: 'CDB BAN DAYCOVAL',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 6.0,
      quantity: null,
      hasKnownQuantity: false,
      isBalanceOnly: true,
      hasKnownCost: false,
      avgCostOriginal: null,
      avgCostBRL: null,
      totalInvestedBRL: 11686.71,
      realizedPnLOriginal: 0,
      realizedPnLBRL: 0,
      totalDividendsOriginal: 0,
      totalDividendsBRL: 0,
      currentPriceOriginal: null,
      currentFxRateToBRL: 1.0,
      currentPriceBRL: null,
      currentValueOriginal: 11686.71,
      currentValueBRL: 11686.71,
      unrealizedPnLBRL: null,
      unrealizedPnLPercent: null,
      assetReturnPercentOriginal: null,
      fxReturnPercent: 0,
      movementCount: 1,
      ledgerChecksum: 'chk_daycoval',
      lastMovementDate: '2026-06-01',
      institution: 'Daycoval',
    };

    const cdbAsset: PortfolioAsset = {
      id: 'ast-cdb-daycoval',
      userId: 'user1',
      ticker: 'Z CDB',
      name: 'CDB BAN DAYCOVAL',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 6.0,
      isBalanceOnly: true,
      institution: 'Daycoval',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    const cdbMovement: PortfolioMovement = {
      id: 'mov_daycoval',
      userId: 'user1',
      assetId: 'ast-cdb-daycoval',
      type: 'INITIAL_POSITION',
      date: '2026-06-01',
      quantity: null,
      hasKnownQuantity: false,
      unitPrice: 0,
      fees: 0,
      grossAmount: 11686.71,
      netAmount: 11686.71,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 11686.71,
      hasKnownCost: false,
      status: 'ACTIVE',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[cdbPosition]}
        assets={[cdbAsset]}
        movements={[cdbMovement]}
        classes={mockClasses}
        onSaveCalibration={handleSave}
      />
    );

    // Botão de adicionar outro título nesta meta está presente
    const btnOpenAdd = screen.getByTestId('btn-open-add-sibling');
    expect(btnOpenAdd).toBeInTheDocument();

    // Clica para abrir o formulário do novo título
    await user.click(btnOpenAdd);

    // Preenche os dados do novo CDB
    const inputTicker = screen.getByTestId('input-sibling-ticker');
    const inputName = screen.getByTestId('input-sibling-name');
    const inputBalance = screen.getByTestId('input-sibling-balance');

    await user.clear(inputTicker);
    await user.type(inputTicker, 'CDB Inter 102%');
    await user.clear(inputName);
    await user.type(inputName, 'CDB Banco Inter Liquidez Diária');
    await user.type(inputBalance, '2000');

    // Confirma inclusão
    const btnConfirm = screen.getByTestId('btn-confirm-add-sibling-asset');
    await user.click(btnConfirm);

    // Verifica que o novo título foi adicionado na lista de irmãos
    expect(screen.getByTestId('sibling-item-CDB INTER 102%')).toBeInTheDocument();

    // Verifica que o painel de distribuição proporcional da meta compartilhada é exibido abaixo dos irmãos
    expect(screen.getByTestId('shared-target-distribution-breakdown')).toBeInTheDocument();
    expect(screen.getByText(/Meta Percentual de Alocação Compartilhada/i)).toBeInTheDocument();

    // Salva a calibração
    const saveBtn = screen.getByTestId('btn-save-calibration');
    await user.click(saveBtn);

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(1);
    });

    const [savedAsset, savedMovementData, , additionalAssets] = handleSave.mock.calls[0];
    expect(savedAsset.ticker).toBe('Z CDB');
    // Saldo consolidado somando o título principal e o adicional
    expect(savedMovementData.grossAmount).toBe(13686.71);
    // Não cria ativos adicionais independentes que poluiriam a custódia
    expect(additionalAssets).toBeUndefined();

    // Valida que a meta de 6.0% permanece INTEGRAL (unfragmented), sem divisões decimais
    expect(savedAsset.targetPercentage).toBe(6.0);

    // Valida que ambos os certificados foram persistidos internamente no ativo consolidado
    expect(savedAsset.fixedIncomeCertificates).toHaveLength(2);
    expect(savedAsset.fixedIncomeCertificates[0].name).toBe('CDB BAN DAYCOVAL');
    expect(savedAsset.fixedIncomeCertificates[0].balance).toBe(11686.71);
    expect(savedAsset.fixedIncomeCertificates[1].name).toBe('CDB Banco Inter Liquidez Diária');
    expect(savedAsset.fixedIncomeCertificates[1].balance).toBe(2000);
  });

  it('12. Exibe o 1º CDB/título imediatamente na lista visível como Título Principal com banco, taxa e vencimento', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    const cdbPosition: DerivedAssetPosition = {
      assetId: 'ast-cdb-original',
      ticker: 'CDB-PRIM',
      name: 'CDB Banco Daycoval 110%',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 5.0,
      quantity: null,
      hasKnownQuantity: false,
      isBalanceOnly: true,
      hasKnownCost: false,
      avgCostOriginal: null,
      avgCostBRL: null,
      totalInvestedBRL: 5000,
      realizedPnLOriginal: 0,
      realizedPnLBRL: 0,
      totalDividendsOriginal: 0,
      totalDividendsBRL: 0,
      currentPriceOriginal: null,
      currentFxRateToBRL: 1.0,
      currentPriceBRL: null,
      currentValueOriginal: 5000,
      currentValueBRL: 5000,
      unrealizedPnLBRL: null,
      unrealizedPnLPercent: null,
      assetReturnPercentOriginal: null,
      fxReturnPercent: 0,
      movementCount: 1,
      ledgerChecksum: 'chk_1',
      lastMovementDate: '2026-06-01',
      institution: 'Daycoval',
    };

    const cdbAsset: PortfolioAsset = {
      id: 'ast-cdb-original',
      userId: 'user1',
      ticker: 'CDB-PRIM',
      name: 'CDB Banco Daycoval 110%',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 5.0,
      isBalanceOnly: true,
      institution: 'Daycoval',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    const cdbMovement: PortfolioMovement = {
      id: 'mov_cdb_1',
      userId: 'user1',
      assetId: 'ast-cdb-original',
      type: 'INITIAL_POSITION',
      date: '2026-06-01',
      quantity: null,
      hasKnownQuantity: false,
      unitPrice: 0,
      fees: 0,
      grossAmount: 5000,
      netAmount: 5000,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 5000,
      hasKnownCost: false,
      status: 'ACTIVE',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[cdbPosition]}
        assets={[cdbAsset]}
        movements={[cdbMovement]}
        classes={mockClasses}
        onSaveCalibration={handleSave}
      />
    );

    // O 1º CDB entra imediatamente na lista visível
    const primaryItem = screen.getByTestId('sibling-primary-item');
    expect(primaryItem).toBeInTheDocument();
    expect(within(primaryItem).getByText(/1º Título \(Principal\)/i)).toBeInTheDocument();
    expect(within(primaryItem).getByText('CDB Banco Daycoval 110%')).toBeInTheDocument();
    expect(within(primaryItem).getByText('Daycoval')).toBeInTheDocument();
    expect(within(primaryItem).getByTestId('btn-edit-primary-cert')).toBeInTheDocument();
  });

  it('13. Permite editar o 1º CDB/título inline abrindo o formulário pré-preenchido', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);

    const cdbPosition: DerivedAssetPosition = {
      assetId: 'ast-cdb-edit',
      ticker: 'CDB-EDIT',
      name: 'CDB Daycoval',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 4.0,
      quantity: null,
      hasKnownQuantity: false,
      isBalanceOnly: true,
      hasKnownCost: false,
      avgCostOriginal: null,
      avgCostBRL: null,
      totalInvestedBRL: 8000,
      realizedPnLOriginal: 0,
      realizedPnLBRL: 0,
      totalDividendsOriginal: 0,
      totalDividendsBRL: 0,
      currentPriceOriginal: null,
      currentFxRateToBRL: 1.0,
      currentPriceBRL: null,
      currentValueOriginal: 8000,
      currentValueBRL: 8000,
      unrealizedPnLBRL: null,
      unrealizedPnLPercent: null,
      assetReturnPercentOriginal: null,
      fxReturnPercent: 0,
      movementCount: 1,
      ledgerChecksum: 'chk_edit',
      lastMovementDate: '2026-06-01',
      institution: 'Daycoval',
    };

    const cdbAsset: PortfolioAsset = {
      id: 'ast-cdb-edit',
      userId: 'user1',
      ticker: 'CDB-EDIT',
      name: 'CDB Daycoval',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 4.0,
      isBalanceOnly: true,
      institution: 'Daycoval',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    const cdbMovement: PortfolioMovement = {
      id: 'mov_cdb_edit',
      userId: 'user1',
      assetId: 'ast-cdb-edit',
      type: 'INITIAL_POSITION',
      date: '2026-06-01',
      quantity: null,
      hasKnownQuantity: false,
      unitPrice: 0,
      fees: 0,
      grossAmount: 8000,
      netAmount: 8000,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 8000,
      hasKnownCost: false,
      status: 'ACTIVE',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[cdbPosition]}
        assets={[cdbAsset]}
        movements={[cdbMovement]}
        classes={mockClasses}
        onSaveCalibration={handleSave}
      />
    );

    // Clica para editar o 1º título
    const btnEditPrimary = screen.getByTestId('btn-edit-primary-cert');
    await user.click(btnEditPrimary);

    // O formulário abre indicando que está editando o 1º título
    expect(screen.getByText(/✏️ Editando 1º Título \(Principal\)/i)).toBeInTheDocument();

    // Edita o nome e banco no formulário
    const inputName = screen.getByTestId('input-sibling-name');
    const inputInst = screen.getByTestId('input-sibling-institution');
    await user.clear(inputName);
    await user.type(inputName, 'CDB Daycoval Prefixado 12%');
    await user.clear(inputInst);
    await user.type(inputInst, 'Banco Daycoval S/A');

    // Confirma alteração
    const btnConfirm = screen.getByTestId('btn-confirm-add-sibling-asset');
    await user.click(btnConfirm);

    // O card do 1º título é atualizado imediatamente na lista
    const primaryItem = screen.getByTestId('sibling-primary-item');
    expect(within(primaryItem).getByText('CDB Daycoval Prefixado 12%')).toBeInTheDocument();
    expect(within(primaryItem).getByText('Banco Daycoval S/A')).toBeInTheDocument();
  });

  it('14. Permite adicionar um 2º CDB mantendo o 1º CDB visível na lista acima do formulário e editar o 2º título', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);

    const cdbPosition: DerivedAssetPosition = {
      assetId: 'ast-cdb-multi',
      ticker: 'CDB-MULTI',
      name: 'CDB Principal Banco Master',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 5.0,
      quantity: null,
      hasKnownQuantity: false,
      isBalanceOnly: true,
      hasKnownCost: false,
      avgCostOriginal: null,
      avgCostBRL: null,
      totalInvestedBRL: 10000,
      realizedPnLOriginal: 0,
      realizedPnLBRL: 0,
      totalDividendsOriginal: 0,
      totalDividendsBRL: 0,
      currentPriceOriginal: null,
      currentFxRateToBRL: 1.0,
      currentPriceBRL: null,
      currentValueOriginal: 10000,
      currentValueBRL: 10000,
      unrealizedPnLBRL: null,
      unrealizedPnLPercent: null,
      assetReturnPercentOriginal: null,
      fxReturnPercent: 0,
      movementCount: 1,
      ledgerChecksum: 'chk_multi',
      lastMovementDate: '2026-06-01',
      institution: 'Banco Master',
    };

    const cdbAsset: PortfolioAsset = {
      id: 'ast-cdb-multi',
      userId: 'user1',
      ticker: 'CDB-MULTI',
      name: 'CDB Principal Banco Master',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 5.0,
      isBalanceOnly: true,
      institution: 'Banco Master',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    const cdbMovement: PortfolioMovement = {
      id: 'mov_cdb_multi',
      userId: 'user1',
      assetId: 'ast-cdb-multi',
      type: 'INITIAL_POSITION',
      date: '2026-06-01',
      quantity: null,
      hasKnownQuantity: false,
      unitPrice: 0,
      fees: 0,
      grossAmount: 10000,
      netAmount: 10000,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 10000,
      hasKnownCost: false,
      status: 'ACTIVE',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        positions={[cdbPosition]}
        assets={[cdbAsset]}
        movements={[cdbMovement]}
        classes={mockClasses}
        onSaveCalibration={handleSave}
      />
    );

    // Clica para adicionar outro CDB
    await user.click(screen.getByTestId('btn-open-add-sibling'));

    // Verifica que enquanto o formulário de inclusão está aberto, o 1º CDB PERMANECE VISÍVEL acima dele
    expect(screen.getByTestId('form-add-sibling')).toBeInTheDocument();
    expect(screen.getByTestId('sibling-primary-item')).toBeInTheDocument();
    expect(within(screen.getByTestId('sibling-primary-item')).getByText('CDB Principal Banco Master')).toBeInTheDocument();

    // Preenche os dados do 2º CDB
    await user.clear(screen.getByTestId('input-sibling-ticker'));
    await user.type(screen.getByTestId('input-sibling-ticker'), 'CDB-INTER');
    await user.clear(screen.getByTestId('input-sibling-name'));
    await user.type(screen.getByTestId('input-sibling-name'), 'CDB Banco Inter');
    await user.type(screen.getByTestId('input-sibling-balance'), '2500');

    // Confirma inclusão
    await user.click(screen.getByTestId('btn-confirm-add-sibling-asset'));

    // Agora ambos os títulos estão na lista simultaneamente
    expect(screen.getByTestId('sibling-primary-item')).toBeInTheDocument();
    expect(screen.getByTestId('sibling-item-CDB-INTER')).toBeInTheDocument();

    // Clica para editar o 2º título
    await user.click(screen.getByTestId('btn-edit-sibling-0'));

    // O formulário de edição abre com os dados do 2º título, e o 1º título segue visível na lista
    expect(screen.getByText(/✏️ Editando Título: CDB Banco Inter/i)).toBeInTheDocument();
    expect(screen.getByTestId('sibling-primary-item')).toBeInTheDocument();

    // Altera o saldo do 2º título
    const balanceInput = screen.getByTestId('input-sibling-balance');
    await user.clear(balanceInput);
    await user.type(balanceInput, '3000');

    // Confirma edição
    await user.click(screen.getByTestId('btn-confirm-add-sibling-asset'));

    // Verifica atualização do valor do 2º título na lista
    const secondItem = screen.getByTestId('sibling-item-CDB-INTER');
    expect(within(secondItem).getByText(/3\.000,00/)).toBeInTheDocument();
  });

  it('15. Permite calibrar Tesouro IPCA por quantidade fracionária de títulos (PU), data de aplicação e indexador IPCA', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);

    const tesouroPosition: DerivedAssetPosition = {
      assetId: 'ast-tesouro-ipca-2029',
      ticker: 'TESOURO IPCA+ 2029',
      name: 'Tesouro IPCA+ 2029 NTN-B',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 5.0,
      quantity: 1.25,
      hasKnownQuantity: true,
      isBalanceOnly: false,
      hasKnownCost: true,
      avgCostOriginal: 3200,
      avgCostBRL: 3200,
      totalInvestedBRL: 4000,
      realizedPnLOriginal: 0,
      realizedPnLBRL: 0,
      totalDividendsOriginal: 0,
      totalDividendsBRL: 0,
      currentPriceOriginal: 3400,
      currentFxRateToBRL: 1.0,
      currentPriceBRL: 3400,
      currentValueOriginal: 4250,
      currentValueBRL: 4250,
      unrealizedPnLBRL: 250,
      unrealizedPnLPercent: 6.25,
      assetReturnPercentOriginal: 6.25,
      fxReturnPercent: 0,
      movementCount: 1,
      ledgerChecksum: 'chk_tesouro',
      lastMovementDate: '2024-03-15',
      institution: 'Inter',
    };

    const tesouroAsset: PortfolioAsset = {
      id: 'ast-tesouro-ipca-2029',
      userId: 'user1',
      ticker: 'TESOURO IPCA+ 2029',
      name: 'Tesouro IPCA+ 2029 NTN-B',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 5.0,
      isBalanceOnly: false,
      institution: 'Inter',
      fixedIncomeIndexation: 'IPCA',
      fixedIncomeRatePercent: 5.85,
      fixedIncomeStartDate: '2024-03-15',
      fixedIncomeMaturityDate: '2029-05-15',
      createdAt: '2024-03-15T10:00:00Z',
      updatedAt: '2024-03-15T10:00:00Z',
    };

    const tesouroMovement: PortfolioMovement = {
      id: 'mov_tesouro_1',
      userId: 'user1',
      assetId: 'ast-tesouro-ipca-2029',
      type: 'INITIAL_POSITION',
      date: '2024-03-15',
      quantity: 1.25,
      hasKnownQuantity: true,
      unitPrice: 3200,
      fees: 0,
      grossAmount: 4000,
      netAmount: 4000,
      currency: 'BRL',
      fxRateToBRL: 1.0,
      fxSource: 'FIXED_ONE',
      netAmountBRL: 4000,
      hasKnownCost: true,
      status: 'ACTIVE',
      createdAt: '2024-03-15T10:00:00Z',
      updatedAt: '2024-03-15T10:00:00Z',
    };

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        initialAssetId="ast-tesouro-ipca-2029"
        positions={[tesouroPosition]}
        assets={[tesouroAsset]}
        movements={[tesouroMovement]}
        classes={mockClasses}
        onSaveCalibration={handleSave}
      />
    );

    // O modo de custódia inicial para Tesouro é Títulos (PU / Qtd)
    expect(screen.getByTestId('btn-rf-mode-titles')).toBeInTheDocument();
    expect(screen.getByTestId('input-calibration-quantity')).toBeInTheDocument();
    expect(screen.getByTestId('input-calibration-price')).toBeInTheDocument();
    expect(screen.getByTestId('input-calibration-total')).toBeInTheDocument();

    // Data de Aplicação e Vencimento estão presentes
    const inputStartDate = screen.getByTestId('input-calibration-start-date');
    const inputMaturityDate = screen.getByTestId('input-calibration-maturity-date');
    expect(inputStartDate).toHaveValue('2024-03-15');
    expect(inputMaturityDate).toHaveValue('2029-05-15');

    // Altera a quantidade para 2.5 títulos a R$ 3.500,00
    await user.clear(screen.getByTestId('input-calibration-quantity'));
    await user.type(screen.getByTestId('input-calibration-quantity'), '2.5');

    await user.clear(screen.getByTestId('input-calibration-price'));
    await user.type(screen.getByTestId('input-calibration-price'), '3500');

    // Total é calculado automaticamente (2.5 * 3500 = 8750)
    expect(screen.getByTestId('input-calibration-total')).toHaveValue(8750);

    // Clica para salvar calibração
    await user.click(screen.getByTestId('btn-save-calibration'));

    expect(handleSave).toHaveBeenCalledTimes(1);
    const [savedAsset, savedMov] = handleSave.mock.calls[0];

    expect(savedAsset.ticker).toBe('TESOURO IPCA+ 2029');
    expect(savedAsset.isBalanceOnly).toBe(false);
    expect(savedAsset.fixedIncomeStartDate).toBe('2024-03-15');
    expect(savedAsset.fixedIncomeMaturityDate).toBe('2029-05-15');
    expect(savedMov.quantity).toBe(2.5);
    expect(savedMov.unitPrice).toBe(3200); // Preço médio histórico de aquisição preservado
    expect(savedMov.grossAmount).toBe(8750);
    expect(savedMov.date).toBe('2024-03-15');
  });

  it('16. Permite alternar entre modos de custódia (Títulos vs Saldo) e selecionar indexador SELIC', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn().mockResolvedValue(undefined);

    const cdbPosition: DerivedAssetPosition = {
      assetId: 'ast-cdb-selic',
      ticker: 'CDB SELIC',
      name: 'CDB DI Liquidez Diária',
      category: 'Renda Fixa',
      currency: 'BRL',
      market: 'RF',
      targetPercentage: 8.0,
      quantity: null,
      hasKnownQuantity: false,
      isBalanceOnly: true,
      hasKnownCost: false,
      avgCostOriginal: null,
      avgCostBRL: null,
      totalInvestedBRL: 10000,
      realizedPnLOriginal: 0,
      realizedPnLBRL: 0,
      totalDividendsOriginal: 0,
      totalDividendsBRL: 0,
      currentPriceOriginal: null,
      currentFxRateToBRL: 1.0,
      currentPriceBRL: null,
      currentValueOriginal: 10000,
      currentValueBRL: 10000,
      unrealizedPnLBRL: null,
      unrealizedPnLPercent: null,
      assetReturnPercentOriginal: null,
      fxReturnPercent: 0,
      movementCount: 1,
      ledgerChecksum: 'chk_selic',
      lastMovementDate: '2026-01-01',
      institution: 'Nubank',
    };

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        initialAssetId="ast-cdb-selic"
        positions={[cdbPosition]}
        assets={[]}
        movements={[]}
        classes={mockClasses}
        onSaveCalibration={handleSave}
      />
    );

    // Inicialmente no modo Saldo Total
    expect(screen.queryByTestId('input-calibration-quantity')).not.toBeInTheDocument();
    expect(screen.getByTestId('input-calibration-total')).toBeInTheDocument();

    // Alterna para o modo de Títulos (Qtd / PU)
    await user.click(screen.getByTestId('btn-rf-mode-titles'));

    // Agora os campos de cotas e PU estão disponíveis
    expect(screen.getByTestId('input-calibration-quantity')).toBeInTheDocument();
    expect(screen.getByTestId('input-calibration-price')).toBeInTheDocument();

    // Seleciona indexador SELIC
    const indexationSelect = screen.getByRole('combobox');
    await user.selectOptions(indexationSelect, 'SELIC');
    expect(indexationSelect).toHaveValue('SELIC');

    // Preenche data de aplicação
    const startDateInput = screen.getByTestId('input-calibration-start-date');
    await user.type(startDateInput, '2025-01-10');

    // Preenche quantidade de títulos
    await user.clear(screen.getByTestId('input-calibration-quantity'));
    await user.type(screen.getByTestId('input-calibration-quantity'), '10');

    // Preço unitário foi inferido automaticamente de 10000 / 10 = 1000, mas podemos confirmar limpando e digitando
    await user.clear(screen.getByTestId('input-calibration-price'));
    await user.type(screen.getByTestId('input-calibration-price'), '1000');

    // Salva a calibração
    await user.click(screen.getByTestId('btn-save-calibration'));

    expect(handleSave).toHaveBeenCalledTimes(1);
    const [savedAsset, savedMov] = handleSave.mock.calls[0];

    expect(savedAsset.isBalanceOnly).toBe(false);
    expect(savedAsset.fixedIncomeIndexation).toBe('SELIC');
    expect(savedAsset.fixedIncomeStartDate).toBe('2025-01-10');
    expect(savedMov.quantity).toBe(10);
    expect(savedMov.unitPrice).toBe(1000);
    expect(savedMov.grossAmount).toBe(10000);
    expect(savedMov.date).toBe('2025-01-10');
  });

  it('17. Reconhece dinamicamente títulos de Tesouro Selic e altera rótulos de botões e placeholders para não misturar classes sob a mesma meta', async () => {
    const user = userEvent.setup();
    const handleSave = vi.fn();

    const tesouroSelicPos: DerivedAssetPosition = {
      assetId: 'ast-tesouro-selic',
      ticker: 'SEL 29',
      name: 'TESOU SELIC POS FIX',
      category: 'Renda Fixa',
      quantity: 1,
      unitPriceBRL: 14500,
      currentPriceBRL: 14500,
      totalInvestedBRL: 14500,
      currentValueBRL: 14500,
      market: 'RF',
      targetPercentage: 10,
      institution: 'Tesouro Direto',
      fixedIncomeIndexation: 'SELIC',
      fixedIncomeCertificates: [],
    };

    render(
      <AssetCalibrationModal
        isOpen={true}
        onClose={vi.fn()}
        initialAssetId="ast-tesouro-selic"
        positions={[tesouroSelicPos]}
        assets={[]}
        movements={[]}
        classes={mockClasses}
        onSaveCalibration={handleSave}
      />
    );

    // O botão inteligente deve refletir "Adicionar outro Tesouro Selic", sem termos fixos de CDB
    const addBtn = screen.getByTestId('btn-open-add-sibling');
    expect(addBtn).toHaveTextContent('Adicionar outro Tesouro Selic');
    expect(screen.queryByText(/Adicionar outro CDB/i)).not.toBeInTheDocument();

    // Clica para adicionar outro vencimento de Tesouro Selic
    await user.click(addBtn);

    // O cabeçalho do formulário deve ser específico para Tesouro Selic
    expect(screen.getByText(/➕ Adicionar Novo Vencimento \(Tesouro Selic\)/i)).toBeInTheDocument();

    // Placeholders devem orientar títulos do Tesouro Selic
    const tickerInput = screen.getByTestId('input-sibling-ticker');
    expect(tickerInput).toHaveAttribute('placeholder', 'Ex: SELIC 2029');

    const nameInput = screen.getByTestId('input-sibling-name');
    expect(nameInput).toHaveAttribute('placeholder', 'Ex: Tesouro Selic 2029');

    // Indexador padrão deve ser SELIC
    const indexSelect = screen.getByTestId('select-sibling-indexation');
    expect(indexSelect).toHaveValue('SELIC');
  });
});
