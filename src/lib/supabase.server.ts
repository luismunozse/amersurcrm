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

// Cache de auth.getUser() - evita múltiples llamadas a Supabase Auth por request
// Esto es CRÍTICO para evitar rate limits (429 errors)
export const getCachedAuthUser = cache(async () => {
  try {
    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.getUser();

    // Si hay error de refresh token, tratar como sesión inválida
    if (error?.code === 'refresh_token_not_found' || error?.code === 'session_not_found') {
      console.warn('[auth] Sesión inválida, redirigiendo a login');
      return { user: null, error };
    }

    return { user: data.user, error };
  } catch (err) {
    // Capturar errores de conexión (timeout, network) y tratar como sesión inválida
    console.error('[auth] Error al obtener usuario:', err);
    return { user: null, error: err as Error };
  }
});

// Helper para obtener solo el userId (usado frecuentemente)
export const getCachedUserId = cache(async (): Promise<string | null> => {
  const { user } = await getCachedAuthUser();
  return user?.id ?? null;
});

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
// IMPORTANTE: NO especificamos schema para evitar restricciones RLS
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// ========== VERIFICACIÓN DE PERMISOS OPTIMIZADA ==========
// Usa el cliente y auth cacheados para evitar queries redundantes
// en API routes que ya verifican auth

/**
 * Verifica si el usuario actual es admin de forma optimizada
 * Usa cache de React para evitar múltiples queries en el mismo request
 * Retorna { isAdmin, user, error } para evitar queries adicionales
 */
export const verificarAdminOptimizado = cache(async () => {
  try {
    const supabase = await getSupabaseClient();
    const { user, error: authError } = await getCachedAuthUser();

    if (authError || !user) {
      return { isAdmin: false, user: null, error: authError || 'No autenticado' };
    }

    // Query única para obtener rol del usuario
    const { data: perfil, error: perfilError } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('rol:rol!usuario_perfil_rol_id_fkey(nombre)')
      .eq('id', user.id)
      .single();

    if (perfilError || !perfil) {
      return { isAdmin: false, user, error: perfilError?.message || 'Perfil no encontrado' };
    }

    const rol = Array.isArray(perfil.rol) ? perfil.rol[0] : perfil.rol;
    const isAdmin = rol?.nombre === 'ROL_ADMIN';

    return { isAdmin, user, error: null };
  } catch (err) {
    console.error('[verificarAdminOptimizado] Error:', err);
    return { isAdmin: false, user: null, error: err };
  }
});
