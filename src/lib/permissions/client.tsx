'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { PermisoCodigo, UsuarioConPermisos, RolNombre } from './types';

type PermissionsState = {
  usuario: UsuarioConPermisos | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

const PermissionsContext = createContext<PermissionsState | undefined>(undefined);

async function fetchPermisos(): Promise<UsuarioConPermisos | null> {
  const response = await fetch('/api/auth/permissions', { cache: 'no-store' });
  if (!response.ok) throw new Error('Error obteniendo permisos');
  const data = await response.json();
  return data.usuario as UsuarioConPermisos | null;
}

export function PermissionsProvider({
  initialUsuario,
  children,
}: {
  initialUsuario: UsuarioConPermisos | null;
  children: ReactNode;
}) {
  const [usuario, setUsuario] = useState<UsuarioConPermisos | null>(initialUsuario);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchPermisos();
      setUsuario(next);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <PermissionsContext.Provider value={{ usuario, loading, error, refetch }}>
      {children}
    </PermissionsContext.Provider>
  );
}

function useStandalonePermissions(enabled: boolean): PermissionsState {
  const [usuario, setUsuario] = useState<UsuarioConPermisos | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);
  const retryCount = useRef(0);
  const MAX_RETRIES = 2;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const next = await fetchPermisos();
      setUsuario(next);
      setError(null);
      retryCount.current = 0;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
      setUsuario(null);
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current += 1;
        const delay = retryCount.current * 1500;
        setTimeout(() => load(), delay);
        return;
      }
    } finally {
      if (retryCount.current === 0 || retryCount.current >= MAX_RETRIES) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    retryCount.current = 0;
    load();
  }, [enabled, load]);

  return { usuario, loading, error, refetch: load };
}

/**
 * Hook para obtener los permisos del usuario actual.
 * Prefiere el PermissionsContext del layout; si no existe, hace fetch standalone.
 */
export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  const standalone = useStandalonePermissions(ctx === undefined);
  const { usuario, loading, error, refetch } = ctx ?? standalone;

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

  const esAdmin = useCallback((): boolean => tieneRol('ROL_ADMIN'), [tieneRol]);
  const esCoordinador = useCallback((): boolean => tieneRol('ROL_COORDINADOR_VENTAS'), [tieneRol]);
  const esVendedor = useCallback((): boolean => tieneRol('ROL_VENDEDOR'), [tieneRol]);
  const esAdminOCoordinador = useCallback(
    (): boolean => tieneAlgunoDeRoles(['ROL_ADMIN', 'ROL_COORDINADOR_VENTAS']),
    [tieneAlgunoDeRoles]
  );

  return {
    usuario,
    loading,
    error,
    refetch,
    tienePermiso,
    tieneAlgunoDePermisos,
    tieneTodosLosPermisos,
    tieneRol,
    tieneAlgunoDeRoles,
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
