// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const response = NextResponse.next();
  
  // Optimizaciones de caché
  if (req.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60');
  }
  
  // Headers de caché para páginas del dashboard
  if (req.nextUrl.pathname.startsWith('/dashboard')) {
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  }
  
  // Headers de caché para imágenes
  if (req.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  }
  
  // Headers de caché para archivos estáticos
  if (req.nextUrl.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Optimizaciones de seguridad y rendimiento
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
