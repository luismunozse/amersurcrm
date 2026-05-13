-- Mismo fix de sequence para venta (evita race/cache stale).

BEGIN;

CREATE SEQUENCE IF NOT EXISTS crm.venta_correlativo_2026 START 1;

SELECT setval('crm.venta_correlativo_2026',
  COALESCE((
    SELECT MAX(CAST(SUBSTRING(codigo_venta FROM 10) AS INT))
    FROM crm.venta
    WHERE codigo_venta LIKE 'VTA-2026-%'
  ), 1));

CREATE OR REPLACE FUNCTION crm.generar_codigo_venta()
RETURNS TRIGGER AS $func_vta$
DECLARE
  v_anio TEXT;
  v_correlativo INT;
  v_seq_name TEXT;
BEGIN
  v_anio := TO_CHAR(NOW(), 'YYYY');
  v_seq_name := 'crm.venta_correlativo_' || v_anio;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND n.nspname = 'crm'
      AND c.relname = 'venta_correlativo_' || v_anio
  ) THEN
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS ' || v_seq_name || ' START 1';
  END IF;

  v_correlativo := nextval(v_seq_name);
  NEW.codigo_venta := 'VTA-' || v_anio || '-' || LPAD(v_correlativo::TEXT, 4, '0');

  RETURN NEW;
END;
$func_vta$ LANGUAGE plpgsql;

COMMIT;
