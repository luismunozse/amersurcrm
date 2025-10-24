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

    // Verificar variables de entorno
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

    return NextResponse.json({
      configured: {
        GOOGLE_DRIVE_CLIENT_ID: Boolean(clientId),
        GOOGLE_DRIVE_CLIENT_SECRET: Boolean(clientSecret),
        GOOGLE_DRIVE_REDIRECT_URI: Boolean(redirectUri),
      },
      values: {
        GOOGLE_DRIVE_CLIENT_ID: clientId ? `${clientId.substring(0, 20)}...` : "NO CONFIGURADO",
        GOOGLE_DRIVE_CLIENT_SECRET: clientSecret ? "GOCSPX-***" : "NO CONFIGURADO",
        GOOGLE_DRIVE_REDIRECT_URI: redirectUri || "NO CONFIGURADO",
      },
    });
  } catch (error) {
    console.error("Error verificando configuración:", error);
    return NextResponse.json(
      { error: "Error al verificar configuración" },
      { status: 500 }
    );
  }
}
