-- Migración para permitir lectura global de proyectos y lotes
-- Los vendedores pueden ver todos los proyectos y lotes, pero solo los admins pueden modificarlos

-- ========== PROYECTOS ==========
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "proyecto_select_own" ON crm.proyecto;
DROP POLICY IF EXISTS "proyecto_insert_own" ON crm.proyecto;
DROP POLICY IF EXISTS "proyecto_update_own" ON crm.proyecto;
DROP POLICY IF EXISTS "proyecto_delete_own" ON crm.proyecto;

-- Nueva política de SELECT: Todos los usuarios autenticados pueden ver todos los proyectos
CREATE POLICY "Todos pueden ver proyectos" ON crm.proyecto
FOR SELECT TO authenticated
USING (true);

-- Nueva política de INSERT: Solo administradores pueden crear proyectos
CREATE POLICY "Solo admins pueden crear proyectos" ON crm.proyecto
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

-- Nueva política de UPDATE: Solo administradores pueden actualizar proyectos
CREATE POLICY "Solo admins pueden actualizar proyectos" ON crm.proyecto
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

-- Nueva política de DELETE: Solo administradores pueden eliminar proyectos
CREATE POLICY "Solo admins pueden eliminar proyectos" ON crm.proyecto
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

-- ========== LOTES ==========
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "lote_select_by_owner" ON crm.lote;
DROP POLICY IF EXISTS "lote_insert_own" ON crm.lote;
DROP POLICY IF EXISTS "lote_update_own" ON crm.lote;
DROP POLICY IF EXISTS "lote_delete_own" ON crm.lote;

-- Nueva política de SELECT: Todos los usuarios autenticados pueden ver todos los lotes
CREATE POLICY "Todos pueden ver lotes" ON crm.lote
FOR SELECT TO authenticated
USING (true);

-- Nueva política de INSERT: Solo administradores pueden crear lotes
CREATE POLICY "Solo admins pueden crear lotes" ON crm.lote
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

-- Nueva política de UPDATE: Solo administradores pueden actualizar lotes
CREATE POLICY "Solo admins pueden actualizar lotes" ON crm.lote
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

-- Nueva política de DELETE: Solo administradores pueden eliminar lotes
CREATE POLICY "Solo admins pueden eliminar lotes" ON crm.lote
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

-- ========== PROPIEDADES ==========
-- Las propiedades ya tienen políticas que permiten lectura global
-- Solo necesitamos actualizar las políticas de modificación para que sean solo para admins

-- Eliminar políticas existentes de modificación
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear propiedades" ON crm.propiedad;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar propiedades" ON crm.propiedad;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar propiedades" ON crm.propiedad;

-- Nueva política de INSERT: Solo administradores pueden crear propiedades
CREATE POLICY "Solo admins pueden crear propiedades" ON crm.propiedad
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

-- Nueva política de UPDATE: Solo administradores pueden actualizar propiedades
CREATE POLICY "Solo admins pueden actualizar propiedades" ON crm.propiedad
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

-- Nueva política de DELETE: Solo administradores pueden eliminar propiedades
CREATE POLICY "Solo admins pueden eliminar propiedades" ON crm.propiedad
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM crm.usuario_perfil up
    JOIN crm.rol r ON up.rol_id = r.id
    WHERE up.id = auth.uid() AND r.nombre = 'ROL_ADMIN'
  )
);

-- ========== COMENTARIOS ==========
COMMENT ON POLICY "Todos pueden ver proyectos" ON crm.proyecto IS 'Permite a todos los usuarios autenticados ver todos los proyectos';
COMMENT ON POLICY "Solo admins pueden crear proyectos" ON crm.proyecto IS 'Solo los administradores pueden crear nuevos proyectos';
COMMENT ON POLICY "Todos pueden ver lotes" ON crm.lote IS 'Permite a todos los usuarios autenticados ver todos los lotes';
COMMENT ON POLICY "Solo admins pueden crear lotes" ON crm.lote IS 'Solo los administradores pueden crear nuevos lotes';
COMMENT ON POLICY "Solo admins pueden crear propiedades" ON crm.propiedad IS 'Solo los administradores pueden crear nuevas propiedades';
