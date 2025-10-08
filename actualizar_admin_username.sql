-- Script para actualizar el usuario admin con un username
-- Ejecutar en Supabase Dashboard -> SQL Editor

-- 1. Ver el usuario admin actual
SELECT id, username, email, nombre_completo, dni, rol_id
FROM crm.usuario_perfil
WHERE email = 'admin@amersur.test';

-- 2. Actualizar el usuario admin para que tenga username 'admin'
UPDATE crm.usuario_perfil
SET
  username = 'admin',
  nombre_completo = COALESCE(nombre_completo, 'Administrador AMERSUR'),
  dni = NULL,  -- Los admins no tienen DNI
  updated_at = NOW()
WHERE email = 'admin@amersur.test';

-- 3. Verificar que se actualizó correctamente
SELECT id, username, email, nombre_completo, dni, rol_id
FROM crm.usuario_perfil
WHERE email = 'admin@amersur.test';
