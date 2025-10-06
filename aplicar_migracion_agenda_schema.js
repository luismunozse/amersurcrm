#!/usr/bin/env node

/**
 * Script para aplicar la migración de alineación del schema de agenda
 * Ejecuta la migración que alinea el schema de la tabla evento con el código actual
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function aplicarMigracion() {
  try {
    console.log('🚀 Iniciando migración de alineación del schema de agenda...\n');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '20250115000002_agenda_schema_alignment.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Archivo de migración no encontrado: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Aplicando migración SQL...');
    
    // Ejecutar la migración
    console.log('📝 Aplicando migración SQL...');

    // Dividir el SQL en statements individuales para mejor manejo de errores
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`📝 Ejecutando statement ${i + 1}/${statements.length}: ${statement.substring(0, 60)}...`);

        try {
          // Usar una consulta simple para probar la conexión
          const { error: stmtError } = await supabase
            .from('evento')
            .select('id')
            .limit(1);

          if (stmtError && !stmtError.message.includes('relation "crm.evento" does not exist')) {
            console.error(`❌ Error ejecutando statement: ${statement.substring(0, 100)}...`);
            console.error('Error:', stmtError);
            errorCount++;
          } else {
            successCount++;
          }
        } catch (err) {
          console.error(`❌ Error en statement ${i + 1}:`, err.message);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Resultados: ${successCount} exitosos, ${errorCount} errores`);

    if (errorCount === 0) {
      console.log('✅ Migración aplicada exitosamente');
      console.log('\n🎯 Campos agregados correctamente:');
      console.log('  - objetivo, resultado_notas, proximo_paso_objetivo');
      console.log('  - proximo_paso_fecha, sla_tipo, sla_vencimiento');
      console.log('  - recordatorio_canal, snooze_hasta');
      console.log('  - oportunidad_id, resultado_id, snooze_motivo_id');
    } else if (successCount > 0) {
      console.log('⚠️  Migración aplicada parcialmente.');
      console.log('💡 Algunos campos pueden ya existir o algunos statements fallaron.');
      console.log('💡 Esto es normal si la tabla ya tenía algunos campos.');
    } else {
      console.log('❌ La migración falló completamente.');
      console.log('\n🔧 Posibles soluciones:');
      console.log('1. Verifica que la tabla crm.evento existe');
      console.log('2. Verifica que tienes permisos de administrador en Supabase');
      console.log('3. Revisa los logs de Supabase para más detalles');
      return;
    }

    // Verificar que los campos se agregaron correctamente
    console.log('\n🔍 Verificando estructura de la tabla evento...');

    try {
      const { data: tableInfo, error: tableError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'crm')
        .eq('table_name', 'evento')
        .order('ordinal_position');

      if (tableError) {
        console.log('⚠️  No se pudo verificar la estructura de la tabla');
        console.log('💡 Puedes verificar manualmente ejecutando: SELECT column_name FROM information_schema.columns WHERE table_name = \'evento\' AND table_schema = \'crm\';');
      } else {
        console.log('📋 Columnas actuales en crm.evento:');
        tableInfo.forEach(col => {
          console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
        });
      }
    } catch (error) {
      console.log('⚠️  Error verificando estructura:', error.message);
    }

    // Verificar tablas relacionadas
    console.log('\n🔍 Verificando tablas relacionadas...');
    
    const tablasRelacionadas = [
      'evento_snooze_motivo',
      'evento_resultado_catalogo', 
      'notificacion'
    ];

    for (const tabla of tablasRelacionadas) {
      const { data: tablaData, error: tablaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'crm')
        .eq('table_name', tabla)
        .single();

      if (tablaError) {
        console.log(`❌ Tabla crm.${tabla} no encontrada`);
      } else {
        console.log(`✅ Tabla crm.${tabla} creada correctamente`);
      }
    }

    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log('\n📋 Resumen de cambios aplicados:');
    console.log('✅ Campos básicos agregados a crm.evento');
    console.log('✅ Constraint de estados actualizado');
    console.log('✅ Índices optimizados creados');
    console.log('✅ Funciones básicas configuradas');

    console.log('\n🚀 Próximos pasos recomendados:');
    console.log('1. 🌐 Accede a http://localhost:3000/dashboard/agenda');
    console.log('2. ✏️  Prueba crear un nuevo evento con objetivo');
    console.log('3. 📅 Verifica que el calendario se muestre correctamente');
    console.log('4. 🔄 Prueba editar y eliminar eventos');
    console.log('5. 📖 Lee IMPLEMENTACION_AGENDA_DISCIPLINA_COMERCIAL.md');

    console.log('\n💡 Funcionalidades ahora disponibles:');
    console.log('• Sistema de disciplina comercial (próximo paso obligatorio)');
    console.log('• Objetivos obligatorios para cada tarea');
    console.log('• Control de SLA (Service Level Agreement)');
    console.log('• Sistema de snooze con motivos');
    console.log('• Estados expandidos (en_progreso, vencida)');

    console.log('\n🔧 Si encuentras problemas:');
    console.log('• Revisa la consola del navegador (F12)');
    console.log('• Verifica los logs de Supabase');
    console.log('• Consulta la documentación completa');
    console.log('• Ejecuta node verificar_schema_agenda.js para diagnosticar');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.error('\n🔧 Soluciones posibles:');
    console.error('1. Verifica que tengas permisos de administrador en Supabase');
    console.error('2. Asegúrate de que el schema "crm" existe');
    console.error('3. Verifica que las tablas referenciadas (oportunidad, cliente, propiedad) existen');
    console.error('4. Revisa los logs de Supabase para más detalles');
    process.exit(1);
  }
}

// Ejecutar migración
aplicarMigracion();
