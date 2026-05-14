-- Centro de alertas in-app para módulo Reportes.
--
-- Sistema de reglas evaluadas por cron (Vercel Cron @ */30 min) que crean
-- notificaciones en `crm.notificacion` cuando una métrica cruza un umbral.
-- Sin canales externos (email/WhatsApp deshabilitados); reutiliza la
-- campana de notificaciones existente del CRM.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Reglas configurables (por ahora 3 built-in fijas, sin UI custom)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm.reporte_alerta_regla (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo              TEXT        NOT NULL UNIQUE,
  nombre              TEXT        NOT NULL,
  descripcion         TEXT        NOT NULL,
  metrica             TEXT        NOT NULL,
  umbral              NUMERIC     NOT NULL,
  comparacion         TEXT        NOT NULL CHECK (comparacion IN ('<', '>', '<=', '>=')),
  ventana_dias        INT         NOT NULL DEFAULT 1,
  activo              BOOLEAN     NOT NULL DEFAULT TRUE,
  cooldown_horas      INT         NOT NULL DEFAULT 24,
  destinatarios_roles TEXT[]      NOT NULL DEFAULT ARRAY['ROL_ADMIN', 'ROL_GERENTE'],
  ultimo_disparo_at   TIMESTAMPTZ NULL,
  ultima_eval_at      TIMESTAMPTZ NULL,
  ultimo_valor        NUMERIC     NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  crm.reporte_alerta_regla IS 'Reglas de alertas in-app para módulo Reportes. Built-in seed de 3 reglas; sin UI custom inicial.';
COMMENT ON COLUMN crm.reporte_alerta_regla.codigo IS 'Identificador estable usado por el evaluador (ej. leads_diarios_caida).';
COMMENT ON COLUMN crm.reporte_alerta_regla.metrica IS 'Categoría lógica (mismo valor que codigo en built-in iniciales).';
COMMENT ON COLUMN crm.reporte_alerta_regla.cooldown_horas IS 'Tiempo mínimo entre disparos consecutivos para evitar spam.';
COMMENT ON COLUMN crm.reporte_alerta_regla.ultimo_valor IS 'Último valor observado por el evaluador (haya disparado o no).';

CREATE INDEX IF NOT EXISTS idx_reporte_alerta_regla_activo
  ON crm.reporte_alerta_regla (activo)
  WHERE activo = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Historial de disparos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm.reporte_alerta_disparo (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  regla_id                 UUID        NOT NULL REFERENCES crm.reporte_alerta_regla(id) ON DELETE CASCADE,
  valor_observado          NUMERIC     NOT NULL,
  umbral_evaluado          NUMERIC     NOT NULL,
  notificaciones_creadas   INT         NOT NULL DEFAULT 0,
  detalle                  JSONB       NULL,
  fecha_disparo            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE crm.reporte_alerta_disparo IS 'Log de cada vez que una regla de alerta disparó.';

CREATE INDEX IF NOT EXISTS idx_reporte_alerta_disparo_regla_fecha
  ON crm.reporte_alerta_disparo (regla_id, fecha_disparo DESC);

CREATE INDEX IF NOT EXISTS idx_reporte_alerta_disparo_fecha
  ON crm.reporte_alerta_disparo (fecha_disparo DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Trigger updated_at
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION crm.set_reporte_alerta_regla_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reporte_alerta_regla_set_updated_at ON crm.reporte_alerta_regla;
CREATE TRIGGER reporte_alerta_regla_set_updated_at
  BEFORE UPDATE ON crm.reporte_alerta_regla
  FOR EACH ROW
  EXECUTE FUNCTION crm.set_reporte_alerta_regla_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. RLS — admin/gerente lee+escribe; otros roles bloqueados
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE crm.reporte_alerta_regla    ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.reporte_alerta_disparo  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reporte_alerta_regla_admin_all ON crm.reporte_alerta_regla;
CREATE POLICY reporte_alerta_regla_admin_all ON crm.reporte_alerta_regla
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre IN ('ROL_ADMIN', 'ROL_GERENTE')
    )
  );

DROP POLICY IF EXISTS reporte_alerta_disparo_admin_select ON crm.reporte_alerta_disparo;
CREATE POLICY reporte_alerta_disparo_admin_select ON crm.reporte_alerta_disparo
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crm.usuario_perfil up
      JOIN crm.rol r ON r.id = up.rol_id
      WHERE up.id = auth.uid()
        AND r.nombre IN ('ROL_ADMIN', 'ROL_GERENTE')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON crm.reporte_alerta_regla   TO authenticated;
GRANT SELECT                          ON crm.reporte_alerta_disparo TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seed: 3 reglas built-in iniciales
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO crm.reporte_alerta_regla
  (codigo, nombre, descripcion, metrica, umbral, comparacion, ventana_dias, cooldown_horas, destinatarios_roles)
VALUES
  (
    'leads_diarios_caida',
    'Caída de leads del día',
    'Dispara cuando los leads captados hoy son menos del 50% del promedio diario de los últimos 7 días.',
    'leads_diarios_caida',
    0.5,                             -- umbral relativo: ratio hoy/promedio
    '<',
    1,
    24,
    ARRAY['ROL_ADMIN', 'ROL_GERENTE']
  ),
  (
    'ventas_semana_cero',
    'Sin ventas en 7 días',
    'Dispara cuando no se ha registrado ninguna venta en los últimos 7 días.',
    'ventas_semana_cero',
    0,                               -- umbral absoluto: cantidad de ventas
    '<=',
    7,
    72,
    ARRAY['ROL_ADMIN', 'ROL_GERENTE']
  ),
  (
    'cobranza_atrasada_critica',
    'Cobranza al límite',
    'Dispara cuando hay más de 5 cuotas vencidas hoy comparado con ayer.',
    'cobranza_atrasada_critica',
    5,                               -- umbral absoluto: incremento de cuotas vencidas
    '>',
    1,
    24,
    ARRAY['ROL_ADMIN', 'ROL_GERENTE']
  )
ON CONFLICT (codigo) DO NOTHING;

COMMIT;
