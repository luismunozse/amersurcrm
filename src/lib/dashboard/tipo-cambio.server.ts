import "server-only";

/**
 * Minimal shape of the open.er-api.com response — only the fields this
 * module actually reads.
 */
interface OpenErApiResponse {
  result?: string;
  rates?: Record<string, number>;
}

export interface TipoCambio {
  venta: number;
}

const OPEN_ER_API_URL = "https://open.er-api.com/v6/latest/USD";

/**
 * USD→PEN rate for the dashboard header chip.
 *
 * Source: open.er-api.com — a free, keyless, market mid-rate provider.
 * This is NOT the official SUNAT rate (`getSunatExchangeRates` in
 * `src/lib/exchange.ts`, used by the app-wide `CurrencyConverter`); it's a
 * lightweight value good enough for an at-a-glance header chip.
 *
 * Upgrade path: if official SUNAT parity is ever required here too, swap
 * this for `api.apis.net.pe/v1/tipo-cambio-sunat`, which needs a bearer
 * token (see apis.net.pe docs) — `exchange.ts` already has the token-free
 * fallback wiring to model that migration on.
 *
 * Never throws: any failure (network error, non-200, missing/invalid
 * field) resolves to `null` so the chip can simply render nothing.
 */
export async function getTipoCambioUsdPen(): Promise<TipoCambio | null> {
  try {
    const res = await fetch(OPEN_ER_API_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = (await res.json()) as OpenErApiResponse;
    const venta = data.rates?.PEN;

    if (typeof venta !== "number" || Number.isNaN(venta)) return null;

    return { venta };
  } catch {
    return null;
  }
}
