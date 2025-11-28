import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

/**
 * POST /api/auth/refresh
 *
 * Renueva el access token usando un refresh token
 * Usado por AmersurChat Chrome Extension para mantener sesión activa
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token es requerido" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Renovar sesión usando refresh token
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      console.error("[RefreshToken] Error renovando token:", error);
      return NextResponse.json(
        { error: "Refresh token inválido o expirado" },
        { status: 401 }
      );
    }

    console.log(`[RefreshToken] Token renovado para usuario: ${data.user?.id}`);

    return NextResponse.json({
      success: true,
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (error) {
    console.error("[RefreshToken] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
