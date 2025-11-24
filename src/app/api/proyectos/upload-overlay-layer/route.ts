import { NextRequest, NextResponse } from 'next/server';
import { createServerOnlyClient } from '@/lib/supabase.server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('planos') as File | null;
    const proyectoId = formData.get('proyectoId') as string | null;

    if (!file || !proyectoId) {
      return NextResponse.json({ error: 'Archivo y proyecto requeridos' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato no válido. Use JPG, PNG o WEBP' }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'El archivo es muy grande. Máximo 5MB' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `plan-layer-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `proyectos/${proyectoId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('imagenes')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error subiendo capa:', uploadError);
      return NextResponse.json({ error: 'No se pudo subir el archivo' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('imagenes')
      .getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: filePath,
    });
  } catch (error) {
    console.error('Error en upload-overlay-layer:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
