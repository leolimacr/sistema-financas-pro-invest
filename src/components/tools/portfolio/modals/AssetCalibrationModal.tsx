import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Check,
  SlidersHorizontal,
  Sparkles,
  Building2,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Globe,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  PortfolioAsset,
  PortfolioMovement,
  DerivedAssetPosition,
  PortfolioAssetClass,
  FixedIncomeCertificate,
} from '../../../../core/portfolio/portfolioTypes';
import {
  type FixedIncomeIndexation,
  isFixedIncomeTaxExempt,
} from '../../../../core/portfolio/fixedIncomeMath';
import { auditAssetCalibration } from '../../../../core/portfolio/nexusPortfolioAdvisor';
import { fetchPortfolioQuotes } from '../../../../services/portfolio/marketQuoteEngine';
import { formatCurrencyBRL, formatDateBR, getFixedIncomeKindInfo } from '../portfolioViewUtils';

interface AssetCalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: DerivedAssetPosition[];
  assets: PortfolioAsset[];
  movements: PortfolioMovement[];
  classes: PortfolioAssetClass[];
  initialAssetId?: string;
  onSaveCalibration: (
    updatedAsset: PortfolioAsset,
    movementData: {
      quantity: number | null;
      unitPrice: number;
      grossAmount: number;
      isNetBalance?: boolean;
      date?: string;
    },
    applyInstitutionToAllPending?: boolean,
    additionalAssets?: {
      asset: PortfolioAsset;
      movementData: {
        quantity: number | null;
        unitPrice: number;
        grossAmount: number;
        isNetBalance?: boolean;
        date?: string;
      };
    }[],
    absorbedAssetIds?: string[]
  ) => Promise<void>;
  onRefreshQuotes?: (force?: boolean) => Promise<void>;
}

const QUICK_BROKERS = ['XP', 'BTG Pactual', 'Inter', 'Nubank', 'Avenue', 'Binance'];

