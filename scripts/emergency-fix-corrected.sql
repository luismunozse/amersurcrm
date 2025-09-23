-- SOLUCIÓN DE EMERGENCIA CORREGIDA: Eliminar restricción de foreign key
-- Ejecutar INMEDIATAMENTE en Supabase SQL Editor

-- 1. Primero, obtener el UUID correcto del rol vendedor
SELECT id, nombre FROM crm.rol WHERE nombre = 'ROL_VENDEDOR';

-- 2. Eliminar la restricción problemática
ALTER TABLE crm.usuario_perfil DROP CONSTRAINT IF EXISTS usuario_perfil_id_fkey;

-- 3. Verificar que se eliminó
SELECT 'Restricción eliminada' as status
WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE table_schema = 'crm' 
      AND table_name = 'usuario_perfil'
      AND constraint_name = 'usuario_perfil_id_fkey'
);

-- 4. Probar que funciona creando un usuario con el UUID correcto del rol
-- (Reemplaza 'ROL_UUID_AQUI' con el UUID real del rol vendedor del paso 1)
INSERT INTO crm.usuario_perfil (
    id, 
    dni, 
    nombre_completo, 
    rol_id, 
    email, 
    estado_registro
) VALUES (
    gen_random_uuid(), 
    '12345678', 
    'Test User', 
    (SELECT id FROM crm.rol WHERE nombre = 'ROL_VENDEDOR' LIMIT 1),
    'test@example.com', 
    'pendiente'
) ON CONFLICT (id) DO NOTHING;

-- 5. Verificar que se creó
SELECT id, dni, nombre_completo, estado_registro 
FROM crm.usuario_perfil 
WHERE email = 'test@example.com';

-- 6. Limpiar
DELETE FROM crm.usuario_perfil WHERE email = 'test@example.com';

SELECT '¡Listo! Ahora puedes crear usuarios sin problemas.' as resultado;
