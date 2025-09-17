-- =========================================
-- Fix Cliente Estados - Con Vista Dependiente
-- =========================================

-- 1. Primero actualizar todos los registros existentes
UPDATE crm.cliente 
SET estado_cliente = 'por_contactar' 
WHERE estado_cliente NOT IN ('por_contactar', 'contactado', 'transferido');

-- 2. Eliminar la vista que depende de la columna
DROP VIEW IF EXISTS crm.vista_estadisticas_clientes;

-- 3. Eliminar TODOS los constraints de check en la tabla cliente
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'crm.cliente'::regclass 
        AND contype = 'c'
    LOOP
        EXECUTE 'ALTER TABLE crm.cliente DROP CONSTRAINT IF EXISTS ' || constraint_name;
    END LOOP;
END $$;

-- 4. Eliminar la columna estado_cliente completamente
ALTER TABLE crm.cliente DROP COLUMN IF EXISTS estado_cliente;

-- 5. Recrear la columna con el constraint correcto
ALTER TABLE crm.cliente ADD COLUMN estado_cliente TEXT NOT NULL DEFAULT 'por_contactar' 
CHECK (estado_cliente IN ('por_contactar', 'contactado', 'transferido'));

-- 6. Recrear la vista con los nuevos estados
CREATE OR REPLACE VIEW crm.vista_estadisticas_clientes AS
SELECT 
    estado_cliente,
    COUNT(*) as total_clientes,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as nuevos_ultimos_30_dias
FROM crm.cliente 
GROUP BY estado_cliente
ORDER BY total_clientes DESC;

-- 7. Verificar que todo esté correcto
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'crm.cliente'::regclass
AND contype = 'c';

-- 8. Verificar que la vista se recreó correctamente
SELECT * FROM crm.vista_estadisticas_clientes;
