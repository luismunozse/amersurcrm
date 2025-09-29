-- Permitir que vendedores vean clientes creados por admin y los asignados a ellos
-- Seguro para producción: crea la política solo si no existe
set search_path = public, crm;

-- Política base existente (propios) permanece activa
-- read_own: USING (auth.uid() = created_by)

-- Crear política para permitir SELECT cuando el cliente fue creado por un ADMIN
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'crm' 
      AND tablename = 'cliente' 
      AND policyname = 'cliente_select_creados_por_admin'
  ) THEN
    CREATE POLICY "cliente_select_creados_por_admin"
    ON crm.cliente
    FOR SELECT
    TO authenticated
    USING (
      -- clientes creados por usuarios con rol admin
      created_by IN (
        SELECT up.id
        FROM crm.usuario_perfil up
        JOIN crm.rol r ON r.id = up.rol_id
        WHERE r.nombre = 'ROL_ADMIN'
      )
    );
  END IF;
END $$;

-- Crear política para permitir SELECT a clientes asignados al vendedor
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'crm' 
      AND tablename = 'cliente' 
      AND policyname = 'cliente_select_asignados_al_vendedor'
  ) THEN
    CREATE POLICY "cliente_select_asignados_al_vendedor"
    ON crm.cliente
    FOR SELECT
    TO authenticated
    USING (
      vendedor_asignado::text = auth.uid()::text
    );
  END IF;
END $$;

-- Verificación rápida
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'crm' AND tablename = 'cliente'
ORDER BY policyname;

