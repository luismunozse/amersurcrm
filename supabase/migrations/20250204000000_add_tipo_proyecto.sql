-- Agregar campo tipo a la tabla proyecto
-- Tipo puede ser: 'propio' (proyecto propio) o 'corretaje'

-- Crear el tipo enum si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_proyecto') THEN
    CREATE TYPE crm.tipo_proyecto AS ENUM ('propio', 'corretaje');
  END IF;
END $$;

-- Agregar la columna tipo a la tabla proyecto
ALTER TABLE crm.proyecto
ADD COLUMN IF NOT EXISTS tipo crm.tipo_proyecto NOT NULL DEFAULT 'propio';

-- Comentario para documentar
COMMENT ON COLUMN crm.proyecto.tipo IS 'Tipo de proyecto: propio (desarrollo propio) o corretaje (proyecto de terceros)';
