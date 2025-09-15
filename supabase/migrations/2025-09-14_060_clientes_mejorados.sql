-- Migración para mejorar la estructura de clientes con campos profesionales
-- Fecha: 2025-09-14
-- Descripción: Agregar campos completos para gestión profesional de clientes

-- Agregar nuevas columnas a la tabla cliente existente
ALTER TABLE crm.cliente 
ADD COLUMN IF NOT EXISTS codigo_cliente TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS tipo_cliente TEXT NOT NULL DEFAULT 'persona' CHECK (tipo_cliente IN ('persona', 'empresa')),
ADD COLUMN IF NOT EXISTS documento_identidad TEXT,
ADD COLUMN IF NOT EXISTS telefono_whatsapp TEXT,
ADD COLUMN IF NOT EXISTS direccion JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS estado_cliente TEXT NOT NULL DEFAULT 'prospecto' CHECK (estado_cliente IN ('activo', 'prospecto', 'lead', 'inactivo')),
ADD COLUMN IF NOT EXISTS origen_lead TEXT,
ADD COLUMN IF NOT EXISTS vendedor_asignado UUID REFERENCES crm.usuario(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS fecha_alta TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS ultimo_contacto TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS proxima_accion TEXT,
ADD COLUMN IF NOT EXISTS interes_principal TEXT,
ADD COLUMN IF NOT EXISTS capacidad_compra_estimada DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS forma_pago_preferida TEXT,
ADD COLUMN IF NOT EXISTS propiedades_reservadas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS propiedades_compradas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS propiedades_alquiladas INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_pendiente DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS notas TEXT,
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';

-- Crear función para generar código de cliente automático
CREATE OR REPLACE FUNCTION crm.generar_codigo_cliente()
RETURNS TEXT AS $$
DECLARE
    nuevo_codigo TEXT;
    contador INTEGER;
BEGIN
    -- Obtener el siguiente número de secuencia
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_cliente FROM 'CLI-(\d+)') AS INTEGER)), 0) + 1
    INTO contador
    FROM crm.cliente
    WHERE codigo_cliente ~ '^CLI-\d+$';
    
    -- Formatear el código
    nuevo_codigo := 'CLI-' || LPAD(contador::TEXT, 6, '0');
    
    RETURN nuevo_codigo;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para generar código automáticamente
CREATE OR REPLACE FUNCTION crm.set_codigo_cliente()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_cliente IS NULL OR NEW.codigo_cliente = '' THEN
        NEW.codigo_cliente := crm.generar_codigo_cliente();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_codigo_cliente
    BEFORE INSERT ON crm.cliente
    FOR EACH ROW
    EXECUTE FUNCTION crm.set_codigo_cliente();

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_cliente_codigo ON crm.cliente(codigo_cliente);
CREATE INDEX IF NOT EXISTS idx_cliente_tipo ON crm.cliente(tipo_cliente);
CREATE INDEX IF NOT EXISTS idx_cliente_estado ON crm.cliente(estado_cliente);
CREATE INDEX IF NOT EXISTS idx_cliente_vendedor ON crm.cliente(vendedor_asignado);
CREATE INDEX IF NOT EXISTS idx_cliente_fecha_alta ON crm.cliente(fecha_alta);
CREATE INDEX IF NOT EXISTS idx_cliente_ultimo_contacto ON crm.cliente(ultimo_contacto);
CREATE INDEX IF NOT EXISTS idx_cliente_documento ON crm.cliente(documento_identidad);

-- Crear vista para estadísticas de clientes
CREATE OR REPLACE VIEW crm.vista_estadisticas_clientes AS
SELECT 
    estado_cliente,
    COUNT(*) as total,
    COUNT(CASE WHEN fecha_alta >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as nuevos_30_dias,
    COUNT(CASE WHEN ultimo_contacto >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as contactados_7_dias,
    AVG(CASE WHEN capacidad_compra_estimada > 0 THEN capacidad_compra_estimada END) as capacidad_promedio
FROM crm.cliente
GROUP BY estado_cliente;

-- Crear función para actualizar estadísticas de propiedades
CREATE OR REPLACE FUNCTION crm.actualizar_estadisticas_propiedades_cliente()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar estadísticas cuando se crea/modifica una reserva o venta
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Actualizar propiedades reservadas
        UPDATE crm.cliente 
        SET propiedades_reservadas = (
            SELECT COUNT(*) 
            FROM crm.lote 
            WHERE cliente_id = NEW.cliente_id 
            AND estado = 'reservado'
        )
        WHERE id = NEW.cliente_id;
        
        -- Actualizar propiedades compradas
        UPDATE crm.cliente 
        SET propiedades_compradas = (
            SELECT COUNT(*) 
            FROM crm.lote 
            WHERE cliente_id = NEW.cliente_id 
            AND estado = 'vendido'
        )
        WHERE id = NEW.cliente_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar estadísticas automáticamente
CREATE TRIGGER trigger_actualizar_estadisticas_propiedades
    AFTER INSERT OR UPDATE ON crm.lote
    FOR EACH ROW
    EXECUTE FUNCTION crm.actualizar_estadisticas_propiedades_cliente();

-- Actualizar clientes existentes con códigos
UPDATE crm.cliente 
SET codigo_cliente = crm.generar_codigo_cliente()
WHERE codigo_cliente IS NULL OR codigo_cliente = '';

-- Comentarios para documentación
COMMENT ON TABLE crm.cliente IS 'Tabla de clientes con información completa para CRM';
COMMENT ON COLUMN crm.cliente.codigo_cliente IS 'Código único del cliente (formato: CLI-000001)';
COMMENT ON COLUMN crm.cliente.tipo_cliente IS 'Tipo de cliente: persona o empresa';
COMMENT ON COLUMN crm.cliente.documento_identidad IS 'DNI, CUIT, RUC u otro documento de identidad';
COMMENT ON COLUMN crm.cliente.telefono_whatsapp IS 'Número de WhatsApp para comunicación';
COMMENT ON COLUMN crm.cliente.direccion IS 'Dirección completa en formato JSON';
COMMENT ON COLUMN crm.cliente.estado_cliente IS 'Estado comercial del cliente';
COMMENT ON COLUMN crm.cliente.origen_lead IS 'Origen del lead (web, recomendación, feria, etc.)';
COMMENT ON COLUMN crm.cliente.vendedor_asignado IS 'Vendedor responsable del cliente';
COMMENT ON COLUMN crm.cliente.ultimo_contacto IS 'Fecha del último contacto registrado';
COMMENT ON COLUMN crm.cliente.proxima_accion IS 'Próxima acción a realizar con el cliente';
COMMENT ON COLUMN crm.cliente.interes_principal IS 'Tipo de propiedad de interés principal';
COMMENT ON COLUMN crm.cliente.capacidad_compra_estimada IS 'Capacidad de compra estimada en soles';
COMMENT ON COLUMN crm.cliente.forma_pago_preferida IS 'Forma de pago preferida del cliente';
COMMENT ON COLUMN crm.cliente.propiedades_reservadas IS 'Número de propiedades reservadas';
COMMENT ON COLUMN crm.cliente.propiedades_compradas IS 'Número de propiedades compradas';
COMMENT ON COLUMN crm.cliente.propiedades_alquiladas IS 'Número de propiedades alquiladas';
COMMENT ON COLUMN crm.cliente.saldo_pendiente IS 'Saldo pendiente de pago en soles';
COMMENT ON COLUMN crm.cliente.notas IS 'Notas adicionales sobre el cliente';
COMMENT ON COLUMN crm.cliente.data IS 'Datos adicionales en formato JSON';
