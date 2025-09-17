-- =========================================
-- Fix Cliente Estados - Migración Robusta
-- =========================================

-- 1. Primero actualizar todos los registros existentes
UPDATE crm.cliente 
SET estado_cliente = 'por_contactar' 
WHERE estado_cliente NOT IN ('por_contactar', 'contactado', 'transferido');

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

-- 3. Agregar el nuevo constraint
ALTER TABLE crm.cliente ADD CONSTRAINT cliente_estado_cliente_check 
  CHECK (estado_cliente IN ('por_contactar', 'contactado', 'transferido'));

-- 4. Actualizar el valor por defecto
ALTER TABLE crm.cliente ALTER COLUMN estado_cliente SET DEFAULT 'por_contactar';

-- 5. Verificar que todo esté correcto
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'crm.cliente'::regclass
AND contype = 'c';
