// Tipos para el sistema de clientes mejorado

export type TipoCliente = 'persona' | 'empresa';

export type EstadoCliente = 'activo' | 'prospecto' | 'lead' | 'inactivo';

export type OrigenLead = 
  | 'web' 
  | 'recomendacion' 
  | 'feria' 
  | 'campaña' 
  | 'redes_sociales' 
  | 'publicidad' 
  | 'referido' 
  | 'otro';

export type FormaPago = 
  | 'contado' 
  | 'financiacion' 
  | 'credito_bancario' 
  | 'leasing' 
  | 'mixto';

export type InteresPrincipal = 
  | 'lotes' 
  | 'casas' 
  | 'departamentos' 
  | 'oficinas' 
  | 'terrenos' 
  | 'locales' 
  | 'otro';

export type ProximaAccion = 
  | 'llamar' 
  | 'enviar_propuesta' 
  | 'reunion' 
  | 'seguimiento' 
  | 'cierre' 
  | 'nada';

export interface DireccionCliente {
  calle?: string;
  numero?: string;
  barrio?: string;
  ciudad?: string;
  provincia?: string;
  pais?: string;
  codigo_postal?: string;
  coordenadas?: {
    lat: number;
    lng: number;
  };
}

export interface ClienteCompleto {
  // Identificación básica
  id: string;
  codigo_cliente: string;
  tipo_cliente: TipoCliente;
  nombre: string;
  documento_identidad?: string;
  email?: string;
  telefono?: string;
  telefono_whatsapp?: string;
  direccion: DireccionCliente;
  
  // Estado comercial
  estado_cliente: EstadoCliente;
  origen_lead?: OrigenLead;
  vendedor_asignado?: string;
  fecha_alta: string;
  ultimo_contacto?: string;
  proxima_accion?: ProximaAccion;
  
  // Información financiera/comercial
  interes_principal?: InteresPrincipal;
  capacidad_compra_estimada?: number;
  forma_pago_preferida?: FormaPago;
  propiedades_reservadas: number;
  propiedades_compradas: number;
  propiedades_alquiladas: number;
  saldo_pendiente: number;
  
  // Información adicional
  notas?: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ClienteFormData {
  // Identificación básica
  tipo_cliente: TipoCliente;
  nombre: string;
  documento_identidad?: string;
  email?: string;
  telefono?: string;
  telefono_whatsapp?: string;
  direccion: DireccionCliente;
  
  // Estado comercial
  estado_cliente: EstadoCliente;
  origen_lead?: OrigenLead;
  vendedor_asignado?: string;
  proxima_accion?: ProximaAccion;
  
  // Información financiera/comercial
  interes_principal?: InteresPrincipal;
  capacidad_compra_estimada?: number;
  forma_pago_preferida?: FormaPago;
  
  // Información adicional
  notas?: string;
}

// Opciones para formularios
export const TIPOS_CLIENTE_OPTIONS = [
  { value: 'persona', label: 'Persona Natural' },
  { value: 'empresa', label: 'Empresa' }
] as const;

export const ESTADOS_CLIENTE_OPTIONS = [
  { value: 'prospecto', label: 'Prospecto', color: 'blue' },
  { value: 'lead', label: 'Lead Calificado', color: 'yellow' },
  { value: 'activo', label: 'Cliente Activo', color: 'green' },
  { value: 'inactivo', label: 'Inactivo', color: 'gray' }
] as const;

export const ORIGENES_LEAD_OPTIONS = [
  { value: 'web', label: 'Sitio Web' },
  { value: 'recomendacion', label: 'Recomendación' },
  { value: 'feria', label: 'Feria/Evento' },
  { value: 'campaña', label: 'Campaña Publicitaria' },
  { value: 'redes_sociales', label: 'Redes Sociales' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'referido', label: 'Referido' },
  { value: 'otro', label: 'Otro' }
] as const;

export const FORMAS_PAGO_OPTIONS = [
  { value: 'contado', label: 'Contado' },
  { value: 'financiacion', label: 'Financiación Directa' },
  { value: 'credito_bancario', label: 'Crédito Bancario' },
  { value: 'leasing', label: 'Leasing' },
  { value: 'mixto', label: 'Mixto' }
] as const;

export const INTERESES_PRINCIPALES_OPTIONS = [
  { value: 'lotes', label: 'Lotes' },
  { value: 'casas', label: 'Casas' },
  { value: 'departamentos', label: 'Departamentos' },
  { value: 'oficinas', label: 'Oficinas' },
  { value: 'terrenos', label: 'Terrenos' },
  { value: 'locales', label: 'Locales Comerciales' },
  { value: 'otro', label: 'Otro' }
] as const;

export const PROXIMAS_ACCIONES_OPTIONS = [
  { value: 'llamar', label: 'Llamar' },
  { value: 'enviar_propuesta', label: 'Enviar Propuesta' },
  { value: 'reunion', label: 'Reunión' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'cierre', label: 'Cierre' },
  { value: 'nada', label: 'Sin Acción' }
] as const;

// Utilidades
export function getEstadoClienteColor(estado: EstadoCliente): string {
  const estadoInfo = ESTADOS_CLIENTE_OPTIONS.find(e => e.value === estado);
  return estadoInfo?.color || 'gray';
}

export function getEstadoClienteLabel(estado: EstadoCliente): string {
  const estadoInfo = ESTADOS_CLIENTE_OPTIONS.find(e => e.value === estado);
  return estadoInfo?.label || estado;
}

export function formatCapacidadCompra(capacidad?: number): string {
  if (!capacidad) return 'No especificada';
  
  if (capacidad >= 1000000) {
    return `S/ ${(capacidad / 1000000).toFixed(1)}M`;
  } else if (capacidad >= 1000) {
    return `S/ ${(capacidad / 1000).toFixed(0)}K`;
  } else {
    return `S/ ${capacidad.toLocaleString()}`;
  }
}

export function formatSaldoPendiente(saldo: number): string {
  if (saldo === 0) return 'Sin saldo';
  return `S/ ${saldo.toLocaleString()}`;
}
