-- =========================================
-- Recreate Estado Cliente - Solución Definitiva
-- =========================================

-- 1. Eliminar la columna estado_cliente completamente
ALTER TABLE crm.cliente DROP COLUMN IF EXISTS estado_cliente;

-- 2. Recrear la columna con el constraint correcto
ALTER TABLE crm.cliente ADD COLUMN estado_cliente TEXT NOT NULL DEFAULT 'por_contactar' 
CHECK (estado_cliente IN ('por_contactar', 'contactado', 'transferido'));

-- 3. Verificar que se creó correctamente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'crm.cliente'::regclass
AND contype = 'c';
