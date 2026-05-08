// Helpers para envío click-to-chat WhatsApp (wa.me)

const VAR_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;

/**
 * Renderiza una plantilla sustituyendo {{var}} por valores.
 * Si la variable no existe en `vars`, deja el placeholder.
 */
export function renderTemplate(
  body: string,
  vars: Record<string, string | number | null | undefined> = {},
): string {
  return body.replace(VAR_REGEX, (match, name: string) => {
    const value = vars[name];
    if (value === undefined || value === null || value === "") {
      return match;
    }
    return String(value);
  });
}

/**
 * Extrae los nombres únicos de variables `{{var}}` presentes en el body.
 */
export function extractVariables(body: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of body.matchAll(VAR_REGEX)) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

/**
 * Normaliza un número telefónico a solo dígitos (formato wa.me).
 * Acepta entradas con +, espacios, paréntesis, guiones.
 * Default countryCode 51 (Perú) si el número parece local.
 */
export function normalizeWhatsAppPhone(
  telefono: string,
  defaultCountryCode = "51",
): string {
  const digits = telefono.replace(/\D/g, "");
  if (!digits) return "";
  if (telefono.trim().startsWith("+")) return digits;
  // Heurística: número peruano local 9 dígitos empezando con 9
  if (digits.length === 9 && digits.startsWith("9")) {
    return `${defaultCountryCode}${digits}`;
  }
  // Heurística: número con 10 dígitos sin código país (otros países)
  if (digits.length === 10 && !digits.startsWith(defaultCountryCode)) {
    return digits;
  }
  return digits;
}

/**
 * Construye URL `https://wa.me/{tel}?text={mensaje}` lista para abrir.
 */
export function buildWhatsAppUrl(
  telefono: string,
  mensaje: string,
  defaultCountryCode = "51",
): string {
  const tel = normalizeWhatsAppPhone(telefono, defaultCountryCode);
  if (!tel) {
    throw new Error("Teléfono inválido para WhatsApp");
  }
  return `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Valida que todas las variables requeridas tengan valor.
 * Devuelve lista de variables faltantes.
 */
export function findMissingVariables(
  body: string,
  vars: Record<string, string | number | null | undefined>,
): string[] {
  return extractVariables(body).filter((v) => {
    const value = vars[v];
    return value === undefined || value === null || value === "";
  });
}
