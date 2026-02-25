// ============================================================
// TIPOS PARA DETALLE DE CLIENTE (datos con JOINs de Supabase)
// Usado por page.tsx y todos los tabs del detalle de cliente
// ============================================================

import type { ClienteInteraccion, Reserva, Venta, Pago, Moneda } from './crm-flujo';
import type { ProformaRecord } from '@/types/proforma';

// ---- Relaciones embebidas por JOINs de Supabase ----

export interface VendedorRelacion {
  username: string;
  nombre_completo?: string;
}

export interface ProyectoRelacion {
  id: string;
  nombre: string;
}

export interface LoteRelacionReserva {
  id: string;
  codigo: string;
  proyecto?: ProyectoRelacion;
}

export interface LoteRelacionVenta {
  id: string;
  codigo: string;
  proyecto?: ProyectoRelacion;
}

// ---- Tipos enriquecidos (con JOINs) ----

export interface InteraccionConVendedor extends ClienteInteraccion {
  vendedor?: VendedorRelacion | null;
}

export interface ReservaConRelaciones extends Reserva {
  lote?: LoteRelacionReserva;
  vendedor?: VendedorRelacion;
}

export interface VentaConRelaciones extends Venta {
  lote?: LoteRelacionVenta;
  vendedor?: VendedorRelacion;
  pagos?: Pago[];
}

export interface AsesorActual {
  id: string;
  nombre_completo: string | null;
  username: string;
  telefono: string | null;
  email: string | null;
}

// ---- Re-exports para conveniencia ----
export type { ProformaRecord, Moneda };
