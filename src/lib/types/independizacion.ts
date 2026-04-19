// ============================================================
// INDEPENDIZACIÓN - Types
// ============================================================

export type EstadoIndependizacion = 'pendiente' | 'en_tramite' | 'observada' | 'completada';

export type TipoDocumentoIndependizacion =
  | 'escritura_publica' | 'plano_independizacion' | 'memoria_descriptiva'
  | 'certificado_catastral' | 'copia_literal' | 'titulo_archivado'
  | 'constancia_inscripcion' | 'pago_derechos_registrales' | 'otro';

export type EstadoDocumentoIndependizacion = 'pendiente' | 'cargado' | 'presentado' | 'observado' | 'aprobado';

export interface Independizacion {
  id: string;
  codigo_independizacion: string;
  venta_id: string;
  lote_id: string;
  cliente_id: string;
  contrato_id?: string;
  estado: EstadoIndependizacion;
  notaria?: string;
  partida_registral_matriz?: string;
  partida_registral_independizada?: string;
  numero_titulo?: string;
  zona_registral?: string;
  fecha_inicio_tramite?: string;
  fecha_presentacion_sunarp?: string;
  fecha_inscripcion?: string;
  observacion_sunarp?: string;
  fecha_subsanacion?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface IndependizacionDocumento {
  id: string;
  independizacion_id: string;
  tipo_documento: TipoDocumentoIndependizacion;
  nombre: string;
  url?: string;
  estado: EstadoDocumentoIndependizacion;
  notas?: string;
  created_at: string;
}

export const ESTADOS_INDEPENDIZACION: { value: EstadoIndependizacion; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'gray' },
  { value: 'en_tramite', label: 'En Trámite', color: 'blue' },
  { value: 'observada', label: 'Observada', color: 'orange' },
  { value: 'completada', label: 'Completada', color: 'green' },
];

export const TIPOS_DOCUMENTO_INDEPENDIZACION: { value: TipoDocumentoIndependizacion; label: string }[] = [
  { value: 'escritura_publica', label: 'Escritura Pública' },
  { value: 'plano_independizacion', label: 'Plano de Independización' },
  { value: 'memoria_descriptiva', label: 'Memoria Descriptiva' },
  { value: 'certificado_catastral', label: 'Certificado Catastral' },
  { value: 'copia_literal', label: 'Copia Literal SUNARP' },
  { value: 'titulo_archivado', label: 'Título Archivado' },
  { value: 'constancia_inscripcion', label: 'Constancia de Inscripción' },
  { value: 'pago_derechos_registrales', label: 'Pago de Derechos Registrales' },
  { value: 'otro', label: 'Otro' },
];

export const ESTADOS_DOCUMENTO_INDEPENDIZACION: { value: EstadoDocumentoIndependizacion; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'gray' },
  { value: 'cargado', label: 'Cargado', color: 'blue' },
  { value: 'presentado', label: 'Presentado', color: 'purple' },
  { value: 'observado', label: 'Observado', color: 'orange' },
  { value: 'aprobado', label: 'Aprobado', color: 'green' },
];
