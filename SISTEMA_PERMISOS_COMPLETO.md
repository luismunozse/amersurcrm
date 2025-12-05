# 🎉 Sistema de Permisos - Implementación Completa

## ✅ ¿Qué se ha creado?

### 📁 Estructura de Archivos

```
src/
├── lib/
│   └── permissions/
│       ├── types.ts              # Tipos TypeScript
│       ├── constants.ts          # Constantes de permisos (PERMISOS.*)
│       ├── server.ts             # Funciones para servidor
│       ├── client.tsx            # Hooks para cliente (usePermissions)
│       ├── middleware.ts         # Protección de rutas
│       └── index.ts              # Exportaciones centrales
├── components/
│   └── permissions/
│       ├── ProtectedAction.tsx   # Componente <ProtectedAction>
│       ├── ProtectedButton.tsx   # Botón con permisos
│       ├── ProtectedPage.tsx     # HOC para páginas
│       └── index.tsx             # Exportaciones
└── app/
    └── api/
        └── auth/
            └── permissions/
                └── route.ts      # API endpoint

Documentación/
├── EJEMPLOS_PERMISOS.md         # 50+ ejemplos de uso
├── INTEGRACION_PERMISOS.md      # Guía de integración
└── SISTEMA_PERMISOS_COMPLETO.md # Este archivo
```

---

## 🗄️ Base de Datos

### Tablas Creadas

1. **`crm.rol`** - Roles del sistema (ya existía, actualizada)
2. **`crm.usuario_perfil`** - Perfil de usuario con rol (ya existía)
3. **`crm.auditoria_permiso`** - Log de uso de permisos
4. **`crm.permiso_condicion`** - Condiciones de permisos (límites, aprobaciones)

### Funciones PostgreSQL

1. **`crm.obtener_permisos_usuario(user_id)`** - Obtiene permisos del usuario
2. **`crm.tiene_permiso(user_id, permiso)`** - Verifica un permiso
3. **`crm.verificar_condicion_permiso(...)`** - Verifica condiciones especiales

---

## 🚀 Cómo Usar

### 1️⃣ En Server Actions

```typescript
import { requierePermiso, PERMISOS } from '@/lib/permissions';

export async function eliminarCliente(clienteId: string) {
  await requierePermiso(PERMISOS.CLIENTES.ELIMINAR);
  // Tu código...
}
```

### 2️⃣ En Server Components (Páginas)

```typescript
import { protegerRuta, PERMISOS } from '@/lib/permissions';

export default async function UsuariosPage() {
  await protegerRuta({ permiso: PERMISOS.USUARIOS.VER });
  return <div>Contenido</div>;
}
```

### 3️⃣ En Client Components (Hooks)

```typescript
'use client';
import { usePermissions, PERMISOS } from '@/lib/permissions';

export function MiComponente() {
  const { tienePermiso, esAdmin } = usePermissions();

  return (
    <div>
      {tienePermiso(PERMISOS.CLIENTES.ELIMINAR) && (
        <button>Eliminar</button>
      )}
    </div>
  );
}
```

### 4️⃣ Con Componentes Protegidos

```typescript
import { ProtectedAction } from '@/components/permissions';
import { PERMISOS } from '@/lib/permissions';

<ProtectedAction permiso={PERMISOS.CLIENTES.ELIMINAR}>
  <button>Eliminar</button>
</ProtectedAction>
```

---

## 📊 Matriz de Permisos por Rol

| Módulo | Permiso | Admin | Coordinador | Vendedor |
|--------|---------|-------|-------------|----------|
| Clientes | ver_todos | ✅ | ✅ | ❌ |
| Clientes | ver_asignados | ✅ | ✅ | ✅ |
| Clientes | crear | ✅ | ✅ | ✅ |
| Clientes | editar_todos | ✅ | ✅ | ❌ |
| Clientes | eliminar | ✅ | ✅ | ❌ |
| Clientes | reasignar | ✅ | ✅ | ❌ |
| Proyectos | crear | ✅ | ❌ | ❌ |
| Proyectos | editar | ✅ | ❌ | ❌ |
| Lotes | crear | ✅ | ✅ | ❌ |
| Lotes | editar | ✅ | ✅ | ❌ |
| Reservas | aprobar | ✅ | ✅ | ❌ |
| Ventas | anular | ✅ | ⚠️ | ❌ |
| Reportes | globales | ✅ | ✅ | ❌ |
| Reportes | personales | ✅ | ✅ | ✅ |
| Usuarios | gestionar | ✅ | ⚠️ | ❌ |
| Configuración | sistema | ✅ | ❌ | ❌ |

⚠️ = Con condiciones o aprobación

---

## 🔧 API Disponible

### Funciones del Servidor
```typescript
// Verificación básica
await tienePermiso('clientes.eliminar')
await tieneRol('ROL_ADMIN')
await esAdmin()
await esCoordinador()
await esVendedor()

// Verificación avanzada
await verificarPermiso('ventas.anular', { lanzarError: true })
await tieneTodosLosPermisos(['clientes.ver', 'clientes.editar'])
await tieneAlgunoDePermisos(['reportes.globales', 'reportes.equipo'])

// Protección de rutas
await protegerRuta({ permiso: 'usuarios.ver' })
await soloAdmins()
await soloAdminsYCoordinadores()

// Requerir permisos (lanza error si no tiene)
await requierePermiso('clientes.eliminar')
await requiereRol('ROL_ADMIN')

// Obtener info del usuario
const usuario = await obtenerPermisosUsuario()
```

