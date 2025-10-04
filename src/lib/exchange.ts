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

const lastRates: Partial<Record<'USD' | 'EUR', ExchangeRate>> = {};

async function fetchSunatRate(currency: 'USD' | 'EUR'): Promise<ExchangeRate> {
  if (process.env.NEXT_PUBLIC_DISABLE_SUNAT_FETCH === '1') {
    return (
      lastRates[currency] ?? {
        currency,
        buy: null,
        sell: null,
        date: null,
      }
    );
  }

  try {
    const url = `${SUNAT_ENDPOINT}?moneda=${currency}`;
    const res = await fetch(url, {
      // Datos cambian diariamente; revalidamos cada 3 horas
      next: { revalidate: 60 * 60 * 3 },
    });

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

    lastRates[currency] = normalized;
    return normalized;
  } catch (error) {
    console.warn('Error fetching SUNAT rate', currency, error);
    return (
      lastRates[currency] ?? {
        currency,
        buy: null,
        sell: null,
        date: null,
      }
    );
  }
}

export async function getSunatExchangeRates() {
  const usd = await fetchSunatRate('USD');
  return [usd];
}
