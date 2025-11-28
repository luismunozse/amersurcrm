/**
 * Cliente API para comunicación con Amersur CRM
 */

import { AuthState, Cliente, CreateLeadPayload, CreateLeadResponse } from '@/types/crm';

export class CRMApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string, token: string | null = null) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remover trailing slash
    this.token = token;
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

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Si es 401 y no es un reintento, intentar renovar token
    if (response.status === 401 && !isRetry && typeof chrome !== 'undefined') {
      console.log('[API] Token expirado, intentando renovar...');
      const renewed = await this.renewToken();
      if (renewed) {
        console.log('[API] Token renovado exitosamente, reintentando petición...');
        return this.request<T>(endpoint, options, true);
      }
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
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
    const response = await this.request<{ user: any; token: string; refreshToken?: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );

    // Guardar refresh token para renovación automática (SEGURO)
    // NO guardamos contraseñas por seguridad
    if (typeof chrome !== 'undefined' && chrome.storage && response.refreshToken) {
      await chrome.storage.local.set({
        refreshToken: response.refreshToken,
        lastLogin: Date.now(),
      });
    }

    return {
      isAuthenticated: true,
      user: response.user,
      token: response.token,
      crmUrl: this.baseUrl,
    };
  }

  /**
   * Buscar cliente por teléfono
   */
  async searchClienteByPhone(phone: string): Promise<Cliente | null> {
    try {
      // Limpiar número: solo dígitos (sin +, espacios, guiones, paréntesis, etc.)
      const cleanPhone = phone.replace(/[^\d]/g, '');
      const response = await this.request<{ cliente: Cliente | null }>(
        `/api/clientes/search?phone=${encodeURIComponent(cleanPhone)}`
      );
      return response.cliente;
    } catch (error) {
      console.error('[CRMApiClient] Error buscando cliente:', error);
      return null;
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
      return response.interacciones || [];
    } catch (error) {
      console.error('[CRMApiClient] Error obteniendo interacciones:', error);
      return [];
    }
  }

  /**
   * Actualizar estado del cliente
   */
  async updateEstado(clienteId: string, nuevoEstado: string): Promise<any> {
    return this.request(`/api/clientes/${clienteId}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ estado: nuevoEstado }),
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
   * Agregar proyecto de interés para un cliente
   */
  async addProyectoInteres(clienteId: string, proyectoId: string, notas?: string): Promise<any> {
    return this.request(`/api/clientes/${clienteId}/proyecto-interes`, {
      method: 'POST',
      body: JSON.stringify({
        loteId: proyectoId, // Por ahora usamos loteId genérico
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
