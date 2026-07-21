import { NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { esAdminOCoordinador, esCoordinador } from "@/lib/permissions/server";
export const dynamic = 'force-dynamic';

const ROLES_VENDEDORES = ["ROL_VENDEDOR", "ROL_COORDINADOR_VENTAS"];

export async function GET() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!(await esAdminOCoordinador())) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    // A coordinador should only see their own team in this dropdown —
    // never other coordinadores or vendedores from another team.
    const esSoloCoordinador = await esCoordinador();

    const serviceSupabase = createServiceRoleClient();

    type RolInfo = { nombre?: string | null } | Array<{ nombre?: string | null }>;
    type VendedorRow = {
      id?: string;
      username?: string;
      nombre_completo?: string | null;
      telefono?: string | null;
      email?: string | null;
      rol?: RolInfo;
    };

    let query = serviceSupabase
      .from("usuario_perfil")
      .select("id, username, nombre_completo, telefono, email, coordinador_id, activo, rol:rol!usuario_perfil_rol_id_fkey(nombre)")
      .eq("activo", true);

    if (esSoloCoordinador) {
      // Contract is "team members + self": the coordinador's own row has
      // coordinador_id = null (or points at someone else), so a bare
      // .eq("coordinador_id", user.id) would never match it. Include the
      // caller's own row explicitly via .or().
      query = query.or(`coordinador_id.eq.${user.id},id.eq.${user.id}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[ImportarClientes] Error obteniendo vendedores:", error);
      console.error("[ImportarClientes] Error details:", JSON.stringify(error, null, 2));
      return NextResponse.json({
        error: "Error al obtener vendedores",
        details: error.message || String(error),
        code: error.code || 'unknown'
      }, { status: 500 });
    }

    console.log("[ImportarClientes] Vendedores obtenidos:", data?.length || 0);

    const vendedores =
      (data || [])
        .filter((rawRow) => {
          const row = rawRow as VendedorRow;
          const rolNombre = Array.isArray(row?.rol)
            ? row.rol[0]?.nombre
            : row?.rol?.nombre;
          // The coordinador_id/id OR-filter already scopes the DB query to
          // this coordinador's team + self; this post-filter is a defensive
          // second layer: accept the caller's own row regardless of its
          // role, and otherwise only vendedores — never another coordinador.
          if (esSoloCoordinador) {
            return row?.id === user.id || rolNombre === "ROL_VENDEDOR";
          }
          return ROLES_VENDEDORES.includes(String(rolNombre || ""));
        })
        .map((rawRow) => {
          const row = rawRow as VendedorRow;
          return {
            id: row?.id,
            username: row?.username,
            nombre_completo: row?.nombre_completo || null,
            telefono: row?.telefono || null,
            email: row?.email || null,
            rol: Array.isArray(row?.rol)
              ? row.rol[0]?.nombre
              : row?.rol?.nombre,
          };
        })
        .filter((row) => Boolean(row.username));

    return NextResponse.json({ vendedores });
  } catch (error) {
    console.error("[ImportarClientes] Error en /api/clientes/vendedores:", error);
    return NextResponse.json({
      error: "Error interno del servidor",
      details: String(error),
    }, { status: 500 });
  }
}
