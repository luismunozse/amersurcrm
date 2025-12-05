"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const supabase = await createClient();
    const { id: clienteId } = await params;

    console.log('[API /clientes/[id]/proyecto-interes] GET - Cliente ID:', clienteId);

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener proyectos de interés con información del proyecto
    const { data: intereses, error } = await supabase
      .schema("crm")
      .from("cliente_propiedad_interes")
      .select(`
        id,
        lote_id,
        propiedad_id,
        prioridad,
        notas,
        fecha_agregado,
        lote:lote_id (
          id,
          numero_lote,
          codigo,
          estado,
          moneda,
          precio,
          proyecto:proyecto_id (
            id,
            nombre
          )
        )
      `)
      .eq("cliente_id", clienteId)
      .order("fecha_agregado", { ascending: false });

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
    const supabase = await createClient();
    const { id: clienteId } = await params;

    console.log('[API /clientes/[id]/proyecto-interes] POST - Cliente ID:', clienteId);

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
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

    // Insertar proyecto de interés
    const { data: nuevoInteres, error: insertError } = await supabase
      .schema("crm")
      .from("cliente_propiedad_interes")
      .insert({
        cliente_id: clienteId,
        lote_id: loteId || null,
        propiedad_id: proyectoId || null,
        prioridad,
        notas,
        agregado_por: username,
      })
      .select()
      .single();

    if (insertError) {
      // Si es error de duplicado, ignorar
      if (insertError.code === '23505') {
        return NextResponse.json({
          success: true,
          message: "Ya existe este interés",
        });
      }

      console.error("[API] Error agregando proyecto de interés:", insertError);
      return NextResponse.json(
        { error: "Error agregando proyecto de interés" },
        { status: 500 }
      );
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
    const supabase = await createClient();
    const { id: clienteId } = await params;

    console.log('[API /clientes/[id]/proyecto-interes] DELETE - Cliente ID:', clienteId);

    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
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
