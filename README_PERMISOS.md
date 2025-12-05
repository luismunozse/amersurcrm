# 🔐 Sistema de Permisos - Resumen Ejecutivo

## ✅ ¿Qué tienes ahora?

Un **sistema completo de permisos granulares** listo para usar en tu CRM inmobiliario con:

- ✅ **16 archivos TypeScript** con toda la lógica de permisos
- ✅ **4 tablas en Supabase** para gestionar permisos y auditoría
- ✅ **3 funciones PostgreSQL** para verificación de permisos
- ✅ **100+ permisos** definidos y tipados
- ✅ **3 archivos de documentación** con ejemplos y guías
- ✅ **1 script SQL** de verificación

---

## 🚀 Inicio Rápido (5 minutos)

### Paso 1: Verifica la Base de Datos

Ejecuta en Supabase SQL Editor:
```bash
scripts/verificar-permisos.sql
```

Si todo está ✅, continúa al paso 2.

### Paso 2: Protege tu Primera Acción

```typescript
// src/app/dashboard/clientes/_actions.ts
import { requierePermiso, PERMISOS } from '@/lib/permissions';

export async function eliminarCliente(clienteId: string) {
  await requierePermiso(PERMISOS.CLIENTES.ELIMINAR); // ← Agrega esta línea

  // Tu código existente...
}
```

### Paso 3: Protege tu Primera Página

```typescript
// src/app/dashboard/admin/usuarios/page.tsx
import { soloAdmins } from '@/lib/permissions';

export default async function UsuariosPage() {
  await soloAdmins(); // ← Agrega esta línea

  // Tu contenido existente...
}
```

### Paso 4: Actualiza un Componente

```typescript
// src/components/ClienteCard.tsx
'use client';
import { usePermissions, PERMISOS } from '@/lib/permissions';

export function ClienteCard({ cliente }) {
  const { tienePermiso } = usePermissions(); // ← Agrega el hook

  return (
    <div>
      <h3>{cliente.nombre}</h3>

      {/* Solo mostrar si tiene permiso */}
      {tienePermiso(PERMISOS.CLIENTES.ELIMINAR) && (
        <button onClick={handleEliminar}>Eliminar</button>
      )}
    </div>
  );
}
```

---

## 📚 Documentación Disponible

| Archivo | Descripción | Cuándo Leerlo |
|---------|-------------|---------------|
| **SISTEMA_PERMISOS_COMPLETO.md** | Referencia completa del sistema | Ahora (5 min) |
| **EJEMPLOS_PERMISOS.md** | 50+ ejemplos de código | Al implementar |
| **INTEGRACION_PERMISOS.md** | Guía paso a paso | Al integrar |
| **scripts/verificar-permisos.sql** | Verificación de BD | Antes de empezar |

---

## 🎯 Estructura del Sistema

