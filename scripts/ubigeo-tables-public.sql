-- Script SQL para crear las tablas de ubigeo en el esquema public de Supabase
-- Ejecutar en el SQL Editor del dashboard de Supabase

-- Tabla de metadatos para versionado
CREATE TABLE IF NOT EXISTS meta_ubigeo (
    id SERIAL PRIMARY KEY,
    version_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(255) NOT NULL DEFAULT 'INEI',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de departamentos
CREATE TABLE IF NOT EXISTS departamentos (
    id SERIAL PRIMARY KEY,
    code VARCHAR(2) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de provincias
CREATE TABLE IF NOT EXISTS provincias (
    id SERIAL PRIMARY KEY,
    code VARCHAR(4) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    departamento_code VARCHAR(2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de distritos
CREATE TABLE IF NOT EXISTS distritos (
    id SERIAL PRIMARY KEY,
    code VARCHAR(6) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    provincia_code VARCHAR(4) NOT NULL,
    departamento_code VARCHAR(2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_departamentos_code ON departamentos(code);
CREATE INDEX IF NOT EXISTS idx_provincias_code ON provincias(code);
CREATE INDEX IF NOT EXISTS idx_provincias_departamento ON provincias(departamento_code);
CREATE INDEX IF NOT EXISTS idx_distritos_code ON distritos(code);
CREATE INDEX IF NOT EXISTS idx_distritos_provincia ON distritos(provincia_code);
CREATE INDEX IF NOT EXISTS idx_distritos_departamento ON distritos(departamento_code);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departamentos_updated_at 
    BEFORE UPDATE ON departamentos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provincias_updated_at 
    BEFORE UPDATE ON provincias 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distritos_updated_at 
    BEFORE UPDATE ON distritos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE provincias ENABLE ROW LEVEL SECURITY;
ALTER TABLE distritos ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para todos los usuarios autenticados
CREATE POLICY "Allow read access to authenticated users" ON departamentos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access to authenticated users" ON provincias
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access to authenticated users" ON distritos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insertar metadatos iniciales
INSERT INTO meta_ubigeo (version_date, source, description) 
VALUES (CURRENT_DATE, 'INEI', 'Estructura inicial para datos de ubigeo del INEI')
ON CONFLICT DO NOTHING;
