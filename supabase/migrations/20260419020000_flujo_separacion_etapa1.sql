-- Etapa 1 del flujo Sperant: puente Pipeline -> Separacion -> Proceso Adquisicion.
-- Agrega el estado "en_proceso" al cliente, la forma_pago de la operacion en reserva,
-- la vigencia configurable por proyecto, y ajusta las RPCs para soportar salto
-- condicional de Calificacion Bancaria cuando es pago contado.

BEGIN;

-- Guard defensivo: el schema crm ya existe en esta base, pero evita fallos 3F000
-- si se aplica en un entorno dev/local sin las migraciones base.
CREATE SCHEMA IF NOT EXISTS crm;

-- ============================================================
-- 1. cliente.estado_cliente: agregar 'en_proceso'
--    El estado es reversible solo por rol privilegiado (misma regla que 'transferido').
-- ============================================================
ALTER TABLE crm.cliente
  DROP CONSTRAINT IF EXISTS cliente_estado_cliente_check;

ALTER TABLE crm.cliente
  ADD CONSTRAINT cliente_estado_cliente_check
  CHECK (estado_cliente IN (
    'por_contactar',
    'contactado',
    'intermedio',
    'potencial',
    'en_proceso',
    'desestimado',
    'transferido'
  ));

-- ============================================================
-- 2. reserva.forma_pago: tipo de financiamiento de la operacion total.
--    'contado', 'transferencia', 'deposito' -> saltan calificacion bancaria.
--    'credito_hipotecario', 'credito_directo' -> pasan por calificacion.
-- ============================================================
ALTER TABLE crm.reserva
  ADD COLUMN IF NOT EXISTS forma_pago VARCHAR(30);

ALTER TABLE crm.reserva
  DROP CONSTRAINT IF EXISTS reserva_forma_pago_check;

ALTER TABLE crm.reserva
  ADD CONSTRAINT reserva_forma_pago_check
  CHECK (forma_pago IS NULL OR forma_pago IN (
    'contado',
    'transferencia',
    'deposito',
    'credito_hipotecario',
    'credito_directo'
  ));

COMMENT ON COLUMN crm.reserva.forma_pago IS
  'Forma de pago de la operacion total. Determina si se saltea la etapa de Calificacion Bancaria en el proceso de adquisicion.';

-- ============================================================
-- 3. configuracion_proyecto_financiera.dias_vigencia_reserva:
--    vigencia de la reserva/separacion, configurable por proyecto (default 7).
-- ============================================================
ALTER TABLE crm.configuracion_proyecto_financiera
  ADD COLUMN IF NOT EXISTS dias_vigencia_reserva INTEGER NOT NULL DEFAULT 7;

COMMENT ON COLUMN crm.configuracion_proyecto_financiera.dias_vigencia_reserva IS
  'Dias de vigencia de la reserva/separacion antes de expirar.';

-- ============================================================
-- 4. RPC crear_proceso_desde_plantilla: acepta p_forma_pago.
--    Si forma_pago IN (contado/transferencia/deposito), la etapa
--    'calificacion_bancaria' se crea con estado 'omitida'.
-- ============================================================
DROP FUNCTION IF EXISTS crm.crear_proceso_desde_plantilla(UUID, UUID, UUID, VARCHAR, UUID);

