#!/usr/bin/env node

/**
 * Script para aplicar la migración que corrige las políticas RLS de DELETE en la tabla cliente
 * Permite que admins eliminen cualquier cliente
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Crear cliente de Supabase con service role (bypass RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🔧 Aplicando migración para corregir RLS DELETE en tabla cliente...\n');

  // Leer el archivo de migración
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250126000001_fix_cliente_delete_rls.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ No se encontró el archivo de migración:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migración a aplicar:');
  console.log('─'.repeat(80));
  console.log(sql);
  console.log('─'.repeat(80));
  console.log('');

  try {
    // Ejecutar la migración usando rpc
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Si exec_sql no existe, intentar ejecutar directamente
      console.log('⚠️  exec_sql no disponible, ejecutando con método alternativo...\n');

      // Dividir el SQL en statements individuales
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.toLowerCase().includes('drop policy')) {
          console.log('🗑️  Eliminando política antigua...');
        } else if (statement.toLowerCase().includes('create policy')) {
          console.log('✨ Creando nueva política...');
        } else if (statement.toLowerCase().includes('select')) {
          console.log('📊 Verificando políticas...');
        }

        // Ejecutar cada statement
        const { error: execError } = await supabase.rpc('exec', { sql: statement });
        if (execError) {
          console.error('❌ Error ejecutando statement:', execError.message);
          throw execError;
        }
      }
    }

    console.log('✅ Migración aplicada exitosamente!\n');
    console.log('📋 Cambios realizados:');
    console.log('  • Eliminada política restrictiva "delete_own"');
    console.log('  • Creada política "cliente_delete_admin_or_owner"');
    console.log('  • Los admins ahora pueden eliminar cualquier cliente');
    console.log('  • Los usuarios pueden eliminar clientes que ellos crearon\n');

    // Verificar las políticas actuales
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, qual')
      .eq('schemaname', 'crm')
      .eq('tablename', 'cliente');

    if (!policiesError && policies) {
      console.log('🔍 Políticas actuales en la tabla cliente:');
      policies.forEach(policy => {
        console.log(`  • ${policy.policyname} (${policy.cmd})`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error aplicando la migración:', error.message);
    console.error('\n⚠️  SOLUCIÓN MANUAL:');
    console.error('Por favor, ejecuta el siguiente SQL directamente en el SQL Editor de Supabase:\n');
    console.error('─'.repeat(80));
    console.error(sql);
    console.error('─'.repeat(80));
    console.error('\nPuedes acceder al SQL Editor en:');
    console.error(`${supabaseUrl.replace('.supabase.co', '')}.supabase.co/project/${supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)[1]}/sql/new\n`);
    process.exit(1);
  }
}

applyMigration();
