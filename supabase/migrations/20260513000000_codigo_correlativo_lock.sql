-- Fix race condition en generar_codigo_reserva/venta.
-- Sin lock: 2 inserts concurrentes leen mismo MAX y colisionan.
-- pg_advisory_xact_lock serializa la generación dentro de la transacción.

BEGIN;

CREATE OR REPLACE FUNCTION crm.generar_codigo_reserva()
RETURNS TRIGGER AS $$
DECLARE
  v_anio TEXT;
  v_siguiente INT;
BEGIN
  IF NEW.codigo_reserva IS NULL OR NEW.codigo_reserva = '' THEN
    v_anio := TO_CHAR(NOW(), 'YYYY');

    -- Lock por nombre de funcion+año. Se libera al COMMIT/ROLLBACK.
    PERFORM pg_advisory_xact_lock(hashtext('reserva_codigo_' || v_anio));

    SELECT COALESCE(MAX(
      CAST(SUBSTRING(codigo_reserva FROM 10) AS INT)
    ), 0) + 1
    INTO v_siguiente
    FROM crm.reserva
    WHERE codigo_reserva LIKE 'RES-' || v_anio || '-%';

    NEW.codigo_reserva := 'RES-' || v_anio || '-' || LPAD(v_siguiente::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION crm.generar_codigo_venta()
RETURNS TRIGGER AS $$
DECLARE
  v_anio TEXT;
  v_siguiente INT;
BEGIN
  IF NEW.codigo_venta IS NULL OR NEW.codigo_venta = '' THEN
    v_anio := TO_CHAR(NOW(), 'YYYY');

    PERFORM pg_advisory_xact_lock(hashtext('venta_codigo_' || v_anio));

    SELECT COALESCE(MAX(
      CAST(SUBSTRING(codigo_venta FROM 10) AS INT)
    ), 0) + 1
    INTO v_siguiente
    FROM crm.venta
    WHERE codigo_venta LIKE 'VTA-' || v_anio || '-%';

    NEW.codigo_venta := 'VTA-' || v_anio || '-' || LPAD(v_siguiente::TEXT, 4, '0');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMIT;
