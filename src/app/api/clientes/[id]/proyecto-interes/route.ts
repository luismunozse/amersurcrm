import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

/**
 * GET /api/clientes/[id]/proyecto-interes
 *
 * Obtiene los proyectos de interés del cliente
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await params;

    console.log('[API /clientes/[id]/proyecto-interes] GET - Cliente ID:', clienteId);

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
        console.error("[ProyectoInteres] Error de autenticación con token:", authError);
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }

      user = authUser;
      // Crear un nuevo cliente service role limpio para queries (sin contexto de usuario)
      supabase = createServiceRoleClient();
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !sessionUser) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }

      user = sessionUser;
    }

    // Obtener proyectos de interés usando RPC (bypasea RLS)
    const { data: interesesRaw, error } = await supabase
      .schema("crm")
      .rpc("get_cliente_proyectos_interes", { p_cliente_id: clienteId });

    const intereses = interesesRaw || [];

    if (error) {
      console.error("[API] Error obteniendo proyectos de interés:", error);
      return NextResponse.json(
        { error: "Error obteniendo proyectos de interés" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      proyectosInteres: intereses || [],
    });
  } catch (error) {
    console.error("[API] Error en /api/clientes/[id]/proyecto-interes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clientes/[id]/proyecto-interes
 *
 * Agrega un proyecto/lote de interés al cliente
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await params;

    console.log('[API /clientes/[id]/proyecto-interes] POST - Cliente ID:', clienteId);

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
        console.error("[ProyectoInteres] Error de autenticación con token:", authError);
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }

      user = authUser;
      // Crear un nuevo cliente service role limpio para queries (sin contexto de usuario)
      supabase = createServiceRoleClient();
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !sessionUser) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }

      user = sessionUser;
    }

    // Obtener datos del body
    const body = await request.json();
    const { loteId, proyectoId, prioridad = 2, notas } = body;

    if (!loteId && !proyectoId) {
      return NextResponse.json(
        { error: "Debe especificar loteId o proyectoId" },
        { status: 400 }
      );
    }

    // Obtener perfil del usuario
    const { data: perfil } = await supabase
      .schema("crm")
      .from("usuario_perfil")
      .select("username")
      .eq("id", user.id)
      .single();

    const username = perfil?.username || "usuario";

    // Agregar proyecto de interés usando RPC (bypasea RLS)
    const { data: nuevoInteres, error: insertError } = await supabase
      .schema("crm")
      .rpc("add_proyecto_interes", {
        p_cliente_id: clienteId,
        p_lote_id: loteId || null,
        p_propiedad_id: proyectoId || null,
        p_prioridad: prioridad,
        p_notas: notas || null,
        p_agregado_por: username,
      });

    if (insertError) {
      console.error("[API] Error agregando proyecto de interés:", insertError);
      return NextResponse.json(
        { error: "Error agregando proyecto de interés" },
        { status: 500 }
      );
    }

    // Verificar si ya existía
    if (nuevoInteres?.already_exists) {
      return NextResponse.json({
        success: true,
        message: "Ya existe este interés",
        proyectoInteres: nuevoInteres,
      });
    }

    return NextResponse.json({
      success: true,
      proyectoInteres: nuevoInteres,
    });
  } catch (error) {
    console.error("[API] Error en POST /api/clientes/[id]/proyecto-interes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clientes/[id]/proyecto-interes
 *
 * Elimina un proyecto de interés
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clienteId } = await params;

    console.log('[API /clientes/[id]/proyecto-interes] DELETE - Cliente ID:', clienteId);

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
        console.error("[ProyectoInteres] Error de autenticación con token:", authError);
        return NextResponse.json({ error: "No autenticado" }, { status: 401 });
      }

      user = authUser;
      // Crear un nuevo cliente service role limpio para queries (sin contexto de usuario)
      supabase = createServiceRoleClient();
    } else {
      // Token desde cookies (sesión web normal)
      supabase = await createServerOnlyClient();
      const { data: { user: sessionUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !sessionUser) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }

      user = sessionUser;
    }

    // Obtener ID del proyecto de interés desde query params
    const url = new URL(request.url);
    const interesId = url.searchParams.get('interesId');

    if (!interesId) {
      return NextResponse.json(
        { error: "Falta parámetro interesId" },
        { status: 400 }
      );
    }

    // Eliminar proyecto de interés
    const { error: deleteError } = await supabase
      .schema("crm")
      .from("cliente_propiedad_interes")
      .delete()
      .eq("id", interesId);

    if (deleteError) {
      console.error("[API] Error eliminando proyecto de interés:", deleteError);
      return NextResponse.json(
        { error: "Error eliminando proyecto de interés" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Proyecto de interés eliminado",
    });
  } catch (error) {
    console.error("[API] Error en DELETE /api/clientes/[id]/proyecto-interes:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
