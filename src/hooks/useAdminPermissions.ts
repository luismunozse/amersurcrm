"use client";

import { useMemo } from "react";
import { usePermissions, PERMISOS } from "@/lib/permissions";

interface AdminPermissions {
  isAdmin: boolean;
  loading: boolean;
  canCreateProjects: boolean;
  canCreateProperties: boolean;
  canManageUsers: boolean;
}

export function useAdminPermissions(): AdminPermissions {
  const {
    loading,
    esAdmin,
    tienePermiso,
  } = usePermissions();

  const computed = useMemo(() => {
    const esAdminActual = esAdmin();
    return {
      isAdmin: esAdminActual,
      loading,
      canCreateProjects: esAdminActual || tienePermiso(PERMISOS.PROYECTOS.CREAR),
      canCreateProperties: esAdminActual || tienePermiso(PERMISOS.LOTES.CREAR),
      canManageUsers: esAdminActual || tienePermiso(PERMISOS.USUARIOS.VER),
    };
  }, [esAdmin, loading, tienePermiso]);

  return computed;
}
