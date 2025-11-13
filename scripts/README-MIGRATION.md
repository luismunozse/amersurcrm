# Migración de Coordenadas: Normalizadas → Reales

## 📋 Contexto

El sistema anteriormente usaba dos formatos de coordenadas:

- **Coordenadas normalizadas** (0-1): Valores relativos al bounds del plano
- **Coordenadas reales** (lat/lng): Valores absolutos de Google Maps

Esto causaba:
- ❌ Complejidad innecesaria en el código
- ❌ Bugs al mover o rotar planos
- ❌ Dificultad para mantener el sistema

## ✅ Solución: Usar SOLO coordenadas reales

Migrar todos los datos a coordenadas reales (lat/lng) y eliminar la lógica de conversión.

---

## 🔧 Proceso de Migración

### Paso 1: Auditar datos actuales

```bash
npx tsx scripts/audit-lotes-coordinates.ts
```

Esto genera un reporte mostrando:
- Cuántos lotes tienen coordenadas normalizadas
- Cuántos tienen coordenadas reales
- Qué proyectos necesitan migración

### Paso 2: Hacer backup de la base de datos

**CRÍTICO**: Antes de migrar, haz un backup completo de Supabase.

```bash
# En Supabase Dashboard:
# Settings → Database → Backup → Create backup
```

### Paso 3: Ejecutar migración en modo prueba (DRY RUN)

```bash
npx tsx scripts/migrate-coordinates.ts --dry-run
```

Esto muestra qué cambios se harían SIN modificar la base de datos.

### Paso 4: Ejecutar migración real

Una vez revisado el dry-run:

```bash
# Migrar todos los proyectos
npx tsx scripts/migrate-coordinates.ts

# O migrar un proyecto específico
npx tsx scripts/migrate-coordinates.ts --proyecto=UUID-DEL-PROYECTO
```

### Paso 5: Verificar migración

```bash
npx tsx scripts/audit-lotes-coordinates.ts
```

Debe mostrar: "✅ PERFECTO: Todas las coordenadas están en formato real"

### Paso 6: Actualizar código (eliminar normalización)

Una vez migrados los datos, se puede eliminar el código de desnormalización:

**Archivos a actualizar:**
- `GoogleMap.tsx` - Eliminar `isNormalizedPair`, `denormalizePair`, `denormalizePolygon`
- `_MapeoLotesMejorado.tsx` - Eliminar `convertLegacyPoint`, `denormalizeLote`

---

## 📊 Estructura de Datos

### ANTES (Sistema mixto)

```typescript
interface Lote {
  id: string;
  codigo: string;
  plano_poligono?: [number, number][];  // ⚠️ Podía ser normalizado O real
}

// Coordenadas normalizadas (legacy)
plano_poligono: [[0.5, 0.5], [0.6, 0.6]]  // Relativo al bounds

// Coordenadas reales
plano_poligono: [[-12.0464, -77.0428], [-12.0465, -77.0429]]  // Lat/Lng
```

### DESPUÉS (Sistema simplificado)

```typescript
interface Lote {
  id: string;
  codigo: string;
  plano_poligono?: [number, number][];  // ✅ SIEMPRE lat/lng reales
}

// TODAS las coordenadas son reales
plano_poligono: [[-12.0464, -77.0428], [-12.0465, -77.0429]]
```

---

## 🚀 Mejoras Post-Migración

Una vez eliminado el código de normalización:

### 1. Código más simple
- 200+ líneas de código menos
- Sin lógica de detección/conversión
- Más fácil de mantener

### 2. Menos bugs
- No más desalineaciones al rotar plano
- No más coordenadas "mixtas" (corrupción de datos)
- Comportamiento predecible

### 3. Performance
- Sin conversiones en cada render
- Menos cálculos matemáticos
- Carga más rápida del mapa

### 4. Extensibilidad futura
- Fácil agregar nuevas features
- Compatible con APIs de mapas
- Preparado para Fase 3 (sistema PIN-primero)

---

## 🔄 Rollback (si algo sale mal)

Si necesitas revertir la migración:

1. Restaurar backup de Supabase
2. Revertir cambios en código con git:
   ```bash
   git checkout main -- src/app/dashboard/proyectos/[id]/GoogleMap.tsx
   git checkout main -- src/app/dashboard/proyectos/[id]/_MapeoLotesMejorado.tsx
   ```

---

## 📝 Checklist

- [ ] Ejecutar auditoría inicial
- [ ] Hacer backup de base de datos
- [ ] Ejecutar migración en dry-run
- [ ] Revisar output del dry-run
- [ ] Ejecutar migración real
- [ ] Verificar con auditoría final
- [ ] Actualizar código (eliminar normalización)
- [ ] Probar en desarrollo
- [ ] Probar en producción
- [ ] Actualizar documentación

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si un proyecto no tiene bounds definidos?

Se omite automáticamente. Solo se migran proyectos con `overlay_bounds` configurados.

### ¿Se pierden datos durante la migración?

No. Los datos se convierten matemáticamente de un formato a otro. La ubicación física no cambia.

### ¿Puedo ejecutar la migración múltiples veces?

Sí. El script detecta qué lotes ya están en formato real y los omite.

### ¿Cuánto tiempo toma?

Depende del número de lotes. Aproximadamente 1 segundo por cada 50 lotes.

---

## 📞 Soporte

Si encuentras problemas durante la migración:

1. Revisa los logs del script
2. Ejecuta la auditoría para diagnosticar
3. Consulta el archivo `audit-report.json`
4. Si persiste, restaura el backup y consulta al equipo
