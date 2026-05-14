-- Tabla crm.push_subscription: almacena suscripciones Web Push por usuario.
-- Usada por src/lib/pushClient.ts (upsert al aceptar permiso) y por
-- src/lib/notificationsDelivery.ts (lectura para enviar push). No estaba en
-- ninguna migración previa — se asume creada manualmente. Esta mig la formaliza
-- de forma idempotente.

BEGIN;

CREATE TABLE IF NOT EXISTS crm.push_subscription (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscription_usuario
  ON crm.push_subscription (usuario_id);

ALTER TABLE crm.push_subscription ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios gestionan sus suscripciones push" ON crm.push_subscription;
CREATE POLICY "Usuarios gestionan sus suscripciones push" ON crm.push_subscription
  FOR ALL
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Trigger updated_at
CREATE OR REPLACE FUNCTION crm.touch_push_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_push_subscription_updated_at ON crm.push_subscription;
CREATE TRIGGER trg_touch_push_subscription_updated_at
BEFORE UPDATE ON crm.push_subscription
FOR EACH ROW
EXECUTE FUNCTION crm.touch_push_subscription_updated_at();

COMMIT;
