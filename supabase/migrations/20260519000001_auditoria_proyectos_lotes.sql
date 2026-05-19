-- Auditoría de cambios en crm.proyecto y crm.lote.
--
-- Captura INSERT/UPDATE/DELETE vía triggers AFTER. En UPDATE guarda solo
-- las columnas que efectivamente cambiaron (formato {col: {old, new}}),
-- omitiendo metadata de timestamps. En INSERT/DELETE guarda la fila entera
-- (sin created_at/updated_at). proyecto_id queda denormalizado para queries
-- por proyecto incluso cuando la entidad es lote.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tabla de auditoría
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm.auditoria_proyecto_lote (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_tipo     VARCHAR(20)  NOT NULL CHECK (entidad_tipo IN ('proyecto', 'lote')),
  entidad_id       UUID         NOT NULL,
  accion           VARCHAR(20)  NOT NULL CHECK (accion IN ('insert', 'update', 'delete')),
  usuario_id       UUID         NULL,
  usuario_username TEXT         NULL,
  cambios          JSONB        NULL,
  proyecto_id      UUID         NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  crm.auditoria_proyecto_lote                  IS 'Bitácora de cambios sobre crm.proyecto y crm.lote (alimentada por triggers).';
COMMENT ON COLUMN crm.auditoria_proyecto_lote.cambios          IS 'INSERT: row completa sin created_at/updated_at. UPDATE: {col: {old, new}} solo cols cambiadas. DELETE: row completa sin created_at/updated_at.';
COMMENT ON COLUMN crm.auditoria_proyecto_lote.proyecto_id      IS 'Denormalizado: id del proyecto contenedor (igual a entidad_id cuando entidad_tipo=proyecto).';

CREATE INDEX IF NOT EXISTS idx_auditoria_pl_entidad
  ON crm.auditoria_proyecto_lote (entidad_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_pl_proyecto
  ON crm.auditoria_proyecto_lote (proyecto_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_auditoria_pl_usuario
  ON crm.auditoria_proyecto_lote (usuario_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Función trigger
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION crm.fn_auditoria_proyecto_lote()
RETURNS TRIGGER AS $$
DECLARE
  v_entidad_tipo   VARCHAR(20);
  v_entidad_id     UUID;
  v_proyecto_id    UUID;
  v_accion         VARCHAR(20);
  v_usuario_id     UUID;
  v_username       TEXT;
  v_cambios        JSONB;
  v_old_json       JSONB;
  v_new_json       JSONB;
  v_key            TEXT;
  v_diff           JSONB := '{}'::JSONB;
  -- Columnas excluidas del diff (metadata interna)
  v_excluded_keys  TEXT[] := ARRAY['created_at', 'updated_at'];
BEGIN
  -- Tipo de entidad por nombre de tabla
  IF TG_TABLE_NAME = 'proyecto' THEN
    v_entidad_tipo := 'proyecto';
  ELSIF TG_TABLE_NAME = 'lote' THEN
    v_entidad_tipo := 'lote';
  ELSE
    RETURN NULL;
  END IF;

  -- Acción según operación
  IF TG_OP = 'INSERT' THEN
    v_accion := 'insert';
  ELSIF TG_OP = 'UPDATE' THEN
    v_accion := 'update';
  ELSIF TG_OP = 'DELETE' THEN
    v_accion := 'delete';
  ELSE
    RETURN NULL;
  END IF;

  -- entidad_id + proyecto_id según operación y tipo
  IF TG_OP = 'DELETE' THEN
    v_entidad_id := (to_jsonb(OLD)->>'id')::UUID;
    IF v_entidad_tipo = 'lote' THEN
      v_proyecto_id := (to_jsonb(OLD)->>'proyecto_id')::UUID;
    ELSE
      v_proyecto_id := v_entidad_id;
    END IF;
  ELSE
    v_entidad_id := (to_jsonb(NEW)->>'id')::UUID;
    IF v_entidad_tipo = 'lote' THEN
      v_proyecto_id := (to_jsonb(NEW)->>'proyecto_id')::UUID;
    ELSE
      v_proyecto_id := v_entidad_id;
    END IF;
  END IF;

  -- Usuario: auth.uid() puede ser NULL si el cambio viene de un proceso bg
  BEGIN
    v_usuario_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_usuario_id := NULL;
  END;

  IF v_usuario_id IS NOT NULL THEN
    SELECT up.username INTO v_username
    FROM crm.usuario_perfil up
    WHERE up.id = v_usuario_id
    LIMIT 1;
  END IF;

  -- Construir cambios según operación
  IF TG_OP = 'INSERT' THEN
    v_new_json := to_jsonb(NEW);
    -- Remover keys excluidas
    FOREACH v_key IN ARRAY v_excluded_keys LOOP
      v_new_json := v_new_json - v_key;
    END LOOP;
    v_cambios := v_new_json;

  ELSIF TG_OP = 'DELETE' THEN
    v_old_json := to_jsonb(OLD);
    FOREACH v_key IN ARRAY v_excluded_keys LOOP
      v_old_json := v_old_json - v_key;
    END LOOP;
    v_cambios := v_old_json;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);

    FOR v_key IN SELECT jsonb_object_keys(v_new_json) LOOP
      -- Saltear keys excluidas
      IF v_key = ANY (v_excluded_keys) THEN
        CONTINUE;
      END IF;

      -- IS DISTINCT FROM maneja NULL correctamente
      IF v_old_json->v_key IS DISTINCT FROM v_new_json->v_key THEN
        v_diff := v_diff || jsonb_build_object(
          v_key,
          jsonb_build_object(
            'old', v_old_json->v_key,
            'new', v_new_json->v_key
          )
        );
      END IF;
    END LOOP;

    -- Si nada relevante cambió, no guardamos fila
    IF v_diff = '{}'::JSONB THEN
      RETURN NULL;
    END IF;

    v_cambios := v_diff;
  END IF;

  INSERT INTO crm.auditoria_proyecto_lote (
    entidad_tipo,
    entidad_id,
    accion,
    usuario_id,
    usuario_username,
    cambios,
    proyecto_id
  ) VALUES (
    v_entidad_tipo,
    v_entidad_id,
    v_accion,
    v_usuario_id,
    v_username,
    v_cambios,
    v_proyecto_id
  );

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, public;

COMMENT ON FUNCTION crm.fn_auditoria_proyecto_lote() IS 'Trigger AFTER que registra cambios de crm.proyecto y crm.lote en crm.auditoria_proyecto_lote.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Triggers
-- ─────────────────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS auditoria_proyecto_aiud ON crm.proyecto;
CREATE TRIGGER auditoria_proyecto_aiud
  AFTER INSERT OR UPDATE OR DELETE ON crm.proyecto
  FOR EACH ROW
  EXECUTE FUNCTION crm.fn_auditoria_proyecto_lote();

DROP TRIGGER IF EXISTS auditoria_lote_aiud ON crm.lote;
CREATE TRIGGER auditoria_lote_aiud
  AFTER INSERT OR UPDATE OR DELETE ON crm.lote
  FOR EACH ROW
  EXECUTE FUNCTION crm.fn_auditoria_proyecto_lote();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — SELECT admin/coordinador; INSERT bloqueado para clientes (lo hace
--    el trigger en contexto SECURITY DEFINER)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE crm.auditoria_proyecto_lote ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auditoria_proyecto_lote_select_admin_coord ON crm.auditoria_proyecto_lote;
CREATE POLICY auditoria_proyecto_lote_select_admin_coord ON crm.auditoria_proyecto_lote
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre IN ('ROL_ADMIN', 'ROL_COORDINADOR_VENTAS')
    )
  );

-- Sin policies para INSERT/UPDATE/DELETE: RLS bloquea por defecto a clientes.
-- El trigger usa SECURITY DEFINER y owner del schema crm, por lo que bypasea RLS.

GRANT SELECT ON crm.auditoria_proyecto_lote TO authenticated;

COMMIT;
