/**
 * Utilitários de Formatação para a Interface de Leitura da Carteira de Investimentos
 * Segue o rigor de autoridade silenciosa e nunca inventa métricas quando os dados forem nulos
 */

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrencyOriginal(value: number | null | undefined, currency: string = 'BRL'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, includeSign = false): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  const prefix = includeSign && value > 0 ? '+' : '';
  return `${prefix}${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })}%`;
}

export function formatQuantity(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '—';
  }
  // Se for inteiro, formata sem decimais; se tiver decimais fracionárias, mostra até 6 casas
  const isInteger = Number.isInteger(value);
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 6,
  });
}

export interface B3MarketStatus {
  isOpen: boolean;
  label: string;
  tooltip: string;
}

export function getB3MarketStatus(referenceDate: Date = new Date()): B3MarketStatus {
  try {
    // Converte para horário oficial de Brasília (America/Sao_Paulo)
    const brTimeStr = referenceDate.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    const brDate = new Date(brTimeStr);
    const day = brDate.getDay(); // 0 = Domingo, 6 = Sábado
    const hours = brDate.getHours();
    const minutes = brDate.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && timeInMinutes >= 600 && timeInMinutes < 1020; // 10h00 às 17h00

    return {
      isOpen,
      label: isOpen ? 'Pregão B3: Aberto' : 'Pregão B3: Fechado',
      tooltip: isOpen
        ? 'Mercado à vista da B3 aberto para negociação (10h00 às 17h00).'
        : 'Mercado à vista da B3 fechado no momento (horário regular: dias úteis das 10h00 às 17h00).',
    };
  } catch {
    return {
      isOpen: false,
      label: 'Pregão B3: Fechado',
      tooltip: 'Horário regular de negociação da B3: dias úteis das 10h00 às 17h00.',
    };
  }
}

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export interface FixedIncomeKindInfo {
  singular: string;
  gender: 'm' | 'f';
  article: string;
  preposition: string;
  addAnotherButton: string;
  compositionTitle: string;
  placeholderTicker: string;
  placeholderName: string;
  defaultIndexation: 'PRE' | 'CDI' | 'IPCA' | 'SELIC';
}

