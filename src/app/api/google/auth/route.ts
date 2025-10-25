import { NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";

export async function GET() {
  try {
    // Verificar que el usuario sea admin
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const isAdmin = await esAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Obtener credenciales de Google desde variables de entorno
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Credenciales de Google Drive no configuradas en el servidor" },
        { status: 500 }
      );
    }

    // Construir URL de autorización de Google OAuth
    // drive.readonly: permite leer todos los archivos del Drive (no solo los creados por la app)
    const scopes = [
      "https://www.googleapis.com/auth/drive.readonly",
    ];

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", user.id); // Pasamos el user ID para verificar después

    // Redirigir al usuario a Google para autorizar
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Error en /api/google/auth:", error);
    return NextResponse.json(
      { error: "Error al iniciar autorización de Google Drive" },
      { status: 500 }
    );
  }
}
