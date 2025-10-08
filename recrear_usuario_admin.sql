-- Script para eliminar usuarios admin conflictivos y crear uno nuevo
-- Ejecutar en Supabase Dashboard -> SQL Editor

-- PASO 1: Eliminar usuarios admin antiguos de usuario_perfil
DELETE FROM crm.usuario_perfil
WHERE id IN (
  '049a7662-649a-41a2-b6de-fe7a8509e69f',
  'dc9b7195-1b6e-4ed2-9769-fa667d5fec1d'
);

-- PASO 2: Eliminar usuarios admin antiguos de auth.users (si existen)
-- IMPORTANTE: Esto requiere permisos de service_role
-- Si da error, ignóralo y continúa con el siguiente paso
DELETE FROM auth.users
WHERE id IN (
  '049a7662-649a-41a2-b6de-fe7a8509e69f',
  'dc9b7195-1b6e-4ed2-9769-fa667d5fec1d'
);

-- PASO 3: Verificar que se eliminaron
SELECT COUNT(*) as admins_restantes
FROM crm.usuario_perfil
WHERE id IN (
  '049a7662-649a-41a2-b6de-fe7a8509e69f',
  'dc9b7195-1b6e-4ed2-9769-fa667d5fec1d'
);

-- NOTA: Para crear el nuevo usuario admin, usa el formulario de creación de usuarios
-- en el dashboard con estos datos:
-- Rol: Administrador
-- Username: admin
-- Contraseña: [tu contraseña deseada]
