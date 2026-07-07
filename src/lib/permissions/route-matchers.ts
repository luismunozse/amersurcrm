/**
 * Matchers de ruta puros (sin dependencias de Next.js/Supabase) usados por
 * `admin/layout.tsx` para decidir qué gate de acceso aplicar a cada segmento
 * de /dashboard/admin/*.
 *
 * Se mantienen separados de `middleware.ts` para poder testearlos sin mockear
 * 'next/headers' / '@/lib/supabase.server'.
 */

const RUTA_USUARIOS = "/dashboard/admin/usuarios";

/**
 * Determina si un pathname corresponde a la sección de Gestión de Usuarios
 * (/dashboard/admin/usuarios y sus sub-rutas). Es la única sección de
 * /dashboard/admin/* accesible en modo solo-lectura para ROL_GERENTE; el
 * resto del árbol admin permanece exclusivo de ROL_ADMIN.
 */
export function esRutaGestionUsuarios(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return pathname === RUTA_USUARIOS || pathname.startsWith(`${RUTA_USUARIOS}/`);
}
