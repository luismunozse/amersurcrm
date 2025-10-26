# Solución para el Error de Eliminación de Clientes

## Problema
Los clientes no se pueden eliminar debido a políticas RLS (Row Level Security) muy restrictivas que solo permiten eliminar a los usuarios que los crearon.

## Causa
La política RLS `delete_own` solo permitía: `auth.uid() = created_by`, bloqueando incluso a administradores.

## Solución

### Opción 1: Ejecutar SQL en Supabase Dashboard (RECOMENDADO)

1. Ve a tu proyecto de Supabase: https://hbscbwpnkrnuvmdbfmvp.supabase.co

2. Navega a: **SQL Editor** (en el menú lateral izquierdo)

3. Crea una nueva query y pega el siguiente SQL:

```sql
-- Fix RLS policy for cliente DELETE operations
set search_path = public, crm;

-- Eliminar la política de DELETE restrictiva existente
DROP POLICY IF EXISTS delete_own ON crm.cliente;

-- Crear nueva política de DELETE que permite:
-- 1. Admins eliminar cualquier cliente
-- 2. Usuarios eliminar clientes que ellos crearon
CREATE POLICY "cliente_delete_admin_or_owner" ON crm.cliente
FOR DELETE TO authenticated
USING (
  -- El usuario es el creador del cliente
  auth.uid() = created_by
  OR
  -- El usuario tiene rol de admin
  auth.uid() IN (
    SELECT up.id
    FROM crm.usuario_perfil up
    JOIN crm.rol r ON r.id = up.rol_id
    WHERE r.nombre = 'ROL_ADMIN'
  )
);

-- Verificación: Mostrar todas las políticas de cliente
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'crm' AND tablename = 'cliente'
ORDER BY cmd, policyname;
```

4. Haz clic en **Run** (o presiona Ctrl+Enter)

5. Verifica que la salida muestre la nueva política `cliente_delete_admin_or_owner`

### Opción 2: Usar psql (Si tienes acceso directo a la base de datos)

```bash
psql "postgresql://postgres:[PASSWORD]@db.hbscbwpnkrnuvmdbfmvp.supabase.co:5432/postgres" -f supabase/migrations/20250126000001_fix_cliente_delete_rls.sql
```

## Verificación

Después de aplicar la migración:

1. Inicia sesión en tu aplicación CRM
2. Intenta eliminar un cliente (por ejemplo, "Franco Colapinto")
3. Verifica que se elimine correctamente sin errores

## Qué hace la nueva política

La política `cliente_delete_admin_or_owner` permite DELETE cuando:
- El usuario es el creador del cliente (`auth.uid() = created_by`), O
- El usuario tiene rol de administrador (ROL_ADMIN)

Esto soluciona el problema donde incluso los administradores no podían eliminar clientes.

## Archivo de migración

La migración completa está en: `supabase/migrations/20250126000001_fix_cliente_delete_rls.sql`