CREATE OR REPLACE FUNCTION crm.crear_proceso_desde_plantilla(
  p_cliente_id        UUID,
  p_lote_id           UUID,
  p_reserva_id        UUID,
  p_vendedor_username VARCHAR,
  p_proyecto_id       UUID,
  p_forma_pago        VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_plantilla       RECORD;
  v_proceso_id      UUID;
  v_etapa           RECORD;
  v_etapa_id        UUID;
  v_item            RECORD;
  v_etapa_codigo    TEXT;
  v_orden           INT;
  v_estado_etapa    VARCHAR;
  v_salta_calif     BOOLEAN;
BEGIN
  v_salta_calif := p_forma_pago IN ('contado', 'transferencia', 'deposito');

  -- Buscar plantilla del proyecto; si no existe usar la global.
  SELECT * INTO v_plantilla
  FROM crm.plantilla_proceso
  WHERE (proyecto_id = p_proyecto_id OR proyecto_id IS NULL)
    AND activo = TRUE
  ORDER BY CASE WHEN proyecto_id = p_proyecto_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Fallback: etapas por defecto (mismo JSON que plantilla_proceso seed).
  IF NOT FOUND THEN
    v_plantilla.etapas := '[
      {"etapa": "separacion", "nombre": "Separacion", "orden": 1, "plazo_dias": 7, "checklist": [
        {"descripcion": "DNI del comprador", "obligatorio": true},
        {"descripcion": "Comprobante de pago de separacion", "obligatorio": true},
        {"descripcion": "Formulario de separacion firmado", "obligatorio": true}
      ]},
      {"etapa": "calificacion_bancaria", "nombre": "Calificacion Bancaria", "orden": 2, "plazo_dias": 30, "checklist": [
        {"descripcion": "Boletas de pago (3 ultimos meses)", "obligatorio": true},
        {"descripcion": "Estado de cuenta bancario", "obligatorio": true},
        {"descripcion": "DDJJ Renta", "obligatorio": true},
        {"descripcion": "Certificado de trabajo", "obligatorio": false},
        {"descripcion": "Carta de aprobacion del banco", "obligatorio": true}
      ]},
      {"etapa": "firma_contrato", "nombre": "Firma de Contrato", "orden": 3, "plazo_dias": 15, "checklist": [
        {"descripcion": "Minuta de compraventa", "obligatorio": true},
        {"descripcion": "Comprobante de cuota inicial", "obligatorio": true},
        {"descripcion": "Contrato firmado y escaneado", "obligatorio": true}
      ]},
      {"etapa": "desembolso", "nombre": "Desembolso", "orden": 4, "plazo_dias": 30, "checklist": [
        {"descripcion": "Carta de desembolso del banco", "obligatorio": true},
        {"descripcion": "Comprobante de transferencia", "obligatorio": true}
      ]}
    ]'::jsonb;
    v_plantilla.id := NULL;
  END IF;

  INSERT INTO crm.proceso_adquisicion (
    cliente_id, lote_id, reserva_id, plantilla_id,
    vendedor_username, etapa_actual, estado
  ) VALUES (
    p_cliente_id, p_lote_id, p_reserva_id, v_plantilla.id,
    p_vendedor_username, 'separacion', 'activo'
  ) RETURNING id INTO v_proceso_id;

  FOR v_etapa IN SELECT * FROM jsonb_array_elements(v_plantilla.etapas) AS e
  LOOP
    v_etapa_codigo := v_etapa.value->>'etapa';
    v_orden        := (v_etapa.value->>'orden')::INT;

    -- Estado inicial:
    --   - Primera etapa: 'en_progreso'.
    --   - calificacion_bancaria cuando forma_pago es cash: 'omitida'.
    --   - Resto: 'pendiente'.
    IF v_orden = 1 THEN
      v_estado_etapa := 'en_progreso';
    ELSIF v_etapa_codigo = 'calificacion_bancaria' AND v_salta_calif THEN
      v_estado_etapa := 'omitida';
    ELSE
      v_estado_etapa := 'pendiente';
    END IF;

    INSERT INTO crm.proceso_etapa (
      proceso_id, etapa, nombre, orden, estado,
      plazo_dias, responsable_username,
      fecha_inicio, fecha_limite, fecha_completada,
      notas
    ) VALUES (
      v_proceso_id,
      v_etapa_codigo,
      v_etapa.value->>'nombre',
      v_orden,
      v_estado_etapa,
      (v_etapa.value->>'plazo_dias')::INT,
      CASE WHEN v_orden = 1 THEN p_vendedor_username ELSE NULL END,
      CASE WHEN v_orden = 1 THEN now() ELSE NULL END,
      CASE WHEN v_orden = 1
        THEN CURRENT_DATE + ((v_etapa.value->>'plazo_dias')::INT || ' days')::INTERVAL
        ELSE NULL END,
      CASE WHEN v_estado_etapa = 'omitida' THEN now() ELSE NULL END,
      CASE WHEN v_estado_etapa = 'omitida'
        THEN 'Etapa omitida automaticamente: forma de pago ' || p_forma_pago
        ELSE NULL END
    ) RETURNING id INTO v_etapa_id;

    -- Checklist items solo para etapas NO omitidas.
    IF v_estado_etapa <> 'omitida' AND v_etapa.value->'checklist' IS NOT NULL THEN
      FOR v_item IN SELECT * FROM jsonb_array_elements(v_etapa.value->'checklist') AS c
      LOOP
        INSERT INTO crm.proceso_checklist_item (
          etapa_id, descripcion, obligatorio, orden
        ) VALUES (
          v_etapa_id,
          v_item.value->>'descripcion',
          COALESCE((v_item.value->>'obligatorio')::BOOLEAN, TRUE),
          COALESCE((v_item.value->>'orden')::INT, 0)
        );
      END LOOP;
    END IF;
  END LOOP;

  RETURN v_proceso_id;
END;
$$;

GRANT EXECUTE ON FUNCTION crm.crear_proceso_desde_plantilla(UUID, UUID, UUID, VARCHAR, UUID, VARCHAR) TO service_role;
GRANT EXECUTE ON FUNCTION crm.crear_proceso_desde_plantilla(UUID, UUID, UUID, VARCHAR, UUID, VARCHAR) TO authenticated;

