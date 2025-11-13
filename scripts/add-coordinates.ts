/**
 * Script para agregar columnas de coordenadas a la tabla proyecto
 *
 * Uso:
 * npx tsx scripts/add-coordinates.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
  db: { schema: 'crm' }
});

async function addCoordinatesColumns() {
  console.log('🔧 Agregando columnas de coordenadas a la tabla proyecto...\n');

  try {
    // Verificar si las columnas ya existen
    const { data: columns, error: checkError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'crm'
            AND table_name = 'proyecto'
            AND column_name IN ('latitud', 'longitud')
        `
      });

    if (checkError) {
      console.log('⚠️  No se pudo verificar columnas existentes (esto es normal si RPC no está disponible)');
      console.log('   Intentando agregar columnas directamente...\n');
    } else if (columns && Array.isArray(columns) && columns.length > 0) {
      console.log('✅ Las columnas ya existen:');
      columns.forEach((col: any) => console.log(`   - ${col.column_name}`));
      console.log('\n✨ No se necesita hacer nada');
      return;
    }

    // Agregar las columnas usando SQL directo
    // Nota: Supabase JS client no tiene un método directo para ALTER TABLE,
    // así que necesitamos usar la API de administración o el dashboard

    console.log('📋 Instrucciones para agregar las columnas:');
    console.log('\n1. Ve al dashboard de Supabase: https://supabase.com/dashboard');
    console.log('2. Abre el SQL Editor');
    console.log('3. Ejecuta el siguiente SQL:\n');
    console.log('```sql');
    console.log('-- Agregar columnas de coordenadas');
    console.log('ALTER TABLE crm.proyecto');
    console.log('ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION,');
    console.log('ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;');
    console.log('```\n');

    console.log('📄 También puedes copiar el archivo: scripts/add-coordinates-columns.sql\n');

    // Intentar ejecutar directamente (esto podría fallar dependiendo de los permisos)
    console.log('🔄 Intentando ejecutar automáticamente...');

    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE crm.proyecto
        ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;
      `
    });

    if (alterError) {
      console.log('\n⚠️  No se pudo ejecutar automáticamente.');
      console.log('   Error:', alterError.message);
      console.log('\n💡 Por favor, ejecuta el SQL manualmente en el dashboard de Supabase.');
    } else {
      console.log('\n✅ Columnas agregadas exitosamente!');

      // Verificar
      const { data: verification } = await supabase
        .from('proyecto')
        .select('latitud, longitud')
        .limit(1);

      if (verification) {
        console.log('✅ Verificación exitosa - las columnas están disponibles');
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\n💡 Por favor, ejecuta el SQL manualmente en el dashboard de Supabase:');
    console.log('\nALTER TABLE crm.proyecto');
    console.log('ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION,');
    console.log('ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION;');
  }
}

// Ejecutar
addCoordinatesColumns().catch(console.error);
