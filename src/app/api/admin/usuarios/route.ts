import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
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
        rol_id,
        meta_mensual_ventas,
        comision_porcentaje,
        activo,
        created_at,
        rol:rol_id (
          id,
          nombre,
          descripcion
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error obteniendo usuarios:', error);
      return NextResponse.json({ error: "Error obteniendo usuarios" }, { status: 500 });
    }

    // Obtener emails de los usuarios desde auth.users
    const userIds = usuarios.map(u => u.id);
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Error obteniendo usuarios de auth:', authError);
      return NextResponse.json({ error: "Error obteniendo usuarios" }, { status: 500 });
    }

    // Combinar datos
    const usuariosCompletos = usuarios.map(usuario => {
      const authUser = authUsers.users.find(au => au.id === usuario.id);
      return {
        id: usuario.id,
        email: authUser?.email || 'Sin email',
        nombre: usuario.nombre_completo,
        rol: usuario.rol?.nombre || 'Sin rol',
        estado: usuario.activo ? 'activo' : 'inactivo',
        meta_mensual: usuario.meta_mensual_ventas,
        comision_porcentaje: usuario.comision_porcentaje,
        ultimo_acceso: authUser?.last_sign_in_at || null,
        created_at: usuario.created_at
      };
    });

    return NextResponse.json({ usuarios: usuariosCompletos });
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
    const nombre = formData.get("nombre") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const meta_mensual = formData.get("meta_mensual") as string;
    const comision_porcentaje = formData.get("comision_porcentaje") as string;

    if (!nombre || !email || !password) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
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

    // Obtener rol de vendedor
    const { data: rolVendedor, error: rolError } = await supabase
      .from('rol')
      .select('id')
      .eq('nombre', 'ROL_VENDEDOR')
      .single();

    if (rolError || !rolVendedor) {
      console.error('Error obteniendo rol vendedor:', rolError);
      return NextResponse.json({ error: "Error obteniendo rol de vendedor" }, { status: 500 });
    }

    // Crear perfil de usuario
    const { error: perfilError } = await supabase
      .from('usuario_perfil')
      .insert({
        id: authData.user.id,
        nombre_completo: nombre,
        rol_id: rolVendedor.id,
        meta_mensual_ventas: meta_mensual ? parseFloat(meta_mensual) : null,
        comision_porcentaje: comision_porcentaje ? parseFloat(comision_porcentaje) : null,
        activo: true
      });

    if (perfilError) {
      console.error('Error creando perfil:', perfilError);
      // Intentar eliminar el usuario de auth si falla la creación del perfil
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Error creando perfil de usuario" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Usuario creado exitosamente",
      usuario: {
        id: authData.user.id,
        email,
        nombre,
        rol: 'ROL_VENDEDOR'
      }
    });
  } catch (error) {
    console.error('Error en POST /api/admin/usuarios:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
