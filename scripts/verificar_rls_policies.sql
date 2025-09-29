-- Script para verificar políticas RLS en usuario_perfil
-- Ejecutar para ver todas las políticas que pueden estar bloqueando el acceso

-- 1. Verificar todas las políticas RLS de la tabla usuario_perfil
SELECT 
    'Políticas RLS' as tipo,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
ORDER BY policyname;

-- 2. Verificar si hay políticas que permitan SELECT
SELECT 
    'Políticas SELECT' as tipo,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
  AND cmd = 'SELECT';

-- 3. Verificar si hay políticas que permitan acceso a authenticated
SELECT 
    'Políticas authenticated' as tipo,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
  AND 'authenticated' = ANY(roles);

-- 4. Verificar si hay políticas que permitan acceso a service_role
SELECT 
    'Políticas service_role' as tipo,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
  AND 'service_role' = ANY(roles);

-- 5. Verificar si hay políticas que permitan acceso a postgres
SELECT 
    'Políticas postgres' as tipo,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
  AND 'postgres' = ANY(roles);

-- 6. Verificar si hay políticas que permitan acceso a anon
SELECT 
    'Políticas anon' as tipo,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
  AND 'anon' = ANY(roles);

-- 7. Verificar si hay políticas que permitan acceso a public
SELECT 
    'Políticas public' as tipo,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
  AND 'public' = ANY(roles);

-- 8. Verificar si hay políticas que permitan acceso a cualquier rol
SELECT 
    'Políticas cualquier rol' as tipo,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
  AND roles IS NULL;

-- 9. Verificar si hay políticas que permitan acceso a roles específicos
SELECT 
    'Políticas roles específicos' as tipo,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
  AND roles IS NOT NULL
  AND array_length(roles, 1) > 0;

-- 10. Verificar si hay políticas que permitan acceso a roles específicos
SELECT 
    'Políticas roles específicos' as tipo,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil'
  AND roles IS NOT NULL
  AND array_length(roles, 1) > 0;
