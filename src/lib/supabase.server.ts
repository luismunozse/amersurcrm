import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

// ⚠️ SOLO servidor (RSC/Server Actions/Route Handlers). No lo importes en "use client".

// Cache del cliente por request - evita crear múltiples conexiones
const getSupabaseClient = cache(async () => {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(_name: string, _value: string, _options: Record<string, unknown>) {
          void _name;
          void _value;
          void _options;
        },
        remove(_name: string, _options: Record<string, unknown>) {
          void _name;
          void _options;
        },
      },
      db: { schema: "crm" },
    }
  );
});

// Función principal - reutiliza el cliente cacheado por request
export async function createOptimizedServerClient() {
  return getSupabaseClient();
}

// Alias para compatibilidad
export const createServerOnlyClient = createOptimizedServerClient;

// Cliente para Route Handlers que necesitan modificar cookies (como auth callbacks)
export async function createRouteHandlerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set(name, value, options as any);
          } catch (error) {
            // Puede fallar si las cookies ya fueron enviadas
            console.error('Error setting cookie:', error);
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set(name, '', options as any);
          } catch (error) {
            console.error('Error removing cookie:', error);
          }
        },
      },
      db: { schema: "crm" },
    }
  );
}

// Cliente de servicio (service role) - USO EXCLUSIVO EN SERVIDOR
// Permite usar métodos admin como auth.admin.createUser
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "crm" },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
