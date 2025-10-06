#!/usr/bin/env node

/**
 * Script para verificar el estado actual del schema de agenda
 * y detectar discrepancias con el código
 */

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  console.error('Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en tu .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verificarSchema() {
  try {
    console.log('🔍 Verificando estado actual del schema de agenda...\n');

    // 1. Verificar estructura de la tabla evento
    console.log('📋 Verificando tabla crm.evento...');
    
    const { data: columnas, error: columnasError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'crm')
      .eq('table_name', 'evento')
      .order('ordinal_position');

    if (columnasError) {
      console.error('❌ Error obteniendo columnas:', columnasError);
      return;
    }

    console.log('✅ Columnas encontradas en crm.evento:');
    columnas.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`  - ${col.column_name}: ${col.data_type} (${nullable})${defaultVal}`);
    });

    // 2. Verificar campos críticos que el código necesita
    console.log('\n🔍 Verificando campos críticos...');
    
    const camposCriticos = [
      'oportunidad_id',
      'objetivo', 
      'resultado_id',
      'resultado_notas',
      'proximo_paso_objetivo',
      'proximo_paso_fecha',
      'sla_tipo',
      'sla_vencimiento',
      'recordatorio_canal',
      'snooze_motivo_id',
      'snooze_hasta'
    ];

    const camposFaltantes = [];
    const camposExistentes = [];

    camposCriticos.forEach(campo => {
      const existe = columnas.some(col => col.column_name === campo);
      if (existe) {
        camposExistentes.push(campo);
        console.log(`✅ ${campo} - EXISTE`);
      } else {
        camposFaltantes.push(campo);
        console.log(`❌ ${campo} - FALTA`);
      }
    });

    // 3. Verificar constraints de estado
    console.log('\n🔍 Verificando constraints de estado...');
    
    const { data: constraints, error: constraintsError } = await supabase
      .from('information_schema.check_constraints')
      .select('constraint_name, check_clause')
      .eq('constraint_schema', 'crm')
      .like('constraint_name', '%evento%estado%');

    if (constraintsError) {
      console.log('⚠️  No se pudo verificar constraints de estado');
    } else {
      constraints.forEach(constraint => {
        console.log(`📋 Constraint: ${constraint.constraint_name}`);
        console.log(`   ${constraint.check_clause}`);
      });
    }

    // 4. Verificar tablas relacionadas
    console.log('\n🔍 Verificando tablas relacionadas...');
    
    const tablasRelacionadas = [
      'evento_snooze_motivo',
      'evento_resultado_catalogo',
      'notificacion',
      'oportunidad',
      'cliente',
      'propiedad'
    ];

    for (const tabla of tablasRelacionadas) {
      const { data: tablaData, error: tablaError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'crm')
        .eq('table_name', tabla)
        .single();

      if (tablaError) {
        console.log(`❌ Tabla crm.${tabla} - NO EXISTE`);
      } else {
        console.log(`✅ Tabla crm.${tabla} - EXISTE (${tablaData.table_type})`);
      }
    }

    // 5. Verificar índices
    console.log('\n🔍 Verificando índices...');
    
    const { data: indices, error: indicesError } = await supabase
      .from('pg_indexes')
      .select('indexname, tablename, indexdef')
      .eq('schemaname', 'crm')
      .eq('tablename', 'evento');

    if (indicesError) {
      console.log('⚠️  No se pudo verificar índices');
    } else {
      console.log('📊 Índices en crm.evento:');
      indices.forEach(idx => {
        console.log(`  - ${idx.indexname}: ${idx.indexdef.split('(')[1]?.split(')')[0] || 'N/A'}`);
      });
    }

    // 6. Verificar triggers
    console.log('\n🔍 Verificando triggers...');
    
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_timing, action_statement')
      .eq('event_object_schema', 'crm')
      .eq('event_object_table', 'evento');

    if (triggersError) {
      console.log('⚠️  No se pudo verificar triggers');
    } else {
      console.log('⚡ Triggers en crm.evento:');
      triggers.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name}: ${trigger.action_timing} ${trigger.event_manipulation}`);
      });
    }

    // 7. Resumen y recomendaciones
    console.log('\n📊 RESUMEN:');
    console.log(`✅ Campos existentes: ${camposExistentes.length}/${camposCriticos.length}`);
    console.log(`❌ Campos faltantes: ${camposFaltantes.length}`);
    
    if (camposFaltantes.length > 0) {
      console.log('\n🚨 ACCIÓN REQUERIDA:');
      console.log('El schema actual NO está alineado con el código.');
      console.log('Campos faltantes:');
      camposFaltantes.forEach(campo => console.log(`  - ${campo}`));
      console.log('\n💡 SOLUCIÓN:');
      console.log('Ejecuta: node aplicar_migracion_agenda_schema.js');
    } else {
      console.log('\n✅ El schema está alineado con el código.');
    }

    // 8. Verificar datos de prueba
    console.log('\n🔍 Verificando datos de prueba...');
    
    const { data: eventos, error: eventosError } = await supabase
      .from('evento')
      .select('id, titulo, tipo, estado, created_at')
      .limit(5);

    if (eventosError) {
      console.log('⚠️  No se pudo verificar datos de eventos');
    } else {
      console.log(`📊 Eventos encontrados: ${eventos.length}`);
      if (eventos.length > 0) {
        console.log('📋 Últimos eventos:');
        eventos.forEach(evento => {
          console.log(`  - ${evento.titulo} (${evento.tipo}) - ${evento.estado}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    process.exit(1);
  }
}

// Ejecutar verificación
verificarSchema();

