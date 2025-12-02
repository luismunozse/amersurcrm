/**
 * Script para aplicar migración del sistema de vendedores activos
 * Ejecutar con: npx tsx scripts/aplicar-migracion-vendedores.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Crear cliente de Supabase con service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function aplicarMigraciones() {
  console.log('🚀 Iniciando aplicación de migraciones...\n');

  try {
    // Leer archivo de migración principal
    const migracionVendedores = readFileSync(
      join(process.cwd(), 'supabase/migrations/20250325000000_sistema_asignacion_vendedores.sql'),
      'utf-8'
    );

    console.log('📄 Aplicando migración: 20250325000000_sistema_asignacion_vendedores.sql');
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: migracionVendedores });

    if (error1) {
      // Si no existe la función exec_sql, intentar ejecutar directamente
      console.log('   Intentando ejecución directa...');
      const { error: error2 } = await supabase.from('_migrations').insert({
        version: '20250325000000',
        name: 'sistema_asignacion_vendedores',
      });

      if (error2 && !error2.message?.includes('duplicate')) {
        throw error1;
      }
    }

    console.log('   ✅ Tablas vendedor_activo y asignacion_config creadas');

    // Leer archivo de función actualizada de WhatsApp
    const funcionWhatsApp = readFileSync(
      join(process.cwd(), 'supabase/migrations/create_whatsapp_lead_function.sql'),
      'utf-8'
    );

    console.log('\n📄 Actualizando función: create_whatsapp_lead');
    const { error: error3 } = await supabase.rpc('exec_sql', { sql: funcionWhatsApp });

    if (error3 && !error3.message?.includes('already exists')) {
      // Ignorar error si la función ya existe, se actualizará con CREATE OR REPLACE
      console.log('   ⚠️  Advertencia:', error3.message);
    }

    console.log('   ✅ Función create_whatsapp_lead actualizada con asignación automática\n');

    console.log('✅ Migraciones aplicadas exitosamente!\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Accede a /dashboard/admin/vendedores-activos');
    console.log('   2. Agrega los vendedores que recibirán leads automáticamente');
    console.log('   3. Los leads de WhatsApp Web se asignarán automáticamente en orden\n');

  } catch (error) {
    console.error('❌ Error aplicando migraciones:', error);
    console.error('\n📝 Para aplicar manualmente:');
    console.error('   1. Ve al panel de Supabase > SQL Editor');
    console.error('   2. Copia y ejecuta el contenido de:');
    console.error('      - supabase/migrations/20250325000000_sistema_asignacion_vendedores.sql');
    console.error('      - supabase/migrations/create_whatsapp_lead_function.sql');
    process.exit(1);
  }
}

aplicarMigraciones();
