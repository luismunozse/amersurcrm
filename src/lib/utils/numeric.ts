/**
 * Parsea un campo de formulario como número, devolviendo null si el valor
 * está vacío o no es un número finito (NaN, Infinity, no numérico).
 *
 * Evita que strings inválidos lleguen a la base como NaN y rompan
 * comparaciones numéricas silenciosas.
 */
export function parseOptionalNumber(value: FormDataEntryValue | null): number | null {
  if (value === null || value === undefined) return null;
  const raw = typeof value === "string" ? value.trim() : "";
  if (raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
