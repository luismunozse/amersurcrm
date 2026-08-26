/**
 * Cliente API para comunicación con Amersur CRM
 */

import { AuthState, Cliente, Coordinador, CreateLeadPayload, CreateLeadResponse } from '@/types/crm';
import { createLogger } from './logger';

const logger = createLogger('CRMApiClient');

// ─── Rate limiting y deduplicación ────────────────────────────────────
const MIN_REQUEST_INTERVAL_MS = 300;
const lastRequestTime = new Map<string, number>();
const inflightRequests = new Map<string, Promise<any>>();

function getThrottleKey(method: string, endpoint: string): string {
  return `${method}:${endpoint}`;
}

/**
 * Techo de espera por request. `fetch` NO tiene timeout propio: ante un socket
 * colgado (wifi que se corta, equipo que sale de suspensión, VPN que cae) la
 * promesa no resuelve NI rechaza, posiblemente para siempre.
 *
 * Eso rompía el sidebar de una forma difícil de diagnosticar: la promesa
 * colgada queda registrada en `inflightRequests` — el `.finally()` que limpia
 * la clave sólo corre cuando la promesa se asienta — así que el poll de
 * ConnectionStatus cada 30s caía en el dedupe y recibía LA MISMA promesa
 * muerta. El indicador quedaba en "Verificando..." para siempre, incluso
 * después de que la red se recuperaba, y sólo se salía recargando la página.
 */
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * `fetch` con timeout duro vía AbortController. Traduce el AbortError a un
 * mensaje con la palabra "conexión", que es lo que ConnectionStatus busca para
 * mostrar "Sin conexión" en vez de un error genérico.
 */
