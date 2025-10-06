-- Migración: Flujo CRM Completo
-- Fecha: 2025-02-05
-- Descripción: Crea todas las tablas para el flujo: Interacciones → Visitas → Reservas → Ventas → Pagos

-- ============================================================
-- 1. TABLA: cliente_interaccion
-- Registra todas las interacciones del vendedor con el cliente
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.cliente_interaccion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
    vendedor_username VARCHAR(50) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('llamada', 'email', 'whatsapp', 'visita', 'reunion', 'mensaje')),
    resultado VARCHAR(100) CHECK (resultado IN ('contesto', 'no_contesto', 'reagendo', 'interesado', 'no_interesado', 'cerrado', 'pendiente')),
    notas TEXT,
    duracion_minutos INTEGER,
    fecha_interaccion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    proxima_accion VARCHAR(50) CHECK (proxima_accion IN ('llamar', 'enviar_propuesta', 'reunion', 'visita', 'seguimiento', 'cierre', 'ninguna')),
    fecha_proxima_accion TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para cliente_interaccion
CREATE INDEX IF NOT EXISTS idx_cliente_interaccion_cliente ON crm.cliente_interaccion(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_interaccion_vendedor ON crm.cliente_interaccion(vendedor_username);
CREATE INDEX IF NOT EXISTS idx_cliente_interaccion_fecha ON crm.cliente_interaccion(fecha_interaccion DESC);
CREATE INDEX IF NOT EXISTS idx_cliente_interaccion_proxima_accion ON crm.cliente_interaccion(fecha_proxima_accion)
    WHERE fecha_proxima_accion IS NOT NULL;

-- Trigger para updated_at
CREATE TRIGGER update_cliente_interaccion_updated_at
    BEFORE UPDATE ON crm.cliente_interaccion
    FOR EACH ROW
    EXECUTE FUNCTION crm.set_updated_at();

-- Comentarios
COMMENT ON TABLE crm.cliente_interaccion IS 'Registro de todas las interacciones del vendedor con clientes';
COMMENT ON COLUMN crm.cliente_interaccion.vendedor_username IS 'Username del vendedor que realizó la interacción';
COMMENT ON COLUMN crm.cliente_interaccion.tipo IS 'Tipo de interacción: llamada, email, whatsapp, visita, reunion, mensaje';
COMMENT ON COLUMN crm.cliente_interaccion.resultado IS 'Resultado de la interacción';

-- ============================================================
-- 2. TABLA: cliente_propiedad_interes
-- Lista de deseos: propiedades que interesan al cliente
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.cliente_propiedad_interes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
    lote_id UUID REFERENCES crm.lote(id) ON DELETE CASCADE,
    propiedad_id UUID REFERENCES crm.propiedad(id) ON DELETE CASCADE,
    prioridad INTEGER DEFAULT 2 CHECK (prioridad BETWEEN 1 AND 3), -- 1=alta, 2=media, 3=baja
    notas TEXT,
    agregado_por VARCHAR(50) NOT NULL, -- username del vendedor
    fecha_agregado TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (lote_id IS NOT NULL OR propiedad_id IS NOT NULL),
    UNIQUE(cliente_id, lote_id, propiedad_id)
);

-- Índices para cliente_propiedad_interes
CREATE INDEX IF NOT EXISTS idx_cliente_propiedad_interes_cliente ON crm.cliente_propiedad_interes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_propiedad_interes_lote ON crm.cliente_propiedad_interes(lote_id);
CREATE INDEX IF NOT EXISTS idx_cliente_propiedad_interes_propiedad ON crm.cliente_propiedad_interes(propiedad_id);

COMMENT ON TABLE crm.cliente_propiedad_interes IS 'Propiedades que interesan al cliente (wishlist)';

