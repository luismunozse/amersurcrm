// ============================================================
// CRONOGRAMA DE PAGOS (CUOTAS) - Types
// ============================================================

export type EstadoCuota = 'pendiente' | 'pagada' | 'vencida' | 'en_mora' | 'parcial';
export type TipoCuota = 'separacion' | 'cuota_inicial' | 'cuota_saldo';

export interface Cuota {
  id: string;
  venta_id: string;
  numero_cuota: number;
  tipo: TipoCuota;
  monto_programado: number;
  monto_pagado: number;
  monto_mora: number;
  moneda: string;
  fecha_vencimiento: string;
  fecha_pago?: string;
  estado: EstadoCuota;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface ConfiguracionProyectoFinanciera {
  id: string;
  proyecto_id: string;
  porcentaje_minimo_separacion: number;
  porcentaje_cuota_inicial: number;
  max_cuotas_iniciales: number;
  max_cuotas_saldo: number;
  tasa_efectiva_mensual: number;
  tasa_mora_mensual: number;
  dias_gracia_mora: number;
  penalidad_clientes_al_dia: number;
  penalidad_clientes_morosos: number;
  descuento_maximo_letra: number;
  seguro_desgravamen_porcentaje: number;
  seguro_multiriesgo_porcentaje: number;
  moneda_predeterminada: string;
  created_at: string;
  updated_at: string;
}

export const ESTADOS_CUOTA: { value: EstadoCuota; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'gray' },
  { value: 'pagada', label: 'Pagada', color: 'green' },
  { value: 'vencida', label: 'Vencida', color: 'red' },
  { value: 'en_mora', label: 'En Mora', color: 'red' },
  { value: 'parcial', label: 'Pago Parcial', color: 'orange' },
];

export const TIPOS_CUOTA: { value: TipoCuota; label: string }[] = [
  { value: 'separacion', label: 'Separación' },
  { value: 'cuota_inicial', label: 'Cuota Inicial' },
  { value: 'cuota_saldo', label: 'Cuota de Saldo' },
];
