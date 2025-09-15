-- Script para corregir la columna proyecto_id para permitir NULL
-- Ejecutar en el SQL Editor de Supabase

-- Verificar si la columna ya permite NULL
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_schema = 'crm' 
AND table_name = 'propiedad' 
AND column_name = 'proyecto_id';

-- Si is_nullable = 'NO', ejecutar el siguiente comando:
ALTER TABLE crm.propiedad ALTER COLUMN proyecto_id DROP NOT NULL;

-- Verificar que el cambio se aplicó correctamente
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_schema = 'crm' 
AND table_name = 'propiedad' 
AND column_name = 'proyecto_id';
