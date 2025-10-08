-- Script para eliminar usuarios admin conflictivos manejando dependencias
-- Ejecutar en Supabase Dashboard -> SQL Editor

-- OPCIÓN 1: Crear primero el nuevo usuario admin temporalmente
-- Esto nos permitirá reasignar los planos antes de eliminar el antiguo

-- Primero, asegúrate de crear el nuevo admin desde el formulario web:
-- http://localhost:3000/dashboard/admin/usuarios
-- Rol: Administrador, Username: admin, Contraseña: [la que quieras]
-- Luego copia el ID del nuevo usuario y úsalo en el siguiente UPDATE

-- PASO 1: Ver el nuevo usuario admin creado y copiar su ID
SELECT id, username, email, nombre_completo
FROM crm.usuario_perfil
WHERE rol_id = '1cb5ea47-4e5e-4093-a867-24013dfd040c'
  AND username = 'admin';

-- PASO 2: Reasignar los planos al nuevo usuario admin
-- IMPORTANTE: Reemplaza 'NUEVO_ADMIN_ID' con el ID que obtuviste en el paso anterior
UPDATE crm.proyecto_planos
SET created_by = 'NUEVO_ADMIN_ID'
WHERE created_by = '049a7662-649a-41a2-b6de-fe7a8509e69f';

-- PASO 3: Ahora sí eliminar los usuarios admin antiguos de usuario_perfil
DELETE FROM crm.usuario_perfil
WHERE id IN (
  '049a7662-649a-41a2-b6de-fe7a8509e69f',
  'dc9b7195-1b6e-4ed2-9769-fa667d5fec1d'
);

-- PASO 4: Eliminar de auth.users
DELETE FROM auth.users
WHERE id IN (
  '049a7662-649a-41a2-b6de-fe7a8509e69f',
  'dc9b7195-1b6e-4ed2-9769-fa667d5fec1d'
);

-- PASO 5: Verificar que se eliminaron
SELECT COUNT(*) as admins_restantes
FROM crm.usuario_perfil
WHERE id IN (
  '049a7662-649a-41a2-b6de-fe7a8509e69f',
  'dc9b7195-1b6e-4ed2-9769-fa667d5fec1d'
);

-- NOTA: Para crear el nuevo usuario admin, usa el formulario en:
-- http://localhost:3000/dashboard/admin/usuarios
-- Rol: Administrador
-- Username: admin
-- Contraseña: [tu contraseña deseada]
