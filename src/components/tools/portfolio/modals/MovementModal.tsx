import React, { useState, useEffect, useMemo } from 'react';
import { X, ArrowRightLeft, Check } from 'lucide-react';
import type {
  PortfolioAsset,
  PortfolioMovement,
  MovementType,
  FundingSource,
  SettlementTarget,
  FxRateSource,
} from '../../../../core/portfolio/portfolioTypes';

interface MovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (movement: PortfolioMovement) => Promise<void>;
  assets: PortfolioAsset[];
  positions?: import('../../../../core/portfolio/portfolioTypes').DerivedAssetPosition[];
  userId: string;
  defaultAssetId?: string;
}

export const MovementModal: React.FC<MovementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  assets,
  positions,
  userId,
  defaultAssetId,
}) => {
  const [assetId, setAssetId] = useState(defaultAssetId || assets[0]?.id || '');
  const [cashAssetId, setCashAssetId] = useState<string>('');
  const [type, setType] = useState<MovementType>('BUY');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [fees, setFees] = useState<number | ''>(0);
  const [grossAmount, setGrossAmount] = useState<number | ''>('');
  const [fxRateToBRL, setFxRateToBRL] = useState<number>(1.0);
  const [fundingSource, setFundingSource] = useState<FundingSource>('EXTERNAL_NEW_MONEY');
  const [settlementTarget, setSettlementTarget] = useState<SettlementTarget>('PORTFOLIO_CASH');
  const [hasKnownCost, setHasKnownCost] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedAsset = assets.find((a) => a.id === assetId);
  const isBalanceOnly = Boolean(selectedAsset?.isBalanceOnly);

  useEffect(() => {
    if (defaultAssetId) setAssetId(defaultAssetId);
    else if (!assetId && assets.length > 0) setAssetId(assets[0].id);
  }, [defaultAssetId, assets, assetId]);

  useEffect(() => {
    if (selectedAsset) {
      setFxRateToBRL(selectedAsset.currency === 'BRL' ? 1.0 : 5.5);
    }
  }, [selectedAsset]);

  // Recálculo automático de grossAmount quando quantidade ou unitPrice mudam
  useEffect(() => {
    if (!isBalanceOnly && quantity !== '' && unitPrice !== '') {
      const q = Number(quantity);
      const p = Number(unitPrice);
      if (!isNaN(q) && !isNaN(p)) {
        setGrossAmount(Number((q * p).toFixed(2)));
      }
    }
  }, [quantity, unitPrice, isBalanceOnly]);

  // Contas de Caixa disponíveis na carteira
  const cashAssets = useMemo(() => {
    return assets.filter(
      (a) =>
        a.isOpportunityCash ||
        a.category === 'Caixa de Oportunidade' ||
        a.category === 'Caixa' ||
        a.market === 'CASH'
    );
  }, [assets]);

  const effectiveCashAssetId = cashAssetId || cashAssets[0]?.id;
  const selectedCashPos = useMemo(() => {
    return positions?.find((p) => p.assetId === effectiveCashAssetId);
  }, [positions, effectiveCashAssetId]);

  const availableCash = selectedCashPos?.currentValueBRL ?? 0;

  // Cálculos reativos de valores bruto e líquido
  const computedGrossAmount = useMemo(() => {
    if (grossAmount !== '') return Number(grossAmount);
    if (!isBalanceOnly && quantity !== '' && unitPrice !== '') {
      return Number(quantity) * Number(unitPrice);
    }
    return 0;
  }, [grossAmount, isBalanceOnly, quantity, unitPrice]);

  const computedFees = useMemo(() => (fees === '' ? 0 : Number(fees)), [fees]);

  const computedNetAmount = useMemo(() => {
    if (type === 'BUY' || type === 'FEE_OR_TAX') {
      return computedGrossAmount + computedFees;
    }
    if (type === 'SELL' || type === 'DIVIDEND' || type === 'INTEREST') {
      return Math.max(0, computedGrossAmount - computedFees);
    }
    return computedGrossAmount;
  }, [type, computedGrossAmount, computedFees]);

  const computedNetAmountBRL = useMemo(() => {
    return Number((computedNetAmount * fxRateToBRL).toFixed(2));
  }, [computedNetAmount, fxRateToBRL]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) {
      setErrorMsg('Selecione um ativo para a movimentação.');
      return;
    }
    if (!date) {
      setErrorMsg('A data da movimentação é obrigatória.');
      return;
    }

    const numQty = isBalanceOnly ? null : quantity === '' ? null : Number(quantity);
    const numPrice = isBalanceOnly ? 0 : unitPrice === '' ? 0 : Number(unitPrice);
    const numFees = computedFees;
    const numGross = computedGrossAmount;
    const netAmount = computedNetAmount;
    const netAmountBRL = computedNetAmountBRL;

    if (numGross < 0 || numFees < 0) {
      setErrorMsg('Valores e taxas não podem ser negativos.');
      return;
    }

    if ((type === 'BUY' || type === 'FEE_OR_TAX') && fundingSource === 'PORTFOLIO_CASH') {
      if (cashAssets.length > 1 && !cashAssetId) {
        setErrorMsg('Existem múltiplos caixas cadastrados. Selecione explicitamente qual conta de caixa deseja utilizar.');
        return;
      }
      if (netAmountBRL > availableCash) {
        setErrorMsg(
          `Saldo insuficiente no caixa. Saldo disponível: R$ ${availableCash.toFixed(2)}. Valor necessário: R$ ${netAmountBRL.toFixed(2)}.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const now = new Date().toISOString();
      const movement: PortfolioMovement = {
        id: `mov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        assetId,
        type,
        date,
        quantity: numQty,
        hasKnownQuantity: !isBalanceOnly && numQty !== null,
        unitPrice: numPrice,
        fees: numFees,
        grossAmount: numGross,
        netAmount,
        currency: selectedAsset?.currency || 'BRL',
        fxRateToBRL,
        fxSource: (fxRateToBRL === 1.0 ? 'FIXED_ONE' : 'COMMERCIAL_AWESOMEAPI') as FxRateSource,
        netAmountBRL,
        hasKnownCost: type === 'INITIAL_POSITION' ? hasKnownCost : true,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };

      if ((fundingSource === 'PORTFOLIO_CASH' || settlementTarget === 'PORTFOLIO_CASH') && effectiveCashAssetId) {
        movement.cashAssetId = effectiveCashAssetId;
      }
      if (type === 'BUY' || type === 'FEE_OR_TAX') {
        if (fundingSource) movement.fundingSource = fundingSource;
      }
      if (type === 'SELL' || type === 'DIVIDEND' || type === 'INTEREST') {
        if (settlementTarget) movement.settlementTarget = settlementTarget;
      }
      if (notes.trim()) {
        movement.notes = notes.trim();
      }

      await onSave(movement);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao salvar movimentação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold">Novo Lançamento na Carteira</h3>
              <p className="text-xs text-slate-300 dark:text-slate-400">Registre aportes, compras, proventos ou resgates</p>
            </div>
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
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Ativo Alvo *
              </label>
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-bold border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white dark:bg-slate-800 text-slate-950 dark:text-white"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.ticker} - {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Tipo de Operação *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MovementType)}
                className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none bg-white dark:bg-slate-800 text-slate-950 dark:text-white"
              >
                <option value="BUY">🟢 Compra / Aporte</option>
                <option value="SELL">🔴 Venda / Resgate</option>
                <option value="INITIAL_POSITION">📋 Posição Inicial</option>
                <option value="DIVIDEND">💰 Dividendo / Provento</option>
                <option value="INTEREST">📈 Juros / Rendimento</option>
                <option value="ADJUSTMENT">⚙️ Ajuste de Custódia</option>
                <option value="SPLIT_OR_BONUS">🔀 Desdobramento</option>
                <option value="FEE_OR_TAX">🧾 Taxa / Emolumento</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Data do Evento *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            {selectedAsset?.currency !== 'BRL' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Câmbio (USD/EUR → BRL)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={fxRateToBRL}
                  onChange={(e) => setFxRateToBRL(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Seção de Quantidade e Preço (apenas se não for balance-only) */}
          {!isBalanceOnly && type !== 'DIVIDEND' && type !== 'INTEREST' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Quantidade (Cotas/Ações) *
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="Ex: 100"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Preço Unitário ({selectedAsset?.currency || 'R$'}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="Ex: 35.50"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>
          ) : null}

          {/* Valores Bruto e Taxas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                {isBalanceOnly || type === 'DIVIDEND' || type === 'INTEREST'
                  ? 'Valor Total / Provento (R$) *'
                  : 'Valor Bruto (R$)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="Ex: 3550.00"
                value={grossAmount}
                onChange={(e) => setGrossAmount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-bold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Taxas / Emolumentos / IR (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fees}
                onChange={(e) => setFees(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Origem e Destino do Fluxo Financeiro (Governança Soberana) */}
          {type === 'BUY' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
              <label htmlFor="funding-source-select" className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Origem dos Recursos
              </label>
              <select
                id="funding-source-select"
                value={fundingSource}
                onChange={(e) => setFundingSource(e.target.value as FundingSource)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white dark:bg-slate-800 text-slate-950 dark:text-white"
              >
                <option value="EXTERNAL_NEW_MONEY">
                  💵 Recurso Novo Externo (Salário/Conta Pessoal - Aporte)
                </option>
                <option value="PORTFOLIO_CASH">
                  🏦 Caixa de Oportunidade da Carteira (Reinvestimento)
                </option>
              </select>

              {fundingSource === 'PORTFOLIO_CASH' && (
                <div className="mt-2 space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  {cashAssets.length > 1 && (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                        Conta de Caixa *
                      </label>
                      <select
                        value={cashAssetId || cashAssets[0]?.id}
                        onChange={(e) => setCashAssetId(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white dark:bg-slate-800 text-slate-950 dark:text-white"
                      >
                        {cashAssets.map((ca) => {
                          const pos = positions?.find((p) => p.assetId === ca.id);
                          const bal = pos?.currentValueBRL ?? 0;
                          return (
                            <option key={ca.id} value={ca.id}>
                              {ca.name} ({ca.ticker}) — Saldo: R$ {bal.toFixed(2)}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    <span className="font-medium">Saldo disponível em caixa:</span>
                    <span className="font-bold">R$ {availableCash.toFixed(2)}</span>
                  </div>

                  {computedNetAmountBRL > availableCash && (
                    <div className="text-xs p-2 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 font-bold">
                      Saldo insuficiente no caixa para cobrir o valor de R$ {computedNetAmountBRL.toFixed(2)}.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(type === 'SELL' || type === 'DIVIDEND' || type === 'INTEREST') && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Destino dos Recursos
              </label>
              <select
                value={settlementTarget}
                onChange={(e) => setSettlementTarget(e.target.value as SettlementTarget)}
                className="w-full px-3 py-2 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white dark:bg-slate-800 text-slate-950 dark:text-white"
              >
                <option value="PORTFOLIO_CASH">
                  🏦 Caixa de Oportunidade da Carteira (Manter disponível)
                </option>
                <option value="EXTERNAL_OUTSIDE">
                  📤 Retirada Externa (Saque pessoal / Usufruto)
                </option>
              </select>
            </div>
          )}

          {/* Posição Inicial: Opção de Preço Médio Desconhecido */}
          {type === 'INITIAL_POSITION' && !isBalanceOnly && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!hasKnownCost}
                  onChange={(e) => setHasKnownCost(!e.target.checked)}
                  className="w-4 h-4 rounded text-amber-900 focus:ring-amber-900"
                />
                <span className="text-xs font-bold text-amber-950 dark:text-amber-200">
                  Preço Médio histórico desconhecido
                </span>
              </label>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Se você não souber o custo exato de aquisição, a rentabilidade não realizada exibirá
                "Desconhecido" sem inventar números fictícios.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Observações / Notas (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Corretora Rico, nota de corretagem nº 1234"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-950 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
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
              {isSubmitting ? 'Registrando...' : 'Registrar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
