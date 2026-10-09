import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Info,
  Sparkles,
} from 'lucide-react';
import type {
  PortfolioAsset,
  PortfolioMovement,
  PortfolioAssetClass,
} from '../../../../core/portfolio/portfolioTypes';
import {
  parseCsvString,
  parseXlsxArrayBuffer,
  generateImportPreview,
  autoDetectMapping,
  applyImportPreset,
  detectMatchingPreset,
  IMPORT_PRESETS,
  type ImportPresetId,
  type ColumnMapping,
  type ImportMode,
  type ImportPreviewResult,
} from '../../../../core/portfolio/spreadsheetImporter';
import { formatCurrencyBRL } from '../portfolioViewUtils';

interface ImportSpreadsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (newAssets: PortfolioAsset[], newMovements: PortfolioMovement[]) => Promise<void>;
  existingAssets: PortfolioAsset[];
  classes: PortfolioAssetClass[];
  userId: string;
  onOpenCalibration?: () => void;
}

export const ImportSpreadsheetModal: React.FC<ImportSpreadsheetModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
  existingAssets,
  classes,
  userId,
  onOpenCalibration,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('INITIAL_POSITIONS');
  const [selectedPreset, setSelectedPreset] = useState<ImportPresetId>('AUTO');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [availableSheets, setAvailableSheets] = useState<Array<{ name: string; sheetId: string; index: number }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createMissingAssets, setCreateMissingAssets] = useState(true);
  const [confirmedWarnings, setConfirmedWarnings] = useState(false);
  const [importResult, setImportResult] = useState<{
    newAssetsCreated: number;
    positionsCreated: number;
    totalFinancialValueBRL: number;
    rejectedCount: number;
    uncalibratedCount?: number;
  } | null>(null);

  const modalCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (modalCardRef.current) {
        const focusable = modalCardRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        }
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setErrorMsg(null);
    setPreview(null);
    setImportResult(null);

    try {
      let headers: string[] = [];
      let rows: string[][] = [];
      let sheets: Array<{ name: string; sheetId: string; index: number }> = [];

      if (selectedFile.name.toLowerCase().endsWith('.xlsx')) {
        const buffer = await selectedFile.arrayBuffer();
        const res = await parseXlsxArrayBuffer(buffer);
        sheets = res.availableSheets;
        setAvailableSheets(sheets);

        if (res.requiresSheetSelection) {
          setErrorMsg(
            `O arquivo contém ${sheets.length} abas. Selecione a aba desejada abaixo.`
          );
          setRawHeaders([]);
          setRawRows([]);
          return;
        }

        setSelectedSheet(res.sheetName);
        headers = res.rows[0] || [];
        rows = res.rows.slice(1);
      } else {
        // CSV
        const text = await selectedFile.text();
        const allRows = parseCsvString(text);
        headers = allRows[0] || [];
        rows = allRows.slice(1);
        setAvailableSheets([]);
      }

      setRawHeaders(headers);
      setRawRows(rows);

      const detectedPreset = detectMatchingPreset(headers);
      setSelectedPreset(detectedPreset);
      const defaultMap = applyImportPreset(detectedPreset, headers);
      setMapping(defaultMap);

      const matchedPresetObj = IMPORT_PRESETS.find((p) => p.id === detectedPreset);
      const effectiveMode = matchedPresetObj && matchedPresetObj.id !== 'AUTO' ? matchedPresetObj.defaultMode : importMode;
      if (effectiveMode !== importMode) {
        setImportMode(effectiveMode);
      }

      const prev = generateImportPreview({
        fileName: selectedFile.name,
        rawHeaders: headers,
        rawRows: rows,
        mapping: defaultMap,
        mode: effectiveMode,
      });

      setPreview(prev);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao processar arquivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectPreset = (presetId: ImportPresetId) => {
    setSelectedPreset(presetId);
    const preset = IMPORT_PRESETS.find((p) => p.id === presetId);
    const targetMode = preset?.defaultMode || importMode;
    if (targetMode !== importMode) {
      setImportMode(targetMode);
    }

    if (rawHeaders.length > 0) {
      const updated = applyImportPreset(presetId, rawHeaders);
      setMapping(updated);
      setConfirmedWarnings(false);

      if (file) {
        const prev = generateImportPreview({
          fileName: file.name,
          rawHeaders,
          rawRows,
          mapping: updated,
          mode: targetMode,
          sheetName: selectedSheet,
        });
        setPreview(prev);
      }
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    if (!file) return;
    setSelectedSheet(sheetName);
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const buffer = await file.arrayBuffer();
      const res = await parseXlsxArrayBuffer(buffer, { selectedSheetName: sheetName });
      const headers = res.rows[0] || [];
      const rows = res.rows.slice(1);

      setRawHeaders(headers);
      setRawRows(rows);

      const defaultMap = autoDetectMapping(headers);
      setMapping(defaultMap);

      const prev = generateImportPreview({
        fileName: file.name,
        rawHeaders: headers,
        rawRows: rows,
        mapping: defaultMap,
        mode: importMode,
        sheetName,
      });

      setPreview(prev);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao ler aba do arquivo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateMapping = (key: keyof ColumnMapping, value: string) => {
    const updated = { ...mapping, [key]: value || undefined };
    setMapping(updated);

    if (file && rawHeaders.length > 0) {
      setConfirmedWarnings(false);
      const prev = generateImportPreview({
        fileName: file.name,
        rawHeaders,
        rawRows,
        mapping: updated,
        mode: importMode,
        sheetName: selectedSheet,
      });
      setPreview(prev);
    }
  };

  const previewStats = React.useMemo(() => {
    if (!preview) return null;
    const errorCount = preview.summary.errorCount;
    const warningCount = preview.summary.warningCount + preview.summary.duplicateCount;
    const validCount = preview.summary.validCount;

    const validRows = preview.previewRows.filter((r) => r.status !== 'ERROR');

    const uniqueTickers = new Set(
      validRows
        .map((r) => (r.interpreted.ticker || '').trim().toUpperCase())
        .filter(Boolean)
    );
    const existingTickerSet = new Set(existingAssets.map((a) => a.ticker.toUpperCase()));
    let newAssetsCount = 0;
    uniqueTickers.forEach((t) => {
      if (!existingTickerSet.has(t)) newAssetsCount++;
    });

    const initialPositionsCount = validRows.length;
    const totalFinancialValueBRL = validRows.reduce(
      (sum, r) => sum + (r.interpreted.totalValue || ((r.interpreted.quantity || 0) * (r.interpreted.unitPrice || 0))),
      0
    );

    return {
      totalRows: preview.summary.totalRows,
      validCount,
      warningCount,
      errorCount,
      newAssetsCount,
      initialPositionsCount,
      totalFinancialValueBRL,
      hasErrors: errorCount > 0,
      hasWarnings: warningCount > 0,
    };
  }, [preview, existingAssets]);

  const handleConfirm = async () => {
    if (!preview || preview.previewRows.length === 0) return;

    if (previewStats?.hasErrors) {
      setErrorMsg(`A importação está bloqueada: existem ${previewStats.errorCount} linha(s) com erro. Corrija o arquivo antes de confirmar.`);
      return;
    }

    if (previewStats?.hasWarnings && !confirmedWarnings) {
      setErrorMsg('Confirme expressamente a ciência sobre os avisos da planilha antes de continuar.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const now = new Date().toISOString();
      const newAssets: PortfolioAsset[] = [];
      const newMovements: PortfolioMovement[] = [];
      const assetMap = new Map(existingAssets.map((a) => [a.ticker.toUpperCase(), a]));

      for (const row of preview.previewRows) {
        if (row.status === 'ERROR') continue; // Ignora linhas inválidas

        const ticker = (row.interpreted.ticker || '').trim().toUpperCase();
        if (!ticker) continue;

        let asset = assetMap.get(ticker);

        if (!asset && createMissingAssets) {
          const inferredCat = (row.interpreted.category || '').toLowerCase();
          const matchedClass = classes.find((c) => {
            const cName = c.name.toLowerCase();
            return (
              cName === inferredCat ||
              (inferredCat.includes('ação') && cName.includes('ação')) ||
              (inferredCat.includes('imobil') && (cName.includes('fii') || cName.includes('imobil'))) ||
              (inferredCat.includes('renda fixa') && cName.includes('renda fixa')) ||
              (inferredCat.includes('inter') && (cName.includes('inter') || cName.includes('global'))) ||
              (inferredCat.includes('cripto') && cName.includes('cripto')) ||
              (inferredCat.includes('caixa') && cName.includes('caixa'))
            );
          });

          const categoryName =
            matchedClass?.name ||
            row.interpreted.category ||
            classes[0]?.name ||
            'Ações Brasil';

          const activePresetObj = IMPORT_PRESETS.find((p) => p.id === selectedPreset);

          const newAsset: PortfolioAsset = {
            id: `asset_${Date.now()}_${ticker}`,
            userId,
            ticker,
            name: row.interpreted.name || ticker,
            category: categoryName,
            currency: 'BRL',
            market: ticker.endsWith('3') || ticker.endsWith('4') || ticker.endsWith('11') ? 'B3' : 'MANUAL',
            targetPercentage: row.interpreted.targetPercentage ?? 0,
            isBalanceOnly: Boolean(row.interpreted.isBalanceOnly),
            createdAt: now,
            updatedAt: now,
          };
          if (activePresetObj?.institutionDefault) {
            newAsset.institution = activePresetObj.institutionDefault;
          }
          newAssets.push(newAsset);
          assetMap.set(ticker, newAsset);
          asset = newAsset;
        }

        if (asset && (!asset.targetPercentage || asset.targetPercentage === 0) && row.interpreted.targetPercentage) {
          asset.targetPercentage = row.interpreted.targetPercentage;
        }

        if (!asset) continue;

        const isBalanceOnly = Boolean(asset.isBalanceOnly || row.interpreted.isBalanceOnly);
        const qty = isBalanceOnly ? null : row.interpreted.quantity ?? null;
        const price = isBalanceOnly ? 0 : row.interpreted.unitPrice ?? 0;
        const total = row.interpreted.totalValue ?? (qty && price ? qty * price : 0);
        const fees = row.interpreted.fees || 0;

        const movement: PortfolioMovement = {
          id: `mov_imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          userId,
          assetId: asset.id,
          type: importMode === 'INITIAL_POSITIONS' ? 'INITIAL_POSITION' : 'BUY',
          date: row.interpreted.date || new Date().toISOString().slice(0, 10),
          quantity: qty,
          hasKnownQuantity: !isBalanceOnly && qty !== null,
          unitPrice: price,
          fees,
          grossAmount: total,
          netAmount: total + fees,
          currency: 'BRL',
          fxRateToBRL: 1.0,
          fxSource: 'FIXED_ONE',
          netAmountBRL: total + fees,
          hasKnownCost: row.interpreted.hasKnownCost !== false,
          status: 'ACTIVE',
          notes: file?.name.toLowerCase().endsWith('.xlsx') ? 'Importado via planilha Excel (XLSX)' : 'Importado via arquivo CSV',
          createdAt: now,
          updatedAt: now,
        };

        newMovements.push(movement);
      }

      const uncalibratedCount = newMovements.filter((m) => m.quantity === null || !m.hasKnownQuantity).length;
      await onConfirmImport(newAssets, newMovements);
      setImportResult({
        newAssetsCreated: newAssets.length,
        positionsCreated: newMovements.length,
        totalFinancialValueBRL: previewStats?.totalFinancialValueBRL || 0,
        rejectedCount: 0,
        uncalibratedCount,
      });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao confirmar importação.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="import-spreadsheet-modal"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        ref={modalCardRef}
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-lg font-bold">Importar Planilha (CSV ou XLSX)</h3>
              <p className="text-xs text-slate-300 dark:text-slate-400">
                Prévia interativa com validação linha por linha e proteção de duplicidades
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {importResult ? (
            <div className="py-8 text-center space-y-6 animate-fade-in flex flex-col justify-center items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                  Importação Concluída com Sucesso!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto font-medium">
                  Os ativos e movimentações validadas foram gravados com sucesso na sua carteira.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-xl">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center">
                  <span className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Ativos Novos</span>
                  <span className="text-2xl font-black text-emerald-950 dark:text-emerald-200">{importResult.newAssetsCreated}</span>
                  <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">cadastrados</span>
                </div>

                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center">
                  <span className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Posições Iniciais</span>
                  <span className="text-2xl font-black text-emerald-950 dark:text-emerald-200">{importResult.positionsCreated}</span>
                  <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">gravadas</span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                  <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Previsto</span>
                  <span className="text-base font-black text-slate-900 dark:text-white truncate block mt-1">
                    {formatCurrencyBRL(importResult.totalFinancialValueBRL)}
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">registrado</span>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                  <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Recusadas</span>
                  <span className="text-2xl font-black text-slate-800 dark:text-slate-200">{importResult.rejectedCount}</span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">0 erros</span>
                </div>
              </div>

              {importResult.uncalibratedCount && importResult.uncalibratedCount > 0 ? (
                <div className="p-4 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-2xl max-w-xl text-center space-y-3">
                  <div className="flex items-center justify-center gap-1.5 text-purple-900 dark:text-purple-300 font-bold text-xs">
                    <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>{importResult.uncalibratedCount} {importResult.uncalibratedCount === 1 ? 'ativo importado requer' : 'ativos importados requerem'} calibração de cotas</span>
                  </div>
                  <p className="text-xs text-purple-800 dark:text-purple-400 font-medium">
                    O Nexus Copilot pode guiar você agora para preencher a quantidade de cotas, corretora ou metas de alocação.
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      data-testid="btn-calibrate-after-import"
                      onClick={() => {
                        onClose();
                        onOpenCalibration?.();
                      }}
                      className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-md transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Calibrar com Nexus Agora</span>
                    </button>
                    <button
                      type="button"
                      data-testid="btn-close-import-success"
                      onClick={onClose}
                      className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Ir para a Carteira
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="btn-close-import-success"
                  onClick={onClose}
                  className="px-8 py-3 bg-slate-950 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-black rounded-xl shadow-lg transition-all"
                >
                  Concluir e Voltar para a Carteira
                </button>
              )}
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

          {/* Presets Rápidos de Migração e Corretoras */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Modelos de Migração e Corretoras (1-Clique)
              </label>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                Mapeamento instantâneo
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5" data-testid="import-presets-container">
              {IMPORT_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <span>{preset.name}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                        isSelected
                          ? 'bg-slate-800 dark:bg-slate-200 text-slate-200 dark:text-slate-800'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modo de Importação e Seletor de Arquivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Finalidade da Planilha *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode('INITIAL_POSITIONS')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                    importMode === 'INITIAL_POSITIONS'
                      ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700 shadow'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  📋 Posições Atuais
                  <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                    Saldo/cotas atuais em custódia
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('MOVEMENTS')}
                  className={`p-3 rounded-xl border text-left text-xs font-bold transition-all ${
                    importMode === 'MOVEMENTS'
                      ? 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700 shadow'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  📑 Histórico de Movimentos
                  <span className="block text-[10px] font-normal opacity-80 mt-0.5">
                    Compras, vendas e proventos
                  </span>
                </button>
              </div>

              {importMode === 'INITIAL_POSITIONS' && (
                <div className="mt-2.5 p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Carga Inicial de Carteira Real:</span> Esta opção estabelece sua custódia e custo conhecido de partida.
                    <strong> Não haverá cálculo de rentabilidade histórica pretérita</strong>; o retorno e a evolução começarão a ser apurados rigorosamente a partir desta data-base.
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Arquivo (.csv ou .xlsx) *
              </label>
              <label className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-slate-500 dark:hover:border-slate-500 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/70 dark:hover:bg-slate-800 transition-all text-center">
                <Upload className="w-5 h-5 text-slate-500 dark:text-slate-400 mb-1" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {file ? file.name : 'Selecionar arquivo CSV ou XLSX'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">Até 5 MB (máx 2.000 linhas)</span>
                <input
                  type="file"
                  accept=".csv, .xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileChange(f);
                  }}
                />
              </label>
            </div>
          </div>

          {/* Seletor de Aba (para XLSX multi-aba) */}
          {availableSheets.length > 1 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl">
              <label className="block text-xs font-bold text-blue-900 dark:text-blue-200 uppercase mb-1">
                Selecione a Aba da Planilha:
              </label>
              <div className="flex flex-wrap gap-2">
                {availableSheets.map((s) => (
                  <button
                    key={s.sheetId}
                    type="button"
                    onClick={() => handleSheetSelect(s.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      selectedSheet === s.name
                        ? 'bg-blue-700 text-white'
                        : 'bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-200 border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mapeamento de Colunas */}
          {rawHeaders.length > 0 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                  Mapeamento de Colunas Detectadas
                </h4>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {rawRows.length} linhas encontradas
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Ativo / Ticker *</label>
                  <select
                    value={mapping.tickerColumn || ''}
                    onChange={(e) => updateMapping('tickerColumn', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-medium"
                  >
                    <option value="">(Selecione)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Nome / Empresa</label>
                  <select
                    value={mapping.nameColumn || ''}
                    onChange={(e) => updateMapping('nameColumn', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-medium"
                  >
                    <option value="">(Detectar automaticamente)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Classe / Categoria</label>
                  <select
                    value={mapping.categoryColumn || ''}
                    onChange={(e) => updateMapping('categoryColumn', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-medium"
                  >
                    <option value="">(Inferir automaticamente)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Valor Total / Saldo *</label>
                  <select
                    value={mapping.totalValueColumn || ''}
                    onChange={(e) => updateMapping('totalValueColumn', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-medium"
                  >
                    <option value="">(Selecione)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {importMode === 'INITIAL_POSITIONS' && (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Meta de Alocação (%)</label>
                    <select
                      value={mapping.targetPercentageColumn || ''}
                      onChange={(e) => updateMapping('targetPercentageColumn', e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-medium"
                    >
                      <option value="">(Opcional)</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Quantidade</label>
                  <select
                    value={mapping.quantityColumn || ''}
                    onChange={(e) => updateMapping('quantityColumn', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-medium"
                  >
                    <option value="">(Opcional / Saldo Puro)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
                    Preço Unitário / Cotação
                  </label>
                  <select
                    value={mapping.unitPriceColumn || ''}
                    onChange={(e) => updateMapping('unitPriceColumn', e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-medium"
                  >
                    <option value="">(Opcional)</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {importMode === 'MOVEMENTS' && (
                  <>
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Data da Operação *</label>
                      <select
                        value={mapping.dateColumn || ''}
                        onChange={(e) => updateMapping('dateColumn', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-medium"
                      >
                        <option value="">(Selecione)</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-0.5">Tipo da Operação *</label>
                      <select
                        value={mapping.typeColumn || ''}
                        onChange={(e) => updateMapping('typeColumn', e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-950 dark:text-white font-medium"
                      >
                        <option value="">(Selecione)</option>
                        {rawHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Resumo da Prévia (Conferência Pré-Gravação) */}
          {preview && previewStats && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wide">
                    Conferência Pré-Gravação
                  </h4>
                  <span className="text-xs font-black text-slate-950 dark:text-white">
                    Total Previsto: {formatCurrencyBRL(previewStats.totalFinancialValueBRL)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                  <div className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] uppercase font-bold">Total Linhas</span>
                    <span className="text-base font-black text-slate-900 dark:text-white">{previewStats.totalRows}</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg">
                    <span className="text-emerald-700 dark:text-emerald-400 block text-[10px] uppercase font-bold">Válidas</span>
                    <span className="text-base font-black text-emerald-800 dark:text-emerald-300">{previewStats.validCount}</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg">
                    <span className="text-amber-700 dark:text-amber-400 block text-[10px] uppercase font-bold">Avisos</span>
                    <span className="text-base font-black text-amber-800 dark:text-amber-300">{previewStats.warningCount}</span>
                  </div>
                  <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg">
                    <span className="text-red-700 dark:text-red-400 block text-[10px] uppercase font-bold">Erros</span>
                    <span className="text-base font-black text-red-800 dark:text-red-300">{previewStats.errorCount}</span>
                  </div>
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-lg">
                    <span className="text-blue-700 dark:text-blue-400 block text-[10px] uppercase font-bold">Ativos Novos</span>
                    <span className="text-base font-black text-blue-800 dark:text-blue-300">{previewStats.newAssetsCount}</span>
                  </div>
                  <div className="p-2.5 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/40 rounded-lg">
                    <span className="text-purple-700 dark:text-purple-400 block text-[10px] uppercase font-bold">Posições Iniciais</span>
                    <span className="text-base font-black text-purple-800 dark:text-purple-300">{previewStats.initialPositionsCount}</span>
                  </div>
                </div>
              </div>

              {/* Tabela de Prévia */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3">Linha</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Ativo</th>
                      <th className="py-2 px-3 text-right">Qtd</th>
                      <th className="py-2 px-3 text-right">Preço</th>
                      <th className="py-2 px-3 text-right">Valor Total</th>
                      <th className="py-2 px-3">Observação / Erros</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
                    {preview.previewRows.slice(0, 50).map((row) => (
                      <tr
                        key={row.sourceRowNumber}
                        className={
                          row.status === 'ERROR'
                            ? 'bg-red-50/50 dark:bg-red-950/40 text-red-900 dark:text-red-200'
                            : row.status === 'WARNING' || row.status === 'DUPLICATE_CANDIDATE'
                            ? 'bg-amber-50/40 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }
                      >
                        <td className="py-2 px-3 font-bold text-slate-400 dark:text-slate-500">{row.sourceRowNumber}</td>
                        <td className="py-2 px-3">
                          {row.status === 'VALID' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" /> Válida
                            </span>
                          )}
                          {(row.status === 'WARNING' || row.status === 'DUPLICATE_CANDIDATE') && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 px-1.5 py-0.5 rounded">
                              <AlertTriangle className="w-3 h-3" /> Aviso
                            </span>
                          )}
                          {row.status === 'ERROR' && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/50 px-1.5 py-0.5 rounded">
                              <XCircle className="w-3 h-3" /> Erro
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-bold">{row.interpreted.ticker || '-'}</td>
                        <td className="py-2 px-3 text-right font-mono">
                          {row.interpreted.quantity !== null && row.interpreted.quantity !== undefined
                            ? row.interpreted.quantity
                            : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono">
                          {row.interpreted.unitPrice ? formatCurrencyBRL(row.interpreted.unitPrice) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold">
                          {row.interpreted.totalValue ? formatCurrencyBRL(row.interpreted.totalValue) : '-'}
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                          {row.errors.length > 0
                            ? row.errors.join('; ')
                            : row.warnings.length > 0
                            ? row.warnings.join('; ')
                            : 'OK'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {preview.previewRows.length > 50 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  Exibindo as primeiras 50 de {preview.previewRows.length} linhas.
                </p>
              )}

              {/* Opção criar ativos faltantes */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createMissingAssets}
                    onChange={(e) => setCreateMissingAssets(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Cadastrar novos ativos automaticamente se não existirem na carteira
                  </span>
                </label>
              </div>
              {/* Banner de Erro Bloqueante */}
              {previewStats.hasErrors && (
                <div
                  data-testid="import-error-banner"
                  className="p-4 bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 rounded-xl flex items-start gap-3 text-xs text-red-900 dark:text-red-200 animate-fade-in"
                >
                  <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-sm">Importação Bloqueada</span>
                    Existem {previewStats.errorCount} linha(s) com erro na planilha. Para garantir a integridade da sua carteira, o botão de confirmação está bloqueado. Corrija os erros ou o mapeamento antes de continuar.
                  </div>
                </div>
              )}

              {/* Termo de Confirmação de Avisos */}
              {previewStats.hasWarnings && !previewStats.hasErrors && (
                <div
                  data-testid="import-warning-banner"
                  className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-xl space-y-2 text-xs text-amber-950 dark:text-amber-200 animate-fade-in"
                >
                  <div className="flex items-start gap-2.5 font-bold">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span>Atenção: A planilha contém {previewStats.warningCount} linha(s) com avisos</span>
                      <p className="text-[11px] font-normal text-amber-800 dark:text-amber-300 mt-0.5">
                        (Ativos sem quantidade/cotas conhecidas serão importados estritamente como posição baseada em saldo financeiro).
                      </p>
                    </div>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer pt-1 font-semibold text-slate-900 dark:text-white">
                    <input
                      type="checkbox"
                      data-testid="confirm-warnings-checkbox"
                      checked={confirmedWarnings}
                      onChange={(e) => setConfirmedWarnings(e.target.checked)}
                      className="mt-0.5 rounded border-amber-400 text-slate-950 focus:ring-slate-950"
                    />
                    <span>Estou ciente dos avisos e confirmo a importação dessas posições na carteira.</span>
                  </label>
                </div>
              )}
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer */}
        {!importResult && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              data-testid="confirm-import-btn"
              onClick={handleConfirm}
              disabled={
                !preview ||
                previewStats?.hasErrors ||
                (previewStats?.hasWarnings && !confirmedWarnings) ||
                previewStats?.initialPositionsCount === 0 ||
                isProcessing
              }
              className="px-5 py-2.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl shadow transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              {preview
                ? previewStats?.hasErrors
                  ? `Importação Bloqueada (${previewStats.errorCount} erros)`
                  : `Confirmar Importação (${previewStats?.initialPositionsCount} posições)`
                : 'Selecione um Arquivo'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
