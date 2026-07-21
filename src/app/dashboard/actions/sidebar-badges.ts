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
 * Conteos para badges del sidebar — se ejecuta por polling cada ~60s.
 * Agenda y cobranza son globales para admin/gerente, ACOTADAS AL EQUIPO
 * para coordinador (su equipo, no toda la organización — coordinador-teams
 * change), y propias para el resto de roles.
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
      .select("username, rol:rol!usuario_perfil_rol_id_fkey(nombre)")
      .eq("id", userId)
      .maybeSingle();

    const username = perfil?.username;
    if (!username) return {};

    const scope = await resolveEquipoScope(s, userId);
    const esGlobal = scope.tier === "global";
    const equipoUserIds = scope.tier === "equipo" ? scope.equipoUserIds : null;
    const equipoUsernames = scope.tier === "equipo" ? scope.equipoUsernames : null;

    const today = new Date().toISOString().slice(0, 10);
    const startOfDay = `${today}T00:00:00`;
    const endOfDay = `${today}T23:59:59.999`;

    const [clientesRes, interaccionesRes, eventosRes, recordatoriosRes, cuotasRes] =
      await Promise.all([
        // Clientes por contactar asignados al vendedor
        s
          .schema("crm")
          .from("cliente")
          .select("id", { count: "exact", head: true })
          .eq("estado_cliente", "por_contactar")
          .eq("vendedor_username", username),

        // Pipeline — clientes con fecha_proxima_accion vencida o hoy
        s
          .schema("crm")
          .from("cliente_interaccion")
          .select("cliente_id")
          .eq("vendedor_username", username)
          .not("fecha_proxima_accion", "is", null)
          .lte("fecha_proxima_accion", endOfDay),

        // Agenda — eventos de hoy no cancelados. Admin/gerente ven todos;
        // coordinador ve los de su equipo; el resto solo los propios.
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

        // Agenda — recordatorios de hoy pendientes. Mismo alcance que eventos.
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

        // Cobranza — cuotas vencidas/en mora. Admin/gerente ven todas;
        // coordinador ve las de su equipo; el resto solo las propias.
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
