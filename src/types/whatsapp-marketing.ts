// Tipos para Marketing WhatsApp click-to-chat (sin Twilio/Meta API)

export type TipoAudiencia = 'DINAMICO' | 'ESTATICO';

export type EstadoCampana =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED';

export type EstadoEnvioLog = 'abierto' | 'enviado' | 'respondido' | 'descartado';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

// Plantilla de mensaje WhatsApp
export interface MarketingTemplate {
  id: string;
  nombre: string;
  categoria: string; // libre: bienvenida, seguimiento, cobranza, etc.
  body_texto: string;
  variables: string[]; // detectadas de {{var}} en el body
  objetivo?: string;
  tags: string[];
  activo: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Audiencia (segmento)
export interface MarketingAudiencia {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoAudiencia;
  filtros: {
    proyecto_id?: string;
    estado_cliente?: string[];
    ultima_interaccion_dias?: { operator: string; value: number };
    tags?: string[];
    tiene_whatsapp_consentimiento?: boolean;
  };
  contactos_ids?: string[];
  contactos_count: number;
  ultima_actualizacion?: string;
  activo: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Campaña — modo asistente uno-a-uno
export interface MarketingCampana {
  id: string;
  nombre: string;
  descripcion?: string;
  template_id: string;
  audiencia_id: string;
  variables_valores: Record<string, string>;
  objetivo?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  enviar_inmediatamente: boolean;
  estado: EstadoCampana;
  total_enviados: number;
  total_abiertos: number;
  total_marcados_enviados: number;
  total_respondidos: number;
  total_descartados: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  completado_at?: string;
  // Relaciones
  template?: MarketingTemplate;
  audiencia?: MarketingAudiencia;
}

// Registro de envío (cada apertura de wa.me)
export interface MarketingEnvioLog {
  id: string;
  template_id?: string | null;
  cliente_id?: string | null;
  campana_id?: string | null;
  recordatorio_id?: string | null;
  vendedor_id: string;
  vendedor_username?: string | null;
  telefono: string;
  variables_valores: Record<string, string>;
  mensaje_renderizado: string;
  estado: EstadoEnvioLog;
  abierto_at: string;
  marcado_enviado_at?: string | null;
  marcado_respondido_at?: string | null;
  marcado_descartado_at?: string | null;
  notas?: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones (opcionales para joins)
  template?: Pick<MarketingTemplate, 'id' | 'nombre' | 'categoria'> | null;
  cliente?: { id: string; nombre: string; telefono?: string | null } | null;
  campana?: Pick<MarketingCampana, 'id' | 'nombre'> | null;
}

// Estadísticas de marketing
export interface EstadisticasMarketing {
  campanas_activas: number;
  envios_hoy: number;
  envios_semana: number;
  marcados_enviados_hoy: number;
  marcados_respondidos_hoy: number;
  tasa_respuesta_promedio: number;
}

// Métricas por campaña
export interface MetricasCampana {
  total_abiertos: number;
  total_marcados_enviados: number;
  total_respondidos: number;
  total_descartados: number;
  tasa_envio: number;       // marcados_enviados / abiertos
  tasa_respuesta: number;   // respondidos / marcados_enviados
}
