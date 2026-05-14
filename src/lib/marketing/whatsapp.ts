// Helpers para envío click-to-chat WhatsApp (wa.me)
//
// Sintaxis soportada en body_texto:
//   - Variables:    {{nombre}}                 → reemplaza por valor
//   - Sección "if": {{#var}}…{{/var}}          → muestra contenido si truthy
//   - Sección "if not": {{^var}}…{{/var}}      → muestra contenido si falsy
//   - Snippet:      {{>slug}}                  → expande contenido del snippet
//   - Multimedia:   prepend de URL al mensaje  → WhatsApp Web genera preview

const VAR_REGEX = /\{\{\s*([\w.-]+)\s*\}\}/g;
const SNIPPET_REGEX = /\{\{\s*>\s*([a-z][a-z0-9_-]{1,40})\s*\}\}/g;
const SECTION_REGEX = /\{\{\s*([#^])\s*([\w.-]+)\s*\}\}([\s\S]*?)\{\{\s*\/\s*\2\s*\}\}/g;
const MAX_SNIPPET_DEPTH = 5;

export type PrimitiveVar = string | number | boolean | null | undefined;

function isTruthy(value: PrimitiveVar): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return value !== "";
}

/**
 * Expande secciones condicionales {{#var}}…{{/var}} y {{^var}}…{{/var}}.
 * Procesa recursivamente hasta que no hay más cambios.
 */
function expandSections(
  body: string,
  vars: Record<string, PrimitiveVar>,
): string {
  let result = body;
  let prev: string;
  do {
    prev = result;
    result = result.replace(
      SECTION_REGEX,
      (_match, marker: string, name: string, inner: string) => {
        const truthy = isTruthy(vars[name]);
        const mostrar = marker === "#" ? truthy : !truthy;
        return mostrar ? inner : "";
      },
    );
  } while (result !== prev);
  return result;
}

/**
 * Expande snippets {{>slug}} recursivamente con límite de profundidad
 * para evitar bucles infinitos en snippets que se auto-referencian.
 */
function expandSnippets(
  body: string,
  snippets: Record<string, string>,
  depth = 0,
): string {
  if (depth >= MAX_SNIPPET_DEPTH) return body;
  let cambio = false;
  const result = body.replace(SNIPPET_REGEX, (match, slug: string) => {
    const contenido = snippets[slug];
    if (contenido === undefined) return match;
    cambio = true;
    return contenido;
  });
  if (!cambio) return result;
  return expandSnippets(result, snippets, depth + 1);
}

export interface RenderOptions {
  snippets?: Record<string, string>;
}

/**
 * Renderiza una plantilla:
 *   1. Expande snippets {{>slug}}
 *   2. Expande secciones {{#var}}…{{/var}} y {{^var}}…{{/var}}
 *   3. Sustituye variables {{var}} por valores
 *
 * Si una variable no existe, deja el placeholder literal.
 */
export function renderTemplate(
  body: string,
  vars: Record<string, PrimitiveVar> = {},
  options: RenderOptions = {},
): string {
  let result = body;
  if (options.snippets && Object.keys(options.snippets).length > 0) {
    result = expandSnippets(result, options.snippets);
  }
  result = expandSections(result, vars);
  result = result.replace(VAR_REGEX, (match, name: string) => {
    const value = vars[name];
    if (value === undefined || value === null || value === "") {
      return match;
    }
    return String(value);
  });
  return result;
}

/**
 * Extrae nombres únicos de variables simples {{var}} en el body.
 * Excluye nombres de secciones (#/^) y snippets (>).
 */
export function extractVariables(body: string): string[] {
  // Primero quitar markers de sección y snippet del análisis.
  // Las variables internas a secciones SÍ se cuentan (pueden necesitar valor).
  const sinSecciones = body.replace(/\{\{\s*[#^/]\s*[\w.-]+\s*\}\}/g, "");
  const sinSnippets = sinSecciones.replace(SNIPPET_REGEX, "");

  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of sinSnippets.matchAll(VAR_REGEX)) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

/**
 * Extrae nombres de secciones condicionales presentes en el body.
 * Útil para mostrar al admin qué condicionales debe definir.
 */
export function extractSections(body: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const regex = /\{\{\s*[#^]\s*([\w.-]+)\s*\}\}/g;
  for (const match of body.matchAll(regex)) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

/**
 * Extrae slugs de snippets {{>slug}} presentes en el body.
 */
export function extractSnippetSlugs(body: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of body.matchAll(SNIPPET_REGEX)) {
    const slug = match[1];
    if (!seen.has(slug)) {
      seen.add(slug);
      result.push(slug);
    }
  }
  return result;
}

/**
 * Devuelve la lista de variables faltantes considerando secciones:
 * solo cuenta como faltante una variable que aparece FUERA de secciones
 * o dentro de una sección que sí renderizaría con los valores actuales.
 */
export function findMissingVariables(
  body: string,
  vars: Record<string, PrimitiveVar>,
  options: RenderOptions = {},
): string[] {
  // Expandir snippets + secciones primero, luego mirar qué variables quedan
  // sin valor en el resultado.
  let processed = body;
  if (options.snippets) {
    processed = expandSnippets(processed, options.snippets);
  }
  processed = expandSections(processed, vars);

  const seen = new Set<string>();
  const faltantes: string[] = [];
  for (const match of processed.matchAll(VAR_REGEX)) {
    const name = match[1];
    if (seen.has(name)) continue;
    seen.add(name);
    const value = vars[name];
    if (value === undefined || value === null || value === "") {
      faltantes.push(name);
    }
  }
  return faltantes;
}

/**
 * Antepone una URL de adjunto al cuerpo del mensaje.
 * WhatsApp Web genera preview cuando la URL es la primera línea.
 */
export function prependMedia(body: string, mediaUrl?: string | null): string {
  if (!mediaUrl || !mediaUrl.trim()) return body;
  return `${mediaUrl.trim()}\n\n${body}`;
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