```
┌─────────────────────────────────────────────┐
│  USUARIO                                     │
│  ↓                                           │
│  ┌─────────────────────────────────────┐    │
│  │ UI (Cliente)                        │    │
│  │ • usePermissions()                  │    │
│  │ • <ProtectedAction>                 │    │
│  │ • <ProtectedButton>                 │    │
│  └─────────────────────────────────────┘    │
│  ↓                                           │
│  ┌─────────────────────────────────────┐    │
│  │ Servidor (TypeScript)               │    │
│  │ • requierePermiso()                 │    │
│  │ • protegerRuta()                    │    │
│  │ • verificarPermiso()                │    │
│  └─────────────────────────────────────┘    │
│  ↓                                           │
│  ┌─────────────────────────────────────┐    │
│  │ Base de Datos (PostgreSQL)          │    │
│  │ • crm.rol                           │    │
│  │ • crm.usuario_perfil                │    │
│  │ • crm.auditoria_permiso             │    │
│  │ • RLS Policies                      │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

---

## 🔑 Permisos por Rol (Resumen)

### 👑 ROL_ADMIN
- ✅ **TODO** - Acceso completo al sistema
- Ejemplos: crear proyectos, modificar precios, gestionar usuarios

### 👔 ROL_COORDINADOR_VENTAS
- ✅ Ver todos los clientes
- ✅ Reasignar vendedores
- ✅ Aprobar reservas/ventas
- ✅ Ver reportes del equipo
- ✅ Gestionar vendedores
- ❌ Modificar precios
- ❌ Gestionar configuración

### 💼 ROL_VENDEDOR
- ✅ Ver solo sus clientes asignados
- ✅ Crear clientes y leads
- ✅ Editar sus clientes
- ✅ Crear reservas y ventas
- ✅ Ver sus reportes
- ❌ Ver todos los clientes
- ❌ Eliminar clientes
- ❌ Aprobar reservas

---

## 🛠️ Herramientas Disponibles

### En el Servidor (Server Actions / Server Components)
```typescript
import {
  requierePermiso,
  protegerRuta,
  soloAdmins,
  tienePermiso,
  esAdmin,
  PERMISOS
} from '@/lib/permissions';
```

### En el Cliente (Client Components)
```typescript
import { usePermissions, PERMISOS } from '@/lib/permissions';
import { ProtectedAction, ProtectedButton } from '@/components/permissions';
```

### Constantes Tipadas
```typescript
import { PERMISOS, ROLES } from '@/lib/permissions';

PERMISOS.CLIENTES.ELIMINAR
PERMISOS.VENTAS.ANULAR
PERMISOS.REPORTES.GLOBALES

ROLES.ADMIN
ROLES.COORDINADOR
ROLES.VENDEDOR
```

---

## 📊 Ejemplos Rápidos

### Proteger una Server Action
```typescript
await requierePermiso(PERMISOS.CLIENTES.ELIMINAR);
```

### Proteger una Página
```typescript
await protegerRuta({ permiso: PERMISOS.USUARIOS.VER });
```

### Verificar en un Componente
```typescript
const { tienePermiso } = usePermissions();
if (tienePermiso(PERMISOS.VENTAS.ANULAR)) {
  // Mostrar botón de anular
}
```

### Usar Componente Protegido
```typescript
<ProtectedAction permiso={PERMISOS.CLIENTES.ELIMINAR}>
  <button>Eliminar</button>