async function fetchConTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if ((error as Error | undefined)?.name === 'AbortError') {
      logger.warn('Request abortado por timeout', { url, timeoutMs: REQUEST_TIMEOUT_MS });
      throw new Error(
        `Error de conexión: el CRM no respondió en ${REQUEST_TIMEOUT_MS / 1000}s. ` +
        'Verifique su conexión a internet.',
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * `CRMApiClient.request()` solo lanza un Error genérico con el status y el
 * body crudo ("API Error: 409 - {...}") — no preserva el body parseado. Acá
 * lo recuperamos para poder mostrar el mensaje específico del server (y
 * campos como telefono_actual/cliente_existente) en vez de un genérico.
 */
function parseApiErrorBody(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof Error)) return null;
  const match = error.message.match(/^API Error: \d+ - ([\s\S]*)$/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Ventana durante la cual un 401 posterior a una renovación exitosa se
 * considera ya cubierto por esa renovación (ver renewToken).
 */
const RENEW_COOLDOWN_MS = 10_000;

export class CRMApiClient {
  private baseUrl: string;
  private token: string | null;
  /** Renovación en curso, para colapsar 401 concurrentes en un solo refresh. */
  private renewInFlight: Promise<boolean> | null = null;
  /** Timestamp de la última renovación exitosa. */
  private ultimaRenovacion = 0;

  constructor(baseUrl: string, token: string | null = null) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    logger.info('CRMApiClient inicializado', { baseUrl: this.baseUrl, hasToken: !!token });
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || 'GET';
    const requestId = `${method} ${endpoint}`;
    const throttleKey = getThrottleKey(method, endpoint);

    // Deduplicar GET requests en vuelo al mismo endpoint.
    //
    // OJO `!isRetry`: el reintento tras renovar el token (ver el manejo del
    // 401 más abajo) se dispara DESDE ADENTRO de la promesa que este mismo
    // Map tiene registrada bajo `throttleKey`. Sin esta exclusión el retry
    // matchea su propia entrada y devuelve la promesa que lo contiene: la
    // async function queda resuelta consigo misma y NUNCA settlea. Peor, el
    // `.finally()` que limpia el Map tampoco corre, así que la clave queda
    // envenenada y todo GET posterior a ese endpoint recibe la misma promesa
    // colgada por el resto de la sesión del sidebar (solo se recupera
    // recargando WhatsApp Web).
    if (method === 'GET' && !isRetry && inflightRequests.has(throttleKey)) {
      logger.debug('Request deduplicado (en vuelo)', { requestId });
      return inflightRequests.get(throttleKey) as Promise<T>;
    }

    // Throttle: esperar si el último request al mismo endpoint fue muy reciente
    const lastTime = lastRequestTime.get(throttleKey) || 0;
    const elapsed = Date.now() - lastTime;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await new Promise(r => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
    }
    lastRequestTime.set(throttleKey, Date.now());

    logger.debug(`Iniciando petición`, {
      method,
      endpoint,
      url,
      isRetry,
      hasToken: !!this.token,
    });

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const startTime = Date.now();

    // Registrar request en vuelo para deduplicación de GETs
    const executeRequest = async (): Promise<T> => {
    try {
      const response = await fetchConTimeout(url, {
        ...options,
        headers,
      });

      const responseTime = Date.now() - startTime;

      logger.debug(`Respuesta recibida`, {
        requestId,
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
      });

      // Si es 401 y no es un reintento, intentar renovar token
      if (response.status === 401 && !isRetry && typeof chrome !== 'undefined') {
        logger.warn('Token expirado, intentando renovar...', { requestId });
        const renewed = await this.renewToken();
        if (renewed) {
          logger.info('Token renovado exitosamente, reintentando petición...', { requestId });
          return this.request<T>(endpoint, options, true);
        } else {
          logger.error('No se pudo renovar el token', undefined, { requestId });
          // Avisar a la UI que la sesión expiró para volver al login (no fallar mudo).
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('amersurchat:session-expired'));
          }
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`Error en petición`, undefined, {
          requestId,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      logger.info(`Petición exitosa`, {
        requestId,
        responseTime: `${responseTime}ms`,
        dataSize: JSON.stringify(data).length,
      });

      // Enviar métrica de performance
      logger.sendMetric('api_request', requestId, responseTime, 'ms', {
        method,
        endpoint,
        status: response.status,
        dataSize: JSON.stringify(data).length,
      }).catch(() => {
        // Ignorar errores al enviar métricas
      });

      return data;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Manejar errores de red (timeout, sin conexión, etc.)
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const networkError = new Error('Error de conexión: No se pudo conectar con el servidor. Verifique su conexión a internet.');
        logger.error('Error de red', networkError, {
          requestId,
          responseTime: `${responseTime}ms`,
          originalError: error.message,
        });
        throw networkError;
      }

      logger.error('Error en petición', error instanceof Error ? error : undefined, {
        requestId,
        responseTime: `${responseTime}ms`,
      });

      throw error;
    }
    }; // fin executeRequest

    // Registrar y limpiar inflight.
    //
    // Solo la llamada original registra: el reintento del 401 corre dentro de
    // la promesa ya registrada, así que reemplazar la entrada dejaría dos
    // limpiezas compitiendo por la misma clave. La promesa externa settlea
    // cuando settlea el reintento, así que un único `.finally()` alcanza.
    //
    // El `.catch()` es sobre la promesa DERIVADA de `.finally()`, no sobre
    // `promise`: sin él, un GET que rechaza deja esa derivada sin manejar y
    // dispara un unhandledrejection en la consola del sidebar. El rechazo
    // real sigue viajando al caller por `promise`, que se devuelve intacta.
    const promise = executeRequest();
    if (method === 'GET' && !isRetry) {
      inflightRequests.set(throttleKey, promise);
      promise
        .finally(() => inflightRequests.delete(throttleKey))
        .catch(() => {});
    }
    return promise;
  }

  /**
   * Renovar token automáticamente usando refresh token.
   *
   * Single-flight + cooldown. El sidebar dispara varios GET en paralelo al
   * abrir un chat (search, pendientes, interacciones, proyectos...), así que
   * al expirar el access token TODOS reciben 401 casi a la vez. Sin esta
   * coordinación cada uno lanzaba su propio POST /api/auth/refresh con el
   * MISMO refresh token; Supabase los rota, así que las llamadas que llegan
   * después de la primera usan un token ya rotado, fallan, y el `catch` de
   * abajo hace clearCRMConfig() → el vendedor termina deslogueado en medio
   * del trabajo.
   *
   * - `renewInFlight`: los 401 concurrentes esperan la MISMA renovación.
   * - `ultimaRenovacion`: un 401 que llega justo DESPUÉS de que la renovación
   *   terminó (request que ya viajaba con el token viejo) no dispara otra —
   *   el token en memoria ya está fresco y el reintento lo va a usar.
   *
   * NOTA: Por seguridad, NO guardamos contraseñas.
   * Si el refresh token falla, el usuario deberá volver a hacer login.
   */
  private renewToken(): Promise<boolean> {
    if (Date.now() - this.ultimaRenovacion < RENEW_COOLDOWN_MS) {
      logger.debug('Renovación reciente, se reutiliza el token en memoria');
      return Promise.resolve(true);
    }

    if (this.renewInFlight) {
      logger.debug('Renovación ya en curso, esperando la misma');
      return this.renewInFlight;
    }

    const renovacion = this.doRenewToken()
      .then((ok) => {
        if (ok) this.ultimaRenovacion = Date.now();
        return ok;
      })
      .finally(() => {
        this.renewInFlight = null;
      });

    this.renewInFlight = renovacion;
    return renovacion;
  }

  private async doRenewToken(): Promise<boolean> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        return false;
      }

      const stored = await getTokenStorage().get(['refreshToken']);
      const localStored = await chrome.storage.local.get(['crmUrl']);

      if (!stored.refreshToken) {
        logger.warn('No hay refresh token disponible');
        return false;
      }

      const url = localStored.crmUrl || this.baseUrl;
      // Con timeout igual que el resto: este fetch se espera DENTRO del manejo
      // del 401, así que si cuelga se lleva puesto al request que lo disparó.
      const response = await fetchConTimeout(`${url}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: stored.refreshToken }),
      });

      if (!response.ok) {
        logger.warn('Error renovando token con refresh token');
        await clearCRMConfig();
        return false;
      }

      const data = await response.json();
      this.setToken(data.token);
      await saveTokens(data.token, data.refreshToken || stored.refreshToken);

      logger.info('Token renovado exitosamente');
      return true;
    } catch (error) {
      logger.error('Error renovando token', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Autenticar usuario
   */
  async login(username: string, password: string): Promise<AuthState> {
    logger.info('Iniciando login', { username, baseUrl: this.baseUrl });
    
    try {
      const response = await this.request<{ user: any; token: string; refreshToken?: string }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        }
      );

      logger.info('Login exitoso', {
        userId: response.user?.id,
        username: response.user?.username,
        hasRefreshToken: !!response.refreshToken,
      });

      // Guardar tokens en local storage (persisten entre reinicios del navegador)
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await saveTokens(response.token, response.refreshToken || null);
        await chrome.storage.local.set({ crmUrl: this.baseUrl });
        logger.debug('Tokens guardados en local storage');
      }

      // Actualizar token en el cliente
      this.setToken(response.token);

      return {
        isAuthenticated: true,
        user: response.user,
        token: response.token,
        crmUrl: this.baseUrl,
      };
    } catch (error) {
      logger.error('Error en login', error instanceof Error ? error : undefined, { username });
      throw error;
    }
  }

  /**
   * Buscar cliente por teléfono, chat ID (LID de WhatsApp) o username.
   * Con WhatsApp usernames (Meta, jun 2026) un chat puede no exponer el
   * teléfono real del contacto, así que se acepta cualquiera de los tres.
   * @returns Cliente encontrado, null si no existe, o objeto con asignadoAOtro si está asignado a otro vendedor
   */
  async searchCliente(params: {
    phone?: string | null;
    chatId?: string | null;
    username?: string | null;
  }): Promise<{ cliente: Cliente | null; asignadoAOtro?: boolean; mensaje?: string; error?: string }> {
    try {
      const query = new URLSearchParams();

      if (params.phone) {
        // Limpiar número: solo dígitos (sin +, espacios, guiones, paréntesis, etc.)
        const cleanPhone = params.phone.replace(/[^\d]/g, '');
        if (cleanPhone) query.set('phone', cleanPhone);
      }
      // 'unknown' es el sentinel de chatId sin dato real, nunca se envía.
      if (params.chatId && params.chatId !== 'unknown') {
        query.set('chat_id', params.chatId);
      }
      if (params.username) {
        query.set('username', params.username);
      }

      if ([...query.keys()].length === 0) {
        return { cliente: null, error: 'No hay teléfono, chat ID ni username para buscar.' };
      }

      const response = await this.request<{ cliente: Cliente | null; asignadoAOtro?: boolean; mensaje?: string }>(
        `/api/clientes/search?${query.toString()}`
      );
      return response;
    } catch (error) {
      console.error('[CRMApiClient] Error buscando cliente:', error);
      // No tragarse el error: el caller lo muestra con opción de reintentar.
      return { cliente: null, error: 'No se pudo buscar el cliente en el CRM.' };
    }
  }

  /**
   * Actualiza el teléfono de un cliente con un número detectado en el chat
   * y confirmado por el vendedor (ver SharedPhoneBanner). NUNCA se llama
   * automáticamente al detectar — solo tras un click explícito.
   * @returns cliente actualizado, o error (409: ya tiene teléfono / colisión con otro cliente)
   */
  async updateClientePhone(
    clienteId: string,
    telefono: string
  ): Promise<{
    cliente?: Cliente;
    error?: string;
    telefono_actual?: string | null;
    cliente_existente?: { id: string; nombre: string };
  }> {
    try {
      const response = await this.request<{ cliente: Cliente }>('/api/clientes/update-phone', {
        method: 'POST',
        body: JSON.stringify({ cliente_id: clienteId, telefono }),
      });
      return response;
    } catch (error) {
      const body = parseApiErrorBody(error);
      if (body && typeof body.error === 'string') {
        return {
          error: body.error,
          telefono_actual: (body.telefono_actual as string | null | undefined) ?? undefined,
          cliente_existente: body.cliente_existente as { id: string; nombre: string } | undefined,
        };
      }
      logger.error('Error actualizando teléfono del cliente', error instanceof Error ? error : undefined);
      return { error: 'No se pudo actualizar el teléfono del cliente.' };
    }
  }

  /**
   * Crear nuevo lead desde la extensión de Chrome
   */
  async createLead(payload: CreateLeadPayload): Promise<CreateLeadResponse> {
    return this.request<CreateLeadResponse>('/api/clientes/create-lead', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Obtener información del usuario actual
   */
  async getCurrentUser(): Promise<any> {
    return this.request('/api/auth/me');
  }

  /**
   * Obtener coordinadores activos para asignación de leads.
   * Solo admin/gerente: el backend responde 403 para el resto → devolvemos [].
   */
  async getCoordinadores(): Promise<Coordinador[]> {
    try {
      const response = await this.request<{ coordinadores: Coordinador[] }>('/api/clientes/coordinadores');
      return response.coordinadores || [];
    } catch (error) {
      console.error('[CRMApiClient] Error obteniendo coordinadores:', error);
      return [];
    }
  }

  /**
   * Obtener interacciones de un cliente
   */
  async getInteracciones(clienteId: string): Promise<any[]> {
    try {
      const response = await this.request<{ interacciones: any[] }>(
        `/api/clientes/${clienteId}/interacciones`
      );
      const interacciones = response.interacciones || [];
      return [...interacciones].sort((a, b) => {
        const fechaA = new Date(a.fecha).getTime();
        const fechaB = new Date(b.fecha).getTime();
        return fechaB - fechaA;
      });
    } catch (error) {
      console.error('[CRMApiClient] Error obteniendo interacciones:', error);
      return [];
    }
  }

  /**
   * Actualizar estado del cliente
   */
  async updateEstado(clienteId: string, nuevoEstado: string, nota?: string): Promise<any> {
    return this.request(`/api/clientes/${clienteId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({
        estado_cliente: nuevoEstado,
        ...(nota ? { nota } : {}),
      }),
    });
  }

  /**
   * Obtener lista de proyectos activos
   */
  async getProyectos(): Promise<any[]> {
    try {
      const response = await this.request<{ proyectos: any[] }>('/api/proyectos/list');
      return response.proyectos || [];
    } catch (error) {
      console.error('[CRMApiClient] Error obteniendo proyectos:', error);
      return [];
    }
  }

  /**
   * Obtener lotes disponibles de un proyecto
   */
  async getLotes(proyectoId: string): Promise<any[]> {
    try {
      const response = await this.request<{ lotes: any[] }>(`/api/proyectos/${proyectoId}/lotes`);
      return response.lotes || [];
    } catch (error) {
      console.error('[CRMApiClient] Error obteniendo lotes:', error);
      return [];
    }
  }

  /**
   * Obtener proyectos de interés de un cliente
   */
  async getProyectosInteres(clienteId: string): Promise<any[]> {
    try {
      const response = await this.request<{ proyectosInteres: any[] }>(
        `/api/clientes/${clienteId}/proyecto-interes`
      );
      return response.proyectosInteres || [];
    } catch (error) {
      console.error('[CRMApiClient] Error obteniendo proyectos de interés:', error);
      return [];
    }
  }

  /**
   * Agregar lote de interés para un cliente
   */
  async addProyectoInteres(clienteId: string, loteId: string, notas?: string): Promise<any> {
    return this.request(`/api/clientes/${clienteId}/proyecto-interes`, {
      method: 'POST',
      body: JSON.stringify({
        loteId: loteId,
        notas,
      }),
    });
  }

  /**
   * Registrar consulta general (interés sin proyecto/lote específico)
   */
  async addConsultaGeneral(clienteId: string, notas?: string): Promise<any> {
    return this.request(`/api/clientes/${clienteId}/proyecto-interes`, {
      method: 'POST',
      body: JSON.stringify({
        consultaGeneral: true,
        notas,
      }),
    });
  }

  /**
   * Eliminar proyecto de interés
   */
  async removeProyectoInteres(clienteId: string, interesId: string): Promise<any> {
    return this.request(`/api/clientes/${clienteId}/proyecto-interes?interesId=${interesId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Registrar interacción (mensaje de WhatsApp)
   */
  async createInteraccion(clienteId: string, tipo: string, mensaje: string, direccion: 'enviado' | 'recibido'): Promise<any> {
    try {
      return await this.request(`/api/clientes/${clienteId}/interacciones`, {
        method: 'POST',
        body: JSON.stringify({ tipo, mensaje, direccion }),
      });
    } catch (error) {
      console.error('[CRMApiClient] Error creando interacción:', error);
      return null;
    }
  }

  /**
   * Agregar nota rápida al cliente (append a notas existentes)
   */
  async addQuickNote(clienteId: string, nota: string): Promise<any> {
    try {
      return await this.request(`/api/clientes/${clienteId}/notas`, {
        method: 'POST',
        body: JSON.stringify({ nota }),
      });
    } catch (error) {
      console.error('[CRMApiClient] Error agregando nota:', error);
      throw error;
    }
  }

  /**
   * Obtener plantillas de mensaje desde el backend.
   * Cache en chrome.storage.local con TTL de 1 hora.
   */
  async getTemplates(): Promise<any[]> {
    try {
      // Verificar cache
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const cached = await new Promise<any>((resolve) =>
          chrome.storage.local.get(['templateCache', 'templateCacheTs'], resolve)
        );
        const ONE_HOUR = 60 * 60 * 1000;
        if (cached.templateCache && cached.templateCacheTs && (Date.now() - cached.templateCacheTs) < ONE_HOUR) {
          return cached.templateCache;
        }
      }

      const response = await this.request<{ templates: any[] }>('/api/extension/templates');
      const templates = response.templates || [];

      // Guardar en cache
      if (typeof chrome !== 'undefined' && chrome.storage && templates.length > 0) {
        chrome.storage.local.set({ templateCache: templates, templateCacheTs: Date.now() });
      }

      return templates;
    } catch (error) {
      logger.error('Error obteniendo plantillas', error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * Obtener tareas pendientes de un cliente
   */
  async getPendientes(clienteId: string): Promise<{ pendientes: number; tiene_pendientes: boolean }> {
    try {
      const response = await this.request<{ pendientes: number; tiene_pendientes: boolean }>(
        `/api/clientes/${clienteId}/pendientes`
      );
      return response;
    } catch (error) {
      console.error('[CRMApiClient] Error obteniendo pendientes:', error);
      return { pendientes: 0, tiene_pendientes: false };
    }
  }
}

// ─── Storage helpers ──────────────────────────────────────────────────
// Tokens van en local storage para que la sesión sobreviva reinicios del
// navegador (mismo nivel de persistencia que las cookies del CRM web).
// El refresh token de Supabase renueva el access token mientras se use.

function getTokenStorage(): chrome.storage.StorageArea {
  return chrome.storage.local;
}

/**
 * Guardar tokens en storage seguro
 */
async function saveTokens(token: string, refreshToken: string | null): Promise<void> {
  const storage = getTokenStorage();
  return new Promise((resolve) => {
    storage.set({ authToken: token, refreshToken: refreshToken }, () => resolve());
  });
}

/**
 * Obtener configuración de CRM desde storage
 */
export async function getCRMConfig(): Promise<{ url: string; token: string | null }> {
  const result = await new Promise<any>((resolve) =>
    chrome.storage.local.get(['crmUrl', 'authToken'], resolve)
  );

  // Migración: versiones previas guardaban tokens en session storage.
  // Si no hay token en local pero sí en session, moverlo a local.
  if (!result.authToken && chrome.storage.session) {
    const legacy = await new Promise<any>((resolve) =>
      chrome.storage.session.get(['authToken', 'refreshToken'], resolve)
    );
    if (legacy.authToken) {
      await saveTokens(legacy.authToken, legacy.refreshToken || null);
      chrome.storage.session.remove(['authToken', 'refreshToken']);
      return {
        url: result.crmUrl || 'https://crm.amersursac.com',
        token: legacy.authToken,
      };
    }
  }

  return {
    url: result.crmUrl || 'https://crm.amersursac.com',
    token: result.authToken || null,
  };
}

/**
 * Limpiar configuración de CRM (logout)
 */
export async function clearCRMConfig(): Promise<void> {
  await new Promise<void>((resolve) => {
    // `templateCache`/`templateCacheTs` también: las plantillas vienen del CRM
    // por usuario y sobrevivían al logout, así que el siguiente en loguearse en
    // la misma máquina veía las del anterior hasta que venciera el TTL de 1h.
    // `crmUrl` NO se borra: LoginForm lo relee para precargar la URL (modo dev).
    chrome.storage.local.remove(
      ['authToken', 'refreshToken', 'lastLogin', 'templateCache', 'templateCacheTs'],
      () => resolve(),
    );
  });
  // Limpiar tokens legacy de session storage si quedaron
  if (chrome.storage.session) {
    await new Promise<void>((resolve) => {
      chrome.storage.session.remove(['authToken', 'refreshToken'], () => resolve());
    });
  }
}
