/**
 * Utilidades para validación y normalización de números telefónicos
 * Enfocado en números peruanos (código de país: 51)
 */

/**
 * Normaliza un número de teléfono al formato E.164
 * - Números peruanos: 51 + 9 dígitos = 11 dígitos total
 * - Números internacionales: 7-15 dígitos
 *
 * @param value - Número de teléfono en cualquier formato
 * @returns Número normalizado sin espacios ni caracteres especiales, o cadena vacía si es inválido
 */
export function normalizePhoneE164(value: string | null | undefined): string {
  if (!value) return '';

  // Eliminar todos los caracteres no numéricos
  const digits = String(value).replace(/\D/g, '');

  if (!digits) return '';

  // Caso 1: Número local peruano (9 dígitos) -> agregar código de país
  if (digits.length === 9) {
    return `51${digits}`;
  }

  // Caso 2: Ya tiene código de país peruano (11 dígitos empezando con 51)
  if (digits.length === 11 && digits.startsWith('51')) {
    return digits;
  }

  // Caso 3: Número con código 0051 (eliminamos el 00 inicial)
  if (digits.startsWith('0051') && digits.length === 13) {
    return digits.substring(2); // Eliminar '00'
  }

  // Caso 4: Otros formatos internacionales válidos (7-15 dígitos)
  if (digits.length >= 7 && digits.length <= 15) {
    return digits;
  }

  // Formato inválido
  return '';
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
 * Formatea un número de teléfono para mostrar
 * Peruano: +51 987 654 321
 * Internacional: mantiene formato original
 *
 * @param value - Número de teléfono normalizado
 * @returns Número formateado para visualización
 */
export function formatPhoneDisplay(value: string | null | undefined): string {
  const normalized = normalizePhoneE164(value);

  if (!normalized) return '';

  // Formato peruano: +51 987 654 321
  if (normalized.length === 11 && normalized.startsWith('51')) {
    const countryCode = normalized.substring(0, 2);
    const part1 = normalized.substring(2, 5);
    const part2 = normalized.substring(5, 8);
    const part3 = normalized.substring(8, 11);
    return `+${countryCode} ${part1} ${part2} ${part3}`;
  }

  // Para otros formatos, solo agregar el +
  return `+${normalized}`;
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
