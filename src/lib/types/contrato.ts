// ============================================================
// CONTRATO / MINUTA - Types
// ============================================================

export type EstadoContrato = 'borrador' | 'pendiente_firma' | 'firmado' | 'en_notaria' | 'inscrito_sunarp';

export interface Contrato {
  id: string;
  codigo_contrato: string;
  venta_id: string;
  calificacion_id?: string;
  cliente_id: string;
  lote_id?: string;
  estado: EstadoContrato;
  notaria?: string;
  notario?: string;
  numero_escritura?: string;
  partida_registral?: string;
  numero_titulo?: string;
  zona_registral?: string;
  fecha_firma?: string;
  fecha_escritura?: string;
  fecha_inscripcion_sunarp?: string;
  contrato_url?: string;
  escritura_url?: string;
  constancia_sunarp_url?: string;
  vendedor_username?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export const ESTADOS_CONTRATO: { value: EstadoContrato; label: string; color: string }[] = [
  { value: 'borrador', label: 'Borrador', color: 'gray' },
  { value: 'pendiente_firma', label: 'Pendiente de Firma', color: 'orange' },
  { value: 'firmado', label: 'Firmado', color: 'blue' },
  { value: 'en_notaria', label: 'En Notaría', color: 'purple' },
  { value: 'inscrito_sunarp', label: 'Inscrito en SUNARP', color: 'green' },
];
