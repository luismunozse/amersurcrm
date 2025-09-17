# Restricciones de Permisos para Vendedores

## Resumen
Se han implementado restricciones de permisos para que **solo los administradores** puedan crear y gestionar propiedades y proyectos inmobiliarios. Los vendedores solo pueden ver y gestionar los datos asignados a ellos.

## Funcionalidades Restringidas para Vendedores

### ❌ **Creación de Proyectos**
- Los vendedores **NO pueden** crear nuevos proyectos inmobiliarios
- El formulario de creación se reemplaza por un mensaje de "Acceso Restringido"
- Validación tanto en frontend como en backend

### ❌ **Creación de Propiedades**
- Los vendedores **NO pueden** crear nuevas propiedades
- El formulario de creación se reemplaza por un mensaje de "Acceso Restringido"
- Validación tanto en frontend como en backend

### ❌ **Actualización de Propiedades**
- Los vendedores **NO pueden** actualizar propiedades existentes
- Validación en el servidor para prevenir modificaciones no autorizadas

## Funcionalidades Permitidas para Vendedores

### ✅ **Visualización de Datos**
- Pueden ver todos los proyectos y propiedades
- Acceso completo a la información de clientes
- Visualización de lotes y sus estados

### ✅ **Gestión de Clientes**
- Crear, editar y gestionar clientes
- Asignar clientes a propiedades
- Gestionar el embudo de ventas

### ✅ **Agenda y Recordatorios**
- Crear eventos y recordatorios
- Gestionar su calendario personal
- Configurar notificaciones

### ✅ **Reportes Personales**
- Ver sus propias estadísticas de ventas
- Acceder a reportes de comisiones
- Visualizar su actividad personal

## Implementación Técnica

### 1. **Hook de Permisos** (`useAdminPermissions.ts`)
```typescript
interface AdminPermissions {
  isAdmin: boolean;
  loading: boolean;
  canCreateProjects: boolean;
  canCreateProperties: boolean;
  canManageUsers: boolean;
}
```

### 2. **Validación Frontend**
- Formularios condicionales basados en permisos
- Mensajes informativos para usuarios sin permisos
- Estados de carga mientras se verifican permisos

### 3. **Validación Backend**
- Verificación de rol en todas las acciones de servidor
- Validación usando `obtenerPerfilUsuario()`
- Mensajes de error específicos para permisos insuficientes

### 4. **Componentes Afectados**

#### Formularios de Creación:
- `src/app/dashboard/proyectos/_NewProyectoForm.tsx`
- `src/app/dashboard/propiedades/_NewPropiedadForm.tsx`

#### Acciones del Servidor:
- `src/app/dashboard/proyectos/_actions.ts` - `crearProyecto()`
- `src/app/dashboard/propiedades/_actions.ts` - `crearPropiedad()`, `actualizarPropiedad()`

## Flujo de Verificación de Permisos

### 1. **Frontend (UI)**
```typescript
const { isAdmin, loading } = useAdminPermissions();

if (loading) return <LoadingSkeleton />;
if (!isAdmin) return <AccessRestrictedMessage />;
return <CreationForm />;
```

### 2. **Backend (Server Actions)**
```typescript
const perfil = await obtenerPerfilUsuario(user.id);
if (!perfil || perfil.rol?.nombre !== 'ROL_ADMIN') {
  throw new Error("No tienes permisos para realizar esta acción.");
}
```

## Mensajes de Usuario

### Para Vendedores (Sin Permisos):
```
⚠️ Acceso Restringido
Solo los administradores pueden crear [proyectos/propiedades] inmobiliarias.
```

### Para Administradores:
```
✅ Formulario de Creación Disponible
[Formulario completo con todas las opciones]
```

## Beneficios de la Implementación

### 🔒 **Seguridad**
- Prevención de creación no autorizada de datos
- Validación en múltiples capas (frontend + backend)
- Mensajes claros sobre restricciones

### 👥 **Gestión de Roles**
- Separación clara entre administradores y vendedores
- Control granular de permisos
- Escalabilidad para futuros roles

### 🎯 **Experiencia de Usuario**
- Interfaz adaptativa según permisos
- Mensajes informativos y claros
- No confusión sobre funcionalidades disponibles

### 🛡️ **Integridad de Datos**
- Prevención de modificaciones no autorizadas
- Consistencia en la estructura de datos
- Control de calidad en la creación de contenido

## Archivos Modificados

### Nuevos Archivos:
- `src/hooks/useAdminPermissions.ts` - Hook para verificar permisos

### Archivos Modificados:
- `src/app/dashboard/proyectos/_NewProyectoForm.tsx` - Formulario con restricciones
- `src/app/dashboard/propiedades/_NewPropiedadForm.tsx` - Formulario con restricciones
- `src/app/dashboard/proyectos/_actions.ts` - Validación de permisos
- `src/app/dashboard/propiedades/_actions.ts` - Validación de permisos

## Estado Actual

✅ **Restricciones implementadas completamente**
✅ **Validación frontend y backend**
✅ **Mensajes informativos para usuarios**
✅ **Hook de permisos reutilizable**
✅ **Código limpio sin errores de linting**

## Próximos Pasos Sugeridos

1. **Implementar restricciones similares** para otras funcionalidades administrativas
2. **Crear dashboard específico** para vendedores con sus funcionalidades
3. **Agregar auditoría** de acciones para seguimiento de cambios
4. **Implementar notificaciones** cuando se requiera aprobación de admin
