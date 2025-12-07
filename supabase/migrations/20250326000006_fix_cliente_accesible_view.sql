-- Recrea la vista de clientes accesibles con columnas alineadas a crm.cliente
DROP VIEW IF EXISTS crm.cliente_accesible;

CREATE VIEW crm.cliente_accesible AS
SELECT c.*, c.created_by AS usuario_id
FROM crm.cliente c
UNION ALL
SELECT c.*, up.id AS usuario_id
FROM crm.cliente c
JOIN crm.usuario_perfil up ON up.username = c.vendedor_username;
