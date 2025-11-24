# Guía de Full-Text Search con PostgreSQL

Esta guía explica cómo configurar y usar la búsqueda de texto completo (Full-Text Search) en el CRM usando las capacidades nativas de PostgreSQL.

## 📋 Índice

1. [¿Qué es Full-Text Search?](#qué-es-full-text-search)
2. [Beneficios](#beneficios)
3. [Instalación](#instalación)
4. [Uso Básico](#uso-básico)
5. [Ejemplos Avanzados](#ejemplos-avanzados)
6. [Mantenimiento](#mantenimiento)
7. [Troubleshooting](#troubleshooting)

---

## ¿Qué es Full-Text Search?

Full-Text Search (FTS) es una técnica de búsqueda que permite encontrar documentos/registros que contienen palabras específicas, con capacidades avanzadas como:

- **Stemming**: Búsqueda de raíces de palabras (ej: "construir" encuentra "construcción", "construido")
- **Ranking**: Resultados ordenados por relevancia
- **Búsqueda de frases**: Búsqueda de palabras específicas en orden
- **Eliminación de palabras comunes**: Ignora palabras como "el", "la", "de", etc.
- **Búsqueda en español**: Soporte nativo para el idioma español

### Comparación: ILIKE vs Full-Text Search

| Característica | ILIKE | Full-Text Search |
|----------------|-------|------------------|
| Velocidad con grandes datasets | Lenta (scan completo) | Rápida (índices GIN) |
| Búsqueda exacta de substring | ✅ Sí | ❌ No (busca palabras) |
| Stemming (raíces de palabras) | ❌ No | ✅ Sí |
| Ranking de relevancia | ❌ No | ✅ Sí |
| Búsqueda de frases | ⚠️ Limitado | ✅ Completo |
| Soporte multiidioma | ❌ No | ✅ Sí |

---

## Beneficios

### 🚀 Rendimiento

- **10-100x más rápido** que ILIKE en tablas grandes (>10,000 registros)
- Índices GIN optimizados para búsqueda de texto
- Menor uso de CPU en búsquedas complejas

### 🎯 Precisión

- Encuentra resultados relevantes incluso con variaciones ortográficas
- Ranking automático por relevancia
- Soporte para búsqueda en español con acentos

### 🔍 Funcionalidades

- Búsqueda de múltiples palabras: `"lote playa"`
- Búsqueda de frases exactas: `"\"manzana A\""`
- Operadores booleanos: `"residencial AND playa"`
- Exclusión: `"lote -vendido"`

---

## Instalación

### Paso 1: Ejecutar la Migración

```bash
# Opción 1: Usando psql directamente
psql -U postgres -d nombre_base_datos -f migrations/add_fulltext_search.sql

# Opción 2: Usando Supabase CLI
supabase db reset  # Solo si usas Supabase local

# Opción 3: Copiar y pegar en Supabase Dashboard
# 1. Ir a SQL Editor en Supabase Dashboard
# 2. Copiar el contenido de migrations/add_fulltext_search.sql
# 3. Ejecutar
```

### Paso 2: Verificar la Instalación

```typescript
import { isFullTextSearchAvailable } from '@/lib/search/fullTextSearch';

// En un componente de servidor o API route
const isAvailable = await isFullTextSearchAvailable();
console.log('Full-Text Search disponible:', isAvailable);
```

### Paso 3: Verificar Índices

```sql
-- Ejecutar en SQL Editor para verificar que los índices se crearon
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE tablename IN ('proyecto', 'lote')
  AND indexname LIKE '%search%'
ORDER BY tablename, indexname;
```

Deberías ver:
- `proyecto_search_idx` en tabla `proyecto`
- `lote_search_idx` en tabla `lote`

---

## Uso Básico

### 1. Búsqueda de Proyectos

```typescript
import { searchProyectosFullText } from '@/lib/search/fullTextSearch';

// Búsqueda simple
const resultados = await searchProyectosFullText('residencial');

// Búsqueda con opciones
const resultados = await searchProyectosFullText('playa norte', {
  limit: 20,
  offset: 0,
  minRank: 0.1, // Solo resultados con relevancia > 0.1
});

// Resultado incluye ranking
resultados.forEach(proyecto => {
  console.log(`${proyecto.nombre} (relevancia: ${proyecto.rank})`);
});
```

### 2. Búsqueda de Lotes

```typescript
import { searchLotesFullText } from '@/lib/search/fullTextSearch';

const resultados = await searchLotesFullText(
  'proyecto-uuid-aqui',
  'manzana A',
  {
    limit: 50,
    minRank: 0.05,
  }
);
```

### 3. Búsqueda Híbrida (Recomendado)

Usa full-text search cuando está disponible, y fallback a ILIKE si no:

```typescript
import { searchHybrid } from '@/lib/search/fullTextSearch';

// Búsqueda de proyectos
const proyectos = await searchHybrid('residencial', { limit: 20 });

// Búsqueda de lotes
const lotes = await searchHybrid('lote 10', {
  proyectoId: 'uuid-del-proyecto',
  limit: 50,
});
```

---

## Ejemplos Avanzados

### Búsqueda con Múltiples Palabras

```typescript
// Encuentra proyectos que contengan "residencial" Y "playa"
const resultados = await searchProyectosFullText('residencial playa');
```

### Búsqueda de Frases Exactas

```typescript
// Búsqueda de frase exacta usando comillas
const resultados = await searchProyectosFullText('"manzana A"');
```

### Búsqueda con Operadores Booleanos

```typescript
// Buscar "residencial" Y "playa"
const resultados = await searchProyectosFullText('residencial AND playa');

// Buscar "residencial" O "comercial"
const resultados = await searchProyectosFullText('residencial OR comercial');

// Excluir "suspendido"
const resultados = await searchProyectosFullText('proyecto -suspendido');
```

### Sugerencias de Búsqueda (Autocomplete)

```typescript
import { getSearchSuggestions } from '@/lib/search/fullTextSearch';

// Obtener sugerencias mientras el usuario escribe
const sugerencias = await getSearchSuggestions('resi', 'proyecto', 5);
// ['Residencial Costa Azul', 'Residencial Las Palmas', ...]
```

### Integración en Componente de Servidor

```typescript
// app/dashboard/proyectos/page.tsx
import { searchProyectosFullText } from '@/lib/search/fullTextSearch';

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  let proyectos = [];

  if (q && q.trim()) {
    // Usar full-text search si hay query
    proyectos = await searchProyectosFullText(q, { limit: 50 });
  } else {
    // Query normal sin filtros
    const supabase = await createClient();
    const { data } = await supabase
      .from('proyecto')
      .select('*')
      .order('nombre');
    proyectos = data || [];
  }

  return (
    <div>
      {proyectos.map(proyecto => (
        <ProyectoCard key={proyecto.id} proyecto={proyecto} />
      ))}
    </div>
  );
}
```

### Logging de Estadísticas

```typescript
import { logSearchStats, getSearchStats } from '@/lib/search/fullTextSearch';

// Registrar una búsqueda
const resultados = await searchProyectosFullText(query);
logSearchStats(query, resultados.length);

// Obtener estadísticas guardadas
const stats = getSearchStats();
console.log('Búsquedas más comunes:', stats);
```

---

## Mantenimiento

### Actualizar Índices Manualmente

Si agregas/actualizas muchos registros de forma masiva, los índices se actualizan automáticamente gracias a los triggers. Sin embargo, si quieres forzar una actualización:

```sql
-- Actualizar todos los vectores de búsqueda
UPDATE proyecto SET search_vector =
  setweight(to_tsvector('spanish', unaccent(COALESCE(nombre, ''))), 'A') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(ubicacion, ''))), 'B') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(descripcion, ''))), 'C');

UPDATE lote SET search_vector =
  setweight(to_tsvector('spanish', unaccent(COALESCE(codigo, ''))), 'A') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(numero_lote, ''))), 'A');

-- Re-indexar
REINDEX INDEX proyecto_search_idx;
REINDEX INDEX lote_search_idx;
```

### Monitorear Uso de Índices

```sql
-- Ver cuántas veces se han usado los índices
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as total_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE indexname LIKE '%search%';
```

### Optimizar Índices

```sql
-- Analizar tablas para actualizar estadísticas
ANALYZE proyecto;
ANALYZE lote;

-- Vacuum para recuperar espacio
VACUUM ANALYZE proyecto;
VACUUM ANALYZE lote;
```

---

## Troubleshooting

### Problema: "Function search_proyectos does not exist"

**Causa**: La migración no se ejecutó correctamente.

**Solución**:
```bash
# Ejecutar la migración nuevamente
psql -U postgres -d tu_base_datos -f migrations/add_fulltext_search.sql
```

### Problema: Búsquedas lentas

**Causa**: Los índices no se crearon o necesitan optimización.

**Solución**:
```sql
-- Verificar que los índices existen
\d proyecto
\d lote

-- Si no existen, crearlos manualmente
CREATE INDEX proyecto_search_idx ON proyecto USING GIN(search_vector);
CREATE INDEX lote_search_idx ON lote USING GIN(search_vector);

-- Analizar tablas
ANALYZE proyecto;
ANALYZE lote;
```

### Problema: No encuentra resultados esperados

**Causa**: El search_vector no está actualizado.

**Solución**:
```sql
-- Forzar actualización de search_vector
UPDATE proyecto SET updated_at = NOW(); -- Esto activa el trigger
UPDATE lote SET updated_at = NOW();

-- O actualizar manualmente
UPDATE proyecto SET search_vector =
  setweight(to_tsvector('spanish', unaccent(COALESCE(nombre, ''))), 'A') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(ubicacion, ''))), 'B');
```

### Problema: "Extension unaccent does not exist"

**Causa**: La extensión unaccent no está instalada.

**Solución**:
```sql
-- Requiere permisos de superusuario
CREATE EXTENSION unaccent;

-- Si no tienes permisos, contactar al administrador de la base de datos
```

### Problema: Resultados con ranking muy bajo

**Causa**: Las palabras buscadas no están en campos con peso alto.

**Solución**: Ajustar los pesos en la función trigger:

```sql
-- Modificar la función para dar más peso a ciertos campos
CREATE OR REPLACE FUNCTION proyecto_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.nombre, ''))), 'A') ||      -- Peso A (más alto)
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.ubicacion, ''))), 'A') ||   -- Cambiar B -> A
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.descripcion, ''))), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Recursos Adicionales

- [PostgreSQL Full-Text Search Documentation](https://www.postgresql.org/docs/current/textsearch.html)
- [pg_trgm Extension](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Spanish Text Search Configuration](https://www.postgresql.org/docs/current/textsearch-dictionaries.html)

---

## Resumen de Comandos Útiles

```bash
# Instalar migración
psql -U postgres -d db_name -f migrations/add_fulltext_search.sql

# Verificar instalación
psql -U postgres -d db_name -c "SELECT * FROM search_proyectos('test', 1, 0)"

# Ver índices
psql -U postgres -d db_name -c "\d+ proyecto"

# Reindexar
psql -U postgres -d db_name -c "REINDEX INDEX proyecto_search_idx"

# Actualizar estadísticas
psql -U postgres -d db_name -c "ANALYZE proyecto; ANALYZE lote;"
```

---

**Última actualización**: 2025-10-29
