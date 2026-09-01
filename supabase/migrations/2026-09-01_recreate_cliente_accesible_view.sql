-- Recrea crm.cliente_accesible para que incorpore las columnas agregadas a
-- crm.cliente DESPUÉS de la última versión de la vista (2025-03-26).
--
-- Por qué hace falta: la vista se define con `SELECT c.*`, y Postgres expande
-- ese `*` a una lista fija de columnas EN EL MOMENTO DE CREARLA. Todo lo que
-- se agregó luego con ALTER TABLE (whatsapp_username, whatsapp_chat_id,
-- whatsapp_opt_out y sus campos) nunca entró a la vista. Seleccionar una de
-- esas columnas desde la vista devuelve 42703 "column does not exist", y la
-- lista de clientes de un vendedor (único camino que usa la vista, ver
-- `usarVistaAccesible` en src/lib/cache.server.ts) queda rota.
--
-- Por qué DROP y no CREATE OR REPLACE: el `*` expandido nuevo mete las
-- columnas nuevas ANTES de usuario_id, o sea que corre de posición una columna
-- existente. Eso es justamente lo único que CREATE OR REPLACE VIEW no admite
-- ("cannot change name of view column").

DROP VIEW IF EXISTS crm.cliente_accesible;

CREATE VIEW crm.cliente_accesible AS
SELECT c.*, c.created_by AS usuario_id
FROM crm.cliente c
UNION ALL
SELECT c.*, up.id AS usuario_id
FROM crm.cliente c
JOIN crm.usuario_perfil up ON up.username = c.vendedor_username;

-- El DROP se lleva los grants de la vista anterior. Quedan explícitos acá
-- porque en el historial de migraciones no había ninguno: se habían aplicado
-- a mano sobre el proyecto, y recrear la vista los habría perdido en silencio.
GRANT SELECT ON crm.cliente_accesible TO authenticated;
GRANT SELECT ON crm.cliente_accesible TO service_role;