### Hooks del Cliente
```typescript
// Hook principal
const {
  usuario,
  loading,
  tienePermiso,
  tieneRol,
  esAdmin,
  esCoordinador,
  esVendedor,
  refetch
} = usePermissions()

// Hooks simplificados
const { permitido, loading } = usePermiso('clientes.eliminar')
const { tieneRol, loading } = useRol('ROL_ADMIN')
```

### Componentes
```typescript
// Mostrar contenido con permiso
<ProtectedAction permiso="clientes.eliminar">
  <button>Eliminar</button>
</ProtectedAction>

// Botón con permiso
<ProtectedButton permiso="ventas.anular" onClick={handleAnular}>
  Anular Venta
</ProtectedButton>

// Contenido por rol
<RoleBasedContent
  admin={<AdminView />}
  coordinador={<CoordinadorView />}
  vendedor={<VendedorView />}
/>

// Proteger página completa
<ProtectedPage permiso="usuarios.ver">
  <ContenidoProtegido />
</ProtectedPage>
```

---

## 📝 Constantes Disponibles

```typescript
import { PERMISOS, ROLES } from '@/lib/permissions';

// Usar constantes en lugar de strings
PERMISOS.CLIENTES.VER_TODOS
PERMISOS.CLIENTES.ELIMINAR
PERMISOS.VENTAS.ANULAR
PERMISOS.REPORTES.GLOBALES

// Roles
ROLES.ADMIN
ROLES.COORDINADOR
ROLES.VENDEDOR
ROLES.GERENTE
```

---

## 🔒 Seguridad

### Triple Capa de Protección

1. **UI (Cliente)**: Oculta botones/opciones basado en permisos
   - Usa `usePermissions()`, `<ProtectedAction>`, etc.
   - Mejora UX pero NO es seguridad real

2. **Servidor (Código)**: Verifica permisos en Server Actions
   - Usa `requierePermiso()`, `protegerRuta()`, etc.
   - Primera línea de defensa real

3. **Base de Datos (RLS)**: Row Level Security en Supabase
   - Ya configurado en tus migraciones
   - Última línea de defensa

### ⚠️ Importante
**SIEMPRE verifica permisos en el servidor**, nunca confíes solo en el cliente.

---

## 📈 Auditoría

Todas las verificaciones de permisos pueden registrarse automáticamente:

```typescript
// Registra en crm.auditoria_permiso
await requierePermiso('ventas.anular', {
  venta_id: '123',
  motivo: 'Error en el registro',
  usuario_responsable: 'admin@empresa.com'
});
```

Ver logs de auditoría:
```sql
SELECT *
FROM crm.auditoria_permiso
WHERE usuario_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 100;
```

---

## 🎯 Próximos Pasos

### Inmediatos
1. ✅ Actualizar Server Actions existentes con `requierePermiso()`
2. ✅ Proteger páginas administrativas con `protegerRuta()`
3. ✅ Actualizar componentes UI con `<ProtectedAction>`
4. ✅ Actualizar navegación/sidebar con verificación de permisos

### Opcional
- [ ] Implementar límites de descuento por rol
- [ ] Configurar aprobaciones en dos pasos para acciones críticas
- [ ] Dashboard de auditoría para admins
- [ ] Exportar logs de auditoría
- [ ] Alertas de intentos de acceso no autorizado

---

## 📚 Documentación Completa

1. **EJEMPLOS_PERMISOS.md** - 50+ ejemplos de uso en diferentes contextos
2. **INTEGRACION_PERMISOS.md** - Guía paso a paso de integración
3. Este archivo - Referencia rápida del sistema completo

---

## 🐛 Troubleshooting

### "Usuario no autenticado"
- Verifica que la sesión de Supabase esté activa
- Revisa que `createServerOnlyClient()` esté funcionando

### "Permiso denegado"
- Verifica los permisos del rol en `crm.rol` (tabla de BD)
- Usa el código correcto: `PERMISOS.MODULO.ACCION`
- Revisa que el usuario tenga un `rol_id` asignado

### "Error al verificar condición"
- Asegúrate de haber ejecutado la migración de `crm.permiso_condicion`
- Verifica que la función `verificar_condicion_permiso` exista en Supabase

### El hook `usePermissions()` no actualiza
- Llama a `refetch()` después de cambios de permisos
- Verifica que el endpoint `/api/auth/permissions` esté accesible

---

## ✨ Características Especiales

- ✅ **TypeScript completo** - Tipos estrictos y autocompletado
- ✅ **Server + Client** - Funciona en ambos contextos
- ✅ **Auditoría integrada** - Log automático de acciones
- ✅ **Condiciones dinámicas** - Límites y aprobaciones por rol
- ✅ **Componentes React** - Fácil integración en UI
- ✅ **Constantes tipadas** - Sin errores de typo
- ✅ **Middleware flexible** - Protección de rutas simple
- ✅ **Escalable** - Fácil agregar nuevos permisos

---

## 🎉 ¡Listo para usar!

Tu sistema de permisos está completamente implementado y listo para integrar en tu aplicación.

**Comienza protegiendo las acciones más críticas primero**:
1. Eliminar clientes
2. Anular ventas
3. Modificar precios
4. Gestionar usuarios
5. Acceso a configuración

Luego continúa con el resto de funcionalidades según prioridad.
