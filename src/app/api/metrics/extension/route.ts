import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";

export const dynamic = "force-dynamic";

// CORS headers para extensión de Chrome
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handler OPTIONS para preflight CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * Autentica por Bearer token (extensión de Chrome) o cookies (sesión web).
 * Devuelve el cliente supabase a usar y el usuario, o null si no autenticado.
 */
async function autenticar(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const supabaseAdmin = createServiceRoleClient();
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return { supabase: supabaseAdmin, user };
  }

  const supabase = await createServerOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

/**
 * POST /api/metrics/extension
 * Recibe métricas de performance de la extensión Chrome
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await autenticar(request);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: corsHeaders });
    }
    const { supabase, user } = auth;

    const body = await request.json();
    const { metric_type, metric_name, value, unit, metadata } = body;

    // Validar campos requeridos
    if (!metric_type || !metric_name || value === undefined) {
      return NextResponse.json(
        { error: "metric_type, metric_name y value son requeridos" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Insertar métrica en la base de datos
    const { error: insertError } = await supabase
      .schema('crm')
      .from('extension_metrics')
      .insert({
        usuario_id: user.id,
        metric_type,
        metric_name,
        value: parseFloat(value),
        unit: unit || 'ms',
        metadata: metadata || null,
      });

    if (insertError) {
      console.error('[Extension Metrics] Error insertando métrica:', insertError);
      return NextResponse.json(
        { error: "Error guardando métrica" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Extension Metrics] Error:', error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/metrics/extension
 * Obtiene métricas agregadas de la extensión
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await autenticar(request);
    if (!auth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: corsHeaders });
    }
    const { supabase, user } = auth;

    // Verificar si es administrador
    const { data: perfil } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select(`
        rol_id,
        rol:rol!usuario_perfil_rol_id_fkey (
          nombre
        )
      `)
      .eq('id', user.id)
      .maybeSingle();

    const rolData = perfil?.rol as { nombre?: string } | null;
    const rolNombre = rolData?.nombre || '';
    const isAdmin = rolNombre === 'admin' || rolNombre === 'ROL_ADMIN';

    const searchParams = request.nextUrl.searchParams;
    const metric_type = searchParams.get('metric_type');
    const metric_name = searchParams.get('metric_name');
    const days = parseInt(searchParams.get('days') || '7');

    // Construir query base
    let query = supabase
      .schema('crm')
      .from('extension_metrics')
      .select('*')
      .gte('timestamp', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('timestamp', { ascending: false });

    // Si no es admin, solo ver sus propias métricas
    if (!isAdmin) {
      query = query.eq('usuario_id', user.id);
    }

    // Filtros opcionales
    if (metric_type) {
      query = query.eq('metric_type', metric_type);
    }
    if (metric_name) {
      query = query.eq('metric_name', metric_name);
    }

    const { data: metrics, error } = await query;

    if (error) {
      console.error('[Extension Metrics] Error obteniendo métricas:', error);
      return NextResponse.json(
        { error: "Error obteniendo métricas" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Calcular estadísticas agregadas
    const stats = metrics?.reduce((acc, metric) => {
      const key = `${metric.metric_type}_${metric.metric_name}`;
      if (!acc[key]) {
        acc[key] = {
          metric_type: metric.metric_type,
          metric_name: metric.metric_name,
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
          values: [],
        };
      }
      acc[key].count++;
      acc[key].sum += metric.value;
      acc[key].min = Math.min(acc[key].min, metric.value);
      acc[key].max = Math.max(acc[key].max, metric.value);
      acc[key].values.push(metric.value);
      return acc;
    }, {} as Record<string, any>) || {};

    // Calcular promedios y medianas
    const aggregated = Object.values(stats).map((stat: any) => {
      const sorted = [...stat.values].sort((a, b) => a - b);
      const median = sorted.length > 0
        ? sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
        : 0;

      return {
        metric_type: stat.metric_type,
        metric_name: stat.metric_name,
        count: stat.count,
        avg: stat.sum / stat.count,
        median,
        min: stat.min === Infinity ? 0 : stat.min,
        max: stat.max === -Infinity ? 0 : stat.max,
      };
    });

    return NextResponse.json({
      success: true,
      metrics: metrics || [],
      aggregated,
      days,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('[Extension Metrics] Error:', error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

