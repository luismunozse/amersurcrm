-- Script SQL para crear las tablas de ubigeo en Supabase
-- Ejecutar en el SQL Editor del dashboard de Supabase

-- Tabla de metadatos para versionado
CREATE TABLE IF NOT EXISTS crm.meta_ubigeo (
    id SERIAL PRIMARY KEY,
    version_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source VARCHAR(255) NOT NULL DEFAULT 'INEI',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de departamentos
CREATE TABLE IF NOT EXISTS crm.departamentos (
    id SERIAL PRIMARY KEY,
    code VARCHAR(2) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de provincias
CREATE TABLE IF NOT EXISTS crm.provincias (
    id SERIAL PRIMARY KEY,
    code VARCHAR(4) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    departamento_code VARCHAR(2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de distritos
CREATE TABLE IF NOT EXISTS crm.distritos (
    id SERIAL PRIMARY KEY,
    code VARCHAR(6) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    provincia_code VARCHAR(4) NOT NULL,
    departamento_code VARCHAR(2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_departamentos_code ON crm.departamentos(code);
CREATE INDEX IF NOT EXISTS idx_provincias_code ON crm.provincias(code);
CREATE INDEX IF NOT EXISTS idx_provincias_departamento ON crm.provincias(departamento_code);
CREATE INDEX IF NOT EXISTS idx_distritos_code ON crm.distritos(code);
CREATE INDEX IF NOT EXISTS idx_distritos_provincia ON crm.distritos(provincia_code);
CREATE INDEX IF NOT EXISTS idx_distritos_departamento ON crm.distritos(departamento_code);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departamentos_updated_at 
    BEFORE UPDATE ON crm.departamentos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provincias_updated_at 
    BEFORE UPDATE ON crm.provincias 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_distritos_updated_at 
    BEFORE UPDATE ON crm.distritos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE crm.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.provincias ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.distritos ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para todos los usuarios autenticados
CREATE POLICY "Allow read access to authenticated users" ON crm.departamentos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access to authenticated users" ON crm.provincias
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access to authenticated users" ON crm.distritos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Insertar metadatos iniciales
INSERT INTO crm.meta_ubigeo (version_date, source, description) 
VALUES (CURRENT_DATE, 'INEI', 'Estructura inicial para datos de ubigeo del INEI')
ON CONFLICT DO NOTHING;
