import type { Punto, Poligono } from "@/types/proyectos";

/** Recorta un número al rango [0, 1]. */
export function clampUnidad(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Convierte coordenadas en pixeles (relativas a la imagen) a normalizadas [0,1]. */
export function pixelANormalizado(px: number, py: number, ancho: number, alto: number): Punto {
  if (!ancho || !alto) return [0, 0];
  return [clampUnidad(px / ancho), clampUnidad(py / alto)];
}

/** Serializa un polígono normalizado al atributo `points` de un <polygon> con viewBox 0 0 1 1. */
export function poligonoASvgPoints(poly: Poligono): string {
  return poly.map(([x, y]) => `${x},${y}`).join(" ");
}

/** Color de relleno/borde según el estado del lote. */
export function estadoColor(estado: string): { fill: string; stroke: string } {
  switch (estado) {
    case "disponible":
      return { fill: "rgba(34,197,94,0.45)", stroke: "rgb(21,128,61)" };
    case "reservado":
      return { fill: "rgba(245,158,11,0.45)", stroke: "rgb(180,83,9)" };
    case "vendido":
      return { fill: "rgba(220,38,38,0.45)", stroke: "rgb(153,27,27)" };
    default:
      return { fill: "rgba(148,163,184,0.45)", stroke: "rgb(71,85,105)" };
  }
}

/**
 * Mergea el polígono en el JSONB `data` del lote sin pisar otras claves.
 * poly=null elimina la clave masterplan_poly.
 */
export function mergeLotePoly(data: unknown, poly: Poligono | null): Record<string, unknown> {
  const base: Record<string, unknown> =
    data && typeof data === "object" && !Array.isArray(data) ? { ...(data as Record<string, unknown>) } : {};
  if (poly === null) {
    delete base.masterplan_poly;
  } else {
    base.masterplan_poly = poly;
  }
  return base;
}
