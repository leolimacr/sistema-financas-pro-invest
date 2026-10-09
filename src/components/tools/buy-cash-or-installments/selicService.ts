import type { SelicApiResponseItem } from './types';

export const SELIC_SERIES_CODE = 432;
export const FALLBACK_SELIC_RATE = 10.75;
const SELIC_CACHE_KEY = 'fpi_cached_selic_rate';

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

interface CachedSelic {
  rate: number;
  timestamp: number;
}

function getCachedSelicRate(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SELIC_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSelic;
    if (parsed && typeof parsed.rate === 'number' && !isNaN(parsed.rate) && parsed.rate > 0) {
      return parsed.rate;
    }
    return null;
  } catch {
    return null;
  }
}

function saveCachedSelicRate(rate: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SELIC_CACHE_KEY, JSON.stringify({
      rate,
      timestamp: Date.now()
    }));
  } catch {
    // Silencioso em caso de localStorage indisponível
  }
}

export async function fetchCurrentSelicRate(): Promise<number> {
  const cached = getCachedSelicRate();

  try {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 6);  
    const BCB_API_BASE_URL = import.meta.env.VITE_BCB_API_BASE_URL || 'https://api.bcb.gov.br';
    const url = `${BCB_API_BASE_URL}/dados/serie/bcdata.sgs.${SELIC_SERIES_CODE}/dados?formato=json&dataInicial=${formatDate(start)}&dataFinal=${formatDate(end)}`;
      
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn('[selicService] API do Banco Central retornou status não-200. Utilizando cache/fallback.');
      return cached ?? FALLBACK_SELIC_RATE;
    }

    const data = (await response.json()) as SelicApiResponseItem[];
    const last = data[data.length - 1];

    if (!last?.valor) {
      console.warn('[selicService] API do Banco Central sem valor da Selic. Utilizando cache/fallback.');
      return cached ?? FALLBACK_SELIC_RATE;
    }

    const rate = Number(last.valor.replace(',', '.'));
    if (isNaN(rate) || rate <= 0) {
      return cached ?? FALLBACK_SELIC_RATE;
    }

    saveCachedSelicRate(rate);
    return rate;
  } catch (error) {
    console.warn('[selicService] Falha de rede ao consultar Banco Central. Resiliência ativa:', error);
    return cached ?? FALLBACK_SELIC_RATE;
  }
}