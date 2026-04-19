// ============================================================
// CALIFICACIÓN BANCARIA - Types
// ============================================================

export type EstadoCalificacion = 'pendiente' | 'en_evaluacion' | 'aprobada' | 'rechazada' | 'observada';

export type TipoDocumentoCalificacion =
  | 'boleta_pago' | 'ddjj_renta' | 'estado_cuenta' | 'certificado_trabajo'
  | 'contrato_trabajo' | 'recibo_honorarios' | 'dni' | 'copia_literal'
  | 'autovaluo' | 'declaracion_jurada' | 'otro';

export type EstadoDocumentoCalificacion = 'pendiente' | 'cargado' | 'aprobado' | 'rechazado';

export interface CalificacionBancaria {
  id: string;
  codigo_calificacion: string;
  reserva_id?: string;
  cliente_id: string;
  lote_id?: string;
  vendedor_username?: string;
  estado: EstadoCalificacion;
  banco?: string;
  ejecutivo_bancario?: string;
  telefono_ejecutivo?: string;
  email_ejecutivo?: string;
  monto_solicitado?: number;
  monto_aprobado?: number;
  tasa_interes?: number;
  plazo_meses?: number;
  moneda: string;
  fecha_solicitud?: string;
  fecha_respuesta?: string;
  motivo_rechazo?: string;
  observaciones?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface CalificacionDocumento {
  id: string;
  calificacion_id: string;
  tipo_documento: TipoDocumentoCalificacion;
  nombre: string;
  url?: string;
  estado: EstadoDocumentoCalificacion;
  notas?: string;
  created_at: string;
}

export const ESTADOS_CALIFICACION: { value: EstadoCalificacion; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'gray' },
  { value: 'en_evaluacion', label: 'En Evaluación', color: 'blue' },
  { value: 'aprobada', label: 'Aprobada', color: 'green' },
  { value: 'rechazada', label: 'Rechazada', color: 'red' },
  { value: 'observada', label: 'Observada', color: 'orange' },
];

export const TIPOS_DOCUMENTO_CALIFICACION: { value: TipoDocumentoCalificacion; label: string }[] = [
  { value: 'boleta_pago', label: 'Boleta de Pago' },
  { value: 'ddjj_renta', label: 'Declaración Jurada de Renta' },
  { value: 'estado_cuenta', label: 'Estado de Cuenta Bancario' },
  { value: 'certificado_trabajo', label: 'Certificado de Trabajo' },
  { value: 'contrato_trabajo', label: 'Contrato de Trabajo' },
  { value: 'recibo_honorarios', label: 'Recibo por Honorarios' },
  { value: 'dni', label: 'DNI / Documento de Identidad' },
  { value: 'copia_literal', label: 'Copia Literal SUNARP' },
  { value: 'autovaluo', label: 'Autovalúo / HR-PU' },
  { value: 'declaracion_jurada', label: 'Declaración Jurada' },
  { value: 'otro', label: 'Otro' },
];

export const ESTADOS_DOCUMENTO_CALIFICACION: { value: EstadoDocumentoCalificacion; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'gray' },
  { value: 'cargado', label: 'Cargado', color: 'blue' },
  { value: 'aprobado', label: 'Aprobado', color: 'green' },
  { value: 'rechazado', label: 'Rechazado', color: 'red' },
];

export const BANCOS_PERU: string[] = [
  'BCP - Banco de Crédito del Perú',
  'BBVA Perú',
  'Interbank',
  'Scotiabank Perú',
  'BanBif',
  'Banco Pichincha',
  'Banco GNB',
  'Banco Falabella',
  'Banco Ripley',
  'MiBanco',
  'Banco de Comercio',
  'ICBC Perú',
  'Citibank Perú',
  'Otro',
];
