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

    // Un coordinador solo debe ver a su propio equipo en este dropdown —
    // nunca a otros coordinadores ni a vendedores de otro equipo.
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
      query = query.eq("coordinador_id", user.id);
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
          // El filtro por coordinador_id ya acota el equipo a vendedores;
          // un coordinador nunca debe ver a otro coordinador en su lista.
          if (esSoloCoordinador) {
            return rolNombre === "ROL_VENDEDOR";
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
