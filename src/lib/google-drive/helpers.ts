import { createServiceRoleClient } from "@/lib/supabase.server";
import type { SupabaseClient } from "@supabase/supabase-js";

type AnySupabaseClient = SupabaseClient<any, string, any, any>;
import { GoogleDriveClient, getGoogleDriveClient } from "./client";

interface GoogleDriveSyncConfig {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  ultima_sincronizacion_at?: string | null;
  [key: string]: unknown;
}

/**
 * Obtiene el cliente de Google Drive configurado desde la base de datos
 * Incluye refresh automático de tokens si es necesario
 */
interface GetConfiguredClientOptions {
  supabaseClient?: AnySupabaseClient | null;
}

export async function getConfiguredGoogleDriveClient({
  supabaseClient,
}: GetConfiguredClientOptions = {}): Promise<{
  client: GoogleDriveClient;
  config: GoogleDriveSyncConfig;
} | null> {
  try {
    let supabase = supabaseClient as AnySupabaseClient | null | undefined;

    if (!supabase) {
      const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
      if (!hasServiceRole) {
        console.error('Supabase service role key no está definido en el entorno');
        return null;
      }

      supabase = createServiceRoleClient();
    }

    if (!supabase) {
      console.error('No se pudo inicializar el cliente de Supabase para Google Drive');
      return null;
    }

    // Obtener configuración activa de Google Drive
    const { data: configs, error } = await supabase
      .from('google_drive_sync_config')
      .select('*')
      .eq('activo', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error consultando google_drive_sync_config:', error);
      return null;
    }

    const config = configs?.[0] as GoogleDriveSyncConfig | undefined;

    if (!config) {
      console.log('No hay configuración activa de Google Drive');
      return null;
    }

    if (!config.access_token) {
      console.log('Configuración sin access_token');
      return null;
    }

    // Obtener credenciales de entorno
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('Faltan credenciales de Google Drive en variables de entorno', {
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret),
        hasRedirectUri: Boolean(redirectUri),
      });
      return null;
    }

    // Obtener cliente con refresh automático de tokens
    const client = await getGoogleDriveClient({
      accessToken: config.access_token,
      refreshToken: config.refresh_token || undefined,
      expiryDate: config.token_expires_at ? new Date(config.token_expires_at).getTime() : undefined,
      clientId,
      clientSecret,
      redirectUri,
    });

    return { client, config };
  } catch (error) {
    console.error('Error obteniendo cliente de Google Drive:', error);
    return null;
  }
}

/**
 * Verifica si Google Drive está configurado y conectado
 */
export async function isGoogleDriveConfigured(): Promise<boolean> {
  const result = await getConfiguredGoogleDriveClient();
  return result !== null;
}
