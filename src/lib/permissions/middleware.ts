import 'server-only';
import { redirect } from 'next/navigation';
import {
  obtenerPermisosUsuario,
  tienePermiso,
  tieneRol,
  tieneAlgunoDeRoles,
} from './server';
import type { PermisoCodigo, RolNombre } from './types';

interface ProtegerRutaOpciones {
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
  /** Mensaje de error personalizado */
  mensajeError?: string;
}

/**
 * Protege una ruta verificando permisos
 * Úsalo al inicio de páginas que requieren permisos específicos
 *
 * @example
 * ```typescript
 * export default async function UsuariosPage() {
 *   await protegerRuta({ permiso: 'usuarios.ver' });
 *   // Tu código...
 * }
 * ```
 */
export async function protegerRuta(opciones: ProtegerRutaOpciones = {}): Promise<void> {
  const {
    permiso,
    permisos,
    rol,
    roles,
    redirectTo = '/dashboard',
    mensajeError,
  } = opciones;

  const usuario = await obtenerPermisosUsuario();

  // Si no está autenticado, redirigir a login
  if (!usuario) {
    redirect('/auth/login');
  }

  // Verificar permiso único
  if (permiso) {
    const tiene = await tienePermiso(permiso);
    if (!tiene) {
      console.warn(`Acceso denegado: usuario ${usuario.id} no tiene permiso ${permiso}`);
      redirect(redirectTo);
    }
    return;
  }

  // Verificar permisos alternativos (OR)
  if (permisos && permisos.length > 0) {
    const tieneAlguno = permisos.some(p => usuario.permisos.includes(p));
    if (!tieneAlguno) {
      console.warn(`Acceso denegado: usuario ${usuario.id} no tiene ninguno de ${permisos.join(', ')}`);
      redirect(redirectTo);
    }
    return;
  }

  // Verificar rol único
  if (rol) {
    const tieneElRol = await tieneRol(rol);
    if (!tieneElRol) {
      console.warn(`Acceso denegado: usuario ${usuario.id} no tiene rol ${rol}`);
      redirect(redirectTo);
    }
    return;
  }

  // Verificar roles alternativos (OR)
  if (roles && roles.length > 0) {
    const tieneAlgunRol = await tieneAlgunoDeRoles(roles);
    if (!tieneAlgunRol) {
      console.warn(`Acceso denegado: usuario ${usuario.id} no tiene ninguno de los roles ${roles.join(', ')}`);
      redirect(redirectTo);
    }
    return;
  }
}

/**
 * Protege una ruta solo para administradores
 */
export async function soloAdmins(redirectTo: string = '/dashboard'): Promise<void> {
  await protegerRuta({
    rol: 'ROL_ADMIN',
    redirectTo,
  });
}

/**
 * Protege una ruta para administradores y coordinadores
 */
export async function soloAdminsYCoordinadores(redirectTo: string = '/dashboard'): Promise<void> {
  await protegerRuta({
    roles: ['ROL_ADMIN', 'ROL_COORDINADOR_VENTAS'],
    redirectTo,
  });
}

/**
 * Protege una ruta asegurando que el usuario esté autenticado
 */
export async function requiereAutenticacion(redirectTo: string = '/auth/login'): Promise<void> {
  const usuario = await obtenerPermisosUsuario();

  if (!usuario) {
    redirect(redirectTo);
  }
}

/**
 * Obtiene el usuario actual o lanza error si no está autenticado
 */
export async function obtenerUsuarioOError() {
  const usuario = await obtenerPermisosUsuario();

  if (!usuario) {
    throw new Error('Usuario no autenticado');
  }

  return usuario;
}

/**
 * Verifica si el usuario puede acceder a un recurso específico
 * Por ejemplo, si un vendedor puede ver/editar un cliente asignado a él
 */
export async function puedeAccederARecurso(
  permisoGeneral: PermisoCodigo,
  permisoEspecifico: PermisoCodigo,
  validacionPersonalizada: () => Promise<boolean>
): Promise<boolean> {
  // Si tiene permiso general (ej: ver_todos), permitir
  const tieneGeneral = await tienePermiso(permisoGeneral);
  if (tieneGeneral) return true;

  // Si tiene permiso específico (ej: ver_propios), verificar validación
  const tieneEspecifico = await tienePermiso(permisoEspecifico);
  if (!tieneEspecifico) return false;

  // Ejecutar validación personalizada (ej: es su cliente asignado)
  return await validacionPersonalizada();
}
