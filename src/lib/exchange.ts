import 'server-only';

interface SunatRateResponse {
  compra: number;
  venta: number;
  moneda: string;
  fecha: string;
}

export interface ExchangeRate {
  currency: 'USD' | 'EUR';
  buy: number | null;
  sell: number | null;
  date: string | null;
}

const SUNAT_ENDPOINT = 'https://api.apis.net.pe/v1/tipo-cambio-sunat';

// Caché en memoria con timestamp
interface CachedRate {
  data: ExchangeRate;
  timestamp: number;
}

const lastRates: Partial<Record<'USD' | 'EUR', CachedRate>> = {};
const CACHE_DURATION = 60 * 60 * 1000; // 1 hora en milisegundos

// Valores por defecto para cuando la API falla
const DEFAULT_RATES: Record<'USD' | 'EUR', ExchangeRate> = {
  USD: {
    currency: 'USD',
    buy: 3.75, // Valores aproximados por si falla SUNAT
    sell: 3.78,
    date: new Date().toISOString().split('T')[0],
  },
  EUR: {
    currency: 'EUR',
    buy: 4.10,
    sell: 4.15,
    date: new Date().toISOString().split('T')[0],
  },
};

async function fetchSunatRate(currency: 'USD' | 'EUR'): Promise<ExchangeRate> {
  // Si está deshabilitado, usar caché o valores por defecto
  if (process.env.NEXT_PUBLIC_DISABLE_SUNAT_FETCH === '1') {
    return lastRates[currency]?.data ?? DEFAULT_RATES[currency];
  }

  // Verificar si tenemos un valor en caché reciente
  const cached = lastRates[currency];
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_DURATION) {
    console.log(`Using cached rate for ${currency}`);
    return cached.data;
  }

  try {
    const url = `${SUNAT_ENDPOINT}?moneda=${currency}`;
    const res = await fetch(url, {
      // Datos cambian diariamente; revalidamos cada 6 horas
      next: { revalidate: 60 * 60 * 6 },
      headers: {
        'User-Agent': 'AMERSUR-CRM/1.0',
      },
    });

    // Si es 429, usar caché o valores por defecto
    if (res.status === 429) {
      console.warn(`Rate limit reached for ${currency}, using cached or default values`);
      return cached?.data ?? DEFAULT_RATES[currency];
    }

    if (!res.ok) {
      throw new Error(`SUNAT ${currency} request failed with status ${res.status}`);
    }

    const data = (await res.json()) as SunatRateResponse;

    const normalized: ExchangeRate = {
      currency,
      buy: typeof data.compra === 'number' ? data.compra : null,
      sell: typeof data.venta === 'number' ? data.venta : null,
      date: data.fecha ?? null,
    };

    // Guardar en caché con timestamp
    lastRates[currency] = {
      data: normalized,
      timestamp: now,
    };

    return normalized;
  } catch (error) {
    console.warn(`Error fetching SUNAT rate for ${currency}:`, error);
    // Retornar caché si existe, sino valores por defecto
    return cached?.data ?? DEFAULT_RATES[currency];
  }
}

export async function getSunatExchangeRates() {
  const usd = await fetchSunatRate('USD');
  return [usd];
}
