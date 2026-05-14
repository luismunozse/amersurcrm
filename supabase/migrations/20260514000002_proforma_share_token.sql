-- Token público para compartir proforma vía URL del dominio CRM.
-- Ruta /p/proforma/<token> hace proxy al PDF en Storage.
-- Esconde Supabase URL al cliente final.

BEGIN;

ALTER TABLE crm.proforma
  ADD COLUMN IF NOT EXISTS pdf_share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS pdf_share_expira_en TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_proforma_share_token
  ON crm.proforma(pdf_share_token)
  WHERE pdf_share_token IS NOT NULL;

COMMENT ON COLUMN crm.proforma.pdf_share_token IS
  'Token público (base64url) usado en /p/proforma/<token>. NULL si no se compartió.';
COMMENT ON COLUMN crm.proforma.pdf_share_expira_en IS
  'Vencimiento del enlace público. NULL = sin vencer.';

COMMIT;
