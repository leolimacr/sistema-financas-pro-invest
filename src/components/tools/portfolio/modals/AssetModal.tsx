import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  Check,
  HelpCircle,
  Search,
  Building2,
  Plus,
  Trash2,
  Edit3,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  PortfolioAsset,
  PortfolioAssetClass,
  CurrencyCode,
  QuoteMarket,
  FixedIncomeCertificate,
} from '../../../../core/portfolio/portfolioTypes';
import type { FixedIncomeIndexation } from '../../../../core/portfolio/fixedIncomeMath';
import { searchTickerCatalog, CatalogItem } from '../../../../core/portfolio/tickerCatalog';
import { formatCurrencyBRL, formatDateBR, getFixedIncomeKindInfo } from '../portfolioViewUtils';

interface AssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (asset: PortfolioAsset) => Promise<void>;
  classes: PortfolioAssetClass[];
  userId: string;
  initialAsset?: PortfolioAsset | null;
}

const QUICK_BROKERS = ['XP', 'BTG Pactual', 'Inter', 'Nubank', 'Avenue', 'Binance'];

export const AssetModal: React.FC<AssetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  classes,
  userId,
  initialAsset,
}) => {
  const [ticker, setTicker] = useState(initialAsset?.ticker || '');
  const [name, setName] = useState(initialAsset?.name || '');
  const [category, setCategory] = useState(
    initialAsset?.category || (classes[0]?.name ?? 'Ações Brasil')
  );
  const [currency, setCurrency] = useState<CurrencyCode>(initialAsset?.currency || 'BRL');
  const [market, setMarket] = useState<QuoteMarket>(initialAsset?.market || 'B3');
  const [institution, setInstitution] = useState(initialAsset?.institution || '');
  const [targetPercentage, setTargetPercentage] = useState<number | ''>(
    initialAsset?.targetPercentage ?? ''
  );
  const [isBalanceOnly, setIsBalanceOnly] = useState(Boolean(initialAsset?.isBalanceOnly));
  const [manualPrice, setManualPrice] = useState<number | ''>(
    initialAsset?.manualPrice ?? ''
  );
  const [fixedIncomeIndexation, setFixedIncomeIndexation] = useState<FixedIncomeIndexation | ''>(
    initialAsset?.fixedIncomeIndexation || ''
  );
  const [fixedIncomeRatePercent, setFixedIncomeRatePercent] = useState<number | ''>(
    initialAsset?.fixedIncomeRatePercent ?? ''
  );
  const [fixedIncomeStartDate, setFixedIncomeStartDate] = useState(
    initialAsset?.fixedIncomeStartDate || ''
  );
  const [fixedIncomeMaturityDate, setFixedIncomeMaturityDate] = useState(
    initialAsset?.fixedIncomeMaturityDate || ''
  );
  const [fixedIncomeIsNetBalance, setFixedIncomeIsNetBalance] = useState(
    Boolean(initialAsset?.fixedIncomeIsNetBalance)
  );
  const [notes, setNotes] = useState(initialAsset?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Títulos / Certificados vinculados a esta meta (Renda Fixa / Múltiplos Vencimentos)
  const [certificates, setCertificates] = useState<FixedIncomeCertificate[]>(
    initialAsset?.fixedIncomeCertificates ? [...initialAsset.fixedIncomeCertificates] : []
  );
  const [isEditingCertFormOpen, setIsEditingCertFormOpen] = useState(false);
  const [editingCertIndex, setEditingCertIndex] = useState<number | null>(null);
  const [certName, setCertName] = useState('');
  const [certTicker, setCertTicker] = useState('');
  const [certInstitution, setCertInstitution] = useState('');
  const [certIndexation, setCertIndexation] = useState<FixedIncomeIndexation | ''>('IPCA');
  const [certRate, setCertRate] = useState<number | ''>('');
  const [certStartDate, setCertStartDate] = useState('');
  const [certMaturityDate, setCertMaturityDate] = useState('');
  const [certBalance, setCertBalance] = useState<number | ''>('');
  const [certIsNet, setCertIsNet] = useState(false);
  const [certCustodyMode, setCertCustodyMode] = useState<'BALANCE' | 'TITLES'>('BALANCE');
  const [certQuantity, setCertQuantity] = useState<number | ''>('');
  const [certUnitPrice, setCertUnitPrice] = useState<number | ''>('');
  const [certError, setCertError] = useState<string | null>(null);
  const [isPrimarySavedFeedback, setIsPrimarySavedFeedback] = useState(false);

  // Estados do Autocomplete
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const tickerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTicker(initialAsset?.ticker || '');
      setName(initialAsset?.name || '');
      setCategory(initialAsset?.category || (classes[0]?.name ?? 'Ações Brasil'));
      setCurrency(initialAsset?.currency || 'BRL');
      setMarket(initialAsset?.market || 'B3');
      setInstitution(initialAsset?.institution || '');
      setTargetPercentage(initialAsset?.targetPercentage ?? '');
      setIsBalanceOnly(Boolean(initialAsset?.isBalanceOnly));
      setManualPrice(initialAsset?.manualPrice ?? '');
      setFixedIncomeIndexation(initialAsset?.fixedIncomeIndexation || '');
      setFixedIncomeRatePercent(initialAsset?.fixedIncomeRatePercent ?? '');
      setFixedIncomeStartDate(initialAsset?.fixedIncomeStartDate || '');
      setFixedIncomeMaturityDate(initialAsset?.fixedIncomeMaturityDate || '');
      setFixedIncomeIsNetBalance(Boolean(initialAsset?.fixedIncomeIsNetBalance));
      setNotes(initialAsset?.notes || '');
      setCertificates(
        initialAsset?.fixedIncomeCertificates ? [...initialAsset.fixedIncomeCertificates] : []
      );
      setIsEditingCertFormOpen(false);
      setEditingCertIndex(null);
      setCertError(null);
      setErrorMsg(null);
    }
  }, [isOpen, initialAsset, classes]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      tickerInputRef.current?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  // Busca sugestões no catálogo de mercado
  const suggestions = useMemo(() => {
    const clean = ticker.trim();
    if (!clean) return [];
    return searchTickerCatalog(clean, 6);
  }, [ticker]);

  const handleSelectSuggestion = (item: CatalogItem) => {
    setTicker(item.ticker);
    setName(item.name);
    setMarket(item.market);
    setCurrency(item.currency);
    if (item.isBalanceOnly !== undefined) {
      setIsBalanceOnly(item.isBalanceOnly);
    }

    // Tenta casar categoria com as classes existentes do usuário
    const matchedClass = classes.find(
      (c) => c.name.toLowerCase() === item.category.toLowerCase()
    );
    if (matchedClass) {
      setCategory(matchedClass.name);
    } else {
      // Casamento aproximado (ex: FII vs Fundos Imobiliários)
      if (item.category.toLowerCase().includes('imobiliário') || item.category.toLowerCase().includes('fii')) {
        const fiiClass = classes.find(
          (c) => c.name.toLowerCase().includes('imobili') || c.name.toLowerCase().includes('fii')
        );
        if (fiiClass) setCategory(fiiClass.name);
      } else if (item.category.toLowerCase().includes('ação') || item.category.toLowerCase().includes('acoes')) {
        const stockClass = classes.find(
          (c) => c.name.toLowerCase().includes('ação') || c.name.toLowerCase().includes('acoes')
        );
        if (stockClass) setCategory(stockClass.name);
      }
    }

    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  };

  const handleKeyDownTicker = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
        e.preventDefault();
        handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const isFixedIncome = useMemo(() => {
    return (
      market === 'RF' ||
      category.toLowerCase().includes('renda fixa') ||
      category.toLowerCase().includes('cdb') ||
      category.toLowerCase().includes('lci') ||
      category.toLowerCase().includes('lca') ||
      category.toLowerCase().includes('tesouro') ||
      category.toLowerCase().includes('debênture') ||
      category.toLowerCase().includes('cri') ||
      category.toLowerCase().includes('cra') ||
      fixedIncomeIndexation !== ''
    );
  }, [market, category, fixedIncomeIndexation]);

  const assetKind = useMemo(() => {
    return getFixedIncomeKindInfo(name, ticker, category);
  }, [name, ticker, category]);

  const totalCertificatesBalance = useMemo(() => {
    return certificates.reduce((sum, c) => sum + (c.balance || 0), 0);
  }, [certificates]);

  const handleConfirmPrimaryCertificate = () => {
    const cleanCertName = name.trim() || `${ticker.trim() || 'Título'} Principal`;
    let finalBal = 0;
    if (typeof manualPrice === 'number' && manualPrice > 0) {
      finalBal = manualPrice;
    }

    const primaryCert: FixedIncomeCertificate = {
      id: certificates[0]?.id || `cert_main_${initialAsset?.id || Date.now()}`,
      name: cleanCertName,
      ticker: ticker.trim() || undefined,
      institution: institution.trim() || undefined,
      balance: certificates[0]?.balance !== undefined && certificates[0].balance > 0 ? certificates[0].balance : finalBal,
      isNetBalance: fixedIncomeIsNetBalance,
      indexation: (fixedIncomeIndexation || assetKind.defaultIndexation || 'IPCA') as FixedIncomeIndexation,
      ratePercent: fixedIncomeRatePercent === '' ? undefined : Number(fixedIncomeRatePercent),
      startDate: fixedIncomeStartDate || undefined,
      maturityDate: fixedIncomeMaturityDate || undefined,
      quantity: certificates[0]?.quantity,
      unitPrice: certificates[0]?.unitPrice,
      createdAt: certificates[0]?.createdAt || new Date().toISOString(),
    };

    if (certificates.length === 0) {
      setCertificates([primaryCert]);
    } else {
      setCertificates((prev) => [primaryCert, ...prev.slice(1)]);
    }

    setIsPrimarySavedFeedback(true);
    setTimeout(() => setIsPrimarySavedFeedback(false), 3500);
  };

  const handleOpenAddCertificate = () => {
    setCertError(null);
    let currentCerts = [...certificates];

    // Se ainda não houver nenhum certificado na lista, converte o título atualmente preenchido no formulário principal em 1º título
    if (currentCerts.length === 0) {
      const primaryCert: FixedIncomeCertificate = {
        id: `cert_main_${initialAsset?.id || Date.now()}`,
        name: name.trim() || '1º Título (Principal)',
        ticker: ticker.trim() || undefined,
        institution: institution.trim() || undefined,
        balance: typeof manualPrice === 'number' && manualPrice > 0 ? manualPrice : 0,
        isNetBalance: fixedIncomeIsNetBalance,
        indexation: (fixedIncomeIndexation || 'IPCA') as FixedIncomeIndexation,
        ratePercent: fixedIncomeRatePercent === '' ? undefined : Number(fixedIncomeRatePercent),
        startDate: fixedIncomeStartDate || undefined,
        maturityDate: fixedIncomeMaturityDate || undefined,
        createdAt: new Date().toISOString(),
      };
      currentCerts = [primaryCert];
      setCertificates(currentCerts);
    }

    setEditingCertIndex(null);
    setCertName('');
    setCertTicker(ticker.trim());
    setCertInstitution(institution.trim());
    setCertIndexation((fixedIncomeIndexation || currentCerts[0]?.indexation || 'IPCA') as FixedIncomeIndexation);
    setCertRate('');
    setCertStartDate('');
    setCertMaturityDate('');
    setCertBalance('');
    setCertIsNet(fixedIncomeIsNetBalance);

    const looksLikeTitles =
      name.toLowerCase().includes('tesou') ||
      ticker.toLowerCase().includes('ipca') ||
      ticker.toLowerCase().includes('selic') ||
      ticker.toLowerCase().includes('pre');
    setCertCustodyMode(looksLikeTitles ? 'TITLES' : 'BALANCE');
    setCertQuantity('');
    setCertUnitPrice('');
    setIsEditingCertFormOpen(true);
  };

  const handleOpenEditCertificate = (index: number) => {
    const cert = certificates[index];
    if (!cert) return;
    setCertError(null);
    setEditingCertIndex(index);
    setCertName(cert.name || '');
    setCertTicker(cert.ticker || ticker);
    setCertInstitution(cert.institution || '');
    setCertIndexation(cert.indexation || (fixedIncomeIndexation as FixedIncomeIndexation) || 'IPCA');
    setCertRate(cert.ratePercent !== undefined ? cert.ratePercent : '');
    setCertStartDate(cert.startDate || '');
    setCertMaturityDate(cert.maturityDate || '');
    setCertBalance(cert.balance !== undefined ? cert.balance : '');
    setCertIsNet(Boolean(cert.isNetBalance));

    if (cert.quantity !== undefined && cert.quantity > 0 && cert.unitPrice !== undefined && cert.unitPrice > 0) {
      setCertCustodyMode('TITLES');
      setCertQuantity(cert.quantity);
      setCertUnitPrice(cert.unitPrice);
    } else {
      setCertCustodyMode('BALANCE');
      setCertQuantity('');
      setCertUnitPrice('');
    }
    setIsEditingCertFormOpen(true);
  };

  const handleSaveCertificateInline = () => {
    const cleanCertName = certName.trim();
    if (!cleanCertName) {
      setCertError('Informe a identificação ou nome do título.');
      return;
    }

    let finalBal = 0;
    let finalQty: number | undefined = undefined;
    let finalUnitPrice: number | undefined = undefined;

    if (certCustodyMode === 'TITLES') {
      const q = Number(certQuantity);
      const p = Number(certUnitPrice);
      if (isNaN(q) || q <= 0 || isNaN(p) || p <= 0) {
        setCertError('Informe uma quantidade de títulos e um preço unitário (PU) maiores que zero.');
        return;
      }
      finalQty = q;
      finalUnitPrice = p;
      finalBal = Number((q * p).toFixed(2));
    } else {
      const b = Number(certBalance);
      if (isNaN(b) || b < 0) {
        setCertError('Informe um saldo financeiro válido (maior ou igual a zero).');
        return;
      }
      finalBal = b;
    }

    const certToSave: FixedIncomeCertificate = {
      id:
        editingCertIndex !== null && certificates[editingCertIndex]
          ? certificates[editingCertIndex].id
          : `cert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: cleanCertName,
      ticker: certTicker.trim() || undefined,
      institution: certInstitution.trim() || undefined,
      balance: finalBal,
      isNetBalance: certIsNet,
      indexation: certIndexation ? (certIndexation as FixedIncomeIndexation) : undefined,
      ratePercent: certRate !== '' ? Number(certRate) : undefined,
      startDate: certStartDate || undefined,
      maturityDate: certMaturityDate || undefined,
      quantity: finalQty,
      unitPrice: finalUnitPrice,
      createdAt:
        editingCertIndex !== null && certificates[editingCertIndex]?.createdAt
          ? certificates[editingCertIndex].createdAt
          : new Date().toISOString(),
    };

    let nextCerts: FixedIncomeCertificate[];
    if (editingCertIndex !== null) {
      nextCerts = certificates.map((c, i) => (i === editingCertIndex ? certToSave : c));
      // Se for a edição do 1º título, sincroniza com os campos do cabeçalho do formulário
      if (editingCertIndex === 0) {
        if (certToSave.indexation) setFixedIncomeIndexation(certToSave.indexation);
        if (certToSave.ratePercent !== undefined) setFixedIncomeRatePercent(certToSave.ratePercent);
        if (certToSave.startDate) setFixedIncomeStartDate(certToSave.startDate);
        if (certToSave.maturityDate) setFixedIncomeMaturityDate(certToSave.maturityDate);
        if (certToSave.institution) setInstitution(certToSave.institution);
        setFixedIncomeIsNetBalance(Boolean(certToSave.isNetBalance));
      }
    } else {
      nextCerts = [...certificates, certToSave];
    }

    setCertificates(nextCerts);
    setIsEditingCertFormOpen(false);
    setEditingCertIndex(null);
    setCertError(null);
  };

  const handleRemoveCertificate = (index: number) => {
    const nextCerts = certificates.filter((_, i) => i !== index);
    setCertificates(nextCerts);
    if (editingCertIndex === index) {
      setIsEditingCertFormOpen(false);
      setEditingCertIndex(null);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = ticker.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanTicker) {
      setErrorMsg('O código do ativo (ticker) é obrigatório.');
      return;
    }
    if (!cleanName) {
      setErrorMsg('O nome do ativo é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const now = new Date().toISOString();
      const assetToSave: PortfolioAsset = {
        ...(initialAsset || {}),
        id: initialAsset?.id || `asset_${Date.now()}_${cleanTicker}`,
        userId,
        ticker: cleanTicker,
        name: cleanName,
        category,
        currency,
        market,
        targetPercentage: targetPercentage === '' ? 0 : Number(targetPercentage),
        isBalanceOnly,
        manualPrice: manualPrice === '' ? null : Number(manualPrice),
        createdAt: initialAsset?.createdAt || now,
        updatedAt: now,
      };

      if (institution.trim()) {
        assetToSave.institution = institution.trim();
      } else {
        delete assetToSave.institution;
      }

      if (manualPrice !== '') {
        assetToSave.manualPriceUpdatedAt = now;
      } else {
        delete assetToSave.manualPriceUpdatedAt;
      }

      if (fixedIncomeIndexation !== '') {
        assetToSave.fixedIncomeIndexation = fixedIncomeIndexation;
      } else {
        delete assetToSave.fixedIncomeIndexation;
      }

      if (fixedIncomeRatePercent !== '') {
        assetToSave.fixedIncomeRatePercent = Number(fixedIncomeRatePercent);
      } else {
        delete assetToSave.fixedIncomeRatePercent;
      }

      if (fixedIncomeStartDate.trim()) {
        assetToSave.fixedIncomeStartDate = fixedIncomeStartDate.trim();
      } else {
        delete assetToSave.fixedIncomeStartDate;
      }

      if (fixedIncomeMaturityDate.trim()) {
        assetToSave.fixedIncomeMaturityDate = fixedIncomeMaturityDate.trim();
      } else {
        delete assetToSave.fixedIncomeMaturityDate;
      }

      if (notes.trim()) {
        assetToSave.notes = notes.trim();
      } else {
        delete assetToSave.notes;
      }

      if (fixedIncomeIsNetBalance !== undefined) {
        assetToSave.fixedIncomeIsNetBalance = fixedIncomeIsNetBalance;
      }

      // Sincronização soberana de múltiplos títulos vinculados sob a mesma meta
      if (isFixedIncome && certificates.length > 0) {
        assetToSave.fixedIncomeCertificates = certificates;
        const first = certificates[0];
        if (first) {
          if (first.indexation) assetToSave.fixedIncomeIndexation = first.indexation;
          if (first.ratePercent !== undefined) assetToSave.fixedIncomeRatePercent = first.ratePercent;
          if (first.startDate) assetToSave.fixedIncomeStartDate = first.startDate;
          if (first.maturityDate) assetToSave.fixedIncomeMaturityDate = first.maturityDate;
          if (first.institution) assetToSave.institution = first.institution;
          if (first.isNetBalance !== undefined) assetToSave.fixedIncomeIsNetBalance = first.isNetBalance;
        }
      } else {
        delete assetToSave.fixedIncomeCertificates;
      }

      await onSave(assetToSave);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao salvar ativo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="asset-modal"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">
              {initialAsset ? 'Editar Ativo de Custódia' : 'Cadastrar Novo Ativo'}
            </h3>
            <p className="text-xs text-slate-300 dark:text-slate-400">
              Cadastre o ativo e sua meta. Digite o ticker para autocompletar os dados oficiais
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Ticker com Autocomplete Inteligente */}
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Código / Ticker *
              </label>
              <div className="relative">
                <input
                  ref={tickerInputRef}
                  type="text"
                  required
                  placeholder="Ex: PETR4, KNCR11"
                  value={ticker}
                  onChange={(e) => {
                    setTicker(e.target.value.toUpperCase());
                    setShowSuggestions(true);
                    setActiveSuggestionIndex(-1);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    blurTimeoutRef.current = setTimeout(() => {
                      setShowSuggestions(false);
                    }, 200);
                  }}
                  onKeyDown={handleKeyDownTicker}
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  autoComplete="off"
                />
              </div>

              {/* Dropdown de Sugestões */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  role="listbox"
                  aria-label="Sugestões de Ativos"
                  data-testid="ticker-autocomplete-dropdown"
                  className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-xl divide-y divide-slate-100 dark:divide-slate-700"
                >
                  {suggestions.map((item, index) => {
                    const isActive = index === activeSuggestionIndex;
                    return (
                      <button
                        key={item.ticker}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        data-testid={`suggestion-${item.ticker}`}
                        onMouseDown={(e) => {
                          e.preventDefault(); // Impede o blur prematuro
                          handleSelectSuggestion(item);
                        }}
                        className={`w-full text-left p-2.5 flex items-center justify-between text-xs transition-colors ${
                          isActive
                            ? 'bg-slate-100 dark:bg-slate-700/80 text-slate-950 dark:text-white'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-950 dark:text-white">
                              {item.ticker}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 uppercase">
                              {item.market}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {item.name}
                          </div>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                          {item.category}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="asset-category-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Classe / Categoria *
              </label>
              <select
                id="asset-category-select"
                aria-label="Classe / Categoria"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white dark:bg-slate-800 text-slate-950 dark:text-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
                {!classes.some((c) => c.name === category) && category && (
                  <option value={category}>{category}</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Nome do Ativo / Razão Social *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Petrobras PN, Tesouro Selic 2029"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* Campo de Instituição / Corretora Custodiante */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                Instituição / Corretora Custodiante (Opcional)
              </label>
            </div>
            {/* Chips Rápidos */}
            <div className="flex flex-wrap gap-1.5" data-testid="broker-chips-container">
              {QUICK_BROKERS.map((b) => {
                const isSelected = institution.toLowerCase() === b.toLowerCase();
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setInstitution(isSelected ? '' : b)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Ex: XP Investimentos, BTG Pactual, Inter, Avenue"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Moeda
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white dark:bg-slate-800 text-slate-950 dark:text-white"
              >
                <option value="BRL">BRL (Real Brasileiro)</option>
                <option value="USD">USD (Dólar Americano)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Mercado
              </label>
              <select
                value={market}
                onChange={(e) => setMarket(e.target.value as QuoteMarket)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white dark:bg-slate-800 text-slate-950 dark:text-white"
              >
                <option value="B3">B3 (Brasil)</option>
                <option value="RF">Renda Fixa / Títulos</option>
                <option value="US">Mercado Americano (EUA)</option>
                <option value="CRYPTO">Criptoativos</option>
                <option value="MANUAL">Manual / Outros</option>
              </select>
            </div>
          </div>

          {/* Opção Cotas vs Apenas Saldo */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isBalanceOnly}
                onChange={(e) => setIsBalanceOnly(e.target.checked)}
                className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
              />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Ativo cadastrado puramente por Saldo Financeiro
              </span>
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" />
              Marque esta opção para aplicações como Caixa, CDBs diários ou poupança onde você controla apenas o valor em reais, sem quantidade de cotas.
            </p>
          </div>

          {/* Seção Inteligente de Renda Fixa (Marcação na Curva Automática) */}
          {(market === 'RF' ||
            category.toLowerCase().includes('renda fixa') ||
            category.toLowerCase().includes('cdb') ||
            category.toLowerCase().includes('lci') ||
            category.toLowerCase().includes('lca') ||
            category.toLowerCase().includes('tesouro') ||
            category.toLowerCase().includes('debênture') ||
            category.toLowerCase().includes('cri') ||
            category.toLowerCase().includes('cra') ||
            fixedIncomeIndexation !== '') && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3" data-testid="rf-parameters-section">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  Marcação na Curva (Anbima 252 d.u.)
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  Automático
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Configure os parâmetros para atualização diária do valor bruto e rendimento sem depender de cotação externa.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Indexador
                  </label>
                  <select
                    value={fixedIncomeIndexation}
                    onChange={(e) => setFixedIncomeIndexation(e.target.value as FixedIncomeIndexation | '')}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-950 dark:text-white focus:ring-2 focus:ring-slate-900 focus:outline-none font-medium"
                  >
                    <option value="">Não Aplicável</option>
                    <option value="CDI">% do CDI</option>
                    <option value="PRE">Prefixado (% a.a.)</option>
                    <option value="IPCA">IPCA + Spread (% a.a.)</option>
                    <option value="SELIC">% da Taxa Selic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Taxa Contratada (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 110 (% CDI) ou 12.5 (% a.a.)"
                    value={fixedIncomeRatePercent}
                    onChange={(e) => setFixedIncomeRatePercent(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Data de Aplicação
                  </label>
                  <input
                    type="date"
                    value={fixedIncomeStartDate}
                    onChange={(e) => setFixedIncomeStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={fixedIncomeMaturityDate}
                    onChange={(e) => setFixedIncomeMaturityDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Tipo de Saldo:</span>
                  <button
                    type="button"
                    data-testid="asset-modal-btn-gross"
                    onClick={() => setFixedIncomeIsNetBalance(false)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      !fixedIncomeIsNetBalance
                        ? 'bg-slate-900 dark:bg-slate-800 text-white dark:text-emerald-400 border-slate-900'
                        : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Saldo Bruto
                  </button>
                  <button
                    type="button"
                    data-testid="asset-modal-btn-net"
                    onClick={() => setFixedIncomeIsNetBalance(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                      fixedIncomeIsNetBalance
                        ? 'bg-slate-900 dark:bg-slate-800 text-white dark:text-emerald-400 border-slate-900'
                        : 'bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Saldo Líquido (pós-IR)
                  </button>
                </div>

                {/* Botão de Salvar/Confirmar Título Solicitado pelo Investidor */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-testid="btn-confirm-primary-cert"
                    onClick={handleConfirmPrimaryCertificate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Salvar Dados deste Título</span>
                  </button>
                  {isPrimarySavedFeedback && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in flex items-center gap-1">
                      ✓ Salvo na meta!
                    </span>
                  )}
                </div>
              </div>

              {/* Gerenciador Soberano de Múltiplos Títulos e Vencimentos sob a Mesma Meta */}
              <div
                className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3 shadow-xs"
                data-testid="asset-modal-certificates-section"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Composição de Títulos / Vencimentos
                    </span>
                  </div>
                  {certificates.length > 0 && (
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                      Meta Única: {targetPercentage || 0}%
                    </span>
                  )}
                </div>

                {/* Se ainda não há certificados desmembrados */}
                {certificates.length === 0 && !isEditingCertFormOpen && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        Deseja agrupar outros vencimentos ou taxas sob esta meta?
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        Exemplo: Se você rebalancear e comprar outro vencimento de {assetKind.singular}, ele somará na meta de {targetPercentage || 0}% sem fragmentar sua carteira.
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="btn-add-certificate"
                      onClick={handleOpenAddCertificate}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{assetKind.addAnotherButton}</span>
                    </button>
                  </div>
                )}

                {/* Lista de Certificados Cadastrados */}
                {certificates.length > 0 && (
                  <div className="space-y-2">
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                      {certificates.map((cert, cIdx) => (
                        <div
                          key={cert.id}
                          data-testid={`certificate-item-${cIdx}`}
                          className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 uppercase">
                                {cIdx === 0 ? '1º Título (Principal)' : `${cIdx + 1}º Título`}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {cert.name}
                              </span>
                              {cert.ticker && (
                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                  ({cert.ticker})
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                              <span>🏦 {cert.institution || '—'}</span>
                              <span>•</span>
                              <span>📈 {cert.indexation || 'CDI'} {cert.ratePercent !== undefined ? `${cert.ratePercent}%` : ''}</span>
                              {cert.startDate && (
                                <>
                                  <span>•</span>
                                  <span>Apl: {formatDateBR(cert.startDate)}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>Venc: {cert.maturityDate ? formatDateBR(cert.maturityDate) : '—'}</span>
                              {cert.quantity !== undefined && cert.quantity > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                    Qtd: {cert.quantity} {cert.unitPrice ? `(PU: ${formatCurrencyBRL(cert.unitPrice)})` : ''}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60 dark:border-slate-700/60">
                            <div className="text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatCurrencyBRL(cert.balance)}
                              <span className="text-[9px] ml-1 text-slate-400 font-normal">
                                ({cert.isNetBalance ? 'Líq' : 'Bruto'})
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                data-testid={`btn-edit-cert-${cIdx}`}
                                onClick={() => handleOpenEditCertificate(cIdx)}
                                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                title="Editar dados deste título"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                data-testid={`btn-delete-cert-${cIdx}`}
                                onClick={() => handleRemoveCertificate(cIdx)}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                title="Remover título desta meta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Total da Meta: <span className="font-bold text-slate-950 dark:text-white font-mono">{formatCurrencyBRL(totalCertificatesBalance)}</span>
                      </div>
                      {!isEditingCertFormOpen && (
                        <button
                          type="button"
                          data-testid="btn-add-certificate"
                          onClick={handleOpenAddCertificate}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{assetKind.addAnotherButton}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Formulário Inline de Inclusão / Edição de Título */}
                {isEditingCertFormOpen && (
                  <div
                    data-testid="form-inline-certificate"
                    className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-200 dark:border-emerald-800/80 rounded-xl space-y-3 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        {editingCertIndex !== null
                          ? `Editar ${editingCertIndex === 0 ? '1º Título (Principal)' : `${editingCertIndex + 1}º Título`}`
                          : 'Novo Título / Vencimento sob esta Meta'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingCertFormOpen(false);
                          setEditingCertIndex(null);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/40 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {certError && (
                      <div className="p-2 bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-lg font-medium">
                        {certError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Nome do Título *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: TESOURO IPCA+ 2050, CDB Inter 115%"
                          value={certName}
                          onChange={(e) => setCertName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Código / Ticker (Opcional)
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: IPCA2050"
                          value={certTicker}
                          onChange={(e) => setCertTicker(e.target.value.toUpperCase())}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Instituição com Chips Rápidos */}
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                        Instituição / Corretora Custodiante
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {QUICK_BROKERS.map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setCertInstitution(certInstitution.toLowerCase() === b.toLowerCase() ? '' : b)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${
                              certInstitution.toLowerCase() === b.toLowerCase()
                                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Ex: Inter, XP, BTG Pactual"
                        value={certInstitution}
                        onChange={(e) => setCertInstitution(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Indexador
                        </label>
                        <select
                          value={certIndexation}
                          onChange={(e) => setCertIndexation(e.target.value as FixedIncomeIndexation | '')}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        >
                          <option value="IPCA">IPCA + Spread (% a.a.)</option>
                          <option value="CDI">% do CDI</option>
                          <option value="PRE">Prefixado (% a.a.)</option>
                          <option value="SELIC">% da Taxa Selic</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Taxa Contratada (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 6.50 ou 110"
                          value={certRate}
                          onChange={(e) => setCertRate(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Data de Aplicação
                        </label>
                        <input
                          type="date"
                          value={certStartDate}
                          onChange={(e) => setCertStartDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                          Data de Vencimento
                        </label>
                        <input
                          type="date"
                          value={certMaturityDate}
                          onChange={(e) => setCertMaturityDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Modo de Custódia: Títulos (Qtd / PU) vs Saldo Total (R$) */}
                    <div className="space-y-1.5 pt-1 border-t border-emerald-200/80 dark:border-emerald-800/60">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                          Modo de Lançamento
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            data-testid="btn-cert-mode-titles"
                            onClick={() => setCertCustodyMode('TITLES')}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                              certCustodyMode === 'TITLES'
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            Títulos (Qtd / PU)
                          </button>
                          <button
                            type="button"
                            data-testid="btn-cert-mode-balance"
                            onClick={() => setCertCustodyMode('BALANCE')}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-colors ${
                              certCustodyMode === 'BALANCE'
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            Saldo Total (R$)
                          </button>
                        </div>
                      </div>

                      {certCustodyMode === 'TITLES' ? (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                Quantidade de Títulos
                              </label>
                              <input
                                type="number"
                                step="any"
                                placeholder="Ex: 0.15 ou 2.0"
                                value={certQuantity}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Number(e.target.value);
                                  setCertQuantity(val);
                                  if (val !== '' && certUnitPrice !== '') {
                                    setCertBalance(Number((Number(val) * Number(certUnitPrice)).toFixed(2)));
                                  }
                                }}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                                Preço Unitário (PU R$)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Ex: 4250.00"
                                value={certUnitPrice}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? '' : Number(e.target.value);
                                  setCertUnitPrice(val);
                                  if (val !== '' && certQuantity !== '') {
                                    setCertBalance(Number((Number(certQuantity) * Number(val)).toFixed(2)));
                                  }
                                }}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                              />
                            </div>
                          </div>
                          {certQuantity !== '' && certUnitPrice !== '' && (
                            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                              Total Financeiro: {formatCurrencyBRL(Number(certQuantity) * Number(certUnitPrice))}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                            Saldo em Reais (R$) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Ex: 5000.00"
                            value={certBalance}
                            onChange={(e) => setCertBalance(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-lg focus:ring-2 focus:ring-emerald-600 focus:outline-none font-bold"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Tipo:</span>
                        <button
                          type="button"
                          onClick={() => setCertIsNet(false)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            !certIsNet
                              ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          Saldo Bruto
                        </button>
                        <button
                          type="button"
                          onClick={() => setCertIsNet(true)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            certIsNet
                              ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          Saldo Líquido
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200/80 dark:border-emerald-800/60">
                      <button
                        type="button"
                        data-testid="btn-cancel-certificate"
                        onClick={() => {
                          setIsEditingCertFormOpen(false);
                          setEditingCertIndex(null);
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-emerald-100/40"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        data-testid="btn-save-certificate"
                        onClick={handleSaveCertificateInline}
                        className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar Título</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meta Alocativa na Carteira (%) - Imediatamente abaixo da Composição de Vencimentos */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-2" data-testid="asset-target-section">
            <div className="flex items-center justify-between">
              <label htmlFor="asset-target-input" className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Meta na Carteira (%)
              </label>
              {targetPercentage !== '' && Number(targetPercentage) > 0 && (
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  {targetPercentage}% do Patrimônio
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                id="asset-target-input"
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="Ex: 10.0"
                value={targetPercentage}
                onChange={(e) => setTargetPercentage(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-32 px-3 py-2 text-sm font-bold font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
              <span className="text-xs font-bold text-slate-500">%</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-2">
                {isFixedIncome && certificates.length > 0
                  ? 'Meta única compartilhada aplicada ao conjunto de vencimentos deste ativo'
                  : 'Usado pelo Nexus no simulador de rebalanceamento'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Cotação Atual Manual (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Opcional se houver cotação"
                value={manualPrice}
                onChange={(e) => setManualPrice(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Observações (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Anotações sobre tese de investimento, características, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl shadow transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? 'Salvando...' : initialAsset ? 'Atualizar Ativo' : 'Cadastrar Ativo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