-- ============================================================
-- 3. TABLA: visita_propiedad
-- Registro de visitas físicas a propiedades
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.visita_propiedad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
    lote_id UUID REFERENCES crm.lote(id) ON DELETE SET NULL,
    propiedad_id UUID REFERENCES crm.propiedad(id) ON DELETE SET NULL,
    vendedor_username VARCHAR(50) NOT NULL,
    fecha_visita TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duracion_minutos INTEGER,
    feedback TEXT,
    nivel_interes INTEGER CHECK (nivel_interes BETWEEN 1 AND 5), -- 1=muy bajo, 5=muy alto
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (lote_id IS NOT NULL OR propiedad_id IS NOT NULL)
);

-- Índices para visita_propiedad
CREATE INDEX IF NOT EXISTS idx_visita_propiedad_cliente ON crm.visita_propiedad(cliente_id);
CREATE INDEX IF NOT EXISTS idx_visita_propiedad_lote ON crm.visita_propiedad(lote_id);
CREATE INDEX IF NOT EXISTS idx_visita_propiedad_vendedor ON crm.visita_propiedad(vendedor_username);
CREATE INDEX IF NOT EXISTS idx_visita_propiedad_fecha ON crm.visita_propiedad(fecha_visita DESC);

COMMENT ON TABLE crm.visita_propiedad IS 'Registro de visitas físicas a propiedades';
COMMENT ON COLUMN crm.visita_propiedad.nivel_interes IS 'Nivel de interés del cliente: 1=muy bajo, 5=muy alto';

