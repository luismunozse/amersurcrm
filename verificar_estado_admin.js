// Script para verificar el estado del usuario admin
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verificarAdmin() {
  try {
    console.log('🔍 Verificando estado del usuario admin...\n');

    // 1. Verificar si el usuario existe en auth.users
    console.log('1. Verificando usuario en auth.users:');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios de auth:', authError);
      return;
    }

    const adminUser = authUsers.users.find(u => u.email === 'admin@amersur.test');
    
    if (!adminUser) {
      console.log('❌ Usuario admin@amersur.test no encontrado en auth.users');
      console.log('📋 Usuarios disponibles:');
      authUsers.users.forEach(u => {
        console.log(`   - ${u.email} (${u.id})`);
      });
      return;
    }

    console.log(`✅ Usuario encontrado: ${adminUser.email} (${adminUser.id})`);
    console.log(`   Creado: ${adminUser.created_at}`);
    console.log(`   Último acceso: ${adminUser.last_sign_in_at || 'Nunca'}\n`);

    // 2. Verificar roles disponibles
    console.log('2. Verificando roles disponibles:');
    const { data: roles, error: rolesError } = await supabase
      .from('rol')
      .select('*')
      .order('nombre');

    if (rolesError) {
      console.error('❌ Error obteniendo roles:', rolesError);
      return;
    }

    console.log('📋 Roles disponibles:');
    roles.forEach(rol => {
      console.log(`   - ${rol.nombre}: ${rol.descripcion}`);
      console.log(`     Permisos: ${JSON.stringify(rol.permisos)}`);
    });
    console.log('');

    // 3. Verificar perfil de usuario
    console.log('3. Verificando perfil de usuario:');
    const { data: perfil, error: perfilError } = await supabase
      .from('usuario_perfil')
      .select(`
        id,
        nombre_completo,
        rol_id,
        activo,
        created_at,
        rol:rol_id (
          id,
          nombre,
          descripcion,
          permisos
        )
      `)
      .eq('id', adminUser.id)
      .single();

    if (perfilError) {
      console.log('❌ Error obteniendo perfil:', perfilError);
      console.log('💡 El usuario no tiene perfil creado. Necesitas ejecutar el script de asignación.');
      return;
    }

    console.log('✅ Perfil encontrado:');
    console.log(`   Nombre: ${perfil.nombre_completo}`);
    console.log(`   Rol: ${perfil.rol?.nombre || 'Sin rol'}`);
    console.log(`   Activo: ${perfil.activo}`);
    console.log(`   Permisos: ${JSON.stringify(perfil.rol?.permisos || [])}`);
    console.log(`   Creado: ${perfil.created_at}\n`);

    // 4. Verificar si es administrador
    if (perfil.rol?.nombre === 'ROL_ADMIN') {
      console.log('🎉 ¡El usuario admin@amersur.test tiene rol de administrador!');
    } else {
      console.log('⚠️  El usuario admin@amersur.test NO tiene rol de administrador');
      console.log('💡 Necesitas ejecutar el script asignar_admin_automatico.sql');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verificarAdmin();
