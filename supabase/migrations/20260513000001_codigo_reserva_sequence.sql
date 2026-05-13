-- Reemplaza el algoritmo MAX+1 (vulnerable a race conditions y cache stale en pgrest)
-- por una secuencia dedicada por año. Atomic, sin gaps por concurrencia (puede
-- saltar números si rollback, lo cual es aceptable).

BEGIN;

CREATE SEQUENCE IF NOT EXISTS crm.reserva_correlativo_2026 START 1;

-- Inicializar al MAX actual de reservas del año (mantiene continuidad).
SELECT setval('crm.reserva_correlativo_2026',
  COALESCE((
    SELECT MAX(CAST(SUBSTRING(codigo_reserva FROM 10) AS INT))
    FROM crm.reserva
    WHERE codigo_reserva LIKE 'RES-2026-%'
  ), 1));

CREATE OR REPLACE FUNCTION crm.generar_codigo_reserva()
RETURNS TRIGGER AS $func_res$
DECLARE
  v_anio TEXT;
  v_correlativo INT;
  v_seq_name TEXT;
BEGIN
  v_anio := TO_CHAR(NOW(), 'YYYY');
  v_seq_name := 'crm.reserva_correlativo_' || v_anio;

  -- Auto-crear sequence si llega un año nuevo (defensa anti-2027).
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND n.nspname = 'crm'
      AND c.relname = 'reserva_correlativo_' || v_anio
  ) THEN
    EXECUTE 'CREATE SEQUENCE IF NOT EXISTS ' || v_seq_name || ' START 1';
  END IF;

  v_correlativo := nextval(v_seq_name);
  NEW.codigo_reserva := 'RES-' || v_anio || '-' || LPAD(v_correlativo::TEXT, 4, '0');

  RETURN NEW;
END;
$func_res$ LANGUAGE plpgsql;

COMMIT;
