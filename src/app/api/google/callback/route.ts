import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // user ID
    const error = searchParams.get("error");

    console.log("[Google Callback] Iniciando proceso de callback");
    console.log("[Google Callback] Code presente:", Boolean(code));
    console.log("[Google Callback] State presente:", Boolean(state));
    console.log("[Google Callback] Error parámetro:", error);

    // Si el usuario canceló la autorización
    if (error) {
      console.log("[Google Callback] Usuario canceló autorización");
      return NextResponse.redirect(
        new URL(
          `/dashboard/admin/configuracion?error=google_auth_cancelled`,
          request.url
        )
      );
    }

    if (!code || !state) {
      console.log("[Google Callback] Faltan parámetros code o state");
      return NextResponse.redirect(
        new URL(
          `/dashboard/admin/configuracion?error=google_auth_invalid`,
          request.url
        )
      );
    }

    // Verificar que el usuario esté autenticado
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== state) {
      return NextResponse.redirect(
        new URL(`/dashboard/admin/configuracion?error=unauthorized`, request.url)
      );
    }

    // Intercambiar el código por tokens
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/admin/configuracion?error=server_config_missing`,
          request.url
        )
      );
    }

    // Hacer la petición a Google para obtener los tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("[Google Callback] Error al obtener tokens de Google:", errorData);
      return NextResponse.redirect(
        new URL(
          `/dashboard/admin/configuracion?error=google_token_exchange_failed`,
          request.url
        )
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    console.log("[Google Callback] Tokens obtenidos exitosamente");
    console.log("[Google Callback] Access token presente:", Boolean(access_token));
    console.log("[Google Callback] Refresh token presente:", Boolean(refresh_token));

    // Calcular cuando expira el token
    const tokenExpiresAt = new Date(Date.now() + expires_in * 1000);

    // Guardar los tokens en la base de datos
    // Primero verificar si ya existe una configuración
    const { data: existingConfig } = await supabase
      .from("google_drive_sync_config")
      .select("id")
      .eq("activo", true)
      .maybeSingle();

    if (existingConfig) {
      // Actualizar configuración existente
      const { error: updateError } = await supabase
        .from("google_drive_sync_config")
        .update({
          access_token,
          refresh_token: refresh_token || undefined,
          token_expires_at: tokenExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingConfig.id);

      if (updateError) {
        console.error("[Google Callback] Error al actualizar tokens:", updateError);
        return NextResponse.redirect(
          new URL(
            `/dashboard/admin/configuracion?error=database_update_failed`,
            request.url
          )
        );
      }
      console.log("[Google Callback] Tokens actualizados en DB exitosamente");
    } else {
      // Crear nueva configuración
      const { error: insertError } = await supabase
        .from("google_drive_sync_config")
        .insert({
          nombre: "Configuración Principal",
          descripcion: "Sincronización con Google Drive",
          access_token,
          refresh_token: refresh_token || null,
          token_expires_at: tokenExpiresAt.toISOString(),
          activo: true,
          created_by: user.id,
        });

      if (insertError) {
        console.error("[Google Callback] Error al guardar tokens:", insertError);
        return NextResponse.redirect(
          new URL(
            `/dashboard/admin/configuracion?error=database_insert_failed`,
            request.url
          )
        );
      }
      console.log("[Google Callback] Tokens guardados en DB exitosamente");
    }

    console.log("[Google Callback] Proceso completado con éxito, redirigiendo");
    // Redirigir de vuelta a la página de configuración con éxito
    return NextResponse.redirect(
      new URL(`/dashboard/admin/configuracion?success=google_connected`, request.url)
    );
  } catch (error) {
    console.error("[Google Callback] Error inesperado:", error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/admin/configuracion?error=unexpected_error`,
        request.url
      )
    );
  }
}
