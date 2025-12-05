import { NextResponse } from 'next/server';
import { obtenerPermisosUsuario } from '@/lib/permissions/server';

export async function GET() {
  try {
    const usuario = await obtenerPermisosUsuario();

    if (!usuario) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      usuario,
    });
  } catch (error) {
    console.error('Error en /api/auth/permissions:', error);
    return NextResponse.json(
      { error: 'Error obteniendo permisos' },
      { status: 500 }
    );
  }
}
