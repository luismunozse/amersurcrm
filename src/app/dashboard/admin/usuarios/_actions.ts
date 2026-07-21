
"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { revalidatePath } from "next/cache";
import { esAdmin } from "@/lib/permissions/server";
import { registrarAuditoriaUsuario } from "@/lib/auditoria-usuarios";
import { validarCoordinadorId } from "@/app/api/admin/usuarios/_shared/coordinador-validation";

/**
 * Decision the admin must make when deactivating/deleting a coordinador
 * who still has team members (`usuario_perfil.coordinador_id = target`).
 * Mirrors the existing "reassign clientes on delete" pattern one level up
 * the org chart.
 */
export type EquipoDecision = { transferirA: string } | { dejarSinCoordinador: true };

type EquipoDecisionOutcome =
  | { ok: true; moved: number }
  | { ok: false; needsDecision: true; equipoSize: number }
  | { ok: false; needsDecision: false; error: string };

/**
 * If `coordinadorId` is a ROL_COORDINADOR_VENTAS user with team members
 * (usuario_perfil.coordinador_id = coordinadorId, excluding soft-deleted
 * rows), resolves what happens to that team before the coordinador is
 * deactivated/deleted:
 *   - no `equipoDecision` given → returns `needsDecision: true` so the
 *     caller can surface the mandatory decision step (never silently
 *     proceeds).
 *   - `{ transferirA }` → validates the target via the SAME shared
 *     validator the bulk-coordinador endpoint uses, rejects transferring
 *     to the coordinador being removed, then moves the whole team in one
 *     atomic UPDATE.
 *   - `{ dejarSinCoordinador: true }` → sets the whole team's
 *     coordinador_id to NULL (orphans, visible only to admin/gerente).
 * Every moved vendedor gets one historial_cambios_usuario row + one
 * registrarAuditoriaUsuario call (same mechanism as the bulk-coordinador
 * endpoint's `cambiados` loop).
 * Returns `{ ok: true, moved: 0 }` immediately when the target is not a
 * coordinador or has no team — the caller proceeds unchanged.
 */
async function resolverEquipoDelCoordinador(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  coordinadorId: string,
  rolNombre: string | null,
  equipoDecision: EquipoDecision | undefined,
  admin: { id: string; nombre: string } | null,
): Promise<EquipoDecisionOutcome> {
  if (rolNombre !== "ROL_COORDINADOR_VENTAS") {
    return { ok: true, moved: 0 };
  }

  const { data: equipoData, error: equipoError } = await serviceRole
    .schema("crm")
    .from("usuario_perfil")
    .select("id, nombre_completo")
    .eq("coordinador_id", coordinadorId)
    .is("deleted_at", null);

  if (equipoError) {
    return { ok: false, needsDecision: false, error: `Error verificando el equipo: ${equipoError.message}` };
  }

  const equipo = (equipoData || []) as { id: string; nombre_completo: string | null }[];
  if (equipo.length === 0) {
    return { ok: true, moved: 0 };
  }

  if (!equipoDecision) {
    return { ok: false, needsDecision: true, equipoSize: equipo.length };
  }

  let nuevoCoordinadorId: string | null;
  if ("transferirA" in equipoDecision) {
    if (!equipoDecision.transferirA) {
      return { ok: false, needsDecision: false, error: "Debe seleccionar un coordinador de destino" };
    }
    if (equipoDecision.transferirA === coordinadorId) {
      return { ok: false, needsDecision: false, error: "No puede transferir el equipo al mismo coordinador que está desactivando/eliminando" };
    }
    const errorCoordinador = await validarCoordinadorId(serviceRole, equipoDecision.transferirA);
    if (errorCoordinador) {
      return { ok: false, needsDecision: false, error: errorCoordinador };
    }
    nuevoCoordinadorId = equipoDecision.transferirA;
  } else if ("dejarSinCoordinador" in equipoDecision && equipoDecision.dejarSinCoordinador) {
    nuevoCoordinadorId = null;
  } else {
    return { ok: false, needsDecision: false, error: "Decisión de equipo inválida" };
  }

  const { error: updateError } = await serviceRole
    .schema("crm")
    .from("usuario_perfil")
    .update({ coordinador_id: nuevoCoordinadorId })
    .eq("coordinador_id", coordinadorId)
    .is("deleted_at", null);

  if (updateError) {
    return { ok: false, needsDecision: false, error: `Error moviendo el equipo: ${updateError.message}` };
  }

  const historialRows = equipo.map((v) => ({
    usuario_id: v.id,
    campo: "coordinador_id",
    valor_anterior: coordinadorId,
    valor_nuevo: nuevoCoordinadorId,
    modificado_por: admin?.id || coordinadorId,
  }));

  const { error: historialError } = await serviceRole.schema("crm").from("historial_cambios_usuario").insert(historialRows);
  if (historialError) {
    console.warn("[resolverEquipoDelCoordinador] Error registrando historial de cambios:", historialError);
  }

  if (admin) {
    for (const v of equipo) {
      await registrarAuditoriaUsuario(serviceRole, {
        adminId: admin.id,
        adminNombre: admin.nombre,
        usuarioId: v.id,
        usuarioNombre: v.nombre_completo || v.id,
        accion: "editar",
        detalles: { campos_modificados: ["coordinador_id"], origen: "lifecycle_coordinador" },
      });
    }
  }

  return { ok: true, moved: equipo.length };
}

