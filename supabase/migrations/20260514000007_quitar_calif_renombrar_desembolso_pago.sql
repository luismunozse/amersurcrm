-- Proceso de adquisición:
--   - Quitar etapa "calificacion_bancaria" (módulo standalone queda, ya no es etapa).
--   - Renombrar visualmente "Desembolso" → "Pago" (mantiene la clave interna
--     'desembolso' para no romper RPCs hardcoded: cerrar_proceso_y_crear_venta,
--     generar_comisiones_cierre_venta, etc.).
-- Quedan 3 etapas: separacion (1) · firma_contrato (2) · desembolso/"Pago" (3).

BEGIN;

-- ──────────────────────────────────────────────────────────────────────
-- 1. Plantilla seed
-- ──────────────────────────────────────────────────────────────────────

UPDATE crm.plantilla_proceso
SET etapas = '[
  {"etapa": "separacion", "nombre": "Separación", "orden": 1, "plazo_dias": 7, "checklist": [
    {"descripcion": "DNI del comprador", "obligatorio": true, "orden": 1},
    {"descripcion": "Comprobante de pago de separación", "obligatorio": true, "orden": 2},
    {"descripcion": "Formulario de separación firmado", "obligatorio": true, "orden": 3}
  ]},
  {"etapa": "firma_contrato", "nombre": "Firma de Contrato", "orden": 2, "plazo_dias": 15, "checklist": [
    {"descripcion": "Minuta de compraventa redactada", "obligatorio": true, "orden": 1},
    {"descripcion": "Comprobante de cuota inicial", "obligatorio": true, "orden": 2},
    {"descripcion": "Contrato firmado y escaneado", "obligatorio": true, "orden": 3},
    {"descripcion": "Copia literal de la propiedad", "obligatorio": false, "orden": 4}
  ]},
  {"etapa": "desembolso", "nombre": "Pago", "orden": 3, "plazo_dias": 30, "checklist": [
    {"descripcion": "Comprobante de pago", "obligatorio": true, "orden": 1}
  ]}
]'::jsonb;

-- ──────────────────────────────────────────────────────────────────────
-- 2. Procesos activos
-- ──────────────────────────────────────────────────────────────────────

-- 2a. Eliminar etapas calificacion_bancaria (CASCADE borra checklist_item por FK)
DELETE FROM crm.proceso_etapa WHERE etapa = 'calificacion_bancaria';

-- 2b. Renombrar label visual de etapa desembolso (clave queda igual)
UPDATE crm.proceso_etapa
SET nombre = 'Pago'
WHERE etapa = 'desembolso';

-- 2c. Reordenar etapas restantes (1, 2, 3 por proceso)
WITH ordenadas AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY proceso_id ORDER BY orden, created_at) AS nuevo_orden
  FROM crm.proceso_etapa
)
UPDATE crm.proceso_etapa pe
SET orden = o.nuevo_orden
FROM ordenadas o
WHERE pe.id = o.id
  AND pe.orden != o.nuevo_orden;

-- 2d. Procesos que estaban en calificacion_bancaria → pasar a firma_contrato
UPDATE crm.proceso_adquisicion
SET etapa_actual = 'firma_contrato'
WHERE etapa_actual = 'calificacion_bancaria';

-- ──────────────────────────────────────────────────────────────────────
-- 3. Reemplazar función crear_proceso_desde_plantilla
--    (quita lógica de salto de calificación bancaria)
-- ──────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS crm.crear_proceso_desde_plantilla(UUID, UUID, UUID, VARCHAR, UUID, VARCHAR);

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
  v_plantilla    RECORD;
  v_proceso_id   UUID;
  v_etapa        RECORD;
  v_etapa_id     UUID;
  v_item         RECORD;
  v_etapa_codigo TEXT;
  v_orden        INT;
  v_estado_etapa VARCHAR;
BEGIN
  SELECT * INTO v_plantilla
  FROM crm.plantilla_proceso
  WHERE (proyecto_id = p_proyecto_id OR proyecto_id IS NULL)
    AND activo = TRUE
  ORDER BY CASE WHEN proyecto_id = p_proyecto_id THEN 0 ELSE 1 END
  LIMIT 1;

  -- Fallback si no hay plantilla
  IF NOT FOUND THEN
    v_plantilla.etapas := '[
      {"etapa": "separacion", "nombre": "Separación", "orden": 1, "plazo_dias": 7, "checklist": [
        {"descripcion": "DNI del comprador", "obligatorio": true},
        {"descripcion": "Comprobante de pago de separación", "obligatorio": true},
        {"descripcion": "Formulario de separación firmado", "obligatorio": true}
      ]},
      {"etapa": "firma_contrato", "nombre": "Firma de Contrato", "orden": 2, "plazo_dias": 15, "checklist": [
        {"descripcion": "Minuta de compraventa redactada", "obligatorio": true},
        {"descripcion": "Comprobante de cuota inicial", "obligatorio": true},
        {"descripcion": "Contrato firmado y escaneado", "obligatorio": true}
      ]},
      {"etapa": "desembolso", "nombre": "Pago", "orden": 3, "plazo_dias": 30, "checklist": [
        {"descripcion": "Comprobante de pago", "obligatorio": true}
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
    v_estado_etapa := CASE WHEN v_orden = 1 THEN 'en_progreso' ELSE 'pendiente' END;

    INSERT INTO crm.proceso_etapa (
      proceso_id, etapa, nombre, orden, estado,
      plazo_dias, responsable_username,
      fecha_inicio, fecha_limite
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
        ELSE NULL END
    ) RETURNING id INTO v_etapa_id;

    IF v_etapa.value->'checklist' IS NOT NULL THEN
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
  'Crea proceso de adquisición con etapas separación → firma_contrato → desembolso (label "Pago"). Calificación bancaria queda como módulo standalone.';

COMMIT;
