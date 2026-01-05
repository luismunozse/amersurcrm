import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/test
 * Crea una notificación de prueba para el usuario autenticado
 * Útil para testing E2E de notificaciones en tiempo real
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const titulo = body.titulo || "Notificación de prueba";
    const mensaje = body.mensaje || "Esta es una notificación de prueba para verificar el sistema en tiempo real.";
    const tipo = body.tipo || "sistema";

    const { data: notificacion, error } = await supabase
      .schema("crm")
      .from("notificacion")
      .insert({
        usuario_id: user.id,
        tipo,
        titulo,
        mensaje,
        data: { test: true, timestamp: new Date().toISOString() },
      })
      .select("id, tipo, titulo, mensaje, created_at")
      .single();

    if (error) {
      console.error("[Notifications Test] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Notification Delivered Successfully",
      notificacion,
    });
  } catch (error) {
    console.error("[Notifications Test] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/test
 * Verifica el estado del sistema de notificaciones
 */
export async function GET() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Verificar que la tabla de notificaciones existe y es accesible
    const { count, error } = await supabase
      .schema("crm")
      .from("notificacion")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", user.id);

    if (error) {
      return NextResponse.json({
        status: "error",
        message: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({
      status: "ok",
      message: "Notification system is operational",
      totalNotifications: count,
    });
  } catch (error) {
    console.error("[Notifications Test] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
