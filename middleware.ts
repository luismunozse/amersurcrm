// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const response = NextResponse.next({
    request: { headers: req.headers },
  });

  // ── Refrescar sesión de Supabase en cada request ──
  // Esto renueva el access token si expiró, evitando AuthSessionMissingError
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value, ...options } as any);
        },
        remove(name: string, options: Record<string, unknown>) {
          response.cookies.set({ name, value: '', ...options } as any);
        },
      },
    }
  );

  // getUser() dispara el refresh del token si es necesario
  // y las nuevas cookies se escriben en el response
  await supabase.auth.getUser();

  // ── Headers de caché ──
  // NUNCA cachear rutas API (dependen de auth/sesión)
  if (req.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  }

  // Dashboard: no cachear (depende del usuario autenticado)
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    response.headers.set('Cache-Control', 'private, no-cache, must-revalidate');
  }

  // Archivos estáticos: cachear agresivamente
  if (req.nextUrl.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Imágenes: cachear por 1 día
  if (req.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  }

  // Seguridad
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Redirección de raíz
  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
