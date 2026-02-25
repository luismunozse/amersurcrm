import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

const AUDITORIA_TABLE = "auditoria_usuarios";

const isMissingTable = (error: PostgrestError | null | undefined) =>
  error?.code === "PGRST205";

type AccionAuditoria =
  | "crear"
  | "editar"
  | "activar"
  | "desactivar"
  | "eliminar"
  | "resetear_password"
  | "restaurar";

interface AuditoriaParams {
  adminId: string;
  adminNombre: string;
  usuarioId: string;
  usuarioNombre: string;
  accion: AccionAuditoria;
  detalles?: Record<string, unknown>;
}

/**
 * Registra una operación admin en la tabla de auditoría.
 * Si la tabla no existe (migración pendiente), se omite silenciosamente.
 * Nunca lanza excepciones — es seguro llamarla sin try/catch.
 */
export async function registrarAuditoriaUsuario(
  supabase: SupabaseClient<any, any, any>,
  params: AuditoriaParams
): Promise<void> {
  try {
    const { error } = await supabase
      .schema("crm")
      .from(AUDITORIA_TABLE)
      .insert({
        admin_id: params.adminId,
        admin_nombre: params.adminNombre,
        usuario_id: params.usuarioId,
        usuario_nombre: params.usuarioNombre,
        accion: params.accion,
        detalles: params.detalles || {},
      });

    if (error) {
      if (isMissingTable(error)) {
        console.warn(
          `[auditoria_usuarios] Tabla no encontrada. Se omite el registro hasta que la migración esté aplicada.`
        );
        return;
      }
      console.error(`[auditoria_usuarios] Error registrando ${params.accion}:`, error);
    }
  } catch (err) {
    console.error(`[auditoria_usuarios] Error inesperado:`, err);
  }
}
