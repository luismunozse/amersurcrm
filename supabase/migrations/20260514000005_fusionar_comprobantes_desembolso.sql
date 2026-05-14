-- Fusionar "Comprobante de transferencia" + "Comprobante de pago" en etapa desembolso.
-- Queda solo "Comprobante de pago" (obligatorio).

BEGIN;

-- 1. Plantilla seed: reemplazar checklist de etapa desembolso
UPDATE crm.plantilla_proceso
SET etapas = (
  SELECT jsonb_agg(
    CASE WHEN e->>'etapa' = 'desembolso' THEN
      jsonb_set(e, '{checklist}', '[
        {"descripcion": "Comprobante de pago", "obligatorio": true, "orden": 1}
      ]'::jsonb)
    ELSE e
    END
  )
  FROM jsonb_array_elements(etapas) AS e
)
WHERE etapas::text LIKE '%Comprobante de transferencia%'
   OR etapas::text LIKE '%Comprobante de pago%';

-- 2. Procesos activos
-- 2a. Si coexisten ambos en la misma etapa, borrar "Comprobante de transferencia"
DELETE FROM crm.proceso_checklist_item ci_t
WHERE ci_t.descripcion = 'Comprobante de transferencia'
  AND ci_t.etapa_id IN (SELECT id FROM crm.proceso_etapa WHERE etapa = 'desembolso')
  AND EXISTS (
    SELECT 1 FROM crm.proceso_checklist_item ci_p
    WHERE ci_p.etapa_id = ci_t.etapa_id
      AND ci_p.descripcion = 'Comprobante de pago'
  );

-- 2b. Si solo existe "Comprobante de transferencia", renombrar
UPDATE crm.proceso_checklist_item
SET descripcion = 'Comprobante de pago',
    obligatorio = TRUE
WHERE descripcion = 'Comprobante de transferencia'
  AND etapa_id IN (SELECT id FROM crm.proceso_etapa WHERE etapa = 'desembolso');

-- 2c. Garantizar que "Comprobante de pago" sea obligatorio
UPDATE crm.proceso_checklist_item
SET obligatorio = TRUE
WHERE descripcion = 'Comprobante de pago'
  AND etapa_id IN (SELECT id FROM crm.proceso_etapa WHERE etapa = 'desembolso');

COMMIT;
