import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Crea un cliente de Supabase para usar en Server Components, Route Handlers y Server Actions
 * Compatible con Next.js 15
 */
export async function createClient() {
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
          try {
            cookieStore.set(name, value, options);
          } catch {
            // En Server Components no se pueden establecer cookies
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.delete(name);
          } catch {
            // En Server Components no se pueden eliminar cookies
          }
        },
      },
      db: { schema: "crm" },
    }
  );
}
