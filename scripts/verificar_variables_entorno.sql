-- Script para verificar variables de entorno de Supabase
-- Este script no se ejecuta en la base de datos, es solo informativo

-- Variables de entorno necesarias para la API:
-- NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
-- SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

-- Verificar que el servicio de autenticación funciona
SELECT 
    'Verificación de auth' as tipo,
    current_user as usuario_actual,
    current_database() as base_datos_actual,
    current_schema() as esquema_actual;

-- Verificar que podemos acceder a la tabla con RLS
SELECT 
    'Acceso a tabla con RLS' as tipo,
    COUNT(*) as total_registros
FROM crm.usuario_perfil;

