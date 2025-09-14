import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Configuración optimizada para Supabase
const supabaseConfig = {
  auth: {
    persistSession: false, // No persistir sesiones en servidor
    autoRefreshToken: false, // No auto-refresh en servidor
    detectSessionInUrl: false, // No detectar sesiones en URL
  },
  global: {
    headers: {
      'X-Client-Info': 'amersur-crm',
    },
  },
  db: {
    schema: 'crm', // Especificar schema por defecto
  },
};

// Cliente optimizado para servidor
export async function createOptimizedServerClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
      ...supabaseConfig,
    }
  );
}

// Cliente optimizado para cliente
export function createOptimizedClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    supabaseConfig
  );
}

// Pool de conexiones para consultas frecuentes
class ConnectionPool {
  private static instance: ConnectionPool;
  private connections: Map<string, any> = new Map();
  private maxConnections = 5;

  static getInstance(): ConnectionPool {
    if (!ConnectionPool.instance) {
      ConnectionPool.instance = new ConnectionPool();
    }
    return ConnectionPool.instance;
  }

  async getConnection(key: string) {
    if (this.connections.has(key)) {
      return this.connections.get(key);
    }

    if (this.connections.size >= this.maxConnections) {
      // Reutilizar conexión existente
      const firstKey = this.connections.keys().next().value;
      return this.connections.get(firstKey);
    }

    const connection = await createOptimizedServerClient();
    this.connections.set(key, connection);
    return connection;
  }

  clear() {
    this.connections.clear();
  }
}

export const connectionPool = ConnectionPool.getInstance();
