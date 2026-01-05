-- Índices para búsqueda de teléfonos y permisos
-- Mejora significativa en búsquedas de clientes

-- Habilitar extensión pg_trgm si no existe (necesaria para índices trigram)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice para búsqueda por teléfono principal (trigram para búsquedas parciales)
CREATE INDEX IF NOT EXISTS idx_cliente_telefono_trgm
ON crm.cliente USING gin (telefono gin_trgm_ops);

-- Índice para búsqueda por teléfono WhatsApp
CREATE INDEX IF NOT EXISTS idx_cliente_telefono_whatsapp_trgm
ON crm.cliente USING gin (telefono_whatsapp gin_trgm_ops);

-- Índice para búsqueda por nombre (muy usado en búsquedas)
CREATE INDEX IF NOT EXISTS idx_cliente_nombre_trgm
ON crm.cliente USING gin (nombre gin_trgm_ops);

-- Índice para permisos de vendedor (mejora queries con filtro de vendedor)
CREATE INDEX IF NOT EXISTS idx_cliente_vendedor_username
ON crm.cliente (vendedor_username)
WHERE vendedor_username IS NOT NULL;

-- Índice para created_by (mejora queries de permisos)
CREATE INDEX IF NOT EXISTS idx_cliente_created_by
ON crm.cliente (created_by)
WHERE created_by IS NOT NULL;

-- Índice compuesto para ordenamiento común (fecha_alta DESC)
CREATE INDEX IF NOT EXISTS idx_cliente_fecha_alta_desc
ON crm.cliente (fecha_alta DESC NULLS LAST);
