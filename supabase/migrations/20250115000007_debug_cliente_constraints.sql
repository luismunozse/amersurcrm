-- =========================================
-- Debug Cliente Constraints - Verificar constraints activos
-- =========================================

-- Verificar todos los constraints de la tabla cliente
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'crm.cliente'::regclass
AND contype = 'c';

-- Verificar los valores únicos de estado_cliente en la tabla
SELECT DISTINCT estado_cliente, COUNT(*) 
FROM crm.cliente 
GROUP BY estado_cliente;

-- Verificar la definición de la columna estado_cliente
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'crm' 
AND table_name = 'cliente' 
AND column_name = 'estado_cliente';
