import { NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

const ROLES_VENDEDORES = ["ROL_VENDEDOR", "ROL_COORDINADOR_VENTAS"];

export async function GET() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

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

    const { data, error } = await serviceSupabase
      .from("usuario_perfil")
      .select("id, username, nombre_completo, telefono, email, activo, rol:rol!usuario_perfil_rol_id_fkey(nombre)");

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
