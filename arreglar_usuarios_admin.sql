-- Script para arreglar los usuarios admin en Supabase
-- Ejecutar en Supabase Dashboard -> SQL Editor

-- 1. Ver los usuarios admin actuales
SELECT id, username, email, nombre_completo, activo
FROM crm.usuario_perfil
WHERE rol_id = '1cb5ea47-4e5e-4093-a867-24013dfd040c'
ORDER BY created_at;

-- 2. Actualizar el usuario antiguo (049a7662...) para que tenga email y username correcto
UPDATE crm.usuario_perfil
SET
  username = 'admin_principal',
  email = 'admin@amersur.test',
  nombre_completo = 'Administrador AMERSUR',
  dni = NULL,
  updated_at = NOW()
WHERE id = '049a7662-649a-41a2-b6de-fe7a8509e69f';

-- 3. OPCIONAL: Eliminar el usuario admin duplicado nuevo si quieres usar solo el antiguo
-- Descomenta estas líneas si quieres eliminar el usuario nuevo:
-- DELETE FROM crm.usuario_perfil WHERE id = 'dc9b7195-1b6e-4ed2-9769-fa667d5fec1d';

-- 4. Verificar que quedó bien
SELECT id, username, email, nombre_completo, activo, created_at
FROM crm.usuario_perfil
WHERE rol_id = '1cb5ea47-4e5e-4093-a867-24013dfd040c'
ORDER BY created_at;
