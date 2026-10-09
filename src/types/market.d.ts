export interface MarketQuote {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  category: 'currency' | 'crypto' | 'index' | 'stock' | 'indicator';
}

export interface HistoricalDataPoint {
  date: string | number; // Timestamp or YYYY-MM-DD format
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}