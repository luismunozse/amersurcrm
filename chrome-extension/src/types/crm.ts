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

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
  email?: string | null;
  tipo_cliente?: 'persona' | 'empresa';
  estado_cliente: 'por_contactar' | 'contactado' | 'intermedio' | 'potencial' | 'desestimado' | 'transferido';
  origen_lead: string;
  vendedor_asignado?: string | null;
  created_at?: string;
  notas?: string | null;
}

export interface WhatsAppContact {
  phone: string;
  name: string;
  chatId: string;
}

export interface CreateLeadPayload {
  nombre: string;
  telefono: string;
  telefono_whatsapp: string;
  origen_lead: string;
  canal: string;
  mensaje_inicial?: string;
  chat_id?: string;
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
