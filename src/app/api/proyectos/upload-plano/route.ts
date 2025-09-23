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

    const formData = await request.formData();
    const planosFile = formData.get('planos') as File | null;
    const proyectoId = formData.get('proyectoId') as string | null;

    if (!planosFile || !proyectoId) {
      return NextResponse.json({ error: 'Archivo y ID de proyecto requeridos' }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(planosFile.type)) {
      return NextResponse.json({ error: 'Formato no válido. Use JPG, PNG o WEBP' }, { status: 400 });
    }

    // Validar tamaño (5MB máximo)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (planosFile.size > maxSize) {
      return NextResponse.json({ error: 'El archivo es muy grande. Máximo 5MB' }, { status: 400 });
    }

    // Generar nombre único para el archivo
    const fileExt = planosFile.name.split('.').pop();
    const fileName = `planos-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `proyectos/${proyectoId}/${fileName}`;

    // Subir archivo a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('imagenes')
      .upload(filePath, planosFile);

    if (uploadError) {
      console.error('Error subiendo archivo:', uploadError);
      return NextResponse.json({ error: 'Error subiendo archivo' }, { status: 500 });
    }

    // Obtener URL pública del archivo
    const { data: { publicUrl } } = supabase.storage
      .from('imagenes')
      .getPublicUrl(filePath);

    // Actualizar el proyecto con la URL de los planos
    const { error: updateError } = await supabase
      .from('proyecto')
      .update({ planos_url: publicUrl })
      .eq('id', proyectoId);

    if (updateError) {
      console.error('Error actualizando proyecto:', updateError);
      return NextResponse.json({ error: 'Error actualizando proyecto' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      message: 'Plano subido correctamente'
    });

  } catch (error) {
    console.error('Error en upload-plano:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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

    // Obtener la URL actual del plano
    const { data: proyecto, error: fetchError } = await supabase
      .from('proyecto')
      .select('planos_url')
      .eq('id', proyectoId)
      .single();

    if (fetchError || !proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
    }

    if (proyecto.planos_url) {
      // Extraer el path del archivo de la URL
      const urlParts = proyecto.planos_url.split('/');
      const filePath = urlParts.slice(-2).join('/'); // proyectos/{proyectoId}/{fileName}

      // Eliminar archivo del storage
      const { error: deleteError } = await supabase.storage
        .from('imagenes')
        .remove([filePath]);

      if (deleteError) {
        console.error('Error eliminando archivo:', deleteError);
        // Continuar aunque falle la eliminación del archivo
      }
    }

    // Actualizar el proyecto para remover la URL del plano
    const { error: updateError } = await supabase
      .from('proyecto')
      .update({ planos_url: null })
      .eq('id', proyectoId);

    if (updateError) {
      console.error('Error actualizando proyecto:', updateError);
      return NextResponse.json({ error: 'Error actualizando proyecto' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Plano eliminado correctamente'
    });

  } catch (error) {
    console.error('Error en delete-plano:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
