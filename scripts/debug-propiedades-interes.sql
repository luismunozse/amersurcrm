-- ========================================
-- Script de depuración para propiedades de interés
-- Ejecuta esto en Supabase SQL Editor
-- ========================================

-- 1. Verificar que existe la tabla
SELECT 'Verificando tabla cliente_propiedad_interes' as paso;
SELECT
  table_schema,
  table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'crm' AND table_name = 'cliente_propiedad_interes'
  ) THEN '✅ Tabla existe'
  ELSE '❌ Tabla NO existe'
  END as resultado;

-- 2. Ver estructura de la tabla
SELECT 'Estructura de la tabla' as paso;
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'crm'
  AND table_name = 'cliente_propiedad_interes'
ORDER BY ordinal_position;

-- 3. Contar registros
SELECT 'Total de registros' as paso;
SELECT COUNT(*) as total_propiedades_interes FROM crm.cliente_propiedad_interes;

-- 4. Ver todos los registros (si existen)
SELECT 'Primeros 10 registros' as paso;
SELECT
  id,
  cliente_id,
  lote_id,
  propiedad_id,
  prioridad,
  notas,
  agregado_por,
  fecha_agregado
FROM crm.cliente_propiedad_interes
ORDER BY fecha_agregado DESC
LIMIT 10;

-- 5. Verificar relaciones con lotes
SELECT 'Verificando relaciones con lotes' as paso;
SELECT
  cpi.id,
  cpi.cliente_id,
  cpi.lote_id,
  l.codigo as lote_codigo,
  l.sup_m2,
  l.precio,
  l.moneda,
  l.estado,
  p.nombre as proyecto_nombre
FROM crm.cliente_propiedad_interes cpi
LEFT JOIN crm.lote l ON l.id = cpi.lote_id
LEFT JOIN crm.proyecto p ON p.id = l.proyecto_id
LIMIT 10;

-- 6. Ver políticas RLS
SELECT 'Políticas RLS activas' as paso;
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operacion,
  CASE WHEN permissive THEN 'Permisiva' ELSE 'Restrictiva' END as tipo,
  qual as condicion_using,
  with_check as condicion_with_check
FROM pg_policies
WHERE schemaname = 'crm'
  AND tablename = 'cliente_propiedad_interes';

-- 7. Verificar RLS está habilitado
SELECT 'Estado de RLS' as paso;
SELECT
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS Habilitado' ELSE '❌ RLS Deshabilitado' END as estado_rls
FROM pg_tables
WHERE schemaname = 'crm'
  AND tablename = 'cliente_propiedad_interes';

-- 8. Probar consulta como la hace Next.js (sin schema prefix)
SELECT 'Probando consulta estilo Next.js' as paso;
SELECT
  cpi.id,
  cpi.cliente_id,
  cpi.lote_id,
  cpi.prioridad,
  cpi.notas,
  cpi.agregado_por,
  cpi.fecha_agregado,
  json_build_object(
    'id', l.id,
    'codigo', l.codigo,
    'sup_m2', l.sup_m2,
    'estado', l.estado,
    'moneda', l.moneda,
    'precio', l.precio,
    'proyecto', json_build_object(
      'id', p.id,
      'nombre', p.nombre
    )
  ) as lote
FROM crm.cliente_propiedad_interes cpi
LEFT JOIN crm.lote l ON l.id = cpi.lote_id
LEFT JOIN crm.proyecto p ON p.id = l.proyecto_id
ORDER BY cpi.fecha_agregado DESC
LIMIT 5;

-- 9. Resumen final
SELECT '
========================================
🔍 DEPURACIÓN COMPLETADA
========================================

Revisa los resultados anteriores:
- ✅ Tabla existe y RLS habilitado
- Número de registros
- Relaciones con lotes y proyectos
- Políticas RLS activas

Si hay 0 registros, necesitas agregar datos.
Si hay registros pero no aparecen en la app,
el problema puede ser en la consulta de Next.js.

' as mensaje;
