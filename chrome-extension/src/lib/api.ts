/**
 * Cliente API para comunicación con Amersur CRM
 */

import { AuthState, Cliente, CreateLeadPayload, CreateLeadResponse } from '@/types/crm';
import { createLogger } from './logger';

const logger = createLogger('CRMApiClient');

export class CRMApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string, token: string | null = null) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remover trailing slash
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

    try {
      const response = await fetch(url, {
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
        const networkError = new Error('Error de conexión: No se pudo conectar con el servidor. Verifica tu conexión a internet.');
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
  }

  /**
   * Renovar token automáticamente usando refresh token
   * NOTA: Por seguridad, NO guardamos contraseñas.
   * Si el refresh token falla, el usuario deberá volver a hacer login.
   */
  private async renewToken(): Promise<boolean> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        return false;
      }

      const stored = await chrome.storage.local.get(['refreshToken', 'crmUrl']);

      if (!stored.refreshToken) {
        console.error('[API] No hay refresh token disponible');
        return false;
      }

      // Intentar renovar usando refresh token
      const url = stored.crmUrl || this.baseUrl;
      const response = await fetch(`${url}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: stored.refreshToken
        }),
      });

      if (!response.ok) {
        console.error('[API] Error renovando token con refresh token');
        // Limpiar tokens inválidos
        await clearCRMConfig();
        return false;
      }

      const data = await response.json();

      // Actualizar tokens
      this.setToken(data.token);
      await chrome.storage.local.set({
        authToken: data.token,
        refreshToken: data.refreshToken || stored.refreshToken,
      });

      console.log('[API] Token renovado exitosamente con refresh token');
      return true;
    } catch (error) {
      console.error('[API] Error renovando token:', error);
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

      // Guardar tokens para persistencia de sesión
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          authToken: response.token,
          refreshToken: response.refreshToken || null,
          crmUrl: this.baseUrl,
          lastLogin: Date.now(),
        });
        logger.debug('Tokens guardados en storage');
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
   * Buscar cliente por teléfono
   * @returns Cliente encontrado, null si no existe, o objeto con asignadoAOtro si está asignado a otro vendedor
   */
  async searchClienteByPhone(phone: string): Promise<{ cliente: Cliente | null; asignadoAOtro?: boolean; mensaje?: string }> {
    try {
      // Limpiar número: solo dígitos (sin +, espacios, guiones, paréntesis, etc.)
      const cleanPhone = phone.replace(/[^\d]/g, '');
      const response = await this.request<{ cliente: Cliente | null; asignadoAOtro?: boolean; mensaje?: string }>(
        `/api/clientes/search?phone=${encodeURIComponent(cleanPhone)}`
      );
      return response;
    } catch (error) {
      console.error('[CRMApiClient] Error buscando cliente:', error);
      return { cliente: null };
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

/**
 * Obtener configuración de CRM desde storage
 */
export async function getCRMConfig(): Promise<{ url: string; token: string | null }> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['crmUrl', 'authToken'], (result) => {
      resolve({
        url: result.crmUrl || 'https://crm.amersursac.com',
        token: result.authToken || null,
      });
    });
  });
}

/**
 * Guardar configuración de CRM en storage
 */
export async function saveCRMConfig(url: string, token: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ crmUrl: url, authToken: token }, () => {
      resolve();
    });
  });
}

/**
 * Limpiar configuración de CRM
 */
export async function clearCRMConfig(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(['authToken', 'refreshToken', 'lastLogin'], () => {
      resolve();
    });
  });
}
