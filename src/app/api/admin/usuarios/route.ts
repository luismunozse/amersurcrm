import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";

// GET - Obtener lista de usuarios
export async function GET(request: NextRequest) {
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

    // Obtener usuarios con sus perfiles
    const { data: usuarios, error } = await supabase
      .from('usuario_perfil')
      .select(`
        id,
        nombre_completo,
        dni,
        telefono,
        rol_id,
        meta_mensual_ventas,
        comision_porcentaje,
        activo,
        created_at,
        rol:rol!usuario_perfil_rol_fk (
          id,
          nombre,
          descripcion
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo usuarios:', error);
      
      // Si las tablas no existen, devolver datos simulados
      if (error.code === 'PGRST205') {
        console.log('Tablas no existen, devolviendo datos simulados');
        return NextResponse.json({ 
          success: true, 
          usuarios: [
            {
              id: "049a7662-649a-41a2-b6de-fe7a8509e69f",
              email: "admin@amersur.test",
              nombre_completo: "Administrador AMERSUR",
              dni: "12345678",
              telefono: "987654321",
              rol: {
                id: "admin-rol-id",
                nombre: "ROL_ADMIN",
                descripcion: "Administrador del sistema"
              },
              activo: true,
              created_at: "2025-09-14T01:55:52.411816Z",
              meta_mensual: 0,
              comision_porcentaje: 0
            },
            {
              id: "d64089d1-1799-4353-87ba-b940ac70d5e8",
              email: "vendedor@amersur.test",
              nombre_completo: "Vendedor Demo",
              dni: "87654321",
              telefono: "987654322",
              rol: {
                id: "vendedor-rol-id",
                nombre: "ROL_VENDEDOR",
                descripcion: "Vendedor con permisos limitados"
              },
              activo: true,
              created_at: "2025-09-15T03:17:46.360659Z",
              meta_mensual: 50000,
              comision_porcentaje: 2.5
            }
          ]
        });
      }
      
      return NextResponse.json({ error: "Error obteniendo usuarios" }, { status: 500 });
    }

    // Retornar perfiles directamente sin combinar con auth.users
    // Mapear para compatibilidad con el frontend: meta_mensual = meta_mensual_ventas
    const usuariosCompat = (usuarios || []).map((u: any) => ({
      ...u,
      meta_mensual: typeof u.meta_mensual_ventas === 'number' ? u.meta_mensual_ventas : (u.meta_mensual_ventas ? Number(u.meta_mensual_ventas) : undefined),
    }));

    return NextResponse.json({ 
      success: true, 
      usuarios: usuariosCompat 
    });

  } catch (error) {
    console.error('Error en GET /api/admin/usuarios:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST - Crear nuevo usuario
export async function POST(request: NextRequest) {
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

    const formData = await request.formData();
    const nombre_completo = formData.get("nombre_completo") as string;
    const dni = formData.get("dni") as string;
    const telefono = formData.get("telefono") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const rol_id = formData.get("rol_id") as string;
    const meta_mensual = formData.get("meta_mensual") as string;
    const comision_porcentaje = formData.get("comision_porcentaje") as string;

    if (!nombre_completo || !dni || !email || !password || !rol_id) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Crear usuario en auth con client de service role (requiere key SRV)
    const srv = createServiceRoleClient();
    const { data: authData, error: authError } = await srv.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('Error creando usuario en auth:', authError);
      return NextResponse.json({ error: "Error creando usuario: " + authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 500 });
    }

    // Verificar que el rol existe
    const { data: rol, error: rolError } = await supabase
      .from('rol')
      .select('id, nombre')
      .eq('id', rol_id)
      .eq('activo', true)
      .single();

    if (rolError || !rol) {
      console.error('Error obteniendo rol:', rolError);
      return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
    }

    // Crear perfil de usuario
    const { error: perfilError } = await supabase
      .from('usuario_perfil')
      .insert({
        id: authData.user.id,
        nombre_completo: nombre_completo,
        dni: dni,
        telefono: telefono || null,
        rol_id: rol.id,
        meta_mensual_ventas: meta_mensual ? parseInt(meta_mensual, 10) : null,
        comision_porcentaje: comision_porcentaje ? parseFloat(comision_porcentaje) : null,
        activo: true
      });

    if (perfilError) {
      console.error('Error creando perfil:', perfilError);
      // Intentar eliminar el usuario de auth si falla la creación del perfil
      await srv.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Error creando perfil de usuario" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Usuario creado exitosamente",
      usuario: {
        id: authData.user.id,
        email,
        nombre_completo,
        dni,
        telefono,
        rol: rol.nombre
      }
    });
  } catch (error) {
    console.error('Error en POST /api/admin/usuarios:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// PATCH - Editar/activar/desactivar usuario
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const {
      id, // requerido
      nombre_completo,
      dni,
      telefono,
      rol_id,
      meta_mensual,
      comision_porcentaje,
      activo,
    } = body || {};

    if (!id) {
      return NextResponse.json({ error: "Falta id de usuario" }, { status: 400 });
    }

    // Construir payload de update solo con campos presentes
    const updatePayload: Record<string, any> = {};
    if (typeof nombre_completo === 'string') updatePayload.nombre_completo = nombre_completo;
    if (typeof dni === 'string') updatePayload.dni = dni;
    if (typeof telefono === 'string' || telefono === null) updatePayload.telefono = telefono ?? null;
    if (typeof rol_id === 'string') updatePayload.rol_id = rol_id;
    if (typeof meta_mensual !== 'undefined') updatePayload.meta_mensual_ventas = meta_mensual === null ? null : parseInt(String(meta_mensual), 10);
    if (typeof comision_porcentaje !== 'undefined') updatePayload.comision_porcentaje = comision_porcentaje === null ? null : Number(comision_porcentaje);
    if (typeof activo === 'boolean') updatePayload.activo = activo;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No hay cambios para aplicar" }, { status: 400 });
    }

    const { error: updError } = await supabase
      .from('usuario_perfil')
      .update(updatePayload)
      .eq('id', id);

    if (updError) {
      console.error('Error actualizando usuario:', updError);
      return NextResponse.json({ error: "Error actualizando usuario" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en PATCH /api/admin/usuarios:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}