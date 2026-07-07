import type { Poligono } from "@/types/proyectos";

export type EstadoLote = "disponible" | "reservado" | "vendido";

/**
 * Price-free whitelist DTO for a single lote drawn on the masterplan overlay.
 * This is the reuse boundary for both the dashboard presentation route and
 * the deferred Phase 2 public route (`/p/[token]`): no `precio`/`moneda` or
 * any other client/commercial field is representable on this type.
 */
export interface PlanoLoteDTO {
  id: string;
  codigo: string;
  estado: EstadoLote;
  area: number | null;
  manzana: string | null;
  etapa: string | null;
  poly: Poligono | null;
}

/** Price-free whitelist DTO for an entire proyecto's masterplan presentation. */
export interface PlanoPresentacionDTO {
  imageUrl: string;
  width: number;
  height: number;
  lotes: PlanoLoteDTO[];
}

/**
 * Raw `crm.lote` row shape as read server-side. Callers may pass rows that
 * also carry `precio`, `moneda`, and other commercial fields — this type
 * deliberately does not declare them, and `toPlanoLoteDTO` never reads them,
 * so they cannot leak into the DTO.
 */
export interface LoteRowParaDTO {
  id: string;
  codigo: string;
  estado: string;
  sup_m2?: number | null;
  data?: {
    manzana?: string | null;
    etapa?: string | null;
    masterplan_poly?: unknown;
  } | null;
}

function esPoligonoValido(value: unknown): value is Poligono {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (punto) =>
        Array.isArray(punto) &&
        punto.length === 2 &&
        typeof punto[0] === "number" &&
        typeof punto[1] === "number",
    )
  );
}

/**
 * Explicit-pick mapper: builds a `PlanoLoteDTO` by naming exactly the six
 * safe fields it reads off `row`. It never spreads the raw row, so any
 * commercial field present on `row` (`precio`, `moneda`, `descuento`,
 * `precio_m2`, `condiciones`, etc.) is structurally unable to reach the
 * result.
 */
export function toPlanoLoteDTO(row: LoteRowParaDTO): PlanoLoteDTO {
  const masterplanPoly = row.data?.masterplan_poly;
  return {
    id: row.id,
    codigo: row.codigo,
    estado: row.estado as EstadoLote,
    area: row.sup_m2 ?? null,
    manzana: row.data?.manzana ?? null,
    etapa: row.data?.etapa ?? null,
    poly: esPoligonoValido(masterplanPoly) ? masterplanPoly : null,
  };
}
