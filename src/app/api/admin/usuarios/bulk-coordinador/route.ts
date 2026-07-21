import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/permissions/server";
import { registrarAuditoriaUsuario } from "@/lib/auditoria-usuarios";
import { validarCoordinadorId } from "../_shared/coordinador-validation";

export const dynamic = 'force-dynamic';

interface Rechazo {
  id: string;
  motivo: string;
}

// PATCH - Bulk-assign (or bulk-unassign) a coordinador to many vendedores at
// once. Admin-only. Individual invalid vendedor ids are rejected and
// reported — the request never aborts wholesale because of them. An
// invalid coordinadorId, by contrast, aborts the whole request with 400
// (there is only one coordinador per request, so there is nothing to
// partially apply).
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    const body = await request.json();
    const { vendedorIds, coordinadorId } = body || {};

    if (!Array.isArray(vendedorIds) || vendedorIds.length === 0) {
      return NextResponse.json({ error: "Debe indicar al menos un vendedor" }, { status: 400 });
    }
    if (!vendedorIds.every((id: unknown) => typeof id === "string" && id.trim())) {
      return NextResponse.json({ error: "La lista de vendedores contiene identificadores inválidos" }, { status: 400 });
    }

    // Coordinador validated ONCE per request — an invalid coordinador
    // aborts the whole batch (unlike invalid vendedor ids, see below).
    const errorCoordinador = await validarCoordinadorId(supabase, coordinadorId);
    if (errorCoordinador) {
      return NextResponse.json({ error: errorCoordinador }, { status: 400 });
    }
    const coordinadorIdFinal: string | null =
      coordinadorId === undefined || coordinadorId === null || coordinadorId === ""
        ? null
        : coordinadorId;

    const { data: vendedores, error: fetchError } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("id, nombre_completo, coordinador_id, activo, deleted_at, rol:rol!usuario_perfil_rol_id_fkey(nombre)")
      .in("id", vendedorIds);

    if (fetchError) {
      console.error("Error obteniendo vendedores para asignación masiva:", fetchError);
      return NextResponse.json({ error: "Error obteniendo vendedores" }, { status: 500 });
    }

    const vendedoresPorId = new Map((vendedores || []).map((v: any) => [v.id, v]));
    const rechazados: Rechazo[] = [];
    const validos: { id: string; nombreCompleto: string; coordinadorAnterior: string | null }[] = [];

    for (const id of vendedorIds as string[]) {
      const vendedor = vendedoresPorId.get(id);
      if (!vendedor) {
        rechazados.push({ id, motivo: "Usuario no encontrado" });
        continue;
      }
      if (vendedor.deleted_at) {
        rechazados.push({ id, motivo: "Usuario eliminado" });
        continue;
      }
      if (!vendedor.activo) {
        rechazados.push({ id, motivo: "Usuario inactivo" });
        continue;
      }
      const rolNombre = Array.isArray(vendedor.rol) ? vendedor.rol[0]?.nombre : vendedor.rol?.nombre;
      if (rolNombre !== "ROL_VENDEDOR") {
        rechazados.push({ id, motivo: "El usuario no tiene el rol de vendedor" });
        continue;
      }
      validos.push({
        id,
        nombreCompleto: vendedor.nombre_completo || id,
        coordinadorAnterior: vendedor.coordinador_id ?? null,
      });
    }

    if (validos.length === 0) {
      return NextResponse.json({ actualizados: 0, rechazados });
    }

    const idsAActualizar = validos.map((v) => v.id);

    const { error: updateError } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .update({ coordinador_id: coordinadorIdFinal })
      .in("id", idsAActualizar);

    if (updateError) {
      console.error("Error actualizando coordinador en lote:", updateError);
      return NextResponse.json({ error: "Error actualizando coordinador" }, { status: 500 });
    }

    // Historial + auditoría — one row per user whose coordinador_id
    // actually changed, mirroring the single-user PATCH mechanism in
    // src/app/api/admin/usuarios/route.ts (fieldMap + registrarAuditoriaUsuario).
    const cambiados = validos.filter((v) => (v.coordinadorAnterior ?? null) !== coordinadorIdFinal);

    if (cambiados.length > 0) {
      const historialRows = cambiados.map((v) => ({
        usuario_id: v.id,
        campo: "coordinador_id",
        valor_anterior: v.coordinadorAnterior,
        valor_nuevo: coordinadorIdFinal,
        modificado_por: user.id,
      }));

      try {
        await supabase.schema("crm").from("historial_cambios_usuario").insert(historialRows);
      } catch (histErr) {
        console.warn("[bulk-coordinador] Error registrando historial de cambios:", histErr);
      }

      const serviceRole = createServiceRoleClient();
      const { data: adminPerfil } = await supabase
        .schema("crm")
        .from("usuario_perfil")
        .select("nombre_completo")
        .eq("id", user.id)
        .single();

      const adminNombre = adminPerfil?.nombre_completo || user.email || "Admin";

      for (const v of cambiados) {
        await registrarAuditoriaUsuario(serviceRole, {
          adminId: user.id,
          adminNombre,
          usuarioId: v.id,
          usuarioNombre: v.nombreCompleto,
          accion: "editar",
          detalles: { campos_modificados: ["coordinador_id"], origen: "bulk" },
        });
      }
    }

    return NextResponse.json({ actualizados: idsAActualizar.length, rechazados });
  } catch (error) {
    console.error("Error en PATCH /api/admin/usuarios/bulk-coordinador:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