export function getFixedIncomeKindInfo(
  name?: string | null,
  ticker?: string | null,
  category?: string | null
): FixedIncomeKindInfo {
  const n = (name || '').toLowerCase();
  const t = (ticker || '').toLowerCase();
  const c = (category || '').toLowerCase();
  const combined = `${n} ${t} ${c}`;

  // 1. Tesouro Selic
  if (
    (combined.includes('selic') && (combined.includes('tesou') || t.startsWith('sel') || combined.includes('lft'))) ||
    t.startsWith('sel ') ||
    t.startsWith('sel2') ||
    t.startsWith('sel3') ||
    n.includes('tesou selic') ||
    n.includes('tesouro selic')
  ) {
    return {
      singular: 'Tesouro Selic',
      gender: 'm',
      article: 'o',
      preposition: 'deste',
      addAnotherButton: 'Adicionar outro Tesouro Selic',
      compositionTitle: 'Composição deste Tesouro Selic',
      placeholderTicker: 'Ex: SELIC 2029',
      placeholderName: 'Ex: Tesouro Selic 2029',
      defaultIndexation: 'SELIC',
    };
  }

  // 2. Tesouro IPCA / IPCA+
  if (
    combined.includes('ipca') &&
    (combined.includes('tesou') || t.startsWith('ntnb') || combined.includes('ntn-b'))
  ) {
    return {
      singular: 'Tesouro IPCA+',
      gender: 'm',
      article: 'o',
      preposition: 'deste',
      addAnotherButton: 'Adicionar outro Tesouro IPCA+',
      compositionTitle: 'Composição deste Tesouro IPCA+',
      placeholderTicker: 'Ex: IPCA 2050',
      placeholderName: 'Ex: Tesouro IPCA+ 2050',
      defaultIndexation: 'IPCA',
    };
  }

  // 3. Tesouro Prefixado
  if (
    (combined.includes('prefix') || combined.includes('prefixado') || t.startsWith('ltn') || t.startsWith('ntnf')) &&
    combined.includes('tesou')
  ) {
    return {
      singular: 'Tesouro Prefixado',
      gender: 'm',
      article: 'o',
      preposition: 'deste',
      addAnotherButton: 'Adicionar outro Tesouro Prefixado',
      compositionTitle: 'Composição deste Tesouro Prefixado',
      placeholderTicker: 'Ex: PRE 2029',
      placeholderName: 'Ex: Tesouro Prefixado 2029',
      defaultIndexation: 'PRE',
    };
  }

  // 4. Tesouro Direto Geral / Renda+ / Educa+
  if (combined.includes('tesou') || combined.includes('tesouro') || combined.includes('renda+') || combined.includes('educa+')) {
    const specificLabel = combined.includes('renda+')
      ? 'Tesouro Renda+'
      : combined.includes('educa+')
      ? 'Tesouro Educa+'
      : 'Título do Tesouro';
    return {
      singular: specificLabel,
      gender: 'm',
      article: 'o',
      preposition: 'deste',
      addAnotherButton: `Adicionar outro ${specificLabel}`,
      compositionTitle: `Composição deste ${specificLabel}`,
      placeholderTicker: 'Ex: TESOURO 2035',
      placeholderName: `Ex: ${specificLabel} 2035`,
      defaultIndexation: 'IPCA',
    };
  }

  // 5. CDB
  if (combined.includes('cdb')) {
    return {
      singular: 'CDB',
      gender: 'm',
      article: 'o',
      preposition: 'deste',
      addAnotherButton: 'Adicionar outro CDB',
      compositionTitle: 'Composição deste CDB',
      placeholderTicker: 'Ex: CDB Inter 110%',
      placeholderName: 'Ex: CDB Banco Inter Liquidez Diária',
      defaultIndexation: 'CDI',
    };
  }

  // 6. LCI
  if (combined.includes('lci')) {
    return {
      singular: 'LCI',
      gender: 'f',
      article: 'a',
      preposition: 'desta',
      addAnotherButton: 'Adicionar outra LCI',
      compositionTitle: 'Composição desta LCI',
      placeholderTicker: 'Ex: LCI 95% CDI',
      placeholderName: 'Ex: LCI Banco Inter 95% CDI',
      defaultIndexation: 'CDI',
    };
  }

  // 7. LCA
  if (combined.includes('lca')) {
    return {
      singular: 'LCA',
      gender: 'f',
      article: 'a',
      preposition: 'desta',
      addAnotherButton: 'Adicionar outra LCA',
      compositionTitle: 'Composição desta LCA',
      placeholderTicker: 'Ex: LCA 95% CDI',
      placeholderName: 'Ex: LCA Banco do Brasil',
      defaultIndexation: 'CDI',
    };
  }

  // 8. Debênture
  if (combined.includes('debênture') || combined.includes('debenture') || t.startsWith('deb')) {
    return {
      singular: 'Debênture',
      gender: 'f',
      article: 'a',
      preposition: 'desta',
      addAnotherButton: 'Adicionar outra Debênture',
      compositionTitle: 'Composição desta Debênture',
      placeholderTicker: 'Ex: DEB VALE',
      placeholderName: 'Ex: Debênture Incentivada Vale',
      defaultIndexation: 'IPCA',
    };
  }

  // 9. CRI
  if (combined.includes('cri')) {
    return {
      singular: 'CRI',
      gender: 'm',
      article: 'o',
      preposition: 'deste',
      addAnotherButton: 'Adicionar outro CRI',
      compositionTitle: 'Composição deste CRI',
      placeholderTicker: 'Ex: CRI IPCA+ 7%',
      placeholderName: 'Ex: Certificado de Recebíveis Imobiliários',
      defaultIndexation: 'IPCA',
    };
  }

  // 10. CRA
  if (combined.includes('cra')) {
    return {
      singular: 'CRA',
      gender: 'm',
      article: 'o',
      preposition: 'deste',
      addAnotherButton: 'Adicionar outro CRA',
      compositionTitle: 'Composição deste CRA',
      placeholderTicker: 'Ex: CRA IPCA+ 7%',
      placeholderName: 'Ex: Certificado de Recebíveis do Agronegócio',
      defaultIndexation: 'IPCA',
    };
  }

  // Fallback Geral para Renda Fixa
  return {
    singular: 'Título',
    gender: 'm',
    article: 'o',
    preposition: 'deste',
    addAnotherButton: 'Adicionar outro Vencimento / Título',
    compositionTitle: 'Composição deste Título',
    placeholderTicker: 'Ex: Título 2',
    placeholderName: 'Ex: Novo Vencimento sob esta Meta',
    defaultIndexation: 'CDI',
  };
}

