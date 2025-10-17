/**
 * Script para resetear la contraseña del administrador
 *
 * Uso:
 * node scripts/reset-admin-password.js
 *
 * Requisitos:
 * - Tener la variable SUPABASE_SERVICE_ROLE_KEY en tu archivo .env
 * - El usuario admin@amersur.admin debe existir en Supabase
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Configuración
const ADMIN_EMAIL = 'admin@amersur.admin';
const NEW_PASSWORD = 'Admin123!'; // Cambia esta contraseña

async function resetAdminPassword() {
  console.log('🔄 Iniciando reseteo de contraseña del administrador...\n');

  // Verificar que tenemos las variables de entorno necesarias
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Error: Faltan variables de entorno');
    console.error('   Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu .env');
    process.exit(1);
  }

  // Crear cliente de Supabase con Service Role Key (tiene permisos de admin)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // 1. Verificar que el usuario existe
    console.log(`📧 Buscando usuario: ${ADMIN_EMAIL}`);

    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Error al listar usuarios:', listError.message);
      process.exit(1);
    }

    const adminUser = users.users.find(u => u.email === ADMIN_EMAIL);

    if (!adminUser) {
      console.error(`❌ Usuario ${ADMIN_EMAIL} no encontrado`);
      console.log('\n💡 Usuarios disponibles:');
      users.users.forEach(u => console.log(`   - ${u.email} (${u.id})`));
      process.exit(1);
    }

    console.log(`✅ Usuario encontrado: ${adminUser.id}`);
    console.log(`   Creado: ${new Date(adminUser.created_at).toLocaleDateString()}`);
    console.log(`   Último login: ${adminUser.last_sign_in_at ? new Date(adminUser.last_sign_in_at).toLocaleDateString() : 'Nunca'}\n`);

    // 2. Actualizar la contraseña
    console.log('🔐 Actualizando contraseña...');

    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      adminUser.id,
      { password: NEW_PASSWORD }
    );

    if (updateError) {
      console.error('❌ Error al actualizar contraseña:', updateError.message);
      process.exit(1);
    }

    console.log('✅ Contraseña actualizada exitosamente\n');

    // 3. Verificar el perfil del usuario
    console.log('👤 Verificando perfil del usuario...');

    const { data: perfil, error: perfilError } = await supabase
      .schema('crm')
      .from('usuario_perfil')
      .select('id, nombre_completo, username, rol, activo, requiere_cambio_password')
      .eq('id', adminUser.id)
      .single();

    if (perfilError && perfilError.code !== 'PGRST116') {
      console.warn('⚠️  Advertencia al consultar perfil:', perfilError.message);
    } else if (perfil) {
      console.log(`   Nombre: ${perfil.nombre_completo || 'N/A'}`);
      console.log(`   Username: ${perfil.username || 'N/A'}`);
      console.log(`   Rol: ${perfil.rol || 'N/A'}`);
      console.log(`   Activo: ${perfil.activo ? 'Sí' : 'No'}`);
      console.log(`   Requiere cambio de password: ${perfil.requiere_cambio_password ? 'Sí' : 'No'}\n`);

      // 4. Desactivar flag de cambio de password si está activo
      if (perfil.requiere_cambio_password) {
        console.log('🔧 Desactivando flag de cambio de password...');

        const { error: updatePerfilError } = await supabase
          .schema('crm')
          .from('usuario_perfil')
          .update({ requiere_cambio_password: false })
          .eq('id', adminUser.id);

        if (updatePerfilError) {
          console.warn('⚠️  Advertencia al actualizar perfil:', updatePerfilError.message);
        } else {
          console.log('✅ Flag actualizado\n');
        }
      }

      // 5. Asegurar que tiene rol de administrador
      if (perfil.rol !== 'ROL_ADMIN') {
        console.log('🔧 Asignando rol de administrador...');

        const { error: rolError } = await supabase
          .schema('crm')
          .from('usuario_perfil')
          .update({ rol: 'ROL_ADMIN' })
          .eq('id', adminUser.id);

        if (rolError) {
          console.warn('⚠️  Advertencia al actualizar rol:', rolError.message);
        } else {
          console.log('✅ Rol actualizado\n');
        }
      }
    } else {
      console.log('   ℹ️  No se encontró perfil de usuario (tabla usuario_perfil vacía)\n');
    }

    // Resultado final
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RESETEO COMPLETADO EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', ADMIN_EMAIL);
    console.log('🔐 Password: ', NEW_PASSWORD);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Ahora puedes iniciar sesión con estas credenciales');
    console.log('🔒 IMPORTANTE: Cambia esta contraseña después de iniciar sesión\n');

  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar el script
resetAdminPassword();
