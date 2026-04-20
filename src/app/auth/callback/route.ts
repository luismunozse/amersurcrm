import { createRouteHandlerClient } from '@/lib/supabase.server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getErrorCode } from '@/lib/utils/error';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/dashboard/perfil';

  if (token_hash) {
    const supabase = await createRouteHandlerClient();

    console.log('🔐 Iniciando verificación de cambio de email...');
    console.log('Type:', type);
    console.log('Token hash:', token_hash.substring(0, 20) + '...');

    // Verificar OTP para cambio de email
    const { data, error } = await supabase.auth.verifyOtp({
      type: (type as any) || 'email_change',
      token_hash,
    });

    if (error) {
      console.error('❌ Error al confirmar el cambio de email:', error);
      console.error('Error code:', getErrorCode(error));
      console.error('Error message:', error.message);
      return NextResponse.redirect(
        new URL('/dashboard/perfil?error=confirmation_failed', requestUrl.origin)
      );
    }

    console.log('✅ OTP verificado exitosamente');
    console.log('Datos de respuesta:', JSON.stringify(data, null, 2));

    // Obtener la sesión actualizada para asegurar que las cookies se actualicen
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      console.log('📧 Email actual en sesión:', session.user.email);
      console.log('🔄 Refrescando sesión...');

      // Refrescar la sesión para asegurar que el nuevo email está en las cookies
      const { data: refreshData } = await supabase.auth.refreshSession();

      if (refreshData?.session) {
        console.log('✅ Sesión refrescada. Email actualizado:', refreshData.session.user.email);
      }
    } else {
      console.log('⚠️ No hay sesión activa');
    }

    // Éxito - redirigir al perfil con mensaje de éxito
    return NextResponse.redirect(
      new URL(`${next}?success=email_confirmed`, requestUrl.origin)
    );
  }

  // Si no hay token, redirigir al dashboard
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
}
