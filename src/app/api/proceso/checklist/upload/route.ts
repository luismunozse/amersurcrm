import { NextRequest, NextResponse } from 'next/server';
import { createServerOnlyClient } from '@/lib/supabase.server';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const BUCKET = 'proceso-documentos';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('archivo') as File | null;
    const itemId = formData.get('itemId') as string | null;

    if (!file || !itemId) {
      return NextResponse.json({ error: 'Archivo e ID de item requeridos' }, { status: 400 });
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Formato no valido. Use PDF, JPG, PNG o WEBP' },
        { status: 400 },
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo supera 10MB' }, { status: 400 });
    }

    // Validar que el item existe y obtener etapa+proceso para path estructurado.
    const { data: item, error: itemError } = await supabase
      .from('proceso_checklist_item')
      .select('id, etapa_id, etapa:etapa_id(proceso_id), documento_url')
      .eq('id', itemId)
      .maybeSingle();

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });
    }

    const etapa = Array.isArray((item as any).etapa) ? (item as any).etapa[0] : (item as any).etapa;
    const procesoId = etapa?.proceso_id ?? 'sin-proceso';

    // Username del usuario que sube.
    const { data: perfil } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();

    const username = perfil?.username ?? null;

    // Si ya hay un documento previo, intentar borrarlo del bucket.
    if (item.documento_url) {
      const previo = extraerPathDeUrl(item.documento_url, BUCKET);
      if (previo) {
        await supabase.storage.from(BUCKET).remove([previo]);
      }
    }

    const sanitizedName = sanitizarNombre(file.name);
    const ext = sanitizedName.includes('.') ? sanitizedName.split('.').pop() : 'bin';
    const fileName = `${Date.now()}-${sanitizedName}`;
    const path = `${procesoId}/${item.etapa_id}/${itemId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Error subiendo documento:', uploadError);
      return NextResponse.json({ error: 'Error subiendo archivo' }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    const { error: updateError } = await supabase
      .from('proceso_checklist_item')
      .update({
        documento_url: urlData.publicUrl,
        documento_nombre: file.name,
        documento_size: file.size,
        documento_subido_por: username,
        documento_subido_at: new Date().toISOString(),
        completado: true,
        completado_por: username,
        fecha_completado: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (updateError) {
      console.error('Error actualizando item:', updateError);
      // Rollback: borrar el archivo si la update falla.
      await supabase.storage.from(BUCKET).remove([path]);
      return NextResponse.json({ error: 'Error actualizando item' }, { status: 500 });
    }

    revalidatePath('/dashboard/adquisicion');
    revalidatePath('/dashboard/clientes', 'layout');

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      nombre: file.name,
      size: file.size,
      ext,
    });
  } catch (error) {
    console.error('Error en upload proceso checklist:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

function extraerPathDeUrl(url: string, bucket: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = `/${bucket}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return parsed.pathname.slice(idx + marker.length);
  } catch {
    return null;
  }
}

function sanitizarNombre(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 100);
}
