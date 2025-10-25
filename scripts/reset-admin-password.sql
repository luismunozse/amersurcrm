-- Script para resetear la contraseña del administrador
-- Usuario: admin@amersur.admin
-- Nueva contraseña: Admin123!

-- INSTRUCCIONES:
-- Este script debe ejecutarse en el SQL Editor de Supabase Dashboard
-- O puedes usar la interfaz de Authentication > Users para resetear la contraseña manualmente

-- 1. Primero, verificamos que el usuario existe
SELECT
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email = 'admin@amersur.admin';

-- 2. Para resetear la contraseña, tienes 3 opciones:

-- OPCIÓN A: Usar el Supabase Dashboard (RECOMENDADO)
-- 1. Ve a Authentication > Users en tu Supabase Dashboard
-- 2. Busca el usuario admin@amersur.admin
-- 3. Haz clic en los 3 puntos (...) > "Reset Password"
-- 4. Ingresa la nueva contraseña: Admin123!

-- OPCIÓN B: Usar la función de recovery (envía email)
-- Descomentar la siguiente línea si quieres enviar un email de recuperación:
-- SELECT auth.email_reset_password('admin@amersur.admin');

-- OPCIÓN C: Actualizar directamente (SOLO PARA DESARROLLO/LOCAL)
-- ADVERTENCIA: Esto solo funciona en instancias locales de Supabase
-- NO funcionará en Supabase Cloud por razones de seguridad
--
-- Para Supabase Cloud, DEBES usar la opción A o ejecutar el script Node.js
-- que se encuentra en scripts/reset-admin-password.mjs

-- 3. Verificar el perfil del usuario
SELECT
    up.id,
    up.nombre_completo,
    up.username,
    r.nombre as rol,
    up.activo,
    up.requiere_cambio_password
FROM crm.usuario_perfil up
LEFT JOIN crm.rol r ON up.rol = r.nombre
WHERE up.id = (SELECT id FROM auth.users WHERE email = 'admin@amersur.admin');

-- 4. Si el usuario requiere cambio de password, desactivar ese flag
UPDATE crm.usuario_perfil
SET requiere_cambio_password = false
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@amersur.admin');

-- 5. Verificar que el usuario tiene rol de administrador
UPDATE crm.usuario_perfil
SET rol = 'ROL_ADMIN'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@amersur.admin');
