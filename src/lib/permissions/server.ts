import 'server-only';
import { createServerOnlyClient, getCachedAuthUser } from '@/lib/supabase.server';
import type {
  PermisoCodigo,
  UsuarioConPermisos,
  PermisoVerificacion,
  VerificarPermisoOpciones,
  RolNombre,
  AuditoriaMetadata,
} from './types';

/**
 * Obtiene los permisos del usuario actual
 */
export async function obtenerPermisosUsuario(): Promise<UsuarioConPermisos | null> {
  try {
    const supabase = await createServerOnlyClient();
    // Usar función cacheada para evitar rate limits
    const { user } = await getCachedAuthUser();

    if (!user) return null;

    // Obtener perfil y permisos
    const { data: perfil, error } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select(`
        id,
        nombre_completo,
        username,
        activo,
        rol:rol!usuario_perfil_rol_id_fkey (
          nombre,
          permisos
        )
      `)
      .eq('id', user.id)
      .single();

    if (error || !perfil || !perfil.activo) {
      return null;
    }

    const rol = Array.isArray(perfil.rol) ? perfil.rol[0] : perfil.rol;
    const permisos = (rol?.permisos || []) as PermisoCodigo[];

    return {
      id: perfil.id,
      email: user.email,
      nombre_completo: perfil.nombre_completo,
      username: perfil.username,
      rol: rol?.nombre as RolNombre,
      permisos,
      activo: perfil.activo,
    };
  } catch (error) {
    console.error('Error obteniendo permisos del usuario:', error);
    return null;
  }
}

/**
 * Verifica si el usuario tiene un permiso específico
 */
export async function tienePermiso(
  permiso: PermisoCodigo,
  opciones?: VerificarPermisoOpciones
): Promise<boolean> {
  const resultado = await verificarPermiso(permiso, opciones);
  return resultado.permitido;
}

/**
 * Verifica un permiso y retorna información detallada
 */
export async function verificarPermiso(
  permiso: PermisoCodigo,
  opciones: VerificarPermisoOpciones = {}
): Promise<PermisoVerificacion> {
  try {
    const usuario = await obtenerPermisosUsuario();

    if (!usuario) {
      await registrarAuditoriaPermiso(null, permiso, 'denegado', opciones.metadata);

      if (opciones.lanzarError) {
        throw new Error('Usuario no autenticado');
      }

      return {
        permitido: false,
        razon: 'no_autenticado',
      };
    }

    // Verificar si tiene el permiso
    const tienePermiso = usuario.permisos.includes(permiso);

    if (!tienePermiso) {
      if (opciones.registrarAuditoria !== false) {
        await registrarAuditoriaPermiso(usuario.id, permiso, 'denegado', opciones.metadata);
      }

      if (opciones.lanzarError) {
        throw new Error(`Permiso denegado: ${permiso}`);
      }

      return {
        permitido: false,
        razon: 'permiso_no_asignado',
      };
    }

    // Verificar condiciones adicionales si existen
    const condicion = await verificarCondicionPermiso(
      usuario.id,
      permiso,
      opciones.valorActual ?? undefined
    );

    if (!condicion.permitido) {
      if (opciones.registrarAuditoria !== false) {
        await registrarAuditoriaPermiso(usuario.id, permiso, 'denegado', {
          ...opciones.metadata,
          razon_condicion: condicion.razon,
        });
      }

      if (opciones.lanzarError) {
        throw new Error(`Permiso denegado por condición: ${condicion.razon}`);
      }

      return condicion;
    }

    // Registrar éxito si está habilitado
    if (opciones.registrarAuditoria) {
      await registrarAuditoriaPermiso(usuario.id, permiso, 'exitoso', opciones.metadata);
    }

    return {
      ...condicion,
      permitido: true,
    };
  } catch (error) {
    console.error('Error verificando permiso:', error);

    if (opciones.lanzarError) {
      throw error;
    }

    return {
      permitido: false,
      razon: 'error_verificacion',
    };
  }
}

/**
 * Verifica condiciones adicionales de un permiso (límites, aprobaciones, etc.)
 */
