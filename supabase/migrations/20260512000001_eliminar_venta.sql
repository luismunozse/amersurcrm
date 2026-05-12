-- RPC eliminar_venta: revierte una venta de forma atómica.
-- - Si la venta tiene pagos no anulados → bloquea (debe anular pagos primero).
-- - DELETE cuotas, comisiones, venta.
-- - Lote: vendido → disponible.
-- - Reserva (si existe): convertida_venta → activa.
-- - Proceso_adquisicion (si existe): completado → activo, etapa desembolso → pendiente.
-- - Cliente: propietario → en_proceso (si tenía proceso) o potencial.
-- Restringido a rol privilegiado (ROL_ADMIN, ROL_GERENTE, ROL_COORDINADOR_VENTAS).

BEGIN;

CREATE OR REPLACE FUNCTION crm.eliminar_venta(
  p_venta_id UUID,
  p_motivo   TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_username      TEXT;
  v_rol_nombre    TEXT;
  v_venta         RECORD;
  v_proceso       RECORD;
  v_reserva       RECORD;
  v_pagos_count   INTEGER;
  v_comisiones_count INTEGER;
  v_estado_destino VARCHAR;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  SELECT up.username, r.nombre
    INTO v_username, v_rol_nombre
  FROM crm.usuario_perfil up
  LEFT JOIN crm.rol r ON r.id = up.rol_id
  WHERE up.id = v_user_id;

  IF v_rol_nombre NOT IN ('ROL_ADMIN','ROL_GERENTE','ROL_COORDINADOR_VENTAS') THEN
    RAISE EXCEPTION 'Solo administradores pueden eliminar ventas' USING ERRCODE = '42501';
  END IF;

  -- Cargar venta
  SELECT * INTO v_venta FROM crm.venta WHERE id = p_venta_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venta no encontrada' USING ERRCODE = 'P0002';
  END IF;

  -- Bloquear si hay pagos no anulados
  SELECT COUNT(*) INTO v_pagos_count
  FROM crm.pago
  WHERE venta_id = p_venta_id AND COALESCE(anulado, FALSE) = FALSE;

  IF v_pagos_count > 0 THEN
    RAISE EXCEPTION 'No se puede eliminar la venta: tiene % pago(s) activo(s). Anule los pagos primero.', v_pagos_count
      USING ERRCODE = '42501';
  END IF;

  -- Cargar reserva y proceso asociados
  IF v_venta.reserva_id IS NOT NULL THEN
    SELECT * INTO v_reserva FROM crm.reserva WHERE id = v_venta.reserva_id FOR UPDATE;
  END IF;

  SELECT * INTO v_proceso
  FROM crm.proceso_adquisicion
  WHERE venta_id = p_venta_id
  FOR UPDATE;

  -- ---- Borrar cuotas (incluso anuladas) ----
  DELETE FROM crm.cuota WHERE venta_id = p_venta_id;

  -- ---- Borrar pagos anulados de la venta (los activos ya bloquearon arriba) ----
  DELETE FROM crm.pago WHERE venta_id = p_venta_id;

  -- ---- Borrar comisiones asociadas ----
  SELECT COUNT(*) INTO v_comisiones_count
  FROM crm.comision
  WHERE venta_id = p_venta_id;

  DELETE FROM crm.comision WHERE venta_id = p_venta_id;

  -- ---- Desvincular y borrar la venta ----
  -- Desvincular proceso antes para no romper FK
  IF v_proceso.id IS NOT NULL THEN
    UPDATE crm.proceso_adquisicion
       SET venta_id = NULL,
           estado = 'activo',
           fecha_cierre = NULL,
           updated_at = now()
     WHERE id = v_proceso.id;

    -- Revertir etapa desembolso a pendiente
    UPDATE crm.proceso_etapa
       SET estado = 'pendiente',
           fecha_completada = NULL
     WHERE proceso_id = v_proceso.id
       AND etapa = 'desembolso';
  END IF;

  DELETE FROM crm.venta WHERE id = p_venta_id;

  -- ---- Revertir lote: vendido -> disponible o reservado ----
  IF v_venta.lote_id IS NOT NULL THEN
    UPDATE crm.lote
       SET estado = CASE
             WHEN v_reserva.id IS NOT NULL AND v_reserva.estado IN ('activa','convertida_venta')
               THEN 'reservado'
             ELSE 'disponible'
           END,
           updated_at = now()
     WHERE id = v_venta.lote_id;
  END IF;

  -- ---- Revertir reserva: convertida_venta -> activa ----
  IF v_reserva.id IS NOT NULL AND v_reserva.estado = 'convertida_venta' THEN
    UPDATE crm.reserva
       SET estado = 'activa',
           updated_at = now()
     WHERE id = v_reserva.id;
  END IF;

  -- ---- Revertir estado del cliente ----
  -- Si tiene proceso activo después de revertir: en_proceso. Si no: potencial.
  v_estado_destino := CASE
    WHEN v_proceso.id IS NOT NULL THEN 'en_proceso'
    ELSE 'potencial'
  END;

  UPDATE crm.cliente
     SET estado_cliente = v_estado_destino,
         updated_at = now()
   WHERE id = v_venta.cliente_id;

  -- Auditoría: registrar cambio_estado en interacciones
  INSERT INTO crm.cliente_interaccion (
    cliente_id, vendedor_username, tipo, notas,
    estado_anterior, estado_nuevo,
    fecha_interaccion, created_at
  ) VALUES (
    v_venta.cliente_id,
    v_username,
    'cambio_estado',
    COALESCE('Venta eliminada (' || v_venta.codigo_venta || '): ' || p_motivo, 'Venta eliminada: ' || v_venta.codigo_venta),
    'propietario',
    v_estado_destino,
    now(),
    now()
  );

  RETURN jsonb_build_object(
    'ok', true,
    'venta_id', p_venta_id,
    'codigo_venta', v_venta.codigo_venta,
    'cliente_id', v_venta.cliente_id,
    'lote_id', v_venta.lote_id,
    'reserva_revertida', v_reserva.id IS NOT NULL,
    'proceso_revertido', v_proceso.id IS NOT NULL,
    'comisiones_eliminadas', v_comisiones_count,
    'estado_cliente_nuevo', v_estado_destino
  );
END;
$$;

GRANT EXECUTE ON FUNCTION crm.eliminar_venta(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION crm.eliminar_venta(UUID, TEXT) TO service_role;

COMMENT ON FUNCTION crm.eliminar_venta IS
  'Elimina venta atomica: borra cuotas+pagos(anulados)+comisiones+venta, libera lote, revierte reserva/proceso/cliente. Bloquea si hay pagos activos. Solo admin/gerente/coordinador.';

COMMIT;