export const AssetCalibrationModal: React.FC<AssetCalibrationModalProps> = ({
  isOpen,
  onClose,
  positions,
  assets,
  movements,
  classes,
  initialAssetId,
  onSaveCalibration,
  onRefreshQuotes,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [applyInstitutionToAll, setApplyInstitutionToAll] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Campos do formulário ativo
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [autoFetchQuote, setAutoFetchQuote] = useState<boolean>(true);
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [quoteFetchStatus, setQuoteFetchStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [quoteFetchError, setQuoteFetchError] = useState<string | null>(null);
  const [historicalAvgCost, setHistoricalAvgCost] = useState<number | ''>('');
  const [institution, setInstitution] = useState('');
  const [targetPercentage, setTargetPercentage] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  const [fixedIncomeIndexation, setFixedIncomeIndexation] = useState<FixedIncomeIndexation | ''>('');
  const [fixedIncomeRatePercent, setFixedIncomeRatePercent] = useState<number | ''>('');
  const [fixedIncomeStartDate, setFixedIncomeStartDate] = useState('');
  const [fixedIncomeMaturityDate, setFixedIncomeMaturityDate] = useState('');
  const [fixedIncomeIsNetBalance, setFixedIncomeIsNetBalance] = useState<boolean>(false);
  const [rfCustodyMode, setRfCustodyMode] = useState<'TITLES' | 'BALANCE'>('BALANCE');
  const [primaryAssetName, setPrimaryAssetName] = useState('');
  const [primaryAssetTicker, setPrimaryAssetTicker] = useState('');

  // Estados para inclusão de múltiplos títulos na mesma meta (ex: CDB adicional)
  const [isAddingSibling, setIsAddingSibling] = useState(false);
  const [editingSiblingIndex, setEditingSiblingIndex] = useState<number | null>(null);
  const [siblingTicker, setSiblingTicker] = useState('');
  const [siblingName, setSiblingName] = useState('');
  const [siblingInstitution, setSiblingInstitution] = useState('');
  const [siblingBalance, setSiblingBalance] = useState<number | ''>('');
  const [siblingSplitFromCurrent, setSiblingSplitFromCurrent] = useState(false);
  const [siblingIsNet, setSiblingIsNet] = useState(false);
  const [siblingIndexation, setSiblingIndexation] = useState<FixedIncomeIndexation | ''>('CDI');
  const [siblingRate, setSiblingRate] = useState<number | ''>('');
  const [siblingStartDate, setSiblingStartDate] = useState('');
  const [siblingMaturity, setSiblingMaturity] = useState('');
  const [siblingQuantity, setSiblingQuantity] = useState<number | ''>('');
  const [siblingUnitPrice, setSiblingUnitPrice] = useState<number | ''>('');
  const [siblingError, setSiblingError] = useState<string | null>(null);
  const [additionalCertificates, setAdditionalCertificates] = useState<FixedIncomeCertificate[]>([]);
  const [absorbedAssetIds, setAbsorbedAssetIds] = useState<string[]>([]);

  const modalCardRef = useRef<HTMLDivElement>(null);

  // Mapeamentos rápidos
  const assetMap = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  // Lista de posições que necessitam de calibração
  const uncalibratedPositions = useMemo(() => {
    return positions.filter((p) => auditAssetCalibration(p) !== null);
  }, [positions]);

  // Lista efetiva de itens a calibrar no modal
  const calibrationQueue = useMemo(() => {
    if (initialAssetId) {
      const specificPos = positions.find((p) => p.assetId === initialAssetId);
      if (specificPos) {
        // Se o ativo específico está na fila geral, preserva a fila e apenas posiciona o índice nele
        const existsInPending = uncalibratedPositions.some((p) => p.assetId === initialAssetId);
        if (existsInPending) {
          return uncalibratedPositions;
        }
        // Se já estava calibrado, abre apenas para ele
        return [specificPos];
      }
    }
    return uncalibratedPositions;
  }, [initialAssetId, uncalibratedPositions, positions]);

  // Ativo atualmente selecionado para calibrar
  const currentPos: DerivedAssetPosition | undefined = calibrationQueue[currentIndex];
  const currentAsset: PortfolioAsset | undefined = currentPos ? assetMap.get(currentPos.assetId) : undefined;
  const currentIssue = useMemo(() => (currentPos ? auditAssetCalibration(currentPos) : null), [currentPos]);

  // Metadados inteligentes de Renda Fixa (Tesouro Selic, Tesouro IPCA+, CDB, LCI, etc.)
  const assetKind = useMemo(() => {
    return getFixedIncomeKindInfo(
      primaryAssetName || currentAsset?.name || currentPos?.name,
      primaryAssetTicker || currentAsset?.ticker || currentPos?.ticker,
      category || currentPos?.category
    );
  }, [primaryAssetName, currentAsset, currentPos, primaryAssetTicker, category]);

  // Inicializa o índice quando o modal é aberto
  useEffect(() => {
    if (!isOpen) return;
    if (initialAssetId) {
      const targetIdx = calibrationQueue.findIndex((p) => p.assetId === initialAssetId);
      if (targetIdx !== -1) {
        setCurrentIndex(targetIdx);
        return;
      }
    }
    setCurrentIndex(0);
  }, [isOpen, initialAssetId, calibrationQueue]);

  // Carrega os dados do ativo ativo no formulário
  useEffect(() => {
    if (!isOpen || !currentPos) return;

    // Localiza a movimentação inicial existente para pré-preenchimento
    const existingMov = movements.find(
      (m) => m.assetId === currentPos.assetId && !m.isVoided && (m.type === 'INITIAL_POSITION' || m.type === 'BUY')
    );

    const initialQty = currentPos.quantity !== null && currentPos.quantity > 0
      ? currentPos.quantity
      : (existingMov?.quantity && existingMov.quantity > 0 ? existingMov.quantity : '');

    const initialPrice = currentPos.currentPriceBRL !== null && currentPos.currentPriceBRL > 0
      ? currentPos.currentPriceBRL
      : (currentAsset?.manualPrice ?? (existingMov?.unitPrice && existingMov.unitPrice > 0 ? existingMov.unitPrice : ''));

    const initialFinancialTotal = currentPos.currentValueBRL || currentPos.totalInvestedBRL || existingMov?.grossAmount || 0;

    const hasManualPriceConfigured = currentAsset?.manualPrice !== undefined && currentAsset?.manualPrice !== null && currentAsset.manualPrice > 0;
    const isMarketQuotable = currentPos.market === 'B3' || currentPos.market === 'US' || currentPos.market === 'CRYPTO';
    const shouldAutoFetch = !hasManualPriceConfigured && isMarketQuotable;

    setQuantity(initialQty);
    setUnitPrice(initialPrice);
    setTotalAmount(
      initialFinancialTotal > 0
        ? initialFinancialTotal
        : (initialQty !== '' && initialPrice !== '' ? Number((Number(initialQty) * Number(initialPrice)).toFixed(2)) : '')
    );
    setAutoFetchQuote(shouldAutoFetch);
    setHistoricalAvgCost(existingMov?.hasKnownCost && existingMov.unitPrice > 0 ? existingMov.unitPrice : (currentPos.avgCostBRL || ''));
    setInstitution(currentAsset?.institution || currentPos.institution || '');
    setTargetPercentage(currentPos.targetPercentage > 0 ? currentPos.targetPercentage : (currentAsset?.targetPercentage || ''));
    setCategory(currentAsset?.category || currentPos.category || (classes[0]?.name ?? 'Ações Brasil'));
    setFixedIncomeIndexation(currentAsset?.fixedIncomeIndexation || '');
    setFixedIncomeRatePercent(currentAsset?.fixedIncomeRatePercent ?? '');
    setFixedIncomeStartDate(currentAsset?.fixedIncomeStartDate || existingMov?.date || '');
    setFixedIncomeMaturityDate(currentAsset?.fixedIncomeMaturityDate || '');
    setFixedIncomeIsNetBalance(
      Boolean(currentAsset?.fixedIncomeIsNetBalance ?? existingMov?.isNetBalance ?? false)
    );
    const hasKnownInitialQty = (currentPos.quantity !== null && currentPos.quantity > 0) ||
      (existingMov?.quantity !== null && existingMov?.quantity !== undefined && existingMov.quantity > 0);
    const isExplicitBalanceOnly = currentAsset?.isBalanceOnly === true || currentPos.isBalanceOnly === true;
    const isTreasuryOrBond = (currentPos.ticker || '').toUpperCase().includes('TESOURO') ||
      (currentPos.name || '').toUpperCase().includes('TESOURO') ||
      (currentPos.category || '').toLowerCase().includes('tesouro') ||
      (currentPos.ticker || '').toUpperCase().includes('DEB') ||
      (currentPos.category || '').toLowerCase().includes('debênture');
    if (hasKnownInitialQty || (isTreasuryOrBond && !isExplicitBalanceOnly)) {
      setRfCustodyMode('TITLES');
    } else {
      setRfCustodyMode('BALANCE');
    }
    setPrimaryAssetName(currentAsset?.name || currentPos.name || '');
    setPrimaryAssetTicker(currentAsset?.ticker || currentPos.ticker || '');
    const existingCerts = currentAsset?.fixedIncomeCertificates || [];
    if (existingCerts.length > 1) {
      setAdditionalCertificates(existingCerts.slice(1));
    } else {
      setAdditionalCertificates([]);
    }
    setAbsorbedAssetIds([]);
    setIsAddingSibling(false);
    setEditingSiblingIndex(null);
    setSiblingStartDate('');
    setSiblingQuantity('');
    setSiblingUnitPrice('');
    setErrorMsg(null);
    setQuoteFetchError(null);
    setQuoteFetchStatus(
      currentPos.currentPriceBRL !== null && currentPos.currentPriceBRL > 0 && !hasManualPriceConfigured
        ? 'success'
        : 'idle'
    );
  }, [isOpen, currentPos, currentAsset, movements, classes]);

  // Acessibilidade: fechar com Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Consulta de cotação online em tempo real
  const handleFetchOnlineQuote = async (forceUserFeedback = false) => {
    if (!currentPos) return;
    if (currentPos.market === 'CASH' || currentPos.market === 'RF' || currentPos.market === 'MANUAL') return;

    setIsFetchingQuote(true);
    setQuoteFetchError(null);
    try {
      const res = await fetchPortfolioQuotes(
        [{ ticker: currentPos.ticker, market: currentPos.market, currency: currentPos.currency }],
        true
      );
      const q = res[currentPos.ticker.toUpperCase()];
      if (q && q.price > 0) {
        setUnitPrice(q.price);
        setQuoteFetchStatus('success');

        // Recalcula total ou quantidade harmoniosamente
        if (quantity !== '' && Number(quantity) > 0) {
          setTotalAmount(Number((Number(quantity) * q.price).toFixed(2)));
        } else if (totalAmount !== '' && Number(totalAmount) > 0) {
          const inferred = Math.round(Number(totalAmount) / q.price);
          if (inferred > 0) {
            setQuantity(inferred);
          }
        }
      } else {
        setQuoteFetchStatus('failed');
        if (forceUserFeedback) {
          setQuoteFetchError('Não foi possível obter cotação em tempo real para este ativo.');
        }
      }
    } catch {
      setQuoteFetchStatus('failed');
      if (forceUserFeedback) {
        setQuoteFetchError('Falha ao conectar com o serviço de cotações.');
      }
    } finally {
      setIsFetchingQuote(false);
    }
  };

  const handleToggleAutoQuote = async (checked: boolean) => {
    setAutoFetchQuote(checked);
    if (checked) {
      await handleFetchOnlineQuote(true);
    }
  };

  // Auto-busca cotação em tempo real ao abrir para ativos cotáveis sem cotação prévia
  useEffect(() => {
    if (!isOpen || !currentPos) return;
    const hasManualPrice = currentAsset?.manualPrice !== undefined && currentAsset?.manualPrice !== null && currentAsset.manualPrice > 0;
    const isMarketQuotable = currentPos.market === 'B3' || currentPos.market === 'US' || currentPos.market === 'CRYPTO';
    if (!hasManualPrice && isMarketQuotable && (!currentPos.currentPriceBRL || currentPos.currentPriceBRL <= 0)) {
      handleFetchOnlineQuote(false);
    }
  }, [isOpen, currentPos?.assetId]);

  const isVariableIncome =
    currentPos?.market === 'B3' ||
    currentPos?.market === 'US' ||
    currentPos?.market === 'CRYPTO' ||
    category.toLowerCase().includes('ação') ||
    category.toLowerCase().includes('ações') ||
    category.toLowerCase().includes('fii') ||
    category.toLowerCase().includes('imobil') ||
    category.toLowerCase().includes('etf') ||
    category.toLowerCase().includes('bdr') ||
    category.toLowerCase().includes('cripto');

  const isFixedIncome =
    currentPos?.market === 'RF' ||
    category.toLowerCase().includes('renda fixa') ||
    category.toLowerCase().includes('tesouro') ||
    category.toLowerCase().includes('cdb') ||
    category.toLowerCase().includes('lci') ||
    category.toLowerCase().includes('lca') ||
    category.toLowerCase().includes('cri') ||
    category.toLowerCase().includes('cra') ||
    category.toLowerCase().includes('debenture') ||
    category.toLowerCase().includes('debênture');

  const isTaxExemptFixedIncome =
    isFixedIncome &&
    (isFixedIncomeTaxExempt(currentAsset?.ticker) ||
      isFixedIncomeTaxExempt(currentAsset?.name) ||
      isFixedIncomeTaxExempt(category) ||
      isFixedIncomeTaxExempt(currentPos?.ticker) ||
      isFixedIncomeTaxExempt(currentPos?.name));

  const currentFinancialValue = currentPos?.currentValueBRL || currentPos?.totalInvestedBRL || 0;

  // Inferência inteligente de cotas com base na cotação B3/Mercado
  const inferredQuantityFromQuote = useMemo(() => {
    const activePrice = unitPrice !== '' && Number(unitPrice) > 0
      ? Number(unitPrice)
      : (currentPos?.currentPriceBRL || 0);
    const activeTotal = totalAmount !== '' && Number(totalAmount) > 0
      ? Number(totalAmount)
      : currentFinancialValue;

    if (activePrice > 0 && activeTotal > 0) {
      return Math.round(activeTotal / activePrice);
    }
    return null;
  }, [unitPrice, totalAmount, currentPos, currentFinancialValue]);

  const handleApplyInferredQuantity = () => {
    if (inferredQuantityFromQuote && inferredQuantityFromQuote > 0) {
      setQuantity(inferredQuantityFromQuote);
      const activePrice = unitPrice !== '' && Number(unitPrice) > 0
        ? Number(unitPrice)
        : (currentPos?.currentPriceBRL || 0);
      if ((unitPrice === '' || unitPrice === 0) && activePrice > 0) {
        setUnitPrice(activePrice);
      }
      if (totalAmount === '' || Number(totalAmount) === 0) {
        setTotalAmount(Number((inferredQuantityFromQuote * activePrice).toFixed(2)));
      }
    }
  };

  const handleQuantityChange = (val: string) => {
    if (val === '') {
      setQuantity('');
      return;
    }
    const q = Number(val);
    setQuantity(q);
    if (unitPrice !== '' && Number(unitPrice) > 0) {
      setTotalAmount(Number((q * Number(unitPrice)).toFixed(2)));
    } else if (totalAmount !== '' && Number(totalAmount) > 0 && q > 0) {
      setUnitPrice(Number((Number(totalAmount) / q).toFixed(2)));
    }
  };

  const handleUnitPriceChange = (val: string) => {
    if (val === '') {
      setUnitPrice('');
      return;
    }
    const p = Number(val);
    setUnitPrice(p);

    if (quantity !== '' && Number(quantity) > 0) {
      setTotalAmount(Number((Number(quantity) * p).toFixed(2)));
    } else if (totalAmount !== '' && Number(totalAmount) > 0 && p > 0) {
      const isFractional = currentPos?.market === 'CRYPTO' || isFixedIncome;
      setQuantity(isFractional ? Number((Number(totalAmount) / p).toFixed(4)) : Math.round(Number(totalAmount) / p));
    }
  };

  const handleTotalAmountChange = (val: string) => {
    if (val === '') {
      setTotalAmount('');
      return;
    }
    const t = Number(val);
    setTotalAmount(t);

    if (unitPrice !== '' && Number(unitPrice) > 0) {
      const isCrypto = currentPos?.market === 'CRYPTO';
      const inferredQ = isCrypto
        ? Number((t / Number(unitPrice)).toFixed(6))
        : isFixedIncome
        ? Number((t / Number(unitPrice)).toFixed(4))
        : Math.round(t / Number(unitPrice));
      if (inferredQ > 0) {
        setQuantity(inferredQ);
      }
    } else if (quantity !== '' && Number(quantity) > 0) {
      setUnitPrice(Number((t / Number(quantity)).toFixed(2)));
    }
  };

  const computedCompositionBreakdown = useMemo(() => {
    const primaryBal = totalAmount !== '' && Number(totalAmount) > 0 ? Number(totalAmount) : 0;
    const additionalBal = additionalCertificates.reduce((sum, c) => sum + (c.balance || 0), 0);
    const totalConsolidated = primaryBal + additionalBal;

    if (totalConsolidated <= 0) {
      return {
        totalConsolidated: 0,
        primaryShare: 100,
        certificates: additionalCertificates.map((c) => ({ ...c, share: 0 })),
      };
    }

    const primaryShare = Number(((primaryBal / totalConsolidated) * 100).toFixed(1));
    const certsWithShare = additionalCertificates.map((c) => ({
      ...c,
      share: Number(((c.balance / totalConsolidated) * 100).toFixed(1)),
    }));

    return {
      totalConsolidated,
      primaryShare,
      certificates: certsWithShare,
    };
  }, [totalAmount, additionalCertificates]);

  // Detecção defensiva de títulos avulsos cadastrados separadamente na mesma categoria
  const orphanSiblingAssets = useMemo(() => {
    if (!currentPos || !isFixedIncome) return [];
    return positions.filter(
      (p) =>
        p.assetId !== currentPos.assetId &&
        p.category === category &&
        !absorbedAssetIds.includes(p.assetId) &&
        (p.ticker.startsWith(`${currentPos.ticker} `) ||
          p.ticker === `${currentPos.ticker} 2` ||
          p.assetId.startsWith('ast_sib_') ||
          (Boolean(currentAsset?.fixedIncomeCertificates) && p.name.includes(currentPos.name)))
    );
  }, [currentPos, isFixedIncome, category, positions, absorbedAssetIds, currentAsset]);

  const handleAbsorbOrphan = (orphan: DerivedAssetPosition) => {
    const orphanAsset = assetMap.get(orphan.assetId);
    const orphanBal = orphan.currentValueBRL || orphan.totalInvestedBRL || 0;
    const newCert: FixedIncomeCertificate = {
      id: `cert_absorbed_${orphan.assetId}`,
      ticker: orphan.ticker,
      name: orphan.name || orphan.ticker,
      institution: orphan.institution || orphanAsset?.institution,
      balance: orphanBal,
      isNetBalance: orphanAsset?.fixedIncomeIsNetBalance,
      indexation: orphanAsset?.fixedIncomeIndexation,
      ratePercent: orphanAsset?.fixedIncomeRatePercent,
      maturityDate: orphanAsset?.fixedIncomeMaturityDate,
      createdAt: orphanAsset?.createdAt || new Date().toISOString(),
    };
    setAdditionalCertificates((prev) => [...prev, newCert]);
    setAbsorbedAssetIds((prev) => [...prev, orphan.assetId]);
  };

  const handleConfirmAddSibling = () => {
    setSiblingError(null);
    const cleanTicker = siblingTicker.trim();
    const cleanName = siblingName.trim();
    if (!cleanTicker) {
      setSiblingError('Informe o código ou identificador do novo título.');
      return;
    }
    if (!cleanName) {
      setSiblingError('Informe o nome do novo título.');
      return;
    }
    if (siblingBalance === '' || Number(siblingBalance) <= 0) {
      setSiblingError('Informe o valor em custódia do novo título.');
      return;
    }

    const numSiblingBal = Number(siblingBalance);

    // Editando o TÍTULO PRINCIPAL (1º Título)
    if (editingSiblingIndex === -1) {
      if (cleanName) {
        setPrimaryAssetName(cleanName);
      }
      if (cleanTicker) {
        setPrimaryAssetTicker(cleanTicker.toUpperCase());
      }
      if (siblingInstitution.trim()) {
        setInstitution(siblingInstitution.trim());
      }
      setFixedIncomeIndexation(siblingIndexation || '');
      setFixedIncomeRatePercent(siblingRate !== '' ? Number(siblingRate) : '');
      setFixedIncomeStartDate(siblingStartDate || '');
      setFixedIncomeMaturityDate(siblingMaturity || '');
      setFixedIncomeIsNetBalance(siblingIsNet);
      setTotalAmount(numSiblingBal);
      if (siblingQuantity !== '') {
        setQuantity(Number(siblingQuantity));
      }
      if (siblingUnitPrice !== '') {
        setUnitPrice(Number(siblingUnitPrice));
      }
      setIsAddingSibling(false);
      setEditingSiblingIndex(null);
      setSiblingError(null);
      return;
    }

    // Editando um TÍTULO ADICIONAL existente
    if (editingSiblingIndex !== null && editingSiblingIndex >= 0) {
      setAdditionalCertificates((prev) =>
        prev.map((c, idx) =>
          idx === editingSiblingIndex
            ? {
                ...c,
                ticker: cleanTicker.toUpperCase(),
                name: cleanName,
                institution: siblingInstitution.trim() || institution.trim() || undefined,
                balance: numSiblingBal,
                isNetBalance: siblingIsNet,
                indexation: siblingIndexation || 'CDI',
                ratePercent: siblingRate !== '' ? Number(siblingRate) : undefined,
                startDate: siblingStartDate || undefined,
                maturityDate: siblingMaturity || undefined,
                quantity: siblingQuantity !== '' ? Number(siblingQuantity) : undefined,
                unitPrice: siblingUnitPrice !== '' ? Number(siblingUnitPrice) : undefined,
              }
            : c
        )
      );
      setIsAddingSibling(false);
      setEditingSiblingIndex(null);
      setSiblingError(null);
      return;
    }

    // Inclusão de NOVO título adicional
    if (siblingSplitFromCurrent) {
      const curTot = totalAmount !== '' ? Number(totalAmount) : 0;
      if (numSiblingBal >= curTot) {
        setSiblingError(
          `O valor a desmembrar (R$ ${numSiblingBal.toFixed(2)}) deve ser menor que o saldo atual (R$ ${curTot.toFixed(2)}).`
        );
        return;
      }
      const newCurrentTot = Number((curTot - numSiblingBal).toFixed(2));
      setTotalAmount(newCurrentTot);
    }

    const newCert: FixedIncomeCertificate = {
      id: `cert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ticker: cleanTicker.toUpperCase(),
      name: cleanName,
      institution: siblingInstitution.trim() || institution.trim() || undefined,
      balance: numSiblingBal,
      isNetBalance: siblingIsNet,
      indexation: siblingIndexation || 'CDI',
      ratePercent: siblingRate !== '' ? Number(siblingRate) : undefined,
      startDate: siblingStartDate || undefined,
      maturityDate: siblingMaturity || undefined,
      quantity: siblingQuantity !== '' ? Number(siblingQuantity) : undefined,
      unitPrice: siblingUnitPrice !== '' ? Number(siblingUnitPrice) : undefined,
      createdAt: new Date().toISOString(),
    };

    setAdditionalCertificates((prev) => [...prev, newCert]);
    setIsAddingSibling(false);
    setEditingSiblingIndex(null);
    setSiblingTicker('');
    setSiblingName('');
    setSiblingBalance('');
    setSiblingStartDate('');
    setSiblingMaturity('');
    setSiblingQuantity('');
    setSiblingUnitPrice('');
    setSiblingSplitFromCurrent(false);
    setSiblingError(null);
  };

  const handleOpenEditPrimary = () => {
    setEditingSiblingIndex(-1);
    setIsAddingSibling(true);
    setSiblingTicker(primaryAssetTicker || currentPos?.ticker || '');
    setSiblingName(primaryAssetName || currentAsset?.name || currentPos?.name || '');
    setSiblingInstitution(institution || '');
    setSiblingBalance(totalAmount !== '' ? Number(totalAmount) : '');
    setSiblingSplitFromCurrent(false);
    setSiblingIsNet(fixedIncomeIsNetBalance);
    setSiblingIndexation(fixedIncomeIndexation || 'CDI');
    setSiblingRate(fixedIncomeRatePercent !== '' ? fixedIncomeRatePercent : '');
    setSiblingStartDate(fixedIncomeStartDate || '');
    setSiblingMaturity(fixedIncomeMaturityDate || '');
    setSiblingQuantity(quantity !== '' ? Number(quantity) : '');
    setSiblingUnitPrice(unitPrice !== '' ? Number(unitPrice) : '');
    setSiblingError(null);
  };

  const handleOpenEditSibling = (index: number) => {
    const cert = additionalCertificates[index];
    if (!cert) return;
    setEditingSiblingIndex(index);
    setIsAddingSibling(true);
    setSiblingTicker(cert.ticker || '');
    setSiblingName(cert.name);
    setSiblingInstitution(cert.institution || institution || '');
    setSiblingBalance(cert.balance);
    setSiblingSplitFromCurrent(false);
    setSiblingIsNet(Boolean(cert.isNetBalance));
    setSiblingIndexation(cert.indexation || 'CDI');
    setSiblingRate(cert.ratePercent !== undefined ? cert.ratePercent : '');
    setSiblingStartDate(cert.startDate || '');
    setSiblingMaturity(cert.maturityDate || '');
    setSiblingQuantity(cert.quantity !== undefined ? cert.quantity : '');
    setSiblingUnitPrice(cert.unitPrice !== undefined ? cert.unitPrice : '');
    setSiblingError(null);
  };

  const handleOpenAddNewSibling = () => {
    setEditingSiblingIndex(null);
    setIsAddingSibling(true);
    setSiblingTicker(`${currentPos?.ticker || assetKind.singular} ${additionalCertificates.length + 2}`);
    setSiblingName(`Novo ${assetKind.singular} (${institution || 'Mesma Instituição'})`);
    setSiblingInstitution(institution || '');
    setSiblingBalance('');
    setSiblingSplitFromCurrent(false);
    setSiblingIsNet(false);
    setSiblingIndexation((fixedIncomeIndexation as FixedIncomeIndexation) || assetKind.defaultIndexation || 'CDI');
    setSiblingRate('');
    setSiblingStartDate('');
    setSiblingMaturity('');
    setSiblingQuantity('');
    setSiblingUnitPrice('');
    setSiblingError(null);
  };

  const handleCancelSiblingForm = () => {
    setIsAddingSibling(false);
    setEditingSiblingIndex(null);
    setSiblingTicker('');
    setSiblingName('');
    setSiblingInstitution('');
    setSiblingBalance('');
    setSiblingSplitFromCurrent(false);
    setSiblingIsNet(false);
    setSiblingIndexation('CDI');
    setSiblingRate('');
    setSiblingStartDate('');
    setSiblingMaturity('');
    setSiblingQuantity('');
    setSiblingUnitPrice('');
    setSiblingError(null);
  };

  const handleRemoveSibling = (index: number) => {
    setAdditionalCertificates((prev) => prev.filter((_, idx) => idx !== index));
    if (editingSiblingIndex === index) {
      setIsAddingSibling(false);
      setEditingSiblingIndex(null);
    }
  };

  const handleSaveCurrent = async (advanceToNext: boolean) => {
    setErrorMsg(null);

    // Validação de cotas para renda variável ou modo de títulos
    if (isVariableIncome && (quantity === '' || Number(quantity) <= 0)) {
      setErrorMsg('Informe a quantidade de cotas deste ativo (ou utilize a sugestão da cotação).');
      return;
    }

    const isTitlesMode = isVariableIncome || (isFixedIncome && rfCustodyMode === 'TITLES');
    const numQty = isTitlesMode && quantity !== '' && Number(quantity) > 0 ? Number(quantity) : null;
    const numPrice = unitPrice !== '' ? Number(unitPrice) : 0;
    const numTarget = targetPercentage !== '' ? Number(targetPercentage) : 0;
    const numHistCost = historicalAvgCost !== '' ? Number(historicalAvgCost) : 0;

    const baseAsset: PortfolioAsset = currentAsset || {
      id: currentPos.assetId,
      userId: '',
      ticker: currentPos.ticker,
      name: currentPos.name,
      category,
      currency: currentPos.currency,
      market: currentPos.market,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const primaryBal = totalAmount !== '' && Number(totalAmount) > 0
      ? Number(totalAmount)
      : (isTitlesMode && numQty !== null && numPrice > 0
          ? Number((numQty * numPrice).toFixed(2))
          : currentFinancialValue);

    let allCertificates: FixedIncomeCertificate[] | undefined = undefined;
    let computedTotal = primaryBal;

    if (isFixedIncome && additionalCertificates.length > 0) {
      const primaryCert: FixedIncomeCertificate = {
        id: currentAsset?.fixedIncomeCertificates?.[0]?.id || `cert_main_${currentPos.assetId}`,
        ticker: primaryAssetTicker || currentPos.ticker,
        name: primaryAssetName || currentAsset?.name || currentPos.name,
        institution: institution.trim() || undefined,
        balance: primaryBal,
        isNetBalance: fixedIncomeIsNetBalance,
        indexation: fixedIncomeIndexation || undefined,
        ratePercent: fixedIncomeRatePercent !== '' ? Number(fixedIncomeRatePercent) : undefined,
        startDate: fixedIncomeStartDate || undefined,
        maturityDate: fixedIncomeMaturityDate || undefined,
        quantity: rfCustodyMode === 'TITLES' && quantity !== '' && Number(quantity) > 0 ? Number(quantity) : undefined,
        unitPrice: rfCustodyMode === 'TITLES' && unitPrice !== '' && Number(unitPrice) > 0 ? Number(unitPrice) : undefined,
        createdAt: currentAsset?.createdAt || new Date().toISOString(),
      };
      allCertificates = [primaryCert, ...additionalCertificates];
      computedTotal = Number(allCertificates.reduce((sum, c) => sum + (c.balance || 0), 0).toFixed(2));
    } else if (isFixedIncome && currentAsset?.fixedIncomeCertificates && currentAsset.fixedIncomeCertificates.length > 1) {
      allCertificates = currentAsset.fixedIncomeCertificates;
      computedTotal = Number(allCertificates.reduce((sum, c) => sum + (c.balance || 0), 0).toFixed(2));
    }

    const updatedAsset: PortfolioAsset = {
      ...baseAsset,
      name: primaryAssetName || baseAsset.name,
      ticker: primaryAssetTicker || baseAsset.ticker,
      category,
      institution: institution.trim() || undefined,
      targetPercentage: numTarget, // Meta INTEGRAL da carteira para o CDB/título (NUNCA fracionada!)
      isBalanceOnly: isTitlesMode ? false : (numQty === null || numQty === 0),
      manualPrice: !autoFetchQuote && numPrice > 0 ? numPrice : null,
      manualPriceUpdatedAt: !autoFetchQuote && numPrice > 0 ? new Date().toISOString() : undefined,
      fixedIncomeStartDate: isFixedIncome && fixedIncomeStartDate ? fixedIncomeStartDate : undefined,
      fixedIncomeIndexation: isFixedIncome && fixedIncomeIndexation ? fixedIncomeIndexation : undefined,
      fixedIncomeRatePercent: isFixedIncome && fixedIncomeRatePercent !== '' ? Number(fixedIncomeRatePercent) : undefined,
      fixedIncomeMaturityDate: isFixedIncome && fixedIncomeMaturityDate ? fixedIncomeMaturityDate : undefined,
      fixedIncomeIsNetBalance: isFixedIncome ? fixedIncomeIsNetBalance : undefined,
      fixedIncomeCertificates: allCertificates,
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onSaveCalibration(
        updatedAsset,
        {
          quantity: numQty,
          unitPrice: numHistCost > 0 ? numHistCost : numPrice,
          grossAmount: computedTotal,
          isNetBalance: isFixedIncome ? fixedIncomeIsNetBalance : undefined,
          date: isFixedIncome && fixedIncomeStartDate ? fixedIncomeStartDate : undefined,
        },
        applyInstitutionToAll,
        undefined, // Não cria mais ativos adicionais independentes que poluem a custódia
        absorbedAssetIds.length > 0 ? absorbedAssetIds : undefined
      );

      setAdditionalCertificates([]);
      setAbsorbedAssetIds([]);

      if (onRefreshQuotes) {
        onRefreshQuotes(true).catch(() => {});
      }

      // Avança para o próximo se solicitado e houver mais itens
      if (advanceToNext && currentIndex < calibrationQueue.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onClose();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao salvar calibração.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingWithoutInstitutionCount = calibrationQueue.filter(
    (p, idx) => idx !== currentIndex && (!p.institution || p.institution.trim() === '')
  ).length;

  const isLastItem = currentIndex === calibrationQueue.length - 1;

  if (!isOpen) return null;

  // Estado vazio: nenhum ativo para calibrar
  if (!currentPos || calibrationQueue.length === 0) {
    return (
      <div
        data-testid="asset-calibration-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Calibração de Ativos"
        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 text-center shadow-xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-950 dark:text-white">
            Carteira Soberana 100% Calibrada
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Todos os seus ativos possuem cotas, instituição custodiante e metas percentuais devidamente registradas.
          </p>
          <button
            type="button"
            data-testid="btn-close-calibration-empty"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-950 dark:bg-slate-800 text-white text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="asset-calibration-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Calibração Guiada de Ativos"
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 md:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in"
    >
      <div
        ref={modalCardRef}
        data-testid="calibration-modal-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-5 md:p-6 shadow-2xl relative my-auto space-y-5"
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-950 dark:text-white">
                  Calibração Guiada Nexus
                </h3>
                {calibrationQueue.length > 1 && (
                  <span
                    data-testid="calibration-step-badge"
                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  >
                    {currentIndex + 1} de {calibrationQueue.length}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Complete as informações para habilitar apuração real e rebalanceamento
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-calibration"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Navegação Rápida entre Ativos Pendentes (se houver múltiplos) */}
        {calibrationQueue.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {calibrationQueue.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={item.assetId}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-colors whitespace-nowrap border ${
                    isActive
                      ? 'bg-slate-950 text-white dark:bg-slate-800 dark:text-emerald-400 border-slate-950 dark:border-emerald-500'
                      : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {item.ticker}
                </button>
              );
            })}
          </div>
        )}

        {/* Card de Identificação do Ativo Ativo */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black text-slate-950 dark:text-white">
                {currentPos.ticker}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {currentPos.category}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
              {currentPos.name}
            </p>
          </div>
          <div className="sm:text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Saldo em Custódia
            </span>
            <span className="font-mono text-sm font-black text-slate-950 dark:text-white">
              {formatCurrencyBRL(
                totalAmount !== '' && Number(totalAmount) > 0
                  ? Number(totalAmount)
                  : currentFinancialValue
              )}
            </span>
          </div>
        </div>

        {/* Motivos da Calibração */}
        {currentIssue && currentIssue.reasons.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {currentIssue.reasons.map((r, i) => (
              <span
                key={i}
                className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60"
              >
                ⚠️ {r}
              </span>
            ))}
          </div>
        )}

        {errorMsg && (
          <div
            data-testid="calibration-error-banner"
            role="alert"
            className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs font-medium"
          >
            {errorMsg}
          </div>
        )}

        {/* Formulário de Calibração */}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
          {/* 1. Quantidade de Cotas, Cotação e Valor Total (Renda Variável) */}
          {isVariableIncome ? (
            <div className="space-y-3.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              {/* Barra de Cotação da Internet e Modo Manual */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    data-testid="checkbox-auto-quote"
                    checked={autoFetchQuote}
                    onChange={(e) => handleToggleAutoQuote(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-600 text-slate-950 focus:ring-slate-950 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Globe className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Buscar cotação em tempo real na internet</span>
                  </div>
                </label>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {isFetchingQuote ? (
                    <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin text-purple-600" />
                      <span>Consultando...</span>
                    </span>
                  ) : autoFetchQuote && quoteFetchStatus === 'success' && (unitPrice !== '' && Number(unitPrice) > 0) ? (
                    <span
                      data-testid="badge-online-quote"
                      className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Online: {formatCurrencyBRL(Number(unitPrice))}</span>
                    </span>
                  ) : !autoFetchQuote ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      <span>Preço Manual</span>
                    </span>
                  ) : null}

                  {autoFetchQuote && (
                    <button
                      type="button"
                      data-testid="btn-refresh-online-quote"
                      disabled={isFetchingQuote}
                      onClick={() => handleFetchOnlineQuote(true)}
                      className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                      title="Atualizar cotação agora"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingQuote ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              </div>

              {quoteFetchError && (
                <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-900/50">
                  ⚠️ {quoteFetchError}
                </div>
              )}

              {/* Sugestão de Cotas da B3 */}
              {inferredQuantityFromQuote && inferredQuantityFromQuote > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cálculo inteligente com base no saldo e cotação:
                  </span>
                  <button
                    type="button"
                    data-testid="btn-apply-inferred-qty"
                    onClick={handleApplyInferredQuantity}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:underline"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Usar cotação B3: {inferredQuantityFromQuote} cotas</span>
                  </button>
                </div>
              )}

              {/* Tríade de Campos em Grid (Quantidade × Preço = Total) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Campo 1: Quantidade */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Quantidade de Cotas *
                  </label>
                  <input
                    type="number"
                    data-testid="input-calibration-quantity"
                    min="0"
                    step="any"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                    placeholder="Ex: 100"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Cotas em custódia
                  </span>
                </div>

                {/* Campo 2: Preço Unitário / Cotação */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Cotação Unitária (R$)
                  </label>
                  <input
                    type="number"
                    data-testid="input-calibration-price"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => handleUnitPriceChange(e.target.value)}
                    placeholder="Ex: 35.50"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                    {autoFetchQuote ? 'Cotação de mercado' : 'Preço manual'}
                  </span>
                </div>

                {/* Campo 3: Valor Total da Posição (Editável) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Valor Total em Custódia (R$) *
                  </label>
                  <input
                    type="number"
                    data-testid="input-calibration-total"
                    min="0"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => handleTotalAmountChange(e.target.value)}
                    placeholder="Ex: 3550.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 block truncate font-medium">
                    Total da posição
                  </span>
                </div>
              </div>

              {/* Preço Médio Histórico de Compra (Opcional) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Preço Médio Histórico de Compra (Opcional)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Para apurar rentabilidade real
                  </span>
                </div>
                <input
                  type="number"
                  data-testid="input-calibration-hist-price"
                  min="0"
                  step="0.01"
                  value={historicalAvgCost}
                  onChange={(e) => setHistoricalAvgCost(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Opcional: quanto você pagou em média na época (R$)"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950"
                />
              </div>
            </div>
          ) : isFixedIncome ? (
            /* Seção para Renda Fixa com Seleção de Modo (Títulos/PU ou Saldo Consolidado) */
            <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                    Modelo de Custódia
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {rfCustodyMode === 'TITLES' ? 'Por quantidade de títulos e Preço Unitário (PU)' : 'Por saldo financeiro consolidado'}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    data-testid="btn-rf-mode-titles"
                    onClick={() => {
                      setRfCustodyMode('TITLES');
                      if (totalAmount !== '' && unitPrice !== '' && Number(unitPrice) > 0 && quantity === '') {
                        setQuantity(Number((Number(totalAmount) / Number(unitPrice)).toFixed(4)));
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      rfCustodyMode === 'TITLES'
                        ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Títulos (Qtd / PU)
                  </button>
                  <button
                    type="button"
                    data-testid="btn-rf-mode-balance"
                    onClick={() => setRfCustodyMode('BALANCE')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      rfCustodyMode === 'BALANCE'
                        ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Saldo Total (R$)
                  </button>
                </div>
              </div>

              {rfCustodyMode === 'TITLES' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Campo 1: Quantidade de Títulos / Frações */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Quantidade de Títulos *
                      </label>
                      <input
                        type="number"
                        data-testid="input-calibration-quantity"
                        min="0"
                        step="any"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        placeholder="Ex: 1.25 ou 100"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Títulos em custódia
                      </span>
                    </div>

                    {/* Campo 2: Preço Unitário (PU) */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Preço Unitário / PU (R$)
                      </label>
                      <input
                        type="number"
                        data-testid="input-calibration-price"
                        min="0"
                        step="0.01"
                        value={unitPrice}
                        onChange={(e) => handleUnitPriceChange(e.target.value)}
                        placeholder="Ex: 3450.25"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block truncate">
                        Valor de 1 título (PU)
                      </span>
                    </div>

                    {/* Campo 3: Valor Total da Posição */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Valor Total em Custódia (R$) *
                      </label>
                      <input
                        type="number"
                        data-testid="input-calibration-total"
                        min="0"
                        step="0.01"
                        value={totalAmount}
                        onChange={(e) => handleTotalAmountChange(e.target.value)}
                        placeholder="Ex: 4312.81"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-purple-300 dark:border-purple-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5 block truncate font-medium">
                        Total calculado (Qtd × PU)
                      </span>
                    </div>
                  </div>

                  {/* Preço Médio Histórico de Compra (Opcional) */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Preço Médio Histórico de Aquisição (Opcional)
                      </label>
                      <span className="text-[10px] text-slate-400">
                        Para apurar rentabilidade real
                      </span>
                    </div>
                    <input
                      type="number"
                      data-testid="input-calibration-hist-price"
                      min="0"
                      step="0.01"
                      value={historicalAvgCost}
                      onChange={(e) => setHistoricalAvgCost(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Opcional: PU pago na data de aplicação (R$)"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
                    Valor Total em Custódia (R$) *
                  </label>
                  <input
                    type="number"
                    data-testid="input-calibration-total"
                    min="0"
                    step="0.01"
                    value={totalAmount}
                    onChange={(e) => handleTotalAmountChange(e.target.value)}
                    placeholder="Ex: 5000.00"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Saldo atualizado desta posição
                  </span>
                </div>
              )}

              {/* Seletor Soberano de Saldo Bruto vs Saldo Líquido para Renda Fixa */}
              {isTaxExemptFixedIncome ? (
                <div
                  data-testid="fixed-income-tax-exempt-badge"
                  className="mt-2.5 flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60"
                >
                  <span className="text-xs">🛡️</span>
                  <div className="text-[11px] text-emerald-900 dark:text-emerald-300">
                    <span className="font-bold">Isento de Imposto de Renda (PF):</span> Saldo bruto é igual ao saldo líquido (LCI, LCA, CRI, CRA e Debêntures Incentivadas).
                  </div>
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Tipo de Saldo Informado
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Tributação regressiva (22,5% a 15%)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      data-testid="btn-balance-gross"
                      onClick={() => setFixedIncomeIsNetBalance(false)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left flex items-center gap-2.5 ${
                        !fixedIncomeIsNetBalance
                          ? 'bg-slate-950 dark:bg-slate-800 text-white dark:text-emerald-400 border-slate-950 dark:border-emerald-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          !fixedIncomeIsNetBalance
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-400'
                        }`}
                      >
                        {!fixedIncomeIsNetBalance && <div className="w-1.5 h-1.5 rounded-full bg-slate-950 dark:bg-slate-900" />}
                      </div>
                      <div className="min-w-0">
                        <div className="leading-tight truncate">Saldo Bruto</div>
                        <div className="text-[9px] font-normal opacity-80 truncate">Antes do IR</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      data-testid="btn-balance-net"
                      onClick={() => setFixedIncomeIsNetBalance(true)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border text-left flex items-center gap-2.5 ${
                        fixedIncomeIsNetBalance
                          ? 'bg-slate-950 dark:bg-slate-800 text-white dark:text-emerald-400 border-slate-950 dark:border-emerald-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          fixedIncomeIsNetBalance
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-400'
                        }`}
                      >
                        {fixedIncomeIsNetBalance && <div className="w-1.5 h-1.5 rounded-full bg-slate-950 dark:bg-slate-900" />}
                      </div>
                      <div className="min-w-0">
                        <div className="leading-tight truncate">Saldo Líquido</div>
                        <div className="text-[9px] font-normal opacity-80 truncate">Pós-IR (resgate real)</div>
                      </div>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {!fixedIncomeIsNetBalance ? (
                      <>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Saldo Bruto:</span> O valor total acumula juros compostos sobre o montante bruto. A retenção de IR regressivo e IOF é provisionada no cálculo da curva Anbima.
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Saldo Líquido:</span> O valor digitado já deduziu a estimativa de IR na fonte, representando a quantia líquida exata disponível na corretora.
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Seção para outros ativos puramente monetários (ex: Caixa de Oportunidade) */
            <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Valor Total em Custódia (R$) *
              </label>
              <div>
                <input
                  type="number"
                  data-testid="input-calibration-total"
                  min="0"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => handleTotalAmountChange(e.target.value)}
                  placeholder="Ex: 5000.00"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Saldo atualizado desta posição
                </span>
              </div>
            </div>
          )}

          {/* 2. Instituição Custodiante (Corretora) */}
          <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Instituição Custodiante (Corretora)</span>
            </label>

            {/* Chips Rápidos de Corretoras */}
            <div className="flex flex-wrap items-center gap-1.5">
              {QUICK_BROKERS.map((broker) => (
                <button
                  key={broker}
                  type="button"
                  onClick={() => setInstitution(broker)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors border ${
                    institution === broker
                      ? 'bg-slate-950 text-white dark:bg-slate-800 dark:text-emerald-400 border-slate-950 dark:border-emerald-500'
                      : 'bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {broker}
                </button>
              ))}
            </div>

            <input
              type="text"
              data-testid="input-calibration-institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="Ou digite o nome da corretora (ex: Toro, Clear, Warren)"
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950"
            />

            {/* Checkbox de Propagação em Lote */}
            {pendingWithoutInstitutionCount > 0 && institution.trim() !== '' && (
              <label className="flex items-center gap-2 mt-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400 font-medium">
                <input
                  type="checkbox"
                  data-testid="checkbox-apply-institution-all"
                  checked={applyInstitutionToAll}
                  onChange={(e) => setApplyInstitutionToAll(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-950 w-3.5 h-3.5"
                />
                <span>
                  Aplicar <strong>{institution}</strong> aos outros {pendingWithoutInstitutionCount} ativos pendentes
                </span>
              </label>
            )}
          </div>

          {/* 3. Renda Fixa (se aplicável) - Marcação na Curva */}
          {isFixedIncome && (
            <div className="space-y-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20">
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-300 block">
                Marcação na Curva de Renda Fixa (Anbima)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Indexador
                  </label>
                  <select
                    value={fixedIncomeIndexation}
                    onChange={(e) => setFixedIncomeIndexation(e.target.value as FixedIncomeIndexation)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="">Selecione...</option>
                    <option value="CDI">% do CDI</option>
                    <option value="IPCA">IPCA + Spread</option>
                    <option value="PRE">Prefixado</option>
                    <option value="SELIC">% da Selic / Selic + Spread</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Taxa Contratada (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fixedIncomeRatePercent}
                    onChange={(e) => setFixedIncomeRatePercent(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ex: 110 ou 6.5"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Data de Aplicação
                  </label>
                  <input
                    type="date"
                    data-testid="input-calibration-start-date"
                    value={fixedIncomeStartDate}
                    onChange={(e) => setFixedIncomeStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    data-testid="input-calibration-maturity-date"
                    value={fixedIncomeMaturityDate}
                    onChange={(e) => setFixedIncomeMaturityDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 5. Títulos na Mesma Meta / Categoria (ex: múltiplos CDBs com acordeão unificado) */}
          {isFixedIncome && (
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-3" data-testid="section-sibling-fixed-income">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Títulos Cadastrados Sob Esta Mesma Meta
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      {1 + additionalCertificates.length} {1 + additionalCertificates.length === 1 ? 'título' : 'títulos'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Visualize, edite ou adicione novos vencimentos de {assetKind.singular} compartilhando esta mesma meta na carteira.
                  </span>
                </div>
                {!isAddingSibling ? (
                  <button
                    type="button"
                    data-testid="btn-open-add-sibling"
                    onClick={handleOpenAddNewSibling}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0 inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{assetKind.addAnotherButton}</span>
                  </button>
                ) : null}
              </div>

              {/* Lista Unificada e Homogênea de Todos os Títulos desta Meta */}
              <div className="space-y-2 pt-1" data-testid="sibling-assets-list">
                {/* 1º Título (Principal) */}
                <div
                  data-testid="sibling-primary-item"
                  className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-600"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 uppercase">
                          1º Título (Principal)
                        </span>
                        <span className="font-bold text-slate-950 dark:text-white font-mono text-xs">
                          {primaryAssetName || currentAsset?.name || currentPos?.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          ({primaryAssetTicker || currentPos?.ticker})
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 mt-1 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap font-medium">
                        <span>Banco/Corretora: <strong className="text-slate-800 dark:text-slate-200">{institution || '—'}</strong></span>
                        <span>•</span>
                        <span>Taxa: <strong className="text-slate-800 dark:text-slate-200">{fixedIncomeIndexation || 'CDI'} {fixedIncomeRatePercent !== '' && fixedIncomeRatePercent !== undefined ? `${fixedIncomeRatePercent}%` : ''}</strong></span>
                        {fixedIncomeStartDate && (
                          <>
                            <span>•</span>
                            <span>Aplicação: <strong className="text-slate-800 dark:text-slate-200">{formatDateBR(fixedIncomeStartDate)}</strong></span>
                          </>
                        )}
                        <span>•</span>
                        <span>Vencimento: <strong className="text-slate-800 dark:text-slate-200">{fixedIncomeMaturityDate ? formatDateBR(fixedIncomeMaturityDate) : '—'}</strong></span>
                        {quantity !== '' && Number(quantity) > 0 && (
                          <>
                            <span>•</span>
                            <span>Qtd: <strong className="text-slate-800 dark:text-slate-200 font-mono">{quantity} tit.</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-xs text-slate-950 dark:text-white">
                        {formatCurrencyBRL(Number(totalAmount) || 0)}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {computedCompositionBreakdown.primaryShare}% desta meta
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                          {fixedIncomeIsNetBalance ? 'Líq' : 'Bruto'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                    <button
                      type="button"
                      data-testid="btn-edit-primary-cert"
                      onClick={handleOpenEditPrimary}
                      className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar 1º Título</span>
                    </button>
                  </div>
                </div>

                {/* Títulos Adicionais Cadastrados */}
                {additionalCertificates.map((cert, sIdx) => {
                  const share = computedCompositionBreakdown.certificates[sIdx]?.share ?? 0;
                  return (
                    <div
                      key={cert.id}
                      data-testid={`sibling-item-${(cert.ticker || cert.name).toUpperCase()}`}
                      className="p-3 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-2 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-600"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 uppercase">
                              {sIdx + 2}º Título
                            </span>
                            <span className="font-bold text-slate-950 dark:text-white font-mono text-xs">
                              {cert.name}
                            </span>
                            {cert.ticker && (
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                ({cert.ticker})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 mt-1 text-[11px] text-slate-600 dark:text-slate-400 flex-wrap font-medium">
                            <span>Banco/Corretora: <strong className="text-slate-800 dark:text-slate-200">{cert.institution || '—'}</strong></span>
                            <span>•</span>
                            <span>Taxa: <strong className="text-slate-800 dark:text-slate-200">{cert.indexation || 'CDI'} {cert.ratePercent !== undefined ? `${cert.ratePercent}%` : ''}</strong></span>
                            {cert.startDate && (
                              <>
                                <span>•</span>
                                <span>Aplicação: <strong className="text-slate-800 dark:text-slate-200">{formatDateBR(cert.startDate)}</strong></span>
                              </>
                            )}
                            <span>•</span>
                            <span>Vencimento: <strong className="text-slate-800 dark:text-slate-200">{cert.maturityDate ? formatDateBR(cert.maturityDate) : '—'}</strong></span>
                            {cert.quantity !== undefined && cert.quantity > 0 && (
                              <>
                                <span>•</span>
                                <span>Qtd: <strong className="text-slate-800 dark:text-slate-200 font-mono">{cert.quantity} tit.</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-xs text-slate-950 dark:text-white">
                            {formatCurrencyBRL(cert.balance)}
                          </div>
                          <div className="flex items-center justify-end gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {share}% desta meta
                            </span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                              {cert.isNetBalance ? 'Líq' : 'Bruto'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-700/60">
                        <button
                          type="button"
                          data-testid={`btn-edit-sibling-${sIdx}`}
                          onClick={() => handleOpenEditSibling(sIdx)}
                          className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          data-testid={`btn-remove-sibling-${sIdx}`}
                          onClick={() => handleRemoveSibling(sIdx)}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remover</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formulário Inline de Inclusão ou Edição de Título */}
              {isAddingSibling && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in p-3.5 bg-white dark:bg-slate-850 rounded-xl border" data-testid="form-add-sibling">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-750">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {editingSiblingIndex === -1
                        ? '✏️ Editando 1º Título (Principal)'
                        : editingSiblingIndex !== null
                        ? `✏️ Editando Título: ${siblingName || assetKind.singular}`
                        : `➕ Adicionar Novo Vencimento (${assetKind.singular})`}
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelSiblingForm}
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Fechar formulário"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Código / Ticker do Título *
                      </label>
                      <input
                        type="text"
                        data-testid="input-sibling-ticker"
                        value={siblingTicker}
                        onChange={(e) => setSiblingTicker(e.target.value)}
                        placeholder={assetKind.placeholderTicker}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Nome Completo do Título *
                      </label>
                      <input
                        type="text"
                        data-testid="input-sibling-name"
                        value={siblingName}
                        onChange={(e) => setSiblingName(e.target.value)}
                        placeholder={assetKind.placeholderName}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                        Instituição Custodiante (Banco / Corretora)
                      </label>
                      <input
                        type="text"
                        data-testid="input-sibling-institution"
                        value={siblingInstitution}
                        onChange={(e) => setSiblingInstitution(e.target.value)}
                        placeholder="Ex: Inter, BTG, XP, Nubank"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Qtd Títulos (Opcional)
                          </label>
                          <input
                            type="number"
                            data-testid="input-sibling-quantity"
                            min="0"
                            step="any"
                            value={siblingQuantity}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setSiblingQuantity(val);
                              if (val !== '' && siblingUnitPrice !== '' && Number(siblingUnitPrice) > 0) {
                                setSiblingBalance(Number((Number(val) * Number(siblingUnitPrice)).toFixed(2)));
                              }
                            }}
                            placeholder="Ex: 1.25"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Preço Unitário (PU R$)
                          </label>
                          <input
                            type="number"
                            data-testid="input-sibling-unit-price"
                            min="0"
                            step="0.01"
                            value={siblingUnitPrice}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setSiblingUnitPrice(val);
                              if (val !== '' && siblingQuantity !== '' && Number(siblingQuantity) > 0) {
                                setSiblingBalance(Number((Number(siblingQuantity) * Number(val)).toFixed(2)));
                              }
                            }}
                            placeholder="Ex: 3450.00"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Valor em Custódia (R$) *
                          </label>
                          <input
                            type="number"
                            data-testid="input-sibling-balance"
                            min="0"
                            step="0.01"
                            value={siblingBalance}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setSiblingBalance(val);
                              if (val !== '' && siblingUnitPrice !== '' && Number(siblingUnitPrice) > 0) {
                                setSiblingQuantity(Number((Number(val) / Number(siblingUnitPrice)).toFixed(4)));
                              }
                            }}
                            placeholder="Ex: 5000.00"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Opção de Desdobramento de Saldo (apenas ao adicionar novo) */}
                  {editingSiblingIndex === null && totalAmount !== '' && Number(totalAmount) > 0 && (
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        data-testid="checkbox-sibling-split"
                        checked={siblingSplitFromCurrent}
                        onChange={(e) => setSiblingSplitFromCurrent(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-950 w-3.5 h-3.5"
                      />
                      <span>
                        Desmembrar este valor do saldo do título atual (R$ {Number(totalAmount).toFixed(2)})
                      </span>
                    </label>
                  )}

                  {/* Saldo Bruto vs Saldo Líquido do Título */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Tipo de Saldo:</span>
                    <button
                      type="button"
                      data-testid="btn-sibling-gross"
                      onClick={() => setSiblingIsNet(false)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                        !siblingIsNet
                          ? 'bg-slate-950 dark:bg-slate-800 text-white dark:text-emerald-400 border-slate-950 dark:border-emerald-500'
                          : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Saldo Bruto
                    </button>
                    <button
                      type="button"
                      data-testid="btn-sibling-net"
                      onClick={() => setSiblingIsNet(true)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                        siblingIsNet
                          ? 'bg-slate-950 dark:bg-slate-800 text-white dark:text-emerald-400 border-slate-950 dark:border-emerald-500'
                          : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      Saldo Líquido (pós-IR)
                    </button>
                  </div>

                  {/* Parâmetros da Curva para o Título */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                        Indexador
                      </label>
                      <select
                        data-testid="select-sibling-indexation"
                        value={siblingIndexation}
                        onChange={(e) => setSiblingIndexation(e.target.value as FixedIncomeIndexation)}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      >
                        <option value="">Selecione...</option>
                        <option value="CDI">% do CDI</option>
                        <option value="IPCA">IPCA + Spread</option>
                        <option value="PRE">Prefixado</option>
                        <option value="SELIC">% da Selic / Selic + Spread</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                        Taxa Contratada (%)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        data-testid="input-sibling-rate"
                        value={siblingRate}
                        onChange={(e) => setSiblingRate(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Ex: 102 ou 110"
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                        Data de Aplicação
                      </label>
                      <input
                        type="date"
                        data-testid="input-sibling-start-date"
                        value={siblingStartDate}
                        onChange={(e) => setSiblingStartDate(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block mb-0.5">
                        Data de Vencimento
                      </label>
                      <input
                        type="date"
                        data-testid="input-sibling-maturity"
                        value={siblingMaturity}
                        onChange={(e) => setSiblingMaturity(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {siblingError && (
                    <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                      {siblingError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelSiblingForm}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      data-testid="btn-confirm-add-sibling-asset"
                      onClick={handleConfirmAddSibling}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-950 dark:bg-slate-800 text-white dark:text-emerald-400 border border-slate-950 dark:border-emerald-500 shadow-sm inline-flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingSiblingIndex !== null ? 'Salvar Alterações' : 'Incluir Novo Título'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sugestão de unificação de títulos avulsos detectados na mesma categoria */}
              {orphanSiblingAssets.map((orphan) => {
                const orphanBal = orphan.currentValueBRL || orphan.totalInvestedBRL || 0;
                return (
                  <div
                    key={orphan.assetId}
                    data-testid={`banner-orphan-sibling-${orphan.ticker}`}
                    className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-bold text-amber-950 dark:text-amber-200 block">
                        Título avulso detectado: {orphan.ticker} ({orphan.name})
                      </span>
                      <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80 block">
                        Saldo de {formatCurrencyBRL(orphanBal)}. Deseja unificá-lo como um título {assetKind.preposition} {assetKind.singular} mantendo a meta única de {targetPercentage || 0}%?
                      </span>
                    </div>
                    <button
                      type="button"
                      data-testid={`btn-absorb-orphan-${orphan.ticker}`}
                      onClick={() => handleAbsorbOrphan(orphan)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shrink-0 shadow-sm transition-colors"
                    >
                      Unificar {assetKind.preposition === 'deste' ? 'neste' : 'nesta'} {assetKind.singular}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Meta Percentual de Alocação (% da Carteira) - Posicionada após todos os títulos da meta */}
          <div className="space-y-2 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800" data-testid="section-allocation-target">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isFixedIncome && additionalCertificates.length > 0
                  ? 'Meta Percentual de Alocação Compartilhada (% da Carteira)'
                  : 'Meta Percentual de Alocação (% da Carteira)'}
              </label>
              <button
                type="button"
                onClick={() => setTargetPercentage(5)}
                className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:underline"
              >
                Sugerir 5%
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                data-testid="input-calibration-target"
                min="0"
                max="100"
                step="0.5"
                value={targetPercentage}
                onChange={(e) => setTargetPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ex: 5.0"
                className="w-32 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950"
              />
              <span className="text-xs font-bold text-slate-500">%</span>
              <span className="text-[11px] text-slate-400 ml-2">
                {isFixedIncome && additionalCertificates.length > 0
                  ? 'Meta compartilhada aplicada ao conjunto de títulos acima'
                  : 'Usado pelo Nexus no simulador de rebalanceamento'}
              </span>
            </div>

            {/* Painel Explicativo de Distribuição Compartilhada */}
            {isFixedIncome && additionalCertificates.length > 0 && targetPercentage !== '' && Number(targetPercentage) > 0 && (
              <div
                data-testid="shared-target-distribution-breakdown"
                className="mt-3 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-950 dark:text-emerald-300">
                    {assetKind.compositionTitle} sob esta Meta ({Number(targetPercentage)}% no total)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                    Total: {formatCurrencyBRL(computedCompositionBreakdown.totalConsolidated)}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs font-mono text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between py-0.5 border-b border-emerald-100 dark:border-emerald-900/40">
                    <span className="truncate">{currentPos?.ticker || 'Título Principal'} ({institution || currentPos?.name || 'Principal'}):</span>
                    <span className="font-bold text-emerald-950 dark:text-emerald-200 ml-2 shrink-0">
                      {formatCurrencyBRL(Number(totalAmount) || 0)} ({computedCompositionBreakdown.primaryShare}%)
                    </span>
                  </div>
                  {computedCompositionBreakdown.certificates.map((cert) => (
                    <div key={cert.id} className="flex items-center justify-between py-0.5 border-b border-emerald-100 dark:border-emerald-900/40">
                      <span className="truncate">{cert.name} ({cert.institution || '—'}):</span>
                      <span className="font-bold text-emerald-950 dark:text-emerald-200 ml-2 shrink-0">
                        {formatCurrencyBRL(cert.balance)} ({cert.share}%)
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  A meta integral de {Number(targetPercentage)}% é atribuída a {assetKind.preposition === 'deste' ? 'este' : 'esta'} {assetKind.singular} como um todo na carteira, sem fracionamento. Detalhes individuais de taxas e vencimentos ficam disponíveis ao expandir o ativo na lista de custódia.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé de Ações do Modal */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {currentIndex > 0 && (
              <button
                type="button"
                data-testid="btn-calibration-prev"
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Anterior</span>
              </button>
            )}
            <button
              type="button"
              data-testid="btn-calibration-cancel"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isLastItem && calibrationQueue.length > 1 && (
              <button
                type="button"
                data-testid="btn-calibration-skip"
                onClick={() => setCurrentIndex((prev) => prev + 1)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Pular
              </button>
            )}

            <button
              type="button"
              data-testid="btn-save-calibration"
              disabled={isSubmitting}
              onClick={() => handleSaveCurrent(!isLastItem)}
              className="px-4 py-2 rounded-xl bg-slate-950 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm disabled:opacity-60"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {isSubmitting
                  ? 'Salvando...'
                  : isLastItem || calibrationQueue.length === 1
                  ? 'Salvar Calibração'
                  : 'Salvar e Próximo'}
              </span>
              {!isLastItem && calibrationQueue.length > 1 && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
