// Tipos para el sistema de clientes mejorado

export type TipoCliente = 'persona' | 'empresa';

export type TipoDocumento = 'DNI' | 'PAS' | 'EXT' | 'RUC';

export type EstadoCliente =
  | 'por_contactar'
  | 'contactado'
  | 'transferido'
  | 'intermedio'
  | 'desestimado'
  | 'potencial';

export type OrigenLead = 
  | 'web' 
  | 'recomendacion' 
  | 'feria' 
  | 'campaña' 
  | 'campaña_facebook'
  | 'campaña_tiktok'
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

export type EstadoCivil = 'soltero' | 'casado' | 'viudo' | 'divorciado';

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
  tipo_documento?: TipoDocumento;
  documento_identidad?: string;
  email?: string;
  telefono?: string;
  telefono_whatsapp?: string;
  direccion: DireccionCliente;
  estado_civil?: EstadoCivil;
  
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
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ClienteFormData {
  // Identificación básica
  tipo_cliente: TipoCliente;
  nombre: string;
  tipo_documento?: TipoDocumento;
  documento_identidad?: string;
  email?: string;
  telefono?: string;
  telefono_whatsapp?: string;
  direccion: DireccionCliente;
  estado_civil?: EstadoCivil;
  
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
  { value: 'persona', label: 'Persona' },
  { value: 'empresa', label: 'Empresa' }
] as const;

export const TIPOS_DOCUMENTO_OPTIONS = [
  { value: 'DNI', label: 'DNI' },
  { value: 'PAS', label: 'PAS (Pasaporte)' },
  { value: 'EXT', label: 'EXT (Libreta de Extranjería)' },
  { value: 'RUC', label: 'RUC' }
] as const;

export const ESTADOS_CLIENTE_OPTIONS = [
  { value: 'por_contactar', label: 'Por Contactar', color: 'blue' },
  { value: 'contactado', label: 'Contactado', color: 'yellow' },
  { value: 'intermedio', label: 'Intermedio', color: 'cyan' },
  { value: 'potencial', label: 'Potencial', color: 'purple' },
  { value: 'desestimado', label: 'Desestimado', color: 'gray' },
  { value: 'transferido', label: 'Transferido', color: 'green' }
] as const;

export const ESTADO_CIVIL_OPTIONS = [
  { value: 'soltero', label: 'Soltero(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'viudo', label: 'Viudo(a)' },
  { value: 'divorciado', label: 'Divorciado(a)' },
] as const;

export const ORIGENES_LEAD_OPTIONS = [
  { value: 'web', label: 'Sitio Web' },
  { value: 'recomendacion', label: 'Recomendación' },
  { value: 'feria', label: 'Feria/Evento' },
  { value: 'campaña', label: 'Campaña Publicitaria' },
  { value: 'campaña_facebook', label: 'Campaña de Facebook' },
  { value: 'campaña_tiktok', label: 'Campaña de TikTok' },
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
  switch (estado) {
    case 'por_contactar': return 'blue';
    case 'contactado': return 'yellow';
    case 'transferido': return 'green';
    case 'intermedio': return 'cyan';
    case 'potencial': return 'purple';
    case 'desestimado': return 'gray';
    default: return 'gray';
  }
}

export function getEstadoClienteLabel(estado: EstadoCliente): string {
  switch (estado) {
    case 'por_contactar': return 'Por Contactar';
    case 'contactado': return 'Contactado';
    case 'transferido': return 'Transferido';
    case 'intermedio': return 'Intermedio';
    case 'potencial': return 'Potencial';
    case 'desestimado': return 'Desestimado';
    default: return estado;
  }
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
