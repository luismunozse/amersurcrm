/**
 * Utilidades para validación y normalización de números telefónicos.
 * Usa libphonenumber-js para parsear/validar por país.
 * País por defecto: Perú (cuando el número no trae código).
 */

import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'PE';

/**
 * Normaliza un número telefónico a su forma canónica: dígitos con código de
 * país, SIN el prefijo "+" (contrato usado por dedup de importación, perfil y
 * los enlaces wa.me de marketing).
 *
 * - Acepta entradas con "+", espacios, guiones, paréntesis y ceros internacionales.
 * - Si no trae código de país, asume `defaultCountry`.
 * - Si el número ya incluye código pero sin "+", se reintenta anteponiéndolo.
 * - Devuelve "" si está vacío o no es un número telefónico posible.
 *
 * Se usa `isPossible()` (valida longitud) en lugar de `isValid()` (más estricto)
 * para no rechazar números reales — el objetivo es normalizar, no filtrar.
 *
 * @returns Ej. "51987654321" (PE) o "" si es inválido.
 */
export function normalizePhoneE164(
  value: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';

  // Intento 1: parsear con el país por defecto (cubre números locales).
  let parsed = parsePhoneNumberFromString(raw, defaultCountry);

  // Intento 2: si trae código de país pero sin "+", reintentar con "+".
  if ((!parsed || !parsed.isPossible()) && !raw.startsWith('+')) {
    const onlyDigits = raw.replace(/\D/g, '');
    if (onlyDigits) {
      parsed = parsePhoneNumberFromString(`+${onlyDigits}`);
    }
  }

  if (!parsed || !parsed.isPossible()) return '';

  // E.164 sin el "+" para preservar el contrato histórico.
  return parsed.number.replace('+', '');
}

/**
 * Valida si un número de teléfono es válido
 *
 * @param value - Número de teléfono a validar
 * @returns true si el número es válido, false en caso contrario
 */
export function isValidPhone(value: string | null | undefined): boolean {
  const normalized = normalizePhoneE164(value);
  return normalized.length >= 7 && normalized.length <= 15;
}

/**
 * Valida específicamente si es un número peruano válido
 *
 * @param value - Número de teléfono a validar
 * @returns true si es un número peruano válido (51 + 9 dígitos)
 */
export function isValidPeruvianPhone(value: string | null | undefined): boolean {
  const normalized = normalizePhoneE164(value);
  return normalized.length === 11 && normalized.startsWith('51');
}

/**
 * Formatea un número de teléfono para mostrar en formato internacional
 * según su país (ej. "+54 351 773-4676", "+56 9 1234 5678").
 *
 * @param value - Número de teléfono en cualquier formato
 * @returns Número formateado para visualización, o '' si es inválido
 */
export function formatPhoneDisplay(value: string | null | undefined): string {
  const normalized = normalizePhoneE164(value);
  if (!normalized) return '';

  const parsed = parsePhoneNumberFromString(`+${normalized}`);
  return parsed ? parsed.formatInternational() : `+${normalized}`;
}

/**
 * Extrae información del número de teléfono
 */
export function getPhoneInfo(value: string | null | undefined): {
  normalized: string;
  isValid: boolean;
  isPeruvian: boolean;
  formatted: string;
} {
  const normalized = normalizePhoneE164(value);

  return {
    normalized,
    isValid: isValidPhone(value),
    isPeruvian: isValidPeruvianPhone(value),
    formatted: formatPhoneDisplay(normalized),
  };
}
