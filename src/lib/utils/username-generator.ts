/**
 * Genera un username único basado en el nombre completo
 * Formato: primera letra del nombre + apellido (sin espacios, lowercase, sin tildes)
 * Ejemplos:
 * - "Juan Pérez García" -> "jperez"
 * - "María López" -> "mlopez"
 * - "José Luis Rodríguez" -> "jrodriguez"
 */

// Función para quitar tildes y caracteres especiales
function removerTildes(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function generarUsername(nombreCompleto: string): string {
  // Limpiar y dividir el nombre
  const partes = nombreCompleto
    .trim()
    .split(/\s+/)
    .filter(p => p.length > 0);

  if (partes.length === 0) {
    throw new Error('Nombre completo inválido');
  }

  let username = '';

  if (partes.length === 1) {
    // Solo un nombre: usar completo
    username = partes[0];
  } else if (partes.length === 2) {
    // Nombre + Apellido: primera letra del nombre + apellido completo
    username = partes[0].charAt(0) + partes[1];
  } else {
    // Nombre compuesto o múltiples apellidos: primera letra + último apellido
    username = partes[0].charAt(0) + partes[partes.length - 1];
  }

  // Limpiar: quitar tildes, espacios, caracteres especiales
  username = removerTildes(username)
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 50); // Máximo 50 caracteres

  return username;
}

/**
 * Genera username con número incremental si ya existe
 * Ejemplo: jperez -> jperez2 -> jperez3
 */
export function generarUsernameConNumero(base: string, numero: number): string {
  return `${base}${numero}`;
}

/**
 * Valida formato de username
 * - Solo letras minúsculas y números
 * - Entre 3 y 50 caracteres
 * - Debe empezar con letra
 */
export function validarUsername(username: string): { valido: boolean; error?: string } {
  if (!username || username.length < 3) {
    return { valido: false, error: 'El username debe tener al menos 3 caracteres' };
  }

  if (username.length > 50) {
    return { valido: false, error: 'El username no puede tener más de 50 caracteres' };
  }

  if (!/^[a-z]/.test(username)) {
    return { valido: false, error: 'El username debe empezar con una letra minúscula' };
  }

  if (!/^[a-z0-9]+$/.test(username)) {
    return { valido: false, error: 'El username solo puede contener letras minúsculas y números' };
  }

  return { valido: true };
}

/**
 * Sugiere usernames alternativos
 */
export function sugerirUsernames(nombreCompleto: string): string[] {
  const partes = nombreCompleto
    .trim()
    .split(/\s+/)
    .filter(p => p.length > 0)
    .map(p => removerTildes(p));

  const sugerencias: string[] = [];

  if (partes.length >= 2) {
    // Primera letra + apellido
    sugerencias.push(partes[0].charAt(0) + partes[partes.length - 1]);

    // Nombre completo (sin espacios)
    sugerencias.push(partes.join(''));

    // Nombre + primera letra apellido
    sugerencias.push(partes[0] + partes[partes.length - 1].charAt(0));

    // Iniciales + apellido
    if (partes.length >= 3) {
      sugerencias.push(
        partes[0].charAt(0) + partes[1].charAt(0) + partes[partes.length - 1]
      );
    }
  }

  return sugerencias
    .map(s => s.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter(s => s.length >= 3 && s.length <= 50)
    .slice(0, 5);
}
