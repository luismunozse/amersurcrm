-- Corregir permisos para service_role en schema crm
-- El service_role necesita permisos para insertar notificaciones desde endpoints de autenticación

-- Dar permisos al service_role sobre la tabla notificacion
GRANT ALL ON crm.notificacion TO service_role;

-- También dar permisos sobre la secuencia si existe
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA crm TO service_role;

-- Asegurar que service_role puede usar el schema crm
GRANT USAGE ON SCHEMA crm TO service_role;

-- Dar permisos sobre todas las tablas del schema crm al service_role
GRANT ALL ON ALL TABLES IN SCHEMA crm TO service_role;
