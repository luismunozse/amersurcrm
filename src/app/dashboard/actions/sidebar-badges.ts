"use server";

import { createServerOnlyClient } from "@/lib/supabase.server";
import { resolveEquipoScope } from "@/lib/auth/equipo-scope.server";

export type SidebarBadges = {
  clientes?: number;
  pipeline?: number;
  agenda?: number;
  pagos?: number;
};

/**
 * Badge counts for sidebar — polled every ~60s.
 * Agenda and cobranza are global for admin/gerente, SCOPED TO TEAM
 * for coordinador (their team, not the entire organization — coordinador-teams
 * change), and personal for other roles.
 */
export async function getSidebarBadges(): Promise<SidebarBadges> {
  try {
    const s = await createServerOnlyClient();
    const { data: auth } = await s.auth.getUser();
    if (!auth?.user) return {};

    const userId = auth.user.id;

    const { data: perfil } = await s
      .schema("crm")
      .from("usuario_perfil")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    const username = perfil?.username;
    if (!username) return {};

    const scope = await resolveEquipoScope(s, userId);

    // Short-circuit for anonimo tier: no badges, no queries
    if (scope.tier === "anonimo") return {};

    const esGlobal = scope.tier === "global";
    const equipoUserIds = scope.tier === "equipo" ? scope.equipoUserIds : null;
    const equipoUsernames = scope.tier === "equipo" ? scope.equipoUsernames : null;

    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = `${today}T00:00:00`;
    const endOfDay = `${today}T23:59:59.999`;

    const [clientesRes, interaccionesRes, eventosRes, recordatoriosRes, cuotasRes] =
      await Promise.all([
        // Clients to contact assigned to the salesperson
        s
          .schema("crm")
          .from("cliente")
          .select("id", { count: "exact", head: true })
          .eq("estado_cliente", "por_contactar")
          .eq("vendedor_username", username),

        // Pipeline — clients with next action overdue or today
        s
          .schema("crm")
          .from("cliente_interaccion")
          .select("cliente_id")
          .eq("vendedor_username", username)
          .not("fecha_proxima_accion", "is", null)
          .lte("fecha_proxima_accion", endOfDay),

        // Agenda — today's non-cancelled events. Admin/gerente see all;
        // coordinador sees their team's; others see only their own.
        (() => {
          const q = s
            .schema("crm")
            .from("evento")
            .select("id", { count: "exact", head: true })
            .neq("estado", "cancelado")
            .gte("fecha_inicio", startOfDay)
            .lte("fecha_inicio", endOfDay);
          if (esGlobal) return q;
          if (equipoUserIds) return q.in("vendedor_id", equipoUserIds);
          return q.eq("vendedor_id", userId);
        })(),

        // Agenda — today's pending reminders. Same scope as events.
        (() => {
          const q = s
            .schema("crm")
            .from("recordatorio")
            .select("id", { count: "exact", head: true })
            .eq("completado", false)
            .gte("fecha_recordatorio", startOfDay)
            .lte("fecha_recordatorio", endOfDay);
          if (esGlobal) return q;
          if (equipoUserIds) return q.in("vendedor_id", equipoUserIds);
          return q.eq("vendedor_id", userId);
        })(),

        // Collections — overdue/in-arrears payments. Admin/gerente see all;
        // coordinador sees their team's; others see only their own.
        (() => {
          const q = s
            .schema("crm")
            .from("v_cobranza")
            .select("id", { count: "exact", head: true })
            .in("estado_cobranza", ["vencida", "en_mora"]);
          if (esGlobal) return q;
          if (equipoUsernames) return q.in("vendedor_username", equipoUsernames);
          return q.eq("vendedor_username", username);
        })(),
      ]);

    const pipelineClienteIds = new Set(
      (interaccionesRes.data ?? []).map((r) => r.cliente_id as string)
    );

    return {
      clientes: clientesRes.count ?? 0,
      pipeline: pipelineClienteIds.size,
      agenda: (eventosRes.count ?? 0) + (recordatoriosRes.count ?? 0),
      pagos: cuotasRes.count ?? 0,
    };
  } catch {
    return {};
  }
}
