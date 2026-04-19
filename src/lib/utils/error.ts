/**
 * Lee de forma segura el `.code` de un error de Supabase/Postgrest/Auth.
 * Evita `as any` para casos donde solo querés el code string si existe.
 */
export function getErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}
