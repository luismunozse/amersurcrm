// Script para verificar usuarios después de crear las tablas
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verificarUsuarios() {
  try {
    console.log('🔍 Verificando usuarios y perfiles...\n');

    // 1. Verificar usuarios en auth
    console.log('1. Usuarios en auth.users:');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios de auth:', authError);
      return;
    }

    if (authUsers.users.length === 0) {
      console.log('❌ No hay usuarios en auth.users');
      return;
    }

    console.log(`✅ Encontrados ${authUsers.users.length} usuarios:`);
    authUsers.users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.id})`);
      console.log(`      Creado: ${user.created_at}`);
      console.log(`      Último acceso: ${user.last_sign_in_at || 'Nunca'}`);
      console.log('');
    });

    // 2. Verificar roles
    console.log('2. Roles disponibles:');
    const { data: roles, error: rolesError } = await supabase
      .from('rol')
      .select('*')
      .order('nombre');

    if (rolesError) {
      console.error('❌ Error obteniendo roles:', rolesError);
      console.log('💡 Asegúrate de haber ejecutado el SQL en Supabase Dashboard');
      return;
    }

    console.log(`✅ Roles encontrados (${roles.length}):`);
    roles.forEach((rol, index) => {
      console.log(`   ${index + 1}. ${rol.nombre}`);
      console.log(`      Descripción: ${rol.descripcion}`);
      console.log(`      Activo: ${rol.activo ? 'Sí' : 'No'}`);
      console.log(`      Permisos: ${JSON.stringify(rol.permisos)}`);
      console.log('');
    });

    // 3. Verificar perfiles de usuario
    console.log('3. Perfiles de usuario:');
    const { data: perfiles, error: perfilError } = await supabase
      .from('usuario_perfil')
      .select(`
        id,
        nombre_completo,
        dni,
        telefono,
        rol_id,
        activo,
        created_at,
        rol:rol_id (
          id,
          nombre,
          descripcion
        )
      `)
      .order('created_at', { ascending: false });

    if (perfilError) {
      console.error('❌ Error obteniendo perfiles:', perfilError);
      console.log('💡 Asegúrate de haber ejecutado el SQL en Supabase Dashboard');
      return;
    }

    if (perfiles.length === 0) {
      console.log('❌ No hay perfiles de usuario creados');
      console.log('💡 Ejecuta el SQL para crear perfiles automáticamente');
      return;
    }

    console.log(`✅ Perfiles encontrados (${perfiles.length}):`);
    perfiles.forEach((perfil, index) => {
      const userEmail = authUsers.users.find(u => u.id === perfil.id)?.email;
      console.log(`   ${index + 1}. ${perfil.nombre_completo || 'Sin nombre'}`);
      console.log(`      Email: ${userEmail}`);
      console.log(`      DNI: ${perfil.dni || 'No asignado'}`);
      console.log(`      Teléfono: ${perfil.telefono || 'No asignado'}`);
      console.log(`      Rol: ${perfil.rol?.nombre || 'Sin rol'}`);
      console.log(`      Estado: ${perfil.activo ? 'Activo' : 'Inactivo'}`);
      console.log(`      Creado: ${perfil.created_at}`);
      console.log('');
    });

    // 4. Probar API de usuarios
    console.log('4. Probando API de usuarios...');
    try {
      const response = await fetch('http://localhost:3001/api/admin/usuarios', {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API de usuarios funcionando');
        console.log(`   Usuarios en API: ${data.usuarios?.length || 0}`);
      } else {
        console.log(`⚠️  API de usuarios respondió con status: ${response.status}`);
      }
    } catch (e) {
      console.log('⚠️  Error probando API:', e.message);
    }

    console.log('\n🎉 Verificación completada');

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verificarUsuarios();
