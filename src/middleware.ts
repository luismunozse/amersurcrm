// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Detecta un refresh token inválido/ausente. Ocurre con sesiones viejas,
 * tokens rotados o cookies de otro proyecto de Supabase. El cliente del
 * browser entra en loop de refresh hasta que se limpian las cookies.
 */
function isRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  // El servidor de Auth usa distintos code/mensaje según el caso
  // ("refresh_token_not_found", "validation_failed", "Refresh token is not valid",
  // "Invalid Refresh Token: Refresh Token Not Found"). Matcheamos por mensaje
  // para cubrir todas las variantes de refresh token inválido/ausente.
  return (
    e.code === "refresh_token_not_found" ||
    e.code === "refresh_token_already_used" ||
    /refresh token/i.test(e.message ?? "")
  );
}

/** Limpia las cookies de sesión de Supabase (incluidas las chunked `*.0`, `*.1`). */
function clearSupabaseAuthCookies(req: NextRequest, res: NextResponse) {
  for (const cookie of req.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token")) {
      res.cookies.set({ name: cookie.name, value: "", maxAge: 0, path: "/" });
    }
  }
}

export async function middleware(req: NextRequest) {
  // Reenvía el pathname como header de request para que Server Components
  // (p. ej. src/app/dashboard/admin/layout.tsx) puedan aplicar reglas de
  // acceso específicas por segmento de ruta sin necesidad de reestructurar
  // el árbol de carpetas de App Router.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
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
  let invalidSession = false;
  try {
    const { error } = await supabase.auth.getUser();
    if (isRefreshTokenError(error)) invalidSession = true;
  } catch (err) {
    // getUser no debería lanzar para errores de auth, pero no rompemos el request.
    if (isRefreshTokenError(err)) invalidSession = true;
    else console.error("[middleware] error inesperado en getUser:", err);
  }

  // Sesión corrupta: cortar el loop de refresh limpiando las cookies.
  if (invalidSession) {
    const pathname = req.nextUrl.pathname;
    // Rutas protegidas (y raíz): redirigir a login con la sesión limpia.
    if (pathname === "/" || pathname.startsWith("/dashboard")) {
      const redirectRes = NextResponse.redirect(new URL("/auth/login", req.url));
      clearSupabaseAuthCookies(req, redirectRes);
      return redirectRes;
    }
    // Resto (público / API): solo limpiar y continuar.
    clearSupabaseAuthCookies(req, response);
  }

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
