// ============================================================
// PROCESO DE ADQUISICIÓN - Types
// ============================================================

export type EtapaProceso = 'separacion' | 'calificacion_bancaria' | 'firma_contrato' | 'desembolso';
export type EstadoProceso = 'activo' | 'completado' | 'cancelado' | 'pausado';
export type EstadoEtapa = 'pendiente' | 'en_progreso' | 'completada' | 'omitida';

export interface ProcesoAdquisicion {
  id: string;
  codigo: string;
  cliente_id: string;
  lote_id?: string;
  reserva_id?: string;
  venta_id?: string;
  plantilla_id?: string;
  etapa_actual: EtapaProceso;
  estado: EstadoProceso;
  vendedor_username?: string;
  fecha_inicio: string;
  fecha_estimada_cierre?: string;
  fecha_cierre?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface ProcesoEtapa {
  id: string;
  proceso_id: string;
  etapa: string;
  nombre: string;
  orden: number;
  estado: EstadoEtapa;
  responsable_username?: string;
  responsable_rol?: string;
  plazo_dias?: number;
  fecha_inicio?: string;
  fecha_limite?: string;
  fecha_completada?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface ProcesoChecklistItem {
  id: string;
  etapa_id: string;
  descripcion: string;
  obligatorio: boolean;
  orden: number;
  completado: boolean;
  completado_por?: string;
  fecha_completado?: string;
  documento_url?: string;
  created_at: string;
}

export interface ProcesoConRelaciones extends ProcesoAdquisicion {
  etapas: (ProcesoEtapa & { checklist: ProcesoChecklistItem[] })[];
  cliente?: { id: string; nombre: string };
  lote?: { codigo: string; proyecto?: { nombre: string } };
}

export interface PlantillaProceso {
  id: string;
  proyecto_id?: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  etapas: PlantillaEtapa[];
  created_at: string;
  updated_at: string;
}

export interface PlantillaEtapa {
  etapa: string;
  nombre: string;
  orden: number;
  plazo_dias: number;
  responsable_rol?: string;
  checklist: { descripcion: string; obligatorio: boolean; orden?: number }[];
}

export const ETAPAS_PROCESO: { value: EtapaProceso; label: string; color: string; icon: string }[] = [
  { value: 'separacion', label: 'Separación', color: 'blue', icon: '1' },
  { value: 'calificacion_bancaria', label: 'Calif. Bancaria', color: 'purple', icon: '2' },
  { value: 'firma_contrato', label: 'Firma Contrato', color: 'orange', icon: '3' },
  { value: 'desembolso', label: 'Desembolso', color: 'green', icon: '4' },
];

export const ESTADOS_PROCESO: { value: EstadoProceso; label: string; color: string }[] = [
  { value: 'activo', label: 'Activo', color: 'blue' },
  { value: 'completado', label: 'Completado', color: 'green' },
  { value: 'cancelado', label: 'Cancelado', color: 'red' },
  { value: 'pausado', label: 'Pausado', color: 'gray' },
];

export const ESTADOS_ETAPA: { value: EstadoEtapa; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'gray' },
  { value: 'en_progreso', label: 'En Progreso', color: 'blue' },
  { value: 'completada', label: 'Completada', color: 'green' },
  { value: 'omitida', label: 'Omitida', color: 'gray' },
];

export function calcularProgresoProceso(etapas: ProcesoEtapa[]): number {
  if (!etapas.length) return 0;
  const completadas = etapas.filter(e => e.estado === 'completada' || e.estado === 'omitida').length;
  return Math.round((completadas / etapas.length) * 100);
}

export function calcularProgresoEtapa(checklist: ProcesoChecklistItem[]): number {
  if (!checklist.length) return 0;
  const completados = checklist.filter(c => c.completado).length;
  return Math.round((completados / checklist.length) * 100);
}

export function puedeAvanzarEtapa(checklist: ProcesoChecklistItem[]): boolean {
  return checklist.filter(c => c.obligatorio).every(c => c.completado);
}
