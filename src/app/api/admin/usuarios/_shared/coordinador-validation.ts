/**
 * Validates that coordinadorId (if provided and non-null) resolves to an
 * active ROL_COORDINADOR_VENTAS user. Returns null when valid (including
 * when coordinadorId is undefined/null/"" — "no coordinador" is always valid),
 * or an error message string when invalid.
 */
export async function validarCoordinadorId(
  supabase: any,
  coordinadorId: unknown,
): Promise<string | null> {
  if (coordinadorId === undefined || coordinadorId === null || coordinadorId === "") {
    return null;
  }
  if (typeof coordinadorId !== "string") {
    return "El coordinador especificado no es válido";
  }

  const { data: coordinador, error } = await supabase
    .schema("crm")
    .from("usuario_perfil")
    .select("id, activo, rol:rol!usuario_perfil_rol_id_fkey(nombre)")
    .eq("id", coordinadorId)
    .is("deleted_at", null)
    .single();

  if (error || !coordinador || !coordinador.activo) {
    return "El coordinador especificado no existe o está inactivo";
  }

  const rolNombre = Array.isArray(coordinador.rol) ? coordinador.rol[0]?.nombre : coordinador.rol?.nombre;
  if (rolNombre !== "ROL_COORDINADOR_VENTAS") {
    return "El usuario seleccionado no tiene el rol de coordinador";
  }

  return null;
}
