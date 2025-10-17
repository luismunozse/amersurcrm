import { NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";

// GET - Obtener lista de roles
export async function GET() {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const isAdminUser = await esAdmin();
    if (!isAdminUser) {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    // Obtener roles activos
    const { data: roles, error } = await supabase
      .schema('crm')
      .from('rol')
      .select('id, nombre, descripcion')
      .eq('activo', true)
      .order('nombre');

    if (error) {
      console.error('Error obteniendo roles:', error);
      
      // Si las tablas no existen, devolver roles simulados
      if (error.code === 'PGRST205') {
        console.log('Tabla roles no existe, devolviendo roles simulados');
        return NextResponse.json({ 
          success: true, 
          roles: [
            {
              id: "admin-rol-id",
              nombre: "ROL_ADMIN",
              descripcion: "Administrador del sistema"
            },
            {
              id: "vendedor-rol-id",
              nombre: "ROL_VENDEDOR",
              descripcion: "Vendedor con permisos limitados"
            },
            {
              id: "coordinador-rol-id",
              nombre: "ROL_COORDINADOR_VENTAS",
              descripcion: "Coordinador de Ventas"
            }
          ]
        });
      }
      
      return NextResponse.json({ error: "Error obteniendo roles" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      roles: roles || [] 
    });

  } catch (error) {
    console.error('Error en API de roles:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}