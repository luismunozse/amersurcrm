-- =====================================================
-- Patch Twilio marketing_mensaje support
-- =====================================================
-- 1. Garantiza que la columna tw_message_sid exista
-- 2. Crea un índice para búsquedas por SID
-- 3. Ajusta las políticas RLS para permitir inserts desde el servidor
-- =====================================================

BEGIN;

ALTER TABLE crm.marketing_mensaje
ADD COLUMN IF NOT EXISTS tw_message_sid VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_marketing_mensaje_tw_message_sid
ON crm.marketing_mensaje(tw_message_sid);

COMMENT ON COLUMN crm.marketing_mensaje.tw_message_sid IS
'Message SID de Twilio (ej: SMxxxxxxx). Se usa cuando los mensajes se envían vía Twilio en lugar de Meta directo.';

DROP POLICY IF EXISTS marketing_mensaje_envio_insert ON crm.marketing_mensaje;

CREATE POLICY marketing_mensaje_envio_insert
ON crm.marketing_mensaje
FOR INSERT
TO authenticated
WITH CHECK (
  -- Admins, coordinadores o gerentes pueden registrar mensajes enviados por Twilio
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE up.id = auth.uid()
      AND r.nombre IN ('ROL_ADMIN', 'ROL_COORDINADOR_VENTAS', 'ROL_GERENTE')
  )
  OR
  -- Vendedores asignados a la conversación también pueden insertar mensajes
  EXISTS (
    SELECT 1
    FROM crm.marketing_conversacion c
    JOIN crm.usuario_perfil up ON up.username::text = c.vendedor_asignado::text
    WHERE c.id = marketing_mensaje.conversacion_id
      AND up.id = auth.uid()
  )
);

COMMIT;
