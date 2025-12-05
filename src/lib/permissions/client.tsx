'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PermisoCodigo, UsuarioConPermisos, RolNombre } from './types';

/**
 * Hook para obtener los permisos del usuario actual
 */
export function usePermissions() {
  const [usuario, setUsuario] = useState<UsuarioConPermisos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/permissions');

      if (!response.ok) {
        throw new Error('Error obteniendo permisos');
      }

      const data = await response.json();
      setUsuario(data.usuario);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
      setUsuario(null);
    } finally {
      setLoading(false);
    }
  };

  const tienePermiso = useCallback(
    (permiso: PermisoCodigo): boolean => {
      if (!usuario) return false;
      return usuario.permisos.includes(permiso);
    },
    [usuario]
  );

  const tieneAlgunoDePermisos = useCallback(
    (permisos: PermisoCodigo[]): boolean => {
      if (!usuario) return false;
      return permisos.some(permiso => usuario.permisos.includes(permiso));
    },
    [usuario]
  );

  const tieneTodosLosPermisos = useCallback(
    (permisos: PermisoCodigo[]): boolean => {
      if (!usuario) return false;
      return permisos.every(permiso => usuario.permisos.includes(permiso));
    },
    [usuario]
  );

  const tieneRol = useCallback(
    (rol: RolNombre): boolean => {
      if (!usuario) return false;
      return usuario.rol === rol;
    },
    [usuario]
  );

  const tieneAlgunoDeRoles = useCallback(
    (roles: RolNombre[]): boolean => {
      if (!usuario) return false;
      return roles.includes(usuario.rol);
    },
    [usuario]
  );

  const esAdmin = useCallback((): boolean => {
    return tieneRol('ROL_ADMIN');
  }, [tieneRol]);

  const esCoordinador = useCallback((): boolean => {
    return tieneRol('ROL_COORDINADOR_VENTAS');
  }, [tieneRol]);

  const esVendedor = useCallback((): boolean => {
    return tieneRol('ROL_VENDEDOR');
  }, [tieneRol]);

  const esAdminOCoordinador = useCallback((): boolean => {
    return tieneAlgunoDeRoles(['ROL_ADMIN', 'ROL_COORDINADOR_VENTAS']);
  }, [tieneAlgunoDeRoles]);

  return {
    usuario,
    loading,
    error,
    refetch: fetchPermissions,
    // Métodos de verificación
    tienePermiso,
    tieneAlgunoDePermisos,
    tieneTodosLosPermisos,
    tieneRol,
    tieneAlgunoDeRoles,
    // Helpers de rol
    esAdmin,
    esCoordinador,
    esVendedor,
    esAdminOCoordinador,
  };
}

/**
 * Hook simplificado que solo verifica un permiso
 */
export function usePermiso(permiso: PermisoCodigo) {
  const { tienePermiso, loading } = usePermissions();
  return {
    permitido: tienePermiso(permiso),
    loading,
  };
}

/**
 * Hook simplificado que solo verifica un rol
 */
export function useRol(rol: RolNombre) {
  const { tieneRol, loading } = usePermissions();
  return {
    tieneRol: tieneRol(rol),
    loading,
  };
}
