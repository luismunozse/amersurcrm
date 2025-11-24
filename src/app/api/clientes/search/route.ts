import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/clientes/search?phone=+51999999999
 *
 * Busca un cliente por número de teléfono
 * Usado por AmersurChat Chrome Extension
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Obtener parámetro de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Parámetro 'phone' requerido" },
        { status: 400 }
      );
    }

    // Limpiar número (solo dígitos y +)
    const cleanPhone = phone.replace(/[^\d+]/g, "");

    console.log(`[ClienteSearch] Buscando cliente con teléfono: ${cleanPhone}`);

    // Buscar cliente por teléfono o whatsapp
    const { data: cliente, error } = await supabase
      .schema("crm")
      .from("cliente")
      .select(
        `
        id,
        nombre,
        telefono,
        telefono_whatsapp,
        email,
        tipo_cliente,
        estado_cliente,
        origen_lead,
        vendedor_asignado,
        created_at,
        notas
      `
      )
      .or(`telefono.eq.${cleanPhone},telefono_whatsapp.eq.${cleanPhone}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[ClienteSearch] Error en query:", error);
      return NextResponse.json(
        { error: "Error buscando cliente", details: error.message },
        { status: 500 }
      );
    }

    if (!cliente) {
      console.log(`[ClienteSearch] Cliente no encontrado`);
      return NextResponse.json({ cliente: null });
    }

    console.log(`[ClienteSearch] Cliente encontrado: ${cliente.id}`);

    return NextResponse.json({
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        telefono: cliente.telefono,
        telefono_whatsapp: cliente.telefono_whatsapp,
        email: cliente.email,
        tipo_cliente: cliente.tipo_cliente,
        estado_cliente: cliente.estado_cliente,
        origen_lead: cliente.origen_lead,
        vendedor_asignado: cliente.vendedor_asignado,
        created_at: cliente.created_at,
        notas: cliente.notas,
      },
    });
  } catch (error) {
    console.error("[ClienteSearch] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
