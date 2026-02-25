// ============================================================
// Utilidades para calcular seguimientos pendientes y vencidos
// ============================================================

export interface SeguimientoPendiente {
  interaccionId: string;
  proximaAccion: string;
  fechaProximaAccion: string;
  diasVencido: number; // positivo = vencido, negativo = faltan dias
  esVencido: boolean;
  vendedorUsername?: string;
  notas?: string;
}

/**
 * Extrae seguimientos pendientes de una lista de interacciones.
 * Retorna solo aquellas con proxima_accion definida y fecha futura/pasada.
 */
export function calcularSeguimientosPendientes(
  interacciones: Array<{
    id: string;
    proxima_accion?: string | null;
    fecha_proxima_accion?: string | null;
    vendedor_username?: string | null;
    vendedor?: { username: string } | null;
    notas?: string | null;
  }>,
): SeguimientoPendiente[] {
  const ahora = new Date();

  return interacciones
    .filter(
      (i) =>
        i.proxima_accion &&
        i.proxima_accion !== "ninguna" &&
        i.fecha_proxima_accion,
    )
    .map((i) => {
      const fechaAccion = new Date(i.fecha_proxima_accion!);
      const diffMs = ahora.getTime() - fechaAccion.getTime();
      const diasVencido = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      return {
        interaccionId: i.id,
        proximaAccion: i.proxima_accion!,
        fechaProximaAccion: i.fecha_proxima_accion!,
        diasVencido,
        esVencido: diasVencido > 0,
        vendedorUsername: i.vendedor_username || i.vendedor?.username || undefined,
        notas: i.notas || undefined,
      };
    })
    .sort((a, b) => b.diasVencido - a.diasVencido); // Mas vencidos primero
}

/**
 * Cuenta cuantos seguimientos estan vencidos (fecha_proxima_accion < hoy).
 */
export function contarSeguimientosVencidos(
  interacciones: Array<{
    proxima_accion?: string | null;
    fecha_proxima_accion?: string | null;
  }>,
): number {
  const ahora = new Date();
  return interacciones.filter(
    (i) =>
      i.proxima_accion &&
      i.proxima_accion !== "ninguna" &&
      i.fecha_proxima_accion &&
      new Date(i.fecha_proxima_accion) < ahora,
  ).length;
}
