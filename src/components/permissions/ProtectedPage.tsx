'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/lib/permissions/client';
import { PageLoader } from '@/components/ui/PageLoader';
import type { PermisoCodigo, RolNombre } from '@/lib/permissions/types';

interface ProtectedPageProps {
  /** Permiso requerido */
  permiso?: PermisoCodigo;
  /** Permisos alternativos (requiere al menos uno) */
  permisos?: PermisoCodigo[];
  /** Rol requerido */
  rol?: RolNombre;
  /** Roles alternativos (requiere al menos uno) */
  roles?: RolNombre[];
  /** Ruta a la que redirigir si no tiene permiso */
  redirectTo?: string;
  /** Contenido a mostrar mientras carga */
  loadingComponent?: React.ReactNode;
  /** Contenido a mostrar si no tiene permiso */
  forbiddenComponent?: React.ReactNode;
  /** Children */
  children: React.ReactNode;
}

/**
 * HOC para proteger páginas completas en el cliente
 * Útil para rutas que se generan dinámicamente
 *
 * @example
 * ```tsx
 * export default function MiPagina() {
 *   return (
 *     <ProtectedPage permiso="clientes.ver_todos">
 *       <div>Contenido protegido</div>
 *     </ProtectedPage>
 *   );
 * }
 * ```
 */
export function ProtectedPage({
  permiso,
  permisos,
  rol,
  roles,
  redirectTo = '/dashboard',
  loadingComponent,
  forbiddenComponent,
  children,
}: ProtectedPageProps) {
  const router = useRouter();
  const {
    tienePermiso,
    tieneAlgunoDePermisos,
    tieneRol,
    tieneAlgunoDeRoles,
    loading,
    usuario,
  } = usePermissions();

  const [verificado, setVerificado] = useState(false);
  const [accesoDenegado, setAccesoDenegado] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!usuario) {
      router.replace('/auth/login');
      return;
    }

    let permitido = true;

    // Verificar permiso único
    if (permiso && !tienePermiso(permiso)) {
      permitido = false;
    }

    // Verificar permisos alternativos
    if (permisos && permisos.length > 0 && !tieneAlgunoDePermisos(permisos)) {
      permitido = false;
    }

    // Verificar rol único
    if (rol && !tieneRol(rol)) {
      permitido = false;
    }

    // Verificar roles alternativos
    if (roles && roles.length > 0 && !tieneAlgunoDeRoles(roles)) {
      permitido = false;
    }

    if (!permitido) {
      setAccesoDenegado(true);
      if (!forbiddenComponent) {
        setTimeout(() => router.replace(redirectTo), 2000);
      }
    } else {
      setVerificado(true);
    }
  }, [
    loading,
    usuario,
    permiso,
    permisos,
    rol,
    roles,
    tienePermiso,
    tieneAlgunoDePermisos,
    tieneRol,
    tieneAlgunoDeRoles,
    router,
    redirectTo,
    forbiddenComponent,
  ]);

  if (loading || !verificado) {
    return (
      <>
        {loadingComponent || (
          <div className="min-h-screen flex items-center justify-center">
            <PageLoader text="Verificando permisos..." size="sm" />
          </div>
        )}
      </>
    );
  }

  if (accesoDenegado) {
    return (
      <>
        {forbiddenComponent || (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md p-6">
              <div className="mb-4">
                <svg
                  className="mx-auto h-16 w-16 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Acceso Denegado
              </h1>
              <p className="text-gray-600 mb-6">
                No tienes permisos para acceder a esta página.
              </p>
              <button
                onClick={() => router.push(redirectTo)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Volver al Dashboard
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return <>{children}</>;
}

/**
 * HOC de función para páginas (alternativa funcional)
 *
 * @example
 * ```tsx
 * function MiPagina() {
 *   return <div>Contenido</div>;
 * }
 *
 * export default withPermission(MiPagina, {
 *   permiso: 'clientes.ver_todos'
 * });
 * ```
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedPageProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedPage {...options}>
        <Component {...props} />
      </ProtectedPage>
    );
  };
}
