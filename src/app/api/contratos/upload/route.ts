import { NextRequest, NextResponse } from 'next/server';
import { createServerOnlyClient } from '@/lib/supabase.server';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('archivo') as File | null;
    const contratoId = formData.get('contratoId') as string | null;
    const tipoDocumento = formData.get('tipoDocumento') as string | null; // 'contrato' | 'escritura' | 'constancia_sunarp'

    if (!file || !contratoId || !tipoDocumento) {
      return NextResponse.json({ error: 'Archivo, ID de contrato y tipo de documento requeridos' }, { status: 400 });
    }

    const urlFieldByTipo: Record<string, string> = {
      contrato: 'contrato_url',
      escritura: 'escritura_url',
      constancia_sunarp: 'constancia_sunarp_url',
    };
    if (!(tipoDocumento in urlFieldByTipo)) {
      return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 });
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato no válido. Use PDF, JPG, PNG o WEBP' }, { status: 400 });
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'El archivo es muy grande. Máximo 10MB' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${tipoDocumento}-${Date.now()}.${fileExt}`;
    const filePath = `contratos/${contratoId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('imagenes')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error subiendo archivo:', uploadError);
      return NextResponse.json({ error: 'Error subiendo archivo' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('imagenes')
      .getPublicUrl(filePath);

    // Actualizar el contrato con la URL del documento (tipo ya validado contra allowlist)
    const urlField = urlFieldByTipo[tipoDocumento];

    const { error: updateError } = await supabase
      .from('contrato')
      .update({ [urlField]: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', contratoId);

    if (updateError) {
      console.error('Error actualizando contrato:', updateError);
      return NextResponse.json({ error: 'Error actualizando contrato' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      field: urlField,
    });
  } catch (error) {
    console.error('Error en upload contrato:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
