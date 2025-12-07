DROP VIEW IF EXISTS crm.cliente_accesible;

-- Vista optimizada para clientes accesibles por cada usuario
CREATE VIEW crm.cliente_accesible AS
SELECT c.*, c.created_by AS usuario_id
FROM crm.cliente c
UNION
SELECT c.*, up.id AS usuario_id
FROM crm.cliente c
JOIN crm.usuario_perfil up ON up.username = c.vendedor_username;

-- Materialized view para totales por vendedor (actualizar manualmente si se usa)
CREATE MATERIALIZED VIEW IF NOT EXISTS crm.cliente_totales_por_vendedor AS
SELECT vendedor_username, COUNT(*) AS total
FROM crm.cliente
GROUP BY vendedor_username;
