'use client';

import { usePermissions } from '@/lib/permissions/client';
import type { PermisoCodigo, RolNombre } from '@/lib/permissions/types';
import { ReactNode } from 'react';

interface ProtectedActionProps {
  /** Permiso requerido (ej: "clientes.eliminar") */
  permiso?: PermisoCodigo;
  /** Permisos alternativos (se muestra si tiene al menos uno) */
  permisos?: PermisoCodigo[];
  /** Rol requerido */
  rol?: RolNombre;
  /** Roles alternativos (se muestra si tiene al menos uno) */
  roles?: RolNombre[];
  /** Contenido a mostrar si tiene permiso */
  children: ReactNode;
  /** Contenido alternativo si NO tiene permiso */
  fallback?: ReactNode;
  /** Mostrar loading mientras verifica */
  showLoading?: boolean;
  /** Componente de loading personalizado */
  loadingComponent?: ReactNode;
}

/**
 * Componente que muestra contenido solo si el usuario tiene el permiso
 *
 * @example
 * ```tsx
 * <ProtectedAction permiso="clientes.eliminar">
 *   <button onClick={eliminarCliente}>Eliminar</button>
 * </ProtectedAction>
 * ```
 */
export function ProtectedAction({
  permiso,
  permisos,
  rol,
  roles,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent,
}: ProtectedActionProps) {
  const {
    tienePermiso,
    tieneAlgunoDePermisos,
    tieneRol,
    tieneAlgunoDeRoles,
    loading,
  } = usePermissions();

  if (loading && showLoading) {
    return <>{loadingComponent || <div className="animate-pulse">Cargando...</div>}</>;
  }

  // Verificar permisos
  if (permiso && !tienePermiso(permiso)) {
    return <>{fallback}</>;
  }

  if (permisos && permisos.length > 0 && !tieneAlgunoDePermisos(permisos)) {
    return <>{fallback}</>;
  }

  // Verificar roles
  if (rol && !tieneRol(rol)) {
    return <>{fallback}</>;
  }

  if (roles && roles.length > 0 && !tieneAlgunoDeRoles(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Componente que OCULTA contenido si el usuario tiene el permiso
 * Útil para mostrar mensajes de "sin permisos"
 */
export function HideIfHasPermission({
  permiso,
  children,
}: {
  permiso: PermisoCodigo;
  children: ReactNode;
}) {
  const { tienePermiso } = usePermissions();

  if (tienePermiso(permiso)) {
    return null;
  }

  return <>{children}</>;
}

/**
 * Componente para mostrar diferentes contenidos según el rol
 *
 * @example
 * ```tsx
 * <RoleBasedContent
 *   admin={<AdminDashboard />}
 *   coordinador={<CoordinadorDashboard />}
 *   vendedor={<VendedorDashboard />}
 * />
 * ```
 */
export function RoleBasedContent({
  admin,
  coordinador,
  vendedor,
  gerente,
  fallback = null,
}: {
  admin?: ReactNode;
  coordinador?: ReactNode;
  vendedor?: ReactNode;
  gerente?: ReactNode;
  fallback?: ReactNode;
}) {
  const { usuario } = usePermissions();

  if (!usuario) return <>{fallback}</>;

  switch (usuario.rol) {
    case 'ROL_ADMIN':
      return <>{admin || fallback}</>;
    case 'ROL_COORDINADOR_VENTAS':
      return <>{coordinador || fallback}</>;
    case 'ROL_VENDEDOR':
      return <>{vendedor || fallback}</>;
    case 'ROL_GERENTE':
      return <>{gerente || fallback}</>;
    default:
      return <>{fallback}</>;
  }
}
