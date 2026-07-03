import { createBrowserClient } from '@supabase/ssr';

/**
 * Cliente de Supabase para uso en el browser (componentes cliente)
 * Usa cookies para mantener la sesión del usuario
 * Compatible con Realtime (postgres_changes)
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: "crm" } }
  );
}
