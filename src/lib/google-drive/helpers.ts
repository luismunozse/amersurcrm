import { createServiceRoleClient } from "@/lib/supabase.server";
import type { SupabaseClient } from "@supabase/supabase-js";

type AnySupabaseClient = SupabaseClient<any, string, any, any>;
import { GoogleDriveClient, getGoogleDriveClient, GoogleOAuthClient } from "./client";

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
      return null;
    }

    if (!config.access_token) {
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

    // Verificar si el token necesita ser refrescado
    const now = Date.now();
    const expiryDate = config.token_expires_at ? new Date(config.token_expires_at).getTime() : undefined;
    const needsRefresh = expiryDate && expiryDate < now + 5 * 60 * 1000;

    // Obtener cliente con refresh automático de tokens
    let client: GoogleDriveClient;
    let updatedConfig = config;

    if (needsRefresh && config.refresh_token) {
      // El token está expirado o próximo a expirar, refrescarlo
      const oauthClient = new GoogleOAuthClient(clientId, clientSecret, redirectUri);
      
      try {
        const newTokens = await oauthClient.refreshAccessToken(config.refresh_token);
        
        // Guardar el nuevo token en la base de datos
        const newExpiryDate = new Date(newTokens.expiry_date);
        const { error: updateError } = await supabase
          .from('google_drive_sync_config')
          .update({
            access_token: newTokens.access_token,
            token_expires_at: newExpiryDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', config.id);

        if (updateError) {
          console.error('Error guardando token refrescado:', updateError);
          // Continuar con el token anterior aunque esté expirado
          client = new GoogleDriveClient(config.access_token);
        } else {
          // Actualizar la configuración local con el nuevo token
          updatedConfig = {
            ...config,
            access_token: newTokens.access_token,
            token_expires_at: newExpiryDate.toISOString(),
          };
          client = new GoogleDriveClient(newTokens.access_token);
          console.log('Token de Google Drive refrescado exitosamente');
        }
      } catch (refreshError) {
        console.error('Error refrescando token de Google Drive:', refreshError);
        // Si falla el refresh, intentar usar el token actual (puede que aún funcione)
        client = new GoogleDriveClient(config.access_token);
      }
    } else {
      // El token aún es válido, usar el cliente normal
      client = await getGoogleDriveClient({
        accessToken: config.access_token,
        refreshToken: config.refresh_token || undefined,
        expiryDate,
        clientId,
        clientSecret,
        redirectUri,
      });
    }

    return { client, config: updatedConfig };
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
