-- Otorgar permisos mínimos para que la API (service_role) acceda al esquema crm
-- Ejecutar en Supabase SQL Editor

-- 1) Conceder USAGE sobre el esquema crm (requerido para acceder a objetos)
GRANT USAGE ON SCHEMA crm TO service_role;
-- Opcional: si el cliente con anon/authenticated consulta este esquema, habilitar también:
-- GRANT USAGE ON SCHEMA crm TO authenticated;
-- GRANT USAGE ON SCHEMA crm TO anon;

-- 2) Conceder SELECT sobre las tablas usadas por el login por DNI
GRANT SELECT ON TABLE crm.usuario_perfil TO service_role;
GRANT SELECT ON TABLE crm.rol TO service_role;

-- Opcional: si vas a consultar como authenticated (no service) desde RSC/Server Actions
-- GRANT SELECT ON TABLE crm.usuario_perfil TO authenticated;
-- GRANT SELECT ON TABLE crm.rol TO authenticated;

-- 3) (Opcional) Asegurar privilegios por defecto para tablas futuras en este esquema
-- ALTER DEFAULT PRIVILEGES IN SCHEMA crm GRANT SELECT ON TABLES TO service_role;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA crm GRANT USAGE, SELECT ON SEQUENCES TO service_role;

-- 4) Verificaciones rápidas
SELECT 'verificar_schema_usage' AS check, n.nspname AS schema, has_schema_privilege('service_role', n.nspname, 'USAGE') AS service_has_usage
FROM pg_namespace n WHERE n.nspname = 'crm';

SELECT 'verificar_select_usuario_perfil' AS check, has_table_privilege('service_role', 'crm.usuario_perfil', 'SELECT') AS service_can_select_up;
SELECT 'verificar_select_rol' AS check, has_table_privilege('service_role', 'crm.rol', 'SELECT') AS service_can_select_rol;
