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
    options: RequestInit = {}
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * Autenticar usuario
   */
  async login(username: string, password: string): Promise<AuthState> {
    const response = await this.request<{ user: any; token: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }
    );

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
      const cleanPhone = phone.replace(/[^\d+]/g, '');
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
    chrome.storage.local.remove(['authToken'], () => {
      resolve();
    });
  });
}
