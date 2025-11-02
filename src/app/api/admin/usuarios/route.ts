import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/auth/roles";
import { generarUsername, generarUsernameConNumero, validarUsername } from "@/lib/utils/username-generator";
import { crearNotificacion } from "@/app/_actionsNotifications";

// GET - Obtener lista de usuarios
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

    // Obtener usuarios con sus perfiles
    const { data: usuarios, error } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select(`
        id,
        username,
        nombre_completo,
        dni,
        telefono,
        email,
        rol_id,
        meta_mensual_ventas,
        comision_porcentaje,
        activo,
        requiere_cambio_password,
        motivo_estado,
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
    // IMPORTANTE: Mapeo de campos para compatibilidad con el frontend
    // La base de datos usa 'meta_mensual_ventas' pero el frontend espera 'meta_mensual'
    type Usuario = {
      [key: string]: unknown;
      meta_mensual_ventas?: number | string;
    };

    const usuariosCompat = (usuarios || []).map((u: Usuario) => {
      const { meta_mensual_ventas, ...resto } = u;
      return {
        ...resto,
        // Mapear meta_mensual_ventas -> meta_mensual para el frontend
        meta_mensual: typeof meta_mensual_ventas === 'number'
          ? meta_mensual_ventas
          : (meta_mensual_ventas ? Number(meta_mensual_ventas) : undefined),
      };
    });

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
    let username = formData.get("username") as string;

    if (!password || !rol_id) {
      return NextResponse.json({ error: "Faltan campos requeridos: contraseña y rol son obligatorios" }, { status: 400 });
    }

    // Verificar que el rol existe
    const { data: rol, error: rolError } = await supabase
      .schema('crm')
      .from('rol')
      .select('id, nombre')
      .eq('id', rol_id)
      .eq('activo', true)
      .single();

    if (rolError || !rol) {
      console.error('Error obteniendo rol:', rolError);
      return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
    }

    const esRolAdmin = rol.nombre === 'ROL_ADMIN';

    // Validar campos según el tipo de rol
    if (esRolAdmin) {
      // Para admin: solo username es requerido
      if (!username) {
        return NextResponse.json({ error: "Username es requerido para administradores" }, { status: 400 });
      }
    } else {
      // Para vendedores/coordinadores: nombre y DNI son requeridos
      if (!nombre_completo || !dni) {
        return NextResponse.json({ error: "Nombre completo y DNI son requeridos para vendedores" }, { status: 400 });
      }
      // Generar username si no se proporcionó
      if (!username) {
        username = generarUsername(nombre_completo);
      }
    }

    // Validar formato de username
    const validacion = validarUsername(username);
    if (!validacion.valido) {
      return NextResponse.json({ error: validacion.error }, { status: 400 });
    }

    // Verificar que el username no exista
    const { data: existingUser } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('username')
      .eq('username', username)
      .single();

    if (existingUser) {
      if (esRolAdmin) {
        // Para admin, rechazar si el username ya existe
        return NextResponse.json({
          error: `El username "${username}" ya está en uso. Por favor, elige otro.`
        }, { status: 400 });
      } else {
        // Para vendedores, intentar con número incremental
        let numero = 2;
        let usernameDisponible = false;
        let usernameConNumero = username;

        while (!usernameDisponible && numero <= 99) {
          usernameConNumero = generarUsernameConNumero(username, numero);
          const { data } = await supabase
            .schema('crm')
            .from('usuario_perfil')
            .select('username')
            .eq('username', usernameConNumero)
            .single();

          if (!data) {
            usernameDisponible = true;
            username = usernameConNumero;
          }
          numero++;
        }

        if (!usernameDisponible) {
          return NextResponse.json({
            error: `El username "${username}" y sus variantes ya están en uso. Por favor, elige otro.`
          }, { status: 400 });
        }
      }
    }

    // Validar y generar email según el tipo de usuario
    let emailFinal: string;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (esRolAdmin) {
      // Para admin: usar username@amersur.admin si no se proporciona email
      emailFinal = email || `${username}@amersur.admin`;
    } else {
      // Para vendedores/coordinadores: el email es OPCIONAL
      if (email && email.trim()) {
        // Si se proporciona, validar formato
        if (!emailRegex.test(email.trim())) {
          return NextResponse.json({
            error: "El formato del email no es válido"
          }, { status: 400 });
        }
        emailFinal = email.trim().toLowerCase();
      } else {
        // Si NO se proporciona, generar un email válido usando el DNI
        // Usamos @amersur.local como dominio interno (válido pero no público)
        emailFinal = `${dni}@amersur.local`;
      }
    }
    
    // Verificar si el email ya existe
    const { data: existingEmail } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('email')
      .eq('email', emailFinal)
      .single();

    if (existingEmail) {
      return NextResponse.json({
        error: `El email "${emailFinal}" ya está en uso.`
      }, { status: 400 });
    }

    // Verificar si el DNI ya existe (solo para no-admin)
    if (dni && !esRolAdmin) {
      const { data: existingDni } = await supabase
        .schema('crm')
        .from('usuario_perfil')
        .select('dni')
        .eq('dni', dni)
        .single();

      if (existingDni) {
        return NextResponse.json({
          error: `El DNI "${dni}" ya está registrado.`
        }, { status: 400 });
      }
    }

    // Crear usuario en auth con client de service role (requiere key SRV)
    const srv = createServiceRoleClient();
    const { data: authData, error: authError } = await srv.auth.admin.createUser({
      email: emailFinal,
      password,
      email_confirm: true
    });

    if (authError) {
      console.error('Error creando usuario en auth:', authError);
      return NextResponse.json({
        error: "Error creando usuario: " + (authError.message || 'Error desconocido'),
        details: authError
      }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "No se pudo crear el usuario" }, { status: 500 });
    }

    // Crear perfil de usuario con username y requiere_cambio_password = true
    const { error: perfilError } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .insert({
        id: authData.user.id,
        username: username,
        email: emailFinal,
        nombre_completo: nombre_completo || username, // Para admin, usar username como nombre si no hay nombre
        dni: dni || null, // DNI es null para admin
        telefono: telefono || null,
        rol_id: rol.id,
        meta_mensual_ventas: meta_mensual ? parseInt(meta_mensual, 10) : null,
        comision_porcentaje: comision_porcentaje ? parseFloat(comision_porcentaje) : null,
        activo: true,
        requiere_cambio_password: true // Siempre true para nuevos usuarios
      });

    if (perfilError) {
      console.error('Error creando perfil:', perfilError);
      // Intentar eliminar el usuario de auth si falla la creación del perfil
      await srv.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Error creando perfil de usuario" }, { status: 500 });
    }

    // Notificar a todos los administradores sobre el nuevo usuario
    try {
      // Obtener todos los usuarios con rol de administrador
      const { data: admins, error: adminsError } = await supabase
        .schema('crm')
        .from('usuario_perfil')
        .select('id, rol:rol!usuario_perfil_rol_fk(nombre)')
        .eq('activo', true);

      if (!adminsError && admins) {
        const adminIds = admins
          .map((u: { id: string; rol: { nombre: string | null } | { nombre: string | null }[] }) => {
            const rol = Array.isArray(u.rol) ? u.rol[0]?.nombre : u.rol?.nombre;
            return rol === 'ROL_ADMIN' ? u.id : null;
          })
          .filter((id): id is string => Boolean(id));

        // Notificar a cada administrador
        for (const adminId of adminIds) {
          await crearNotificacion(
            adminId,
            "sistema",
            "👥 Nuevo usuario registrado",
            `Se ha registrado un nuevo usuario: ${nombre_completo || username} (@${username}) con rol ${rol.nombre}`,
            {
              usuario_id: authData.user.id,
              username,
              rol: rol.nombre,
              email: emailFinal,
              url: `/dashboard/admin/usuarios`
            }
          );
        }
      }
    } catch (notifError) {
      console.error("Error enviando notificaciones a admins:", notifError);
      // No fallar la creación del usuario si falla la notificación
    }

    return NextResponse.json({
      success: true,
      message: "Usuario creado exitosamente",
      usuario: {
        id: authData.user.id,
        username: username,
        email: emailFinal,
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
      username,
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

    // Validar username si se proporciona
    if (typeof username === 'string' && username.trim()) {
      const validacion = validarUsername(username.trim());
      if (!validacion.valido) {
        return NextResponse.json({ error: validacion.error || "El username no es válido" }, { status: 400 });
      }

      // Verificar que el username no esté en uso por otro usuario
      const { data: existente } = await supabase
        .schema('crm')
        .from('usuario_perfil')
        .select('id')
        .eq('username', username.trim())
        .neq('id', id)
        .single();

      if (existente) {
        return NextResponse.json({ error: "El username ya está en uso" }, { status: 400 });
      }
    }

    // Construir payload de update solo con campos presentes
    // IMPORTANTE: Mapeo de campos desde el frontend a la base de datos
    // El frontend envía 'meta_mensual' pero la BD espera 'meta_mensual_ventas'
    const updatePayload: Record<string, unknown> = {};
    if (typeof username === 'string' && username.trim()) updatePayload.username = username.trim();
    if (typeof nombre_completo === 'string') updatePayload.nombre_completo = nombre_completo;
    if (typeof dni === 'string') updatePayload.dni = dni;
    if (typeof telefono === 'string' || telefono === null) updatePayload.telefono = telefono ?? null;
    if (typeof rol_id === 'string') updatePayload.rol_id = rol_id;
    // Mapear meta_mensual (frontend) -> meta_mensual_ventas (BD)
    if (typeof meta_mensual !== 'undefined') updatePayload.meta_mensual_ventas = meta_mensual === null ? null : parseInt(String(meta_mensual), 10);
    if (typeof comision_porcentaje !== 'undefined') updatePayload.comision_porcentaje = comision_porcentaje === null ? null : Number(comision_porcentaje);
    if (typeof activo === 'boolean') updatePayload.activo = activo;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json({ error: "No hay cambios para aplicar" }, { status: 400 });
    }

    const { error: updError } = await supabase
      .schema('crm')
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

// DELETE - Eliminar usuario
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: "Falta id de usuario" }, { status: 400 });
    }

    // Verificar que no se está eliminando a sí mismo
    if (userId === user.id) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
    }

    // Verificar que el usuario existe
    const { data: usuarioExistente, error: fetchError } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('id, username, nombre_completo')
      .eq('id', userId)
      .single();

    if (fetchError || !usuarioExistente) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar si el usuario tiene clientes asignados
    const { data: clientesAsignados, error: clientesError } = await supabase
      .schema('crm')
      .from('cliente')
      .select('id')
      .eq('vendedor_asignado', usuarioExistente.username)
      .limit(1);

    if (clientesError) {
      console.error('Error verificando clientes asignados:', clientesError);
      return NextResponse.json({ error: "Error verificando dependencias" }, { status: 500 });
    }

    if (clientesAsignados && clientesAsignados.length > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar el usuario porque tiene ${clientesAsignados.length} cliente(s) asignado(s). Primero debe reasignar o desactivar estos clientes.` 
      }, { status: 400 });
    }

    // Eliminar el usuario del perfil (esto también eliminará el usuario de auth.users por cascada)
    const { error: deleteError } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error('Error eliminando usuario:', deleteError);
      return NextResponse.json({ error: "Error eliminando usuario" }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `Usuario ${usuarioExistente.nombre_completo} (@${usuarioExistente.username}) eliminado exitosamente` 
    });

  } catch (error) {
    console.error('Error eliminando usuario:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
