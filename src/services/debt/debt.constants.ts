export const MANUAL_DEBT_TYPES = {
  ROTATIVO: 'Cartão rotativo',
  PESSOAL: 'Empréstimo pessoal',
  FINANCIAMENTO: 'Financiamento',
  CHEQUE_ESPECIAL: 'Cheque especial',
  CONSIGNADO: 'Crédito consignado',
  OUTRO: 'Outro',
} as const;

export const MANUAL_DEBT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: MANUAL_DEBT_TYPES.ROTATIVO, label: 'Fatura de Cartão / Crédito rotativo' },
  { value: MANUAL_DEBT_TYPES.PESSOAL, label: 'Empréstimo pessoal' },
  { value: MANUAL_DEBT_TYPES.FINANCIAMENTO, label: 'Financiamento' },
  { value: MANUAL_DEBT_TYPES.CHEQUE_ESPECIAL, label: 'Cheque especial' },
  { value: MANUAL_DEBT_TYPES.CONSIGNADO, label: 'Crédito consignado' },
  { value: MANUAL_DEBT_TYPES.OUTRO, label: 'Outro' },
];

export const DEBT_ADJUSTMENT_TYPES = {
  FIXED: 'fixed',
  ANNUAL_PERCENT: 'annual_percent',
  MANUAL_SERIES: 'manual_series',
} as const;

export const DEBT_ADJUSTMENT_TYPE_OPTIONS: { value: string; label: string; description: string }[] = [
  {
    value: DEBT_ADJUSTMENT_TYPES.FIXED,
    label: 'Parcela Fixa',
    description: 'Valor da parcela não muda durante todo o contrato',
  },
  {
    value: DEBT_ADJUSTMENT_TYPES.ANNUAL_PERCENT,
    label: 'Reajuste Anual Percentual',
    description: 'Parcela reajustada anualmente por % fixo (ex: 8,5% a.a.)',
  },
  {
    value: DEBT_ADJUSTMENT_TYPES.MANUAL_SERIES,
    label: 'Série Manual (Tabela de Valores)',
    description: 'Você define o valor de cada série/ano manualmente',
  },
];

export const DEBT_SERIES_FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semi_annual', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
];