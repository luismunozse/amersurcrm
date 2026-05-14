-- Quitar "Carta de desembolso del banco" del checklist del proceso de adquisición.
-- Razón: ítem no aplica al proceso. Queda solo "Comprobante de transferencia"
-- (+ "Liquidación de haberes" opcional) en etapa desembolso.

BEGIN;

-- 1. Plantilla seed (plantilla_proceso.etapas)
UPDATE crm.plantilla_proceso
SET etapas = (
  SELECT jsonb_agg(
    CASE WHEN e->>'etapa' = 'desembolso' THEN
      jsonb_set(e, '{checklist}', COALESCE((
        SELECT jsonb_agg(item)
        FROM jsonb_array_elements(e->'checklist') AS item
        WHERE item->>'descripcion' != 'Carta de desembolso del banco'
      ), '[]'::jsonb))
    ELSE e
    END
  )
  FROM jsonb_array_elements(etapas) AS e
)
WHERE etapas::text LIKE '%Carta de desembolso del banco%';

-- 2. Items ya materializados en procesos activos
DELETE FROM crm.proceso_checklist_item
WHERE descripcion = 'Carta de desembolso del banco'
  AND etapa_id IN (
    SELECT id FROM crm.proceso_etapa WHERE etapa = 'desembolso'
  );

COMMIT;
