import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { normalizeNotifications } from "@/lib/notifications/transform";
import type { NotificacionDbRecord } from "@/types/notificaciones";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const url = new URL(request.url);
    const since = url.searchParams.get("since");
    const unreadOnly = url.searchParams.get("unread") === "true";

    // OPTIMIZADO: Ejecutar ambas queries en paralelo (~100ms vs ~200ms secuencial)
    let dataQuery = supabase
      .schema("crm")
      .from("notificacion")
      .select("id, tipo, titulo, mensaje, leida, data, created_at, updated_at")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (unreadOnly) {
      dataQuery = dataQuery.eq("leida", false);
    }

    if (since) {
      dataQuery = dataQuery.gt("created_at", since);
    }

    const countQuery = supabase
      .schema("crm")
      .from("notificacion")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", user.id)
      .eq("leida", false);

    const [dataResult, countResult] = await Promise.all([dataQuery, countQuery]);

    if (dataResult.error) {
      return NextResponse.json({ error: dataResult.error.message }, { status: 500 });
    }

    const normalized = normalizeNotifications((dataResult.data ?? []) as NotificacionDbRecord[]);
    const unreadCount = countResult.count ?? 0;

    return NextResponse.json({
      data: normalized,
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * POST /api/notificaciones
 * Acciones: marcar todas como leídas
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await request.json();

    if (body.action === "mark_all_read") {
      const { data, error } = await supabase
        .schema("crm")
        .from("notificacion")
        .update({ leida: true, updated_at: new Date().toISOString() })
        .eq("usuario_id", user.id)
        .eq("leida", false)
        .select("id");

      if (error) {
        console.error("[Notificaciones] Error marcando todas:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        markedCount: data?.length || 0,
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("[Notificaciones] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
