#!/usr/bin/env tsx
// Script para actualizar datos de ubicaciones del INEI
// Uso: npm run update-ubigeo

import { ineiUbigeoService } from '../lib/services/inei-ubigeo';

async function main() {
  console.log('🔄 Iniciando actualización de datos de ubicaciones del INEI...');
  
  try {
    const startTime = Date.now();
    
    // Forzar actualización
    const data = await ineiUbigeoService.updateUbigeoData();
    
    // Mostrar estadísticas
    const stats = ineiUbigeoService.getDataStats(data);
    const duration = Date.now() - startTime;
    
    console.log('✅ Datos actualizados exitosamente!');
    console.log(`📊 Estadísticas:`);
    console.log(`   - Departamentos: ${stats.departamentos}`);
    console.log(`   - Provincias: ${stats.provincias}`);
    console.log(`   - Distritos: ${stats.distritos}`);
    console.log(`⏱️  Tiempo de procesamiento: ${duration}ms`);
    
    // Mostrar algunos ejemplos
    console.log('\n📋 Ejemplos de datos:');
    data.departamentos.slice(0, 3).forEach(dept => {
      console.log(`   ${dept.nombre} (${dept.codigo}):`);
      dept.provincias.slice(0, 2).forEach(prov => {
        console.log(`     - ${prov.nombre} (${prov.codigo}): ${prov.distritos.length} distritos`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error actualizando datos:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

export { main as updateUbigeoData };
