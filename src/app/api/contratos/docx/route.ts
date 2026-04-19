import { NextRequest, NextResponse } from 'next/server';
import { createServerOnlyClient } from '@/lib/supabase.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { html, filename } = await request.json() as {
      html?: string;
      filename?: string;
    };

    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'HTML requerido' }, { status: 400 });
    }

    const htmlToDocx = (await import('html-to-docx')).default;

    const buffer = await htmlToDocx(html, null, {
      table: { row: { cantSplit: false } },
      footer: false,
      header: false,
      pageNumber: false,
    });

    const safeName = (filename && filename.trim()) || 'contrato.docx';
    const blob = new Blob([buffer as unknown as ArrayBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${safeName.replace(/"/g, '')}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generando DOCX:', error);
    return NextResponse.json(
      { error: 'Error generando el documento Word' },
      { status: 500 },
    );
  }
}
