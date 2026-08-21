/**
 * Tipos de datos del CRM Amersur
 */

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  rol: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  crmUrl: string;
}

/**
 * Estados posibles de un cliente. Espejo de ESTADOS_CLIENTE_OPTIONS en
 * `src/lib/types/clientes.ts` del CRM. `en_proceso` y `propietario` los setea
 * el flujo de venta desde el CRM web — la extensión los muestra pero no los
 * ofrece como opción (ver lib/estados.ts).
 */
export type EstadoCliente =
  | 'por_contactar'
  | 'contactado'
  | 'intermedio'
  | 'potencial'
  | 'en_proceso'
  | 'propietario'
  | 'desestimado'
  | 'transferido';

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
  email?: string | null;
  tipo_cliente?: 'persona' | 'empresa';
  estado_cliente: EstadoCliente;
  origen_lead: string;
  vendedor_asignado?: string | null;
  created_at?: string;
  notas?: string | null;
  // Username de WhatsApp del contacto (sin @). WhatsApp usernames (jun 2026):
  // los chats iniciados por username no exponen el teléfono real.
  whatsapp_username?: string | null;
  // Chat ID crudo: "<dígitos>@lid" (pseudónimo, no es el teléfono) para
  // chats por username, o dígitos del teléfono para chats clásicos.
  whatsapp_chat_id?: string | null;
}

export interface WhatsAppContact {
  // null cuando WhatsApp oculta el número real (chat iniciado por username).
  phone: string | null;
  // Username de WhatsApp del contacto (sin @), si el chat expone uno.
  username: string | null;
  /**
   * Nombre GUARDADO en la agenda, o null si el contacto no está agendado
   * (el header muestra el número o el username — ver extractContactName).
   *
   * null real, NO un sentinel tipo 'Sin nombre': ese string se colaba en la
   * UI como si fuera un nombre de verdad — precargaba el form de alta y los
   * leads terminaban llamándose literalmente "Sin nombre", y las plantillas
   * saludaban "Hola Sin nombre!". Cada consumidor decide su propio fallback.
   */
  name: string | null;
  chatId: string;
}

export interface CreateLeadPayload {
  nombre: string;
  // Opcionales: un contacto identificado solo por chat_id/username (LID)
  // puede no tener teléfono real disponible.
  telefono?: string;
  telefono_whatsapp?: string;
  origen_lead: string;
  canal: string;
  mensaje_inicial?: string;
  chat_id?: string;
  whatsapp_username?: string;
  // Username of a coordinador to assign the lead to (admin/gerente only).
  // Empty/omitted → automatic round-robin. Honored server-side only for
  // privileged callers pointing at an active coordinador.
  asignado_a?: string;
}

export interface Coordinador {
  username: string;
  nombre_completo: string | null;
}

export interface CreateLeadResponse {
  success: boolean;
  clienteId?: string;
  message?: string;
  vendedor?: string;
  existente?: boolean;
  cliente?: Cliente;
}
