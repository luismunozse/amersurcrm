/**
 * Servicio de Twilio para WhatsApp y SMS
 *
 * Este servicio maneja toda la comunicación con la API de Twilio
 * para envío de mensajes WhatsApp y SMS.
 */

import twilio from 'twilio';

// Cliente de Twilio (se inicializa una vez)
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Credenciales de Twilio no configuradas. Revisa las variables de entorno.');
  }

  return twilio(accountSid, authToken);
};

/**
 * Tipos de respuesta de Twilio
 */
export interface TwilioMessageResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  dateCreated: Date;
  dateSent?: Date;
  errorCode?: number;
  errorMessage?: string;
}

/**
 * Envía un mensaje de WhatsApp a través de Twilio
 *
 * @param to - Número de teléfono del destinatario (formato: +51987654321)
 * @param body - Contenido del mensaje
 * @param mediaUrl - URL de imagen/archivo adjunto (opcional)
 * @returns Respuesta de Twilio con el SID del mensaje
 */
export async function enviarWhatsApp(
  to: string,
  body: string,
  mediaUrl?: string
): Promise<TwilioMessageResponse> {
  try {
    const client = getTwilioClient();
    const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

    if (!whatsappFrom) {
      throw new Error('TWILIO_WHATSAPP_FROM no configurado en variables de entorno');
    }

    // Asegurarse que el número tenga formato whatsapp:+51...
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    const messageData: any = {
      from: whatsappFrom,
      to: whatsappTo,
      body: body,
    };

    // Si hay imagen/archivo adjunto
    if (mediaUrl) {
      messageData.mediaUrl = [mediaUrl];
    }

    const message = await client.messages.create(messageData);

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      body: message.body,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent || undefined,
      errorCode: message.errorCode || undefined,
      errorMessage: message.errorMessage || undefined,
    };
  } catch (error: any) {
    console.error('Error enviando WhatsApp con Twilio:', error);
    throw new Error(`Error al enviar WhatsApp: ${error.message}`);
  }
}

/**
 * Envía un SMS a través de Twilio
 *
 * @param to - Número de teléfono del destinatario (formato: +51987654321)
 * @param body - Contenido del mensaje
 * @returns Respuesta de Twilio con el SID del mensaje
 */
export async function enviarSMS(
  to: string,
  body: string
): Promise<TwilioMessageResponse> {
  try {
    const client = getTwilioClient();
    const phoneFrom = process.env.TWILIO_PHONE_NUMBER;

    if (!phoneFrom) {
      throw new Error('TWILIO_PHONE_NUMBER no configurado en variables de entorno');
    }

    const message = await client.messages.create({
      from: phoneFrom,
      to: to,
      body: body,
    });

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      body: message.body,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent || undefined,
      errorCode: message.errorCode || undefined,
      errorMessage: message.errorMessage || undefined,
    };
  } catch (error: any) {
    console.error('Error enviando SMS con Twilio:', error);
    throw new Error(`Error al enviar SMS: ${error.message}`);
  }
}

/**
 * Envía un mensaje masivo de WhatsApp a múltiples destinatarios
 *
 * @param destinatarios - Array de números de teléfono
 * @param body - Contenido del mensaje
 * @param mediaUrl - URL de imagen/archivo adjunto (opcional)
 * @returns Array de respuestas, exitosas y fallidas
 */
export async function enviarWhatsAppMasivo(
  destinatarios: string[],
  body: string,
  mediaUrl?: string
): Promise<{
  exitosos: TwilioMessageResponse[];
  fallidos: { numero: string; error: string }[];
}> {
  const exitosos: TwilioMessageResponse[] = [];
  const fallidos: { numero: string; error: string }[] = [];

  // Enviar mensajes uno por uno (Twilio no tiene batch API)
  for (const numero of destinatarios) {
    try {
      const respuesta = await enviarWhatsApp(numero, body, mediaUrl);
      exitosos.push(respuesta);

      // Pequeño delay para no sobrecargar la API (50ms entre mensajes)
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error: any) {
      fallidos.push({
        numero,
        error: error.message,
      });
    }
  }

  return { exitosos, fallidos };
}

/**
 * Envía un SMS masivo a múltiples destinatarios
 *
 * @param destinatarios - Array de números de teléfono
 * @param body - Contenido del mensaje
 * @returns Array de respuestas, exitosas y fallidas
 */
export async function enviarSMSMasivo(
  destinatarios: string[],
  body: string
): Promise<{
  exitosos: TwilioMessageResponse[];
  fallidos: { numero: string; error: string }[];
}> {
  const exitosos: TwilioMessageResponse[] = [];
  const fallidos: { numero: string; error: string }[] = [];

  for (const numero of destinatarios) {
    try {
      const respuesta = await enviarSMS(numero, body);
      exitosos.push(respuesta);

      // Pequeño delay para no sobrecargar la API
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error: any) {
      fallidos.push({
        numero,
        error: error.message,
      });
    }
  }

  return { exitosos, fallidos };
}

/**
 * Verifica el estado de un mensaje enviado
 *
 * @param messageSid - SID del mensaje de Twilio
 * @returns Estado actual del mensaje
 */
export async function obtenerEstadoMensaje(messageSid: string) {
  try {
    const client = getTwilioClient();
    const message = await client.messages(messageSid).fetch();

    return {
      sid: message.sid,
      status: message.status,
      to: message.to,
      from: message.from,
      dateCreated: message.dateCreated,
      dateSent: message.dateSent || undefined,
      dateUpdated: message.dateUpdated,
      errorCode: message.errorCode || undefined,
      errorMessage: message.errorMessage || undefined,
    };
  } catch (error: any) {
    console.error('Error obteniendo estado del mensaje:', error);
    throw new Error(`Error al obtener estado: ${error.message}`);
  }
}

/**
 * Valida si las credenciales de Twilio están configuradas
 *
 * @returns true si las credenciales están configuradas
 */
export function verificarCredencialesTwilio(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER &&
    process.env.TWILIO_WHATSAPP_FROM
  );
}

/**
 * Obtiene información de la cuenta de Twilio
 *
 * @returns Información básica de la cuenta
 */
export async function obtenerInfoCuentaTwilio() {
  try {
    const client = getTwilioClient();
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch();

    return {
      sid: account.sid,
      nombre: account.friendlyName,
      estado: account.status,
      tipo: account.type,
    };
  } catch (error: any) {
    console.error('Error obteniendo info de cuenta Twilio:', error);
    throw new Error(`Error al obtener info de cuenta: ${error.message}`);
  }
}
