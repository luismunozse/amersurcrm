import "server-only";
import { createServerClient } from "@supabase/ssr";
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
        set(name: string, value: string, options: Record<string, unknown>) {
          // No-op: no se pueden modificar cookies en Server Components
        },
        remove(name: string, options: Record<string, unknown>) {
          // No-op: no se pueden modificar cookies en Server Components
        },
      },
      db: { schema: "crm" },
    }
  );
}

// Alias para compatibilidad
export const createServerOnlyClient = createOptimizedServerClient;
