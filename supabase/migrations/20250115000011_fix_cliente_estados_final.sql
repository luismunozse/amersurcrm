-- =========================================
-- Fix Cliente Estados - Solución Final
-- =========================================

-- 1. Eliminar la vista que depende de la columna
DROP VIEW IF EXISTS crm.vista_estadisticas_clientes;

-- 2. Eliminar TODOS los constraints de check en la tabla cliente
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

-- 3. Actualizar todos los registros existentes a un estado válido
UPDATE crm.cliente 
SET estado_cliente = 'por_contactar' 
WHERE estado_cliente NOT IN ('por_contactar', 'contactado', 'transferido');

-- 4. Agregar el nuevo constraint
ALTER TABLE crm.cliente ADD CONSTRAINT cliente_estado_cliente_check 
  CHECK (estado_cliente IN ('por_contactar', 'contactado', 'transferido'));

-- 5. Actualizar el valor por defecto
ALTER TABLE crm.cliente ALTER COLUMN estado_cliente SET DEFAULT 'por_contactar';

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
