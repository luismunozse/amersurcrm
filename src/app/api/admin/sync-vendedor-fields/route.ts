import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";

// GET - Verificar inconsistencias (solo lectura)
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const isAdmin = await esAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const srv = createServiceRoleClient();
    
    // Verificar inconsistencias
    const { data: inconsistencias, error } = await srv.rpc('verificar_inconsistencias_vendedor');

    if (error) {
      console.error("Error verificando inconsistencias:", error);
      return NextResponse.json(
        { error: "Error al verificar inconsistencias", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      inconsistencias: inconsistencias || [],
    });

  } catch (error) {
    console.error("Error en GET /api/admin/sync-vendedor-fields:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

// POST - Sincronizar campos
export async function POST(_request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }

    const isAdmin = await esAdmin();
    if (!isAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    const srv = createServiceRoleClient();
    
    // Ejecutar sincronización
    const { data: resultado, error } = await srv.rpc('sync_all_vendedor_fields');

    if (error) {
      console.error("Error sincronizando campos:", error);
      return NextResponse.json(
        { error: "Error al sincronizar campos", details: error.message },
        { status: 500 }
      );
    }

    const resultadoData = resultado?.[0] || {};

    return NextResponse.json({
      success: true,
      total_clientes: resultadoData.total_clientes || 0,
      clientes_sincronizados: resultadoData.clientes_sincronizados || 0,
      clientes_corregidos: resultadoData.clientes_corregidos || 0,
      clientes_con_error: resultadoData.clientes_con_error || 0,
      detalles: resultadoData.detalles || [],
      message: `Sincronización completada. ${resultadoData.clientes_corregidos || 0} clientes corregidos.`,
    });

  } catch (error) {
    console.error("Error en POST /api/admin/sync-vendedor-fields:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

