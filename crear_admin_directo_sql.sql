-- Script para crear usuario admin directamente en la base de datos
-- Ejecutar en Supabase Dashboard -> SQL Editor
-- IMPORTANTE: Cambia la contraseña en la línea 73 antes de ejecutar

-- PASO 1: Ver todos los usuarios que existen actualmente
SELECT 'Usuarios en auth.users' as tabla, id, email, created_at
FROM auth.users
ORDER BY created_at;

SELECT 'Usuarios en usuario_perfil' as tabla, id, username, email, nombre_completo
FROM crm.usuario_perfil
WHERE rol_id = '1cb5ea47-4e5e-4093-a867-24013dfd040c'
ORDER BY created_at;

-- PASO 2: Deshabilitar temporalmente el constraint NOT NULL y crear nuevo admin
-- IMPORTANTE: Cambia 'TuPasswordSegura123!' por la contraseña que quieras (línea 73)
DO $$
DECLARE
  new_user_id uuid;
  admin_rol_id uuid := '1cb5ea47-4e5e-4093-a867-24013dfd040c';
  old_admin_id uuid := '049a7662-649a-41a2-b6de-fe7a8509e69f';
BEGIN
  -- PASO 1: Quitar temporalmente el constraint NOT NULL de created_by
  ALTER TABLE crm.proyecto_planos ALTER COLUMN created_by DROP NOT NULL;

  -- PASO 2: Poner created_by en NULL para TODOS los usuarios admin que vamos a eliminar
  UPDATE crm.proyecto_planos
  SET created_by = NULL
  WHERE created_by IN (
    SELECT id FROM auth.users WHERE email = 'admin@amersur.admin'
  ) OR created_by IN (
    '049a7662-649a-41a2-b6de-fe7a8509e69f',
    'dc9b7195-1b6e-4ed2-9769-fa667d5fec1d'
  );

  -- PASO 3: Eliminar TODOS los usuarios admin antiguos de usuario_perfil
  DELETE FROM crm.usuario_perfil
  WHERE email = 'admin@amersur.admin' OR id IN (
    '049a7662-649a-41a2-b6de-fe7a8509e69f',
    'dc9b7195-1b6e-4ed2-9769-fa667d5fec1d'
  );

  -- PASO 4: Eliminar TODOS los usuarios admin de auth.users (incluyendo por email)
  DELETE FROM auth.users
  WHERE id IN (
    '049a7662-649a-41a2-b6de-fe7a8509e69f',
    'dc9b7195-1b6e-4ed2-9769-fa667d5fec1d'
  ) OR email = 'admin@amersur.admin';

  -- PASO 5: Verificar que no existe el email antes de crear
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@amersur.admin') THEN
    RAISE EXCEPTION 'El email admin@amersur.admin todavía existe en auth.users';
  END IF;

  -- PASO 6: Crear nuevo usuario en auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@amersur.admin',
    crypt('TuPasswordSegura123!', gen_salt('bf')), -- ⬅️ CAMBIA ESTA CONTRASEÑA AQUÍ
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO new_user_id;

  -- PASO 7: Crear perfil en usuario_perfil
  INSERT INTO crm.usuario_perfil (
    id,
    username,
    email,
    nombre_completo,
    dni,
    telefono,
    rol_id,
    activo,
    requiere_cambio_password,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    'admin',
    'admin@amersur.admin',
    'Administrador AMERSUR',
    NULL,
    NULL,
    admin_rol_id,
    true,
    false,
    NOW(),
    NOW()
  );

  -- PASO 8: Reasignar los planos al nuevo admin
  UPDATE crm.proyecto_planos
  SET created_by = new_user_id
  WHERE created_by IS NULL;

  -- PASO 9: Restaurar el constraint NOT NULL
  ALTER TABLE crm.proyecto_planos ALTER COLUMN created_by SET NOT NULL;

  RAISE NOTICE 'Usuario admin creado exitosamente con ID: %', new_user_id;
END $$;

-- PASO 3: Verificar que se creó correctamente
SELECT id, username, email, nombre_completo, activo
FROM crm.usuario_perfil
WHERE username = 'admin';

-- PASO 4: Verificar que los planos se reasignaron
SELECT COUNT(*) as planos_del_nuevo_admin
FROM crm.proyecto_planos p
JOIN crm.usuario_perfil u ON p.created_by = u.id
WHERE u.username = 'admin';
