import type { WhatsAppSendMessageRequest, WhatsAppSendMessageResponse } from "@/types/whatsapp-marketing";

export class WhatsAppClient {
  private phoneNumberId: string;
  private accessToken: string;
  private apiVersion: string = 'v21.0';

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
  }

  /**
   * Envía un mensaje de texto simple (session message)
   */
  async enviarMensajeTexto(to: string, texto: string): Promise<WhatsAppSendMessageResponse> {
    const request: WhatsAppSendMessageRequest = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: {
        preview_url: true,
        body: texto
      }
    };

    return this.enviarMensaje(request);
  }

  /**
   * Envía un mensaje usando una plantilla (template message)
   */
  async enviarMensajePlantilla(
    to: string,
    templateName: string,
    languageCode: string = 'es',
    components?: any[]
  ): Promise<WhatsAppSendMessageResponse> {
    const request: WhatsAppSendMessageRequest = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode
        },
        components: components
      }
    };

    return this.enviarMensaje(request);
  }

  /**
   * Envía un mensaje con imagen
   */
  async enviarMensajeImagen(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendMessageResponse> {
    const request: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'image',
      image: {
        link: imageUrl,
        ...(caption && { caption })
      }
    };

    return this.enviarMensaje(request);
  }

  /**
   * Método base para enviar mensajes
   */
  private async enviarMensaje(request: WhatsAppSendMessageRequest | any): Promise<WhatsAppSendMessageResponse> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`);
    }

    return response.json();
  }

  /**
   * Marca un mensaje como leído
   */
  async marcarComoLeido(messageId: string): Promise<{ success: boolean }> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`WhatsApp API Error: ${JSON.stringify(error)}`);
    }

    return { success: true };
  }

  /**
   * Obtiene información de un template
   */
  async obtenerTemplate(templateName: string): Promise<any> {
    // Nota: Esto requiere el WhatsApp Business Account ID
    // Por ahora retornamos null, implementar cuando se tenga el WABA ID
    return null;
  }
}

/**
 * Factory para crear cliente de WhatsApp con credenciales de la base de datos
 */
export async function crearWhatsAppClient(credentialId: string): Promise<WhatsAppClient | null> {
  try {
    const { createServerOnlyClient } = await import("@/lib/supabase.server");
    const supabase = await createServerOnlyClient();

    const { data: credential, error } = await supabase
      .schema('crm')
      .from('marketing_channel_credential')
      .select('phone_number_id, access_token')
      .eq('id', credentialId)
      .eq('activo', true)
      .single();

    if (error || !credential) {
      console.error('Error obteniendo credenciales:', error);
      return null;
    }

    return new WhatsAppClient(credential.phone_number_id, credential.access_token);
  } catch (error) {
    console.error('Error creando cliente WhatsApp:', error);
    return null;
  }
}
