import type { SupabaseClient } from "@supabase/supabase-js";

interface RolRelacion {
  nombre: string | null;
}

interface AdminUser {
  id: string;
  email: string | null;
  nombre_completo: string | null;
  rol: RolRelacion | RolRelacion[] | null;
}

export async function notifyAdminsOfSecurityEvent(
  supabase: SupabaseClient<any, any, any, any, any>,
  titulo: string,
  mensaje: string,
  metadata?: Record<string, unknown>
) {
  try {
    // Callers pass the raw service-role client (no schema preset), so this
    // must scope to "crm" itself — otherwise it silently queries "public".
    const { data: rows, error } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("id, email, nombre_completo, rol:rol!usuario_perfil_rol_id_fkey(nombre)")
      .eq("activo", true);

    if (error) {
      console.error("No se pudieron obtener administradores para la alerta de seguridad:", error);
      return;
    }

    // `.eq()` can't filter on an embedded relation expression — resolve the
    // rol name in JS instead (same pattern as getResumenGeneral / the
    // reportes-alertas cron).
    const admins = (rows ?? []).filter((row: AdminUser) => {
      const rolObj = Array.isArray(row.rol) ? row.rol[0] : row.rol;
      return rolObj?.nombre === "ROL_ADMIN";
    });

    if (admins.length === 0) {
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

    const { error: insertError } = await supabase.schema("crm").from("notificacion").insert(payload);

    if (insertError) {
      console.error("Error creando notificaciones de alerta de seguridad:", insertError);
    }
  } catch (error) {
    console.error("Error enviando notificación de seguridad a administradores:", error);
  }
}
