-- Etapa 4 (cobranza): soporte de anulacion de pagos con auditoria.
-- Permite a un admin revertir un pago registrado por error: la cuota
-- recalcula su estado y la venta restaura su saldo pendiente.

BEGIN;

CREATE SCHEMA IF NOT EXISTS crm;

-- ============================================================
-- 1. crm.pago: campos de auditoria de anulacion
-- ============================================================
ALTER TABLE crm.pago
  ADD COLUMN IF NOT EXISTS anulado BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE crm.pago
  ADD COLUMN IF NOT EXISTS anulado_por VARCHAR(50);

ALTER TABLE crm.pago
  ADD COLUMN IF NOT EXISTS fecha_anulacion TIMESTAMPTZ;

ALTER TABLE crm.pago
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT;

CREATE INDEX IF NOT EXISTS idx_pago_anulado
  ON crm.pago(anulado)
  WHERE anulado = TRUE;

COMMENT ON COLUMN crm.pago.anulado IS 'Si el pago fue anulado por admin. Se mantiene para auditoria.';

-- ============================================================
-- 2. RPC anular_pago(p_pago_id, p_username, p_motivo)
--    Operacion atomica:
--      a) Marca pago como anulado
--      b) Resta el monto del pago de cuota.monto_pagado
--      c) Recalcula estado de cuota (pendiente/parcial/pagada/vencida)
--      d) Suma el monto al venta.saldo_pendiente
--      e) Si la venta estaba 'finalizada' y queda saldo, la pasa a 'en_proceso'
--    Autorizacion (esAdmin) se valida en server action.
-- ============================================================
CREATE OR REPLACE FUNCTION crm.anular_pago(
  p_pago_id  UUID,
  p_username VARCHAR,
  p_motivo   TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  v_pago        RECORD;
  v_cuota       RECORD;
  v_venta       RECORD;
  v_nuevo_pagado NUMERIC(14,2);
  v_nuevo_estado VARCHAR(20);
  v_nuevo_saldo  NUMERIC(14,2);
BEGIN
  IF p_pago_id IS NULL THEN
    RAISE EXCEPTION 'ID de pago requerido' USING ERRCODE = '22023';
  END IF;
  IF p_motivo IS NULL OR length(btrim(p_motivo)) = 0 THEN
    RAISE EXCEPTION 'Motivo de anulacion requerido' USING ERRCODE = '22023';
  END IF;

  -- ---- Cargar pago ----
  SELECT * INTO v_pago FROM crm.pago WHERE id = p_pago_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pago no encontrado' USING ERRCODE = 'P0002';
  END IF;
  IF v_pago.anulado THEN
    RAISE EXCEPTION 'El pago ya fue anulado' USING ERRCODE = '42501';
  END IF;

  -- ---- Cargar venta ----
  SELECT * INTO v_venta FROM crm.venta WHERE id = v_pago.venta_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta del pago no encontrada' USING ERRCODE = 'P0002';
  END IF;

  -- ---- Marcar pago anulado ----
  UPDATE crm.pago
     SET anulado = TRUE,
         anulado_por = p_username,
         fecha_anulacion = now(),
         motivo_anulacion = p_motivo
   WHERE id = p_pago_id;

  -- ---- Si tenia cuota_id, recalcular estado de la cuota ----
  IF v_pago.cuota_id IS NOT NULL THEN
    SELECT * INTO v_cuota FROM crm.cuota WHERE id = v_pago.cuota_id FOR UPDATE;
    IF FOUND THEN
      v_nuevo_pagado := GREATEST(0, v_cuota.monto_pagado - v_pago.monto);

      IF v_nuevo_pagado >= v_cuota.monto_programado THEN
        v_nuevo_estado := 'pagada';
      ELSIF v_nuevo_pagado > 0 THEN
        v_nuevo_estado := 'parcial';
      ELSIF v_cuota.fecha_vencimiento < CURRENT_DATE THEN
        v_nuevo_estado := 'vencida';
      ELSE
        v_nuevo_estado := 'pendiente';
      END IF;

      UPDATE crm.cuota SET
        monto_pagado = v_nuevo_pagado,
        estado = v_nuevo_estado,
        fecha_pago = CASE WHEN v_nuevo_estado = 'pagada' THEN fecha_pago ELSE NULL END,
        updated_at = now()
      WHERE id = v_pago.cuota_id;
    END IF;
  END IF;

  -- ---- Restaurar saldo de la venta ----
  v_nuevo_saldo := COALESCE(v_venta.saldo_pendiente, 0) + v_pago.monto;
  UPDATE crm.venta SET
    saldo_pendiente = v_nuevo_saldo,
    estado = CASE
      WHEN v_venta.estado = 'finalizada' AND v_nuevo_saldo > 0 THEN 'en_proceso'
      ELSE v_venta.estado
    END,
    updated_at = now()
  WHERE id = v_pago.venta_id;

  RETURN jsonb_build_object(
    'pago_id', p_pago_id,
    'cuota_id', v_pago.cuota_id,
    'venta_id', v_pago.venta_id,
    'monto_revertido', v_pago.monto,
    'cuota_estado', v_nuevo_estado,
    'venta_saldo_actualizado', v_nuevo_saldo
  );
END;
$$;

GRANT EXECUTE ON FUNCTION crm.anular_pago(UUID, VARCHAR, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.anular_pago(UUID, VARCHAR, TEXT) TO service_role;

COMMENT ON FUNCTION crm.anular_pago IS
  'Anula un pago: revierte monto en cuota y venta. Auditoria via columnas anulado_por/fecha_anulacion/motivo_anulacion.';

-- ============================================================
-- 3. Vista v_cobranza: actualizar para excluir pagos anulados
--    (la vista actual filtra por cuota.estado != pagada — sin cambios
--     necesarios; el trigger ya considera solo pagos no anulados al
--     sumar via la RPC. Excluir pagos anulados de cualquier listado de
--     pagos se hace con WHERE anulado = FALSE en server actions.)
-- ============================================================

COMMIT;
