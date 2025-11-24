import { redirect } from "next/navigation";
import NotificacionesPanel from "@/components/NotificacionesPanel";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { normalizeNotifications } from "@/lib/notifications/transform";
import type { NotificacionDbRecord } from "@/types/notificaciones";

export default async function NotificacionesPage() {
  const supabase = await createServerOnlyClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data, error } = await supabase
    .schema("crm")
    .from("notificacion")
    .select("id, tipo, titulo, mensaje, leida, data, created_at, updated_at")
    .eq("usuario_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error obteniendo notificaciones:", error.message);
  }

  const initialNotificaciones = normalizeNotifications((data ?? []) as NotificacionDbRecord[]);

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-display font-bold text-crm-text-primary md:text-3xl">Notificaciones</h1>
        <p className="text-sm text-crm-text-muted md:text-base">
          Revisa y gestiona todas las alertas, recordatorios y novedades del CRM desde una sola vista.
        </p>
      </div>

      <NotificacionesPanel initialNotificaciones={initialNotificaciones} />
    </div>
  );
}
