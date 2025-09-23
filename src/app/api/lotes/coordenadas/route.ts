import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerActionClient({ cookies });
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { loteId, coordenadas } = body;

    if (!loteId || !coordenadas) {
      return NextResponse.json({ error: 'ID de lote y coordenadas requeridos' }, { status: 400 });
    }

    const { lat, lng } = coordenadas;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'Coordenadas inválidas' }, { status: 400 });
    }

    // Actualizar el lote con las coordenadas
    const { error: updateError } = await supabase
      .from('lote')
      .update({ 
        coordenada_lat: lat,
        coordenada_lng: lng,
        updated_at: new Date().toISOString()
      })
      .eq('id', loteId);

    if (updateError) {
      console.error('Error actualizando coordenadas:', updateError);
      return NextResponse.json({ error: 'Error actualizando coordenadas' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Coordenadas guardadas correctamente'
    });

  } catch (error) {
    console.error('Error en coordenadas POST:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerActionClient({ cookies });
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const proyectoId = searchParams.get('proyectoId');

    if (!proyectoId) {
      return NextResponse.json({ error: 'ID de proyecto requerido' }, { status: 400 });
    }

    // Obtener todos los lotes del proyecto con coordenadas
    const { data: lotes, error: fetchError } = await supabase
      .from('lote')
      .select(`
        id,
        nombre,
        coordenada_lat,
        coordenada_lng,
        created_at,
        updated_at
      `)
      .eq('proyecto_id', proyectoId)
      .not('coordenada_lat', 'is', null)
      .not('coordenada_lng', 'is', null);

    if (fetchError) {
      console.error('Error obteniendo coordenadas:', fetchError);
      return NextResponse.json({ error: 'Error obteniendo coordenadas' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      coordenadas: lotes || []
    });

  } catch (error) {
    console.error('Error en coordenadas GET:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServerActionClient({ cookies });
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { proyectoId, coordenadas } = body;

    if (!proyectoId || !Array.isArray(coordenadas)) {
      return NextResponse.json({ error: 'ID de proyecto y array de coordenadas requeridos' }, { status: 400 });
    }

    // Actualizar múltiples lotes con coordenadas
    const updates = coordenadas.map(coord => ({
      id: coord.loteId,
      coordenada_lat: coord.lat,
      coordenada_lng: coord.lng,
      updated_at: new Date().toISOString()
    }));

    const { error: updateError } = await supabase
      .from('lote')
      .upsert(updates, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });

    if (updateError) {
      console.error('Error actualizando coordenadas múltiples:', updateError);
      return NextResponse.json({ error: 'Error actualizando coordenadas' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: `${coordenadas.length} coordenadas guardadas correctamente`
    });

  } catch (error) {
    console.error('Error en coordenadas PUT:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