COMMENT ON FUNCTION crm.crear_proceso_desde_plantilla IS
  'Crea proceso de adquisicion con etapas y checklist. Si p_forma_pago es contado/transferencia/deposito, marca calificacion_bancaria como omitida.';

-- ============================================================
-- 5. RPC mover_cliente_pipeline: aceptar 'en_proceso' y aplicar
--    la misma regla de salida privilegiada que 'transferido'.
-- ============================================================
CREATE OR REPLACE FUNCTION crm.mover_cliente_pipeline(
  p_cliente_id  UUID,
  p_estado_nuevo VARCHAR,
  p_motivo      TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = crm, public
AS $$
DECLARE
  v_user_id        UUID := auth.uid();
  v_username       TEXT;
  v_rol_nombre     TEXT;
  v_es_privilegiado BOOLEAN;
  v_estado_actual  VARCHAR;
  v_owner_userid   UUID;
  v_owner_username TEXT;
  v_es_owner       BOOLEAN;
  v_interaccion_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado' USING ERRCODE = '42501';
  END IF;

  IF p_estado_nuevo NOT IN (
    'por_contactar','contactado','intermedio','potencial','en_proceso','desestimado','transferido'
  ) THEN
    RAISE EXCEPTION 'Estado invalido: %', p_estado_nuevo USING ERRCODE = '22023';
  END IF;

  SELECT up.username, r.nombre
    INTO v_username, v_rol_nombre
  FROM crm.usuario_perfil up
  LEFT JOIN crm.rol r ON r.id = up.rol_id
  WHERE up.id = v_user_id;

  IF v_username IS NULL OR length(v_username) = 0 THEN
    RAISE EXCEPTION 'Usuario sin username configurado' USING ERRCODE = '42704';
  END IF;

  v_es_privilegiado := v_rol_nombre IN ('ROL_ADMIN','ROL_GERENTE','ROL_COORDINADOR_VENTAS');

  SELECT estado_cliente, created_by, vendedor_username
    INTO v_estado_actual, v_owner_userid, v_owner_username
  FROM crm.cliente
  WHERE id = p_cliente_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente no encontrado' USING ERRCODE = 'P0002';
  END IF;

  v_es_owner := (v_owner_userid = v_user_id) OR (v_owner_username = v_username);

  IF NOT (v_es_privilegiado OR v_es_owner) THEN
    RAISE EXCEPTION 'No tiene permisos sobre este cliente' USING ERRCODE = '42501';
  END IF;

  -- Regla: salir de 'transferido' o 'en_proceso' requiere rol privilegiado.
  IF v_estado_actual IN ('transferido', 'en_proceso')
     AND p_estado_nuevo <> v_estado_actual
     AND NOT v_es_privilegiado THEN
    RAISE EXCEPTION 'Solo administradores pueden revertir un cliente en estado %', v_estado_actual
      USING ERRCODE = '42501';
  END IF;

  -- Regla: pasar a 'desestimado' exige motivo.
  IF p_estado_nuevo = 'desestimado'
     AND (p_motivo IS NULL OR length(btrim(p_motivo)) = 0) THEN
    RAISE EXCEPTION 'Debe indicar un motivo para desestimar el cliente'
      USING ERRCODE = '22023';
  END IF;

  IF v_estado_actual = p_estado_nuevo THEN
    RETURN jsonb_build_object(
      'ok', true,
      'cambiado', false,
      'estado_actual', v_estado_actual
    );
  END IF;

  UPDATE crm.cliente
     SET estado_cliente = p_estado_nuevo,
         updated_at     = now()
   WHERE id = p_cliente_id;

  INSERT INTO crm.cliente_interaccion (
    cliente_id, vendedor_username, tipo, notas,
    estado_anterior, estado_nuevo,
    fecha_interaccion, created_at
  ) VALUES (
    p_cliente_id, v_username, 'cambio_estado', p_motivo,
    v_estado_actual, p_estado_nuevo,
    now(), now()
  )
  RETURNING id INTO v_interaccion_id;

  RETURN jsonb_build_object(
    'ok', true,
    'cambiado', true,
    'estado_anterior', v_estado_actual,
    'estado_nuevo', p_estado_nuevo,
    'interaccion_id', v_interaccion_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION crm.mover_cliente_pipeline(UUID, VARCHAR, TEXT) TO authenticated;

COMMENT ON FUNCTION crm.mover_cliente_pipeline(UUID, VARCHAR, TEXT) IS
  'Mueve cliente entre estados del pipeline con auditoria. Reglas: motivo obligatorio para desestimado, salir de transferido o en_proceso solo admin.';

COMMIT;
