// Tipos para Marketing WhatsApp click-to-chat (sin Twilio/Meta API)

export type EstadoEnvioLog = 'abierto' | 'enviado' | 'respondido' | 'descartado';

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

export type MediaTipo = "imagen" | "pdf" | "video" | "audio";

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
  media_url?: string | null;
  media_tipo?: MediaTipo | null;
  created_by?: string;
  updated_by?: string | null;
  eliminado_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Snippet reutilizable {{>slug}}
export interface MarketingSnippet {
  id: string;
  slug: string;
  nombre: string;
  contenido: string;
  descripcion?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
  eliminado_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Registro de envío (cada apertura de wa.me)
export interface MarketingEnvioLog {
  id: string;
  template_id?: string | null;
  cliente_id?: string | null;
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
}

// Estadísticas de marketing
export interface EstadisticasMarketing {
  envios_hoy: number;
  envios_semana: number;
  marcados_enviados_hoy: number;
  marcados_respondidos_hoy: number;
  tasa_respuesta_promedio: number;
}
