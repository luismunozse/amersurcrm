import type { EstadoCliente } from "@/lib/types/clientes";

/**
 * Single-sourced canonical business vocabulary for `estado_cliente` in
 * management reportes (design.md ADR1). Every report action that filters,
 * labels, or classifies clients by estado MUST import from here instead of
 * hand-writing a literal — the exact drift this module exists to prevent
 * (see `ventas.ts`/`clientes.ts` diverging independently before this fix).
 *
 * IMPORTANT: this file must NOT import `server-only` or `next/cache` — it
 * needs to stay import-safe from client bundles (same reasoning as
 * `actions/shared.ts`).
 */

interface EstadoMeta {
  /** Client is still somewhere in the pipeline (not desestimado/transferido). */
  activo: boolean;
  /** Client has engaged past first contact. */
  avanzado: boolean;
  /** Client closed — owns a property. */
  convertido: boolean;
}

// Compile-time exhaustiveness guard: `Record<EstadoCliente, EstadoMeta>`
// forces this object to have exactly one key per `EstadoCliente` union
// member — no more, no less. Adding a 9th estado to the union (or removing
// one) is a TypeScript error here until this map is updated, so the
// vocabulary can never silently drift from `types/clientes.ts` again.
const ESTADO_META: Record<EstadoCliente, EstadoMeta> = {
  por_contactar: { activo: true, avanzado: false, convertido: false },
  contactado: { activo: true, avanzado: true, convertido: false },
  intermedio: { activo: true, avanzado: true, convertido: false },
  potencial: { activo: true, avanzado: true, convertido: false },
  en_proceso: { activo: true, avanzado: true, convertido: false },
  propietario: { activo: true, avanzado: true, convertido: true }, // owns property → converted
  desestimado: { activo: false, avanzado: false, convertido: false }, // terminal / dead
  transferido: { activo: false, avanzado: false, convertido: false }, // terminal / handed off
};

/** All 8 valid `estado_cliente` values (mirrors `ESTADOS_CLIENTE_OPTIONS`). */
export const ESTADOS_CLIENTE_VALIDOS = Object.keys(ESTADO_META) as EstadoCliente[];

/** Client is still in the pipeline (everything except desestimado/transferido). */
export const ESTADOS_ACTIVOS = ESTADOS_CLIENTE_VALIDOS.filter((e) => ESTADO_META[e].activo);

/** Client engaged past first contact ("avanzados" in origen-lead effectiveness). */
export const ESTADOS_AVANZADOS = ESTADOS_CLIENTE_VALIDOS.filter((e) => ESTADO_META[e].avanzado);

/** Client closed — owns a property. Used as the conversion numerator. */
export const ESTADOS_CONVERTIDOS = ESTADOS_CLIENTE_VALIDOS.filter((e) => ESTADO_META[e].convertido);

function esEstadoClienteValido(valor: string): valor is EstadoCliente {
  return Object.prototype.hasOwnProperty.call(ESTADO_META, valor);
}

/** True when `estado` is a valid, pipeline-active `estado_cliente`. */
export function esEstadoActivo(estado: string): estado is EstadoCliente {
  return esEstadoClienteValido(estado) && ESTADO_META[estado].activo;
}

/** True only for `propietario` (the sole converted state). */
export function esEstadoConvertido(estado: string): estado is EstadoCliente {
  return esEstadoClienteValido(estado) && ESTADO_META[estado].convertido;
}
