import { useMemo } from 'react';
import type { AveragesDataEntry, AveragesWindow, AverageMode, MonthDataPoint } from './averagesTypes';

interface UseAveragesCalculationParams {
  showAverages: boolean;
  isReady: boolean;
  safeTransactions: any[];
  yearlyHistory: any[];
  averagesWindow: AveragesWindow;
  customPeriodStart: string;
  customPeriodEnd: string;
  averageMode: AverageMode;
  includeCurrentMonth: boolean;
  includeCurrentMonthTotal: boolean;
  selectedYear: number;
}

export function useAveragesCalculation({
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
}: UseAveragesCalculationParams): AveragesDataEntry[] {
  return useMemo(() => {
    if (!showAverages || !isReady) return [];

    // Mesclar transações em tempo real com o histórico carregado sob demanda
    const txMap = new Map();
    yearlyHistory.forEach(t => txMap.set(t.id, t));
    safeTransactions.forEach(t => txMap.set(t.id, t));
    
    const allRelevantTx = Array.from(txMap.values());

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;

    const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
    const isMonthClosed = (year: number, month: number) =>
      year < currentYear || (year === currentYear && month < currentMonth);
    const isCurrentMonth = (year: number, month: number) =>
      year === currentYear && month === currentMonth;

    const getWindowMonths = (): { year: number; month: number }[] => {
      const months: { year: number; month: number }[] = [];
      if (averagesWindow === 'year') {
        for (let m = 1; m <= 12; m++) months.push({ year: currentYear, month: m });
      } else if (averagesWindow === 'last3') {
        for (let i = 2; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }
      } else if (averagesWindow === 'last6') {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }
      } else if (averagesWindow === 'custom' && customPeriodStart && customPeriodEnd) {
        const [startYear, startMonth] = customPeriodStart.split('-').map(Number);
        const [endYear, endMonth] = customPeriodEnd.split('-').map(Number);
        let y = startYear; let m = startMonth;
        while (y < endYear || (y === endYear && m <= endMonth)) {
          months.push({ year: y, month: m });
          m++; if (m > 12) { m = 1; y++; }
        }
      } else {
        const set = new Set<string>();
        allRelevantTx.forEach((t: any) => {
          if (t?.date) {
            const [y, m] = t.date.split('-').map(Number);
            set.add(`${y}-${String(m).padStart(2, '0')}`);
          }
        });
        Array.from(set).sort().forEach(key => {
          const [y, m] = key.split('-').map(Number);
          months.push({ year: y, month: m });
        });
      }
      return months;
    };

    const windowMonths = getWindowMonths();
    const categoryMonthMap = new Map<string, Map<string, number>>();

    allRelevantTx
      .filter((t: any) => t?.type === 'expense' && t?.date)
      .forEach((t: any) => {
        const [y, m] = t.date.split('-').map(Number);
        const monthKey = `${y}-${String(m).padStart(2, '0')}`;
        const cat = (t.category || 'Sem categoria').toString();
        const val = Number(t.amount) || 0;
        if (!categoryMonthMap.has(cat)) categoryMonthMap.set(cat, new Map());
        const mm = categoryMonthMap.get(cat)!;
        mm.set(monthKey, (mm.get(monthKey) || 0) + val);
      });

    // --- TOTAL GERAL (YTD: ano selecionado, jan-dez) ---
    const ytdMonths: { year: number; month: number }[] = [];
    for (let m = 1; m <= 12; m++) ytdMonths.push({ year: selectedYear, month: m });

    const totalMonthMap = new Map<string, number>();
    categoryMonthMap.forEach((cm) => {
      cm.forEach((value, key) => {
        totalMonthMap.set(key, (totalMonthMap.get(key) || 0) + value);
      });
    });

    const totalMonthsData: MonthDataPoint[] = ytdMonths.map(({ year, month }) => {
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const value = totalMonthMap.get(monthKey) || 0;
      const closed = isMonthClosed(year, month);
      const current = isCurrentMonth(year, month);
      let projection: number | null = null;
      if (current && value > 0) {
        const dayOfMonth = today.getDate();
        const totalDays = daysInMonth(year, month);
        projection = (value / dayOfMonth) * totalDays;
      }
      const label = new Date(year, month - 1, 1)
        .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
        .replace('.', '');
      return { year, month, label, value, isClosed: closed, isCurrentMonth: current, deviation: null, projection };
    });

    const totalMonthsForAverage = totalMonthsData.filter(m => {
      if (m.isClosed && m.value > 0) return true;
      if (m.isCurrentMonth && includeCurrentMonthTotal && m.value > 0) return true;
      return false;
    });
    const totalClosedInYTD = ytdMonths.filter(({ year, month }) =>
      isMonthClosed(year, month) || (isCurrentMonth(year, month) && includeCurrentMonthTotal)
    ).length;
    const totalYTDCumulative = totalMonthsForAverage.reduce((sum, m) => sum + m.value, 0);
    const ytdAverageReal = totalClosedInYTD > 0 ? totalYTDCumulative / totalClosedInYTD : 0;
    const ytdAverageOccurrence = totalMonthsForAverage.length > 0 ? totalYTDCumulative / totalMonthsForAverage.length : 0;
    const ytdActiveAvg = averageMode === 'real' ? ytdAverageReal : ytdAverageOccurrence;

    const totalWithDeviation = totalMonthsData.map(m => ({
      ...m,
      deviation: (m.isClosed || (m.isCurrentMonth && includeCurrentMonthTotal)) && m.value > 0 && ytdActiveAvg > 0
        ? ((m.value - ytdActiveAvg) / ytdActiveAvg) * 100
        : null,
    }));

    const projectedYear = ytdAverageReal * 12;

    let trend: { direction: 'up' | 'down' | 'stable'; percentage: number } | null = null;
    const closedSorted = totalWithDeviation.filter(m => m.isClosed && m.value > 0);
    if (closedSorted.length >= 6) {
      const last3 = closedSorted.slice(-3);
      const prev3 = closedSorted.slice(-6, -3);
      const l3Avg = last3.reduce((s, m) => s + m.value, 0) / 3;
      const p3Avg = prev3.reduce((s, m) => s + m.value, 0) / 3;
      if (p3Avg > 0) {
        const pct = ((l3Avg - p3Avg) / p3Avg) * 100;
        trend = { direction: pct > 5 ? 'up' : pct < -5 ? 'down' : 'stable', percentage: Math.abs(pct) };
      }
    }

    const monthsWithVal = totalWithDeviation.filter(m => m.value > 0);
    const highestMonth = monthsWithVal.reduce((b, m) => (m.value > b.value ? m : b), monthsWithVal[0] || null);
    const lowestMonth = monthsWithVal.reduce((b, m) => (m.value < b.value ? m : b), monthsWithVal[0] || null);

    const totalEntry: AveragesDataEntry = {
      category: 'Total Geral',
      average: ytdAverageReal,
      averageOccurrence: ytdAverageOccurrence,
      totalValue: totalYTDCumulative,
      totalMonthsInWindow: totalClosedInYTD,
      monthsWithValue: totalMonthsForAverage.length,
      months: totalWithDeviation,
      projectedYearTotal: projectedYear,
      trend,
      highestMonth: highestMonth ? { label: highestMonth.label, value: highestMonth.value } : null,
      lowestMonth: lowestMonth ? { label: lowestMonth.label, value: lowestMonth.value } : null,
    };

    const result: AveragesDataEntry[] = [];

    categoryMonthMap.forEach((monthMap, category) => {
      const monthsData: MonthDataPoint[] = windowMonths.map(({ year, month }) => {
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const value = monthMap.get(monthKey) || 0;
        const closed = isMonthClosed(year, month);
        const current = isCurrentMonth(year, month);
        let projection: number | null = null;
        if (current && value > 0) {
          const dayOfMonth = today.getDate();
          const totalDays = daysInMonth(year, month);
          projection = (value / dayOfMonth) * totalDays;
        }
        const label = new Date(year, month - 1, 1)
          .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
          .replace('.', '');
        return { year, month, label, value, isClosed: closed, isCurrentMonth: current, deviation: null, projection };
      });

      const monthsForAverage = monthsData.filter(m => {
        if (m.isClosed && m.value > 0) return true;
        if (m.isCurrentMonth && includeCurrentMonth && m.value > 0) return true;
        return false;
      });
      if (monthsForAverage.length === 0) return;

      const totalValue = monthsForAverage.reduce((sum, m) => sum + m.value, 0);

      const totalClosedMonthsInWindow = windowMonths.filter(({ year, month }) =>
        isMonthClosed(year, month) || (isCurrentMonth(year, month) && includeCurrentMonth)
      ).length;

      const averageReal = totalClosedMonthsInWindow > 0 ? totalValue / totalClosedMonthsInWindow : 0;
      const averageOccurrence = totalValue / monthsForAverage.length;

      const activeAverage = averageMode === 'real' ? averageReal : averageOccurrence;

      const withDeviation = monthsData.map(m => ({
        ...m,
        deviation: (m.isClosed || (m.isCurrentMonth && includeCurrentMonth)) && m.value > 0 && activeAverage > 0
          ? ((m.value - activeAverage) / activeAverage) * 100
          : null,
      }));

      result.push({
        category,
        average: averageReal,
        averageOccurrence,
        totalValue,
        totalMonthsInWindow: totalClosedMonthsInWindow,
        monthsWithValue: monthsForAverage.length,
        months: withDeviation,
      });
    });

    const sortedCategories = result.sort((a, b) => a.category.localeCompare(b.category, 'pt-BR', { sensitivity: 'base' }));
    return [totalEntry, ...sortedCategories];
  }, [
    safeTransactions,
    yearlyHistory,
    averagesWindow,
    includeCurrentMonth,
    includeCurrentMonthTotal,
    averageMode,
    customPeriodStart,
    customPeriodEnd,
    isReady,
    showAverages,
    selectedYear,
  ]);
}
