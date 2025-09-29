-- Script para crear políticas RLS necesarias para usuario_perfil
-- Ejecutar para permitir acceso a la tabla desde la API

-- 1. Verificar si ya existen políticas
SELECT 
    'Políticas existentes' as tipo,
    COUNT(*) as total_politicas
FROM pg_policies 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil';

-- 2. Crear política para permitir SELECT a service_role
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'crm' 
          AND tablename = 'usuario_perfil' 
          AND policyname = 'service_role_select_usuario_perfil'
    ) THEN
        CREATE POLICY "service_role_select_usuario_perfil" 
        ON crm.usuario_perfil 
        FOR SELECT 
        TO service_role 
        USING (true);
    END IF;
END $$;

-- 3. Crear política para permitir SELECT a authenticated
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'crm' 
          AND tablename = 'usuario_perfil' 
          AND policyname = 'authenticated_select_usuario_perfil'
    ) THEN
        CREATE POLICY "authenticated_select_usuario_perfil" 
        ON crm.usuario_perfil 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- 4. Crear política para permitir SELECT a postgres
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'crm' 
          AND tablename = 'usuario_perfil' 
          AND policyname = 'postgres_select_usuario_perfil'
    ) THEN
        CREATE POLICY "postgres_select_usuario_perfil" 
        ON crm.usuario_perfil 
        FOR SELECT 
        TO postgres 
        USING (true);
    END IF;
END $$;

-- 5. Crear política para permitir SELECT a anon (si es necesario)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'crm' 
          AND tablename = 'usuario_perfil' 
          AND policyname = 'anon_select_usuario_perfil'
    ) THEN
        CREATE POLICY "anon_select_usuario_perfil" 
        ON crm.usuario_perfil 
        FOR SELECT 
        TO anon 
        USING (true);
    END IF;
END $$;

-- 6. Crear política para permitir SELECT a public (si es necesario)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'crm' 
          AND tablename = 'usuario_perfil' 
          AND policyname = 'public_select_usuario_perfil'
    ) THEN
        CREATE POLICY "public_select_usuario_perfil" 
        ON crm.usuario_perfil 
        FOR SELECT 
        TO public 
        USING (true);
    END IF;
END $$;

-- 7. Verificar que las políticas se crearon correctamente
SELECT 
    'Políticas creadas' as tipo,
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

-- 8. Verificar que el RLS sigue activo
SELECT 
    'RLS activo' as tipo,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'crm' 
  AND tablename = 'usuario_perfil';
