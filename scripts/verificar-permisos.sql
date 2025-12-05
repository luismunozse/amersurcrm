-- Script de verificación del sistema de permisos
-- Ejecuta este script en Supabase SQL Editor para verificar que todo está correcto

-- ========================================
-- 1. Verificar que existen las tablas
-- ========================================
SELECT
  'Tabla: ' || table_name as verificacion,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ Existe'
    ELSE '❌ No existe'
  END as estado
FROM information_schema.tables
WHERE table_schema = 'crm'
  AND table_name IN ('rol', 'usuario_perfil', 'auditoria_permiso', 'permiso_condicion')
GROUP BY table_name;

-- ========================================
-- 2. Verificar que existen los roles
-- ========================================
SELECT
  'Rol: ' || nombre as verificacion,
  CASE
    WHEN activo THEN '✅ Activo'
    ELSE '⚠️ Inactivo'
  END as estado,
  jsonb_array_length(permisos) as total_permisos
FROM crm.rol
ORDER BY nombre;

-- ========================================
-- 3. Ver permisos de cada rol
-- ========================================
SELECT
  nombre as rol,
  jsonb_pretty(permisos) as permisos_detalle
FROM crm.rol
ORDER BY nombre;

-- ========================================
-- 4. Verificar usuarios con roles asignados
-- ========================================
SELECT
  up.id,
  up.nombre_completo,
  up.username,
  r.nombre as rol,
  up.activo,
  CASE
    WHEN up.activo AND r.activo THEN '✅ OK'
    WHEN NOT up.activo THEN '⚠️ Usuario inactivo'
    WHEN NOT r.activo THEN '⚠️ Rol inactivo'
    ELSE '❌ Error'
  END as estado
FROM crm.usuario_perfil up
LEFT JOIN crm.rol r ON r.id = up.rol_id
ORDER BY r.nombre, up.nombre_completo;

-- ========================================
-- 5. Verificar funciones PostgreSQL
-- ========================================
SELECT
  routine_name as funcion,
  '✅ Existe' as estado
FROM information_schema.routines
WHERE routine_schema = 'crm'
  AND routine_name IN (
    'obtener_permisos_usuario',
    'tiene_permiso',
    'verificar_condicion_permiso'
  )
ORDER BY routine_name;

-- ========================================
-- 6. Verificar condiciones de permisos
-- ========================================
SELECT
  r.nombre as rol,
  pc.permiso_codigo,
  pc.tipo_condicion,
  pc.valor_limite,
  pc.requiere_aprobacion,
  CASE
    WHEN pc.activo THEN '✅ Activa'
    ELSE '⚠️ Inactiva'
  END as estado
FROM crm.permiso_condicion pc
JOIN crm.rol r ON r.id = pc.rol_id
ORDER BY r.nombre, pc.permiso_codigo;

-- ========================================
-- 7. Probar función obtener_permisos_usuario
-- ========================================
-- Reemplaza 'USER_ID_AQUI' con un ID de usuario real
/*
SELECT crm.obtener_permisos_usuario('USER_ID_AQUI'::uuid);
*/

-- ========================================
-- 8. Probar función tiene_permiso
-- ========================================
-- Reemplaza 'USER_ID_AQUI' con un ID de usuario real
/*
SELECT crm.tiene_permiso(
  'USER_ID_AQUI'::uuid,
  'clientes.ver_todos'
);
*/

-- ========================================
-- 9. Ver últimos registros de auditoría
-- ========================================
SELECT
  ap.created_at,
  up.nombre_completo as usuario,
  ap.permiso_codigo,
  ap.accion,
  ap.resultado,
  ap.metadata
FROM crm.auditoria_permiso ap
LEFT JOIN crm.usuario_perfil up ON up.id = ap.usuario_id
ORDER BY ap.created_at DESC
LIMIT 20;

-- ========================================
-- 10. Verificar RLS (Row Level Security)
-- ========================================
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Deshabilitado'
  END as estado_rls
FROM pg_tables
WHERE schemaname = 'crm'
  AND tablename IN (
    'usuario_perfil',
    'auditoria_permiso',
    'permiso_condicion',
    'cliente',
    'proyecto',
    'lote'
  )
ORDER BY tablename;

-- ========================================
-- 11. Ver políticas RLS activas
-- ========================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operacion,
  CASE
    WHEN permissive = 'PERMISSIVE' THEN 'Permisiva'
    ELSE 'Restrictiva'
  END as tipo
FROM pg_policies
WHERE schemaname = 'crm'
ORDER BY tablename, policyname;

-- ========================================
-- RESUMEN DE VERIFICACIÓN
-- ========================================
SELECT '
========================================
✅ VERIFICACIÓN COMPLETADA
========================================

Si todos los checks anteriores están en ✅,
tu sistema de permisos está correctamente configurado.

Próximos pasos:
1. Revisa los permisos de cada rol
2. Asigna roles a tus usuarios
3. Prueba las funciones con IDs reales
4. Integra el código TypeScript en tu app

Documentación:
- SISTEMA_PERMISOS_COMPLETO.md
- EJEMPLOS_PERMISOS.md
- INTEGRACION_PERMISOS.md

' as mensaje;