async function verificarCondicionPermiso(
  userId: string,
  permiso: PermisoCodigo,
  valorActual?: number
): Promise<PermisoVerificacion> {
  try {
    const supabase = await createServerOnlyClient();

    const { data, error } = await supabase
      .schema('crm')
    .rpc('verificar_condicion_permiso', {
        p_usuario_id: userId,
        p_permiso_codigo: permiso,
        p_valor_actual: valorActual || null,
      });

    if (error) {
      console.error('Error verificando condición de permiso:', error);
      return { permitido: true }; // Por defecto, permitir si no se puede verificar
    }

    // La función SQL retorna TABLE, así que data es un array
    const resultado = Array.isArray(data) ? data[0] : data;

    // Si no hay resultado, permitir por defecto
    if (!resultado) {
      return { permitido: true };
    }

    return resultado as PermisoVerificacion;
  } catch (error) {
    console.error('Error en verificarCondicionPermiso:', error);
    return { permitido: true };
  }
}

/**
 * Verifica si el usuario tiene alguno de los permisos especificados
 */
export async function tieneAlgunoDePermisos(
  permisos: PermisoCodigo[]
): Promise<boolean> {
  const usuario = await obtenerPermisosUsuario();
  if (!usuario) return false;

  return permisos.some(permiso => usuario.permisos.includes(permiso));
}

/**
 * Verifica si el usuario tiene todos los permisos especificados
 */
export async function tieneTodosLosPermisos(
  permisos: PermisoCodigo[]
): Promise<boolean> {
  const usuario = await obtenerPermisosUsuario();
  if (!usuario) return false;

  return permisos.every(permiso => usuario.permisos.includes(permiso));
}

/**
 * Verifica si el usuario tiene un rol específico
 */
export async function tieneRol(rol: RolNombre): Promise<boolean> {
  const usuario = await obtenerPermisosUsuario();
  return usuario?.rol === rol;
}

/**
 * Verifica si el usuario tiene alguno de los roles especificados
 */
export async function tieneAlgunoDeRoles(roles: RolNombre[]): Promise<boolean> {
  const usuario = await obtenerPermisosUsuario();
  if (!usuario) return false;

  return roles.includes(usuario.rol);
}

/**
 * Registra una acción en la auditoría de permisos
 */
async function registrarAuditoriaPermiso(
  userId: string | null,
  permiso: PermisoCodigo,
  resultado: 'exitoso' | 'denegado' | 'error',
  metadata?: unknown
): Promise<void> {
  try {
    const supabase = await createServerOnlyClient();

    await supabase
      .schema('crm')
      .from('auditoria_permiso')
      .insert({
        usuario_id: userId,
        permiso_codigo: permiso,
        accion: permiso.split('.')[1] || 'unknown',
        recurso_tipo: permiso.split('.')[0] || 'unknown',
        resultado,
        metadata: metadata || {},
        ip_address: null, // TODO: Obtener IP del request
        user_agent: null, // TODO: Obtener user agent del request
      });
  } catch (error) {
    // No lanzar error si falla la auditoría
    console.error('Error registrando auditoría de permiso:', error);
  }
}

/**
 * Requiere que el usuario tenga un permiso específico (lanza error si no)
 */
export async function requierePermiso(
  permiso: PermisoCodigo,
  metadata?: AuditoriaMetadata,
  opciones?: Omit<VerificarPermisoOpciones, 'metadata'>
): Promise<void> {
  await verificarPermiso(permiso, {
    lanzarError: true,
    registrarAuditoria: true,
    metadata,
    ...opciones,
  });
}

/**
 * Requiere que el usuario tenga un rol específico (lanza error si no)
 */
export async function requiereRol(rol: RolNombre): Promise<void> {
  const tieneElRol = await tieneRol(rol);

  if (!tieneElRol) {
    throw new Error(`Se requiere el rol: ${rol}`);
  }
}

/**
 * Helper para verificar si es admin
 */
export async function esAdmin(): Promise<boolean> {
  return tieneRol('ROL_ADMIN');
}

/**
 * Helper para verificar si es coordinador
 */
export async function esCoordinador(): Promise<boolean> {
  return tieneRol('ROL_COORDINADOR_VENTAS');
}

/**
 * Helper para verificar si es vendedor
 */
export async function esVendedor(): Promise<boolean> {
  return tieneRol('ROL_VENDEDOR');
}

/**
 * Helper para verificar si es admin o coordinador
 */
export async function esAdminOCoordinador(): Promise<boolean> {
  return tieneAlgunoDeRoles(['ROL_ADMIN', 'ROL_COORDINADOR_VENTAS']);
}
