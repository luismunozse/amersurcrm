import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/clientes/[id]/interacciones
 *
 * Obtiene el historial de interacciones de un cliente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await params;

    // Intentar obtener el token del header Authorization (para extensión)
    const authHeader = request.headers.get("authorization");
    let supabase;

    if (authHeader?.startsWith("Bearer ")) {
      // Token desde header (extensión de Chrome)
      const token = authHeader.substring(7);
      const supabaseAuth = createServiceRoleClient();

      const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token);

      if (authError || !authUser) {
        console.error("[Interacciones] Error de autenticación con token:", authError);
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }

      // Crear un nuevo cliente service role limpio para queries (sin contexto de usuario)
      supabase = createServiceRoleClient();
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !sessionUser) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
    }

    // Obtener interacciones del cliente usando RPC (bypasea RLS)
    const { data: interacciones, error } = await supabase
      .schema("crm")
      .rpc("get_cliente_interacciones", { p_cliente_id: clienteId });

    if (error) {
      console.error("[API] Error obteniendo interacciones:", error);
      return NextResponse.json(
        { error: "Error obteniendo interacciones" },
        { status: 500 }
      );
    }

    // Mapear a formato esperado por el componente
    const interaccionesFormateadas = (interacciones || []).map((int: any) => ({
      id: int.id,
      tipo: int.tipo,
      fecha: int.fecha_interaccion,
      descripcion: int.notas || `${int.tipo} - ${int.resultado || 'sin resultado'}`,
      usuario: int.vendedor_username || 'Sistema',
      resultado: int.resultado,
      duracion_minutos: int.duracion_minutos,
      proxima_accion: int.proxima_accion,
      fecha_proxima_accion: int.fecha_proxima_accion,
    }));

    return NextResponse.json({
      success: true,
      interacciones: interaccionesFormateadas,
    });
  } catch (error) {
    console.error("[API] Error en /api/clientes/[id]/interacciones:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clientes/[id]/interacciones
 *
 * Crea una nueva interacción para un cliente
 * Usado por AmersurChat Chrome Extension para registrar mensajes automáticamente
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await params;

    // Intentar obtener el token del header Authorization (para extensión)
    const authHeader = request.headers.get("authorization");
    let supabase;
    let user;

    if (authHeader?.startsWith("Bearer ")) {
      // Token desde header (extensión de Chrome)
      const token = authHeader.substring(7);
      const supabaseAuth = createServiceRoleClient();

      const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser(token);

      if (authError || !authUser) {
        console.error("[CreateInteraccion] Error de autenticación con token:", authError);
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }

      user = authUser;
      // Crear un nuevo cliente service role limpio para queries (sin contexto de usuario)
      supabase = createServiceRoleClient();
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser } } = await supabase.auth.getUser();

      if (!sessionUser) {
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }

      user = sessionUser;
    }

    // Parsear body
    const body = await request.json();
    const { tipo, mensaje, direccion } = body;

    if (!tipo || !mensaje) {
      return NextResponse.json(
        { error: "Los campos 'tipo' y 'mensaje' son requeridos" },
        { status: 400 }
      );
    }

    // Obtener username del usuario
    const { data: perfil } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();

    const vendedorUsername = perfil?.username || "Sistema";

    // Crear interacción
    const { data: interaccion, error } = await supabase
      .schema("crm")
      .from("cliente_interaccion")
      .insert({
        cliente_id: clienteId,
        tipo,
        notas: mensaje,
        vendedor_id: user.id,
        vendedor_username: vendedorUsername,
        fecha_interaccion: new Date().toISOString(),
        resultado: direccion === 'enviado' ? 'enviado' : 'recibido',
      })
      .select()
      .single();

    if (error) {
      console.error("[CreateInteraccion] Error creando interacción:", error);
      return NextResponse.json(
        { error: "Error creando interacción", details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ [CreateInteraccion] Interacción creada para cliente ${clienteId}: ${tipo} - ${direccion}`);

    return NextResponse.json({
      success: true,
      interaccion,
    });
  } catch (error) {
    console.error("[CreateInteraccion] Error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
