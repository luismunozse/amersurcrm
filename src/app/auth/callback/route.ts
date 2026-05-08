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

    const { error } = await supabase.auth.verifyOtp({
      type: (type as any) || 'email_change',
      token_hash,
    });

    if (error) {
      console.error('[auth/callback] verifyOtp failed', {
        code: getErrorCode(error),
        message: error.message,
      });
      return NextResponse.redirect(
        new URL('/dashboard/perfil?error=confirmation_failed', requestUrl.origin)
      );
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      await supabase.auth.refreshSession();
    }

    return NextResponse.redirect(
      new URL(`${next}?success=email_confirmed`, requestUrl.origin)
    );
  }

  // Si no hay token, redirigir al dashboard
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
}
