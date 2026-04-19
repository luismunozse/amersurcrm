// ============================================================
// METAS Y KPIs POR VENDEDOR - Types
// ============================================================

export interface MetaVendedor {
  id: string;
  vendedor_username: string;
  vendedor_id?: string;
  periodo_anio: number;
  periodo_mes: number;
  meta_ventas_monto: number;
  meta_ventas_cantidad: number;
  meta_separaciones: number;
  meta_contactos: number;
  meta_visitas: number;
  created_at: string;
  updated_at: string;
}

export interface KPIVendedor {
  meta_id: string;
  vendedor_username: string;
  vendedor_id?: string;
  periodo_anio: number;
  periodo_mes: number;
  // Metas
  meta_ventas_monto: number;
  meta_ventas_cantidad: number;
  meta_separaciones: number;
  meta_contactos: number;
  meta_visitas: number;
  // Reales
  real_ventas_cantidad: number;
  real_ventas_monto: number;
  real_separaciones: number;
  real_contactos: number;
  real_visitas: number;
}

export interface MotivoDesestimacion {
  id: string;
  codigo: string;
  descripcion: string;
  activo: boolean;
  orden: number;
  created_at: string;
}

export const MESES: { value: number; label: string }[] = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];
