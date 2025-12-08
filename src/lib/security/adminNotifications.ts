import type { SupabaseClient } from "@supabase/supabase-js";

interface AdminUser {
  id: string;
  email: string | null;
  nombre_completo: string | null;
}

export async function notifyAdminsOfSecurityEvent(
  supabase: SupabaseClient<any, any, any, any, any>,
  titulo: string,
  mensaje: string,
  metadata?: Record<string, unknown>
) {
  try {
    const { data: admins, error } = await supabase
      .from("usuario_perfil")
      .select("id, email, nombre_completo")
      .eq("activo", true)
      .eq("rol:rol!usuario_perfil_rol_id_fkey(nombre)", "ROL_ADMIN");

    if (error) {
      console.error("No se pudieron obtener administradores para la alerta de seguridad:", error);
      return;
    }

    if (!admins || admins.length === 0) {
      console.warn("No hay administradores activos para recibir la alerta de seguridad.");
      return;
    }

    const payload = admins.map((admin: AdminUser) => ({
      usuario_id: admin.id,
      tipo: "sistema",
      titulo,
      mensaje,
      data: {
        ...metadata,
        admin: {
          id: admin.id,
          nombre: admin.nombre_completo ?? null,
          email: admin.email ?? null,
        },
      },
    }));

    const { error: insertError } = await supabase.from("notificacion").insert(payload);

    if (insertError) {
      console.error("Error creando notificaciones de alerta de seguridad:", insertError);
    }
  } catch (error) {
    console.error("Error enviando notificación de seguridad a administradores:", error);
  }
}
