export interface CompoundChartPoint {
  label: string;
  'Valor Investido': number;
  'Juros Acumulados': number;
  total: number;
}

export interface CompoundYearlyRow {
  year: number;
  totalInvestido: number;
  totalJuros: number;
  totalAcumulado: number;
  aporteNoAno: number;
  jurosNoAno: number;
  poderCompraReal: number;
}

export interface CompoundMonthlyRow {
  month: number;
  year: number;
  jurosPeriodo: number;
  totalInvestido: number;
  totalJuros: number;
  totalAcumulado: number;
  poderCompraReal: number;
}
