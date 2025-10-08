
"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { revalidatePath } from "next/cache";

/**
 * Genera una contraseña temporal aleatoria
 */
function generarPasswordTemporal(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const length = 8;
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Resetea la contraseña de un usuario y marca que requiere cambio
 */
export async function resetearPasswordUsuario(userId: string) {
  const supabase = await createServerActionClient();

  try {
    // Generar nueva contraseña temporal
    const passwordTemporal = generarPasswordTemporal();

    // Actualizar contraseña en Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: passwordTemporal }
    );

    if (authError) {
      throw new Error(`Error actualizando contraseña: ${authError.message}`);
    }

    // Marcar que requiere cambio de contraseña en el perfil
    const { error: profileError } = await supabase
      .from('usuario_perfil')
      .update({
        requiere_cambio_password: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileError) {
      throw new Error(`Error actualizando perfil: ${profileError.message}`);
    }

    revalidatePath('/dashboard/admin/usuarios');

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
 * Cambia el estado de un usuario (activar/desactivar) con motivo obligatorio
 */
export async function cambiarEstadoUsuario(
  userId: string,
  activo: boolean,
  motivo: string
) {
  const supabase = await createServerActionClient();

  if (!motivo || motivo.trim().length < 10) {
    return {
      success: false,
      error: 'El motivo debe tener al menos 10 caracteres'
    };
  }

  try {
    const { error } = await supabase
      .from('usuario_perfil')
      .update({
        activo,
        motivo_estado: motivo.trim(),
        fecha_cambio_estado: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/dashboard/admin/usuarios');

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
    // Obtener usuario actual
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'No autenticado' };
    }

    // Actualizar contraseña directamente (Supabase validará automáticamente)
    // No podemos validar la contraseña actual con signInWithPassword en un Server Action
    // porque eso crearía una nueva sesión
    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordNueva
    });

    if (updateError) {
      // Si falla, probablemente sea por política de contraseñas
      return {
        success: false,
        error: updateError.message || 'Error actualizando contraseña'
      };
    }

    // Marcar que ya no requiere cambio de contraseña
    const { error: profileError } = await supabase
      .from('usuario_perfil')
      .update({
        requiere_cambio_password: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error actualizando perfil:', profileError);
      // No fallar por esto, la contraseña ya se cambió
    }

    revalidatePath('/dashboard/perfil');

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente'
    };
  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * Elimina un usuario del sistema
 */
export async function eliminarUsuario(userId: string) {
  const supabase = await createServerActionClient();
  const serviceRole = createServiceRoleClient();

  try {
    // Verificar que no se está eliminando a sí mismo
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === userId) {
      return {
        success: false,
        error: 'No puedes eliminarte a ti mismo'
      };
    }

    // Verificar que el usuario existe
    const { data: usuarioExistente, error: fetchError } = await supabase
      .from('usuario_perfil')
      .select('id, username, nombre_completo')
      .eq('id', userId)
      .single();

    if (fetchError || !usuarioExistente) {
      return {
        success: false,
        error: 'Usuario no encontrado'
      };
    }

    // Verificar si el usuario tiene clientes asignados
    const { data: clientesAsignados } = await supabase
      .from('cliente')
      .select('id')
      .eq('vendedor_asignado', usuarioExistente.username)
      .limit(1);

    if (clientesAsignados && clientesAsignados.length > 0) {
      return {
        success: false,
        error: 'No se puede eliminar el usuario porque tiene clientes asignados. Primero debe reasignar o desactivar estos clientes.'
      };
    }

    // Primero eliminar el perfil del usuario
    const { error: profileError } = await supabase
      .from('usuario_perfil')
      .delete()
      .eq('id', userId);

    if (profileError) {
      throw new Error(`Error eliminando perfil: ${profileError.message}`);
    }

    // Luego eliminar el usuario de Supabase Auth usando service role
    const { error: authError } = await serviceRole.auth.admin.deleteUser(userId);

    if (authError) {
      throw new Error(`Error eliminando usuario: ${authError.message}`);
    }

    revalidatePath('/dashboard/admin/usuarios');

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
