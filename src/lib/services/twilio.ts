/**
 * Servicio de Twilio para WhatsApp y SMS
 *
 * Este servicio maneja toda la comunicación con la API de Twilio
 * para envío de mensajes WhatsApp y SMS.
 */

import twilio from 'twilio';
import { createServiceRoleClient } from '@/lib/supabase.server';

type TwilioClientInstance = ReturnType<typeof twilio>;

type TwilioRuntimeConfig = {
  accountSid: string;
  authToken: string;
  whatsappFrom?: string | null;
  smsFrom?: string | null;
};

type TwilioFactoryResult = {
  client: TwilioClientInstance;
  config: TwilioRuntimeConfig;
};

let customTwilioClientFactory: (() => Promise<TwilioFactoryResult> | TwilioFactoryResult) | null = null;

const CONFIG_TTL_MS = 5 * 60 * 1000;
let credentialCache: { config: TwilioRuntimeConfig; expiresAt: number } | null = null;

export function invalidateTwilioClientCache() {
  credentialCache = null;
}

// Permite inyectar un cliente de pruebas (solo se usa en tests)
export function __setTwilioClientFactory(factory: (() => Promise<TwilioFactoryResult> | TwilioFactoryResult) | null) {
  customTwilioClientFactory = factory;
}

async function loadConfigFromDatabase(): Promise<TwilioRuntimeConfig | null> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .schema('crm')
      .from('marketing_channel_credential')
      .select('provider, account_sid, auth_token, access_token, whatsapp_from, sms_from, phone_number_id, activo')
      .eq('canal_tipo', 'whatsapp')
      .eq('activo', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[Twilio] No se pudo obtener credenciales desde BD:', error.message);
      return null;
    }

    if (!data || (data.provider && data.provider !== 'twilio')) {
      return null;
    }

    const accountSid = data.account_sid || process.env.TWILIO_ACCOUNT_SID;
    const authToken = data.auth_token || data.access_token || process.env.TWILIO_AUTH_TOKEN;
    const whatsappFrom = data.whatsapp_from || data.phone_number_id || process.env.TWILIO_WHATSAPP_FROM;
    const smsFrom = data.sms_from || process.env.TWILIO_PHONE_NUMBER || null;

    if (!accountSid || !authToken) {
      return null;
    }

    return {
      accountSid,
      authToken,
      whatsappFrom,
      smsFrom
    };
  } catch (error) {
    console.error('[Twilio] Error leyendo credenciales desde la base de datos:', error);
    return null;
  }
}

async function resolveRuntimeConfig(): Promise<TwilioRuntimeConfig | null> {
  if (credentialCache && Date.now() < credentialCache.expiresAt) {
    return credentialCache.config;
  }

  const dbConfig = await loadConfigFromDatabase();
  if (dbConfig) {
    credentialCache = { config: dbConfig, expiresAt: Date.now() + CONFIG_TTL_MS };
    return dbConfig;
  }

  const envAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const envAuthToken = process.env.TWILIO_AUTH_TOKEN;

  if (!envAccountSid || !envAuthToken) {
    return null;
  }

  const fallbackConfig: TwilioRuntimeConfig = {
    accountSid: envAccountSid,
    authToken: envAuthToken,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
    smsFrom: process.env.TWILIO_PHONE_NUMBER
  };

  credentialCache = { config: fallbackConfig, expiresAt: Date.now() + CONFIG_TTL_MS };
  return fallbackConfig;
}

const getTwilioRuntime = async (): Promise<TwilioFactoryResult> => {
  if (customTwilioClientFactory) {
    return await customTwilioClientFactory();
  }

  const config = await resolveRuntimeConfig();

  if (!config) {
    throw new Error('Credenciales de Twilio no configuradas. Configura la integración en Marketing > Configuración.');
  }

  const client = twilio(config.accountSid, config.authToken);
  return { client, config };
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
    const { client, config } = await getTwilioRuntime();
    const whatsappFrom = config.whatsappFrom || process.env.TWILIO_WHATSAPP_FROM;

    if (!whatsappFrom) {
      throw new Error('No hay un número remitente configurado para WhatsApp.');
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
    const { client, config } = await getTwilioRuntime();
    const phoneFrom = config.smsFrom || process.env.TWILIO_PHONE_NUMBER;

    if (!phoneFrom) {
      throw new Error('No hay un número remitente configurado para SMS.');
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
    const { client } = await getTwilioRuntime();
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
export async function verificarCredencialesTwilio(): Promise<boolean> {
  const config = await resolveRuntimeConfig();
  return Boolean(config?.accountSid && config?.authToken && config?.whatsappFrom);
}

/**
 * Obtiene información de la cuenta de Twilio
 *
 * @returns Información básica de la cuenta
 */
export async function obtenerInfoCuentaTwilio() {
  try {
    const { client, config } = await getTwilioRuntime();
    const account = await client.api.accounts(config.accountSid).fetch();

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
