import { NextResponse } from 'next/server';
import { obtenerPermisosUsuario } from '@/lib/permissions/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const usuario = await obtenerPermisosUsuario();

    if (!usuario) {
      console.warn('[permissions] obtenerPermisosUsuario retornó null — sesión no encontrada o perfil inactivo');
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    console.log(`[permissions] OK: ${usuario.username} | rol: ${usuario.rol} | permisos: ${usuario.permisos?.length}`);

    return NextResponse.json(
      { usuario },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Error en /api/auth/permissions:', error);
    return NextResponse.json(
      { error: 'Error obteniendo permisos' },
      { status: 500 }
    );
  }
}
