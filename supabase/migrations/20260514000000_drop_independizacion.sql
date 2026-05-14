-- Drop módulo independización (deprecado).
-- Razón: módulo no se va a utilizar. Trámite SUNARP queda fuera del CRM.
--
-- IMPACTO:
--   - Elimina crm.independizacion + crm.independizacion_documento.
--   - CASCADE limpia índices, triggers, RLS policies y FKs entrantes.
--   - No hay tablas externas que referencien estas; ventas/lotes/clientes
--     usaban FK saliente desde independizacion (sin orphans).
--
-- REVIEW ANTES DE EJECUTAR:
--   1. Backup de crm.independizacion y crm.independizacion_documento si
--      hay filas de prueba/uso histórico.
--   2. Confirmar que reportes no consultan estas tablas.

BEGIN;

-- 1. Drop tablas (CASCADE quita índices, triggers, policies, FKs)
DROP TABLE IF EXISTS crm.independizacion_documento CASCADE;
DROP TABLE IF EXISTS crm.independizacion CASCADE;

-- 2. Drop función generadora de código
DROP FUNCTION IF EXISTS crm.generar_codigo_independizacion() CASCADE;

COMMIT;