/**
 * Helper: obtiene admin actual (id + nombre) para auditoría
 */
async function getAdminInfo() {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: perfil } = await supabase
    .schema('crm')
    .from('usuario_perfil')
    .select('nombre_completo')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    nombre: perfil?.nombre_completo || user.email || 'Admin',
    supabase,
  };
}

/**
 * Genera una contraseña temporal aleatoria segura
 */
function generarPasswordTemporal(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%&*-_+=';

  let password = '';
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += special.charAt(Math.floor(Math.random() * special.length));

  const allChars = lowercase + uppercase + numbers + special;
  for (let i = password.length; i < 12; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Resetea la contraseña de un usuario y marca que requiere cambio
 */
export async function resetearPasswordUsuario(userId: string) {
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    throw new Error("No tienes permisos para resetear contraseñas de usuarios");
  }

  const admin = await getAdminInfo();
  const supabase = admin?.supabase || (await createServerActionClient());
  const serviceRole = createServiceRoleClient();

  try {
    const { data: authUser, error: getUserError } = await serviceRole.auth.admin.getUserById(userId);
    if (getUserError || !authUser?.user) {
      throw new Error(`Usuario no encontrado en Auth: ${getUserError?.message || 'No existe'}`);
    }

    const passwordTemporal = generarPasswordTemporal();

    const { error: authError } = await serviceRole.auth.admin.updateUserById(
      userId,
      { password: passwordTemporal }
    );

    if (authError) {
      throw new Error(`Error actualizando contraseña: ${authError.message}`);
    }

    const { error: profileError } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .update({
        requiere_cambio_password: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      throw new Error(`Error actualizando perfil: ${profileError.message}`);
    }

    // Auditoría
    if (admin) {
      await registrarAuditoriaUsuario(serviceRole, {
        adminId: admin.id,
        adminNombre: admin.nombre,
        usuarioId: userId,
        usuarioNombre: authUser.user.email || userId,
        accion: 'resetear_password',
      });
    }

    return {
      success: true,
      passwordTemporal,
      message: 'Contraseña reseteada exitosamente'
    };
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Cambia el estado de un usuario (activar/desactivar) con motivo obligatorio.
 * Al desactivar, invalida la sesión del usuario.
 */
export async function cambiarEstadoUsuario(
  userId: string,
  activo: boolean,
  motivo: string,
  equipoDecision?: EquipoDecision
) {
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    return { success: false, error: "No tienes permisos para cambiar el estado de usuarios" };
  }

  if (!motivo || motivo.trim().length < 10) {
    return { success: false, error: 'El motivo debe tener al menos 10 caracteres' };
  }

  if (motivo.trim().length > 500) {
    return { success: false, error: 'El motivo no puede superar los 500 caracteres' };
  }

  const admin = await getAdminInfo();
  const serviceRole = createServiceRoleClient();

  try {
    const { data: usuarioExistente, error: fetchError } = await serviceRole
      .schema('crm')
      .from('usuario_perfil')
      .select('id, nombre_completo, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
      .eq('id', userId)
      .single();

    if (fetchError || !usuarioExistente) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    if (!activo) {
      const rolRaw = (usuarioExistente as any).rol;
      const rolNombre = Array.isArray(rolRaw) ? rolRaw[0]?.nombre ?? null : rolRaw?.nombre ?? null;
      const equipoOutcome = await resolverEquipoDelCoordinador(serviceRole, userId, rolNombre, equipoDecision, admin);
      if (!equipoOutcome.ok) {
        if (equipoOutcome.needsDecision) {
          return {
            success: false,
            needsEquipoDecision: true,
            equipoSize: equipoOutcome.equipoSize,
            error: 'Este coordinador tiene un equipo asignado. Debe indicar qué hacer con sus vendedores antes de continuar.',
          };
        }
        return { success: false, error: equipoOutcome.error };
      }
    }

    const { error } = await serviceRole
      .schema('crm')
      .from('usuario_perfil')
      .update({
        activo,
        motivo_estado: motivo.trim(),
        fecha_cambio_estado: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('activo')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Invalidar sesión al desactivar
    if (!activo) {
      try {
        await serviceRole.auth.admin.signOut(userId);
        console.log(`[CambiarEstado] Sesión invalidada para usuario ${userId}`);
      } catch (signOutErr) {
        console.warn(`[CambiarEstado] No se pudo invalidar sesión de ${userId}:`, signOutErr);
      }
    }

    // Auditoría
    if (admin) {
      await registrarAuditoriaUsuario(serviceRole, {
        adminId: admin.id,
        adminNombre: admin.nombre,
        usuarioId: userId,
        usuarioNombre: usuarioExistente.nombre_completo || userId,
        accion: activo ? 'activar' : 'desactivar',
        detalles: { motivo: motivo.trim() },
      });
    }

    return {
      success: true,
      message: `Usuario ${activo ? 'activado' : 'desactivado'} exitosamente`
    };
  } catch (error) {
    console.error('Error cambiando estado de usuario:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Cambia la contraseña del usuario actual desde su perfil
 */
export async function cambiarPasswordPerfil(
  passwordActual: string,
  passwordNueva: string
) {
  const supabase = await createServerActionClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) {
      return { success: false, error: 'No autenticado' };
    }

    if (!passwordNueva || passwordNueva.length < 8) {
      return { success: false, error: 'La contraseña nueva debe tener al menos 8 caracteres' };
    }

    const hasUppercase = /[A-Z]/.test(passwordNueva);
    const hasLowercase = /[a-z]/.test(passwordNueva);
    const hasNumber = /[0-9]/.test(passwordNueva);

    if (!hasUppercase || !hasLowercase || !hasNumber) {
      return {
        success: false,
        error: 'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
      };
    }

    const { createClient } = await import('@supabase/supabase-js');
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error: signInError } = await anonClient.auth.signInWithPassword({
      email: user.email,
      password: passwordActual,
    });

    if (signInError) {
      return { success: false, error: 'La contraseña actual es incorrecta' };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordNueva
    });

    if (updateError) {
      return { success: false, error: updateError.message || 'Error actualizando contraseña' };
    }

    const { error: profileError } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .update({
        requiere_cambio_password: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error actualizando perfil:', profileError);
    }

    revalidatePath('/dashboard/perfil');

    return { success: true, message: 'Contraseña actualizada exitosamente' };
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Soft-delete de un usuario (marca deleted_at en vez de eliminar).
 * Invalida la sesión y desactiva al usuario.
 */
export async function eliminarUsuario(userId: string, motivo?: string, equipoDecision?: EquipoDecision) {
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    return { success: false, error: "Solo administradores pueden eliminar usuarios" };
  }

  const admin = await getAdminInfo();
  const supabase = admin?.supabase || (await createServerActionClient());
  const serviceRole = createServiceRoleClient();

  try {
    // Verificar que no se está eliminando a sí mismo
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === userId) {
      return { success: false, error: 'No puedes eliminarte a ti mismo' };
    }

    // Verificar que el usuario existe y no está ya eliminado
    const { data: usuarioExistente, error: fetchError } = await serviceRole
      .schema('crm')
      .from('usuario_perfil')
      .select('id, username, nombre_completo, deleted_at, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
      .eq('id', userId)
      .single();

    if (fetchError || !usuarioExistente) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    if (usuarioExistente.deleted_at) {
      return { success: false, error: 'Este usuario ya fue eliminado' };
    }

    const rolRaw = (usuarioExistente as any).rol;
    const rolNombre = Array.isArray(rolRaw) ? rolRaw[0]?.nombre ?? null : rolRaw?.nombre ?? null;
    const equipoOutcome = await resolverEquipoDelCoordinador(serviceRole, userId, rolNombre, equipoDecision, admin);
    if (!equipoOutcome.ok) {
      if (equipoOutcome.needsDecision) {
        return {
          success: false,
          needsEquipoDecision: true,
          equipoSize: equipoOutcome.equipoSize,
          error: 'Este coordinador tiene un equipo asignado. Debe indicar qué hacer con sus vendedores antes de continuar.',
        };
      }
      return { success: false, error: equipoOutcome.error };
    }

    // Soft delete: marcar como eliminado + desactivar
    const { error: updateError } = await serviceRole
      .schema('crm')
      .from('usuario_perfil')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: admin?.id || user?.id,
        deleted_motivo: motivo?.trim() || 'Sin motivo especificado',
        activo: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Error en soft delete: ${updateError.message}`);
    }

    // Invalidar sesión del usuario eliminado
    try {
      await serviceRole.auth.admin.signOut(userId);
    } catch (signOutErr) {
      console.warn(`[EliminarUsuario] No se pudo invalidar sesión de ${userId}:`, signOutErr);
    }

    // Auditoría
    if (admin) {
      await registrarAuditoriaUsuario(serviceRole, {
        adminId: admin.id,
        adminNombre: admin.nombre,
        usuarioId: userId,
        usuarioNombre: usuarioExistente.nombre_completo || userId,
        accion: 'eliminar',
        detalles: { motivo: motivo?.trim() || 'Sin motivo', username: usuarioExistente.username },
      });
    }

    return {
      success: true,
      message: `Usuario ${usuarioExistente.nombre_completo} (@${usuarioExistente.username}) eliminado exitosamente`
    };
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Restaura un usuario soft-deleted.
 * El usuario queda inactivo (requiere activación manual posterior).
 */
export async function restaurarUsuario(userId: string) {
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    return { success: false, error: "Solo administradores pueden restaurar usuarios" };
  }

  const admin = await getAdminInfo();
  const serviceRole = createServiceRoleClient();

  try {
    const { data: usuario, error: fetchError } = await serviceRole
      .schema('crm')
      .from('usuario_perfil')
      .select('id, nombre_completo, deleted_at')
      .eq('id', userId)
      .single();

    if (fetchError || !usuario) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    if (!usuario.deleted_at) {
      return { success: false, error: 'Este usuario no está eliminado' };
    }

    const { error: updateError } = await serviceRole
      .schema('crm')
      .from('usuario_perfil')
      .update({
        deleted_at: null,
        deleted_by: null,
        deleted_motivo: null,
        activo: false, // Queda inactivo, admin debe activar manualmente
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`Error restaurando usuario: ${updateError.message}`);
    }

    // Auditoría
    if (admin) {
      await registrarAuditoriaUsuario(serviceRole, {
        adminId: admin.id,
        adminNombre: admin.nombre,
        usuarioId: userId,
        usuarioNombre: usuario.nombre_completo || userId,
        accion: 'restaurar',
      });
    }

    return {
      success: true,
      message: `Usuario ${usuario.nombre_completo} restaurado exitosamente (inactivo)`
    };
  } catch (error) {
    console.error('Error restaurando usuario:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Reasigna todos los clientes de un vendedor a otro vendedor.
 */
export async function reasignarClientes(
  fromUserId: string,
  toUserId: string
) {
  const isAdmin = await esAdmin();
  if (!isAdmin) {
    return { success: false, error: "Solo administradores pueden reasignar clientes" };
  }

  const admin = await getAdminInfo();
  const serviceRole = createServiceRoleClient();

  try {
    // Obtener usernames de ambos usuarios
    const { data: usuarios, error: fetchError } = await serviceRole
      .schema('crm')
      .from('usuario_perfil')
      .select('id, username, nombre_completo')
      .in('id', [fromUserId, toUserId]);

    if (fetchError || !usuarios || usuarios.length < 2) {
      return { success: false, error: 'No se encontraron ambos usuarios' };
    }

    const fromUser = usuarios.find(u => u.id === fromUserId);
    const toUser = usuarios.find(u => u.id === toUserId);

    if (!fromUser || !toUser) {
      return { success: false, error: 'No se encontraron ambos usuarios' };
    }

    // Contar clientes antes de reasignar
    const { count } = await serviceRole
      .schema('crm')
      .from('cliente')
      .select('id', { count: 'exact', head: true })
      .eq('vendedor_asignado', fromUser.username);

    // Reasignar clientes
    const { error: updateError } = await serviceRole
      .schema('crm')
      .from('cliente')
      .update({ vendedor_asignado: toUser.username })
      .eq('vendedor_asignado', fromUser.username);

    if (updateError) {
      throw new Error(`Error reasignando clientes: ${updateError.message}`);
    }

    // Auditoría
    if (admin) {
      await registrarAuditoriaUsuario(serviceRole, {
        adminId: admin.id,
        adminNombre: admin.nombre,
        usuarioId: fromUserId,
        usuarioNombre: fromUser.nombre_completo || fromUserId,
        accion: 'editar',
        detalles: {
          tipo: 'reasignacion_clientes',
          clientes_reasignados: count || 0,
          destino_id: toUserId,
          destino_nombre: toUser.nombre_completo,
          destino_username: toUser.username,
        },
      });
    }

    return {
      success: true,
      message: `${count || 0} cliente(s) reasignados de @${fromUser.username} a @${toUser.username}`,
      count: count || 0,
    };
  } catch (error) {
    console.error('Error reasignando clientes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Obtiene el conteo de clientes asignados a un usuario
 */
export async function contarClientesAsignados(userId: string) {
  // Server actions are publicly invokable endpoints — without this gate any
  // authenticated user could enumerate client counts per vendedor.
  if (!(await esAdmin())) return 0;

  const serviceRole = createServiceRoleClient();

  const { data: usuario } = await serviceRole
    .schema('crm')
    .from('usuario_perfil')
    .select('username')
    .eq('id', userId)
    .single();

  if (!usuario?.username) return 0;

  const { count } = await serviceRole
    .schema('crm')
    .from('cliente')
    .select('id', { count: 'exact', head: true })
    .eq('vendedor_asignado', usuario.username);

  return count || 0;
}
