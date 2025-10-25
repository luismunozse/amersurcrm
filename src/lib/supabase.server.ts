import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// ⚠️ SOLO servidor (RSC/Server Actions/Route Handlers). No lo importes en "use client".
export async function createOptimizedServerClient() {
  const cookieStore = await cookies(); // ✅ async en Next.js 15

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // Solo lectura en Server Components - no modificar cookies
        set(_name: string, _value: string, _options: Record<string, unknown>) {
          void _name;
          void _value;
          void _options;
          // No-op: no se pueden modificar cookies en Server Components
        },
        remove(_name: string, _options: Record<string, unknown>) {
          void _name;
          void _options;
          // No-op: no se pueden modificar cookies en Server Components
        },
      },
      db: { schema: "crm" },
    }
  );
}

// Alias para compatibilidad
export const createServerOnlyClient = createOptimizedServerClient;

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
