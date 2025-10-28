import { NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
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

    // Verificar variables de entorno
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let driveConfigSummary: { hasActive: boolean; hasToken: boolean } = {
      hasActive: false,
      hasToken: false,
    };

    try {
      const serviceClient = createServiceRoleClient();
      const { data: driveConfigs } = await serviceClient
        .from("google_drive_sync_config")
        .select("id, access_token")
        .eq("activo", true)
        .order("updated_at", { ascending: false })
        .limit(1);

      const driveConfig = driveConfigs?.[0];

      driveConfigSummary = {
        hasActive: Boolean(driveConfig),
        hasToken: Boolean(driveConfig?.access_token),
      };
    } catch (serviceError) {
      console.error("No se pudo verificar google_drive_sync_config con service role:", serviceError);
    }

    return NextResponse.json({
      configured: {
        GOOGLE_DRIVE_CLIENT_ID: Boolean(clientId),
        GOOGLE_DRIVE_CLIENT_SECRET: Boolean(clientSecret),
        GOOGLE_DRIVE_REDIRECT_URI: Boolean(redirectUri),
        SUPABASE_SERVICE_ROLE_KEY: Boolean(serviceRole),
      },
      values: {
        GOOGLE_DRIVE_CLIENT_ID: clientId ? `${clientId.substring(0, 20)}...` : "NO CONFIGURADO",
        GOOGLE_DRIVE_CLIENT_SECRET: clientSecret ? "GOCSPX-***" : "NO CONFIGURADO",
        GOOGLE_DRIVE_REDIRECT_URI: redirectUri || "NO CONFIGURADO",
        SUPABASE_SERVICE_ROLE_KEY: serviceRole ? `${serviceRole.substring(0, 8)}...` : "NO CONFIGURADO",
      },
      driveConfig: driveConfigSummary,
    });
  } catch (error) {
    console.error("Error verificando configuración:", error);
    return NextResponse.json(
      { error: "Error al verificar configuración" },
      { status: 500 }
    );
  }
}
