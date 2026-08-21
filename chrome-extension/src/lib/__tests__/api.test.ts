import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const BASE = 'https://crm.test';

/** Respuesta mínima con la forma que consume CRMApiClient.request(). */
function respuesta(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

/**
 * `inflightRequests` y `lastRequestTime` son Maps a nivel de módulo, así que
 * cada test necesita una instancia limpia del módulo.
 */
async function cargarApi() {
  vi.resetModules();
  return import('@/lib/api');
}

/** URLs de telemetría que no cuentan como request de negocio. */
const esTelemetria = (url: string) => url.includes('/api/logs/') || url.includes('/api/metrics/');

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  const llamadas: string[] = [];
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    if (!esTelemetria(url)) llamadas.push(`${init?.method || 'GET'} ${url}`);
    return handler(url, init);
  });
  vi.stubGlobal('fetch', fn);
  return llamadas;
}

beforeEach(() => {
  // Sólo el refresh token: sin crmUrl+authToken el logger no manda telemetría.
  (globalThis as any).__resetChromeStorage({ refreshToken: 'rt-viejo' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('renovación de token en un 401', () => {
  it('reintenta el GET con el token nuevo y RESUELVE (no se cuelga)', async () => {
    const { CRMApiClient } = await cargarApi();
    let primeraVez = true;
    const llamadas = mockFetch((url) => {
      if (url.endsWith('/api/auth/refresh')) return respuesta(200, { token: 'tok-nuevo', refreshToken: 'rt-nuevo' });
      if (primeraVez) { primeraVez = false; return respuesta(401, { error: 'expired' }); }
      return respuesta(200, { username: 'vendedor1' });
    });

    const client = new CRMApiClient(BASE, 'tok-viejo');
    // Si el reintento vuelve a caer en el dedupe de GETs, esta promesa nunca
    // settlea y el test muere por timeout — que es exactamente la regresión.
    await expect(client.getCurrentUser()).resolves.toEqual({ username: 'vendedor1' });

    expect(llamadas).toEqual([
      `GET ${BASE}/api/auth/me`,
      `POST ${BASE}/api/auth/refresh`,
      `GET ${BASE}/api/auth/me`,
    ]);
  });

  it('no deja la clave inflight envenenada para los GET siguientes', async () => {
    const { CRMApiClient } = await cargarApi();
    let primeraVez = true;
    mockFetch((url) => {
      if (url.endsWith('/api/auth/refresh')) return respuesta(200, { token: 'tok-nuevo' });
      if (primeraVez) { primeraVez = false; return respuesta(401, { error: 'expired' }); }
      return respuesta(200, { username: 'vendedor1' });
    });

    const client = new CRMApiClient(BASE, 'tok-viejo');
    await client.getCurrentUser();
    // Antes el `.finally()` de limpieza nunca corría y este segundo GET
    // recibía la misma promesa colgada del anterior.
    await expect(client.getCurrentUser()).resolves.toEqual({ username: 'vendedor1' });
  });

  it('colapsa 401 concurrentes en un solo refresh y no pierde la sesión', async () => {
    const { CRMApiClient } = await cargarApi();
    let expirado = true;
    let refreshes = 0;
    mockFetch((url) => {
      if (url.endsWith('/api/auth/refresh')) {
        refreshes += 1;
        expirado = false;
        // Supabase rota el refresh token: un segundo intento con el viejo falla.
        if (refreshes > 1) return respuesta(400, { error: 'refresh token already used' });
        return respuesta(200, { token: 'tok-nuevo', refreshToken: 'rt-nuevo' });
      }
      if (expirado) return respuesta(401, { error: 'expired' });
      return respuesta(200, { ok: true });
    });

    const client = new CRMApiClient(BASE, 'tok-viejo');
    // Lo que dispara el sidebar al abrir un chat.
    const resultados = await Promise.all([
      client.getCurrentUser(),
      client.getPendientes('cli-1'),
      client.getProyectos(),
      client.getLotes('proy-1'),
    ]);

    expect(refreshes).toBe(1);
    expect(resultados).toHaveLength(4);
    expect((globalThis as any).__chromeStore.authToken).toBe('tok-nuevo');
  });
});

describe('deduplicación de requests', () => {
  it('un GET concurrente al mismo endpoint se reusa', async () => {
    const { CRMApiClient } = await cargarApi();
    const llamadas = mockFetch(() => respuesta(200, { proyectos: [] }));

    const client = new CRMApiClient(BASE, 'tok');
    const [a, b] = await Promise.all([client.getProyectos(), client.getProyectos()]);

    expect(llamadas).toHaveLength(1);
    expect(a).toEqual(b);
  });

  it('los POST NO se deduplican (dos altas son dos altas)', async () => {
    const { CRMApiClient } = await cargarApi();
    const llamadas = mockFetch(() => respuesta(200, { success: true, clienteId: 'x' }));

    const client = new CRMApiClient(BASE, 'tok');
    const payload = { nombre: 'Lead', origen_lead: 'whatsapp_web', canal: 'whatsapp_extension' };
    await Promise.all([client.createLead({ ...payload }), client.createLead({ ...payload })]);

    expect(llamadas).toHaveLength(2);
  });
});

describe('logout', () => {
  it('borra tokens y el cache de plantillas, pero conserva crmUrl', async () => {
    const { clearCRMConfig } = await cargarApi();
    (globalThis as any).__resetChromeStorage({
      crmUrl: BASE,
      authToken: 'tok',
      refreshToken: 'rt',
      lastLogin: 123,
      templateCache: [{ id: '1' }],
      templateCacheTs: 456,
    });

    await clearCRMConfig();

    const store = (globalThis as any).__chromeStore;
    expect(store.authToken).toBeUndefined();
    expect(store.refreshToken).toBeUndefined();
    expect(store.templateCache).toBeUndefined();
    expect(store.templateCacheTs).toBeUndefined();
    // LoginForm lo relee para precargar la URL en modo dev.
    expect(store.crmUrl).toBe(BASE);
  });
});
