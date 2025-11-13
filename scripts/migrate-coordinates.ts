/**
 * Script de migración: Coordenadas normalizadas → Coordenadas reales
 *
 * Convierte todas las coordenadas normalizadas (0-1) a coordenadas
 * reales (lat/lng) basándose en los bounds del proyecto.
 *
 * IMPORTANTE: Hacer backup de la BD antes de ejecutar!
 *
 * Uso:
 * npx tsx scripts/migrate-coordinates.ts [--dry-run] [--proyecto=ID]
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const NORMALIZED_MIN = -0.0001;
const NORMALIZED_MAX = 1.0001;

// Parsear argumentos
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const proyectoFilter = args.find(arg => arg.startsWith('--proyecto='))?.split('=')[1];

function isNormalizedCoordinate(value: number): boolean {
  return value >= NORMALIZED_MIN && value <= NORMALIZED_MAX;
}

function isNormalizedPair([lat, lng]: [number, number]): boolean {
  return isNormalizedCoordinate(lat) && isNormalizedCoordinate(lng);
}

function denormalizeCoordinate(
  normalizedValue: number,
  min: number,
  max: number
): number {
  return min + normalizedValue * (max - min);
}

function denormalizePair(
  [lat, lng]: [number, number],
  bounds: [[number, number], [number, number]]
): [number, number] {
  const [[swLat, swLng], [neLat, neLng]] = bounds;
  const realLat = denormalizeCoordinate(lat, swLat, neLat);
  const realLng = denormalizeCoordinate(lng, swLng, neLng);
  return [realLat, realLng];
}

function parseOverlayBounds(value: any): [[number, number], [number, number]] | null {
  if (!value) return null;

  // Si es string, intentar parsear JSON
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  // Manejar diferentes formatos
  if (Array.isArray(value) && value.length === 2) {
    // Formato: [[swLat, swLng], [neLat, neLng]]
    if (Array.isArray(value[0]) && Array.isArray(value[1])) {
      return value as [[number, number], [number, number]];
    }
  }

  if (typeof value === 'object') {
    // Formato: {sw: [lat, lng], ne: [lat, lng]}
    if (value.sw && value.ne) {
      return [value.sw, value.ne];
    }
    // Formato: {southWest: [lat, lng], northEast: [lat, lng]}
    if (value.southWest && value.northEast) {
      return [value.southWest, value.northEast];
    }
    // Formato: {bounds: [...]}
    if (value.bounds) {
      return parseOverlayBounds(value.bounds);
    }
  }

  return null;
}

async function migrateProyecto(proyectoId: string, proyectoNombre: string) {
  console.log(`\n📦 Procesando proyecto: ${proyectoNombre}`);

  // Obtener bounds del proyecto
  const { data: proyecto, error: proyectoError } = await supabase
    .schema('crm')
    .from('proyecto')
    .select('overlay_bounds')
    .eq('id', proyectoId)
    .single();

  if (proyectoError || !proyecto) {
    console.log(`   ⚠️  No se pudo obtener el proyecto`);
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  const overlayBounds = parseOverlayBounds(proyecto.overlay_bounds);

  if (!overlayBounds) {
    console.log(`   ⚠️  Proyecto sin bounds definidos - omitiendo`);
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  console.log(`   Bounds: SW[${overlayBounds[0].join(', ')}] NE[${overlayBounds[1].join(', ')}]`);

  // Obtener lotes del proyecto
  const { data: lotes, error: lotesError } = await supabase
    .schema('crm')
    .from('lote')
    .select('id, codigo, plano_poligono')
    .eq('proyecto_id', proyectoId);

  if (lotesError || !lotes) {
    console.log(`   ❌ Error obteniendo lotes: ${lotesError?.message}`);
    return { migrated: 0, skipped: 0, errors: 0 };
  }

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const lote of lotes) {
    const poligono = lote.plano_poligono as [number, number][] | null;

    if (!poligono || poligono.length === 0) {
      skipped++;
      continue;
    }

    // Verificar si tiene coordenadas normalizadas
    const needsMigration = poligono.some(pair => isNormalizedPair(pair));

    if (!needsMigration) {
      skipped++;
      continue;
    }

    // Convertir coordenadas normalizadas a reales
    const convertedPolygon = poligono.map(pair => {
      if (isNormalizedPair(pair)) {
        return denormalizePair(pair, overlayBounds);
      }
      return pair;
    });

    console.log(`   🔄 Lote ${lote.codigo}:`);
    console.log(`      Antes: [${poligono[0].join(', ')}]`);
    console.log(`      Después: [${convertedPolygon[0].join(', ')}]`);

    if (!isDryRun) {
      const { error: updateError } = await supabase
        .schema('crm')
        .from('lote')
        .update({
          plano_poligono: convertedPolygon,
          updated_at: new Date().toISOString()
        })
        .eq('id', lote.id);

      if (updateError) {
        console.log(`      ❌ Error actualizando: ${updateError.message}`);
        errors++;
      } else {
        console.log(`      ✅ Migrado exitosamente`);
        migrated++;
      }
    } else {
      console.log(`      🔍 [DRY RUN] Se migraría`);
      migrated++;
    }
  }

  console.log(`   📊 Resultado: ${migrated} migrados, ${skipped} omitidos, ${errors} errores`);

  return { migrated, skipped, errors };
}

async function migrate() {
  console.log('🚀 Iniciando migración de coordenadas');
  console.log(`   Modo: ${isDryRun ? '🔍 DRY RUN (no se harán cambios)' : '✍️  ESCRITURA REAL'}`);

  if (!isDryRun) {
    console.log('\n⚠️  ADVERTENCIA: Se modificarán datos en la base de datos');
    console.log('   Asegúrate de tener un backup antes de continuar');
    console.log('   Presiona Ctrl+C para cancelar...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  // Obtener proyectos
  let query = supabase
    .schema('crm')
    .from('proyecto')
    .select('id, nombre')
    .order('nombre');

  if (proyectoFilter) {
    query = query.eq('id', proyectoFilter);
  }

  const { data: proyectos, error } = await query;

  if (error || !proyectos || proyectos.length === 0) {
    console.error('❌ No se pudieron obtener proyectos');
    process.exit(1);
  }

  console.log(`\n📂 Procesando ${proyectos.length} proyecto(s)...\n`);

  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const proyecto of proyectos) {
    const result = await migrateProyecto(proyecto.id, proyecto.nombre);
    totalMigrated += result.migrated;
    totalSkipped += result.skipped;
    totalErrors += result.errors;
  }

  console.log('\n✅ MIGRACIÓN COMPLETADA\n');
  console.log(`📊 Resumen final:`);
  console.log(`   ✅ Lotes migrados: ${totalMigrated}`);
  console.log(`   ⏭️  Lotes omitidos: ${totalSkipped}`);
  console.log(`   ❌ Errores: ${totalErrors}`);

  if (isDryRun) {
    console.log('\n🔍 Esto fue un DRY RUN. Ejecuta sin --dry-run para aplicar cambios.');
  }

  if (totalMigrated > 0 && !isDryRun) {
    console.log('\n💡 Siguiente paso: Ejecuta el script de auditoría para verificar:');
    console.log('   npx tsx scripts/audit-lotes-coordinates.ts');
  }
}

migrate().catch(console.error);
