-- =========================================
-- Fix Cliente Estados - Actualizar constraint
-- =========================================

-- Primero actualizar registros existentes que tengan estados antiguos
UPDATE crm.cliente 
SET estado_cliente = 'por_contactar' 
WHERE estado_cliente IN ('activo', 'prospecto', 'lead', 'inactivo');

-- Eliminar el constraint existente
ALTER TABLE crm.cliente DROP CONSTRAINT IF EXISTS cliente_estado_cliente_check;

-- Agregar el nuevo constraint con los estados correctos
ALTER TABLE crm.cliente ADD CONSTRAINT cliente_estado_cliente_check 
  CHECK (estado_cliente IN ('por_contactar', 'contactado', 'transferido'));

-- Actualizar el valor por defecto
ALTER TABLE crm.cliente ALTER COLUMN estado_cliente SET DEFAULT 'por_contactar';
