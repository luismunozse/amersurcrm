/**
 * @deprecated Este módulo ha sido deprecado.
 *
 * Por favor usa "@/lib/permissions/server" en su lugar.
 *
 * Ejemplo de migración:
 *
 * ANTES:
 *   import { esAdmin, esVendedor, obtenerPerfilUsuario } from "@/lib/auth/roles";
 *
 * DESPUÉS:
 *   import { esAdmin, esVendedor, obtenerPermisosUsuario } from "@/lib/permissions/server";
 *
 * El nuevo sistema ofrece funciones adicionales:
 *   - esAdmin() - verifica rol ROL_ADMIN
 *   - esVendedor() - verifica rol ROL_VENDEDOR
 *   - esCoordinador() - verifica rol ROL_COORDINADOR_VENTAS
 *   - esGerente() - verifica rol ROL_GERENTE
 *   - esAdminOCoordinador() - verifica ROL_ADMIN o ROL_COORDINADOR_VENTAS
 *   - esAdminOGerente() - verifica ROL_ADMIN o ROL_GERENTE
 *   - tieneRol(rol) - verifica cualquier rol
 *   - tieneAlgunoDeRoles([roles]) - verifica si tiene alguno de los roles
 *   - obtenerPermisosUsuario() - obtiene información completa del usuario
 */

// Re-exportar desde el nuevo módulo para mantener retrocompatibilidad temporal
export {
  esAdmin,
  esVendedor,
  tienePermiso,
  obtenerPermisosUsuario as obtenerPerfilUsuario,
} from "@/lib/permissions/server";
export type { UsuarioConPermisos, UsuarioConPermisos as UsuarioPerfil } from "@/lib/permissions/types";
