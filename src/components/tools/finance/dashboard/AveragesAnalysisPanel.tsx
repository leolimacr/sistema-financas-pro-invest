import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronUp } from 'lucide-react';
import { FPI_COPY } from '../../../../theme/fpiVoiceGuide';
import type { AveragesWindow, AverageMode } from './averagesTypes';
import { useAveragesCalculation } from './useAveragesCalculation';
import { AveragesOverviewCard } from './AveragesOverviewCard';
import { AveragesCategorySection } from './AveragesCategorySection';

interface AveragesAnalysisPanelProps {
  userUid: string | undefined;
  isReady: boolean;
  safeTransactions: any[];
  isPrivacyMode: boolean;
  hasHistoryAccess: boolean;
  onHistoryBlocked: () => void;
}

const AveragesAnalysisPanel: React.FC<AveragesAnalysisPanelProps> = ({
  userUid,
  isReady,
  safeTransactions,
  isPrivacyMode,
  hasHistoryAccess,
  onHistoryBlocked,
}) => {
  const [showAverages, setShowAverages] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [yearlyHistory, setYearlyHistory] = useState<any[]>([]);

  const [averagesWindow, setAveragesWindow] = useState<AveragesWindow>('year');
  const [customPeriodStart, setCustomPeriodStart] = useState('');
  const [customPeriodEnd, setCustomPeriodEnd] = useState('');
  const [averageMode, setAverageMode] = useState<AverageMode>('real');
  const [includeCurrentMonth, setIncludeCurrentMonth] = useState(false);
  const [includeCurrentMonthTotal, setIncludeCurrentMonthTotal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);

  // CARGA HISTÓRICA SOB DEMANDA PARA MÉDIAS (CUSTO OTIMIZADO)
  useEffect(() => {
    if (showAverages && userUid && isReady && hasHistoryAccess) {
      const loadYearlyData = async () => {
        setIsHistoryLoading(true);
        setYearlyHistory([]);
        try {
          const startOfYear = `${selectedYear}-01-01`;
          const endOfYear = `${selectedYear}-12-31`;
          
          const { ref, get, query, orderByChild, startAt, endAt } = await import('firebase/database');
          const { db } = await import('../../../../firebase');
          
          const txRef = ref(db, `transactions/${userUid}`);
          const q = query(txRef, orderByChild('date'), startAt(startOfYear), endAt(endOfYear));
          
          const snapshot = await get(q);
          if (snapshot.exists()) {
            const data: any[] = [];
            snapshot.forEach((child) => {
              data.push({ id: child.key, ...child.val() });
            });
            data.sort((a, b) => b.date.localeCompare(a.date));
            setYearlyHistory(data);
          }
        } catch (error) {
          console.error("Erro ao carregar histórico anual:", error);
        } finally {
          setIsHistoryLoading(false);
        }
      };
      loadYearlyData();
    }
  }, [showAverages, userUid, isReady, hasHistoryAccess, selectedYear]);

  const averagesData = useAveragesCalculation({
    showAverages,
    isReady,
    safeTransactions,
    yearlyHistory,
    averagesWindow,
    customPeriodStart,
    customPeriodEnd,
    averageMode,
    includeCurrentMonth,
    includeCurrentMonthTotal,
    selectedYear,
  });

  return (
    <div className="bg-surface-primary dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-section p-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-text-primary dark:text-white font-black text-sm tracking-tight flex items-center gap-2">
            Análise de Médias
            {!hasHistoryAccess && (
              <span className="text-[8px] px-1.5 py-0.5 bg-brand-secondary/10 text-sky-700 dark:text-sky-300 rounded-full font-bold tracking-normal normal-case">
                Histórico multi-mês no Pro
              </span>
            )}
          </h3>
          <p className="text-text-muted dark:text-slate-400 text-xxs font-bold uppercase tracking-ultra-wide mt-1">
            Média de gastos por categoria · apenas despesas
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!hasHistoryAccess) {
              onHistoryBlocked();
              return;
            }
            setShowAverages((prev) => !prev);
          }}
          className={`px-4 py-2.5 rounded-2xl text-xxs font-black uppercase border transition-all ${
            showAverages
              ? 'bg-surface-elevated dark:bg-slate-800 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700'
              : 'bg-status-info/10 border-brand-secondary/30 text-action-sky hover:bg-status-info/20'
          }`}
        >
          {showAverages ? 'Ocultar Análise' : 'Mostrar Análise de Médias'}
        </button>
      </div>

      {showAverages && (
        <>
          {isHistoryLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 animate-in fade-in duration-300">
              <RefreshCw size={24} className="text-brand-secondary animate-spin" />
              <p className="text-[10px] font-black text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide">
                Sincronizando histórico anual...
              </p>
            </div>
          )}

          {!isHistoryLoading && (
            <>
              {/* VISÃO GERAL — GASTOS TOTAIS DO ANO */}
              {averagesData.some(a => a.totalValue > 0) && averagesData[0].category === 'Total Geral' && (
                <AveragesOverviewCard
                  totalEntry={averagesData[0]}
                  selectedYear={selectedYear}
                  setSelectedYear={setSelectedYear}
                  averageMode={averageMode}
                  isPrivacyMode={isPrivacyMode}
                  includeCurrentMonthTotal={includeCurrentMonthTotal}
                  setIncludeCurrentMonthTotal={setIncludeCurrentMonthTotal}
                  showCategoryBreakdown={showCategoryBreakdown}
                  setShowCategoryBreakdown={setShowCategoryBreakdown}
                />
              )}

              {!averagesData.some(a => a.totalValue > 0) && (
                <div className="mt-4 py-8 px-4 text-center bg-surface-secondary dark:bg-slate-800/60 border border-surface-elevated dark:border-slate-700 rounded-3xl">
                  <p className="text-text-muted dark:text-slate-400 text-xxs font-black uppercase tracking-ultra-wide">Nenhuma média calculada para este período</p>
                  <p className="text-xxs text-text-muted dark:text-slate-400 mt-1 leading-relaxed">
                    {averagesWindow === 'year' 
                      ? FPI_COPY.averagesNeedData
                      : 'Tente mudar o período acima ou verifique se há compromissos cadastrados.'}
                  </p>
                </div>
              )}

              {showCategoryBreakdown && averagesData.some(a => a.totalValue > 0) && (
                <AveragesCategorySection
                  averagesData={averagesData}
                  averagesWindow={averagesWindow}
                  setAveragesWindow={setAveragesWindow}
                  customPeriodStart={customPeriodStart}
                  setCustomPeriodStart={setCustomPeriodStart}
                  customPeriodEnd={customPeriodEnd}
                  setCustomPeriodEnd={setCustomPeriodEnd}
                  averageMode={averageMode}
                  setAverageMode={setAverageMode}
                  includeCurrentMonth={includeCurrentMonth}
                  setIncludeCurrentMonth={setIncludeCurrentMonth}
                  isPrivacyMode={isPrivacyMode}
                />
              )}

              <button
                type="button"
                onClick={() => setShowAverages(false)}
                className="mt-6 flex items-center justify-center gap-2 px-5 py-3 rounded-3xl text-xxs font-black uppercase tracking-ultra-wide border transition-all active:scale-95 w-full sm:w-auto bg-surface-elevated dark:bg-slate-800 border-surface-elevated dark:border-slate-700 text-text-secondary dark:text-slate-300 hover:bg-surface-secondary dark:hover:bg-slate-700"
              >
                Ocultar Análise <ChevronUp size={16} />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AveragesAnalysisPanel;
