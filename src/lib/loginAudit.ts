import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

const LOGIN_AUDIT_TABLE = "login_audit";

const isMissingTable = (error: PostgrestError | null | undefined) =>
  error?.code === "PGRST205";

const missingTableWarning = (context: string) =>
  console.warn(
    `[login_audit] Tabla no encontrada (${context}). Se omite el registro hasta que la migración esté aplicada.`
  );

/**
 * Maneja errores al interactuar con la tabla login_audit.
 * @returns true si el error fue manejado (tabla inexistente), false en caso contrario.
 */
export const handleLoginAuditError = (
  error: PostgrestError | null,
  context: string
): boolean => {
  if (!error) return false;
  if (isMissingTable(error)) {
    missingTableWarning(context);
    return true;
  }
  console.error(`[login_audit] Error en ${context}:`, error);
  return false;
};

export const logLoginAudit = async (
  supabase: SupabaseClient<any, any, any>,
  payload: Record<string, unknown>,
  context: string
) => {
  const { error } = await supabase.schema("crm").from(LOGIN_AUDIT_TABLE).insert(payload);
  handleLoginAuditError(error, context);
};

export const resolveLoginAuditCount = (
  count: number | null,
  error: PostgrestError | null,
  context: string
): number => {
  if (error) {
    handleLoginAuditError(error, context);
    return 0;
  }
  return count ?? 0;
};
