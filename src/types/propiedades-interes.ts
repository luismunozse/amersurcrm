export type ProyectoResumen = {
  id: string;
  nombre?: string | null;
};

export type LoteResumen = {
  id: string;
  numero_lote?: string | null;
  codigo?: string | null;
  sup_m2?: number | null;
  estado?: string | null;
  moneda?: 'PEN' | 'USD' | 'EUR' | null;
  precio?: number | null;
  proyecto?: ProyectoResumen | null;
};

export type PropiedadInteres = {
  id: string;
  cliente_id?: string;
  lote_id?: string | null;
  prioridad: 1 | 2 | 3;
  notas?: string | null;
  fecha_agregado: string;
  agregado_por?: string | null;
  lote?: LoteResumen | null;
};

export type PropiedadResumen = Pick<PropiedadInteres, "id" | "prioridad" | "notas" | "lote">;
