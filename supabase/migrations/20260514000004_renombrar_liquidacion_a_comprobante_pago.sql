-- Renombrar "Liquidación de haberes" → "Comprobante de pago" en etapa desembolso.

BEGIN;

-- 1. Plantilla seed (plantilla_proceso.etapas)
UPDATE crm.plantilla_proceso
SET etapas = (
  SELECT jsonb_agg(
    CASE WHEN e->>'etapa' = 'desembolso' THEN
      jsonb_set(e, '{checklist}', (
        SELECT jsonb_agg(
          CASE WHEN item->>'descripcion' IN ('Liquidación de haberes', 'Liquidacion de haberes')
            THEN jsonb_set(item, '{descripcion}', '"Comprobante de pago"'::jsonb)
            ELSE item
          END
        )
        FROM jsonb_array_elements(e->'checklist') AS item
      ))
    ELSE e
    END
  )
  FROM jsonb_array_elements(etapas) AS e
)
WHERE etapas::text LIKE '%iquidaci%n de haberes%';

-- 2. Items ya materializados
UPDATE crm.proceso_checklist_item
SET descripcion = 'Comprobante de pago'
WHERE descripcion IN ('Liquidación de haberes', 'Liquidacion de haberes')
  AND etapa_id IN (
    SELECT id FROM crm.proceso_etapa WHERE etapa = 'desembolso'
  );

COMMIT;
