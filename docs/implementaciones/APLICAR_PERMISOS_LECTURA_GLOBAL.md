# Aplicar Permisos de Lectura Global

## Descripción
Esta migración actualiza las políticas RLS para permitir que todos los usuarios autenticados (vendedores y administradores) puedan ver todos los proyectos, lotes y propiedades, pero solo los administradores pueden crear, modificar o eliminar estos elementos.

## Archivo de Migración
`supabase/migrations/20250115000002_permisos_lectura_global.sql`

## Cambios Implementados

### ✅ **Proyectos**
- **Lectura**: Todos los usuarios autenticados pueden ver todos los proyectos
- **Creación**: Solo administradores pueden crear proyectos
- **Modificación**: Solo administradores pueden actualizar proyectos
- **Eliminación**: Solo administradores pueden eliminar proyectos

### ✅ **Lotes**
- **Lectura**: Todos los usuarios autenticados pueden ver todos los lotes
- **Creación**: Solo administradores pueden crear lotes
- **Modificación**: Solo administradores pueden actualizar lotes
- **Eliminación**: Solo administradores pueden eliminar lotes

### ✅ **Propiedades**
- **Lectura**: Todos los usuarios autenticados pueden ver todas las propiedades (ya existía)
- **Creación**: Solo administradores pueden crear propiedades
- **Modificación**: Solo administradores pueden actualizar propiedades
- **Eliminación**: Solo administradores pueden eliminar propiedades

## Cómo Aplicar

### Opción 1: SQL Editor de Supabase (Recomendado)
1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar tu proyecto
3. Ir a **SQL Editor**
4. Copiar y pegar el contenido del archivo `20250115000002_permisos_lectura_global.sql`
5. Ejecutar el script

### Opción 2: CLI de Supabase (Si está configurado)
```bash
supabase db push
```

## Verificación

### Para Vendedores:
- ✅ Pueden ver todos los proyectos en `/dashboard/proyectos`
- ✅ Pueden ver todos los lotes en `/dashboard/proyectos/[id]`
- ✅ Pueden ver todas las propiedades en `/dashboard/propiedades`
- ❌ No pueden crear nuevos proyectos o propiedades
- ❌ No pueden modificar proyectos o propiedades existentes

### Para Administradores:
- ✅ Pueden ver todos los proyectos, lotes y propiedades
- ✅ Pueden crear nuevos proyectos y propiedades
- ✅ Pueden modificar proyectos y propiedades existentes
- ✅ Pueden eliminar proyectos y propiedades

## Beneficios

### 🔄 **Sincronización Inmediata**
- Los vendedores ven inmediatamente los nuevos proyectos/propiedades creados por el admin
- No hay necesidad de reasignar o compartir datos
- Experiencia unificada para todos los usuarios

### 🎯 **Gestión Centralizada**
- El administrador mantiene control total sobre la estructura de datos
- Los vendedores se enfocan en la gestión de clientes y ventas
- Prevención de duplicados o inconsistencias

### 🔒 **Seguridad Mantenida**
- Solo administradores pueden modificar datos estructurales
- Vendedores mantienen control sobre sus clientes
- Políticas RLS robustas en la base de datos

## Archivos Afectados

### Base de Datos:
- `crm.proyecto` - Políticas RLS actualizadas
- `crm.lote` - Políticas RLS actualizadas  
- `crm.propiedad` - Políticas RLS actualizadas

### Aplicación:
- `src/lib/cache.server.ts` - Consultas actualizadas para mostrar todos los datos
- `src/hooks/useAdminPermissions.ts` - Hook para verificar permisos
- Formularios de creación con restricciones de permisos

## Estado Actual

✅ **Migración SQL creada**
✅ **Consultas de aplicación actualizadas**
✅ **Restricciones de UI implementadas**
✅ **Validación de permisos en servidor**
✅ **Documentación completa**

## Próximos Pasos

1. **Aplicar la migración** en Supabase
2. **Probar con usuario vendedor** que puede ver todos los datos
3. **Probar con usuario admin** que puede crear/modificar
4. **Verificar sincronización** entre usuarios
