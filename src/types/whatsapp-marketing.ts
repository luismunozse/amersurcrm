// Tipos para el sistema de WhatsApp Marketing

export type CanalTipo = 'whatsapp' | 'facebook' | 'instagram' | 'email';

export type CategoriaTemplate = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export type EstadoAprobacion = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED';

export type EstadoCampana = 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';

export type EstadoConversacion = 'ABIERTA' | 'CERRADA' | 'ARCHIVADA';

export type DireccionMensaje = 'IN' | 'OUT';

export type TipoMensaje = 'SESSION' | 'TEMPLATE' | 'INTERACTIVE';

export type EstadoMensaje = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

export type TipoAudiencia = 'DINAMICO' | 'ESTATICO';

// Credenciales de WhatsApp Cloud API
export interface MarketingChannelCredential {
  id: string;
  canal_tipo: CanalTipo;
  nombre: string;
  descripcion?: string;
  app_id?: string;
  phone_number_id: string;
  access_token: string;
  token_expires_at?: string;
  webhook_verify_token: string;
  activo: boolean;
  es_sandbox: boolean;
  max_messages_per_second: number;
  max_messages_per_day: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Plantilla de mensaje
export interface MarketingTemplate {
  id: string;
  nombre: string;
  categoria: CategoriaTemplate;
  idioma: string;
  header_tipo?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'NONE';
  header_contenido?: string;
  body_texto: string;
  footer_texto?: string;
  variables: string[];
  botones: Array<{
    tipo: 'URL' | 'QUICK_REPLY' | 'PHONE_NUMBER';
    texto: string;
    url?: string;
    phone_number?: string;
  }>;
  whatsapp_template_id?: string;
  estado_aprobacion: EstadoAprobacion;
  motivo_rechazo?: string;
  fecha_aprobacion?: string;
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

// Campaña
export interface MarketingCampana {
  id: string;
  nombre: string;
  descripcion?: string;
  template_id: string;
  audiencia_id: string;
  credential_id: string;
  variables_valores: Record<string, string>;
  objetivo?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  enviar_inmediatamente: boolean;
  max_envios_por_segundo: number;
  es_ab_test: boolean;
  ab_porcentaje_muestra?: number;
  ab_variante_ganadora?: string;
  estado: EstadoCampana;
  total_enviados: number;
  total_entregados: number;
  total_leidos: number;
  total_respondidos: number;
  total_conversiones: number;
  total_fallidos: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
  completado_at?: string;
  // Relaciones
  template?: MarketingTemplate;
  audiencia?: MarketingAudiencia;
}

// Conversación
export interface MarketingConversacion {
  id: string;
  cliente_id: string;
  telefono: string;
  credential_id?: string;
  estado: EstadoConversacion;
  vendedor_asignado?: string;
  fecha_asignacion?: string;
  is_session_open: boolean;
  session_expires_at?: string;
  last_inbound_at?: string;
  last_outbound_at?: string;
  first_message_at?: string;
  closed_at?: string;
  total_mensajes_in: number;
  total_mensajes_out: number;
  tiempo_primera_respuesta_segundos?: number;
  notas_internas?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  // Relaciones
  cliente?: {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
  };
  vendedor?: {
    username: string;
    nombre_completo: string;
  };
}

// Mensaje
export interface MarketingMensaje {
  id: string;
  conversacion_id: string;
  direccion: DireccionMensaje;
  tipo: TipoMensaje;
  contenido_tipo: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'AUDIO' | 'LOCATION' | 'CONTACT';
  contenido_texto?: string;
  contenido_media_url?: string;
  contenido_media_caption?: string;
  template_id?: string;
  template_variables?: Record<string, string>;
  campana_id?: string;
  wa_message_id?: string;
  wa_conversation_id?: string;
  estado: EstadoMensaje;
  error_code?: string;
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  created_at: string;
  updated_at: string;
}

// Automatización
export interface MarketingAutomatizacion {
  id: string;
  nombre: string;
  descripcion?: string;
  trigger_evento: string;
  condiciones: Record<string, any>;
  acciones: Array<{
    tipo: 'enviar_template' | 'esperar' | 'asignar_vendedor' | 'actualizar_etapa';
    template_id?: string;
    delay_minutos?: number;
    solo_si_no_respondio?: boolean;
    vendedor_username?: string;
    nueva_etapa?: string;
  }>;
  activo: boolean;
  total_ejecutadas: number;
  total_completadas: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Ejecución de automatización
export interface MarketingAutomatizacionEjecucion {
  id: string;
  automatizacion_id: string;
  cliente_id: string;
  conversacion_id?: string;
  estado: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  paso_actual: number;
  pasos_ejecutados: any[];
  error_mensaje?: string;
  started_at: string;
  completed_at?: string;
  next_action_at?: string;
}

// Event Log
export interface MarketingEventLog {
  id: string;
  evento_tipo: string;
  conversacion_id?: string;
  mensaje_id?: string;
  campana_id?: string;
  payload?: Record<string, any>;
  resultado: 'SUCCESS' | 'ERROR' | 'WARNING';
  error_mensaje?: string;
  created_at: string;
}

// Webhook de WhatsApp
export interface WhatsAppWebhookMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: {
            body: string;
          };
          image?: {
            id: string;
            mime_type: string;
            sha256: string;
            caption?: string;
          };
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
          }>;
        }>;
      };
      field: string;
    }>;
  }>;
}

// Request para enviar mensaje de WhatsApp
export interface WhatsAppSendMessageRequest {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text' | 'template' | 'image' | 'video' | 'document';
  text?: {
    preview_url?: boolean;
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters?: Array<{
        type: 'text' | 'image' | 'video' | 'document';
        text?: string;
        image?: { link: string };
        video?: { link: string };
        document?: { link: string; filename: string };
      }>;
      sub_type?: 'url' | 'quick_reply';
      index?: number;
    }>;
  };
}

// Response de WhatsApp API
export interface WhatsAppSendMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

// Métricas de campaña
export interface MetricasCampana {
  total_enviados: number;
  total_entregados: number;
  total_leidos: number;
  total_respondidos: number;
  total_conversiones: number;
  total_fallidos: number;
  tasa_entrega: number;
  tasa_lectura: number;
  tasa_respuesta: number;
  tasa_conversion: number;
}

// Estadísticas de marketing
export interface EstadisticasMarketing {
  campanas_activas: number;
  mensajes_enviados_hoy: number;
  conversaciones_abiertas: number;
  tasa_respuesta_promedio: number;
  tiempo_respuesta_promedio_segundos: number;
  conversiones_mes: number;
}