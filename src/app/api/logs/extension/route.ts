import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

/**
 * POST /api/logs/extension
 * Recibe logs de errores de la extensión Chrome
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { level, context, message, timestamp, userAgent, url } = body;

    // Validar campos requeridos
    if (!level || !context || !message) {
      return NextResponse.json(
        { error: "level, context y message son requeridos" },
        { status: 400 }
      );
    }

    // Validar nivel
    if (!['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(level)) {
      return NextResponse.json(
        { error: "level debe ser DEBUG, INFO, WARN o ERROR" },
        { status: 400 }
      );
    }

    // Insertar log en la base de datos
    const { error: insertError } = await supabase
      .schema('crm')
      .from('extension_logs')
      .insert({
        usuario_id: user.id,
        level,
        context,
        message,
        data: body.data || null,
        error_name: body.error?.name || null,
        error_message: body.error?.message || null,
        error_stack: body.error?.stack || null,
        user_agent: userAgent || null,
        url: url || null,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      });

    if (insertError) {
      console.error('[Extension Logs] Error insertando log:', insertError);
      return NextResponse.json(
        { error: "Error guardando log" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Extension Logs] Error:', error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/logs/extension
 * Obtiene logs de la extensión (solo administradores o propios logs)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar si es administrador
    const { data: perfil } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = perfil?.rol === 'admin';

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const level = searchParams.get('level');
    const context = searchParams.get('context');
    const usuarioId = searchParams.get('usuario_id');

    // Construir query
    let query = supabase
      .schema('crm')
      .from('extension_logs')
      .select('*', { count: 'exact' })
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Si no es admin, solo ver sus propios logs
    if (!isAdmin) {
      query = query.eq('usuario_id', user.id);
    } else if (usuarioId) {
      // Admin puede filtrar por usuario
      query = query.eq('usuario_id', usuarioId);
    }

    // Filtros opcionales
    if (level) {
      query = query.eq('level', level);
    }
    if (context) {
      query = query.eq('context', context);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('[Extension Logs] Error obteniendo logs:', error);
      return NextResponse.json(
        { error: "Error obteniendo logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Extension Logs] Error:', error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

