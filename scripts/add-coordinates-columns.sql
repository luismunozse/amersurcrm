-- Agregar columnas de coordenadas a la tabla proyecto
-- Este script es seguro de ejecutar múltiples veces (usa IF NOT EXISTS)

DO $$
BEGIN
  -- Agregar columna latitud si no existe
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'crm'
    AND table_name = 'proyecto'
    AND column_name = 'latitud'
  ) THEN
    ALTER TABLE crm.proyecto
    ADD COLUMN latitud DOUBLE PRECISION;

    RAISE NOTICE 'Columna latitud agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna latitud ya existe';
  END IF;

  -- Agregar columna longitud si no existe
  IF NOT EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'crm'
    AND table_name = 'proyecto'
    AND column_name = 'longitud'
  ) THEN
    ALTER TABLE crm.proyecto
    ADD COLUMN longitud DOUBLE PRECISION;

    RAISE NOTICE 'Columna longitud agregada exitosamente';
  ELSE
    RAISE NOTICE 'Columna longitud ya existe';
  END IF;
END $$;

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'crm'
  AND table_name = 'proyecto'
  AND column_name IN ('latitud', 'longitud');
