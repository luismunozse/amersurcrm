const ROL_COORDINADOR = "ROL_COORDINADOR_VENTAS";

/**
 * Splits the assignable-people list into vendedores and coordinadores so the
 * cliente form can render them under separate <optgroup>s. Anything that is
 * not a coordinador (including unknown/null roles) is treated as a vendedor,
 * so a missing rol never hides someone from the dropdown.
 */
export function agruparVendedoresPorRol<T extends { rol?: string | null }>(
  personas: T[],
): { vendedores: T[]; coordinadores: T[] } {
  const vendedores: T[] = [];
  const coordinadores: T[] = [];
  for (const persona of personas) {
    if (persona.rol === ROL_COORDINADOR) {
      coordinadores.push(persona);
    } else {
      vendedores.push(persona);
    }
  }
  return { vendedores, coordinadores };
}
