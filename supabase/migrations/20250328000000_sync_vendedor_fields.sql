-- Migración: Sincronizar campos vendedor_asignado y vendedor_username
-- Fecha: 2025-03-28
-- Descripción: Sincroniza los campos vendedor_asignado (UUID) y vendedor_username en la tabla cliente

-- Función para sincronizar campos de vendedor
-- NOTA: vendedor_asignado es tipo TEXT/VARCHAR, no UUID
CREATE OR REPLACE FUNCTION crm.sync_all_vendedor_fields()
RETURNS TABLE(
    total_clientes INTEGER,
    clientes_sincronizados INTEGER,
    clientes_corregidos INTEGER,
    clientes_con_error INTEGER,
    detalles JSONB
) AS $$
DECLARE
    v_total INTEGER;
    v_sincronizados INTEGER;
    v_corregidos INTEGER;
    v_errores INTEGER;
    v_detalles JSONB := '[]'::jsonb;
    v_cliente RECORD;
    v_username TEXT;
    v_user_id TEXT;
    v_is_uuid BOOLEAN;
BEGIN
    -- Contar total de clientes
    SELECT COUNT(*) INTO v_total FROM crm.cliente;
    
    v_corregidos := 0;
    v_errores := 0;
    v_sincronizados := 0;
    
    -- Procesar TODOS los clientes con vendedor_asignado
    FOR v_cliente IN
        SELECT id, vendedor_asignado, vendedor_username, nombre
        FROM crm.cliente
        WHERE vendedor_asignado IS NOT NULL AND vendedor_asignado != ''
    LOOP
        -- Verificar si vendedor_asignado es un UUID válido
        v_is_uuid := v_cliente.vendedor_asignado ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
        
        IF v_is_uuid THEN
            -- Es un UUID, buscar el username correspondiente
            SELECT username INTO v_username
            FROM crm.usuario_perfil
            WHERE id::TEXT = v_cliente.vendedor_asignado
            LIMIT 1;
            
            IF v_username IS NOT NULL THEN
                -- Verificar si ya está sincronizado
                IF v_cliente.vendedor_username = v_username THEN
                    v_sincronizados := v_sincronizados + 1;
                ELSE
                    -- Actualizar vendedor_username
                    UPDATE crm.cliente
                    SET vendedor_username = v_username
                    WHERE id = v_cliente.id;
                    
                    v_corregidos := v_corregidos + 1;
                END IF;
            ELSE
                v_errores := v_errores + 1;
            END IF;
        ELSE
            -- vendedor_asignado contiene un username (no UUID), buscar el ID del usuario
            SELECT id::TEXT, username INTO v_user_id, v_username
            FROM crm.usuario_perfil
            WHERE username = v_cliente.vendedor_asignado
            LIMIT 1;
            
            IF v_user_id IS NOT NULL THEN
                -- Actualizar ambos campos: vendedor_asignado con UUID (como TEXT) y vendedor_username
                UPDATE crm.cliente
                SET vendedor_asignado = v_user_id,
                    vendedor_username = v_username
                WHERE id = v_cliente.id;
                
                v_corregidos := v_corregidos + 1;
            ELSE
                v_errores := v_errores + 1;
            END IF;
        END IF;
    END LOOP;
    
    -- Procesar clientes con solo vendedor_username (sin vendedor_asignado)
    FOR v_cliente IN
        SELECT id, vendedor_username, nombre
        FROM crm.cliente
        WHERE vendedor_username IS NOT NULL
        AND (vendedor_asignado IS NULL OR vendedor_asignado = '')
    LOOP
        -- Obtener ID del vendedor por username
        SELECT id::TEXT INTO v_user_id
        FROM crm.usuario_perfil
        WHERE username = v_cliente.vendedor_username
        LIMIT 1;
        
        IF v_user_id IS NOT NULL THEN
            -- Actualizar vendedor_asignado
            UPDATE crm.cliente
            SET vendedor_asignado = v_user_id
            WHERE id = v_cliente.id;
            
            v_corregidos := v_corregidos + 1;
        ELSE
            v_errores := v_errores + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT
        v_total,
        v_sincronizados,
        v_corregidos,
        v_errores,
        v_detalles;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar inconsistencias (solo lectura)
CREATE OR REPLACE FUNCTION crm.verificar_inconsistencias_vendedor()
RETURNS TABLE(
    tipo_inconsistencia TEXT,
    cantidad INTEGER,
    detalles JSONB
) AS $$
BEGIN
    -- Caso 1: vendedor_asignado contiene un username (no UUID) - necesita convertirse a UUID
    RETURN QUERY
    SELECT
        'vendedor_asignado contiene username (no UUID) - necesita conversión'::TEXT,
        COUNT(*)::INTEGER,
        COALESCE(jsonb_agg(jsonb_build_object(
            'cliente_id', c.id,
            'cliente_nombre', c.nombre,
            'vendedor_asignado', c.vendedor_asignado
        )) FILTER (WHERE c.id IS NOT NULL), '[]'::jsonb)
    FROM crm.cliente c
    WHERE c.vendedor_asignado IS NOT NULL
    AND c.vendedor_asignado !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Caso 2: vendedor_asignado es UUID pero no tiene vendedor_username sincronizado
    RETURN QUERY
    SELECT
        'vendedor_asignado (UUID) sin vendedor_username sincronizado'::TEXT,
        COUNT(*)::INTEGER,
        COALESCE(jsonb_agg(jsonb_build_object(
            'cliente_id', c.id,
            'cliente_nombre', c.nombre,
            'vendedor_asignado', c.vendedor_asignado,
            'vendedor_username', c.vendedor_username
        )) FILTER (WHERE c.id IS NOT NULL), '[]'::jsonb)
    FROM crm.cliente c
    WHERE c.vendedor_asignado IS NOT NULL
    AND c.vendedor_asignado ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND (
        c.vendedor_username IS NULL
        OR NOT EXISTS (
            SELECT 1 FROM crm.usuario_perfil up
            WHERE up.id::TEXT = c.vendedor_asignado
            AND up.username = c.vendedor_username
        )
    );

    -- Caso 3: tiene vendedor_username pero sin vendedor_asignado
    RETURN QUERY
    SELECT
        'tiene vendedor_username pero sin vendedor_asignado'::TEXT,
        COUNT(*)::INTEGER,
        COALESCE(jsonb_agg(jsonb_build_object(
            'cliente_id', c.id,
            'cliente_nombre', c.nombre,
            'vendedor_username', c.vendedor_username
        )) FILTER (WHERE c.id IS NOT NULL), '[]'::jsonb)
    FROM crm.cliente c
    WHERE c.vendedor_username IS NOT NULL
    AND (c.vendedor_asignado IS NULL OR c.vendedor_asignado = '');
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON FUNCTION crm.sync_all_vendedor_fields() IS 'Sincroniza los campos vendedor_asignado y vendedor_username en todos los clientes';
COMMENT ON FUNCTION crm.verificar_inconsistencias_vendedor() IS 'Verifica inconsistencias entre vendedor_asignado y vendedor_username (solo lectura)';

