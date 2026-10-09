export interface MonthDataPoint {
  year: number;
  month: number;
  label: string;
  value: number;
  isClosed: boolean;
  isCurrentMonth: boolean;
  deviation: number | null;
  projection: number | null;
}

export interface AveragesDataEntry {
  category: string;
  average: number;
  averageOccurrence: number;
  totalValue: number;
  totalMonthsInWindow: number;
  monthsWithValue: number;
  months: MonthDataPoint[];
  projectedYearTotal?: number;
  trend?: { direction: 'up' | 'down' | 'stable'; percentage: number } | null;
  highestMonth?: { label: string; value: number } | null;
  lowestMonth?: { label: string; value: number } | null;
}

export type AveragesWindow = 'year' | 'last3' | 'last6' | 'all' | 'custom';
export type AverageMode = 'real' | 'occurrence';
