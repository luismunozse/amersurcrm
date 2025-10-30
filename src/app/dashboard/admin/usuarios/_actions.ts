
"use server";

import { createServerActionClient } from "@/lib/supabase.server-actions";
import { createServiceRoleClient } from "@/lib/supabase.server";
import { revalidatePath } from "next/cache";

/**
 * Genera una contraseña temporal aleatoria segura
 * Incluye mayúsculas, minúsculas, números y caracteres especiales
 * Longitud mínima: 12 caracteres
 */
function generarPasswordTemporal(): string {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%&*-_+=';

  // Garantizar al menos un caracter de cada tipo
  let password = '';
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += special.charAt(Math.floor(Math.random() * special.length));

  // Completar hasta 12 caracteres con caracteres aleatorios
  const allChars = lowercase + uppercase + numbers + special;
  for (let i = password.length; i < 12; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  // Mezclar los caracteres para que no sean predecibles
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Resetea la contraseña de un usuario y marca que requiere cambio
 */
export async function resetearPasswordUsuario(userId: string) {
  const supabase = await createServerActionClient();
  const serviceRole = createServiceRoleClient();

  try {
    // Generar nueva contraseña temporal
    const passwordTemporal = generarPasswordTemporal();

    // Actualizar contraseña en Supabase Auth usando service role (requiere permisos admin)
    const { error: authError } = await serviceRole.auth.admin.updateUserById(
      userId,
      { password: passwordTemporal }
    );

    if (authError) {
      throw new Error(`Error actualizando contraseña: ${authError.message}`);
    }

    // Marcar que requiere cambio de contraseña en el perfil
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
      .schema('crm')
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

    if (!user || !user.email) {
      return { success: false, error: 'No autenticado' };
    }

    // Validar que la contraseña nueva tenga al menos 6 caracteres
    if (!passwordNueva || passwordNueva.length < 6) {
      return {
        success: false,
        error: 'La contraseña nueva debe tener al menos 6 caracteres'
      };
    }

    // Validar la contraseña actual intentando autenticar con un cliente temporal
    // Esto NO afecta la sesión actual porque usamos un cliente anónimo
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
      return {
        success: false,
        error: 'La contraseña actual es incorrecta'
      };
    }

    // Si llegamos aquí, la contraseña actual es correcta
    // Actualizar contraseña con el cliente del usuario actual
    const { error: updateError } = await supabase.auth.updateUser({
      password: passwordNueva
    });

    if (updateError) {
      return {
        success: false,
        error: updateError.message || 'Error actualizando contraseña'
      };
    }

    // Marcar que ya no requiere cambio de contraseña
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
      .schema('crm')
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
      .schema('crm')
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

    // Primero eliminar el usuario de Supabase Auth usando service role
    const { error: authError } = await serviceRole.auth.admin.deleteUser(userId);

    if (authError) {
      throw new Error(`Error eliminando usuario de Auth: ${authError.message}`);
    }

    // Luego eliminar el perfil del usuario
    const { error: profileError } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .delete()
      .eq('id', userId);

    if (profileError) {
      // Si falla el perfil pero ya se eliminó el auth user, registrar el error pero continuar
      console.error('Error eliminando perfil después de eliminar auth user:', profileError);
      // Intentar recrear el auth user sería complejo, mejor loguear y notificar
      throw new Error(`Usuario eliminado de Auth pero error al eliminar perfil: ${profileError.message}`);
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
