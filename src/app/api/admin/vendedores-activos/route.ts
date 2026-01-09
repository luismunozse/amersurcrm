import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, verificarAdminOptimizado } from "@/lib/supabase.server";

interface VendedorConRol {
  id: string;
  username: string;
  nombre_completo: string;
  activo: boolean;
  rol: { nombre: string } | { nombre: string }[] | null;
}

/**
 * GET /api/admin/vendedores-activos
 * Obtiene la lista de vendedores activos configurados para asignación automática
 */
export async function GET() {
  try {
    // Verificación optimizada: una sola query para auth + rol (evita ~400ms en producción)
    const { isAdmin, user, error: authError } = await verificarAdminOptimizado();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const supabase = await createServerOnlyClient();

    // Obtener vendedores activos (sin relación anidada porque FK apunta a auth.users)
    const { data: vendedoresActivos, error } = await supabase
      .schema("crm")
      .from("vendedor_activo")
      .select("id, vendedor_id, orden, activo, fecha_configuracion")
      .order("orden", { ascending: true });

    if (error) {
      console.error("[VendedoresActivos] Error en GET:", error);
      return NextResponse.json(
        { error: `Error al obtener vendedores activos: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`[VendedoresActivos] GET: ${vendedoresActivos?.length || 0} vendedores encontrados`);

    // Obtener datos de usuario_perfil para cada vendedor
    type VendedorConPerfil = {
      id: string;
      vendedor_id: string;
      orden: number;
      activo: boolean;
      fecha_configuracion: string;
      usuario_perfil: {
        id: string;
        username: string;
        nombre_completo: string;
        telefono: string;
        email: string;
      } | null;
    };
    let vendedoresConPerfil: VendedorConPerfil[] = [];
    if (vendedoresActivos && vendedoresActivos.length > 0) {
      const vendedorIds = vendedoresActivos.map((v) => v.vendedor_id);
      const { data: perfiles } = await supabase
        .schema("crm")
        .from("usuario_perfil")
        .select("id, username, nombre_completo, telefono, email")
        .in("id", vendedorIds);

      const perfilesMap = new Map(perfiles?.map((p) => [p.id, p]) || []);

      vendedoresConPerfil = vendedoresActivos.map((v) => ({
        ...v,
        usuario_perfil: perfilesMap.get(v.vendedor_id) || null,
      }));
    }

    // Obtener configuración actual (próximo índice)
    const { data: config } = await supabase
      .schema("crm")
      .from("asignacion_config")
      .select("ultimo_indice")
      .eq("id", 1)
      .single();

    return NextResponse.json({
      success: true,
      vendedores: vendedoresConPerfil,
      proximo_indice: config?.ultimo_indice ?? 0,
    });
  } catch (error) {
    console.error("[VendedoresActivos] Error en GET:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/vendedores-activos
 * Agrega un vendedor a la lista de asignación automática
 */
export async function POST(request: NextRequest) {
  try {
    // Verificación optimizada
    const { isAdmin, user } = await verificarAdminOptimizado();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const supabase = await createServerOnlyClient();
    const body = await request.json();
    const { vendedor_id } = body;

    if (!vendedor_id) {
      return NextResponse.json(
        { error: "vendedor_id es requerido" },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe y es vendedor
    const { data: vendedor, error: vendedorError } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select(`
        id,
        username,
        nombre_completo,
        activo,
        rol:rol!usuario_perfil_rol_id_fkey (
          id,
          nombre
        )
      `)
      .eq("id", vendedor_id)
      .single();

    if (vendedorError) {
      console.error("[VendedoresActivos] Error buscando vendedor:", vendedorError);
      return NextResponse.json(
        { error: "Error al buscar vendedor" },
        { status: 500 }
      );
    }

    if (!vendedor) {
      return NextResponse.json(
        { error: "Vendedor no encontrado" },
        { status: 404 }
      );
    }

    const vendedorData = vendedor as unknown as VendedorConRol;

    // Verificar que el vendedor esté activo
    if (!vendedorData.activo) {
      return NextResponse.json(
        { error: "El vendedor no está activo en el sistema" },
        { status: 400 }
      );
    }

    // Verificar que tiene rol de vendedor
    const rolNombre = Array.isArray(vendedorData.rol)
      ? vendedorData.rol[0]?.nombre
      : vendedorData.rol?.nombre;

    console.log("[VendedoresActivos] Vendedor encontrado:", {
      id: vendedorData.id,
      username: vendedorData.username,
      activo: vendedorData.activo,
      rol: vendedorData.rol,
      rolNombre,
    });

    if (rolNombre !== "ROL_VENDEDOR") {
      return NextResponse.json(
        { error: `El usuario debe tener rol de vendedor (rol actual: ${rolNombre || "sin rol"})` },
        { status: 400 }
      );
    }

    // Obtener el último orden
    const { data: ultimoVendedor } = await supabase
      .schema("crm")
      .from("vendedor_activo")
      .select("orden")
      .order("orden", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nuevoOrden = (ultimoVendedor?.orden ?? 0) + 1;

    // Insertar vendedor a la lista
    const { data: vendedorActivo, error: insertError } = await supabase
      .schema("crm")
      .from("vendedor_activo")
      .insert({
        vendedor_id,
        orden: nuevoOrden,
        activo: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("[VendedoresActivos] Error insertando:", insertError);

      // Si ya existe, retornar error específico
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "El vendedor ya está en la lista" },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: `Error al agregar vendedor: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log(
      `✅ [VendedoresActivos] Vendedor ${vendedorData.username} agregado con orden ${nuevoOrden}`
    );

    return NextResponse.json({
      success: true,
      message: "Vendedor agregado exitosamente",
      vendedor: vendedorActivo,
    });
  } catch (error) {
    console.error("[VendedoresActivos] Error en POST:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/vendedores-activos?id=xxx
 * Elimina un vendedor de la lista
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verificación optimizada
    const { isAdmin, user } = await verificarAdminOptimizado();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const supabase = await createServerOnlyClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id es requerido" },
        { status: 400 }
      );
    }

    // Eliminar vendedor de la lista
    const { error: deleteError } = await supabase
      .schema("crm")
      .from("vendedor_activo")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error eliminando vendedor:", deleteError);
      return NextResponse.json(
        { error: "Error al eliminar vendedor" },
        { status: 500 }
      );
    }

    console.log(`✅ [VendedoresActivos] Vendedor ${id} eliminado de la lista`);

    return NextResponse.json({
      success: true,
      message: "Vendedor eliminado exitosamente",
    });
  } catch (error) {
    console.error("[VendedoresActivos] Error en DELETE:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/vendedores-activos
 * Activa o desactiva un vendedor de la lista
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verificación optimizada
    const { isAdmin, user } = await verificarAdminOptimizado();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const supabase = await createServerOnlyClient();
    const body = await request.json();
    const { id, activo } = body;

    if (!id || activo === undefined) {
      return NextResponse.json(
        { error: "id y activo son requeridos" },
        { status: 400 }
      );
    }

    // Actualizar estado del vendedor
    const { error: updateError } = await supabase
      .schema("crm")
      .from("vendedor_activo")
      .update({ activo })
      .eq("id", id);

    if (updateError) {
      console.error("Error actualizando vendedor:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar vendedor" },
        { status: 500 }
      );
    }

    console.log(
      `✅ [VendedoresActivos] Vendedor ${id} ${activo ? "activado" : "desactivado"}`
    );

    return NextResponse.json({
      success: true,
      message: `Vendedor ${activo ? "activado" : "desactivado"} exitosamente`,
    });
  } catch (error) {
    console.error("[VendedoresActivos] Error en PATCH:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/vendedores-activos/orden
 * Actualiza el orden de los vendedores
 */
export async function PUT(request: NextRequest) {
  try {
    // Verificación optimizada
    const { isAdmin, user } = await verificarAdminOptimizado();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const supabase = await createServerOnlyClient();
    const body = await request.json();
    const { vendedores } = body;

    if (!Array.isArray(vendedores) || vendedores.length === 0) {
      return NextResponse.json(
        { error: "vendedores debe ser un array no vacío" },
        { status: 400 }
      );
    }

    // Actualizar orden de cada vendedor
    const updates = vendedores.map(async (v, index) => {
      return supabase
        .schema("crm")
        .from("vendedor_activo")
        .update({ orden: index + 1 })
        .eq("id", v.id);
    });

    const results = await Promise.all(updates);

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      console.error("Error actualizando orden:", errors);
      return NextResponse.json(
        { error: "Error al actualizar orden" },
        { status: 500 }
      );
    }

    console.log(`✅ [VendedoresActivos] Orden actualizado para ${vendedores.length} vendedores`);

    return NextResponse.json({
      success: true,
      message: "Orden actualizado exitosamente",
    });
  } catch (error) {
    console.error("[VendedoresActivos] Error en PUT:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
