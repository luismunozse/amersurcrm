/**
 * Script de auditoría para revisar las coordenadas de lotes
 *
 * Identifica:
 * - Lotes con coordenadas normalizadas (0-1)
 * - Lotes con coordenadas reales (lat/lng)
 * - Lotes sin ubicación
 *
 * Uso:
 * npx tsx scripts/audit-lotes-coordinates.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

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

function isNormalizedCoordinate(value: number): boolean {
  return value >= NORMALIZED_MIN && value <= NORMALIZED_MAX;
}

function analyzePolygon(polygon: [number, number][] | null): {
  type: 'empty' | 'normalized' | 'real' | 'mixed';
  pointCount: number;
} {
  if (!polygon || polygon.length === 0) {
    return { type: 'empty', pointCount: 0 };
  }

  let normalizedCount = 0;
  let realCount = 0;

  for (const [lat, lng] of polygon) {
    if (isNormalizedCoordinate(lat) && isNormalizedCoordinate(lng)) {
      normalizedCount++;
    } else {
      realCount++;
    }
  }

  if (normalizedCount === polygon.length) {
    return { type: 'normalized', pointCount: polygon.length };
  } else if (realCount === polygon.length) {
    return { type: 'real', pointCount: polygon.length };
  } else if (normalizedCount > 0 && realCount > 0) {
    return { type: 'mixed', pointCount: polygon.length };
  }

  return { type: 'empty', pointCount: 0 };
}

async function auditLotes() {
  console.log('🔍 Auditando coordenadas de lotes...\n');

  // Obtener todos los lotes con sus proyectos
  const { data: lotes, error } = await supabase
    .schema('crm')
    .from('lote')
    .select('id, codigo, proyecto_id, plano_poligono, proyecto:proyecto_id(nombre)')
    .order('proyecto_id');

  if (error) {
    console.error('❌ Error obteniendo lotes:', error.message);
    process.exit(1);
  }

  if (!lotes || lotes.length === 0) {
    console.log('📭 No hay lotes en la base de datos');
    return;
  }

  // Estadísticas globales
  let totalLotes = lotes.length;
  let lotesVacios = 0;
  let lotesNormalizados = 0;
  let lotesReales = 0;
  let lotesMixtos = 0;
  let lotesConPin = 0; // Un solo punto
  let lotesConPoligono = 0; // 3+ puntos

  // Agrupar por proyecto
  const proyectos = new Map<string, {
    nombre: string;
    lotes: typeof lotes;
    stats: {
      empty: number;
      normalized: number;
      real: number;
      mixed: number;
    };
  }>();

  for (const lote of lotes) {
    const proyectoId = lote.proyecto_id;
    const proyectoNombre = (lote.proyecto as any)?.nombre || 'Sin nombre';

    if (!proyectos.has(proyectoId)) {
      proyectos.set(proyectoId, {
        nombre: proyectoNombre,
        lotes: [],
        stats: { empty: 0, normalized: 0, real: 0, mixed: 0 }
      });
    }

    const proyecto = proyectos.get(proyectoId)!;
    proyecto.lotes.push(lote);

    const analysis = analyzePolygon(lote.plano_poligono as [number, number][] | null);

    // Actualizar estadísticas del proyecto
    proyecto.stats[analysis.type]++;

    // Actualizar estadísticas globales
    switch (analysis.type) {
      case 'empty':
        lotesVacios++;
        break;
      case 'normalized':
        lotesNormalizados++;
        break;
      case 'real':
        lotesReales++;
        break;
      case 'mixed':
        lotesMixtos++;
        break;
    }

    // Contar pins vs polígonos
    if (analysis.pointCount === 1) {
      lotesConPin++;
    } else if (analysis.pointCount >= 3) {
      lotesConPoligono++;
    }
  }

  // Mostrar resumen global
  console.log('📊 RESUMEN GLOBAL\n');
  console.log(`Total de lotes: ${totalLotes}`);
  console.log(`├─ Sin ubicación: ${lotesVacios} (${((lotesVacios/totalLotes)*100).toFixed(1)}%)`);
  console.log(`├─ Coordenadas NORMALIZADAS (0-1): ${lotesNormalizados} (${((lotesNormalizados/totalLotes)*100).toFixed(1)}%)`);
  console.log(`├─ Coordenadas REALES (lat/lng): ${lotesReales} (${((lotesReales/totalLotes)*100).toFixed(1)}%)`);
  console.log(`└─ Mixtos (problema): ${lotesMixtos} (${((lotesMixtos/totalLotes)*100).toFixed(1)}%)`);
  console.log('');
  console.log(`Tipos de ubicación:`);
  console.log(`├─ Con PIN (1 punto): ${lotesConPin}`);
  console.log(`└─ Con POLÍGONO (3+ puntos): ${lotesConPoligono}`);
  console.log('\n');

  // Mostrar detalle por proyecto
  console.log('📂 DETALLE POR PROYECTO\n');

  for (const [proyectoId, proyecto] of proyectos) {
    const total = proyecto.lotes.length;
    const { empty, normalized, real, mixed } = proyecto.stats;

    console.log(`🏗️  ${proyecto.nombre} (${total} lotes)`);
    console.log(`   ├─ Sin ubicación: ${empty}`);
    console.log(`   ├─ Normalizadas: ${normalized}`);
    console.log(`   ├─ Reales: ${real}`);
    console.log(`   └─ Mixtas: ${mixed}`);

    // Si hay coordenadas normalizadas, mostrar ejemplos
    if (normalized > 0) {
      console.log(`   ⚠️  REQUIERE MIGRACIÓN - Ejemplos:`);
      const ejemplos = proyecto.lotes
        .filter(l => analyzePolygon(l.plano_poligono as [number, number][] | null).type === 'normalized')
        .slice(0, 3);

      for (const lote of ejemplos) {
        const coords = (lote.plano_poligono as [number, number][])?.[0];
        if (coords) {
          console.log(`      • Lote ${lote.codigo}: [${coords[0]}, ${coords[1]}]`);
        }
      }
    }
    console.log('');
  }

  // Recomendaciones
  console.log('\n💡 RECOMENDACIONES\n');

  if (lotesNormalizados > 0) {
    console.log('🔴 CRÍTICO: Hay lotes con coordenadas normalizadas');
    console.log('   → Ejecuta el script de migración: npm run migrate:coordinates');
    console.log('');
  }

  if (lotesMixtos > 0) {
    console.log('🟠 ADVERTENCIA: Hay lotes con coordenadas mixtas (datos corruptos)');
    console.log('   → Revisa manualmente estos lotes en la base de datos');
    console.log('');
  }

  if (lotesReales === (totalLotes - lotesVacios)) {
    console.log('✅ PERFECTO: Todas las coordenadas están en formato real (lat/lng)');
    console.log('   → Puedes proceder a eliminar el código de desnormalización');
    console.log('');
  }

  // Guardar reporte en archivo
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: totalLotes,
      empty: lotesVacios,
      normalized: lotesNormalizados,
      real: lotesReales,
      mixed: lotesMixtos,
      withPin: lotesConPin,
      withPolygon: lotesConPoligono
    },
    projects: Array.from(proyectos.entries()).map(([id, data]) => ({
      id,
      name: data.nombre,
      total: data.lotes.length,
      stats: data.stats
    }))
  };

  console.log('\n📄 Reporte guardado en: audit-report.json');
  fs.writeFileSync('audit-report.json', JSON.stringify(report, null, 2), 'utf-8');
}

// Ejecutar auditoría
auditLotes().catch(console.error);
