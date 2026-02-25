import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient, createServiceRoleClient } from "@/lib/supabase.server";
import { esAdmin } from "@/lib/permissions/server";
import { generarUsername, generarUsernameConNumero, validarUsername } from "@/lib/utils/username-generator";
import { crearNotificacion } from "@/app/_actionsNotifications";
import { registrarAuditoriaUsuario } from "@/lib/auditoria-usuarios";

// GET - Obtener lista de usuarios con paginación server-side
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

    // Parámetros de paginación y filtros
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const rol = searchParams.get('rol') || '';
    const estado = searchParams.get('estado') || ''; // 'activo', 'inactivo', ''
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const sortBy = searchParams.get('sortBy') || ''; // 'ultimo_acceso'
    const sortDir = searchParams.get('sortDir') || 'desc'; // 'asc' | 'desc'
    const historialUserId = searchParams.get('historial') || '';

    // Si se pide historial de un usuario específico
    if (historialUserId) {
      return await getHistorialCambios(supabase, historialUserId);
    }

    // Query base
    let query = supabase
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
        avatar_url,
        firma_url,
        ultimo_acceso,
        deleted_at,
        deleted_motivo,
        created_at,
        rol:rol!usuario_perfil_rol_id_fkey (
          id,
          nombre,
          descripcion
        )
      `, { count: 'exact' });

    // Filtro soft delete
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }

    // Filtro de búsqueda
    if (search) {
      query = query.or(
        `nombre_completo.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%,dni.ilike.%${search}%`
      );
    }

    // Filtro de rol
    if (rol) {
      query = query.eq('rol_id', rol);
    }

    // Filtro de estado
    if (estado === 'activo') {
      query = query.eq('activo', true);
    } else if (estado === 'inactivo') {
      query = query.eq('activo', false);
    }

    // Paginación
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Si se ordena por ultimo_acceso, NO paginar en la BD (se ordena en memoria
    // después de mergear con last_sign_in_at de Auth, ya que ultimo_acceso puede
    // estar vacío para usuarios que no navegaron después de la migración).
    const sortByAcceso = sortBy === 'ultimo_acceso';

    // Orden default por created_at
    query = query.order('created_at', { ascending: false });

    let allUsuarios: any[] = [];
    let totalCount = 0;

    if (sortByAcceso) {
      // Traer TODOS los que matchean los filtros (sin .range)
      const { data, error: fetchErr, count: cnt } = await query;
      if (fetchErr) {
        console.error('Error obteniendo usuarios:', fetchErr);
        if (fetchErr.code === 'PGRST205') {
          return NextResponse.json({ success: true, usuarios: [], total: 0, page, limit });
        }
        return NextResponse.json({ error: "Error obteniendo usuarios" }, { status: 500 });
      }
      allUsuarios = data || [];
      totalCount = cnt || allUsuarios.length;
    } else {
      // Paginación normal en la BD
      const { data, error: fetchErr, count: cnt } = await query.range(from, to);
      if (fetchErr) {
        console.error('Error obteniendo usuarios:', fetchErr);
        if (fetchErr.code === 'PGRST205') {
          return NextResponse.json({ success: true, usuarios: [], total: 0, page, limit });
        }
        return NextResponse.json({ error: "Error obteniendo usuarios" }, { status: 500 });
      }
      allUsuarios = data || [];
      totalCount = cnt || 0;
    }

    // Obtener last_sign_in_at desde auth.users via serviceRole
    const serviceRole = createServiceRoleClient();
    const lastSignInMap: Record<string, string | null> = {};

    try {
      const { data: authList } = await serviceRole.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (authList?.users) {
        for (const authUser of authList.users) {
          lastSignInMap[authUser.id] = authUser.last_sign_in_at || null;
        }
      }
    } catch (authErr) {
      console.warn('[GET usuarios] No se pudo obtener last_sign_in_at:', authErr);
    }

    // Mapear campos
    type Usuario = {
      [key: string]: unknown;
      id: string;
      meta_mensual_ventas?: number | string;
      ultimo_acceso?: string | null;
    };

    let usuariosCompat = allUsuarios.map((u: Usuario) => {
      const { meta_mensual_ventas, ultimo_acceso, ...resto } = u;
      // ultimo_acceso (actualizado en cada navegación) > last_sign_in_at (solo login) > null
      const lastAccess = ultimo_acceso || lastSignInMap[u.id] || null;
      return {
        ...resto,
        meta_mensual: typeof meta_mensual_ventas === 'number'
          ? meta_mensual_ventas
          : (meta_mensual_ventas ? Number(meta_mensual_ventas) : undefined),
        ultimo_acceso: lastAccess,
        last_sign_in_at: lastAccess,
      };
    });

    // Si se ordena por ultimo_acceso, ordenar en memoria con el valor real y paginar manualmente
    if (sortByAcceso) {
      usuariosCompat.sort((a, b) => {
        const dateA = a.ultimo_acceso ? new Date(a.ultimo_acceso).getTime() : 0;
        const dateB = b.ultimo_acceso ? new Date(b.ultimo_acceso).getTime() : 0;
        return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
      });
      usuariosCompat = usuariosCompat.slice(from, to + 1);
    }

    return NextResponse.json({
      success: true,
      usuarios: usuariosCompat,
      total: totalCount,
      page,
      limit,
    });

  } catch (error) {
    console.error('Error en GET /api/admin/usuarios:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// Helper: obtener historial de cambios de un usuario
async function getHistorialCambios(supabase: any, userId: string) {
  try {
    const { data, error } = await supabase
      .schema('crm')
      .from('historial_cambios_usuario')
      .select('id, campo, valor_anterior, valor_nuevo, modificado_por, created_at')
      .eq('usuario_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      // Si la tabla no existe, retornar vacío
      if (error.code === 'PGRST205') {
        return NextResponse.json({ success: true, historial: [] });
      }
      throw error;
    }

    return NextResponse.json({ success: true, historial: data || [] });
  } catch (err) {
    console.error('Error obteniendo historial:', err);
    return NextResponse.json({ error: "Error obteniendo historial" }, { status: 500 });
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

    if (!password || password.length < 6 || !rol_id) {
      return NextResponse.json({ error: "Faltan campos requeridos: contraseña (mínimo 6 caracteres) y rol son obligatorios" }, { status: 400 });
    }

    // Verificar rol + validaciones de formato primero (sin DB)
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
      if (!username) {
        return NextResponse.json({ error: "Username es requerido para administradores" }, { status: 400 });
      }
    } else {
      if (!nombre_completo || !dni) {
        return NextResponse.json({ error: "Nombre completo y DNI son requeridos para vendedores" }, { status: 400 });
      }
      if (!/^\d{8}$/.test(dni)) {
        return NextResponse.json({ error: "El DNI debe contener exactamente 8 dígitos numéricos" }, { status: 400 });
      }
      if (!username) {
        username = generarUsername(nombre_completo);
      }
    }

    // Validar formato de username
    const validacion = validarUsername(username);
    if (!validacion.valido) {
      return NextResponse.json({ error: validacion.error }, { status: 400 });
    }

    // Validar email (formato, sin DB)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !email.trim()) {
      return NextResponse.json({
        error: "El email es obligatorio. Por favor, proporciona un email válido con un dominio de internet (ej: @gmail.com, @outlook.com, etc.)"
      }, { status: 400 });
    }
    const emailTrimmed = email.trim().toLowerCase();
    if (!emailRegex.test(emailTrimmed)) {
      return NextResponse.json({ error: "El formato del email no es válido" }, { status: 400 });
    }
    const domain = emailTrimmed.split('@')[1]?.toLowerCase();
    const invalidDomains = ['.local', '.admin', '.test', '.localhost'];
    const hasInvalidDomain = invalidDomains.some(invalid => domain?.endsWith(invalid));
    if (hasInvalidDomain) {
      return NextResponse.json({
        error: "No se puede usar un dominio local (.local, .admin, etc.). Por favor, usa un email con un dominio válido de internet como @gmail.com, @outlook.com, @hotmail.com, etc."
      }, { status: 400 });
    }
    const emailFinal = emailTrimmed;

    // Verificar username, email y DNI en paralelo (Promise.all)
    const [
      { data: existingUser },
      { data: existingEmail },
      existingDniResult,
    ] = await Promise.all([
      supabase.schema('crm').from('usuario_perfil').select('username').eq('username', username).single(),
      supabase.schema('crm').from('usuario_perfil').select('email').eq('email', emailFinal).single(),
      dni && !esRolAdmin
        ? supabase.schema('crm').from('usuario_perfil').select('dni').eq('dni', dni).single()
        : Promise.resolve({ data: null }),
    ]);

    if (existingEmail) {
      return NextResponse.json({
        error: `El email "${emailFinal}" ya está en uso.`
      }, { status: 400 });
    }

    if (existingDniResult?.data) {
      return NextResponse.json({
        error: `El DNI "${dni}" ya está registrado.`
      }, { status: 400 });
    }

    if (existingUser) {
      if (esRolAdmin) {
        return NextResponse.json({
          error: `El username "${username}" ya está en uso. Por favor, elige otro.`
        }, { status: 400 });
      } else {
        const usernameCandidates = Array.from({ length: 98 }, (_, i) =>
          generarUsernameConNumero(username, i + 2)
        );
        const { data: existingUsernames } = await supabase
          .schema('crm')
          .from('usuario_perfil')
          .select('username')
          .in('username', usernameCandidates);

        const takenUsernames = new Set(existingUsernames?.map(u => u.username) || []);
        const usernameDisponible = usernameCandidates.find(u => !takenUsernames.has(u));

        if (!usernameDisponible) {
          return NextResponse.json({
            error: `El username "${username}" y sus variantes ya están en uso. Por favor, elige otro.`
          }, { status: 400 });
        }
        username = usernameDisponible;
      }
    }

    // Crear usuario en auth con client de service role
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

    // Validar rangos de meta y comisión
    const metaValue = meta_mensual ? parseInt(meta_mensual, 10) : null;
    if (metaValue !== null && (isNaN(metaValue) || metaValue < 0)) {
      return NextResponse.json({ error: "La meta mensual no puede ser negativa" }, { status: 400 });
    }
    const comisionValue = comision_porcentaje ? parseFloat(comision_porcentaje) : null;
    if (comisionValue !== null && (isNaN(comisionValue) || comisionValue < 0 || comisionValue > 100)) {
      return NextResponse.json({ error: "La comisión debe estar entre 0 y 100" }, { status: 400 });
    }

    // Crear perfil de usuario
    const { error: perfilError } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .insert({
        id: authData.user.id,
        username: username,
        email: emailFinal,
        nombre_completo: nombre_completo || username,
        dni: dni || null,
        telefono: telefono || null,
        rol_id: rol.id,
        meta_mensual_ventas: metaValue,
        comision_porcentaje: comisionValue,
        activo: true,
        requiere_cambio_password: true
      });

    if (perfilError) {
      console.error('Error creando perfil:', perfilError);
      await srv.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: "Error creando perfil de usuario" }, { status: 500 });
    }

    // Auditoría de creación
    const { data: adminPerfil } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('nombre_completo')
      .eq('id', user.id)
      .single();

    await registrarAuditoriaUsuario(srv, {
      adminId: user.id,
      adminNombre: adminPerfil?.nombre_completo || user.email || 'Admin',
      usuarioId: authData.user.id,
      usuarioNombre: nombre_completo || username,
      accion: 'crear',
      detalles: { username, email: emailFinal, rol: rol.nombre },
    });

    // Notificar a administradores
    try {
      const { data: admins, error: adminsError } = await supabase
        .schema('crm')
        .from('usuario_perfil')
        .select('id, rol:rol!usuario_perfil_rol_id_fkey(nombre)')
        .eq('activo', true);

      if (!adminsError && admins) {
        const adminIds = admins
          .map((u: { id: string; rol: { nombre: string | null } | { nombre: string | null }[] }) => {
            const rol = Array.isArray(u.rol) ? u.rol[0]?.nombre : u.rol?.nombre;
            return rol === 'ROL_ADMIN' ? u.id : null;
          })
          .filter((id): id is string => Boolean(id));

        for (const adminId of adminIds) {
          await crearNotificacion(
            adminId,
            "sistema",
            "Nuevo usuario registrado",
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

// PATCH - Editar usuario con registro de historial de cambios
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
      id,
      username,
      nombre_completo,
      dni,
      telefono,
      email,
      rol_id,
      meta_mensual,
      comision_porcentaje,
      activo,
    } = body || {};

    if (!id) {
      return NextResponse.json({ error: "Falta id de usuario" }, { status: 400 });
    }

    // Leer valores actuales para historial de cambios
    const { data: currentUser, error: currentError } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('username, nombre_completo, dni, telefono, email, rol_id, meta_mensual_ventas, comision_porcentaje, activo')
      .eq('id', id)
      .single();

    if (currentError || !currentUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Si se proporciona email, actualizar en Supabase Auth primero
    if (typeof email === 'string' && email.trim()) {
      const newEmail = email.trim().toLowerCase();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return NextResponse.json({ error: "El formato del email no es válido" }, { status: 400 });
      }

      const domain = newEmail.split('@')[1];
      const invalidDomains = ['.local', '.admin', '.test', '.localhost'];
      if (invalidDomains.some(inv => domain.endsWith(inv))) {
        return NextResponse.json({
          error: "El email debe tener un dominio válido de internet"
        }, { status: 400 });
      }

      const { data: existingEmail } = await supabase
        .schema('crm')
        .from('usuario_perfil')
        .select('id')
        .eq('email', newEmail)
        .neq('id', id)
        .single();

      if (existingEmail) {
        return NextResponse.json({
          error: `El email "${newEmail}" ya está en uso por otro usuario.`
        }, { status: 400 });
      }

      const serviceRole = createServiceRoleClient();
      const { error: authError } = await serviceRole.auth.admin.updateUserById(
        id,
        { email: newEmail, email_confirm: true }
      );

      if (authError) {
        console.error('Error actualizando email en Auth:', authError);
        return NextResponse.json({
          error: `Error actualizando email: ${authError.message}`
        }, { status: 500 });
      }
    }

    // Validar formato de username
    if (typeof username === 'string' && username.trim()) {
      const validacion = validarUsername(username.trim());
      if (!validacion.valido) {
        return NextResponse.json({ error: validacion.error || "El username no es válido" }, { status: 400 });
      }
    }

    // Verificar username y rol en paralelo
    const needsUsernameCheck = typeof username === 'string' && username.trim();
    const needsRolCheck = typeof rol_id === 'string' && rol_id.trim();

    if (needsUsernameCheck || needsRolCheck) {
      const [usernameResult, rolResult] = await Promise.all([
        needsUsernameCheck
          ? supabase.schema('crm').from('usuario_perfil').select('id')
              .eq('username', username.trim()).neq('id', id).single()
          : Promise.resolve({ data: null, error: null }),
        needsRolCheck
          ? supabase.schema('crm').from('rol').select('id, nombre')
              .eq('id', rol_id).eq('activo', true).single()
          : Promise.resolve({ data: true, error: null }),
      ]);

      if (needsUsernameCheck && usernameResult.data) {
        return NextResponse.json({ error: "El username ya está en uso" }, { status: 400 });
      }

      if (needsRolCheck && (rolResult.error || !rolResult.data)) {
        return NextResponse.json({ error: "El rol especificado no existe o no está activo" }, { status: 400 });
      }
    }

    // Validar DNI
    if (typeof dni === 'string' && dni && !/^\d{8}$/.test(dni)) {
      return NextResponse.json({ error: "El DNI debe contener exactamente 8 dígitos numéricos" }, { status: 400 });
    }

    // Validar meta mensual
    if (typeof meta_mensual !== 'undefined' && meta_mensual !== null) {
      const metaVal = parseInt(String(meta_mensual), 10);
      if (isNaN(metaVal) || metaVal < 0) {
        return NextResponse.json({ error: "La meta mensual no puede ser negativa" }, { status: 400 });
      }
    }

    // Validar comisión
    if (typeof comision_porcentaje !== 'undefined' && comision_porcentaje !== null) {
      const comVal = Number(comision_porcentaje);
      if (isNaN(comVal) || comVal < 0 || comVal > 100) {
        return NextResponse.json({ error: "La comisión debe estar entre 0 y 100" }, { status: 400 });
      }
    }

    const updatePayload: Record<string, unknown> = {};
    if (typeof username === 'string' && username.trim()) updatePayload.username = username.trim();
    if (typeof nombre_completo === 'string') updatePayload.nombre_completo = nombre_completo;
    if (typeof dni === 'string') updatePayload.dni = dni;
    if (typeof telefono === 'string' || telefono === null) updatePayload.telefono = telefono ?? null;
    if (typeof email === 'string' && email.trim()) updatePayload.email = email.trim().toLowerCase();
    if (typeof rol_id === 'string' && rol_id.trim()) updatePayload.rol_id = rol_id;
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

    // Registrar historial de cambios campo por campo
    const cambios: { campo: string; valor_anterior: string | null; valor_nuevo: string | null }[] = [];
    const fieldMap: Record<string, string> = {
      username: 'username',
      nombre_completo: 'nombre_completo',
      dni: 'dni',
      telefono: 'telefono',
      email: 'email',
      rol_id: 'rol_id',
      meta_mensual_ventas: 'meta_mensual',
      comision_porcentaje: 'comision_porcentaje',
      activo: 'activo',
    };

    for (const [dbField, displayName] of Object.entries(fieldMap)) {
      const payloadField = dbField === 'meta_mensual_ventas' ? 'meta_mensual_ventas' : dbField;
      if (payloadField in updatePayload) {
        const oldVal = currentUser[dbField as keyof typeof currentUser];
        const newVal = updatePayload[payloadField];
        const oldStr = oldVal == null ? null : String(oldVal);
        const newStr = newVal == null ? null : String(newVal);
        if (oldStr !== newStr) {
          cambios.push({
            campo: displayName,
            valor_anterior: oldStr,
            valor_nuevo: newStr,
          });
        }
      }
    }

    if (cambios.length > 0) {
      try {
        const historialRows = cambios.map(c => ({
          usuario_id: id,
          campo: c.campo,
          valor_anterior: c.valor_anterior,
          valor_nuevo: c.valor_nuevo,
          modificado_por: user.id,
        }));
        await supabase.schema('crm').from('historial_cambios_usuario').insert(historialRows);
      } catch (histErr) {
        console.warn('[PATCH] Error registrando historial de cambios:', histErr);
      }

      // Auditoría
      const serviceRole = createServiceRoleClient();
      const { data: adminPerfil } = await supabase
        .schema('crm')
        .from('usuario_perfil')
        .select('nombre_completo')
        .eq('id', user.id)
        .single();

      await registrarAuditoriaUsuario(serviceRole, {
        adminId: user.id,
        adminNombre: adminPerfil?.nombre_completo || user.email || 'Admin',
        usuarioId: id,
        usuarioNombre: currentUser.nombre_completo || id,
        accion: 'editar',
        detalles: { campos_modificados: cambios.map(c => c.campo) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error en PATCH /api/admin/usuarios:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE eliminado: la eliminación de usuarios se maneja exclusivamente
// mediante el server action eliminarUsuario() en _actions.ts que usa
// serviceRole para bypasear RLS y maneja soft delete + auditoría.
