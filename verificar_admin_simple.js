// Script simple para verificar el estado del usuario admin
const { createClient } = require('@supabase/supabase-js');

// Pedir las credenciales al usuario
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  try {
    console.log('🔍 Verificador de estado del usuario admin\n');
    
    const supabaseUrl = await askQuestion('Ingresa tu NEXT_PUBLIC_SUPABASE_URL: ');
    const supabaseKey = await askQuestion('Ingresa tu SUPABASE_SERVICE_ROLE_KEY: ');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Faltan credenciales');
      rl.close();
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('\n🔍 Verificando estado...\n');

    // 1. Verificar usuario en auth
    console.log('1. Verificando usuario en auth.users:');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error obteniendo usuarios de auth:', authError);
      rl.close();
      return;
    }

    const adminUser = authUsers.users.find(u => u.email === 'admin@amersur.test');
    
    if (!adminUser) {
      console.log('❌ Usuario admin@amersur.test no encontrado');
      console.log('📋 Usuarios disponibles:');
      authUsers.users.forEach(u => {
        console.log(`   - ${u.email} (${u.id})`);
      });
      rl.close();
      return;
    }

    console.log(`✅ Usuario encontrado: ${adminUser.email} (${adminUser.id})\n`);

    // 2. Verificar perfil
    console.log('2. Verificando perfil de usuario:');
    const { data: perfil, error: perfilError } = await supabase
      .from('usuario_perfil')
      .select(`
        id,
        nombre_completo,
        rol_id,
        activo,
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
      console.log('💡 El usuario no tiene perfil creado.');
      rl.close();
      return;
    }

    console.log('✅ Perfil encontrado:');
    console.log(`   Nombre: ${perfil.nombre_completo}`);
    console.log(`   Rol: ${perfil.rol?.nombre || 'Sin rol'}`);
    console.log(`   Activo: ${perfil.activo}`);
    console.log(`   Permisos: ${JSON.stringify(perfil.rol?.permisos || [])}\n`);

    if (perfil.rol?.nombre === 'ROL_ADMIN') {
      console.log('🎉 ¡El usuario admin@amersur.test tiene rol de administrador!');
    } else {
      console.log('⚠️  El usuario admin@amersur.test NO tiene rol de administrador');
      console.log('💡 Necesitas ejecutar el script asignar_admin_automatico.sql en Supabase SQL Editor');
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    rl.close();
  }
}

main();
