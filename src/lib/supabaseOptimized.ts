import { createClient } from '@supabase/supabase-js';

// Configuración optimizada para Supabase
const supabaseConfig = {
  auth: {
    persistSession: true, // Persistir sesiones en cliente
    autoRefreshToken: true, // Auto-refresh en cliente
    detectSessionInUrl: true, // Detectar sesiones en URL
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

// Cliente optimizado para cliente
export function createOptimizedClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    supabaseConfig
  );
}

