// ============================================================
// TYPES PARA FLUJO CRM COMPLETO
// ============================================================

// ============================================================
// INTERACCIONES
// ============================================================

export type TipoInteraccion = 'llamada' | 'email' | 'whatsapp' | 'visita' | 'reunion' | 'mensaje';

export type ResultadoInteraccion =
  | 'contesto'
  | 'no_contesto'
  | 'reagendo'
  | 'interesado'
  | 'no_interesado'
  | 'cerrado'
  | 'pendiente';

export type ProximaAccion =
  | 'llamar'
  | 'enviar_propuesta'
  | 'reunion'
  | 'visita'
  | 'seguimiento'
  | 'cierre'
  | 'ninguna';

export interface ClienteInteraccion {
  id: string;
  cliente_id: string;
  vendedor_username: string;
  tipo: TipoInteraccion;
  resultado?: ResultadoInteraccion;
  notas?: string;
  duracion_minutos?: number;
  fecha_interaccion: string;
  proxima_accion?: ProximaAccion;
  fecha_proxima_accion?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// PROPIEDADES DE INTERÉS
// ============================================================

export type PrioridadInteres = 1 | 2 | 3; // 1=alta, 2=media, 3=baja

export interface ClientePropiedadInteres {
  id: string;
  cliente_id: string;
  lote_id?: string;
  propiedad_id?: string;
  prioridad: PrioridadInteres;
  notas?: string;
  agregado_por: string; // username
  fecha_agregado: string;
}

// ============================================================
// VISITAS
// ============================================================

export type NivelInteres = 1 | 2 | 3 | 4 | 5; // 1=muy bajo, 5=muy alto

export interface VisitaPropiedad {
  id: string;
  cliente_id: string;
  lote_id?: string;
  propiedad_id?: string;
  vendedor_username: string;
  fecha_visita: string;
  duracion_minutos?: number;
  feedback?: string;
  nivel_interes?: NivelInteres;
  created_at: string;
}

// ============================================================
// RESERVAS / SEPARACIÓN
// ============================================================

export type EstadoReserva = 'activa' | 'vencida' | 'cancelada' | 'convertida_venta';

export type Moneda = 'PEN' | 'USD' | 'EUR';

export type TipoSeparacion = 'separacion_simple' | 'arras_confirmatorias' | 'arras_retractacion';

export interface Reserva {
  id: string;
  codigo_reserva: string;
  cliente_id: string;
  lote_id?: string;
  propiedad_id?: string;
  vendedor_username: string;
  monto_reserva: number;
  moneda: Moneda;
  fecha_reserva: string;
  fecha_vencimiento: string;
  estado: EstadoReserva;
  motivo_cancelacion?: string;
  metodo_pago?: string;
  comprobante_url?: string;
  notas?: string;
  // Campos de separación mejorada
  tipo_separacion?: TipoSeparacion;
  porcentaje_aplicado?: number;
  precio_referencia?: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// VENTAS
// ============================================================

export type EstadoVenta = 'en_proceso' | 'finalizada' | 'cancelada' | 'suspendida';

export type FormaPago = 'contado' | 'financiado' | 'credito_bancario' | 'mixto';

export interface Venta {
  id: string;
  codigo_venta: string;
  reserva_id?: string;
  cliente_id: string;
  lote_id?: string;
  propiedad_id?: string;
  vendedor_username: string;
  precio_total: number;
  moneda: Moneda;
  forma_pago: FormaPago;
  monto_inicial?: number;
  saldo_pendiente: number;
  numero_cuotas?: number;
  fecha_venta: string;
  fecha_entrega?: string;
  estado: EstadoVenta;
  motivo_cancelacion?: string;
  contrato_url?: string;
  comision_vendedor?: number;
  comision_pagada: boolean;
  notas?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// PAGOS
// ============================================================

export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'cheque' | 'deposito';

export interface Pago {
  id: string;
  venta_id: string;
  numero_cuota?: number;
  monto: number;
  moneda: Moneda;
  fecha_pago: string;
  fecha_vencimiento?: string;
  metodo_pago: MetodoPago;
  numero_operacion?: string;
  banco?: string;
  comprobante_url?: string;
  registrado_por: string; // username
  notas?: string;
  created_at: string;
}

// ============================================================
// UTILIDADES
// ============================================================

import type { ComponentType } from "react";
import {
  Phone,
  Mail,
  Users,
  Video,
  FileText,
} from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export const TIPOS_INTERACCION: { value: TipoInteraccion; label: string; icon: IconComponent }[] = [
  { value: 'llamada', label: 'Llamada', icon: Phone },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon },
  { value: 'visita', label: 'Visita', icon: Users },
  { value: 'reunion', label: 'Reunión', icon: Video },
  { value: 'mensaje', label: 'Mensaje', icon: FileText },
];

export const RESULTADOS_INTERACCION: { value: ResultadoInteraccion; label: string; color: string }[] = [
  { value: 'contesto', label: 'Contestó', color: 'green' },
  { value: 'no_contesto', label: 'No Contestó', color: 'orange' },
  { value: 'reagendo', label: 'Reagendó', color: 'blue' },
  { value: 'interesado', label: 'Interesado', color: 'purple' },
  { value: 'no_interesado', label: 'No Interesado', color: 'red' },
  { value: 'cerrado', label: 'Cerrado', color: 'green' },
  { value: 'pendiente', label: 'Pendiente', color: 'gray' },
];

export const PROXIMAS_ACCIONES: { value: ProximaAccion; label: string }[] = [
  { value: 'llamar', label: 'Llamar' },
  { value: 'enviar_propuesta', label: 'Enviar Propuesta' },
  { value: 'reunion', label: 'Agendar Reunión' },
  { value: 'visita', label: 'Agendar Visita' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'cierre', label: 'Cerrar Venta' },
  { value: 'ninguna', label: 'Sin Acción' },
];

export const NIVELES_INTERES: { value: NivelInteres; label: string; color: string }[] = [
  { value: 1, label: 'Muy Bajo', color: 'red' },
  { value: 2, label: 'Bajo', color: 'orange' },
  { value: 3, label: 'Medio', color: 'yellow' },
  { value: 4, label: 'Alto', color: 'blue' },
  { value: 5, label: 'Muy Alto', color: 'green' },
];

export const PRIORIDADES_INTERES: { value: PrioridadInteres; label: string; color: string }[] = [
  { value: 1, label: 'Alta', color: 'red' },
  { value: 2, label: 'Media', color: 'yellow' },
  { value: 3, label: 'Baja', color: 'gray' },
];

export const ESTADOS_RESERVA: { value: EstadoReserva; label: string; color: string }[] = [
  { value: 'activa', label: 'Activa', color: 'green' },
  { value: 'vencida', label: 'Vencida', color: 'red' },
  { value: 'cancelada', label: 'Cancelada', color: 'gray' },
  { value: 'convertida_venta', label: 'Convertida en Venta', color: 'blue' },
];

export const TIPOS_SEPARACION: { value: TipoSeparacion; label: string; descripcion: string }[] = [
  { value: 'separacion_simple', label: 'Separación Simple', descripcion: 'Monto reembolsable que reserva la unidad' },
  { value: 'arras_confirmatorias', label: 'Arras Confirmatorias', descripcion: 'Art. 1477 CC Perú - Se imputan al precio, no reembolsable' },
  { value: 'arras_retractacion', label: 'Arras de Retractación', descripcion: 'Art. 1480 CC Perú - Permiten retractarse con penalidad' },
];

export const ESTADOS_VENTA: { value: EstadoVenta; label: string; color: string }[] = [
  { value: 'en_proceso', label: 'En Proceso', color: 'blue' },
  { value: 'finalizada', label: 'Finalizada', color: 'green' },
  { value: 'cancelada', label: 'Cancelada', color: 'red' },
  { value: 'suspendida', label: 'Suspendida', color: 'orange' },
];

export const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: 'contado', label: 'Contado' },
  { value: 'financiado', label: 'Financiado' },
  { value: 'credito_bancario', label: 'Crédito Bancario' },
  { value: 'mixto', label: 'Mixto' },
];

export const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'deposito', label: 'Depósito' },
];

export const MONEDAS: { value: Moneda; label: string; symbol: string }[] = [
  { value: 'PEN', label: 'Soles', symbol: 'S/' },
  { value: 'USD', label: 'Dólares', symbol: '$' },
  { value: 'EUR', label: 'Euros', symbol: '€' },
];

// ============================================================
// HELPERS
// ============================================================

export function formatearMoneda(monto: number, moneda: Moneda): string {
  const simbolo = MONEDAS.find(m => m.value === moneda)?.symbol || '';
  return `${simbolo} ${monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function calcularPorcentajePagado(venta: Venta): number {
  const pagado = venta.precio_total - venta.saldo_pendiente;
  return Math.round((pagado / venta.precio_total) * 100);
}

export function estaVencida(fechaVencimiento: string): boolean {
  return new Date(fechaVencimiento) < new Date();
}

export function diasParaVencer(fechaVencimiento: string): number {
  const diff = new Date(fechaVencimiento).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