</ProtectedAction>
```

---

## 🎓 Próximos Pasos Recomendados

### Semana 1: Acciones Críticas
1. Proteger eliminación de clientes
2. Proteger anulación de ventas
3. Proteger modificación de precios
4. Proteger gestión de usuarios

### Semana 2: Páginas Administrativas
1. Proteger `/dashboard/admin/*`
2. Proteger páginas de configuración
3. Proteger páginas de reportes globales

### Semana 3: UI y Experiencia
1. Actualizar sidebar con permisos
2. Actualizar botones/acciones en tablas
3. Ocultar campos en formularios según rol
4. Agregar mensajes informativos

### Semana 4: Auditoría y Refinamiento
1. Revisar logs de auditoría
2. Ajustar permisos según feedback
3. Agregar condiciones especiales (límites)
4. Documentar procedimientos internos

#### ¿Cómo ejecutar la semana 4?

- **Revisar logs de auditoría:** Ejecuta el bloque 9 del script `scripts/verificar-permisos.sql` o la consulta rápida:
  ```sql
  SELECT
    ap.created_at,
    up.username,
    ap.permiso_codigo,
    ap.resultado,
    ap.metadata
  FROM crm.auditoria_permiso ap
  LEFT JOIN crm.usuario_perfil up ON up.id = ap.usuario_id
  WHERE ap.created_at >= now() - interval '7 days'
  ORDER BY ap.created_at DESC;
  ```
  Exporta los resultados si necesitas compartirlos con gerencia.

- **Ajustar permisos según feedback:** Registra los cambios directamente en la tabla `crm.rol`. Ejemplo para agregar un permiso a un rol sin sobreescribir los existentes:
  ```sql
  UPDATE crm.rol
  SET permisos = permisos || '["clientes.reasignar"]'::jsonb
  WHERE nombre = 'ROL_COORDINADOR_VENTAS';
  ```
  Después de cada ajuste ejecuta nuevamente `scripts/verificar-permisos.sql` para validar consistencia.

- **Agregar condiciones especiales (límites):** Usa `crm.permiso_condicion` para definir topes por rol. Por ejemplo, restringir descuentos mayores a 10 % para vendedores:
  ```sql
  INSERT INTO crm.permiso_condicion (
    rol_id,
    permiso_codigo,
    tipo_condicion,
    valor_limite,
    requiere_aprobacion
  )
  SELECT id, 'descuentos.aplicar', 'limite_monto', 0.10, true
  FROM crm.rol
  WHERE nombre = 'ROL_VENDEDOR';
  ```
  En tu Server Action envía el valor actual usando el tercer parámetro opcional de `requierePermiso`:
  ```ts
  await requierePermiso(
    PERMISOS.DESCUENTOS.APLICAR,
    { accion: 'aplicar_descuento', recurso_id: ventaId },
    { valorActual: porcentajeDescuento }
  );
  ```

- **Documentar procedimientos internos:** Define una cadencia (ej. revisión semanal). Un checklist sugerido:
  1. Ejecutar reporte de auditoría (últimos 7 días).
  2. Revisar intentos denegados críticos y levantar tickets.
  3. Validar que los cambios de permisos solicitados estén respaldados.
  4. Actualizar este README o la wiki interna con las decisiones y responsables.
  Guarda el resultado en tu herramienta interna para tener trazabilidad.

---

## ⚡ Comandos Útiles

### Verificar permisos de un usuario
```sql
SELECT crm.obtener_permisos_usuario('USER_ID'::uuid);
```

### Ver logs de auditoría
```sql
SELECT * FROM crm.auditoria_permiso
ORDER BY created_at DESC LIMIT 50;
```

### Agregar un nuevo permiso a un rol
```sql
UPDATE crm.rol
SET permisos = permisos || '["nuevo.permiso"]'::jsonb
WHERE nombre = 'ROL_VENDEDOR';
```

---

## 🐛 Solución de Problemas

### "Usuario no autenticado"
→ Verifica sesión de Supabase y `createServerOnlyClient()`

### "Permiso denegado"
→ Revisa permisos en tabla `crm.rol` y asignación de `rol_id` al usuario

### Hook no actualiza
→ Llama a `refetch()` o verifica endpoint `/api/auth/permissions`

### Error en BD
→ Ejecuta `scripts/verificar-permisos.sql` para diagnóstico completo

---

## 📞 Soporte

Para dudas o problemas:
1. Revisa **EJEMPLOS_PERMISOS.md** - Tiene 50+ ejemplos
2. Lee **INTEGRACION_PERMISOS.md** - Guía paso a paso
3. Ejecuta **scripts/verificar-permisos.sql** - Diagnóstico automático

---

## ✨ Características

- ✅ TypeScript con tipos estrictos
- ✅ Funciona en servidor y cliente
- ✅ Auditoría automática
- ✅ Componentes React listos
- ✅ Constantes para evitar typos
- ✅ Middleware flexible
- ✅ Condiciones dinámicas
- ✅ 100% documentado

---

## 🎉 ¡Todo Listo!

Tu sistema de permisos está **completamente implementado** y listo para usar.

**Comienza con una acción pequeña** (proteger un botón de eliminar) y expande gradualmente.

**Recuerda**:
- Siempre verifica permisos en el **servidor**
- La UI solo mejora la experiencia, **no es seguridad**
- Usa **constantes** (`PERMISOS.*`) para evitar errores

¡Éxito con la implementación! 🚀
