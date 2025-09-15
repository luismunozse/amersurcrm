# Solución para Asignar Rol de Administrador

## Problema
El usuario `admin@amersur.test` no tiene rol de administrador asignado, por lo que no puede acceder a la sección de administración.

## Solución

### Paso 1: Ejecutar Script SQL en Supabase

Ve a tu panel de Supabase → SQL Editor y ejecuta este script:

```sql
-- Script para asignar rol de administrador a admin@amersur.test
-- Ejecutar en Supabase SQL Editor

-- Crear perfil de usuario para admin@amersur.test si no existe
INSERT INTO crm.usuario_perfil (
    id,
    rol_id,
    nombre_completo,
    activo,
    comision_porcentaje,
    meta_mensual_ventas
)
SELECT 
    u.id,
    r.id as rol_id,
    'Administrador AMERSUR',
    true,
    0.00,
    0
FROM auth.users u
CROSS JOIN crm.rol r
WHERE u.email = 'admin@amersur.test'
  AND r.nombre = 'ROL_ADMIN'
ON CONFLICT (id) DO UPDATE SET
    rol_id = EXCLUDED.rol_id,
    nombre_completo = EXCLUDED.nombre_completo,
    activo = EXCLUDED.activo,
    updated_at = NOW();

-- Verificar que se asignó correctamente
SELECT 
    u.email,
    up.nombre_completo,
    r.nombre as rol,
    r.permisos,
    up.activo
FROM auth.users u
JOIN crm.usuario_perfil up ON u.id = up.id
JOIN crm.rol r ON up.rol_id = r.id
WHERE u.email = 'admin@amersur.test';
```

### Paso 2: Verificar la Asignación

Después de ejecutar el script, deberías ver algo como:

```
email                | nombre_completo      | rol       | permisos | activo
admin@amersur.test   | Administrador AMERSUR| ROL_ADMIN | [...]    | true
```

### Paso 3: Reiniciar la Aplicación

1. Detén el servidor de desarrollo (`Ctrl+C`)
2. Ejecuta `npm run dev` nuevamente
3. Inicia sesión con `admin@amersur.test`

### Paso 4: Verificar Funcionalidad

Una vez que inicies sesión, deberías ver:

1. **Sección "Administración" en el sidebar** (solo visible para administradores)
2. **Dashboard de administración** con estadísticas y opciones
3. **Gestión de usuarios** para crear vendedores
4. **Configuración del sistema** para personalizar el CRM

## Funcionalidades de Administración Disponibles

### 1. Dashboard Principal
- Estadísticas generales del sistema
- Acceso rápido a todas las funciones administrativas

### 2. Gestión de Usuarios (`/dashboard/admin/usuarios`)
- Crear nuevos vendedores
- Asignar roles y permisos
- Configurar metas de ventas y comisiones
- Ver lista de todos los usuarios

### 3. Configuración del Sistema (`/dashboard/admin/configuracion`)
- Configuración general (empresa, moneda, zona horaria)
- Configuración de comisiones por tipo de venta
- Configuración de notificaciones
- Campos personalizados
- Integraciones (WhatsApp, Email)

### 4. Otras Funciones (en desarrollo)
- Reportes del sistema
- Configuración de comisiones
- Seguridad y backups

## Notas Técnicas

- El sistema usa Row Level Security (RLS) para controlar el acceso
- Solo los usuarios con rol `ROL_ADMIN` pueden ver la sección de administración
- Los vendedores (`ROL_VENDEDOR`) solo ven sus clientes asignados
- El sistema está configurado para Perú (Soles Peruanos, zona horaria de Lima)

## Solución de Problemas

Si después de ejecutar el script sigues sin ver la sección de administración:

1. **Verifica que el script se ejecutó correctamente** - Debería mostrar el resultado de la consulta SELECT
2. **Limpia la caché del navegador** - Presiona `Ctrl+Shift+R` para recargar completamente
3. **Verifica la consola del navegador** - Busca errores en la consola de desarrollador
4. **Revisa los logs del servidor** - Verifica que no hay errores en la terminal donde ejecutas `npm run dev`

## Archivos Modificados

- `src/lib/auth/roles.ts` - Corregido para usar los nombres de columna correctos
- `src/app/api/admin/usuarios/route.ts` - Corregido para manejar la estructura de base de datos
- `src/app/dashboard/admin/page.tsx` - Dashboard principal de administración
- `src/app/dashboard/admin/usuarios/page.tsx` - Gestión de usuarios
- `src/app/dashboard/admin/configuracion/page.tsx` - Configuración del sistema
