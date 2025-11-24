import { NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { normalizeNotifications } from "@/lib/notifications/transform";
import type { NotificacionDbRecord } from "@/types/notificaciones";

export async function GET(request: Request) {
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

    let query = supabase
      .schema("crm")
      .from("notificacion")
      .select("id, tipo, titulo, mensaje, leida, data, created_at, updated_at")
      .eq("usuario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (unreadOnly) {
      query = query.eq("leida", false);
    }

    if (since) {
      query = query.gt("created_at", since);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const normalized = normalizeNotifications((data ?? []) as NotificacionDbRecord[]);

    return NextResponse.json({ data: normalized });
  } catch (error) {
    console.error("Error obteniendo notificaciones:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
