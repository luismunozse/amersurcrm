-- =====================================================
-- MIGRACIÓN: Full-Text Search para Proyectos y Lotes
-- SCHEMA: crm
-- =====================================================
-- Este script agrega capacidades de búsqueda de texto completo
-- usando las características nativas de PostgreSQL (tsvector)
--
-- Beneficios:
-- - Búsqueda más rápida y precisa
-- - Soporte para búsqueda de palabras parciales
-- - Ranking de relevancia
-- - Búsqueda en español con stemming
-- - Índices GIN para mejor rendimiento
--
-- Uso:
-- Copiar y pegar en SQL Editor de Supabase
-- =====================================================

-- 1. Instalar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Agregar columna tsvector para proyectos
ALTER TABLE crm.proyecto
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 3. Agregar columna tsvector para lotes
ALTER TABLE crm.lote
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 4. Crear función para actualizar el search_vector de proyectos
CREATE OR REPLACE FUNCTION crm.proyecto_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.nombre, ''))), 'A') ||
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.ubicacion, ''))), 'B') ||
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.descripcion, ''))), 'C') ||
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.estado::text, ''))), 'D') ||
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.tipo::text, ''))), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Crear función para actualizar el search_vector de lotes
CREATE OR REPLACE FUNCTION crm.lote_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.codigo, ''))), 'A') ||
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.data->>'numero_lote', ''))), 'A') ||
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.data->>'manzana', ''))), 'B') ||
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.data->>'etapa', ''))), 'B') ||
    setweight(to_tsvector('spanish', unaccent(COALESCE(NEW.estado::text, ''))), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Crear triggers para actualizar automáticamente el search_vector
DROP TRIGGER IF EXISTS proyecto_search_vector_trigger ON crm.proyecto;
CREATE TRIGGER proyecto_search_vector_trigger
  BEFORE INSERT OR UPDATE ON crm.proyecto
  FOR EACH ROW
  EXECUTE FUNCTION crm.proyecto_search_vector_update();

DROP TRIGGER IF EXISTS lote_search_vector_trigger ON crm.lote;
CREATE TRIGGER lote_search_vector_trigger
  BEFORE INSERT OR UPDATE ON crm.lote
  FOR EACH ROW
  EXECUTE FUNCTION crm.lote_search_vector_update();

-- 7. Actualizar search_vector para registros existentes
UPDATE crm.proyecto SET search_vector =
  setweight(to_tsvector('spanish', unaccent(COALESCE(nombre, ''))), 'A') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(ubicacion, ''))), 'B') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(descripcion, ''))), 'C') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(estado::text, ''))), 'D') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(tipo::text, ''))), 'D');

UPDATE crm.lote SET search_vector =
  setweight(to_tsvector('spanish', unaccent(COALESCE(codigo, ''))), 'A') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(data->>'numero_lote', ''))), 'A') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(data->>'manzana', ''))), 'B') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(data->>'etapa', ''))), 'B') ||
  setweight(to_tsvector('spanish', unaccent(COALESCE(estado::text, ''))), 'C');

-- 8. Crear índices GIN para búsqueda rápida
CREATE INDEX IF NOT EXISTS proyecto_search_idx ON crm.proyecto USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS lote_search_idx ON crm.lote USING GIN(search_vector);

-- 9. Crear índice adicional para búsqueda por prefijos
CREATE INDEX IF NOT EXISTS proyecto_nombre_trgm_idx ON crm.proyecto USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS lote_codigo_trgm_idx ON crm.lote USING gin (codigo gin_trgm_ops);

-- =====================================================
-- FUNCIONES DE UTILIDAD PARA BÚSQUEDA
-- =====================================================

-- Función para buscar proyectos con full-text search y ranking
CREATE OR REPLACE FUNCTION crm.search_proyectos(
  search_query TEXT,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  ubicacion TEXT,
  estado TEXT,
  tipo TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.nombre,
    p.ubicacion,
    p.estado::TEXT,
    p.tipo::TEXT,
    ts_rank(p.search_vector, websearch_to_tsquery('spanish', unaccent(search_query))) AS rank
  FROM crm.proyecto p
  WHERE p.search_vector @@ websearch_to_tsquery('spanish', unaccent(search_query))
  ORDER BY rank DESC, p.nombre ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Función para buscar lotes con full-text search y ranking
CREATE OR REPLACE FUNCTION crm.search_lotes(
  proyecto_id_param UUID,
  search_query TEXT,
  limit_count INTEGER DEFAULT 100,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  codigo TEXT,
  numero_lote TEXT,
  estado TEXT,
  precio NUMERIC,
  sup_m2 NUMERIC,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.codigo,
    l.data->>'numero_lote' AS numero_lote,
    l.estado::TEXT,
    l.precio,
    l.sup_m2,
    ts_rank(l.search_vector, websearch_to_tsquery('spanish', unaccent(search_query))) AS rank
  FROM crm.lote l
  WHERE
    l.proyecto_id = proyecto_id_param
    AND l.search_vector @@ websearch_to_tsquery('spanish', unaccent(search_query))
  ORDER BY rank DESC, l.codigo ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Mostrar estadísticas de los índices creados
SELECT
  n.nspname as schema_name,
  t.relname as table_name,
  i.relname as index_name
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'crm'
  AND t.relname IN ('proyecto', 'lote')
  AND i.relname LIKE '%search%'
ORDER BY t.relname, i.relname;

-- Ejemplo de uso:
-- SELECT * FROM crm.search_proyectos('residencial playa', 10, 0);
-- SELECT * FROM crm.search_lotes('proyecto-uuid-here', 'manzana A lote 1', 10, 0);

COMMENT ON COLUMN crm.proyecto.search_vector IS 'Vector de búsqueda de texto completo para proyectos';
COMMENT ON COLUMN crm.lote.search_vector IS 'Vector de búsqueda de texto completo para lotes';
COMMENT ON FUNCTION crm.proyecto_search_vector_update() IS 'Actualiza automáticamente el vector de búsqueda al insertar/actualizar proyectos';
COMMENT ON FUNCTION crm.lote_search_vector_update() IS 'Actualiza automáticamente el vector de búsqueda al insertar/actualizar lotes';
COMMENT ON FUNCTION crm.search_proyectos(TEXT, INTEGER, INTEGER) IS 'Búsqueda full-text de proyectos con ranking de relevancia';
COMMENT ON FUNCTION crm.search_lotes(UUID, TEXT, INTEGER, INTEGER) IS 'Búsqueda full-text de lotes con ranking de relevancia';