-- ============================================================
-- 4. TABLA: reserva
-- Reservas de lotes/propiedades
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.reserva (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_reserva VARCHAR(20) UNIQUE NOT NULL,
    cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
    lote_id UUID REFERENCES crm.lote(id) ON DELETE CASCADE,
    propiedad_id UUID REFERENCES crm.propiedad(id) ON DELETE CASCADE,
    vendedor_username VARCHAR(50) NOT NULL,

    -- Montos
    monto_reserva NUMERIC(12,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD', 'EUR')),

    -- Fechas
    fecha_reserva TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_vencimiento TIMESTAMPTZ NOT NULL,

    -- Estado
    estado VARCHAR(30) DEFAULT 'activa' CHECK (estado IN ('activa', 'vencida', 'cancelada', 'convertida_venta')),
    motivo_cancelacion TEXT,

    -- Pago
    metodo_pago VARCHAR(50),
    comprobante_url TEXT,

    -- Otros
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (lote_id IS NOT NULL OR propiedad_id IS NOT NULL)
);

-- Índices para reserva
CREATE INDEX IF NOT EXISTS idx_reserva_cliente ON crm.reserva(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reserva_lote ON crm.reserva(lote_id);
CREATE INDEX IF NOT EXISTS idx_reserva_vendedor ON crm.reserva(vendedor_username);
CREATE INDEX IF NOT EXISTS idx_reserva_estado ON crm.reserva(estado);
CREATE INDEX IF NOT EXISTS idx_reserva_fecha_vencimiento ON crm.reserva(fecha_vencimiento) WHERE estado = 'activa';
CREATE INDEX IF NOT EXISTS idx_reserva_codigo ON crm.reserva(codigo_reserva);

-- Trigger para updated_at
CREATE TRIGGER update_reserva_updated_at
    BEFORE UPDATE ON crm.reserva
    FOR EACH ROW
    EXECUTE FUNCTION crm.set_updated_at();

COMMENT ON TABLE crm.reserva IS 'Reservas de lotes/propiedades por clientes';
COMMENT ON COLUMN crm.reserva.codigo_reserva IS 'Código único de la reserva (ej: RES-2025-001)';
COMMENT ON COLUMN crm.reserva.estado IS 'Estado: activa, vencida, cancelada, convertida_venta';

-- ============================================================
-- 5. TABLA: venta
-- Contratos de compra/venta
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.venta (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_venta VARCHAR(20) UNIQUE NOT NULL,
    reserva_id UUID REFERENCES crm.reserva(id) ON DELETE SET NULL,
    cliente_id UUID NOT NULL REFERENCES crm.cliente(id) ON DELETE CASCADE,
    lote_id UUID REFERENCES crm.lote(id) ON DELETE CASCADE,
    propiedad_id UUID REFERENCES crm.propiedad(id) ON DELETE CASCADE,
    vendedor_username VARCHAR(50) NOT NULL,

    -- Precios
    precio_total NUMERIC(14,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD', 'EUR')),

    -- Financiamiento
    forma_pago VARCHAR(50) CHECK (forma_pago IN ('contado', 'financiado', 'credito_bancario', 'mixto')),
    monto_inicial NUMERIC(14,2),
    saldo_pendiente NUMERIC(14,2),
    numero_cuotas INTEGER,

    -- Fechas
    fecha_venta TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_entrega DATE,

    -- Estado
    estado VARCHAR(30) DEFAULT 'en_proceso' CHECK (estado IN ('en_proceso', 'finalizada', 'cancelada', 'suspendida')),
    motivo_cancelacion TEXT,

    -- Documentos
    contrato_url TEXT,

    -- Comisión
    comision_vendedor NUMERIC(10,2),
    comision_pagada BOOLEAN DEFAULT FALSE,

    -- Otros
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CHECK (lote_id IS NOT NULL OR propiedad_id IS NOT NULL)
);

-- Índices para venta
CREATE INDEX IF NOT EXISTS idx_venta_cliente ON crm.venta(cliente_id);
CREATE INDEX IF NOT EXISTS idx_venta_lote ON crm.venta(lote_id);
CREATE INDEX IF NOT EXISTS idx_venta_vendedor ON crm.venta(vendedor_username);
CREATE INDEX IF NOT EXISTS idx_venta_estado ON crm.venta(estado);
CREATE INDEX IF NOT EXISTS idx_venta_codigo ON crm.venta(codigo_venta);
CREATE INDEX IF NOT EXISTS idx_venta_fecha ON crm.venta(fecha_venta DESC);

-- Trigger para updated_at
CREATE TRIGGER update_venta_updated_at
    BEFORE UPDATE ON crm.venta
    FOR EACH ROW
    EXECUTE FUNCTION crm.set_updated_at();

COMMENT ON TABLE crm.venta IS 'Contratos de compra/venta de propiedades';
COMMENT ON COLUMN crm.venta.codigo_venta IS 'Código único de la venta (ej: VTA-2025-001)';
COMMENT ON COLUMN crm.venta.saldo_pendiente IS 'Saldo pendiente de pago';

-- ============================================================
-- 6. TABLA: pago
-- Registro de pagos de ventas
-- ============================================================

CREATE TABLE IF NOT EXISTS crm.pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venta_id UUID NOT NULL REFERENCES crm.venta(id) ON DELETE CASCADE,
    numero_cuota INTEGER,
    monto NUMERIC(12,2) NOT NULL,
    moneda VARCHAR(3) DEFAULT 'PEN' CHECK (moneda IN ('PEN', 'USD', 'EUR')),

    -- Fecha
    fecha_pago TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fecha_vencimiento DATE,

    -- Método de pago
    metodo_pago VARCHAR(50) CHECK (metodo_pago IN ('efectivo', 'transferencia', 'tarjeta', 'cheque', 'deposito')),
    numero_operacion VARCHAR(100),
    banco VARCHAR(100),

    -- Documentos
    comprobante_url TEXT,

    -- Registro
    registrado_por VARCHAR(50) NOT NULL, -- username
    notas TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para pago
CREATE INDEX IF NOT EXISTS idx_pago_venta ON crm.pago(venta_id);
CREATE INDEX IF NOT EXISTS idx_pago_fecha ON crm.pago(fecha_pago DESC);
CREATE INDEX IF NOT EXISTS idx_pago_registrado_por ON crm.pago(registrado_por);

COMMENT ON TABLE crm.pago IS 'Registro de pagos de ventas';
COMMENT ON COLUMN crm.pago.numero_cuota IS 'Número de cuota (NULL si es pago único)';

-- ============================================================
-- 7. FUNCIONES Y TRIGGERS
-- ============================================================

-- Función para actualizar saldo_pendiente en venta
CREATE OR REPLACE FUNCTION crm.actualizar_saldo_pendiente()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE crm.venta
    SET saldo_pendiente = precio_total - (
        SELECT COALESCE(SUM(monto), 0)
        FROM crm.pago
        WHERE venta_id = NEW.venta_id
    )
    WHERE id = NEW.venta_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar saldo cuando se registra un pago
DROP TRIGGER IF EXISTS trigger_actualizar_saldo ON crm.pago;
CREATE TRIGGER trigger_actualizar_saldo
    AFTER INSERT ON crm.pago
    FOR EACH ROW
    EXECUTE FUNCTION crm.actualizar_saldo_pendiente();

-- Función para generar código de reserva
CREATE OR REPLACE FUNCTION crm.generar_codigo_reserva()
RETURNS TRIGGER AS $$
DECLARE
    anio TEXT;
    correlativo TEXT;
BEGIN
    IF NEW.codigo_reserva IS NULL OR NEW.codigo_reserva = '' THEN
        anio := TO_CHAR(NOW(), 'YYYY');

        SELECT LPAD(
            (COUNT(*) + 1)::TEXT,
            4,
            '0'
        ) INTO correlativo
        FROM crm.reserva
        WHERE EXTRACT(YEAR FROM fecha_reserva) = EXTRACT(YEAR FROM NOW());

        NEW.codigo_reserva := 'RES-' || anio || '-' || correlativo;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar código de reserva
DROP TRIGGER IF EXISTS trigger_generar_codigo_reserva ON crm.reserva;
CREATE TRIGGER trigger_generar_codigo_reserva
    BEFORE INSERT ON crm.reserva
    FOR EACH ROW
    EXECUTE FUNCTION crm.generar_codigo_reserva();

-- Función para generar código de venta
CREATE OR REPLACE FUNCTION crm.generar_codigo_venta()
RETURNS TRIGGER AS $$
DECLARE
    anio TEXT;
    correlativo TEXT;
BEGIN
    IF NEW.codigo_venta IS NULL OR NEW.codigo_venta = '' THEN
        anio := TO_CHAR(NOW(), 'YYYY');

        SELECT LPAD(
            (COUNT(*) + 1)::TEXT,
            4,
            '0'
        ) INTO correlativo
        FROM crm.venta
        WHERE EXTRACT(YEAR FROM fecha_venta) = EXTRACT(YEAR FROM NOW());

        NEW.codigo_venta := 'VTA-' || anio || '-' || correlativo;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar código de venta
DROP TRIGGER IF EXISTS trigger_generar_codigo_venta ON crm.venta;
CREATE TRIGGER trigger_generar_codigo_venta
    BEFORE INSERT ON crm.venta
    FOR EACH ROW
    EXECUTE FUNCTION crm.generar_codigo_venta();

-- ============================================================
-- 8. PERMISOS RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE crm.cliente_interaccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.cliente_propiedad_interes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.visita_propiedad ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.reserva ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.pago ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios autenticados pueden ver todo (ajustar según necesidad)
CREATE POLICY "auth_users_all" ON crm.cliente_interaccion FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_users_all" ON crm.cliente_propiedad_interes FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_users_all" ON crm.visita_propiedad FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_users_all" ON crm.reserva FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_users_all" ON crm.venta FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "auth_users_all" ON crm.pago FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada: Flujo CRM completo';
    RAISE NOTICE '   - cliente_interaccion';
    RAISE NOTICE '   - cliente_propiedad_interes';
    RAISE NOTICE '   - visita_propiedad';
    RAISE NOTICE '   - reserva (con código automático)';
    RAISE NOTICE '   - venta (con código automático)';
    RAISE NOTICE '   - pago (actualiza saldo automáticamente)';
END $$;
